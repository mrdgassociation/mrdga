import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Phone, HelpCircle, MessageSquare, ArrowLeft } from 'lucide-react';

export default function Helpdesk() {
  return (
    <div className="min-h-screen flex flex-col bg-[#08090d] text-white font-sans">
      <Navbar />

      <main className="max-w-4xl mx-auto p-4 sm:p-6 flex-1 w-full space-y-6">

        <h1 className="text-xl sm:text-2xl font-black text-amber-400 flex items-center gap-2">
          <HelpCircle className="w-6 h-6" /> मदत केंद्र (Helpdesk & Support)
        </h1>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-[#0c0d14] p-5 rounded-2xl border border-amber-500/20 space-y-2">
            <Phone className="w-6 h-6 text-amber-400" />
            <h3 className="font-bold text-white text-sm">हेल्पलाईन नंबर</h3>
            <p className="text-xs text-slate-400">+91 9800000000 / +91 9800000000</p>
            <a href="tel:9800000000" className="inline-block px-3 py-1.5 bg-amber-500/20 text-amber-400 text-xs font-bold rounded-lg border border-amber-500/30">कॉल करा</a>
          </div>

          <div className="bg-[#0c0d14] p-5 rounded-2xl border border-emerald-500/20 space-y-2">
            <MessageSquare className="w-6 h-6 text-emerald-400" />
            <h3 className="font-bold text-white text-sm">व्हॉट्सअ‍ॅप सपोर्ट</h3>
            <p className="text-xs text-slate-400">फॉर्म किंवा तांत्रिक अडचणींसाठी संदेश पाठवा</p>
            <a href="https://wa.me/919819000880" target="_blank" rel="noreferrer" className="inline-block px-3 py-1.5 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg border border-emerald-500/30">WhatsApp वर बोला</a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}