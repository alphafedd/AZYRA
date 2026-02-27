import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Lock, Loader2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import alphaLogo from "@/assets/alpha-logo.png";
import { z } from "zod";

const passwordSchema = z.string().min(6, { message: "Le mot de passe doit contenir au moins 6 caractères" });

const ResetPassword = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [isValidSession, setIsValidSession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    // Check if we have a valid recovery session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Also listen for auth state changes (recovery link sets this)
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === "PASSWORD_RECOVERY") {
          setIsValidSession(true);
        } else if (session) {
          setIsValidSession(true);
        }
        setCheckingSession(false);
      });

      // If already has session, allow password reset
      if (session) {
        setIsValidSession(true);
      }
      
      setCheckingSession(false);

      return () => subscription.unsubscribe();
    };

    checkSession();
  }, []);

  const validateForm = () => {
    const newErrors: typeof errors = {};
    
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.issues[0].message;
    }
    
    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Les mots de passe ne correspondent pas";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });
      
      if (error) throw error;
      
      setIsSuccess(true);
      toast({
        title: "Mot de passe mis à jour ! 🎉",
        description: "Tu peux maintenant te connecter avec ton nouveau mot de passe.",
      });
      
      // Redirect to home after 2 seconds
      setTimeout(() => {
        navigate("/");
      }, 2000);
      
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isValidSession && !checkingSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-md mx-4 p-8 rounded-2xl bg-card border border-border shadow-2xl text-center"
        >
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl overflow-hidden border border-border shadow-lg">
            <img src={alphaLogo} alt="Azyra-AI Logo" className="w-full h-full object-cover" />
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground mb-4">
            Lien expiré
          </h2>
          <p className="text-muted-foreground mb-6">
            Ce lien de réinitialisation n'est plus valide. Demande un nouveau lien depuis la page de connexion.
          </p>
          <Button onClick={() => navigate("/")} className="w-full h-12">
            Retour à la connexion
          </Button>
        </motion.div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-md mx-4 p-8 rounded-2xl bg-card border border-border shadow-2xl text-center"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground mb-4">
            Mot de passe mis à jour !
          </h2>
          <p className="text-muted-foreground">
            Redirection vers l'application...
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md mx-4 p-8 rounded-2xl bg-card border border-border shadow-2xl"
      >
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl overflow-hidden border border-border shadow-lg">
            <img src={alphaLogo} alt="Azyra-AI Logo" className="w-full h-full object-cover" />
          </div>
          <h2 className="font-display text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
            Nouveau mot de passe
          </h2>
          <p className="text-muted-foreground text-sm">
            Entre ton nouveau mot de passe
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Nouveau mot de passe
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors({ ...errors, password: undefined });
                }}
                className={`pl-10 pr-10 h-12 ${errors.password ? "border-destructive" : ""}`}
                disabled={isLoading}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirmer le mot de passe
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
                }}
                className={`pl-10 h-12 ${errors.confirmPassword ? "border-destructive" : ""}`}
                disabled={isLoading}
                autoComplete="new-password"
              />
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-destructive">{errors.confirmPassword}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 text-base font-medium mt-6"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Mettre à jour le mot de passe"
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Tes conversations sont préservées
        </p>
      </motion.div>
    </div>
  );
};

export default ResetPassword;