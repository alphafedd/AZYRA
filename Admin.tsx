import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Users, Coins, CreditCard, Gift, Shield, AlertTriangle, 
  Plus, Trash2, Search, ArrowLeft, Ban, Check, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import alphaLogo from "@/assets/alpha-logo.png";

interface UserData {
  id: string;
  email: string;
  created_at: string;
  wallet?: { alpha_coins: number };
  subscription?: { plan: string };
}

interface CouponData {
  id: string;
  code: string;
  alc_value: number;
  max_uses: number | null;
  current_uses: number;
  expires_at: string | null;
  is_active: boolean;
}

const Admin = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserData[]>([]);
  const [coupons, setCoupons] = useState<CouponData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState({ totalUsers: 0, totalALC: 0, totalTransactions: 0 });

  // Coupon form
  const [newCoupon, setNewCoupon] = useState({ code: "", alc_value: 100, max_uses: "" });

  // Transfer form
  const [transferForm, setTransferForm] = useState({ email: "", amount: 0, action: "add" as "add" | "remove" });

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) {
      navigate('/');
      return;
    }

    try {
      // Use maybeSingle to handle 0 or 1 results without error
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (error) {
        console.error('Admin check query error:', error);
        toast({ title: "Erreur", description: "Erreur lors de la vérification", variant: "destructive" });
        navigate('/');
        return;
      }

      if (!data) {
        toast({ title: "Accès refusé", description: "Vous n'êtes pas administrateur", variant: "destructive" });
        navigate('/');
        return;
      }

      setIsAdmin(true);
      await loadData();
    } catch (error) {
      console.error('Admin check error:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    // Load users with wallets - fetch from auth metadata via profiles
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('user_id, display_name, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (profilesData) {
      const usersWithData: UserData[] = [];
      for (const profile of profilesData) {
        const { data: walletData } = await supabase
          .from('wallets')
          .select('alpha_coins')
          .eq('user_id', profile.user_id)
          .maybeSingle();

        const { data: subData } = await supabase
          .from('subscriptions')
          .select('plan')
          .eq('user_id', profile.user_id)
          .maybeSingle();

        usersWithData.push({
          id: profile.user_id,
          email: profile.display_name || 'Unknown',
          created_at: profile.created_at,
          wallet: walletData || undefined,
          subscription: subData || undefined
        });
      }
      setUsers(usersWithData);
    }

    // Load coupons
    const { data: couponsData } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });

    if (couponsData) {
      setCoupons(couponsData);
    }

    // Calculate stats
    const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    const { data: walletsData } = await supabase.from('wallets').select('alpha_coins');
    const { count: txCount } = await supabase.from('alc_transactions').select('*', { count: 'exact', head: true });

    setStats({
      totalUsers: userCount || 0,
      totalALC: walletsData?.reduce((sum, w) => sum + w.alpha_coins, 0) || 0,
      totalTransactions: txCount || 0
    });
  };

  const handleCreateCoupon = async () => {
    if (!newCoupon.code || !newCoupon.alc_value) {
      toast({ title: "Erreur", description: "Remplissez tous les champs", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase.from('coupons').insert({
        code: newCoupon.code.toUpperCase(),
        alc_value: newCoupon.alc_value,
        max_uses: newCoupon.max_uses ? parseInt(newCoupon.max_uses) : null,
        created_by: user?.id
      });

      if (error) throw error;

      toast({ title: "Succès", description: "Coupon créé" });
      setNewCoupon({ code: "", alc_value: 100, max_uses: "" });
      loadData();

      // Log action
      await supabase.from('admin_logs').insert({
        admin_id: user?.id,
        action: 'create_coupon',
        details: { code: newCoupon.code.toUpperCase(), alc_value: newCoupon.alc_value }
      });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de créer le coupon", variant: "destructive" });
    }
  };

  const handleDeleteCoupon = async (couponId: string) => {
    try {
      await supabase.from('coupons').delete().eq('id', couponId);
      toast({ title: "Succès", description: "Coupon supprimé" });
      loadData();
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer", variant: "destructive" });
    }
  };

  const handleTransferALC = async () => {
    if (!transferForm.email || transferForm.amount <= 0) {
      toast({ title: "Erreur", description: "Remplissez tous les champs", variant: "destructive" });
      return;
    }

    try {
      // Search by display_name (which can contain name or email)
      const searchTerm = transferForm.email.toLowerCase().trim();
      
      // First try exact match
      let { data: targetProfile } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .ilike('display_name', searchTerm)
        .maybeSingle();

      // If not found, try partial match
      if (!targetProfile) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name')
          .ilike('display_name', `%${searchTerm}%`)
          .limit(1);
        
        if (profiles && profiles.length > 0) {
          targetProfile = profiles[0];
        }
      }

      if (!targetProfile) {
        toast({ title: "Erreur", description: "Utilisateur non trouvé. Vérifiez le nom ou l'email.", variant: "destructive" });
        return;
      }

      // Get current wallet or create one if missing
      let { data: wallet } = await supabase
        .from('wallets')
        .select('alpha_coins, total_earned, total_spent')
        .eq('user_id', targetProfile.user_id)
        .maybeSingle();

      // If wallet doesn't exist, create it
      if (!wallet) {
        const { data: newWallet, error: createError } = await supabase
          .from('wallets')
          .insert({ 
            user_id: targetProfile.user_id, 
            alpha_coins: 0,
            total_earned: 0,
            total_spent: 0
          })
          .select()
          .single();
        
        if (createError) {
          toast({ title: "Erreur", description: "Impossible de créer le portefeuille", variant: "destructive" });
          return;
        }
        wallet = newWallet;
      }

      const newBalance = transferForm.action === 'add' 
        ? wallet.alpha_coins + transferForm.amount
        : Math.max(0, wallet.alpha_coins - transferForm.amount);

      // Update wallet
      const { error: updateError } = await supabase.from('wallets').update({
        alpha_coins: newBalance,
        total_earned: transferForm.action === 'add' ? wallet.total_earned + transferForm.amount : wallet.total_earned,
        total_spent: transferForm.action === 'remove' ? wallet.total_spent + transferForm.amount : wallet.total_spent
      }).eq('user_id', targetProfile.user_id);

      if (updateError) {
        console.error('Wallet update error:', updateError);
        toast({ title: "Erreur", description: "Erreur lors de la mise à jour du portefeuille", variant: "destructive" });
        return;
      }

      // Create transaction
      const { error: txError } = await supabase.from('alc_transactions').insert({
        user_id: targetProfile.user_id,
        type: transferForm.action === 'add' ? 'admin_credit' : 'admin_debit',
        amount: transferForm.action === 'add' ? transferForm.amount : -transferForm.amount,
        balance_after: newBalance,
        description: `${transferForm.action === 'add' ? 'Crédit' : 'Débit'} admin`,
        status: 'auto_approved',
        admin_id: user?.id
      });

      if (txError) {
        console.error('Transaction insert error:', txError);
      }

      // Log action
      await supabase.from('admin_logs').insert({
        admin_id: user?.id,
        action: transferForm.action === 'add' ? 'credit_alc' : 'debit_alc',
        target_user_id: targetProfile.user_id,
        details: { amount: transferForm.amount, target_name: targetProfile.display_name }
      });

      toast({ 
        title: "Succès ✅", 
        description: `${transferForm.amount} ALC ${transferForm.action === 'add' ? 'ajoutés à' : 'retirés de'} ${targetProfile.display_name}` 
      });
      setTransferForm({ email: "", amount: 0, action: "add" });
      loadData();
    } catch (error) {
      console.error('Transfer error:', error);
      toast({ title: "Erreur", description: "Erreur lors du transfert", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <img src={alphaLogo} alt="Azyra-AI" className="w-10 h-10 rounded-xl" />
              <div>
                <span className="font-display font-bold text-xl">Admin Panel</span>
                <p className="text-xs text-muted-foreground">Azyra-AI</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 rounded-full">
            <Shield className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium text-red-500">Administrateur</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Utilisateurs</p>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <Coins className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">ALC en circulation</p>
                  <p className="text-2xl font-bold">{stats.totalALC.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Transactions</p>
                  <p className="text-2xl font-bold">{stats.totalTransactions}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList>
            <TabsTrigger value="users">Utilisateurs</TabsTrigger>
            <TabsTrigger value="coupons">Coupons</TabsTrigger>
            <TabsTrigger value="transfer">Transfert ALC</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Gestion des utilisateurs</CardTitle>
                <div className="relative mt-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {filteredUsers.map((u) => (
                    <div key={u.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{u.email}</p>
                        <p className="text-sm text-muted-foreground">
                          {u.wallet?.alpha_coins || 0} ALC • {u.subscription?.plan || 'free'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {new Date(u.created_at).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Coupons Tab */}
          <TabsContent value="coupons">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gift className="w-5 h-5" />
                    Créer un coupon
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Code</Label>
                    <Input
                      placeholder="AZYRA2025"
                      value={newCoupon.code}
                      onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Valeur ALC</Label>
                    <Input
                      type="number"
                      value={newCoupon.alc_value}
                      onChange={(e) => setNewCoupon({ ...newCoupon, alc_value: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Limite d'utilisation (vide = illimité)</Label>
                    <Input
                      type="number"
                      placeholder="Illimité"
                      value={newCoupon.max_uses}
                      onChange={(e) => setNewCoupon({ ...newCoupon, max_uses: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleCreateCoupon} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Créer le coupon
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Coupons existants</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {coupons.map((coupon) => (
                      <div key={coupon.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-mono font-bold">{coupon.code}</p>
                          <p className="text-sm text-muted-foreground">
                            {coupon.alc_value} ALC • {coupon.current_uses}/{coupon.max_uses || '∞'} utilisations
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {coupon.is_active ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <X className="w-4 h-4 text-red-500" />
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDeleteCoupon(coupon.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {coupons.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">Aucun coupon</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Transfer Tab */}
          <TabsContent value="transfer">
            <Card className="max-w-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-amber-500" />
                  Transfert ALC
                </CardTitle>
                <CardDescription>
                  Ajouter ou retirer des ALC à un utilisateur
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Email/Nom de l'utilisateur</Label>
                  <Input
                    placeholder="utilisateur@email.com"
                    value={transferForm.email}
                    onChange={(e) => setTransferForm({ ...transferForm, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Montant ALC</Label>
                  <Input
                    type="number"
                    value={transferForm.amount}
                    onChange={(e) => setTransferForm({ ...transferForm, amount: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={transferForm.action === 'add' ? 'default' : 'outline'}
                    onClick={() => setTransferForm({ ...transferForm, action: 'add' })}
                    className="flex-1"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter
                  </Button>
                  <Button
                    variant={transferForm.action === 'remove' ? 'destructive' : 'outline'}
                    onClick={() => setTransferForm({ ...transferForm, action: 'remove' })}
                    className="flex-1"
                  >
                    <Ban className="w-4 h-4 mr-2" />
                    Retirer
                  </Button>
                </div>
                <Button onClick={handleTransferALC} className="w-full">
                  Confirmer le transfert
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
