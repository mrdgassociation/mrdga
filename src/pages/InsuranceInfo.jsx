import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { 
  ShieldCheck, HeartHandshake, AlertCircle, Clock, 
  FileText, PhoneCall, CheckCircle2, Building2, Download, Eye, ExternalLink, X
} from 'lucide-react';

// ==========================================
// 📄 DYNAMIC DATA CONFIGURATION (ARRAYS)
// ==========================================

// 1️⃣ विमा काढण्यासाठी आवश्यक बाबी
const insuranceRequirementsList = [
  { id: 1, text: "ओरिएंटल इन्शुरन्स नावाने मंडळाच्या लेटरहेडवर गोविंदाचे नाव व वय अशी यादी तयार करून आणणे." },
  { id: 2, text: "ही सर्व कागदपत्रे मूळ प्रत (Original Letterhead) व एक झेरॉक्स प्रत घेऊन येणे." },
  { id: 3, text: "सोबत धनादेश (Cheque) किंवा रोख रक्कम (₹ ७५/- प्रत्येकी) याप्रमाणे देणे." }
];

// 2️⃣ विमा संरक्षणाचा अवधी व अटी
const insuranceTermsAndConditions = [
  { id: 1, text: "नाम निर्देश केलेल्या व्यक्ती." },
  { id: 2, text: "फक्त अपघात झालेल्या दुखापतीमुळे रुग्णालयात रहावयास लागल्यास." },
  { id: 3, text: "जर एक दिवस किंवा त्यापेक्षा कमी अवधी रुग्णालयात दुखापतीच्या स्वरूपानुसार रहावे लागल्यास वैद्यकीय अधिका-यांचा दाखला घेणे आवश्यक राहील." },
  { id: 4, text: "रुपये १०००/- पेक्षा कमी रकमेचा दावा स्वीकारला जाणार नाही." },
  { id: 5, text: "रुग्णालयात दाखल न होता घरगुती किंवा बाह्य रुग्ण विभागात औषधोपचार घेणा-यास विमा संरक्षण लागू होणार नाही." }
];

// 3️⃣ विमा दाव्यासाठी (Claim) लागणारे ९ मूळ मुद्दे
const insuranceClaimRequirements = [
  { id: 1, text: "विमा कंपनीस अपघाताची सूचना (खबर) तात्काळ देणे." },
  { id: 2, text: "अपघाताची प्रथम सूचना (खबर) अहवाल व पंचनामा पोलिस स्टेशन." },
  { id: 3, text: "हॉस्पिटलमधून घरी पाठविल्याचा दाखला व एक्स-रे रिपोर्ट." },
  { id: 4, text: "संबंधीत औषध-पाण्याचे हॉस्पिटलचे कागदपत्र व बिल आणि वैद्यकीय इलाज करणा-या डॉक्टरांचे सर्टिफिकेट." },
  { id: 5, text: "रोग चिकित्सा/रोगाचे निदान यांचे अहवाल व शासकीय किंवा शवपरिक्षा अहवाल सादर करणे आवश्यक आहे." },
  { id: 6, text: "मृत्यू झालेला असल्यास मयताच्या मृत्यूचा दाखला शवपरीक्षा अहवाल सादर करणे आवश्यक आहे." },
  { id: 7, text: "हॉस्पिटलची बिले, बाहेरील औषधांची बिले व हॉस्पिटलच्या वैद्यकिय अधिका-याने सुचविलेली औषधयोजना यांचे हॉस्पिटलचे पत्रक." },
  { id: 8, text: "विमा दावा करण्याचा अर्ज संपूर्णपणे भरुन व त्यावर दावा करणा-याची सही व कोरा धनादेश." },
  { id: 9, text: "विमा दाव्याची रक्कम अपघातग्रस्त व्यक्ती किंवा त्याच्या वारसास RTGS/NEFT द्वारे केली जाईल.", isHighlight: true }
];

