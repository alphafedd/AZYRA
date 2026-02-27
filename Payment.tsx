import { useState } from "react";
import { motion } from "framer-motion";
import { CreditCard, Smartphone, Upload, Check, AlertCircle, Coins, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import alphaLogo from "@/assets/alpha-logo.png";

const paymentMethods = [
  { id: 'natcash', name: 'NatCash', number: '+50940005000', icon: Smartphone, color: 'from-green-500/20 to-emerald-500/20' },
  { id: 'moncash', name: 'MonCash', number: '+50934973397', icon: Smartphone, color: 'from-yellow-500/20 to-orange-500/20' },
  { id: 'paypal', name: 'PayPal', number: 'pierrejacquesfeddly@gmail.com', icon: CreditCard, color: 'from-blue-500/20 to-indigo-500/20' },
];

const alcPacks = [
  { id: 'pack1', alc: 250, price: 1, priceHTG: 120 },
  { id: 'pack2', alc: 500, price: 4, priceHTG: 480 },
  { id: 'pack3', alc: 1000, price: 7, priceHTG: 840 },
];

const Payment = () => {
  const { user } = useAuth();
  const { wallet, addALC } = useWallet();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [selectedPack, setSelectedPack] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [redeemingCoupon, setRedeemingCoupon] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofFile(file);
    }
  };

  const handleSubmitPayment = async () => {
    if (!user) {
      toast({ title: "Erreur", description: "Vous devez être connecté", variant: "destructive" });
      return;
    }

    if (!selectedPack || !selectedMethod || !transactionId.trim() || !proofFile) {
      toast({ title: "Erreur", description: "Veuillez remplir tous les champs", variant: "destructive" });
      return;
    }

    const pack = alcPacks.find(p => p.id === selectedPack);
    if (!pack) return;

    setLoading(true);

    try {
      // Check for duplicate transaction ID
      const { data: existingTx } = await supabase
        .from('alc_transactions')
        .select('id')
        .eq('transaction_id', transactionId.trim())
        .single();

      if (existingTx) {
        toast({ title: "Erreur", description: "Ce numéro de transaction a déjà été utilisé", variant: "destructive" });
        setLoading(false);
        return;
      }

      // Check daily limit
      const today = new Date().toISOString().split('T')[0];
      const { data: limitData } = await supabase
        .from('daily_limits')
        .select('auto_credits_count')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      if (limitData && limitData.auto_credits_count >= 10) {
        toast({ title: "Limite atteinte", description: "Vous avez atteint la limite de 10 auto-crédits par jour", variant: "destructive" });
        setLoading(false);
        return;
      }

      // Upload proof (in production, upload to storage)
      const proofUrl = `proof_${user.id}_${Date.now()}_${proofFile.name}`;

      // Add ALC
      const success = await addALC(
        pack.alc,
        'purchase',
        `Achat de ${pack.alc} ALC via ${selectedMethod}`,
        transactionId.trim(),
        selectedMethod,
        proofUrl
      );

      if (success) {
        // Update daily limits
        await supabase
          .from('daily_limits')
          .upsert({
            user_id: user.id,
            date: today,
            auto_credits_count: (limitData?.auto_credits_count || 0) + 1
          }, { onConflict: 'user_id,date' });

        toast({ title: "Succès !", description: `${pack.alc} ALC ont été ajoutés à votre compte` });
        setTransactionId("");
        setProofFile(null);
        setSelectedPack(null);
        setSelectedMethod(null);
      } else {
        toast({ title: "Erreur", description: "Une erreur est survenue", variant: "destructive" });
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({ title: "Erreur", description: "Une erreur est survenue", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemCoupon = async () => {
    if (!user || !couponCode.trim()) return;

    setRedeemingCoupon(true);
    try {
      // Import useWallet's redeemCoupon
      const { data: coupon, error: couponError } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.toUpperCase().trim())
        .eq('is_active', true)
        .single();

      if (couponError || !coupon) {
        toast({ title: "Erreur", description: "Coupon invalide ou expiré", variant: "destructive" });
        setRedeemingCoupon(false);
        return;
      }

      // Check if already used
      const { data: existingUse } = await supabase
        .from('coupon_uses')
        .select('id')
        .eq('coupon_id', coupon.id)
        .eq('user_id', user.id)
        .single();

      if (existingUse) {
        toast({ title: "Erreur", description: "Vous avez déjà utilisé ce coupon", variant: "destructive" });
        setRedeemingCoupon(false);
        return;
      }

      // Use coupon
      await supabase.from('coupon_uses').insert({ coupon_id: coupon.id, user_id: user.id });
      await supabase.from('coupons').update({ current_uses: coupon.current_uses + 1 }).eq('id', coupon.id);

      const success = await addALC(coupon.alc_value, 'coupon', `Coupon ${couponCode.toUpperCase()}`);

      if (success) {
        toast({ title: "Succès !", description: `${coupon.alc_value} ALC ajoutés !` });
        setCouponCode("");
      }
    } catch (error) {
      toast({ title: "Erreur", description: "Erreur lors de l'utilisation du coupon", variant: "destructive" });
    } finally {
      setRedeemingCoupon(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={alphaLogo} alt="Azyra-AI" className="w-10 h-10 rounded-xl" />
            <span className="font-display font-bold text-xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Azyra-AI
            </span>
          </Link>
          <div className="flex items-center gap-4">
            {wallet && (
              <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 rounded-full">
                <Coins className="w-5 h-5 text-amber-500" />
                <span className="font-bold text-amber-500">{wallet.alpha_coins} ALC</span>
              </div>
            )}
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Comment payer ?
            </span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Suivez ces étapes simples pour acheter des Azyra-Coins
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Left: Instructions */}
          <div className="space-y-6">
            {/* Coupon Section */}
            <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🎁 Avez-vous un coupon ?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Entrez votre code coupon"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="uppercase"
                  />
                  <Button 
                    onClick={handleRedeemCoupon} 
                    disabled={redeemingCoupon || !couponCode.trim()}
                    className="bg-purple-500 hover:bg-purple-600"
                  >
                    {redeemingCoupon ? "..." : "Valider"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <Card>
              <CardHeader>
                <CardTitle>📱 Méthodes de paiement</CardTitle>
                <CardDescription>Envoyez le montant exact à l'une de ces adresses</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {paymentMethods.map((method) => (
                  <div
                    key={method.id}
                    onClick={() => setSelectedMethod(method.id)}
                    className={`p-4 rounded-xl cursor-pointer transition-all bg-gradient-to-r ${method.color} border ${
                      selectedMethod === method.id ? 'border-primary ring-2 ring-primary' : 'border-border'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <method.icon className="w-6 h-6" />
                      <div>
                        <p className="font-medium">{method.name}</p>
                        <p className="text-sm text-muted-foreground">{method.number}</p>
                      </div>
                      {selectedMethod === method.id && <Check className="w-5 h-5 text-primary ml-auto" />}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card>
              <CardHeader>
                <CardTitle>📋 Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3 text-sm">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">1</span>
                    <span>Choisissez un pack ALC ci-dessous</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">2</span>
                    <span>Envoyez le montant exact via NatCash, MonCash ou PayPal</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">3</span>
                    <span>Mentionnez : <strong>"Azyra-AI | votre email"</strong> dans le message</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">4</span>
                    <span>Entrez le numéro de transaction et téléchargez une capture d'écran</span>
                  </li>
                </ol>
              </CardContent>
            </Card>
          </div>

          {/* Right: Form */}
          <div className="space-y-6">
            {/* ALC Packs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-amber-500" />
                  Choisissez un pack
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                {alcPacks.map((pack) => (
                  <div
                    key={pack.id}
                    onClick={() => setSelectedPack(pack.id)}
                    className={`p-4 rounded-xl cursor-pointer transition-all border ${
                      selectedPack === pack.id 
                        ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500' 
                        : 'border-border hover:border-amber-500/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Coins className="w-8 h-8 text-amber-500" />
                        <div>
                          <p className="font-bold text-lg">{pack.alc} ALC</p>
                          <p className="text-sm text-muted-foreground">${pack.price} (~{pack.priceHTG} gourdes)</p>
                        </div>
                      </div>
                      {selectedPack === pack.id && <Check className="w-6 h-6 text-amber-500" />}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Payment Form */}
            <Card>
              <CardHeader>
                <CardTitle>📤 Soumettre le paiement</CardTitle>
                <CardDescription>Remplissez les informations après avoir effectué le transfert</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="transactionId">Numéro de transaction *</Label>
                  <Input
                    id="transactionId"
                    placeholder="Ex: TXN123456789"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Capture d'écran du paiement *</Label>
                  <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      id="proofUpload"
                    />
                    <label htmlFor="proofUpload" className="cursor-pointer">
                      {proofFile ? (
                        <div className="flex items-center justify-center gap-2 text-primary">
                          <Check className="w-5 h-5" />
                          <span>{proofFile.name}</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">Cliquez pour télécharger</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                {!user && (
                  <div className="flex items-center gap-2 p-3 bg-amber-500/10 rounded-lg text-amber-600">
                    <AlertCircle className="w-5 h-5" />
                    <span className="text-sm">Connectez-vous pour soumettre un paiement</span>
                  </div>
                )}

                <Button 
                  className="w-full bg-gradient-to-r from-primary to-secondary"
                  size="lg"
                  onClick={handleSubmitPayment}
                  disabled={loading || !user || !selectedPack || !selectedMethod || !transactionId || !proofFile}
                >
                  {loading ? "Traitement..." : "Soumettre le paiement"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Payment;
