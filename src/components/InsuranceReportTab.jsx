import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { 
  FileSpreadsheet, Printer, Search, Shield, 
  MapPin, Phone, User, MessageSquare, ExternalLink
} from 'lucide-react';

export default function InsuranceReportTab({ canExportAndPrint }) {
  const [insuranceData, setInsuranceData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [districtFilter, setDistrictFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  useEffect(() => {
    const fetchInsuranceRequests = async () => {
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
    fetchInsuranceRequests();
  }, []);

  // Filter Logic
  const filteredData = insuranceData.filter(item => {
    const teamName = item.teamName || '';
    const appId = item.appId || '';
    const district = item.district || '';
    const contactPerson = item.contactPerson || '';

    const matchesSearch = 
      teamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      district.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contactPerson.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    const matchesDistrict = districtFilter === 'ALL' || item.district === districtFilter;
    const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesDistrict && matchesCategory;
  });

  // Excel Export Handler
  const handleExportToExcel = () => {
    if (filteredData.length === 0) {
      Swal.fire({ icon: 'warning', title: 'डेटा उपलब्ध नाही!', background: '#0c0d14', color: '#fff' });
      return;
    }

    const excelRows = filteredData.map((item, idx) => ({
      'अ. क्र.': idx + 1,
      'App ID': item.appId || '',
      'मंडळाचे नाव': item.teamName || '',
      'प्रकार': item.type || '',
      'गट': item.category || '',
      'संपर्क व्यक्ती': item.contactPerson || '',
      'व्हॉट्सॲप नंबर': item.whatsappNumber || '',
      'पर्यायी नंबर': item.alternateNumber || '',
      'ई-मेल': item.email || '',
      'जिल्हा': item.district || '',
      'पिनकोड': item.pincode || '',
      'पत्ता': item.address || '',
      'थर क्षमता': item.pyramidCapacity || '',
      'विमा गोविंदा संख्या': item.govindaCount || 0,
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
    window.print();
  };

  const totalGovindaCount = filteredData.reduce((acc, curr) => acc + Number(curr.govindaCount || 0), 0);
  const uniqueDistricts = Array.from(new Set(insuranceData.map(i => i.district).filter(Boolean)));

  return (
    <div className="space-y-4">
      {/* 📊 Header & Action Buttons */}
      <div className="no-print flex flex-col sm:flex-row justify-between items-start sm:items-center bg-black/50 border border-amber-500/20 p-3 rounded-2xl backdrop-blur-md gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs sm:text-base font-black text-white leading-tight">
              गोविंदा विमा <span className="text-amber-400">रिपोर्ट्स व एक्सपोर्ट</span>
            </h2>
            <p className="text-[9px] text-gray-400">विमा अर्ज, गोविंदा संख्या व जिल्हावार अहवाल</p>
          </div>
        </div>

        {canExportAndPrint && (
          <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
            <button
              onClick={handleExportToExcel}
              className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1 transition cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Excel डाउनलोड
            </button>
            <button
              onClick={handlePrint}
              className="px-2.5 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1 transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Print / PDF
            </button>
          </div>
        )}
      </div>

      {/* 📈 Stats Summary */}
      <div className="no-print grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-black/40 border border-amber-500/20 p-2 rounded-xl text-center">
          <p className="text-[10px] text-gray-400 font-bold">एकूण मंडळ अर्ज</p>
          <p className="text-sm font-black text-white mt-0.5">{filteredData.length}</p>
        </div>
        <div className="bg-black/40 border border-emerald-500/20 p-2 rounded-xl text-center">
          <p className="text-[10px] text-emerald-400 font-bold">संरक्षित गोविंदा संख्या</p>
          <p className="text-sm font-black text-emerald-400 mt-0.5">{totalGovindaCount.toLocaleString('mr-IN')}</p>
        </div>
        <div className="bg-black/40 border border-amber-500/20 p-2 rounded-xl text-center">
          <p className="text-[10px] text-amber-400 font-bold">मंजूर अर्ज</p>
          <p className="text-sm font-black text-amber-400 mt-0.5">
            {filteredData.filter(i => (i.status || '').includes('मंजूर') || (i.status || '').includes('Approved')).length}
          </p>
        </div>
        <div className="bg-black/40 border border-rose-500/20 p-2 rounded-xl text-center">
          <p className="text-[10px] text-rose-400 font-bold">प्रलंबित अर्ज</p>
          <p className="text-sm font-black text-rose-400 mt-0.5">
            {filteredData.filter(i => (i.status || '').includes('प्रलंबित') || (i.status || '').includes('Pending')).length}
          </p>
        </div>
      </div>

      {/* 🔍 Filters */}
      <div className="no-print glass-panel p-2.5 rounded-2xl space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-amber-400/60" />
          <input
            type="text"
            placeholder="मंडळाचे नाव, संपर्क व्यक्ती किंवा App ID ने शोधा..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/60 border border-amber-500/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400/50"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <select
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            className="bg-black/60 border border-amber-500/10 rounded-xl px-2 py-1.5 text-[11px] text-white focus:outline-none"
          >
            <option value="ALL" className="bg-[#0c0d14]">सर्व जिल्हे</option>
            {uniqueDistricts.map(dist => (
              <option key={dist} value={dist} className="bg-[#0c0d14]">{dist}</option>
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
            <option value="मंजूर (Approved)" className="bg-[#0c0d14]">मंजूर (Approved)</option>
            <option value="प्रलंबित (Pending)" className="bg-[#0c0d14]">प्रलंबित (Pending)</option>
            <option value="नामंजूर (Rejected)" className="bg-[#0c0d14]">नाकारलेले (Rejected)</option>
          </select>
        </div>
      </div>

      {/* 📋 Data Table */}
      {loading ? (
        <p className="p-8 text-center text-amber-400 font-semibold text-xs animate-pulse">विमा डेटा लोड होत आहे...</p>
      ) : filteredData.length === 0 ? (
        <p className="p-8 text-center text-gray-400 text-xs">कोणतीही नोंद सापडली नाही.</p>
      ) : (
        <div className="print-area glass-panel rounded-2xl overflow-hidden border border-amber-500/20 shadow-2xl p-3 bg-[#0c0d14] text-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-black/80 border-b border-amber-500/30 text-amber-400 font-extrabold uppercase text-[10px]">
                  <th className="p-2 border border-white/10 text-center">अ.क्र.</th>
                  <th className="p-2 border border-white/10">App ID</th>
                  <th className="p-2 border border-white/10">मंडळाचे नाव</th>
                  <th className="p-2 border border-white/10">जिल्हा</th>
                  <th className="p-2 border border-white/10">संपर्क व्यक्ती</th>
                  <th className="p-2 border border-white/10 text-center">गोविंदा संख्या</th>
                  <th className="p-2 border border-white/10 text-center">थर</th>
                  <th className="p-2 border border-white/10 text-center">लेटरहेड PDF</th>
                  <th className="p-2 border border-white/10 text-center">स्टेटस</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredData.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-white/5 transition">
                    <td className="p-2 border border-white/5 text-gray-400 font-mono text-center">{idx + 1}</td>
                    <td className="p-2 border border-white/5 font-mono font-bold text-amber-400">{item.appId}</td>
                    <td className="p-2 border border-white/5 font-bold text-white">{item.teamName}</td>
                    <td className="p-2 border border-white/5 text-gray-300">{item.district}</td>
                    <td className="p-2 border border-white/5">
                      <p className="font-semibold text-gray-200">{item.contactPerson}</p>
                      <p className="text-[10px] text-gray-400 font-mono">{item.whatsappNumber}</p>
                    </td>
                    <td className="p-2 border border-white/5 text-center font-mono font-bold text-emerald-400">{item.govindaCount}</td>
                    <td className="p-2 border border-white/5 text-center text-gray-300">{item.pyramidCapacity || '-'}</td>
                    <td className="p-2 border border-white/5 text-center">
                      {item.fileUrl ? (
                        <a href={item.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] text-amber-400 hover:underline">
                          <ExternalLink className="w-3 h-3" /> फाईल पहा
                        </a>
                      ) : <span className="text-gray-500 text-[10px]">-</span>}
                    </td>
                    <td className="p-2 border border-white/5 text-center">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold border uppercase ${
                        (item.status || '').includes('Approved') || (item.status || '').includes('मंजूर') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                        (item.status || '').includes('Rejected') || (item.status || '').includes('नामंजूर') ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
                        'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      }`}>
                        {item.status || 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}