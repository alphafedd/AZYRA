import { useEffect, useRef, useState } from "react";

interface AdBannerProps {
  slot: "header" | "sidebar" | "footer" | "inline";
  className?: string;
}

// Adsterra configuration
const ADSTERRA_CONFIG = {
  enabled: true,
  apiKey: "8dae3061f70c1842e3192f7358b6b6de",
  publisherId: "28562196",
  smartLinkId: "smart-link-3154160",
};

export const AdBanner = ({ slot, className = "" }: AdBannerProps) => {
  const adRef = useRef<HTMLDivElement>(null);
  const [adLoaded, setAdLoaded] = useState(false);

  useEffect(() => {
    if (!ADSTERRA_CONFIG.enabled || !adRef.current) return;

    try {
      // Load Adsterra native banner script
      const script = document.createElement("script");
      script.async = true;
      script.dataset.cfasync = "false";
      
      // Use different Adsterra ad formats based on slot
      if (slot === "header" || slot === "footer") {
        script.src = `//www.highperformanceformat.com/${ADSTERRA_CONFIG.publisherId}/invoke.js`;
      } else {
        script.src = `//www.highperformanceformat.com/${ADSTERRA_CONFIG.publisherId}/invoke.js`;
      }

      adRef.current.appendChild(script);
      setAdLoaded(true);

      return () => {
        if (adRef.current && script.parentNode === adRef.current) {
          adRef.current.removeChild(script);
        }
      };
    } catch (e) {
      console.error("Adsterra loading error:", e);
    }
  }, [slot]);

  const sizes = {
    header: "min-h-[60px] w-full",
    sidebar: "w-full min-h-[250px]",
    footer: "min-h-[60px] w-full",
    inline: "min-h-[90px] w-full",
  };

  return (
    <div
      ref={adRef}
      className={`ad-container overflow-hidden rounded-lg ${sizes[slot]} ${className}`}
      data-slot={slot}
    >
      {!adLoaded && (
        <div className="bg-muted/20 border border-dashed border-border rounded-lg flex items-center justify-center text-muted-foreground text-xs w-full h-full min-h-[inherit]">
          <span>Chargement publicité...</span>
        </div>
      )}
    </div>
  );
};

export default AdBanner;
