import React from 'react';

export default function Footer() {
  return (
    <footer className="bg-[#050608] border-t border-white/10 py-8 px-4 text-center text-slate-500 text-xs font-sans">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Left Side: Association Details */}
        <div className="text-left sm:text-left">
          <p className="text-slate-300 font-bold">महाराष्ट्र राज्य दहीहंडी गोविंदा असोसिएशन (MRDGA)</p>
          <p className="mt-0.5 text-slate-500 text-[11px]">© 2026 MRDGA Digital Platform. All rights reserved.</p>
        </div>

        {/* Center: Legal & Support Pages Links */}
        <div className="flex items-center gap-3 sm:gap-4 text-slate-400 font-semibold text-[11px]">
          <a href="#/privacy" className="hover:text-amber-400 transition cursor-pointer">
            Privacy Policy
          </a>
          <span className="text-slate-600">•</span>
          <a href="#/terms" className="hover:text-amber-400 transition cursor-pointer">
            Terms of Service
          </a>
          <span className="text-slate-600">•</span>
          <a href="#/helpdesk" className="hover:text-amber-400 transition cursor-pointer">
            Helpdesk
          </a>
        </div>

        {/* Right Side: Branding / Developer Info */}
        <div className="text-right sm:text-right">
          <p className="text-slate-500 text-[11px]">
            ©Developed by <span className="text-amber-400/90 font-semibold">Sandesh Mahadik</span>
          </p>
        </div>

      </div>
    </footer>
  );
}