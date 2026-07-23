import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { 
  Shield, Award, Users, CheckCircle2, HeartPulse, 
  MapPin, Scale, Trophy, ChevronRight, User 
} from 'lucide-react';

export default function About() {
  // 🏢 कार्यकारणी समिती डेटा (इथे तू नंतर फोटो पाथ किंवा नाव अपडेट करू शकतोस)
  const committeeMembers = [
    {
      role: "अध्यक्ष (President)",
      name: "श्री. बाळा पडेलकर",
      image: "", // Dummy Profile Image
      desc: "महाराष्ट्र राज्य दहीहंडी गोविंदा असोसिएशनचे मार्गदर्शक व अध्यक्ष."
    },
    {
      role: "कार्याध्यक्ष  (Working President)",
      name: "श्री. सुरेंद्र पांचाळ",
      image: "",
      desc: "संघटनात्मक बांधणी व प्रशासकीय उपक्रम प्रमुख."
    },
     {
      role: "उपाध्यक्ष (Vice President)",
      name: "श्री. अभिषेक सुर्वे",
      image: "",
      desc: "गोविंदा सुरक्षा व स्पर्धा नियोजन समिती प्रमुख."
    },
    {
      role: "सचिव (Secretary)",
      name: "सौ. गीता झगडे",
      image: "",
      desc: "असोसिएशनचे अधिकृत पत्रव्यवहार व नोंदणी व्यवस्थापन,संघटनात्मक बांधणी"
    },
   
    {
      role: "खजिनदार (Treasurer)",
      name: "श्री. डेव्हिड फर्नांडिस",
      image: "",
      desc: "वित्तीय व्यवस्थापन व विमा निधी समन्वय."
    },
     {
      role: "खजिनदार (Treasurer)",
      name: "श्री. डेव्हिड फर्नांडिस",
      image: "",
      desc: "वित्तीय व्यवस्थापन व विमा निधी समन्वय."
    }
  ];

  // 📍 कार्यक्षेत्र जिल्हे
  const activeDistricts = [
    "मुंबई शहर", "मुंबई उपनगर", "ठाणे", "पालघर", "रायगड", 
    "रत्नागिरी", "पुणे", "सिंधुदुर्ग", "कोल्हापूर"
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#08090d] text-white">
      <Navbar />

      {/* 🌟 1. HERO BANNER */}
      <div className="relative py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-transparent border-b border-amber-500/10 text-center">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Award className="w-4 h-4" /> स्थापना वर्ष २०२४ • अधिकृत संघटना
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight">
            महाराष्ट्र राज्य <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">दहीहंडी गोविंदा असोसिएशन</span>
          </h1>
          <p className="text-slate-300 text-xs sm:text-base max-w-2xl mx-auto font-medium leading-relaxed">
            महाराष्ट्राच्या पारंपरिक दहीहंडी उत्सवाला सुरक्षित, शिस्तबद्ध आणि क्रीडात्मक ओळख मिळवून देण्यासाठी बांधील असलेली सर्वोच्च संस्था.
          </p>
        </div>
      </div>

    {/* 🛡️ 2. VISION & KEY RESPONSIBILITIES */}
<div className="max-w-7xl mx-auto px-4 py-16">
  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
    
    {/* LEFT SIDE: Header & 4 Pillars (7 Columns) */}
    <div className="lg:col-span-7 space-y-6">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold">
        <Shield className="w-3.5 h-3.5" /> आमचे कार्य व ध्येय
      </div>

      <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
        गोविंदांच्या सुरक्षेपासून ते स्पर्धांच्या निष्पक्ष नियोजनापर्यंत!
      </h2>

      <p className="text-slate-300 text-xs sm:text-sm leading-relaxed border-l-2 border-amber-500/50 pl-3">
        MRDGA ची स्थापना २०२४ मध्ये सर्व गोविंदा पथकांना एकत्र आणून त्यांच्या हक्कांचे आणि सुरक्षेचे जतन करण्यासाठी करण्यात आली. असोसिएशन शासनाशी समन्वय साधून प्रत्येक खेळाडूसाठी मोफत विमा कवच, वैद्यकीय मदत आणि प्रो-गोविंदा स्पर्धांचे अधिकृत नियम बनवण्याचे काम करते.
      </p>

      {/* 4 Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        
        {/* १. मोफत विमा */}
        <div className="p-4 rounded-2xl bg-gradient-to-b from-[#121420] to-[#0c0d14] border border-slate-800 hover:border-amber-500/40 transition-all space-y-2 group shadow-md">
          <div className="p-2.5 w-fit rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform">
            <HeartPulse className="w-5 h-5" />
          </div>
          <h4 className="font-extrabold text-white text-sm">मोफत सरकारी विमा</h4>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            शासनामार्फत प्रत्येक गोविंदा खेळाडूचा सराव व दहीहंडी दिवशीचा अपघाती विमा.
          </p>
        </div>

        {/* २. नियम व रेफ्री */}
        <div className="p-4 rounded-2xl bg-gradient-to-b from-[#121420] to-[#0c0d14] border border-slate-800 hover:border-amber-500/40 transition-all space-y-2 group shadow-md">
          <div className="p-2.5 w-fit rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform">
            <Scale className="w-5 h-5" />
          </div>
          <h4 className="font-extrabold text-white text-sm">नियम व रेफ्री समिती</h4>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            प्रो दहीहंडीसाठी अधिकृत नियम व पंचांची (Referees) पारदर्शक निवड.
          </p>
        </div>

        {/* ३. MRDGA स्पर्धा */}
        <div className="p-4 rounded-2xl bg-gradient-to-b from-[#121420] to-[#0c0d14] border border-slate-800 hover:border-amber-500/40 transition-all space-y-2 group shadow-md">
          <div className="p-2.5 w-fit rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform">
            <Trophy className="w-5 h-5" />
          </div>
          <h4 className="font-extrabold text-white text-sm">MRDGA दहीहंडी स्पर्धा</h4>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            २०२४ व २०२५ च्या अभूतपूर्व यशानंतर २०२६ ची आगामी प्रो-स्पर्धा लवकरच!
          </p>
        </div>

        {/* ४. ॲवर्ड्स सोहळा */}
        <div className="p-4 rounded-2xl bg-gradient-to-b from-[#121420] to-[#0c0d14] border border-slate-800 hover:border-amber-500/40 transition-all space-y-2 group shadow-md">
          <div className="p-2.5 w-fit rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform">
            <Award className="w-5 h-5" />
          </div>
          <h4 className="font-extrabold text-white text-sm">ऐतिहासिक ॲवर्ड्स सोहळा</h4>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            गोविंदा पथके, डॉक्टर्स व समाजसेवकांचा दहीहंडी क्षेत्रातील पहिला भव्य सन्मान.
          </p>
        </div>

      </div>
    </div>

    {/* RIGHT SIDE: Districts List (5 Columns) */}
    <div className="lg:col-span-5 h-full">
      <div className="h-full p-6 sm:p-7 rounded-3xl bg-gradient-to-b from-[#0e101a] via-[#0c0d14] to-[#08090d] border border-amber-500/30 shadow-2xl flex flex-col justify-between space-y-6 relative overflow-hidden">
        
        {/* Subtle Background Glow */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div>
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-4">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-400">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-base text-white">असोसिएशनचे कार्यक्षेत्र</h3>
              <p className="text-xs text-amber-400/80 font-medium">महाराष्ट्रातील मुख्य ८ जिल्ह्यांमध्ये कामकाज</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            {activeDistricts.map((district, idx) => (
              <div 
                key={idx} 
                className="flex items-center gap-2 bg-[#121420]/80 border border-slate-800 hover:border-amber-500/30 p-3 rounded-2xl text-xs font-bold text-slate-200 transition"
              >
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="truncate">{district}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Badge Inside Box */}
        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-semibold">
          <span>अधिकृत मान्यताप्राप्त</span>
          <span className="text-amber-400 font-mono">MRDGA • 2026</span>
        </div>

      </div>
    </div>

  </div>
</div>

      {/* 👨‍💼 3. LEADERSHIP COMMITTEE (कार्यकारणी समिती) */}
      <div className="bg-[#0b0c12] border-y border-slate-800/80 py-16 px-4">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-white">कार्यकारणी व प्रमुख पदाधिकारी</h2>
            <p className="text-xs text-slate-400">महाराष्ट्र राज्य दहीहंडी गोविंदा असोसिएशनचे नेतृत्व</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {committeeMembers.map((member, idx) => (
              <div key={idx} className="bg-[#10121b] border border-amber-500/20 rounded-2xl p-5 flex flex-col items-center text-center space-y-3 hover:border-amber-500/40 transition shadow-lg">
                
                {/* Profile Image with Fallback */}
                <div className="w-20 h-20 rounded-2xl bg-slate-800 border-2 border-amber-500/30 overflow-hidden flex items-center justify-center shrink-0">
                  {member.image ? (
                    <img src={member.image} alt={member.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-amber-400/60" />
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                    {member.role}
                  </span>
                  <h3 className="text-base font-extrabold text-white mt-2">{member.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{member.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 🏆 4. PRO GOVINDA & COMPETITIONS PROMISE */}
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="max-w-2xl mx-auto space-y-3">
          <Trophy className="w-10 h-10 text-amber-400 mx-auto" />
          <h2 className="text-2xl font-extrabold text-white">विविध राज्यस्तरीय स्पर्धा व प्रो-गोविंदा</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            असोसिएशनतर्फे दरवर्षी भव्य राज्यस्तरीय स्पर्धांचे आयोजन केले जाते. यामध्ये पुरुषांचे ७ व ६ थर तसेच महिला गोविंदा पथकांसाठी विशेष बक्षिसे आणि मानचिन्हे दिली जातात.
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}