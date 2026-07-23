import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { FileText, ArrowLeft } from 'lucide-react';

export default function TermsOfService() {
  return (
    <div className="min-h-screen flex flex-col bg-[#08090d] text-white font-sans">
      <Navbar />

      <main className="max-w-4xl mx-auto p-4 sm:p-6 flex-1 w-full space-y-4">
   

        <h1 className="text-xl sm:text-2xl font-black text-amber-400 flex items-center gap-2">
          <FileText className="w-6 h-6" /> नियम व अटी (Terms of Service)
        </h1>
        
        <section className="space-y-2 text-xs sm:text-sm bg-[#0c0d14] p-5 rounded-2xl border border-slate-800/80">
          <h2 className="font-bold text-white text-sm sm:text-base">१. नोंदणी नियम</h2>
          <p className="text-slate-300 leading-relaxed">प्रत्येक गोविंदा पथकाने दिलेली माहिती खरी असणे बंधनकारक आहे. चुकीची माहिती किंवा खोटे कागदपत्रे आढळल्यास नोंदणी रद्द केली जाऊ शकते.</p>
        </section>

        <section className="space-y-2 text-xs sm:text-sm bg-[#0c0d14] p-5 rounded-2xl border border-slate-800/80">
          <h2 className="font-bold text-white text-sm sm:text-base">२. असोसिएशनचा निर्णय</h2>
          <p className="text-slate-300 leading-relaxed">स्पर्धा आयोजन, बक्षीस वितरण आणि शिस्तभंगाच्या कारवाईबाबत असोसिएशनचा निर्णय अंतिम राहील.</p>
        </section>
      </main>

      <Footer />
    </div>
  );
}