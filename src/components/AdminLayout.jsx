import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Shield, LayoutDashboard, LogOut, ArrowLeft, Menu, X, User, FileText, UserCheck,Sliders,Bell } from 'lucide-react';
import { authService } from '../services/authService';

export default function AdminLayout({ children }) {
  // 💡 User Role & Profile States
  const [userRole, setUserRole] = useState('Reviewer');
  const [currentUser, setCurrentUser] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = authService.getCurrentUser(async (user) => {
      if (user) {
        setCurrentUser(user);
        
        // 💡 Fetch Role from Firestore
        try {
          const uDoc = await authService.getUserRole(user.email);
          if (uDoc && uDoc.role) {
            setUserRole(uDoc.role); // Sets 'Super Admin', 'Admin', or 'Reviewer'
          }
        } catch (e) {
          console.error("Error fetching role in layout:", e);
        }
      } else {
        navigate('/login');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await authService.logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#08090d] text-white flex flex-col md:flex-row font-sans">
      
      {/* 🔹 Mobile Top Navbar */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-[#0c0d14] border-b border-amber-500/20 sticky top-0 z-40">
      <div className="flex items-center gap-2.5">
  <img 
    src="./mrdga-logo.png" 
    alt="MRDGA Logo" 
    className="w-8 h-8 object-contain rounded-lg shrink-0"
    onError={(e) => {
      // फॉलबॅक जर फाईल सापडली नाही तर
      console.error("Logo failed to load from ./mrdga-logo.png");
    }}
  />
  <span className="font-black text-sm text-white">
    MRDGA <span className="text-amber-400">Admin</span>
  </span>
</div>

        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-gray-300 hover:text-white bg-black/40 rounded-lg border border-amber-500/20"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* 🔹 Desktop Sidebar & Mobile Slide-Over Drawer */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50
          w-64 bg-[#0c0d14] border-r border-amber-500/20 p-4 flex flex-col justify-between shrink-0
          transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="space-y-6">
          
          {/* Logo & Mobile Close Header */}
          <div className="flex items-center gap-3">
            <img 
              src="./mrdga-logo.png" 
              alt="MRDGA Logo" 
              className="w-9 h-9 object-contain rounded-lg shrink-0"
            />
            <div>
              <h1 className="font-black text-sm text-white leading-tight">MRDGA Admin</h1>
              <p className="text-[10px] text-amber-400 font-medium">कंट्रोल पॅनेल</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            <Link
              to="/admin"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                location.pathname === '/admin'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-black shadow-lg shadow-amber-500/20'
                  : 'text-gray-300 hover:bg-white/5'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" /> डॅशबोर्ड (अर्ज यादी)
            </Link>

            <Link
              to="/admin/reports"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                location.pathname === '/admin/reports'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-black shadow-lg shadow-amber-500/20'
                  : 'text-gray-300 hover:bg-white/5'
              }`}
            >
              <FileText className="w-4 h-4" /> रिपोर्ट्स & एक्सपोर्ट
            </Link>

            {/* 🔒 User Access Menu (Only for Super Admin) */}
            {userRole === 'Super Admin' && (
              <Link
                to="/admin/users"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                  location.pathname === '/admin/users'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-black shadow-lg shadow-amber-500/20'
                    : 'text-gray-300 hover:bg-white/5'
                }`}
              >
                <UserCheck className="w-4 h-4 text-amber-400" /> युझर मॅनेजमेंट
              </Link>
            )}

             {userRole === 'Super Admin' && (
              <Link
                to="/admin/settings"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                  location.pathname === '/admin/settings'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-black shadow-lg shadow-amber-500/20'
                    : 'text-gray-300 hover:bg-white/5'
                }`}
              >
                <Sliders className="w-4 h-4 text-amber-400" /> पेजेस ऑन/ऑफ (Settings)
              </Link>
            )}

            {/* 🔒 5. नोटिफिकेशन सेंटर (Only Super Admin) */}
              {userRole === 'Super Admin' && (
                <Link
                  to="/admin/notifications"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                    location.pathname === '/admin/notifications'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-black shadow-lg shadow-amber-500/20'
                      : 'text-gray-300 hover:bg-white/5'
                  }`}
                >
                  <Bell className={`w-4 h-4 shrink-0 ${location.pathname === '/admin/notifications' ? 'text-black' : 'text-amber-400'}`} /> 
                  नोटीफिकेशन सेंटर
                </Link>
              )}

            <Link
              to="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 transition pt-2"
            >
              <ArrowLeft className="w-4 h-4" /> मुख्य वेबसाईटवर जा
            </Link>
          </nav>
        </div>

        {/* Profile & Logout */}
        {currentUser && (
          <div className="pt-4 border-t border-amber-500/10 space-y-3">
            <div className="flex items-center gap-2.5 px-2">
              {currentUser.photoURL ? (
                <img src={currentUser.photoURL} alt="User" className="w-8 h-8 rounded-full border border-amber-400" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400">
                  <User className="w-4 h-4" />
                </div>
              )}
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-white truncate">{currentUser.displayName || "Admin"}</p>
                <p className="text-[10px] text-gray-400 truncate">{currentUser.email}</p>
              </div>
            </div>

            <button
              onClick={() => { setIsMobileMenuOpen(false); handleLogout(); }}
              className="w-full py-2 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition"
            >
              <LogOut className="w-3.5 h-3.5" /> बाहेर पडा (Logout)
            </button>
          </div>
        )}
      </aside>

      {/* Overlay Backdrop for Mobile Menu */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      {/* 🔹 Main Content Body */}
      <main className="flex-1 p-3 sm:p-6 overflow-y-auto w-full">
        {children}
      </main>

    </div>
  );
}