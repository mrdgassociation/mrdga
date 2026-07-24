import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Menu, X, UserCheck, LayoutDashboard, LogOut } from 'lucide-react';

import NotificationBell from './NotificationBell';

// 💡 Firebase Imports
import { auth, db } from '../firebase/config';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

import { useCompetitions } from '../hooks/useCompetitions';

import('../services/notificationService.js').then(m => m.notificationService.requestPushPermission());

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // 'admin' | 'team' | 'guest'
  const [userDepartment, setUserDepartment] = useState('MRDGA'); // 🏢 Default MRDGA
  const navigate = useNavigate();

  // 💡 अचूक रोल व विभाग चेकिंग (Email Key वर आधारित)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser && currentUser.email) {
        try {
          const emailLower = currentUser.email.toLowerCase().trim();

          // 1. 'users' कलेक्शनमध्ये EMAIL ID ने शोधणे
          const userDocRef = doc(db, 'users', emailLower);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            
            // अकाऊंट Active आहे का तपासणे
            const isActive = userData.isActive !== false && userData.status !== 'Inactive';

            if (isActive && ['Super Admin', 'Admin', 'Reviewer'].includes(userData.role)) {
              setUserRole('admin');
              setUserDepartment(userData.department || 'MRDGA');
              return;
            }
          }

          // 2. जर 'users' मध्ये Admin नसेल, तरच 'teams' कलेक्शनमध्ये चेक करणे
          const q = query(collection(db, 'teams'), where('email', '==', emailLower));
          const teamSnap = await getDocs(q);

          if (!teamSnap.empty) {
            setUserRole('team');
          } else {
            setUserRole('guest');
          }
        } catch (err) {
          console.error("Role checking error:", err);
          setUserRole('guest');
        }
      } else {
        setUserRole(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Form link dynamic
  const { competitions } = useCompetitions();

  const handleNavRegister = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    const activeComp = competitions.find(c => c.startDate <= todayStr && c.endDate >= todayStr) 
                    || competitions.find(c => c.startDate > todayStr)
                    || competitions[0];

    const targetId = activeComp ? (activeComp.competitionId || activeComp.id) : '2026';
    navigate(`/form/${targetId}`);
  };

  // 💡 लॉगआऊट हँडलर
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsOpen(false);
      setUserRole(null);
      navigate('/');
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  const canSeeMrdgaDashboard = userRole === 'admin' && (userDepartment === 'MRDGA' || userDepartment === 'SUPER'|| userDepartment === 'INSURANCE');

  return (
    <nav className="sticky top-0 z-40 bg-[#08090d]/90 backdrop-blur-md border-b border-white/10 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Branding */}
          <Link to="/" className="flex items-center gap-3 group shrink-0">
            <img 
              src="./mrdga-logo.png" 
              alt="MRDGA Logo" 
              className="w-10 h-10 object-contain rounded-xl transform group-hover:scale-105 transition-transform duration-200 shrink-0"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <div>
              <span className="font-black tracking-wider text-lg text-white block leading-none">MRDGA</span>
              <span className="text-[10px] text-slate-400 font-medium tracking-tight">महाराष्ट्र राज्य दहीहंडी गोविंदा असोसिएशन</span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-sm font-medium text-slate-300 hover:text-amber-400 transition">Home</Link>
            <Link to="/about" className="text-sm font-medium text-slate-300 hover:text-amber-400 transition">About</Link>
            <Link to="/competitions" className="text-sm font-medium text-slate-300 hover:text-amber-400 transition">Competitions</Link>
            <Link to="/insurance-info" className="text-sm font-medium text-slate-300 hover:text-amber-400 transition">Insurance Info</Link>
            <Link to="/contact" className="text-sm font-medium text-slate-300 hover:text-amber-400 transition">Contact</Link>
            
            {/* 🎯 Register Team Button */}
            <button 
              onClick={handleNavRegister} 
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-black font-extrabold text-sm rounded-xl shadow-lg shadow-amber-500/20 hover:opacity-90 transition cursor-pointer"
            >
              Register Team
            </button>
          </div>

          {/* 🎯 RIGHT SECTION: BELL ICON + PROFILE / LOGIN / MOBILE TOGGLE */}
          <div className="flex items-center gap-3">
            
            {/* 🔔 NOTIFICATION BELL - Always Visible (Desktop & Mobile Top Bar) */}
            <div className="flex items-center">
              <NotificationBell />
            </div>

            {/* 👑 DESKTOP LOGGED-IN / LOGGED-OUT BUTTONS */}
            <div className="hidden md:flex items-center gap-2 border-l border-white/10 pl-3">
              {user ? (
                <>
                  {canSeeMrdgaDashboard && (
                    <button
                      onClick={() => navigate('/admin')}
                      className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500 hover:text-black font-extrabold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <LayoutDashboard className="w-4 h-4" /> Admin Dashboard
                    </button>
                  )}

                  {userRole === 'team' && (
                    <button
                      onClick={() => navigate('/my-status')}
                      className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-black font-extrabold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Shield className="w-4 h-4" /> My Status / Portal
                    </button>
                  )}

                  {userRole === 'guest' && (
                    <button
                      onClick={() => navigate('/my-status')}
                      className="px-3 py-1.5 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl hover:text-white transition cursor-pointer"
                    >
                      Portal
                    </button>
                  )}

                  <button
                    onClick={handleLogout}
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition cursor-pointer"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <Link 
                  to="/login" 
                  className="p-2 text-slate-400 hover:text-amber-400 transition" 
                  title="Official Admin Login"
                >
                  <UserCheck className="w-5 h-5" />
                </Link>
              )}
            </div>

            {/* Mobile Menu Toggle Button */}
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
      </div>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="md:hidden bg-[#0c0d14] border-b border-white/10 px-4 pt-2 pb-6 space-y-3">
          <Link to="/" onClick={() => setIsOpen(false)} className="block py-2 text-slate-200 hover:text-amber-400">Home</Link>
          <Link to="/about" onClick={() => setIsOpen(false)} className="block py-2 text-slate-200 hover:text-amber-400">About</Link>
          <Link to="/competitions" onClick={() => setIsOpen(false)} className="block py-2 text-slate-200 hover:text-amber-400">Competitions</Link>
          <Link to="/insurance-info" onClick={() => setIsOpen(false)} className="block py-2 text-slate-200 hover:text-amber-400">Insurance Info</Link>
          <Link to="/contact" onClick={() => setIsOpen(false)} className="block py-2 text-slate-200 hover:text-amber-400">Contact</Link>
          
          <button 
            onClick={() => { setIsOpen(false); handleNavRegister(); }} 
            className="w-full py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-black font-extrabold text-sm rounded-xl shadow-lg shadow-amber-500/20 hover:opacity-90 transition cursor-pointer"
          >
            Register Team
          </button>

          {/* MOBILE: LOGGED-IN STATE */}
          {user ? (
            <div className="pt-2 border-t border-white/10 space-y-2">
              {canSeeMrdgaDashboard && (
                <button
                  onClick={() => { setIsOpen(false); navigate('/admin'); }}
                  className="w-full py-2.5 px-4 bg-amber-500/20 border border-amber-500/30 text-amber-400 font-extrabold rounded-xl flex items-center gap-2 cursor-pointer text-xs"
                >
                  <LayoutDashboard className="w-4 h-4" /> Admin Dashboard
                </button>
              )}

              {userRole === 'team' && (
                <button
                  onClick={() => { setIsOpen(false); navigate('/my-status'); }}
                  className="w-full py-2.5 px-4 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-extrabold rounded-xl flex items-center gap-2 cursor-pointer text-xs"
                >
                  <Shield className="w-4 h-4" /> My Status / Portal
                </button>
              )}

              <button
                onClick={handleLogout}
                className="w-full py-2 px-4 bg-red-500/10 text-red-400 text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </div>
          ) : (
            <Link to="/login" onClick={() => setIsOpen(false)} className="block py-2 text-slate-400 text-xs">Admin Login</Link>
          )}
        </div>
      )}
    </nav>
  );
}