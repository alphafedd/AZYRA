import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Loader2, Check, X, Users, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWallet } from "@/hooks/useWallet";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CouponInfo {
  code: string;
  alc_value: number;
  current_uses: number;
  max_uses: number | null;
  expires_at: string | null;
}

const CouponRedemption = () => {
  const [couponCode, setCouponCode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [activeCoupons, setActiveCoupons] = useState<CouponInfo[]>([]);
  const { redeemCoupon } = useWallet();
  const { toast } = useToast();

  // Load active coupons for real-time counter
  useEffect(() => {
    const loadActiveCoupons = async () => {
      const { data } = await supabase
        .from('coupons')
        .select('code, alc_value, current_uses, max_uses, expires_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(5);

      if (data) setActiveCoupons(data as CouponInfo[]);
    };

    loadActiveCoupons();

    // Real-time subscription for coupon updates
    const channel = supabase
      .channel('coupons-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'coupons' },
        () => { loadActiveCoupons(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleRedeem = async () => {
    if (!couponCode.trim()) return;
    
    setIsRedeeming(true);
    setResult(null);

    const res = await redeemCoupon(couponCode.trim());
    setResult(res);

    if (res.success) {
      toast({ title: "🎉 Coupon activé!", description: res.message });
      setCouponCode("");
      // Refresh coupon data
      const { data } = await supabase
        .from('coupons')
        .select('code, alc_value, current_uses, max_uses, expires_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(5);
      if (data) setActiveCoupons(data as CouponInfo[]);
    } else {
      toast({ title: "Erreur", description: res.message, variant: "destructive" });
    }

    setIsRedeeming(false);
    setTimeout(() => setResult(null), 4000);
  };

  return (
    <div className="space-y-4">
      {/* Coupon input */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Gift className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">Code Coupon</h3>
        </div>

        <div className="flex gap-2">
          <Input
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
            placeholder="Entrez votre code coupon"
            className="flex-1 uppercase"
            onKeyDown={(e) => e.key === "Enter" && handleRedeem()}
            disabled={isRedeeming}
          />
          <Button
            onClick={handleRedeem}
            disabled={!couponCode.trim() || isRedeeming}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isRedeeming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Valider"
            )}
          </Button>
        </div>

        {/* Result feedback */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`mt-2 flex items-center gap-2 text-sm ${
                result.success ? "text-green-500" : "text-destructive"
              }`}
            >
              {result.success ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
              {result.message}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Active coupons with real-time counter */}
      {activeCoupons.length > 0 && (
        <div className="bg-card/50 border border-border rounded-xl p-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Coupons actifs - Utilisation en temps réel
          </h4>
          <div className="space-y-2">
            {activeCoupons.map((coupon) => (
              <div key={coupon.code} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-primary">{coupon.code}</span>
                  <span className="text-xs text-muted-foreground">({coupon.alc_value} ALC)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="w-3 h-3" />
                    <span className="font-mono">{coupon.current_uses}</span>
                    {coupon.max_uses && <span>/ {coupon.max_uses}</span>}
                  </div>
                  {coupon.expires_at && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(coupon.expires_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CouponRedemption;
