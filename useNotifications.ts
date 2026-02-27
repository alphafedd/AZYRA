import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

export const useNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [supported, setSupported] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const isSupported = "Notification" in window;
    setSupported(isSupported);
    if (isSupported) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!supported) {
      toast({
        title: "Non supporté",
        description: "Les notifications ne sont pas supportées sur cet appareil",
        variant: "destructive",
      });
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === "granted") {
        toast({
          title: "Notifications activées",
          description: "Vous recevrez désormais des notifications",
        });
        return true;
      } else if (result === "denied") {
        toast({
          title: "Notifications refusées",
          description: "Vous pouvez les activer dans les paramètres du navigateur",
          variant: "destructive",
        });
        return false;
      }
      return false;
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de demander la permission",
        variant: "destructive",
      });
      return false;
    }
  }, [supported, toast]);

  const sendNotification = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (!supported || permission !== "granted") return null;

      try {
        const notification = new Notification(title, {
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          ...options,
        });
        return notification;
      } catch {
        return null;
      }
    },
    [supported, permission]
  );

  const notifyGeneration = useCallback(
    (type: "image" | "video") => {
      sendNotification(
        type === "image" ? "🎨 Image générée !" : "🎬 Vidéo générée !",
        {
          body: `Votre ${type === "image" ? "image" : "vidéo"} est prête`,
          tag: `generation-${type}`,
        }
      );
    },
    [sendNotification]
  );

  const notifyMessage = useCallback(
    (preview: string) => {
      if (document.hidden) {
        sendNotification("💬 Nouveau message Azyra-AI", {
          body: preview.slice(0, 100),
          tag: "new-message",
        });
      }
    },
    [sendNotification]
  );

  const notifyCoupon = useCallback(
    (code: string, amount: number) => {
      sendNotification("🎁 Coupon activé !", {
        body: `${amount} ALC ajoutés avec le code ${code}`,
        tag: "coupon-redeemed",
      });
    },
    [sendNotification]
  );

  return {
    permission,
    supported,
    requestPermission,
    sendNotification,
    notifyGeneration,
    notifyMessage,
    notifyCoupon,
  };
};
