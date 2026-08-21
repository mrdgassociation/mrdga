import React, { useState } from 'react';
import { 
  HelpCircle, X, CheckCircle2, AlertTriangle, 
  FileText, ShieldCheck, Mail, Phone, Upload, Info 
} from 'lucide-react';

export default function InsuranceGuideModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* 🔘 माहिती उघडण्याचे मुख्य बटण */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500 hover:to-orange-500 hover:text-black text-amber-300 font-extrabold text-xs rounded-xl border border-amber-500/40 flex items-center gap-2 transition shadow-lg shadow-amber-500/10 cursor-pointer"
      >
        <HelpCircle className="w-4 h-4 text-amber-400" />
        <span>📝 फॉर्म कसा भरावा? (मार्गदर्शक सूचना)</span>
      </button>

      {/* 🪟 पॉपअप मोडल (Modal) */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-[#0c0d14] border border-amber-500/30 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center p-4 sm:p-5 border-b border-white/10 bg-black/40">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white">
                    गोविंदा पथक विमा अर्ज — मार्गदर्शक सूचना
                  </h3>
                  <p className="text-[10px] text-gray-400">
                    ऑनलाइन अर्ज अचूक भरण्यासाठी खालील टप्पे काळजीपूर्वक वाचा
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition cursor-pointer"
                title="बंद करा"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content (Scrollable) */}
            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto text-xs text-gray-300 font-sans">
              
              {/* प्राथमिक सूचना बॅनर */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-2.5 text-amber-300 font-medium">
                <Info className="w-4 h-4 shrink-0 text-amber-400" />
                <span>सर्व मंडळांनी आपल्या गोविंदा पथकाचा विमा अर्ज <b>mrdga.com</b> या वेबसाइटवर ऑनलाइन सादर करावा.</span>
              </div>

              {/* टप्पे १, २, ३ */}
              <div className="space-y-3">
                
                {/* टप्पा १ */}
                <div className="p-3.5 bg-black/50 border border-white/5 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-amber-500 text-black font-black text-[10px] rounded-md">टप्पा १</span>
                    <h4 className="font-bold text-white text-xs">मंडळ व गट माहिती</h4>
                  </div>
                  <ul className="space-y-1.5 text-gray-400 pl-2">
                    <li className="flex items-start gap-1.5">
                      <span className="text-amber-400">●</span>
                      <span><b>मंडळाचे नाव:</b> आपल्या मंडळाचे नाव <b>English मध्ये</b> अचूक लिहा.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-amber-400">●</span>
                      <span><b>मंडळाचा प्रकार:</b> <b>मंडळ (Mandal)</b> पर्याय निवडा.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-amber-400">●</span>
                      <span><b>पथक प्रकार:</b> Men’s Team / Women’s Team / Both Men’s & Women’s यापैकी योग्य पर्याय निवडा.</span>
                    </li>
                  </ul>
                </div>

                {/* टप्पा २ */}
                <div className="p-3.5 bg-black/50 border border-white/5 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-blue-500 text-white font-black text-[10px] rounded-md">टप्पा २</span>
                    <h4 className="font-bold text-white text-xs">संपर्क, ई-मेल व पत्ता</h4>
                  </div>
                  <ul className="space-y-1.5 text-gray-400 pl-2">
                    <li className="flex items-start gap-1.5">
                      <span className="text-blue-400">●</span>
                      <span><b>संपर्क व्यक्तीचे नाव</b> आणि <b>WhatsApp नंबर (मुख्य)</b> टाका.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-blue-400">●</span>
                      <span><b>Valid Email ID:</b> <b className="text-amber-300">हा ई-मेल जपून ठेवा.</b> याच ई-मेलने वेबसाइटवर Login करून <b>“My Status”</b> मध्ये विम्याची स्थिती पाहता येईल.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-blue-400">●</span>
                      <span><b>जिल्हा व पिनकोड:</b> योग्य जिल्हा निवडून ६ अंकी पिनकोड टाका.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-blue-400">●</span>
                      <span><b>पत्ता:</b> पत्रव्यवहाराचा पूर्ण पत्ता <b>English मध्ये</b> लिहा.</span>
                    </li>
                  </ul>
                </div>

                {/* टप्पा ३ */}
                <div className="p-3.5 bg-black/50 border border-white/5 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-emerald-500 text-black font-black text-[10px] rounded-md">टप्पा ३</span>
                    <h4 className="font-bold text-white text-xs">थरांची क्षमता, संख्या व फाईल अपलोड</h4>
                  </div>
                  <ul className="space-y-1.5 text-gray-400 pl-2">
                    <li className="flex items-start gap-1.5">
                      <span className="text-emerald-400">●</span>
                      <span><b>Pyramid Capacity:</b> सरावानुसार योग्य थरांची क्षमता निवडा.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-emerald-400">●</span>
                      <span><b>गोविंदांची संख्या:</b> यादीमध्ये असलेल्या खेळाडूंची अचूक संख्या टाका.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-emerald-400">●</span>
                      <span><b>यादी अपलोड:</b> मंडळाच्या Letterhead वर असलेला Format तसेच खेळाडूंची <b>नावे व वय असलेली PDF File</b> Upload करा.</span>
                    </li>
                  </ul>
                </div>

              </div>

              {/* महत्त्वाच्या सूचना */}
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl space-y-1.5 text-rose-300">
                <div className="flex items-center gap-1.5 font-bold text-rose-400">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>महत्त्वाचे:</span>
                </div>
                <p className="text-[11px] leading-relaxed text-gray-300">
                  • अर्ज सबमिट झाल्यानंतर वेबसाइटवर Login करून <b>“My Status”</b> मध्ये आपल्या <b>Insurance Policy चा Status</b> पाहता येईल.<br />
                  • काही अडचण आल्यास <b>mrdga.com → Contact Menu</b> मध्ये जाऊन प्रतिनिधींशी संपर्क साधावा.
                </p>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 bg-black/40 flex justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black rounded-xl text-xs shadow-lg transition cursor-pointer"
              >
                समजले, बंद करा ✓
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}