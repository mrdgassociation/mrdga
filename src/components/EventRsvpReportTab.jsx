// ==========================================
// #SECTION: REUSABLE EVENT / RSVP REPORT TAB (MATCHED AMBER THEME)
// ==========================================
import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { 
  FileSpreadsheet, Printer, Search, CalendarCheck, 
  MapPin, Phone, MessageSquare, User, Users, Building2, RefreshCw
} from 'lucide-react';

export default function EventRsvpReportTab({
  title = "१६ ऑगस्ट बैठक उपस्थिती अहवाल (RSVP Report)",
  eventDate = "१६ ऑगस्ट २०२६",
  data = [],
  loading = false,
  onRefresh,
  canExportAndPrint = false
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [minCountFilter, setMinCountFilter] = useState('ALL');

  // 🔤 Title Case Helper
  const toTitleCase = (str) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // 📊 आकडेमोड (Summary Calculation)
  const totalMandals = data.length;
  const totalPeopleCount = useMemo(() => {
    return data.reduce((acc, curr) => acc + (parseInt(curr.totalCount) || 1), 0);
  }, [data]);

  // 🔍 सर्च & फिल्टर लॉजिक
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const q = searchTerm.toLowerCase();
      const matchesSearch = 
        (item.teamName || '').toLowerCase().includes(q) ||
        (item.contactPerson || '').toLowerCase().includes(q) ||
        (item.phone || '').includes(q) ||
        (item.m2Name || '').toLowerCase().includes(q) ||
        (item.m3Name || '').toLowerCase().includes(q);

      const count = parseInt(item.totalCount) || 1;
      const matchesCount = 
        minCountFilter === 'ALL' || 
        (minCountFilter === '1' && count === 1) ||
        (minCountFilter === '2+' && count >= 2) ||
        (minCountFilter === '4+' && count >= 4);

      return matchesSearch && matchesCount;
    });
  }, [data, searchTerm, minCountFilter]);

  // 📥 Excel Export (नंबरसह एक्सपोर्ट)
  const handleExportToExcel = () => {
    if (filteredData.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'डेटा उपलब्ध नाही!',
        text: 'एक्सपोर्ट करण्यासाठी कोणत्याही नोंदी सापडल्या नाहीत.',
        background: '#0c0d14',
        color: '#fff'
      });
      return;
    }

    const exportRows = filteredData.map((item, idx) => ({
      "अ.क्र.": idx + 1,
      "नोंदणी दिनांक व वेळ": item.timestamp || '',
      "मंडळाचे नाव": toTitleCase(item.teamName || ''),
      "प्रमुख संपर्क व्यक्ती": toTitleCase(item.contactPerson || ''),
      "मोबाईल नंबर": item.phone || '',
      "उपस्थित राहणारी एकूण संख्या": item.totalCount || 1,
      "सदस्य २": toTitleCase(item.m2Name || ''),
      "सदस्य ३": toTitleCase(item.m3Name || ''),
      "सदस्य ४": toTitleCase(item.m4Name || ''),
      "सदस्य ५": toTitleCase(item.m5Name || '')
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "RSVP_Report");
    XLSX.writeFile(wb, `MRDGA_16Aug_Meeting_RSVP_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // 🖨️ Print
  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = `MRDGA_16Aug_Meeting_RSVP_${new Date().toISOString().slice(0, 10)}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  return (
    <div className="space-y-3.5 font-sans">
      
      {/* 🖨️ PRINT STYLING */}
      <style>{`
        @media print {
          body { background-color: #fff !important; color: #000 !important; margin: 0 !important; padding: 0 !important; }
          .no-print { display: none !important; }
          .print-area { background: white !important; color: black !important; box-shadow: none !important; border: none !important; width: 100% !important; padding: 0 !important; }
          table { width: 100% !important; border-collapse: collapse !important; }
          th, td { color: black !important; border: 1px solid #333 !important; }
          th { background-color: #f3f4f6 !important; }
        }
      `}</style>

      {/* Header & Compact Icon Buttons Bar */}
      <div className="no-print flex justify-between items-center bg-black/50 border border-amber-500/20 p-2.5 sm:p-3 rounded-2xl backdrop-blur-md gap-2 shadow-xl">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl shrink-0">
            <CalendarCheck className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs sm:text-base font-black text-white leading-tight">
              MRDGA <span className="text-amber-400">{title}</span>
            </h2>
            <p className="text-[9px] text-gray-400">कार्यक्रम दिनांक: <b className="text-amber-400">{eventDate}</b></p>
          </div>
        </div>

        {/* 🎯 कॉम्पॅक्ट आयकॉन बटन्स */}
        <div className="flex items-center gap-1.5 shrink-0">
          {canExportAndPrint && (
            <>
              <button
                type="button"
                onClick={handleExportToExcel}
                className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md transition cursor-pointer"
                title="Excel डाऊनलोड करा"
              >
                <FileSpreadsheet className="w-4 h-4" />
              </button>
              
              <button
                type="button"
                onClick={handlePrint}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl shadow-md transition cursor-pointer"
                title="PDF / प्रिंट काढा"
              >
                <Printer className="w-4 h-4" />
              </button>
            </>
          )}

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="p-2 bg-slate-800/80 hover:bg-slate-700 text-amber-400 border border-slate-700 rounded-xl transition cursor-pointer"
              title="डेटा रिफ्रेश करा"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* 📊 STATS CARDS (Matching Amber Theme) */}
      <div className="no-print grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-3">
        <div className="bg-black/40 border border-amber-500/20 p-2 sm:p-2.5 rounded-xl flex flex-col items-center justify-center text-center">
          <p className="text-[8px] sm:text-[10px] text-gray-400 font-bold uppercase truncate w-full">नोंदणीकृत मंडळे</p>
          <p className="text-sm sm:text-base font-black text-white mt-0.5">{totalMandals}</p>
        </div>

        <div className="bg-black/40 border border-amber-500/30 p-2 sm:p-2.5 rounded-xl flex flex-col items-center justify-center text-center">
          <p className="text-[8px] sm:text-[10px] text-amber-400 font-bold uppercase truncate w-full">एकूण उपस्थिती (लोक)</p>
          <p className="text-sm sm:text-base font-black text-amber-300 mt-0.5">{totalPeopleCount} लोक</p>
        </div>

        <div className="bg-black/40 border border-emerald-500/20 p-2 sm:p-2.5 rounded-xl flex flex-col items-center justify-center text-center">
          <p className="text-[8px] sm:text-[10px] text-emerald-400/80 font-bold uppercase truncate w-full">फिल्टर निकाल</p>
          <p className="text-sm sm:text-base font-black text-emerald-400 mt-0.5">{filteredData.length}</p>
        </div>

        <div className="bg-black/40 border border-amber-500/20 p-2 sm:p-2.5 rounded-xl flex flex-col items-center justify-center text-center">
          <p className="text-[8px] sm:text-[10px] text-gray-400 font-bold uppercase truncate w-full">सरासरी प्रतिनिधी</p>
          <p className="text-sm sm:text-base font-black text-white mt-0.5">
            {totalMandals > 0 ? (totalPeopleCount / totalMandals).toFixed(1) : '0'} / मंडळ
          </p>
        </div>
      </div>

     {/* 🔍 SEARCH & FILTERS BAR (Desktop: Single Row | Mobile: 2 Rows) */}
      <div className="no-print bg-black/50 border border-white/10 p-2 sm:p-2.5 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        
        {/* १. सर्च इनपुट बॉक्स (डेस्कटॉपवर मोठी जागा व्यापेल) */}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-amber-400/60" />
          <input
            type="text"
            placeholder="मंडळाचे नाव, संपर्क व्यक्ती किंवा सदस्याच्या नावाने शोधा..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/60 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400/50"
          />
        </div>

        {/* २. ड्रॉपडाऊन व दाखवलेली संख्या */}
        <div className="flex items-center gap-2 justify-between sm:justify-end shrink-0">
          <select
            value={minCountFilter}
            onChange={(e) => setMinCountFilter(e.target.value)}
            className="bg-black/60 border border-white/10 rounded-xl px-2.5 py-1.5 text-[11px] text-amber-400 font-bold focus:outline-none w-full sm:w-auto"
          >
            <option value="ALL" className="bg-[#0c0d14] text-white">सर्व उपस्थिती (All)</option>
            <option value="1" className="bg-[#0c0d14] text-white">फक्त १ प्रतिनिधी</option>
            <option value="2+" className="bg-[#0c0d14] text-white">२+ प्रतिनिधी</option>
            <option value="4+" className="bg-[#0c0d14] text-white">४+ प्रतिनिधी</option>
          </select>

          <div className="text-[10px] text-gray-400 font-mono shrink-0 whitespace-nowrap bg-black/40 px-2 py-1.5 rounded-xl border border-white/5">
            दाखवले: <b className="text-white ml-0.5">{filteredData.length}</b> / {totalMandals}
          </div>
        </div>

      </div>

      {filteredData.length === 0 ? (
        <p className="p-8 text-center text-gray-400 text-xs font-medium">कोणतीही नोंदणी सापडली नाही.</p>
      ) : (
        <>
          {/* 📱 MOBILE VIEW CARDS (फक्त कार्ड्स दिसतील, टेबल नाही) */}
          <div className="no-print grid grid-cols-1 md:hidden gap-3">
            {filteredData.map((item, idx) => {
              const otherMembers = [item.m2Name, item.m3Name, item.m4Name, item.m5Name].filter(Boolean);

              return (
                <div key={idx} className="p-3.5 rounded-2xl border border-amber-500/20 bg-black/40 space-y-2.5 shadow-md">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        #{idx + 1}
                      </span>
                      <h3 className="font-bold text-sm text-white mt-1 leading-tight">{toTitleCase(item.teamName)}</h3>
                    </div>

                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wider bg-amber-500/10 text-amber-400 border-amber-500/30 font-mono">
                      {item.totalCount || 1} लोक
                    </span>
                  </div>

                  <div className="bg-black/50 p-2.5 rounded-xl border border-white/5 space-y-2 text-xs">
                    {/* प्रमुख संपर्क व्यक्ती + WA/Call बटन्स (नंबर लपवलेला) */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <User className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="text-gray-200 font-semibold truncate text-[11px]">
                          {toTitleCase(item.contactPerson) || 'संपर्क नाव नाही'}
                        </span>
                      </div>

                      {item.phone && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <a 
                            href={`https://wa.me/91${item.phone}`} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg border border-emerald-500/30 transition"
                            title="WhatsApp करा"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </a>
                          <a 
                            href={`tel:${item.phone}`} 
                            className="p-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg border border-blue-500/30 transition"
                            title="कॉल करा"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )}
                    </div>

                    {/* इतर प्रतिनिधी */}
                    {otherMembers.length > 0 && (
                      <div className="pt-1.5 border-t border-white/5">
                        <p className="text-[10px] text-gray-400 font-semibold mb-1">इतर उपस्थित प्रतिनिधी:</p>
                        <div className="flex flex-wrap gap-1">
                          {otherMembers.map((m, mIdx) => (
                            <span key={mIdx} className="bg-slate-900 px-2 py-0.5 rounded text-[10px] text-gray-300 border border-slate-800">
                              {toTitleCase(m)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 💻 DESKTOP & PRINTABLE TABLE SECTION (फक्त Desktop & Print मध्येच दिसेल) */}
          <div className="hidden md:block print-area rounded-2xl overflow-hidden border border-amber-500/20 shadow-2xl p-4 bg-[#0c0d14] text-white">
            
            <div className="mb-4 pb-3 border-b border-gray-600 flex justify-between items-center">
              <div>
                <h1 className="text-base font-black text-amber-400 uppercase tracking-wide">
                  MAHARASHTRA RAJYA DAHIHANDI GOVINDA ASSOCIATION
                </h1>
                <h2 className="text-xs sm:text-sm font-bold text-white mt-0.5">
                  📅 {title} ({eventDate})
                </h2>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  अधिकृत उपस्थिती नोंदणी यादी | दिनांक: {new Date().toLocaleDateString('mr-IN')}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-bold bg-amber-500/20 px-2.5 py-1 rounded border border-amber-500/30 text-amber-300">
                  एकूण उपस्थिती: {totalPeopleCount} लोक ({totalMandals} मंडळे)
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-black/80 border-b border-amber-500/30 text-amber-400 font-extrabold uppercase text-[10px]">
                    <th className="p-2 border border-white/10 text-center">अ.क्र.</th>
                    <th className="p-2 border border-white/10">मंडळाचे नाव</th>
                    <th className="p-2 border border-white/10">प्रमुख संपर्क प्रतिनिधी</th>
                    <th className="p-2 border border-white/10 text-center no-print">संपर्क कृती</th>
                    <th className="p-2 border border-white/10 text-center">संख्या</th>
                    <th className="p-2 border border-white/10">इतर उपस्थित प्रतिनिधी</th>
                    <th className="p-2 border border-white/10 text-center">नोंदणी दिनांक</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {filteredData.map((item, idx) => {
                    const otherMembers = [item.m2Name, item.m3Name, item.m4Name, item.m5Name].filter(Boolean);

                    return (
                      <tr key={idx} className="hover:bg-white/5 transition">
                        <td className="p-2 border border-white/5 text-gray-400 font-mono text-center">{idx + 1}</td>
                        <td className="p-2 border border-white/5 font-bold text-white">{toTitleCase(item.teamName)}</td>
                        
                        {/* 🎯 संपर्क प्रतिनिधी: स्क्रीनवर नंबर लपलेला, PDF मध्ये 📞 सह प्रिंट होईल */}
                        <td className="p-2 border border-white/5">
                          <div>
                            <p className="font-semibold text-gray-200 flex items-center gap-1">
                              <User className="w-3 h-3 text-amber-400 shrink-0 no-print" />
                              {toTitleCase(item.contactPerson) || '-'}
                            </p>
                            {item.phone && (
                              <p className="hidden print:block text-[10px] text-black font-mono font-bold mt-0.5">
                                📞 {item.phone}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* संपर्क कृती: फक्त स्क्रीनवर कॉल / WA बटन्स */}
                        <td className="p-2 border border-white/5 text-center no-print">
                          {item.phone ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <a 
                                href={`https://wa.me/91${item.phone}`} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="p-1 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-black rounded border border-emerald-500/30 transition"
                                title="WhatsApp करा"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </a>
                              <a 
                                href={`tel:${item.phone}`} 
                                className="p-1 bg-blue-500/20 hover:bg-blue-500 text-blue-400 hover:text-white rounded border border-blue-500/30 transition"
                                title="कॉल करा"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>

                        <td className="p-2 border border-white/5 text-center font-bold">
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 font-mono">
                            {item.totalCount || 1}
                          </span>
                        </td>

                        <td className="p-2 border border-white/5 text-[11px] text-gray-300">
                          {otherMembers.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {otherMembers.map((m, mIdx) => (
                                <span key={mIdx} className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-[10px] text-gray-300">
                                  {toTitleCase(m)}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-600 italic">इतर सदस्य नाहीत</span>
                          )}
                        </td>

                        <td className="p-2 border border-white/5 font-mono text-[10px] text-gray-400 text-center whitespace-nowrap">
                          {item.timestamp ? String(item.timestamp).split('T')[0] : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>
        </>
      )}

    </div>
  );
}