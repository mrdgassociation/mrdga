import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SplashScreen from '../components/SplashScreen';
import InstallPWAButton from '../components/InstallPWAButton';
import Swal from 'sweetalert2';

import { useCompetitions } from '../hooks/useCompetitions';

import { 
  Shield, Trophy, Users, Calendar, MapPin, ChevronRight, 
  Award, HeartPulse, FileText, PhoneCall, CheckCircle2, Info, ShieldCheck, Sparkles, Clock, CheckCircle
} from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();

  const [showSplash, setShowSplash] = useState(() => {
    const hasSeenSplash = sessionStorage.getItem('hasSeenSplash');
    return !hasSeenSplash;
  });

  const handleSplashFinish = () => {
    sessionStorage.setItem('hasSeenSplash', 'true');
    setShowSplash(false);
  };

  const { competitions } = useCompetitions();

  const getActiveCompId = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    const liveComp = competitions.find(c => c.startDate <= todayStr && c.endDate >= todayStr);
    if (liveComp) return liveComp.competitionId || liveComp.id;

    const upcomingComp = competitions.find(c => c.startDate > todayStr);
    if (upcomingComp) return upcomingComp.competitionId || upcomingComp.id;

    if (competitions.length > 0) {
      return competitions[0].competitionId || competitions[0].id;
    }

    return '2026';
  };

  // 🗓️ १६ ऑगस्ट रात्री १२ वाजेपर्यंतच सोहळ्याचा कार्ड दाखवायचा की नाही ते तपासणे
  const isSohalaActive = new Date() <= new Date('2026-08-16T23:59:59');

  return (
    <>
      {showSplash && <SplashScreen onFinish={handleSplashFinish} season="2026" />}

      <div className="min-h-screen flex flex-col bg-[#08090d] text-white font-sans">
        <Navbar />

        {/* 🌟 1. HERO BANNER SECTION */}
        <div className="relative overflow-hidden pt-10 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-amber-500/15 via-orange-500/5 to-transparent border-b border-amber-500/10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />

          <div className="max-w-7xl mx-auto text-center space-y-6 relative z-10">
            
            {/* 🚩 १६ ऑगस्ट कृष्णानंद सोहळा बॅज */}
            {isSohalaActive && (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-500/20 via-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-wider animate-bounce">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>विशेष निमंत्रण: भव्य 'कृष्णानंद सोहळा' (रविवार, १६ ऑगस्ट)</span>
              </div>
            )}

            <h1 className="text-3xl sm:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-tight">
              महाराष्ट्र राज्य <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500">दहीहंडी गोविंदा असोसिएशन</span>
            </h1>

            <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto font-medium leading-relaxed">
              परंपरा, संस्कृती, सुरक्षितता आणि भव्यतेचा संगम! असोसिएशनच्या अधिकृत डिजिटल प्लॅटफॉर्मद्वारे विविध उपक्रम, महत्त्वाच्या सूचना आणि ताज्या अपडेट्सशी सतत जोडलेले रहा..
            </p>

            {/* CTA Buttons */}
            <div className="pt-4 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">

              {/* 🛡️ १. दहीहंडी विमा माहिती बटण (Redirect to Insurance Info) */}
<div className="relative w-full sm:w-auto">
  <button
    type="button"
    onClick={() => navigate('/insurance-info')} // तुमच्या विमा माहिती पेजचा route
    className="w-full sm:w-auto px-6 py-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 border border-amber-500/40 hover:border-amber-400 text-amber-300 hover:text-white font-extrabold text-sm rounded-2xl transition flex items-center justify-center gap-2.5 shadow-lg shadow-amber-500/10 cursor-pointer group"
  >
    <ShieldCheck className="w-5 h-5 text-amber-400 group-hover:scale-110 transition shrink-0" />
    <span>🛡️ गोविंदा विमा माहिती</span>
  </button>
</div>

              {/* 🏆 २. स्पर्धा नोंदणी बटण (Disable / नोंदणी थांबवली) */}
              <button
                disabled
                className="w-full sm:w-auto px-8 py-4 bg-slate-800 border border-slate-700 text-slate-500 font-extrabold text-sm sm:text-base rounded-2xl flex items-center justify-center gap-2 cursor-not-allowed opacity-60"
              >
                <Trophy className="w-5 h-5 text-slate-500 shrink-0" />
                दहीहंडी स्पर्धा नोंदणी (नोंदणी बंद)
              </button>

              {/* ℹ️ ३. असोसिएशन बद्दल */}
              <Link
                to="/about"
                className="w-full sm:w-auto px-6 py-4 bg-slate-900 border border-slate-800 hover:border-amber-500/50 text-slate-300 font-bold text-sm rounded-2xl transition flex items-center justify-center gap-2"
              >
                असोसिएशन बद्दल <Info className="w-4 h-4 text-amber-400 shrink-0" />
              </Link>

            </div>

          </div>
        </div>

        {/* 🚩 2. SPECIAL 'KRISHNANAND SOHALA' RSVP BANNER CARD (फक्त १६ ऑगस्टपर्यंतच दिसेल) */}
        {isSohalaActive && (
          <div className="max-w-7xl mx-auto px-4 -mt-6 relative z-20 w-full">
            <div className="bg-gradient-to-br from-[#0d101d] via-[#121629] to-[#0c0d14] border-2 border-amber-500/40 p-5 sm:p-7 rounded-3xl shadow-2xl backdrop-blur-xl space-y-4">
              
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-amber-500/20 pb-4">
                <div className="flex items-center gap-3.5">
                  <div className="p-3 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-2xl shrink-0">
                    <Sparkles className="w-7 h-7 text-amber-400" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30 uppercase tracking-wider">
                      सस्नेह जय गोपाळ! • निमंत्रण पत्र
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-white mt-1 leading-tight">
                      भव्य <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-400">'कृष्णानंद सोहळा'</span>
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
                  <span className="bg-amber-500 text-black px-3.5 py-1.5 rounded-xl text-xs font-black font-mono shadow-md">
                    रविवार, १६ ऑगस्ट २०२६
                  </span>
                  <span className="bg-slate-800 text-amber-300 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold font-mono">
                    सकाळी १०:०० वाजता
                  </span>
                  <a 
                    href="https://maps.app.goo.gl/NwV7HFxbC7PR38oT6" 
                    target="_blank" 
                    rel="noreferrer"
                    className="bg-slate-800 hover:bg-amber-500 hover:text-black text-amber-400 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                    title="गूगल मॅपवर दिशा पाहा"
                  >
                    <MapPin className="w-3.5 h-3.5" /> Map 🗺️
                  </a>
                </div>
              </div>

              <div className="space-y-2 text-slate-200 text-xs sm:text-sm leading-relaxed font-medium">
                <p>
                  तमाम महिला व पुरुष दहीहंडी पथकांतील गोविंदांना आणि संघटकांना आदरपूर्वक आवाहन करण्यात येते की, महाराष्ट्र राज्य दहीहंडी गोविंदा असोसिएशनच्या वतीने भव्य <strong>'कृष्णानंद सोहळा'</strong> आयोजित करण्यात आला आहे.
                </p>
                <p className="text-amber-300/90 font-semibold">
                  📌 <strong>विशेष सूचना:</strong> कार्यक्रमाचे संयोजन आणि बैठकीचे स्वरूप लक्षात घेता, प्रत्येक दहीहंडी पथकातून <strong> २ प्रतिनिधींनी (खेळाडू/पदाधिकारी)</strong> वेळेवर उपस्थित राहावे, ही नम्र विनंती.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl flex items-start gap-3">
                
                  <MapPin className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">स्थान / ठिकाण</p>
                    <p className="text-xs font-bold text-white leading-snug">
                      राष्ट्रीय मिल मजदूर संघ, मजदूर मंजिल, जी. डी. आंबेकर रोड, भोईवाडा, परेल, मुंबई ४०००१२
                    </p>
                  </div>
                </div>

               

                <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl flex items-start gap-3">
                  <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">वेळ</p>
                    <p className="text-xs font-bold text-amber-300">सकाळी १०:०० वाजता (वेळेवर उपस्थित राहावे)</p>
                  </div>
                </div>

                {/* 📝 RSVP फॉर्म भरण्यासाठीचे बटण */}
                <div className="flex items-center justify-center bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 p-3 rounded-2xl">
                  <Link
                    to="/rsvp"
                    className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-extrabold text-xs sm:text-sm rounded-xl transition flex items-center justify-center gap-1.5 shadow-lg cursor-pointer"
                  >
                    <span>सोहळ्यासाठी उपस्थिती नोंदवा (RSVP)</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* 🏆 3. QUICK EVENT INFO CARDS */}
        <div className="max-w-7xl mx-auto px-4 mt-6 relative z-20 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          <div className="bg-[#0c0d14] border border-amber-500/20 p-5 rounded-2xl flex items-center gap-4 shadow-xl backdrop-blur-xl">
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 shrink-0"><Calendar className="w-7 h-7" /></div>
            <div>
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">मुख्य स्पर्धा दिनांक</p>
              <p className="text-base font-black text-white">३० ऑगस्ट २०२६</p>
            </div>
          </div>

          <div className="bg-[#0c0d14] border border-amber-500/20 p-5 rounded-2xl flex items-center gap-4 shadow-xl backdrop-blur-xl">
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 shrink-0"><MapPin className="w-7 h-7" /></div>
            <div>
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">स्पर्धेचे स्थान</p>
              <p className="text-base font-black text-white">वामन दुबाशी मैदान, विलेपार्ले</p>
            </div>
          </div>

          <div className="bg-[#0c0d14] border border-amber-500/20 p-5 rounded-2xl flex items-center gap-4 shadow-xl backdrop-blur-xl">
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 shrink-0"><Trophy className="w-7 h-7" /></div>
            <div>
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">रजिस्ट्रेशन मुदत</p>
              <p className="text-base font-black text-amber-400">९ ऑगस्ट २०२६ दुपारी १:०० वाजता </p>
            </div>
          </div>
        </div>

        {/* 📊 4. ABOUT MRDGA & STATS SECTION */}
        <div className="max-w-7xl mx-auto px-4 py-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-bold">
              <Shield className="w-3.5 h-3.5" /> आमचे ध्येय व उद्दिष्ट
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight">
              गोविंदांच्या सुरक्षेसाठी आणि खेळाच्या संवर्धनासाठी कार्यरत्!
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              महाराष्ट्र राज्य दहीहंडी गोविंदा असोसिएशन (MRDGA) ही संपूर्ण महाराष्ट्रातील दहीहंडी उत्सवाला अधिकृत क्रीडा प्रकाराचा दर्जा मिळवून देण्यासाठी आणि गोविंदा खेळाडूंच्या सुरक्षिततेसाठी बांधील असलेली सर्वोच्च संस्था आहे.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-300 font-medium"><strong className="text-white">गोविंदा विमा सुरक्षा:</strong> प्रत्येक सहभागी खेळाडूसाठी मोफत वैद्यकीय व अपघात विमा संरक्षण.</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-300 font-medium"><strong className="text-white">गोविंदा संघांचे सक्षमीकरण:</strong> राज्यभरातील गोविंदा संघांना एकत्र आणून समन्वय, सहकार्य आणि संघटन मजबूत करणे.</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-300 font-medium"><strong className="text-white">मार्गदर्शन व जनजागृती:</strong> सुरक्षित दहीहंडी, खेळाडूंचे आरोग्य आणि सामाजिक जबाबदारी याबाबत जनजागृती व मार्गदर्शन.</p>
              </div>
            </div>
          </div>

          {/* Right Poster / Highlight Card */}
          <div className="relative rounded-3xl overflow-hidden border border-amber-500/20 bg-[#0c0d14] p-6 text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl flex items-center justify-center mx-auto">
              <HeartPulse className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-amber-400">खेळाडू विमा व सुरक्षा मार्गदर्शन</h3>
            <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
              स्पर्धेदरम्यान किंवा सरावात दुखापत झाल्यास वैद्यकीय मदतीची आणि विमा क्लेमची पूर्ण प्रक्रिया असोसिएशनतर्फे हाताळली जाते.
            </p>
            <div className="pt-2">
              <Link to="/insurance-info" className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 font-bold text-xs rounded-xl transition">
                विमा नियमावली व क्लेम माहिती <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* 📋 5. COMPETITION RULES HIGHLIGHT */}
        <div className="bg-[#0b0c12] border-y border-slate-800/80 py-16 px-4">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">स्पर्धेची मुख्य नियमावली व सुरक्षा सूचना</h2>
              <p className="text-xs text-slate-400">सर्व गोविंदा पथकांनी खालील नियमांचे तंतोतंत पालन करणे अनिवार्य आहे</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-[#10121b] border border-slate-800 p-5 rounded-2xl space-y-2">
                <div className="text-amber-400 font-black text-lg">०१</div>
                <h4 className="font-bold text-white text-sm">वयोमर्यादा व नियम</h4>
                <p className="text-xs text-slate-400 leading-relaxed">१४ वर्षांखालील बालकांचा मानवी मनोऱ्यात समावेश करण्यास पूर्णपणे बंदी आहे. नियमांचे उल्लंघन केल्यास संघ बाद होईल.</p>
              </div>

              <div className="bg-[#10121b] border border-slate-800 p-5 rounded-2xl space-y-2">
                <div className="text-amber-400 font-black text-lg">०२</div>
                <h4 className="font-bold text-white text-sm">सुरक्षा किट व मॅट</h4>
                <p className="text-xs text-slate-400 leading-relaxed">वरच्या थरातील गोविंदांसाठी चेस्ट गार्ड आणि हेल्मेटचा वापर बंधनकारक आहे. मैदानात सुरक्षेसाठी मॅटची सोय असेल.</p>
              </div>

              <div className="bg-[#10121b] border border-slate-800 p-5 rounded-2xl space-y-2">
                <div className="text-amber-400 font-black text-lg">०३</div>
                <h4 className="font-bold text-white text-sm">वेळेचे पालन</h4>
                <p className="text-xs text-slate-400 leading-relaxed">दिलेल्या वेळेतच पथकाला सलामी देण्याची संधी मिळेल. वेळेत बदल करण्याचा अधिकार आयोजकांकडे राखीव राहील.</p>
              </div>
            </div>
          </div>
        </div>

        {/* 📞 6. HELPDESK & CONTACT BANNER */}
        <div className="max-w-7xl mx-auto px-4 py-12 w-full">
          <div className="bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-transparent border border-amber-500/30 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center sm:text-left">
              <h3 className="text-lg sm:text-xl font-black text-white">काही शंका किंवा अडचण आहे का?</h3>
              <p className="text-xs text-slate-300">आमच्या असोसिएशन हेल्पडेस्कशी संपर्क साधा किंवा संपर्क पानाला भेट द्या.</p>
            </div>
            <Link 
              to="/helpdesk"
              className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs rounded-xl transition flex items-center gap-2 shrink-0"
            >
              <PhoneCall className="w-4 h-4" /> असोसिएशन संपर्क केंद्र
            </Link>
          </div>
        </div>

        <Footer />
        <InstallPWAButton />

      </div>
    </>
  );
}