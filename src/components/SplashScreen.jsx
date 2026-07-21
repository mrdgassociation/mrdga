import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SplashScreen({ onFinish, season = "2026" }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // २.५ सेकंदानंतर Splash Screen ऑटोमॅटिक गायब होईल
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onFinish) onFinish();
    }, 2500);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-brand-dark px-4 overflow-hidden"
        >
          {/* Background Ambient Glow */}
          <div className="absolute w-96 h-96 bg-brand-orange/20 rounded-full blur-[120px] pointer-events-none" />

          {/* Dynamic Content Card */}
          <div className="relative z-10 text-center space-y-4 max-w-sm mx-auto">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-block"
            >
              <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-tr from-brand-orange to-amber-400 p-[2px] shadow-2xl shadow-brand-orange/40">
                <div className="w-full h-full bg-brand-dark rounded-[14px] flex items-center justify-center">
                  <span className="text-2xl font-black tracking-tighter text-amber-400">MRDGA</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <h1 className="text-2xl font-extrabold tracking-wide text-white">
                महाराष्ट्र राज्य दहीहंडी गोविंद असोसिएशन
              </h1>
              <p className="text-sm font-medium text-amber-400/90 mt-1 uppercase tracking-widest">
                Official Registration Portal • Season {season}
              </p>
            </motion.div>

            {/* Custom Smooth Progress Loading Line */}
            <div className="w-48 h-1 bg-slate-800 rounded-full mx-auto overflow-hidden mt-6">
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: "0%" }}
                transition={{ duration: 2, ease: "easeInOut" }}
                className="w-full h-full bg-gradient-to-r from-amber-500 to-brand-orange"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}