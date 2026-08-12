import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  ShieldCheck, LayoutDashboard, LogOut, ArrowLeft, Menu, X, 
  User, FileText, UserCheck, Sliders, Bell, Trophy, Lock, BookOpen
} from 'lucide-react';
import { authService } from '../services/authService';
import { dataService } from '../services/dataService';

export default function AdminLayout({ children }) {
  const [userRole, setUserRole] = useState('Reviewer');
  const [userDepartment, setUserDepartment] = useState('MRDGA');
  const [currentUser, setCurrentUser] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [pageConfig, setPageConfig] = useState({});
  const [loadingConfig, setLoadingConfig] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = authService.getCurrentUser(async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const uDoc = await authService.getUserRole(user.email);
          if (uDoc) {
            if (uDoc.role) setUserRole(uDoc.role);
            if (uDoc.department) setUserDepartment(uDoc.department);
          }
        } catch (e) {
          console.error("Error fetching role/department in layout:", e);
        }
      } else {
        navigate('/login');
      }
    });

    const fetchConfig = async () => {
      try {
        const cfg = await dataService.getPageConfig();
        if (cfg) setPageConfig(cfg);
      } catch (err) {
        console.error("Error fetching page config in layout:", err);
      } finally {
        setLoadingConfig(false);
      }
    };
    fetchConfig();

    return () => unsubscribe();
  }, [navigate]);

  // 🔐 नियम ७: Super Admin Check (Department: SUPER and Role: Super Admin)
  const isSuperAdminUser = userDepartment === 'SUPER' && userRole === 'Super Admin';

  // 🔒 नियम ४ व ५: Department-wise Menus Access
  const canSeeCompetition = (userRole === 'Super Admin' || userDepartment === 'SUPER' || userDepartment === 'MRDGA') && userDepartment !== 'INSURANCE';
  const canSeeInsurance = userRole === 'Super Admin' || userDepartment === 'SUPER' || userDepartment === 'INSURANCE' || userDepartment === 'MRDGA';

  // 🎯 स्मार्ट ऑटो-रिडायरेक्शन लॉजिक (नियमांनुसार)
  useEffect(() => {
    if (loadingConfig || !currentUser) return;

    // नियम ४: Insurance Team ला फक्त Insurance चाच ॲक्सेस असेल
    if (userDepartment === 'INSURANCE' && location.pathname !== '/admin/insurance') {
      navigate('/admin/insurance', { replace: true });
      return;
    }

    // नियम १, २ व ३: /admin वर आल्यावर सक्रिय असलेला पहिला मेन्यू शोधणे
    if (location.pathname === '/admin') {
      const isCompOn = pageConfig.showCompetitionsMenu !== false;
      const isInsOn = pageConfig.showInsuranceMenu !== false;

      // जर स्पर्धा फॉर्म बंद असेल आणि विमा चालू असेल, तर थेट विम्यावर पाठवा
      if (!isCompOn && canSeeInsurance && isInsOn) {
        navigate('/admin/insurance', { replace: true });
      }
    }
  }, [location.pathname, pageConfig, userDepartment, loadingConfig, currentUser, navigate]);

  const handleLogout = async () => {
    await authService.logout();
    navigate('/');
  };

  // नियम १: जर सर्व मेन्यू बंद असतील तर डॅशबोर्ड उघडू नका
  const areAllMenusDisabled = 
    pageConfig.showCompetitionsMenu === false &&
    pageConfig.showInsuranceMenu === false &&
    pageConfig.showDahiHandiScoringMenu === false &&
    pageConfig.showReportsMenu === false &&
    !isSuperAdminUser;

  if (!loadingConfig && areAllMenusDisabled) {
    return (
      <div className="min-h-screen bg-[#08090d] text-white flex items-center justify-center p-6 text-center font-sans">
        <div className="bg-[#0c0d14] border border-rose-500/30 p-8 rounded-3xl max-w-md space-y-4 shadow-2xl">
          <Lock className="w-12 h-12 text-rose-500 mx-auto animate-bounce" />
          <h2 className="text-lg font-black text-white">ॲडमिन डॅशबोर्ड सध्या बंद आहे</h2>
          <p className="text-xs text-gray-400">
            सध्या सर्व ॲडमिन मेन्यू बंद (OFF) ठेवण्यात आले आहेत. अधिक माहितीसाठी मुख्य ॲडमिनशी संपर्क साधा.
          </p>
          <button 
            onClick={handleLogout}
            className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl transition cursor-pointer"
          >
            बाहेर पडा (Logout)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08090d] text-white flex flex-col md:flex-row font-sans">
      
      {/* 🔹 Mobile Top Navbar */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-[#0c0d14] border-b border-amber-500/20 sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <img 
            src="./mrdga-logo.png" 
            alt="MRDGA Logo" 
            className="w-8 h-8 object-contain rounded-lg shrink-0"
            onError={(e) => { e.target.style.display = 'none'; }}
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
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div>
              <h1 className="font-black text-sm text-white leading-tight">MRDGA Admin</h1>
              <p className="text-[10px] text-amber-400 font-medium">कंट्रोल पॅनेल ({userDepartment})</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">

            {/* 🛡️ गोविंदा विमा अर्ज (Insurance, MRDGA, SUPER) */}
            {canSeeInsurance && pageConfig.showInsuranceMenu !== false && (
              <Link
                to="/admin/insurance"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                  location.pathname === '/admin/insurance'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-black shadow-lg shadow-amber-500/20'
                    : 'text-gray-300 hover:bg-white/5'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-amber-400" /> गोविंदा विमा अर्ज (Insurance)
              </Link>
            )}

            {/* 🏆 स्पर्धा अर्ज (MRDGA व SUPER साठी, Insurance साठी नाही) */}
            {canSeeCompetition && pageConfig.showCompetitionsMenu !== false && (
              <Link
                to="/admin"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                  location.pathname === '/admin'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-black shadow-lg shadow-amber-500/20'
                    : 'text-gray-300 hover:bg-white/5'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" /> स्पर्धा अर्ज (Competitions)
              </Link>
            )}

            {/* 🚩 दहीहंडी स्पर्धा व्यवस्थापन (MRDGA व SUPER साठी) */}
            {canSeeCompetition && pageConfig.showDahiHandiScoringMenu !== false && (
              <Link
                to="/admin/tournaments"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                  location.pathname === '/admin/tournaments'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-black shadow-lg shadow-amber-500/20'
                    : 'text-amber-400 hover:bg-white/5 border border-amber-500/20'
                }`}
              >
                <Trophy className="w-4 h-4 shrink-0 text-amber-400" /> दहीहंडी स्पर्धा (Scoring)
              </Link>
            )}

            {/* 📖 🆕 गोविंदा पथक डिरेक्टरी (MRDGA व SUPER साठी) */}
            {canSeeCompetition && (
              <Link
                to="/admin/mandal-directory"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                  location.pathname === '/admin/mandal-directory'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-black shadow-lg shadow-amber-500/20'
                    : 'text-gray-300 hover:bg-white/5'
                }`}
              >
                <BookOpen className="w-4 h-4 shrink-0 text-amber-400" /> पथक डिरेक्टरी (Directory)
              </Link>
            )}

            {/* 📊 रिपोर्ट्स & एक्सपोर्ट */}
            {userDepartment !== 'INSURANCE' && pageConfig.showReportsMenu !== false && (
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
            )}

            {/* 🔒 नियम ७: युझर मॅनेजमेंट (Only for SUPER Dept + Super Admin Role) */}
            {isSuperAdminUser && (
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

            {/* ⚙️ नियम ७: पेजेस ऑन/ऑफ (Settings - Only for SUPER Dept + Super Admin Role) */}
            {isSuperAdminUser && (
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

            {/* 🔔 नियम ७: नोटीफिकेशन सेंटर (Only for SUPER Dept + Super Admin Role) */}
            {isSuperAdminUser && (
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

            {/* 🏠 मुख्य वेबसाईटवर जा */}
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
              className="w-full py-2 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
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