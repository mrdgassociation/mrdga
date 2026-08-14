// ==========================================
// #SECTION: INSURANCE REPORT TAB (COMPACT & UNIFIED THEME)
// ==========================================
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { 
  FileSpreadsheet, Printer, Search, Shield, 
  MapPin, Phone, User, MessageSquare, ExternalLink, RefreshCw 
} from 'lucide-react';

export default function InsuranceReportTab({ canExportAndPrint }) {
  const [insuranceData, setInsuranceData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [districtFilter, setDistrictFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const toTitleCase = (str) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const fetchInsuranceRequests = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'insurance_requests_2026'));
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInsuranceData(list);
    } catch (err) {
      console.error("Error fetching insurance reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsuranceRequests();
  }, []);

  // Filter Logic
  const filteredData = useMemo(() => {
    return insuranceData.filter(item => {
      const teamName = item.teamName || '';
      const appId = item.appId || item.id || '';
      const district = item.district || '';
      const contactPerson = item.contactPerson || item.presidentName || '';

      const matchesSearch = 
        teamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        district.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contactPerson.toLowerCase().includes(searchTerm.toLowerCase());

      const itemStatus = item.status || 'Pending';
      const matchesStatus = 
        statusFilter === 'ALL' || 
        (statusFilter === 'Approved' && (itemStatus.includes('Approved') || itemStatus.includes('मंजूर'))) ||
        (statusFilter === 'Pending' && (itemStatus.includes('Pending') || itemStatus.includes('प्रलंबित'))) ||
        (statusFilter === 'Rejected' && (itemStatus.includes('Rejected') || itemStatus.includes('नामंजूर') || itemStatus.includes('नाकारलेले')));

      const matchesDistrict = districtFilter === 'ALL' || item.district === districtFilter;
      const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesDistrict && matchesCategory;
    });
  }, [insuranceData, searchTerm, statusFilter, districtFilter, categoryFilter]);

  // Excel Export Handler
  const handleExportToExcel = () => {
    if (filteredData.length === 0) {
      Swal.fire({ icon: 'warning', title: 'डेटा उपलब्ध नाही!', background: '#0c0d14', color: '#fff' });
      return;
    }

    const excelRows = filteredData.map((item, idx) => ({
      'अ. क्र.': idx + 1,
      'App ID': item.appId || item.id || '',
      'मंडळाचे नाव': toTitleCase(item.teamName || ''),
      'प्रकार': item.type || '',
      'गट': item.category || '',
      'संपर्क व्यक्ती': toTitleCase(item.contactPerson || item.presidentName || ''),
      'व्हॉट्सॲप नंबर': item.whatsappNumber || item.phone || '',
      'पर्यायी नंबर': item.alternateNumber || '',
      'ई-मेल': item.email || '',
      'जिल्हा': toTitleCase(item.district || ''),
      'पिनकोड': item.pincode || '',
      'पत्ता': toTitleCase(item.address || ''),
      'थर क्षमता': item.pyramidCapacity || '',
      'विमा गोविंदा संख्या': Number(item.govindaCount || 0),
      'लेटरहेड PDF लिंक': item.fileUrl || '',
      'पॉलिसी नंबर': item.policyNumber || '',
      'स्टेटस': item.status || 'प्रलंबित (Pending)'
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Govinda_Insurance_Report");
    XLSX.writeFile(workbook, `MRDGA_Govinda_Insurance_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Print Handler
  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = `MRDGA_Insurance_Report_${new Date().toISOString().slice(0, 10)}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  const totalCount = filteredData.length;
  const totalGovindaCount = filteredData.reduce((acc, curr) => acc + Number(curr.govindaCount || 0), 0);
  const approvedCount = filteredData.filter(i => (i.status || '').includes('मंजूर') || (i.status || '').includes('Approved')).length;
  const pendingCount = filteredData.filter(i => (i.status || '').includes('प्रलंबित') || (i.status || '').includes('Pending') || !i.status).length;
  const uniqueDistricts = Array.from(new Set(insuranceData.map(i => i.district).filter(Boolean)));

  return (
    <div className="space-y-3.5 font-sans text-white">
      
      {/* 🖨️ PRINT & PDF STYLING */}
      <style>{`
        @media print {
          body { background-color: #fff !important; color: #000 !important; margin: 0 !important; padding: 0 !important; }
          .no-print { display: none !important; }
          .print-area { background: white !important; color: black !important; box-shadow: none !important; border: none !important; width: 100% !important; padding: 0 !important; }
          .print-page-break { page-break-before: always !important; break-before: page !important; padding-top: 10px !important; }
          table { width: 100% !important; border-collapse: collapse !important; }
          th, td { color: black !important; border: 1px solid #333 !important; }
          th { background-color: #f3f4f6 !important; }
        }
      `}</style>

      {/* 📊 Header & Compact Icon Buttons Bar */}
      <div className="no-print flex justify-between items-center bg-black/50 border border-amber-500/20 p-2.5 sm:p-3 rounded-2xl backdrop-blur-md gap-2 shadow-xl">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs sm:text-base font-black text-white leading-tight">
              MRDGA <span className="text-amber-400">गोविंदा विमा अहवाल</span>
            </h2>
            <p className="text-[9px] text-gray-400">विमा अर्ज, गोविंदा संख्या व जिल्हावार अहवाल</p>
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
                title="Excel डाउनलोड करा"
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

          <button
            type="button"
            onClick={fetchInsuranceRequests}
            className="p-2 bg-slate-800/80 hover:bg-slate-700 text-amber-400 border border-slate-700 rounded-xl transition cursor-pointer"
            title="डेटा रिफ्रेश करा"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 📈 STATS CARDS (Matching Master Amber Theme) */}
      <div className="no-print grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-3">
        <div className="bg-black/40 border border-amber-500/20 p-2 sm:p-2.5 rounded-xl flex flex-col items-center justify-center text-center">
          <p className="text-[8px] sm:text-[10px] text-gray-400 font-bold uppercase truncate w-full">एकूण मंडळ अर्ज</p>
          <p className="text-sm sm:text-base font-black text-white mt-0.5">{totalCount}</p>
        </div>

        <div className="bg-black/40 border border-amber-500/30 p-2 sm:p-2.5 rounded-xl flex flex-col items-center justify-center text-center">
          <p className="text-[8px] sm:text-[10px] text-amber-400 font-bold uppercase truncate w-full">संरक्षित गोविंदा संख्या</p>
          <p className="text-sm sm:text-base font-black text-amber-300 mt-0.5">{totalGovindaCount.toLocaleString('mr-IN')}</p>
        </div>

        <div className="bg-black/40 border border-emerald-500/20 p-2 sm:p-2.5 rounded-xl flex flex-col items-center justify-center text-center">
          <p className="text-[8px] sm:text-[10px] text-emerald-400/80 font-bold uppercase truncate w-full">मंजूर अर्ज</p>
          <p className="text-sm sm:text-base font-black text-emerald-400 mt-0.5">{approvedCount}</p>
        </div>

        <div className="bg-black/40 border border-rose-500/20 p-2 sm:p-2.5 rounded-xl flex flex-col items-center justify-center text-center">
          <p className="text-[8px] sm:text-[10px] text-rose-400/80 font-bold uppercase truncate w-full">प्रलंबित अर्ज</p>
          <p className="text-sm sm:text-base font-black text-rose-400 mt-0.5">{pendingCount}</p>
        </div>
      </div>

      {/* 🔍 SEARCH & FILTERS BAR */}
      <div className="no-print bg-black/50 border border-white/10 p-2.5 rounded-2xl space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-amber-400/60" />
          <input
            type="text"
            placeholder="मंडळाचे नाव, संपर्क व्यक्ती किंवा App ID ने शोधा..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/60 border border-amber-500/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400/50"
          />
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          <select
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            className="bg-black/60 border border-amber-500/10 rounded-xl px-2 py-1.5 text-[11px] text-white focus:outline-none"
          >
            <option value="ALL" className="bg-[#0c0d14]">सर्व जिल्हे</option>
            {uniqueDistricts.map(dist => (
              <option key={dist} value={dist} className="bg-[#0c0d14]">{toTitleCase(dist)}</option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-black/60 border border-amber-500/10 rounded-xl px-2 py-1.5 text-[11px] text-white focus:outline-none"
          >
            <option value="ALL" className="bg-[#0c0d14]">सर्व गट</option>
            <option value="Mens" className="bg-[#0c0d14]">पुरुष पथक</option>
            <option value="Womens" className="bg-[#0c0d14]">महिला पथक</option>
            <option value="Both" className="bg-[#0c0d14]">संयुक्त / दोन्ही</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-black/60 border border-amber-500/10 rounded-xl px-2 py-1.5 text-[11px] text-white focus:outline-none"
          >
            <option value="ALL" className="bg-[#0c0d14]">सर्व स्टेटस</option>
            <option value="Approved" className="bg-[#0c0d14]">मंजूर (Approved)</option>
            <option value="Pending" className="bg-[#0c0d14]">प्रलंबित (Pending)</option>
            <option value="Rejected" className="bg-[#0c0d14]">नाकारलेले (Rejected)</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p className="p-8 text-center text-amber-400 font-semibold text-xs animate-pulse">विमा डेटा लोड होत आहे...</p>
      ) : filteredData.length === 0 ? (
        <p className="p-8 text-center text-gray-400 text-xs font-medium">कोणतीही नोंदणी सापडली नाही.</p>
      ) : (
        <>
          {/* 📱 MOBILE VIEW CARDS (Compact Cards, No Horizontal Scroll, Phone Hidden on Screen) */}
          <div className="no-print grid grid-cols-1 md:hidden gap-2.5">
            {filteredData.map((item, idx) => {
              const contactName = toTitleCase(item.contactPerson || item.presidentName || 'संपर्क नाव नाही');
              const phone = item.whatsappNumber || item.phone || '';
              const altPhone = item.alternateNumber || '';
              const isApproved = (item.status || '').includes('Approved') || (item.status || '').includes('मंजूर');
              const isRejected = (item.status || '').includes('Rejected') || (item.status || '').includes('नामंजूर') || (item.status || '').includes('नाकारलेले');

              return (
                <div key={item.id || idx} className="p-3 rounded-2xl border border-amber-500/20 bg-black/40 space-y-2 shadow-md">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                        #{item.appId || item.id}
                      </span>
                      <h3 className="font-bold text-xs sm:text-sm text-white mt-1 leading-tight">{toTitleCase(item.teamName)}</h3>
                      <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-amber-400 shrink-0" /> {toTitleCase(item.district) || 'जिल्हा N/A'} | <b className="text-amber-300">{item.govindaCount || 0} गोविंदा</b> {item.pyramidCapacity ? `(${item.pyramidCapacity} थर)` : ''}
                      </p>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black border uppercase tracking-wider shrink-0 ${
                      isApproved ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                      isRejected ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
                      'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    }`}>
                      {item.status || 'Pending'}
                    </span>
                  </div>

                  <div className="bg-black/50 p-2 rounded-xl border border-white/5 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <User className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="text-gray-200 font-semibold truncate text-[11px]">{contactName}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {phone && (
                          <>
                            <a href={`https://wa.me/91${phone}`} target="_blank" rel="noreferrer" className="p-1 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30 transition" title="WhatsApp करा"><MessageSquare className="w-3 h-3" /></a>
                            <a href={`tel:${phone}`} className="p-1 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30 transition" title="कॉल करा"><Phone className="w-3 h-3" /></a>
                          </>
                        )}
                        {altPhone && (
                          <a href={`tel:${altPhone}`} className="p-1 bg-slate-800 text-slate-300 rounded-lg border border-slate-700 transition" title="पर्यायी नंबरवर कॉल करा"><Phone className="w-3 h-3 text-slate-400" /></a>
                        )}
                      </div>
                    </div>

                    {item.fileUrl && (
                      <div className="pt-1 border-t border-white/5 flex justify-end">
                        <a href={item.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-bold hover:underline">
                          <ExternalLink className="w-3 h-3" /> लेटरहेड PDF पाहा
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 💻 DESKTOP & PRINTABLE SECTION (High Density Compact Rows) */}
          <div className="hidden md:block print-area rounded-2xl overflow-hidden border border-amber-500/20 shadow-2xl p-3 sm:p-4 bg-[#0c0d14] text-white">
            
            {/* Header for Print / Desktop */}
            <div className="mb-3 pb-2 border-b border-gray-600 flex justify-between items-center">
              <div>
                <h1 className="text-base font-black text-amber-400 uppercase tracking-wide">
                  MAHARASHTRA RAJYA DAHIHANDI GOVINDA ASSOCIATION
                </h1>
                <h2 className="text-xs sm:text-sm font-bold text-white mt-0.5">
                  🛡️ गोविंदा विमा अहवाल (Insurance Report 2026)
                </h2>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  अधिकृत विमा अर्ज यादी | दिनांक: {new Date().toLocaleDateString('mr-IN')}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-bold bg-amber-500/20 px-2.5 py-1 rounded border border-amber-500/30 text-amber-300">
                  एकूण गोविंदा: {totalGovindaCount.toLocaleString('mr-IN')} ({totalCount} मंडळे)
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-black/80 border-b border-amber-500/30 text-amber-400 font-extrabold uppercase text-[10px]">
                    <th className="p-1.5 border border-white/10 text-center">अ.क्र.</th>
                    <th className="p-1.5 border border-white/10">App ID</th>
                    <th className="p-1.5 border border-white/10">मंडळाचे नाव</th>
                    <th className="p-1.5 border border-white/10">जिल्हा</th>
                    <th className="p-1.5 border border-white/10">संपर्क व्यक्ती</th>
                    <th className="p-1.5 border border-white/10 text-center">गोविंदा</th>
                    <th className="p-1.5 border border-white/10 text-center">थर</th>
                    <th className="p-1.5 border border-white/10 text-center no-print">लेटरहेड PDF</th>
                    <th className="p-1.5 border border-white/10 text-center">स्टेटस</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {filteredData.map((item, idx) => {
                    const phone = item.whatsappNumber || item.phone || '';
                    const isApproved = (item.status || '').includes('Approved') || (item.status || '').includes('मंजूर');
                    const isRejected = (item.status || '').includes('Rejected') || (item.status || '').includes('नामंजूर') || (item.status || '').includes('नाकारलेले');

                    return (
                      <tr key={item.id || idx} className="hover:bg-white/5 transition">
                        <td className="p-1.5 border border-white/5 text-gray-400 font-mono text-center">{idx + 1}</td>
                        <td className="p-1.5 border border-white/5 font-mono font-bold text-amber-400 whitespace-nowrap">{item.appId || item.id}</td>
                        <td className="p-1.5 border border-white/5 font-bold text-white">{toTitleCase(item.teamName)}</td>
                        <td className="p-1.5 border border-white/5 text-gray-300">{toTitleCase(item.district)}</td>
                        
                        {/* 🎯 संपर्क व्यक्ती: स्क्रीनवर नंबर लपलेला, PDF मध्ये 📞 सह प्रिंट होईल */}
                        <td className="p-1.5 border border-white/5">
                          <div className="flex items-center justify-between gap-1">
                            <div>
                              <p className="font-semibold text-gray-200">{toTitleCase(item.contactPerson || item.presidentName || '-')}</p>
                              {phone && (
                                <p className="hidden print:block text-[10px] text-black font-mono font-bold mt-0.5">
                                  📞 {phone}
                                </p>
                              )}
                            </div>
                            {phone && (
                              <div className="no-print flex items-center gap-1 shrink-0">
                                <a href={`https://wa.me/91${phone}`} target="_blank" rel="noreferrer" className="p-1 bg-emerald-500/20 text-emerald-400 rounded" title="WhatsApp करा"><MessageSquare className="w-3 h-3" /></a>
                                <a href={`tel:${phone}`} className="p-1 bg-blue-500/20 text-blue-400 rounded" title="कॉल करा"><Phone className="w-3 h-3" /></a>
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="p-1.5 border border-white/5 text-center font-mono font-bold text-amber-300">{item.govindaCount || 0}</td>
                        <td className="p-1.5 border border-white/5 text-center text-gray-300 font-mono">{item.pyramidCapacity || '-'}</td>
                        
                        {/* लेटरहेड लिंक */}
                        <td className="p-1.5 border border-white/5 text-center no-print">
                          {item.fileUrl ? (
                            <a href={item.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] text-amber-400 hover:underline">
                              <ExternalLink className="w-3 h-3" /> पाहा
                            </a>
                          ) : <span className="text-gray-500 text-[10px]">-</span>}
                        </td>

                        <td className="p-1.5 border border-white/5 text-center">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold border uppercase ${
                            isApproved ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                            isRejected ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
                            'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          }`}>
                            {item.status || 'Pending'}
                          </span>
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