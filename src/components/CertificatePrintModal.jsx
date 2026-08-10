import React, { useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer, X, FileEdit } from 'lucide-react';

export default function CertificatePrintModal({ reqData, onClose }) {
  const printRef = useRef(null);

  // 🎯 Policy Number In-Modal Edit स्टेट
  const [policyNoInput, setPolicyNoInput] = useState(
    reqData?.policyNumber || ''
  );

  // 🖨️ React To Print Hook
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `GPA_Certificate_${reqData?.teamName || 'Govinda'}`,
  });

  if (!reqData) return null;

  // 🎯 CERTIFICATE NO. म्हणून थेट युझरचा App ID वापरला आहे
  const certificateNumber = reqData.appId || reqData.certificateNo || 'MRDGA-INS-2026-0000';

  // 🎯 Date & Time Logic: Approved Date किंवा Live System Date & Time
  const now = new Date();
  const currentDateStr = now.toLocaleDateString('en-GB'); // DD/MM/YYYY
  const currentTimeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }); // hh:mm AM/PM

  // Policy Period From: Approval/Current Date Time to 6:00 AM of 06/09/2026
  const approvalTimeFormatted = reqData.approvedAt 
    ? new Date(reqData.approvedAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })
    : `${currentDateStr} ${currentTimeStr}`;

  const policyPeriodFormatted = `${approvalTimeFormatted} to 6:00 AM of 06/09/2026`;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto font-sans">
      <div className="bg-[#0c0d14] border border-slate-700 w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Modal Top Header Bar */}
        <div className="p-3.5 border-b border-slate-800 bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-white">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-amber-400" />
            <h3 className="font-extrabold text-xs sm:text-sm text-amber-400">
              विमा प्रमाणपत्र प्रिंट प्रिव्ह्यू ({reqData.teamName})
            </h3>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer transition"
            >
              <Printer className="w-4 h-4" /> प्रिन्ट / PDF डाऊनलोड करा
            </button>
            
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Policy Number Input Bar */}
        <div className="bg-slate-950 px-6 py-2.5 border-b border-slate-800/80 flex items-center gap-3">
          <FileEdit className="w-4 h-4 text-amber-400 shrink-0" />
          <label className="text-xs text-slate-300 font-semibold shrink-0">
            GPA Insurance Policy No. टाका:
          </label>
          <input
            type="text"
            value={policyNoInput}
            onChange={(e) => setPolicyNoInput(e.target.value)}
            placeholder="उदा. POL-2026-987654"
            className="flex-1 max-w-md bg-slate-900 border border-slate-700 rounded-lg px-3 py-1 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-400"
          />
        </div>

        {/* Certificate Preview Box */}
        <div className="flex-1 bg-slate-950 p-4 sm:p-6 overflow-y-auto flex justify-center">
          
          {/* 📄 PRINTABLE TEMPLATE */}
          <div 
            ref={printRef} 
            className="bg-white text-black font-serif text-xs max-w-[210mm] w-full border border-black my-auto shadow-2xl printable-certificate-area"
            style={{ color: '#000', backgroundColor: '#fff' }}
          >
            {/* 🖨️ PRINT-ONLY A4 STYLES */}
            <style>{`
              @media print {
                @page {
                  size: A4 portrait;
                  margin: 6mm 8mm 6mm 8mm;
                }
                body {
                  background: #fff !important;
                  color: #000 !important;
                  -webkit-print-color-adjust: exact;
                }
                .printable-certificate-area {
                  border: none !important;
                  box-shadow: none !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  width: 100% !important;
                  max-w-none !important;
                }
              }
            `}</style>

            {/* 🏢 लेटरहेडसाठी सोडलेली टॉप स्पेस */}
            <div className="pt-24 px-6 pb-4">

              {/* Main Table Layout */}
              <table className="w-full border-collapse border border-black text-[10px] leading-tight text-black">
                <tbody>
                  <tr>
                    <td className="border border-black p-1.5 font-bold w-1/2 text-black">CERTIFICATE NO.</td>
                    <td className="border border-black p-1.5 font-mono font-bold text-xs w-1/2 text-black">
                      {certificateNumber}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1.5 font-bold text-black">
                      Attached to and forming part of GPA Insurance Policy No.
                    </td>
                    <td className="border border-black p-1.5 font-mono font-bold text-black">
                      {policyNoInput || 'प्रलंबित (Pending)'}
                    </td>
                  </tr>
                  
                  <tr>
                    <td className="border border-black p-1.5 font-bold text-black">Name of insured</td>
                    <td className="border border-black p-1.5 font-bold text-[11px] uppercase text-black">
                      Maharashtra Rajya Dahihandi Govinda Association
                    </td>
                  </tr>

                  <tr>
                    <td className="border border-black p-1.5 font-bold text-black">Name of the Mandal</td>
                    <td className="border border-black p-1.5 font-bold text-[11px] uppercase text-black">
                      {reqData.teamName}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1.5 font-bold text-black">Type of Insurance</td>
                    <td className="border border-black p-1.5 text-black">Group Personal Accident Insurance Policy</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1.5 font-bold text-black">Policy Period From</td>
                    <td className="border border-black p-1.5 font-bold text-black">
                      {policyPeriodFormatted}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1.5 font-bold text-black">Total No. of Govinda's insured</td>
                    <td className="border border-black p-1.5 font-bold font-mono text-xs text-black">
                      {reqData.govindaCount}
                    </td>
                  </tr>

                  {/* BENEFIT DESCRIPTION */}
                  <tr className="bg-gray-100">
                    <td className="border border-black p-1.5 font-bold text-black">BENEFIT DESCRIPTION</td>
                    <td className="border border-black p-1.5 font-bold text-black">ANY ONE OF THE FOLLOWING</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1.5 text-black">Accidental Death</td>
                    <td className="border border-black p-1.5 font-bold text-black">Rs. 10,00,000/-</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1.5 text-black">Loss of 2 eyes / 2 hands / 2 legs / one eye and one limb</td>
                    <td className="border border-black p-1.5 font-bold text-black">Rs. 10,00,000/-</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1.5 text-black">Permanent Total Disablement</td>
                    <td className="border border-black p-1.5 font-bold text-black">Rs. 10,00,000/-</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1.5 text-black">Loss of 1 eye / 1 hand / 1 leg</td>
                    <td className="border border-black p-1.5 font-bold text-black">Rs. 5,00,000/-</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1.5 text-black">Permanent Partial Disablement</td>
                    <td className="border border-black p-1.5 text-black">Disablement % as specified in the Policy</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1.5 text-black">Medical Expenses</td>
                    <td className="border border-black p-1.5 font-bold text-black">Maximum upto Rs. 2,00,000/- for Hospitalisation</td>
                  </tr>

                  {/* Terms */}
                  <tr>
                    <td className="border border-black p-1.5 font-bold align-top text-black">Terms</td>
                    <td className="border border-black p-1.5 text-[9px] leading-tight text-black">
                      Treatment from Registered Doctors / Hospital / Nursing Home.<br />
                      Intoxication of Alcohol / Drugs is strictly excluded.<br />
                      Hospitalisation is a must and should be justified.<br />
                      Claim upto Rs. 1000/- will not be admissible.<br />
                      OPD Treatment will not be covered.<br />
                      Terms & conditions are as per our Group Personal Accident Insurance Policy.
                    </td>
                  </tr>

                  {/* Claim Procedure */}
                  <tr>
                    <td className="border border-black p-1.5 font-bold align-top text-black">Claim Procedure</td>
                    <td className="border border-black p-1.5 text-[9px] leading-tight text-black">
                      Intimation to Oriental Insurance within 3 days and submission of documents within 30 days from Accident or Discharge from the Hospital.<br />
                      <strong className="underline">For Hospitalisation:</strong> Claim form, Medical / Hospital Papers, Doctors Certificate, Pathology Reports, X-Ray Film, Bills/Receipts with Prescriptions.<br />
                      <strong className="underline">For Death claims:</strong> FIR / Police Panchnama, Discharge Card, Death Certificate, Post Mortem Report.
                    </td>
                  </tr>

                  {/* Contact */}
                  <tr>
                    <td className="border border-black p-1.5 font-bold text-black">Contact</td>
                    <td className="border border-black p-1.5 text-black">Mrs. Shilpa Pawar, Deputy Manager<br />Ring: 84 22 91 90 66</td>
                    
                  </tr>

                  {/* Policy Issuing Office */}
                  <tr>
                    <td className="border border-black p-1.5 font-bold align-top text-black">Policy Issuing Office</td>
                    <td className="border border-black p-1.5 font-semibold text-black">
                      B.O. 1, 4th Floor, Oriental house, 7, J. Tata Road, Near Samrat Hotel, Churchgate, Mumbai 400 020.
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Signature Section */}
              <div className="flex justify-between items-end mt-6 pt-2 text-black">
                <div className="text-[10px]">
                  <p>Date: {currentDateStr}</p>
                </div>
                <div className="text-center font-bold text-[10px] uppercase border-t border-black pt-1 px-8">
                  AUTHORISED SIGNATORY
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}