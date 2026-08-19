// ==========================================
// #SECTION 1: IMPORTS
// ==========================================
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Menu, X, LayoutDashboard, LogOut, LogIn } from 'lucide-react';

import NotificationBell from './NotificationBell';

// 💡 Firebase Imports
import { auth, db } from '../firebase/config';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

import { useCompetitions } from '../hooks/useCompetitions';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // 'admin' | 'team' | 'guest'
  const [userDepartment, setUserDepartment] = useState('MRDGA'); // 🏢 Default MRDGA
  const [dbRole, setDbRole] = useState(''); // 'Super Admin', 'Competition', 'Directory', etc.
  const [hasTeamData, setHasTeamData] = useState(false); // 🎯 Admin युझरची स्वतःची पर्सनल टिम आहे का हे तपासण्यासाठी

  const navigate = useNavigate();

  // 💡 अचूक रोल व विभाग चेकिंग (Users -> Teams -> Insurance)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser && currentUser.email) {
        try {
          const emailLower = currentUser.email.toLowerCase().trim();

          // 🎯 Push Permission & FCM Token Save ट्रिगर
          import('../services/notificationService.js').then(m => {
            m.notificationService.requestPushPermission(emailLower);
          });

          // १. 'users' मध्ये Admin/Staff चेकिंग
          const userDocRef = doc(db, 'users', emailLower);
          const userDocSnap = await getDoc(userDocRef);

          let isAdminUser = false;

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            const isActive = userData.isActive !== false && userData.status !== 'Inactive';
            const userRoleInDb = userData.role || 'Reviewer';

            // 🎯 सर्व चालू आणि नवीन रोल्स तपासणे (Competition, Directory, Insurance, Viewer, Admin, Super Admin, Reviewer)
            const allowedAdminRoles = [
              'Super Admin', 
              'Admin', 
              'Reviewer', 
              'Competition', 
              'Directory', 
              'Insurance', 
              'Viewer'
            ];

            if (isActive && allowedAdminRoles.includes(userRoleInDb)) {
              isAdminUser = true;
              setUserRole('admin');
              setDbRole(userRoleInDb);
              setUserDepartment(userData.department || 'MRDGA');
            }
          }

          // २. 'teams' आणि 'insurance_requests_2026' मध्ये वैयक्तिक अर्ज शोधणे
          const [teamSnap, insuranceSnap] = await Promise.all([
            getDocs(query(collection(db, 'teams'), where('email', '==', emailLower))),
            getDocs(query(collection(db, 'insurance_requests_2026'), where('email', '==', emailLower)))
          ]);

          const hasPersonalReg = !teamSnap.empty || !insuranceSnap.empty;

          if (!isAdminUser) {
            if (hasPersonalReg) {
              setUserRole('team');
            } else {
              setUserRole('guest');
            }
          }

          setHasTeamData(hasPersonalReg);

        } catch (err) {
          console.error("Role checking error:", err);
          setUserRole('guest');
          setHasTeamData(false);
        }
      } else {
        setUserRole(null);
        setDbRole('');
        setHasTeamData(false);
      }
    });
    return () => unsubscribe();
  }, []);

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
      setDbRole('');
      setHasTeamData(false);
      navigate('/');
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  // 🎯 रोलनुसार डॅशबोर्डकडे नेणारे स्मार्ट हँडलर
  const handleAdminDashboardClick = () => {
    if (userDepartment === 'INSURANCE' || dbRole === 'Insurance') {
      navigate('/admin/insurance');
    } else if (dbRole === 'Directory') {
      navigate('/admin/mandal-directory');
    } else {
      navigate('/admin');
    }
  };

  // 🔐 ॲडमिन बटण दिसण्यासाठी चेकिंग (सर्व रोल्ससाठी TRUE)
  const canSeeMrdgaDashboard = userRole === 'admin';

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
            <Link to="/gallery" className="text-sm font-medium text-slate-300 hover:text-amber-400 transition">Gallery</Link>
          </div>

          {/* 🎯 RIGHT SECTION: BELL ICON + PROFILE / LOGIN / MOBILE TOGGLE */}
          <div className="flex items-center gap-3">
            
            {/* 🔔 NOTIFICATION BELL - Always Visible */}
            <div className="flex items-center">
              <NotificationBell />
            </div>

            {/* 👑 DESKTOP LOGGED-IN / LOGGED-OUT BUTTONS */}
            <div className="hidden md:flex items-center gap-2 border-l border-white/10 pl-3">
              {user ? (
                <>
                  {/* 👑 1. Admin Dashboard Button (Competition/Directory/Insurance सर्व रोल्ससाठी दिसेल) */}
                  {canSeeMrdgaDashboard && (
                    <button
                      onClick={handleAdminDashboardClick}
                      className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500 hover:text-black font-extrabold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <LayoutDashboard className="w-4 h-4" /> Admin Dashboard
                    </button>
                  )}

                  {/* 🛡️ 2. My Status Button */}
                  {(userRole === 'team' || userRole === 'guest' || hasTeamData) && (
                    <button
                      onClick={() => navigate('/my-status')}
                      className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-black font-extrabold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Shield className="w-4 h-4" /> My Status
                    </button>
                  )}

                  {/* Logout Button */}
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
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-extrabold text-xs rounded-xl shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition cursor-pointer" 
                  title="लॉगिन करा"
                >
                  <LogIn className="w-4 h-4" />
                  <span>लॉगिन (Login)</span>
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
          {/* 📸 🆕 Gallery Link */}
          <Link to="/gallery" onClick={() => setIsOpen(false)} className="block py-2 text-slate-200 hover:text-amber-400">Gallery</Link>

          {/* MOBILE: LOGGED-IN STATE */}
          {user ? (
            <div className="pt-2 border-t border-white/10 space-y-2">
              {canSeeMrdgaDashboard && (
                <button
                  onClick={() => { setIsOpen(false); handleAdminDashboardClick(); }}
                  className="w-full py-2.5 px-4 bg-amber-500/20 border border-amber-500/30 text-amber-400 font-extrabold rounded-xl flex items-center gap-2 cursor-pointer text-xs"
                >
                  <LayoutDashboard className="w-4 h-4" /> Admin Dashboard
                </button>
              )}

              {(userRole === 'team' || userRole === 'guest' || hasTeamData) && (
                <button
                  onClick={() => { setIsOpen(false); navigate('/my-status'); }}
                  className="w-full py-2.5 px-4 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-extrabold rounded-xl flex items-center gap-2 cursor-pointer text-xs"
                >
                  <Shield className="w-4 h-4" /> My Status
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
            <div className="pt-2 border-t border-white/10">
              <Link 
                to="/login" 
                onClick={() => setIsOpen(false)} 
                className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-extrabold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>लॉगिन (Login)</span>
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}