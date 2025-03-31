"use client";

import { useEffect } from 'react';

interface AdsterraAdProps {
  type: 'banner' | 'social-bar' | 'native' | 'popunder' | 'interstitial';
  zoneId: string;
  className?: string;
}

export default function AdsterraAd({ type, zoneId, className = '' }: AdsterraAdProps) {
  useEffect(() => {
    // Load Adsterra script
    const script = document.createElement('script');
    
    switch (type) {
      case 'banner':
        script.src = `//pl${zoneId}.pubfuture.com/v/${zoneId}.js`;
        break;
      case 'social-bar':
        script.src = `//pl${zoneId}.pubfuture.com/ssr/${zoneId}.js`;
        break;
      case 'native':
        script.src = `//pl${zoneId}.pubfuture.com/pn/${zoneId}.js`;
        break;
      case 'popunder':
        script.src = `//pl${zoneId}.pubfuture.com/p/${zoneId}.js`;
        break;
      case 'interstitial':
        script.src = `//pl${zoneId}.pubfuture.com/i/${zoneId}.js`;
        break;
      default:
        script.src = `//pl${zoneId}.pubfuture.com/v/${zoneId}.js`;
    }
    
    script.async = true;
    
    // Add script to document
    document.body.appendChild(script);
    
    // Clean up on unmount
    return () => {
      document.body.removeChild(script);
    };
  }, [type, zoneId]);
  
  return (
    <div className={`adsterra-container ${className}`} id={`atbanner-${zoneId}`}>
      {/* Adsterra ads will be injected here */}
    </div>
  );
}
