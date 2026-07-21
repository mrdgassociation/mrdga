import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Menu, X, UserCheck } from 'lucide-react';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <nav className="sticky top-0 z-40 bg-brand-dark/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Branding */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-orange to-amber-400 p-[1.5px]">
              <div className="w-full h-full bg-brand-dark rounded-[10px] flex items-center justify-center group-hover:bg-amber-500/10 transition">
                <Shield className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div>
              <span className="font-black tracking-wider text-lg text-white block leading-none">MRDGA</span>
              <span className="text-[10px] text-slate-400 font-medium tracking-tight">महाराष्ट्र राज्य दहीहंडी गोविंदा असोसिएशन</span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-sm font-medium text-slate-300 hover:text-white transition">Home</Link>
            <Link to="/about" className="text-sm font-medium text-slate-300 hover:text-white transition">About</Link>
            <Link to="/gallery" className="text-sm font-medium text-slate-300 hover:text-white transition">Gallery</Link>
            <Link to="/contact" className="text-sm font-medium text-slate-300 hover:text-white transition">Contact</Link>
            
            <button 
              onClick={() => navigate('/form/2026')} 
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-brand-orange text-white text-sm font-bold rounded-lg shadow-lg shadow-brand-orange/20 hover:opacity-90 transition"
            >
              Register Team
            </button>

            <Link 
              to="/login" 
              className="p-2 text-slate-400 hover:text-amber-400 transition" 
              title="Official Admin Login"
            >
              <UserCheck className="w-5 h-5" />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button 
              onClick={() => setIsOpen(!isOpen)} 
              className="p-2 text-slate-400 hover:text-white focus:outline-none"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="md:hidden bg-brand-card border-b border-white/10 px-4 pt-2 pb-6 space-y-3">
          <Link to="/" onClick={() => setIsOpen(false)} className="block py-2 text-slate-200 hover:text-amber-400">Home</Link>
          <Link to="/about" onClick={() => setIsOpen(false)} className="block py-2 text-slate-200 hover:text-amber-400">About</Link>
          <Link to="/form/2026" onClick={() => setIsOpen(false)} className="block py-2 text-amber-400 font-bold">Register Team (2026)</Link>
          <Link to="/login" onClick={() => setIsOpen(false)} className="block py-2 text-slate-400">Admin Login</Link>
        </div>
      )}
    </nav>
  );
}