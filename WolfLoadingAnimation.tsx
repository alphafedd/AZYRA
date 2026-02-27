import { motion } from "framer-motion";
import wolfTyping from "@/assets/wolf-typing.png";

interface WolfLoadingAnimationProps {
  type: "image" | "video";
}

const WolfLoadingAnimation = ({ type }: WolfLoadingAnimationProps) => {
  return (
    <div className="flex flex-col items-center justify-center p-4 space-y-3">
      {/* Wolf typing icon with typing animation */}
      <div className="relative w-20 h-20">
        <motion.div
          className="w-full h-full rounded-xl overflow-hidden border border-border"
          animate={{
            y: [0, -2, 0, -1, 0],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <img 
            src={wolfTyping} 
            alt="Azyra-AI en cours de création" 
            className="w-full h-full object-cover"
          />
        </motion.div>

        {/* Keyboard typing indicators - small dots that blink like keystrokes */}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1 rounded-sm bg-muted-foreground"
              animate={{
                opacity: [0.2, 1, 0.2],
                scaleY: [1, 1.5, 1],
              }}
              transition={{
                duration: 0.3,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.08,
                repeatDelay: 0.5,
              }}
            />
          ))}
        </div>
      </div>

      {/* Loading text */}
      <div className="text-center space-y-1.5">
        <motion.p
          className="text-sm font-medium text-foreground"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          {type === "video" ? "🎬 Création de la vidéo..." : "🎨 Création de l'image..."}
        </motion.p>

        <motion.div className="flex items-center justify-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
              animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }}
            />
          ))}
        </motion.div>

        <p className="text-xs text-muted-foreground">
          {type === "video"
            ? "Azyra-AI forge votre vidéo..."
            : "Azyra-AI façonne votre création..."}
        </p>
      </div>
    </div>
  );
};

export default WolfLoadingAnimation;
