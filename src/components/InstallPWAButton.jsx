import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';

export default function InstallPWAButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // ब्राऊझरचा डीफॉल्ट पॉपअप थांबवा
      e.preventDefault();
      // इव्हेंट सेव्ह करा
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // इन्स्टॉल डायलॉग दाखवा
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('युझरने PWA इन्स्टॉल स्वीकारले');
    }
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  // जर ब्राऊझर PWA इन्स्टॉलसाठी तयार नसेल (किंवा आधीच इन्स्टॉल असेल) तर हे बटण लपवा
  if (!isInstallable) return null;

  return (
    <button
      onClick={handleInstallClick}
      className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition cursor-pointer"
    >
      <Download className="w-3.5 h-3.5" /> App इन्स्टॉल करा
    </button>
  );
}