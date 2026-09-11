import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SplashScreen from '../components/SplashScreen';
import InstallPWAButton from '../components/InstallPWAButton';
import Swal from 'sweetalert2';

import { 
  Shield, ChevronRight, HeartPulse, 
  PhoneCall, CheckCircle2, Info, ShieldCheck, LogIn, FileSpreadsheet
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

// 🏥 विमा क्लेम प्रक्रिया दाखवणारा पॉपअप (ईमेल १-क्लिक कॉपीसह)
  const handleShowClaimSteps = () => {
    const OFFICIAL_EMAIL = "sachin.khanvilkar@orientalinsurance.co.in"; // 👈 तुमचा अधिकृत ईमेल
    const OFFICIAL_WHATSAPP = "918422919066";          // 👈 तुमचा व्हॉट्सॲप नंबर

    Swal.fire({
      title: 'गोविंदा विमा क्लेम प्रक्रिया (Insurance Claim Steps)',
      html: `
        <div style="text-align: left; font-size: 13px; line-height: 1.6; color: #cbd5e1; max-height: 65vh; overflow-y: auto; padding-right: 4px;">
          
          <!-- Step 1 -->
          <div style="background: rgba(245, 158, 11, 0.08); border-left: 3px solid #f59e0b; padding: 8px 12px; border-radius: 8px; margin-bottom: 10px;">
            <b style="color: #fbbf24; font-size: 14px;">Step 1: क्लेम नोंदणीसाठी माहिती पाठवणे</b>
            <p style="margin: 4px 0 0 0; color: #e2e8f0;">विमा क्लेम नोंदणीसाठी खालील माहिती ईमेलवर पाठवा:</p>
            <ul style="margin: 6px 0 0 16px; padding: 0; list-style-type: disc; color: #cbd5e1;">
              <li>मंडळाचे नाव व परिसर (Name of Mandal & Area)</li>
              <li>जखमी गोविंदाचे नाव (Name of Injured Govinda)</li>
              <li>अपघाताची तारीख (Date of Accident)</li>
              <li>अपघाताचा सविस्तर तपशील (Details of Accident)</li>
              <li>मंडळाच्या प्रतिनिधीचा मोबाईल नंबर व ईमेल (Contact No & Email)</li>
            </ul>
          </div>

          <!-- Step 2 (१-क्लिक कॉपी ईमेल) -->
          <div style="background: rgba(59, 130, 246, 0.08); border-left: 3px solid #3b82f6; padding: 8px 12px; border-radius: 8px; margin-bottom: 10px;">
            <b style="color: #60a5fa; font-size: 14px;">Step 2: ईमेलवर विमा प्रमाणपत्र व माहिती पाठवणे</b>
            <p style="margin: 4px 0 6px 0; color: #e2e8f0;">
              मंडळाचे अधिकृत विमा प्रमाणपत्र (Certificate of Insurance) आणि वरील माहिती खालील ईमेलवर पाठवा:
            </p>
            
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 4px;">
              <span style="font-family: monospace; color: #93c5fd; font-weight: bold; background: rgba(30, 58, 138, 0.4); padding: 5px 10px; border-radius: 6px; border: 1px dashed #3b82f6;">
                📧 ${OFFICIAL_EMAIL}
              </span>
              <button 
                type="button" 
                id="copy-email-btn"
                style="background: #1e293b; color: #38bdf8; border: 1px solid #0284c7; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: bold; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;"
              >
                📋 कॉपी करा
              </button>
              <span id="copy-status-text" style="font-size: 11px; color: #4ade80; display: none; font-weight: bold;">
                ✓ कॉपी झाला!
              </span>
            </div>
          </div>

          <!-- Step 3 -->
          <div style="background: rgba(16, 185, 129, 0.08); border-left: 3px solid #10b981; padding: 8px 12px; border-radius: 8px; margin-bottom: 10px;">
            <b style="color: #34d399; font-size: 14px;">Step 3: क्लेम फॉर्म व कागदपत्रांची यादी मिळणे</b>
            <p style="margin: 4px 0 0 0; color: #e2e8f0;">ईमेल प्राप्त झाल्यानंतर आम्ही आपल्या ईमेलवर अधिकृत क्लेम फॉर्म (Claim Form) आणि आवश्यक कागदपत्रांची यादी पाठवू.</p>
          </div>

          <!-- Step 4 -->
          <div style="background: rgba(239, 68, 68, 0.08); border-left: 3px solid #ef4444; padding: 8px 12px; border-radius: 8px; margin-bottom: 6px;">
            <b style="color: #f87171; font-size: 14px;">Step 4: मूळ कागदपत्रे कार्यालयात जमा करणे</b>
            <p style="margin: 4px 0 0 0; color: #e2e8f0;">जखमी गोविंदाला रुग्णालयातून डिस्चार्ज मिळाल्यानंतर सर्व मूळ कागदपत्रे (Original Documents) आमच्या कार्यालयात जमा करावीत.</p>
            <p style="margin: 4px 0 0 0; font-size: 11px; color: #94a3b8;">* कार्यालयाचा पत्ता विमा प्रमाणपत्रावर (Certificate of Insurance) दिलेला आहे.</p>
          </div>

        </div>
      `,
      didOpen: () => {
        const copyBtn = document.getElementById('copy-email-btn');
        const statusText = document.getElementById('copy-status-text');

        if (copyBtn) {
          copyBtn.addEventListener('click', async () => {
            try {
              await navigator.clipboard.writeText(OFFICIAL_EMAIL);
              copyBtn.innerText = "✓ कॉपी झाले";
              copyBtn.style.background = "#065f46";
              copyBtn.style.color = "#fff";
              if (statusText) statusText.style.display = "inline";

              setTimeout(() => {
                copyBtn.innerText = "📋 कॉपी करा";
                copyBtn.style.background = "#1e293b";
                copyBtn.style.color = "#38bdf8";
                if (statusText) statusText.style.display = "none";
              }, 2500);
            } catch (err) {
              console.error("Copy failed", err);
            }
          });
        }
      },
      showCloseButton: true,
      showCancelButton: true,
      confirmButtonText: '💬 अधिक माहितीसाठी WhatsApp करा',
      cancelButtonText: 'समजले (बंद करा)',
      confirmButtonColor: '#25D366',
      cancelButtonColor: '#334155',
      background: '#0f172a',
      color: '#fff',
      customClass: {
        popup: 'rounded-2xl border border-slate-700'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const defaultMsg = encodeURIComponent(
          "*(विमा क्लेम मदत)*\n\n" +
          "नमस्कार,\nआम्हाला गोविंदा विमा क्लेम प्रक्रियेबद्दल अधिक माहिती हवी आहे."
        );
        window.open(`https://wa.me/${OFFICIAL_WHATSAPP}?text=${defaultMsg}`, '_blank');
      }
    });
  };

  return (
    <>
      {showSplash && <SplashScreen onFinish={handleSplashFinish} season="2026" />}

      <div className="min-h-screen flex flex-col bg-[#08090d] text-white font-sans">
        <Navbar />

        {/* 🌟 1. HERO BANNER SECTION */}
        <div className="relative overflow-hidden pt-12 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-amber-500/15 via-orange-500/5 to-transparent border-b border-amber-500/10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />

          <div className="max-w-7xl mx-auto text-center space-y-6 relative z-10">
            
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-700 text-slate-300 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>महाराष्ट्र शासन मान्यताप्राप्त व अधिकृत संस्था</span>
            </div>

            <h1 className="text-3xl sm:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-tight">
              महाराष्ट्र राज्य <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500">दहीहंडी गोविंदा असोसिएशन</span>
            </h1>

            <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto font-medium leading-relaxed">
              परंपरा, संस्कृती, सुरक्षितता आणि भव्यतेचा संगम! असोसिएशनच्या अधिकृत डिजिटल प्लॅटफॉर्मद्वारे विमा नोंदणी, अर्जाची स्थिती आणि क्लेम प्रक्रिया एकाच ठिकाणी उपलब्ध.
            </p>

            {/* मुख्य CTA बटन्स */}
            <div className="pt-4 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">

              {/* 🏥 १. विमा क्लेम प्रक्रिया (पॉपअप) */}
              <button
                type="button"
                onClick={handleShowClaimSteps}
                className="w-full sm:w-auto px-7 py-4 bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-white font-black text-sm sm:text-base rounded-2xl transition flex items-center justify-center gap-2.5 shadow-xl shadow-rose-500/20 cursor-pointer group"
              >
                <HeartPulse className="w-5 h-5 text-white group-hover:scale-110 transition shrink-0" />
                <span>🏥 विमा क्लेम प्रक्रिया (Claim Steps)</span>
              </button>

              {/* 🔐 २. अर्जाची स्थिती तपासा */}
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto px-6 py-4 bg-slate-900 border border-slate-700 hover:border-amber-400 text-amber-300 hover:text-white font-bold text-sm rounded-2xl transition flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                <LogIn className="w-4 h-4 text-amber-400 shrink-0" />
                <span>लॉगिन करून स्थिती तपासा (My Status)</span>
              </button>

              {/* ℹ️ ३. असोसिएशन बद्दल */}
              <Link
                to="/about"
                className="w-full sm:w-auto px-6 py-4 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold text-sm rounded-2xl transition flex items-center justify-center gap-2"
              >
                <span>असोसिएशन बद्दल</span>
                <Info className="w-4 h-4 text-slate-400 shrink-0" />
              </Link>

            </div>

          </div>
        </div>

        {/* 📊 2. ABOUT MRDGA & OBJECTIVES SECTION */}
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

          {/* Right Highlight Card - विमा क्लेम मार्गदर्शक */}
          <div className="relative rounded-3xl overflow-hidden border border-amber-500/20 bg-[#0c0d14] p-6 text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-2xl flex items-center justify-center mx-auto">
              <HeartPulse className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-amber-400">खेळाडू विमा व क्लेम प्रक्रिया</h3>
            <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
              उत्सवादरम्यान किंवा सरावात दुखापत झाल्यास वैद्यकीय मदत व विमा क्लेमसाठीच्या सर्व स्टेप्स तपासा.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
              <button 
                type="button"
                onClick={handleShowClaimSteps}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                <span>विमा क्लेम कसा करावा?</span> <ChevronRight className="w-4 h-4" />
              </button>
              <Link 
                to="/insurance-info" 
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-medium text-xs rounded-xl transition"
              >
                विमा नियमावली
              </Link>
            </div>
          </div>
        </div>

        {/* 📋 3. SAFETY GUIDELINES HIGHLIGHT */}
        <div className="bg-[#0b0c12] border-y border-slate-800/80 py-16 px-4">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">गोविंदा पथकांसाठी सुरक्षा मार्गदर्शक तत्त्वे</h2>
              <p className="text-xs text-slate-400">सर्व दहीहंडी पथकांनी खेळाडूंच्या सुरक्षेसाठी खालील नियमांचे पालन करणे अनिवार्य आहे</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#10121b] border border-slate-800 p-5 rounded-2xl space-y-2">
                <div className="text-amber-400 font-black text-lg">०१</div>
                <h4 className="font-bold text-white text-sm">वयोमर्यादा नियम</h4>
                <p className="text-xs text-slate-400 leading-relaxed">१४ वर्षांखालील बालकांचा मानवी मनोऱ्यात समावेश करण्यास पूर्णपणे बंदी आहे. शासकीय नियमांचे तंतोतंत पालन करावे.</p>
              </div>

              <div className="bg-[#10121b] border border-slate-800 p-5 rounded-2xl space-y-2">
                <div className="text-amber-400 font-black text-lg">०२</div>
                <h4 className="font-bold text-white text-sm">सुरक्षा साधने</h4>
                <p className="text-xs text-slate-400 leading-relaxed">वरच्या थरातील गोविंदांसाठी हेल्मेट आणि चेस्ट गार्डचा वापर अनिवार्य आहे. सराव ठिकाणी सुरक्षेसाठी मॅटचा वापर करा.</p>
              </div>

              <div className="bg-[#10121b] border border-slate-800 p-5 rounded-2xl space-y-2">
                <div className="text-amber-400 font-black text-lg">०३</div>
                <h4 className="font-bold text-white text-sm">विमा व वैद्यकीय तपासणी</h4>
                <p className="text-xs text-slate-400 leading-relaxed">प्रत्येक गोविंदा खेळाडूची विमा नोंदणी पूर्ण असल्याची खात्री करा आणि पथकासोबत प्रथमोपचार पेटी (First Aid) सज्ज ठेवा.</p>
              </div>
            </div>
          </div>
        </div>

        {/* 📞 4. HELPDESK & CONTACT BANNER */}
        <div className="max-w-7xl mx-auto px-4 py-12 w-full">
          <div className="bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-transparent border border-amber-500/30 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center sm:text-left">
              <h3 className="text-lg sm:text-xl font-black text-white">काही शंका किंवा क्लेमसंबंधी अडचण आहे का?</h3>
              <p className="text-xs text-slate-300">आमच्या असोसिएशन हेल्पडेस्कशी संपर्क साधा किंवा संपर्क केंद्राला भेट द्या.</p>
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