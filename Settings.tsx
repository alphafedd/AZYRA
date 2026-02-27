import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import CouponRedemption from "@/components/CouponRedemption";
import { 
  User, Coins, CreditCard, Bell, Shield, Moon, Sun, 
  ArrowLeft, Camera, Save, History, Gift, Send, BellRing
} from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { useTheme } from "@/components/ThemeProvider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import alphaLogo from "@/assets/alpha-logo.png";

const Settings = () => {
  const { user, signOut } = useAuth();
  const { wallet, subscription, transactions, loadTransactions } = useWallet();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { permission, requestPermission, supported: notifSupported } = useNotifications();

  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  // Transfer form
  const [transferEmail, setTransferEmail] = useState("");
  const [transferAmount, setTransferAmount] = useState(0);
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    loadProfile();
    loadTransactions();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setDisplayName(data.display_name || "");
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: displayName })
        .eq('user_id', user.id);

      if (error) throw error;
      toast({ title: "Succès", description: "Profil mis à jour" });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de sauvegarder", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleTransferALC = async () => {
    if (!user || !wallet || !transferEmail || transferAmount <= 0) {
      toast({ title: "Erreur", description: "Remplissez tous les champs", variant: "destructive" });
      return;
    }

    if (transferAmount > wallet.alpha_coins) {
      toast({ title: "Erreur", description: "Solde insuffisant", variant: "destructive" });
      return;
    }

    setTransferring(true);

    try {
      // Find recipient
      const { data: recipientProfile } = await supabase
        .from('profiles')
        .select('user_id')
        .or(`display_name.eq.${transferEmail}`)
        .single();

      if (!recipientProfile) {
        toast({ title: "Erreur", description: "Destinataire non trouvé", variant: "destructive" });
        setTransferring(false);
        return;
      }

      if (recipientProfile.user_id === user.id) {
        toast({ title: "Erreur", description: "Vous ne pouvez pas vous transférer à vous-même", variant: "destructive" });
        setTransferring(false);
        return;
      }

      // Get recipient wallet
      const { data: recipientWallet } = await supabase
        .from('wallets')
        .select('alpha_coins, total_earned')
        .eq('user_id', recipientProfile.user_id)
        .single();

      if (!recipientWallet) {
        toast({ title: "Erreur", description: "Portefeuille destinataire non trouvé", variant: "destructive" });
        setTransferring(false);
        return;
      }

      // Update sender wallet
      const newSenderBalance = wallet.alpha_coins - transferAmount;
      await supabase
        .from('wallets')
        .update({ 
          alpha_coins: newSenderBalance,
          total_spent: wallet.total_spent + transferAmount 
        })
        .eq('user_id', user.id);

      // Update recipient wallet
      const newRecipientBalance = recipientWallet.alpha_coins + transferAmount;
      await supabase
        .from('wallets')
        .update({ 
          alpha_coins: newRecipientBalance,
          total_earned: recipientWallet.total_earned + transferAmount 
        })
        .eq('user_id', recipientProfile.user_id);

      // Create transactions
      await supabase.from('alc_transactions').insert([
        {
          user_id: user.id,
          type: 'transfer',
          amount: -transferAmount,
          balance_after: newSenderBalance,
          description: `Transfert vers ${transferEmail}`,
          status: 'auto_approved'
        },
        {
          user_id: recipientProfile.user_id,
          type: 'transfer',
          amount: transferAmount,
          balance_after: newRecipientBalance,
          description: `Transfert reçu`,
          status: 'auto_approved'
        }
      ]);

      toast({ title: "Succès", description: `${transferAmount} ALC transférés` });
      setTransferEmail("");
      setTransferAmount(0);
      loadTransactions();
    } catch (error) {
      console.error('Transfer error:', error);
      toast({ title: "Erreur", description: "Erreur lors du transfert", variant: "destructive" });
    } finally {
      setTransferring(false);
    }
  };

  const getPlanName = (plan: string) => {
    switch (plan) {
      case 'free': return 'Gratuit';
      case 'plus': return 'Plus';
      case 'premium': return 'Premium';
      case 'vip': return 'VIP';
      default: return plan;
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <span className="font-display font-bold text-xl">Paramètres</span>
          </div>
          {wallet && (
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 rounded-full">
              <Coins className="w-5 h-5 text-amber-500" />
              <span className="font-bold text-amber-500">{wallet.alpha_coins} ALC</span>
            </div>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">Profil</TabsTrigger>
            <TabsTrigger value="wallet">Portefeuille</TabsTrigger>
            <TabsTrigger value="transfer">Transfert</TabsTrigger>
            <TabsTrigger value="preferences">Préférences</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Mon profil
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center">
                      <User className="w-10 h-10 text-primary" />
                    </div>
                    <Button size="icon" variant="outline" className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full">
                      <Camera className="w-4 h-4" />
                    </Button>
                  </div>
                  <div>
                    <p className="font-medium text-lg">{displayName || user.email?.split('@')[0]}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-2 py-1 text-xs rounded-full bg-primary/20 text-primary font-medium">
                        {getPlanName(subscription?.plan || 'free')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label>Nom d'affichage</Label>
                    <Input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Votre nom"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={user.email || ""} disabled className="bg-muted" />
                  </div>
                </div>

                <Button onClick={handleSaveProfile} disabled={loading}>
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? "Sauvegarde..." : "Sauvegarder"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Wallet Tab */}
          <TabsContent value="wallet">
            <div className="space-y-6">
              <Card className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-500/30">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Solde actuel</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Coins className="w-8 h-8 text-amber-500" />
                        <span className="text-4xl font-display font-bold text-amber-500">
                          {wallet?.alpha_coins || 0}
                        </span>
                        <span className="text-xl text-muted-foreground">ALC</span>
                      </div>
                    </div>
                    <Button onClick={() => navigate('/pricing')} className="bg-amber-500 hover:bg-amber-600">
                      <Coins className="w-4 h-4 mr-2" />
                      Acheter
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="p-3 bg-background/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Total gagné</p>
                      <p className="text-lg font-bold text-green-500">+{wallet?.total_earned || 0}</p>
                    </div>
                    <div className="p-3 bg-background/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Total dépensé</p>
                      <p className="text-lg font-bold text-red-500">-{wallet?.total_spent || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Coupon Redemption */}
              <CouponRedemption />

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5" />
                    Historique des transactions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {transactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{tx.description || tx.type}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(tx.created_at).toLocaleString('fr-FR')}
                          </p>
                        </div>
                        <span className={`font-bold ${tx.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {tx.amount > 0 ? '+' : ''}{tx.amount} ALC
                        </span>
                      </div>
                    ))}
                    {transactions.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">Aucune transaction</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Transfer Tab */}
          <TabsContent value="transfer">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="w-5 h-5" />
                  Transférer des ALC
                </CardTitle>
                <CardDescription>
                  Envoyez des Azyra-Coins à un autre utilisateur
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-amber-500/10 rounded-lg">
                  <p className="text-sm text-muted-foreground">Solde disponible</p>
                  <p className="text-2xl font-bold text-amber-500">{wallet?.alpha_coins || 0} ALC</p>
                </div>

                <div className="space-y-2">
                  <Label>Email ou nom du destinataire</Label>
                  <Input
                    value={transferEmail}
                    onChange={(e) => setTransferEmail(e.target.value)}
                    placeholder="destinataire@email.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Montant ALC</Label>
                  <Input
                    type="number"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(parseInt(e.target.value) || 0)}
                    max={wallet?.alpha_coins || 0}
                  />
                </div>

                <Button 
                  onClick={handleTransferALC}
                  disabled={transferring || !transferEmail || transferAmount <= 0}
                  className="w-full"
                >
                  {transferring ? "Transfert en cours..." : "Envoyer"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences">
            <Card>
              <CardHeader>
                <CardTitle>Préférences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                    <div>
                      <p className="font-medium">Thème sombre</p>
                      <p className="text-sm text-muted-foreground">Basculer entre clair et sombre</p>
                    </div>
                  </div>
                  <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <BellRing className="w-5 h-5" />
                    <div>
                      <p className="font-medium">Notifications push</p>
                      <p className="text-sm text-muted-foreground">
                        {permission === "granted" 
                          ? "Notifications activées" 
                          : permission === "denied" 
                            ? "Bloquées dans le navigateur" 
                            : "Recevoir des alertes en temps réel"}
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={permission === "granted"} 
                    onCheckedChange={() => {
                      if (permission !== "granted") {
                        requestPermission();
                      }
                    }}
                    disabled={permission === "denied" || !notifSupported}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5" />
                    <div>
                      <p className="font-medium">Notifications in-app</p>
                      <p className="text-sm text-muted-foreground">Recevoir des notifications dans l'app</p>
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="pt-4 border-t">
                  <Button variant="destructive" onClick={signOut} className="w-full">
                    Se déconnecter
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Settings;
