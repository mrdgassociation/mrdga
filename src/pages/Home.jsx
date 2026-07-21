import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SplashScreen from '../components/SplashScreen';
import { Shield, Trophy, Users, Calendar, MapPin, ChevronRight, Award } from 'lucide-react';

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);
  const navigate = useNavigate();

  return (
    <>
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} season="2026" />}

      <div className="min-h-screen flex flex-col bg-brand-dark text-white">
        <Navbar />

        {/* Hero Banner Section */}
        <div className="relative overflow-hidden py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-amber-500/10 via-transparent to-transparent">
          <div className="max-w-7xl mx-auto text-center space-y-6 relative z-10">
            
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold uppercase tracking-wider">
              <Award className="w-4 h-4" /> राज्यस्तरीय दहीहंडी स्पर्धा २०२६
            </div>

            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-tight">
              महाराष्ट्र राज्य <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">दहीहंडी गोविंद असोसिएशन</span>
            </h1>

            <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto font-medium">
              परंपरा, संस्कृती आणि भव्यतेचा संगम! MRDGA च्या अधिकृत पोर्टलवर आपल्या संघाची नावनोंदणी करा.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/form/2026')}
                className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-black font-extrabold text-base rounded-2xl shadow-xl shadow-amber-500/20 hover:scale-105 transition duration-200 flex items-center justify-center gap-2"
              >
                ऑनलाइन संघ नोंदणी करा <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Event Info Cards */}
        <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-6 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400"><Calendar className="w-8 h-8" /></div>
            <div>
              <p className="text-xs text-slate-400 font-semibold">स्पर्धा दिनांक</p>
              <p className="text-lg font-bold text-white">३० ऑगस्ट २०२६</p>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400"><MapPin className="w-8 h-8" /></div>
            <div>
              <p className="text-xs text-slate-400 font-semibold">स्थान / ठिकाण</p>
              <p className="text-lg font-bold text-white">वामन दुबाशी मैदान, विलेपार्ले</p>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400"><Trophy className="w-8 h-8" /></div>
            <div>
              <p className="text-xs text-slate-400 font-semibold">रजिस्ट्रेशन सुरु</p>
              <p className="text-lg font-bold text-white">२५ जुलै पासून</p>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </>
  );
}