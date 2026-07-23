import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SplashScreen({ onFinish, season = "2026", posterImage = "./event-banner2.png" }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // 💡 ३.५ सेकंदानंतर Splash Screen ऑटोमॅटिक गायब होईल
    const timer = setTimeout(() => {
      handleClose();
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    if (onFinish) onFinish();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-between bg-black px-3 py-6 overflow-hidden select-none"
        >
          {/* Background Ambient Glow (अतिशय आकर्षक लाईट इफेक्ट) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[500px] h-[500px] bg-amber-500/20 rounded-full blur-[140px] pointer-events-none" />

          {/* ⏩ Skip Button (Top Right Corner) */}
          <div className="w-full max-w-md flex justify-end z-20 px-2">
            <button
              onClick={handleClose}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 border border-white/20 text-slate-300 text-[11px] font-bold rounded-full backdrop-blur-md transition cursor-pointer"
            >
              Skip ✕
            </button>
          </div>

          {/* 📸 FULL VERTICAL POSTER CONTAINER (बॉर्डरलेस अ‍ॅप लुक) */}
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="relative z-10 w-full max-w-sm sm:max-w-md flex items-center justify-center flex-1 my-2 overflow-hidden"
          >
            <img 
              src={posterImage} 
              alt="MRDGA इव्हент पोस्टर" 
              className="w-auto h-full max-h-[78vh] object-contain rounded-2xl shadow-2xl shadow-amber-500/15"
              onError={(e) => {
                e.target.src = "./mrdga-logo.png";
                e.target.className = "w-36 h-36 object-contain mx-auto";
              }}
            />
          </motion.div>

          {/* 👑 BOTTOM BRANDING & PROGRESS BAR */}
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="relative z-10 w-full max-w-xs text-center space-y-2 shrink-0 pt-1"
          >
            <div>
              <h1 className="text-xs sm:text-sm font-black tracking-wide text-white leading-tight">
                महाराष्ट्र राज्य दहीहंडी गोविंदा असोसिएशन
              </h1>
              <p className="text-[10px] font-extrabold text-amber-400 uppercase tracking-widest mt-0.5">
                Official Portal • Season {season}
              </p>
            </div>

            {/* Smooth Progress Loading Line */}
            <div className="w-36 sm:w-44 h-1 bg-slate-800 rounded-full mx-auto overflow-hidden border border-white/10">
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: "0%" }}
                transition={{ duration: 3.2, ease: "easeInOut" }}
                className="w-full h-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400"
              />
            </div>
          </motion.div>

        </motion.div>
      )}
    </AnimatePresence>
  );
}