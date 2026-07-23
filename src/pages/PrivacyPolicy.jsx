import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Shield, ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen flex flex-col bg-[#08090d] text-white font-sans">
      <Navbar />

      <main className="max-w-4xl mx-auto p-4 sm:p-6 flex-1 w-full space-y-4">
      

        <h1 className="text-xl sm:text-2xl font-black text-amber-400 flex items-center gap-2">
          <Shield className="w-6 h-6" /> गोपनीयता धोरण (Privacy Policy)
        </h1>
        <p className="text-xs text-slate-400">अंतिम अपडेट: {new Date().toLocaleDateString('mr-IN')}</p>
        
        <section className="space-y-2 text-xs sm:text-sm bg-[#0c0d14] p-5 rounded-2xl border border-slate-800/80">
          <h2 className="font-bold text-white text-sm sm:text-base">१. माहिती संकलन (Data Collection)</h2>
          <p className="text-slate-300 leading-relaxed">महाराष्ट्र राज्य दहीहंडी गोविंदा असोसिएशन (MRDGA) कडे नोंदणी करताना आम्ही संघ, कॅप्टन, मॅनेजर यांचे नाव, मोबाईल नंबर, ईमेल आणि फोटो/लोगो गोळा करतो.</p>
        </section>

        <section className="space-y-2 text-xs sm:text-sm bg-[#0c0d14] p-5 rounded-2xl border border-slate-800/80">
          <h2 className="font-bold text-white text-sm sm:text-base">२. माहितीचा वापर (Data Usage)</h2>
          <p className="text-slate-300 leading-relaxed">ही माहिती फक्त स्पर्धा नोंदणी, विमा (Insurance Policy) प्रक्रिया आणि अधिकृत संपर्कासाठीच वापरली जाते. कोणत्याही तृतीय पक्षाला (Third Party) विक्री केली जात नाही.</p>
        </section>
      </main>

      <Footer />
    </div>
  );
}