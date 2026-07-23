import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, FileText, Shield, Menu, X, LogOut, User } from 'lucide-react';
import { authService } from '../services/authService';
import mrdgaLogo from '/public/mrdga-logo.png'; // किंवा import mrdgaLogo from '../assets/mrdga-logo.png';

export default function Layout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = authService.getCurrentUser((user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await authService.logout();
    setCurrentUser(null);
    navigate('/');
  };

  const navItems = [
    { label: 'मुख्य पान', path: '/', icon: Home },
    { label: 'नोंदणी फॉर्म', path: '/form/COMP-2026-01', icon: FileText },
    { label: 'ॲडमिन पोर्टल', path: '/admin', icon: Shield },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    // 💡 Pure Home Page Match Background (No Slate/Blue)
    <div className="min-h-screen bg-[#08090d] text-white flex flex-col pb-16 md:pb-0 font-sans">
      
      {/* 🔹 Top Header (Home Page Matching Colors) */}
      <header className="sticky top-0 z-40 bg-[#0c0d14]/95 backdrop-blur-md border-b border-amber-500/20 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
      {/* Logo & Brand Name */}
      <Link to="/" className="flex items-center gap-3 group">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 p-0.5 shadow-lg shadow-amber-500/20 flex items-center justify-center shrink-0">
          <div className="w-full h-full bg-[#0c0d14] rounded-[10px] flex items-center justify-center overflow-hidden p-0.5">
            <img 
              src="/mrdga-logo.png" 
              alt="MRDGA Logo" 
              className="w-full h-full object-contain transform group-hover:scale-105 transition-transform duration-200"
              onError={(e) => {
                // जर इमेज लोड झाली नाही तर फॉलबॅक म्हणून शील्ड आयकॉन दिसेल
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div className="hidden w-full h-full items-center justify-center text-amber-400">
              <Shield className="w-5 h-5 fill-amber-400/20" />
            </div>
          </div>
        </div>
        <div>
          <h1 className="font-black text-base tracking-wide text-white leading-tight">MRDGA</h1>
          <p className="text-[10px] text-amber-400/90 font-medium">महाराष्ट्र राज्य दहीहंडी गोविंदा असोसिएशन</p>
        </div>
      </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                    isActive(item.path)
                      ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-black shadow-md shadow-amber-500/20'
                      : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User Profile / Login Button */}
          <div className="hidden md:flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-3 bg-black/50 border border-amber-500/20 py-1.5 px-3 rounded-2xl">
                {currentUser.photoURL ? (
                  <img src={currentUser.photoURL} alt="User" className="w-7 h-7 rounded-full border border-amber-400" />
                ) : (
                  <User className="w-5 h-5 text-amber-400" />
                )}
                <div className="text-left">
                  <p className="text-xs font-bold text-white leading-none">{currentUser.displayName || "Admin User"}</p>
                  <p className="text-[10px] text-slate-400 leading-tight">{currentUser.email}</p>
                </div>
                <button 
                  onClick={handleLogout} 
                  title="लॉगआउट"
                  className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg ml-1 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link to="/login" className="px-4 py-2 bg-black/60 text-slate-200 hover:text-amber-400 font-bold text-xs rounded-xl border border-amber-500/20 transition">
                लॉगिन
              </Link>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden p-2 text-slate-300 hover:text-white"
          >
            {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* 🔹 Mobile Drawer Menu */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-[#08090d]/98 backdrop-blur-xl flex flex-col">
          <div className="flex justify-between items-center p-4 border-b border-amber-500/20">
            <span className="font-bold text-amber-400">MRDGA Menu</span>
            <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-slate-400">
              <X className="w-6 h-6" />
            </button>
          </div>

          {currentUser && (
            <div className="p-4 bg-black/40 border-b border-amber-500/20 flex items-center gap-3">
              {currentUser.photoURL && <img src={currentUser.photoURL} alt="User" className="w-10 h-10 rounded-full border border-amber-400" />}
              <div>
                <p className="text-sm font-bold text-white">{currentUser.displayName}</p>
                <p className="text-xs text-slate-400">{currentUser.email}</p>
              </div>
            </div>
          )}

          <div className="p-4 space-y-3 flex-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`w-full p-3.5 rounded-xl text-sm font-bold flex items-center gap-3 ${
                    isActive(item.path)
                      ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-black'
                      : 'bg-black/40 text-slate-200 border border-amber-500/20'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}

            {currentUser && (
              <button
                onClick={() => { setIsSidebarOpen(false); handleLogout(); }}
                className="w-full p-3.5 rounded-xl text-sm font-bold flex items-center gap-3 bg-rose-500/10 text-rose-400 border border-rose-500/20 mt-4"
              >
                <LogOut className="w-5 h-5" /> बाहेर पडा (Logout)
              </button>
            )}
          </div>
        </div>
      )}

      {/* 🔹 Page Content Wrapper */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
        {children}
      </main>

      {/* 🔹 Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0c0d14]/95 backdrop-blur-lg border-t border-amber-500/20 z-40 px-6 py-2 flex justify-around items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 transition ${
                active ? 'text-amber-400 scale-105' : 'text-slate-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-bold">{item.label}</span>
            </Link>
          );
        })}
      </div>

    </div>
  );
}