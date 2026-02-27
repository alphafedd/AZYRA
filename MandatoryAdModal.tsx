import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MandatoryAdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const AD_DURATION = 5; // seconds

export const MandatoryAdModal = ({ isOpen, onClose, onComplete }: MandatoryAdModalProps) => {
  const [countdown, setCountdown] = useState(AD_DURATION);
  const [canClose, setCanClose] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setCountdown(AD_DURATION);
      setCanClose(false);
      return;
    }

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanClose(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  const handleClose = () => {
    if (canClose) {
      onComplete();
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-card border border-border rounded-2xl w-full max-w-lg overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500/20 to-primary/20 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-amber-500" />
                <span className="font-semibold text-foreground">Publicité Azyra-AI</span>
              </div>
              {canClose ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleClose}
                  className="hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </Button>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-mono">{countdown}s</span>
                </div>
              )}
            </div>

            {/* Ad Content Area */}
            <div className="p-8">
              <div className="bg-muted/30 border border-dashed border-border rounded-xl h-64 flex flex-col items-center justify-center gap-4">
                {/* Placeholder for actual ad content */}
                <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-primary rounded-xl flex items-center justify-center">
                  <Gift className="w-8 h-8 text-white" />
                </div>
                <p className="text-muted-foreground text-center px-4">
                  Espace publicitaire<br />
                  <span className="text-xs">(Intégrez AdSense, Adsterra ou autre régie ici)</span>
                </p>
                
                {/* Progress bar */}
                <div className="w-48 h-1 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-amber-500 to-primary"
                    initial={{ width: "0%" }}
                    animate={{ width: `${((AD_DURATION - countdown) / AD_DURATION) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border flex justify-center">
              <Button
                onClick={handleClose}
                disabled={!canClose}
                className={`min-w-32 ${canClose ? 'bg-gradient-to-r from-amber-500 to-primary' : ''}`}
              >
                {canClose ? "Continuer" : `Veuillez patienter... ${countdown}s`}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MandatoryAdModal;
