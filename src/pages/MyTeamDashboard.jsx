import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Shield, Trophy, FileText, CheckCircle, Clock, XCircle, User, Phone, MapPin, Loader2, Award } from 'lucide-react';

export default function MyTeamDashboard() {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [myTeams, setMyTeams] = useState([]);
  const [activeTab, setActiveTab] = useState('applications'); 

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.email) {
        setCurrentUser(user);
        try {
          // 🔍 'teams' कलेक्शनमधून या ईमेलचे सर्व अर्ज फेच करणे
          const q = query(collection(db, 'teams'), where('email', '==', user.email));
          const querySnapshot = await getDocs(q);
          const teamsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setMyTeams(teamsData);
        } catch (error) {
          console.error("Error fetching user team status:", error);
        } finally {
          setLoading(false);
        }
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Status Badge Helper
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved':
        return <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-extrabold text-xs rounded-full"><CheckCircle className="w-3.5 h-3.5"/> मंजूर (Approved)</span>;
      case 'Rejected':
        return <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-500/10 border border-red-500/30 text-red-400 font-extrabold text-xs rounded-full"><XCircle className="w-3.5 h-3.5"/> नामंजूर (Rejected)</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 font-extrabold text-xs rounded-full"><Clock className="w-3.5 h-3.5"/> प्रलंबित (Pending)</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08090d] text-white flex flex-col justify-between">
        <Navbar />
        <div className="text-center py-20 text-amber-400 font-bold flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> माहिती शोधत आहे...
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#08090d] text-white font-sans">
      <Navbar />

      {/* Header Banner */}
      <div className="py-5 px-4 bg-gradient-to-b from-amber-500/10 via-transparent to-transparent border-b border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <Shield className="w-6 h-6 text-amber-400" /> माझे संघ व अर्ज (Team Portal)
            </h1>
            <p className="text-slate-400 text-xs mt-0.5">लॉगिन ईमेल: <span className="text-amber-400 font-mono">{currentUser?.email}</span></p>
          </div>
        </div>
      </div>

      {/* Scalable Navigation Tabs (विमा आणि कागदपत्रे Disabled केले आहेत) */}
      <div className="max-w-7xl mx-auto px-4 pt-4 w-full">
        <div className="flex border-b border-slate-800 gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('applications')}
            className={`py-2.5 px-4 font-extrabold text-xs rounded-t-xl transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'applications'
                ? 'bg-[#0c0d14] border-t-2 border-amber-500 text-amber-400 border-x border-slate-800'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Trophy className="w-4 h-4" /> माझे अर्ज ({myTeams.length})
          </button>

          {/* 🛑 DISABLED TAB: Insurance */}
          <button
            disabled
            className="py-2.5 px-4 font-extrabold text-xs rounded-t-xl flex items-center gap-2 opacity-50 cursor-not-allowed text-slate-500 bg-slate-900/30 border-x border-t border-transparent"
            title="हे फीचर लवकरच उपलब्ध होईल"
          >
            <Shield className="w-4 h-4" /> गोविंदा विमा <span className="text-[9px] bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded ml-1">लवकरच</span>
          </button>

          {/* 🛑 DISABLED TAB: Documents */}
          <button
            disabled
            className="py-2.5 px-4 font-extrabold text-xs rounded-t-xl flex items-center gap-2 opacity-50 cursor-not-allowed text-slate-500 bg-slate-900/30 border-x border-t border-transparent"
            title="हे फीचर लवकरच उपलब्ध होईल"
          >
            <FileText className="w-4 h-4" /> पावत्या/पास <span className="text-[9px] bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded ml-1">लवकरच</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 py-6 w-full flex-1">
        
        {/* TAB 1: APPLICATIONS LIST */}
        {activeTab === 'applications' && (
          <div className="space-y-4">
            {myTeams.length === 0 ? (
              <div className="p-8 bg-[#0c0d14] border border-slate-800 rounded-3xl text-center space-y-3">
                <p className="text-slate-400 text-xs">या ईमेल आयडीने कोणताही नोंदणी अर्ज भरलेला नाही.</p>
                <a href="#/form/2026" className="inline-block px-4 py-2 bg-amber-500 text-black font-extrabold text-xs rounded-xl">
                  नवीन संघ नोंदणी करा 🚀
                </a>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myTeams.map((team) => (
                  <div key={team.id} className="bg-[#0c0d14] border border-slate-800 hover:border-amber-500/40 transition-colors rounded-[24px] p-5 space-y-4 shadow-xl relative overflow-hidden">
                    
                    {/* Top Status & Reg ID Header */}
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">REGISTRATION ID</span>
                        <span className="font-mono text-xs font-black text-amber-400">{team.registrationId}</span>
                      </div>
                      {getStatusBadge(team.status)}
                    </div>

                    {/* 🏆 स्पर्धेचे नाव (Competition Name Banner) */}
                    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-3 py-2 flex items-center gap-2">
                      <Award className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span className="text-xs font-extrabold text-indigo-300 line-clamp-1">
                        {team.competitionName || `MRDGA अधिकृत दहीहंडी स्पर्धा - ${team.season || '2026'}`}
                      </span>
                    </div>

                    {/* Team & Captain Details */}
                    <div className="space-y-2.5">
                      <h3 className="text-[17px] font-black text-white">{team.teamName}</h3>
                      <div className="grid grid-cols-2 gap-2.5 text-xs text-slate-300 pt-1">
                        <p className="flex items-center gap-1.5 truncate" title={`${team.district}, ${team.vibhag}`}>
                          <MapPin className="w-4 h-4 text-amber-400 shrink-0"/> {team.district}, {team.vibhag}
                        </p>
                        <p className="flex items-center gap-1.5">
                          <Trophy className="w-4 h-4 text-amber-400 shrink-0"/> गट: <span className="font-bold text-white">{team.category}</span>
                        </p>
                        <p className="flex items-center gap-1.5 truncate">
                          <User className="w-4 h-4 text-amber-400 shrink-0"/> कॅप्टन: {team.captain?.name}
                        </p>
                        <p className="flex items-center gap-1.5">
                          <Phone className="w-4 h-4 text-amber-400 shrink-0"/> {team.captain?.phone}
                        </p>
                      </div>
                    </div>

                    {/* Bottom Box (Season & Players) */}
                    <div className="mt-2 p-3 bg-[#12141f] rounded-xl border border-slate-800 flex justify-between items-center text-[11px] text-slate-400">
                      <span>हंगाम (Season): <strong className="text-white">{team.season || '2026'}</strong></span>
                      <span>एकूण खेळाडू: <strong className="text-amber-400 font-bold">{team.playerCount}</strong></span>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      <Footer />
    </div>
  );
}