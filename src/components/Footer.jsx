import React from 'react';

export default function Footer() {
  return (
    <footer className="bg-brand-dark border-t border-white/10 py-8 px-4 text-center text-slate-500 text-xs">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <p className="text-slate-400 font-semibold">महाराष्ट्र राज्य दहीहंडी गोविंदा असोसिएशन (MRDGA)</p>
          <p className="mt-1">© 2026 MRDGA Digital Platform. All rights reserved.</p>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <a href="#" className="hover:text-amber-400">Privacy Policy</a>
          <span>•</span>
          <a href="#" className="hover:text-amber-400">Terms of Service</a>
          <span>•</span>
          <a href="#" className="hover:text-amber-400">Helpdesk</a>
        </div>
      </div>
    </footer>
  );
}