export default function InsuranceInfo() {
  const [showSampleModal, setShowSampleModal] = useState(false);

  // 🔗 नमुना लेटरहेड फॉरमॅट इमेजची लिंक (इथे तुझी ImgBB लिंक टाकू शकतोस)
  const sampleFormatImgUrl = "https://i.ibb.co/N2FXL0R6/Whats-App-Image-2026-07-20-at-11-48-52-2.jpg"; 

  return (
    <div className="min-h-screen flex flex-col bg-[#08090d] text-white font-sans">
      <Navbar />

      <main className="max-w-5xl mx-auto p-4 sm:p-6 flex-1 w-full space-y-6">

        {/* 👑 PAGE HEADER */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-500/15 via-[#0c0d14] to-[#0c0d14] border border-amber-500/30 space-y-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-amber-500 text-black font-extrabold text-[10px] rounded-lg uppercase tracking-wider">
              अधिकृत विमा सुरक्षा माहिती
            </span>
            <span className="px-2.5 py-1 bg-slate-800 text-amber-400 font-mono text-[10px] font-bold rounded-lg border border-amber-500/20">
              गोपाळकाला २०२६
            </span>
          </div>

          <h1 className="text-xl sm:text-3xl font-black text-white flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-amber-400 shrink-0" />
            गोविंदा पथक व्यक्तिगत अपघात विमा योजना २०२६
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            दि ओरिएंटल इन्शुरन्स कंपनी लि. (भारत सरकारचा उपक्रम) यांच्या सहकार्याने सर्व नोंदणीकृत गोविंदांना सामाजिक सुरक्षा व विमा संरक्षण देण्याचा उपक्रम.
          </p>
        </div>

        {/* 🤝 MRDGA PATHPURVATTHA / EFFORTS SECTION */}
        <div className="p-5 rounded-2xl bg-[#0c0d14] border border-slate-800 space-y-2.5">
          <h2 className="text-sm sm:text-base font-extrabold text-amber-400 flex items-center gap-2">
            <HeartHandshake className="w-5 h-5 text-amber-400" /> 
            MRDGA असोसिएशनचे सातत्यपूर्ण प्रयत्न
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            गोविंदा पथकातील खेळाडूंच्या सुरक्षेचा विचार करून, महाराष्ट्र राज्य दहीहंडी गोविंदा असोसिएशन (MRDGA) तर्फे महाराष्ट्र शासन, नगरविकास विभाग आणि विमा कंपन्यांशी सातत्याने पाठपुरावा व बैठका घेतल्या जातात. विम्याचा हप्ता (Premium) सर्वसामान्य गोविंदांच्या खिशाला परवडणारा राहावा आणि कोणत्याही दुर्घटनेच्या वेळी जास्तीत जास्त नुकसान भरपाई व वैद्यकीय मदत मिळावी, यासाठी असोसिएशन कटिबद्ध आहे.
          </p>
        </div>

        {/* 🚨 1. विमा काढण्यासाठी आवश्यक बाबी (MOST IMPORTANT - NOW TOP SECTION) */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#0c0d14] border-2 border-amber-500/40 space-y-4 shadow-xl">
          <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-black text-amber-400 uppercase tracking-wide flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400 shrink-0" /> 
                विमा काढण्यासाठी आवश्यक बाबी
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">नोंदणीकृत गोविंदा मंडळाने विमा अर्ज सबमिट करताना पाळावयाची नियमावली</p>
            </div>

            <div className="text-xs font-extrabold bg-amber-500/10 border border-amber-500/30 text-amber-400 px-3 py-1.5 rounded-xl w-fit">
              विमा हप्ता: ₹ ७५/- (GST सह) प्रति गोविंदा
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {insuranceRequirementsList.map((item) => (
              <div key={item.id} className="p-3.5 bg-slate-900/80 rounded-2xl border border-slate-800 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-xs text-slate-200 leading-relaxed font-medium">{item.text}</span>
              </div>
            ))}
          </div>

          {/* 📄 Letterhead Format Download / View Banner */}
          <div className="p-4 rounded-xl bg-slate-900 border border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="space-y-0.5 text-center sm:text-left">
              <h4 className="text-xs font-bold text-white flex items-center justify-center sm:justify-start gap-1.5">
                <span>📋</span> मंडळाच्या लेटरहेडवर यादी कशी तयार करावी? (Sample Format)
              </h4>
              <p className="text-[11px] text-slate-400">विमा अर्जासोबत द्यावयाच्या यादीचा अधिकृत नमुना येथे पहा व डाउनलोड करा.</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowSampleModal(true)}
                className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" /> नमुना फॉरमॅट पहा
              </button>
            </div>
          </div>
        </div>

        {/* ⏳ 2. विमा संरक्षणाचा अवधी व अटी (DURATION & CONDITIONS) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Validity Duration */}
          <div className="p-5 rounded-2xl bg-[#0c0d14] border border-slate-800 space-y-3">
            <h3 className="text-xs sm:text-sm font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
              <Clock className="w-4 h-4 text-amber-400 shrink-0" /> विमा संरक्षणाचा अवधी
            </h3>
            <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1.5 text-xs text-slate-200 leading-relaxed">
              <p><b className="text-amber-400">प्रारंभ:</b> २९ जुलै, २०२६ (किंवा विमा प्रिमियम भरल्यापासून सराव सत्रादरम्यान)</p>
              <p><b className="text-amber-400">समाप्ती:</b> ०६ सप्टेंबर, २०२६ पहाटे ६.०० वा. पर्यंत</p>
            </div>
            <p className="text-[11px] text-slate-400">
              * टीप: सर्व गोविंदा पथक सदस्यांचे वय १४ वर्षांपेक्षा जास्त असणे आवश्यक आहे.
            </p>
          </div>

          {/* Dynamic Conditions Map */}
          <div className="p-5 rounded-2xl bg-[#0c0d14] border border-slate-800 space-y-3">
            <h3 className="text-xs sm:text-sm font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" /> खालील अटींना अनुसरून विमा संरक्षण
            </h3>
            <div className="space-y-1.5 text-xs text-slate-300">
              {insuranceTermsAndConditions.map((item) => (
                <div key={item.id} className="p-2 bg-slate-900/50 rounded-xl border border-slate-800/80 flex items-start gap-2">
                  <span className="text-amber-400 font-bold shrink-0">{item.id}.</span>
                  <span className="leading-tight">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* 📊 3. INSURANCE COVERAGE TABLE */}
        <div className="p-5 rounded-2xl bg-[#0c0d14] border border-slate-800 space-y-4">
          <div className="border-b border-slate-800 pb-2">
            <h3 className="font-extrabold text-sm sm:text-base text-white">विमा संरक्षण रक्कमेचा तक्ता</h3>
            <p className="text-[11px] text-slate-400">अटी व शर्तींनुसार देय असणारी नुकसान भरपाई</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900 text-amber-400 font-extrabold border-b border-slate-800">
                  <th className="p-3 border border-slate-800 w-12 text-center">अ.क्र.</th>
                  <th className="p-3 border border-slate-800">तपशील (नुकसान / दुखापत प्रकार)</th>
                  <th className="p-3 border border-slate-800 text-right">नुकसान भरपाई रक्कम</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200 font-medium">
                <tr className="hover:bg-slate-900/40">
                  <td className="p-3 border border-slate-800 text-center font-mono">१</td>
                  <td className="p-3 border border-slate-800 font-bold text-white">अपघाती मृत्यू</td>
                  <td className="p-3 border border-slate-800 text-right font-mono font-bold text-emerald-400">₹ १०,००,०००/-</td>
                </tr>
                <tr className="hover:bg-slate-900/40">
                  <td className="p-3 border border-slate-800 text-center font-mono">२</td>
                  <td className="p-3 border border-slate-800 font-bold text-white">दोन अवयव किंवा दोन डोळे गमावल्यास</td>
                  <td className="p-3 border border-slate-800 text-right font-mono font-bold text-emerald-400">₹ १०,००,०००/-</td>
                </tr>
                <tr className="hover:bg-slate-900/40">
                  <td className="p-3 border border-slate-800 text-center font-mono">३</td>
                  <td className="p-3 border border-slate-800">एक हात, एक पाय किंवा एक डोळा गमावल्यास</td>
                  <td className="p-3 border border-slate-800 text-right font-mono font-bold text-amber-400">₹ ५,००,०००/-</td>
                </tr>
                <tr className="hover:bg-slate-900/40">
                  <td className="p-3 border border-slate-800 text-center font-mono">४</td>
                  <td className="p-3 border border-slate-800 font-bold text-white">कायम स्वरूपी अपंगत्व</td>
                  <td className="p-3 border border-slate-800 text-right font-mono font-bold text-emerald-400">₹ १०,००,०००/-</td>
                </tr>
                <tr className="hover:bg-slate-900/40">
                  <td className="p-3 border border-slate-800 text-center font-mono">५</td>
                  <td className="p-3 border border-slate-800">कायम अपूर्ण / पक्षघाती अपंगत्व</td>
                  <td className="p-3 border border-slate-800 text-right font-mono text-slate-300">% पॉलिसी दरानुसार</td>
                </tr>
                <tr className="hover:bg-slate-900/40">
                  <td className="p-3 border border-slate-800 text-center font-mono">६</td>
                  <td className="p-3 border border-slate-800 font-bold text-amber-300">अपघातग्रस्त व्यक्तीस रुग्णालयात राहावे लागल्यास (Hospitalization)</td>
                  <td className="p-3 border border-slate-800 text-right font-mono font-bold text-amber-400">प्रत्यक्ष खर्च किंवा ₹ २,००,०००/- (जे कमी असेल)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 📋 4. CLAIM PROCEDURE & REQUIRED DOCUMENTS (डायनामिक मॅप) */}
        <div className="p-5 rounded-2xl bg-[#0c0d14] border border-amber-500/30 space-y-3">
          <div className="border-b border-slate-800 pb-2">
            <h3 className="text-xs sm:text-sm font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              विम्याची नुकसान भरपाईसाठी दावा करण्याची कार्यपद्धती व कागदपत्रे
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              (दि ओरिएंटल इन्शुरन्स कंपनी लि. द्वारे अधिकृत नियम)
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs text-slate-200">
            {insuranceClaimRequirements.map((item) => (
              <div 
                key={item.id} 
                className={`p-3 rounded-xl border flex items-start gap-2 ${
                  item.isHighlight 
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 font-semibold' 
                    : 'bg-slate-900/60 border-slate-800/80'
                }`}
              >
                <span className="text-amber-400 font-bold">•</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 🏛️ 5. OFFICIAL INSURANCE CONTACT DETAILS */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-[#0c0d14] border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" /> विमा कंपनी संपर्क कार्यालय
            </span>
            <h4 className="font-extrabold text-sm text-white">दि ओरिएंटल इन्शुरन्स कंपनी लिमिटेड</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              मुंबई मंडलीय कार्यालय क्र. १, ओरिएंटल हाऊस, ४ था मजला, ७ जे. टाटा रोड, चर्चगेट, मुंबई - ४०००२०
            </p>
            <p className="text-xs text-amber-300 font-semibold pt-1">शाखा प्रबंधक: सौ. शिल्पा पवार</p>
          </div>

          <a 
            href="tel:8422919066" 
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-xl transition flex items-center gap-2 shadow-lg shadow-emerald-500/20 shrink-0 cursor-pointer"
          >
            <PhoneCall className="w-4 h-4" /> कॉल करा: 8422919066
          </a>
        </div>

      </main>

      {/* 🔍 SAMPLE FORMAT MODAL */}
      {showSampleModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c0d14] border border-amber-500/30 max-w-2xl w-full rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
              <h3 className="text-xs sm:text-sm font-bold text-amber-400 flex items-center gap-2">
                <FileText className="w-4 h-4" /> मंडळाच्या लेटरहेडचा अधिकृत नमुना
              </h3>
              <button 
                onClick={() => setShowSampleModal(false)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 flex justify-center bg-slate-950">
              <img 
                src={sampleFormatImgUrl} 
                alt="Letterhead Sample Format" 
                className="max-w-full h-auto rounded-xl border border-slate-800 shadow-lg object-contain"
              />
            </div>

            <div className="p-4 border-t border-slate-800 flex justify-between items-center bg-slate-900">
              <p className="text-[11px] text-slate-400">विमा अर्ज सबमिट करताना याच फॉरमॅटचा वापर करावा.</p>
              <a 
                href={sampleFormatImgUrl} 
                target="_blank" 
                rel="noreferrer"
                download="Govinda_Insurance_Letterhead_Format.jpg"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" /> डाउनलोड करा
              </a>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}