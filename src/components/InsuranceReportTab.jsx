// ==========================================
// #SECTION 1: IMPORTS & INITIALIZATION
// ==========================================
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { 
  FileSpreadsheet, Printer, Search, Shield, 
  MapPin, Phone, User, MessageSquare, ExternalLink, RefreshCw,
  BarChart3, ChevronDown, ChevronUp, Image as ImageIcon
} from 'lucide-react';

export default function InsuranceReportTab({ canExportAndPrint, requests = [] }) {
  // ==========================================
  // #SECTION 2: STATE MANAGEMENT
  // ==========================================
  const [insuranceData, setInsuranceData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [districtFilter, setDistrictFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  
  // 🎯 Collapsible District Summary State
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  const toTitleCase = (str) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatNumber = (num) => {
    return Number(num || 0).toLocaleString('en-IN');
  };

  // ==========================================
  // #SECTION 3: DATA FETCHING & SYNCHRONIZATION
  // ==========================================
  const fetchInsuranceRequests = async () => {
    if (loading) return;
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
    if (Array.isArray(requests) && requests.length > 0) {
      setInsuranceData(requests);
      setLoading(false);
    } else {
      fetchInsuranceRequests();
    }
  }, []);

  useEffect(() => {
    if (Array.isArray(requests) && requests.length > 0) {
      setInsuranceData(requests);
      setLoading(false);
    }
  }, [requests]);

  // ==========================================
  // #SECTION 4: FILTER LOGIC (IN-MEMORY)
  // ==========================================
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

  // ==========================================
  // #SECTION 5: STATS & DISTRICT SUMMARY CALCULATION
  // ==========================================
  const validData = useMemo(() => {
    return filteredData.filter(item => {
      const status = String(item.status || '').toLowerCase();
      return !(status.includes('rejected') || status.includes('नामंजूर') || status.includes('नाकार'));
    });
  }, [filteredData]);

  const totalCount = validData.length;
  const totalGovindaCount = validData.reduce((acc, curr) => acc + Number(curr.govindaCount || 0), 0);

  const approvedCount = filteredData.filter(i => {
    const s = String(i.status || '').toLowerCase();
    return s.includes('approved') || s.includes('मंजूर');
  }).length;

  const pendingCount = filteredData.filter(i => {
    const s = String(i.status || '').toLowerCase();
    return s.includes('pending') || s.includes('प्रलंबित') || !i.status;
  }).length;

  // 📊 जिल्हावार संक्षिप्त समरी
  const districtSummary = useMemo(() => {
    const map = {};
    insuranceData.forEach(item => {
      const status = String(item.status || '').toLowerCase();
      if (status.includes('rejected') || status.includes('नामंजूर') || status.includes('नाकार')) return;

      const dist = item.district || 'इतर / इतर जिल्हे';
      const gCount = Number(item.govindaCount || 0);

      if (!map[dist]) {
        map[dist] = {
          district: dist,
          totalApps: 0,
          approvedApps: 0,
          approvedGovinda: 0,
          pendingApps: 0,
          pendingGovinda: 0,
          totalGovinda: 0
        };
      }

      map[dist].totalApps += 1;
      map[dist].totalGovinda += gCount;

      if (status.includes('approved') || status.includes('मंजूर')) {
        map[dist].approvedApps += 1;
        map[dist].approvedGovinda += gCount;
      } else {
        map[dist].pendingApps += 1;
        map[dist].pendingGovinda += gCount;
      }
    });

    return Object.values(map).sort((a, b) => b.approvedGovinda - a.approvedGovinda);
  }, [insuranceData]);

  const uniqueDistricts = Array.from(new Set(insuranceData.map(i => i.district).filter(Boolean)));

  // ==========================================
  // #SECTION 6: EXPORT & PRINT HANDLERS
  // ==========================================
const handleExportToExcel = () => {
    if (filteredData.length === 0) {
      Swal.fire({ icon: 'warning', title: 'डेटा उपलब्ध नाही!', background: '#0c0d14', color: '#fff' });
      return;
    }

    // १. मजकूर स्वच्छ करण्याचे हेल्पर फंक्शन (तारीख, प्रिफिक्स व टॅग्ज काढून टाकणे)
    const cleanRemarkText = (rawText) => {
      if (!rawText) return '';
      let text = String(rawText).trim();
      
      // अनावश्यक प्रिफिक्स काढून टाकणे
      text = text.replace(/^\[(नामंजूर कारण|नाकारले|Super Admin Update|Admin Note|Remark)\]:\s*/i, '');
      text = text.replace(/^\[.*?\]\s*/g, ''); // जर सुरुवातीला ब्रॅकेट्स असतील तर
      return text.trim();
    };

    // २. प्रत्येक अर्जातील सर्व रिमार्क्स फक्त शुद्ध मजकूर स्वरूपात गोळा करणे
    const rowsWithRemarks = filteredData.map(item => {
      const remarkList = [];

      // A. नाकारण्याचे मुख्य कारण (Reject Reason) असल्यास
      if (item.rejectReason && String(item.rejectReason).trim()) {
        const cleaned = cleanRemarkText(item.rejectReason);
        if (cleaned) remarkList.push(cleaned);
      }

      // B. ॲडमिन कमेंट (adminComment) असल्यास
      if (item.adminComment && String(item.adminComment).trim()) {
        const cleaned = cleanRemarkText(item.adminComment);
        if (cleaned && !remarkList.includes(cleaned)) {
          remarkList.push(cleaned);
        }
      }

      // C. 🎯 comments ॲरेमधील ऑब्जेक्ट्समधून फक्त 'text' घेणे (नाव व तारीख वगळली आहे)
      if (Array.isArray(item.comments) && item.comments.length > 0) {
        item.comments.forEach(c => {
          if (!c) return;
          const raw = typeof c === 'object' ? (c.text || '') : String(c);
          const cleaned = cleanRemarkText(raw);

          // डुप्लिकेट नसलेला स्वच्छ मजकूरच लिस्टमध्ये घेणे
          if (cleaned && !remarkList.includes(cleaned)) {
            remarkList.push(cleaned);
          }
        });
      } else if (typeof item.comments === 'string' && item.comments.trim()) {
        const cleaned = cleanRemarkText(item.comments);
        if (cleaned && !remarkList.includes(cleaned)) {
          remarkList.push(cleaned);
        }
      }

      return { item, remarkList };
    });

    // ३. जास्तीत जास्त किती रिमार्क्स कॉलम्स लागतील ते ठरवणे
    const maxRemarksCount = Math.max(1, ...rowsWithRemarks.map(r => r.remarkList.length));

    // ४. मूळ कॉलम्स + स्वच्छ रिमार्क कॉलम्स तयार करणे
    const excelRows = rowsWithRemarks.map(({ item, remarkList }, idx) => {
      const row = {
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
      };

      // 🎯 फक्त शुद्ध रिमार्क मजकूर स्वतंत्र कॉलम्समध्ये जाईल
      for (let i = 0; i < maxRemarksCount; i++) {
        row[`रिमार्क ${i + 1}`] = remarkList[i] || '-';
      }

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Govinda_Insurance_Report");
    XLSX.writeFile(workbook, `MRDGA_Govinda_Insurance_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // 📊 २. फक्त या सारांशाची स्वतंत्र Excel फाईल
  const handleExportSummaryExcel = () => {
    if (districtSummary.length === 0) return;
    const excelRows = districtSummary.map((d, i) => ({
      'अ. क्र.': i + 1,
      'जिल्हा': toTitleCase(d.district),
      'मंजूर अर्ज': d.approvedApps,
      'मंजूर गोविंदा': d.approvedGovinda,
      'प्रलंबित अर्ज': d.pendingApps,
      'प्रलंबित गोविंदा': d.pendingGovinda,
      'एकूण गोविंदा': d.totalGovinda
    }));

    excelRows.push({
      'अ. क्र.': 'एकूण',
      'जिल्हा': 'GRAND TOTAL',
      'मंजूर अर्ज': districtSummary.reduce((s, d) => s + d.approvedApps, 0),
      'मंजूर गोविंदा': districtSummary.reduce((s, d) => s + d.approvedGovinda, 0),
      'प्रलंबित अर्ज': districtSummary.reduce((s, d) => s + d.pendingApps, 0),
      'प्रलंबित गोविंदा': districtSummary.reduce((s, d) => s + d.pendingGovinda, 0),
      'एकूण गोविंदा': districtSummary.reduce((s, d) => s + d.totalGovinda, 0)
    });

    const ws = XLSX.utils.json_to_sheet(excelRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "District_Summary");
    XLSX.writeFile(wb, `MRDGA_District_Summary_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

// 📸 ३. नेटिव्ह HTML5 Canvas द्वारे परिपूर्ण HD इमेज (कट होणार नाही)
  const handleDownloadSummaryImage = () => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      const width = 900;
      const titleHeight = 115; // वरचे हेडिंग व तारीख
      const tableHeaderHeight = 36; // टेबल हेडर
      const rowHeight = 36; // प्रत्येक जिल्ह्याची ओळ
      const footerHeight = 44; // ग्रँड टोटल ओळ
      const bottomPadding = 30; // तळातील अतिरिक्त सुरक्षित जागा

      // 🎯 एकूण अचूक उंची (No Clipping)
      const totalRowsHeight = districtSummary.length * rowHeight;
      const height = titleHeight + tableHeaderHeight + totalRowsHeight + footerHeight + bottomPadding;

      // 2X स्केल हाय-रिझोल्यूशन (Crisp & Sharp Text)
      canvas.width = width * 2;
      canvas.height = height * 2;
      ctx.scale(2, 2);

      // १. बॅकग्राउंड
      ctx.fillStyle = '#0c0d14';
      ctx.fillRect(0, 0, width, height);

      // २. असोसिएशन नाव व शीर्षक
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('MAHARASHTRA RAJYA DAHIHANDI GOVINDA ASSOCIATION', 30, 42);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText('जिल्हावार संक्षिप्त सारांश (District Summary: Approved vs Pending)', 30, 70);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px sans-serif';
      ctx.fillText(`दिनांक: ${new Date().toLocaleDateString('mr-IN')} | एकूण जिल्हे: ${districtSummary.length} | एकूण नोंदी अहवाल`, 30, 94);

      // ३. टेबल हेडर पट्टी
      let currentY = titleHeight;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(25, currentY, width - 50, tableHeaderHeight);

      ctx.fillStyle = '#fcd34d';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('जिल्हा (District)', 40, currentY + 23);
      ctx.fillText('मंजूर अर्ज', 280, currentY + 23);
      ctx.fillText('मंजूर गोविंदा', 400, currentY + 23);
      ctx.fillText('प्रलंबित अर्ज', 540, currentY + 23);
      ctx.fillText('प्रलंबित गोविंदा', 660, currentY + 23);
      ctx.fillText('एकूण गोविंदा', 780, currentY + 23);

      currentY += tableHeaderHeight;

      // ४. डेटा ओळी (Data Rows)
      districtSummary.forEach((d, index) => {
        ctx.fillStyle = index % 2 === 0 ? '#111827' : '#0a0f1d';
        ctx.fillRect(25, currentY, width - 50, rowHeight);

        // बॉर्डर
        ctx.strokeStyle = '#ffffff10';
        ctx.lineWidth = 1;
        ctx.strokeRect(25, currentY, width - 50, rowHeight);

        // जिल्हा नाव
        ctx.fillStyle = '#ffffff';
        ctx.font = '13px sans-serif';
        ctx.fillText(toTitleCase(d.district), 40, currentY + 23);

        // आकडे
        ctx.fillStyle = '#4ade80';
        ctx.font = 'bold 13px monospace';
        ctx.fillText(formatNumber(d.approvedApps), 290, currentY + 23);
        ctx.fillText(formatNumber(d.approvedGovinda), 410, currentY + 23);

        ctx.fillStyle = '#fbbf24';
        ctx.fillText(formatNumber(d.pendingApps), 550, currentY + 23);
        ctx.fillText(formatNumber(d.pendingGovinda), 670, currentY + 23);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px monospace';
        ctx.fillText(formatNumber(d.totalGovinda), 790, currentY + 23);

        currentY += rowHeight;
      });

      // ५. 🎯 ग्रँड टोटल ओळ (Footer Grand Total Row)
      ctx.fillStyle = '#78350f';
      ctx.fillRect(25, currentY, width - 50, footerHeight);

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(25, currentY, width - 50, footerHeight);

      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('🚩 एकूण (GRAND TOTAL)', 40, currentY + 27);

      ctx.fillStyle = '#86efac';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(formatNumber(districtSummary.reduce((s, d) => s + d.approvedApps, 0)), 290, currentY + 27);
      ctx.fillText(formatNumber(districtSummary.reduce((s, d) => s + d.approvedGovinda, 0)), 410, currentY + 27);

      ctx.fillStyle = '#fde047';
      ctx.fillText(formatNumber(districtSummary.reduce((s, d) => s + d.pendingApps, 0)), 550, currentY + 27);
      ctx.fillText(formatNumber(districtSummary.reduce((s, d) => s + d.pendingGovinda, 0)), 670, currentY + 27);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(formatNumber(districtSummary.reduce((s, d) => s + d.totalGovinda, 0)), 790, currentY + 27);

      // ६. डाऊनलोड ट्रिगर
      const link = document.createElement('a');
      link.download = `MRDGA_District_Summary_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
    } catch (err) {
      console.error("Canvas Export Error:", err);
      Swal.fire({ icon: 'error', title: 'इमेज डाउनलोड करताना त्रुटी आली!', background: '#0c0d14', color: '#fff' });
    }
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = `MRDGA_Insurance_Report_${new Date().toISOString().slice(0, 10)}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  // ==========================================
  // #SECTION 7: MAIN RENDER (UI & TABLES)
  // ==========================================
  return (
    <div className="space-y-3.5 font-sans text-white">
      
      {/* 🖨️ CLEAN PRINT STYLING */}
      <style>{`
        @media print {
          body { 
            background-color: #fff !important; 
            color: #000 !important; 
            margin: 0 !important; 
            padding: 0 !important; 
          }
          .no-print { 
            display: none !important; 
          }
          .print-area { 
            background: white !important; 
            color: black !important; 
            box-shadow: none !important; 
            border: none !important; 
            width: 100% !important; 
            padding: 0 !important; 
            margin: 0 !important; 
          }
          .print-page-break { 
            page-break-before: always !important; 
            break-before: page !important; 
            padding-top: 10px !important; 
          }
          table { 
            width: 100% !important; 
            border-collapse: collapse !important; 
            font-size: 10px !important; 
          }
          th, td { 
            color: black !important; 
            border: 1px solid #444 !important; 
            padding: 4px 5px !important; 
          }
          th { 
            background-color: #f3f4f6 !important; 
            font-weight: bold !important;
          }
          .status-approved-print {
            border: 1px solid #16a34a !important;
            color: #15803d !important;
            background-color: #f0fdf4 !important;
            font-weight: 800 !important;
            padding: 1px 4px !important;
            border-radius: 3px !important;
          }
          .status-rejected-print {
            border: 1px solid #dc2626 !important;
            color: #b91c1c !important;
            background-color: #fef2f2 !important;
            font-weight: 800 !important;
            padding: 1px 4px !important;
            border-radius: 3px !important;
          }
          .status-pending-print {
            border: 1px solid #d97706 !important;
            color: #b45309 !important;
            background-color: #fffbeb !important;
            font-weight: 800 !important;
            padding: 1px 4px !important;
            border-radius: 3px !important;
          }
        }
      `}</style>

      {/* 📊 Header & Action Buttons */}
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

      {/* 📈 1. STATS CARDS */}
      <div className="no-print grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-3">
        <div className="bg-black/40 border border-amber-500/20 p-2 sm:p-2.5 rounded-xl flex flex-col items-center justify-center text-center">
          <p className="text-[8px] sm:text-[10px] text-gray-400 font-bold uppercase truncate w-full">वैध मंडळ अर्ज</p>
          <p className="text-sm sm:text-base font-black text-white mt-0.5">{formatNumber(totalCount)}</p>
        </div>

        <div className="bg-black/40 border border-amber-500/30 p-2 sm:p-2.5 rounded-xl flex flex-col items-center justify-center text-center">
          <p className="text-[8px] sm:text-[10px] text-amber-400 font-bold uppercase truncate w-full">संरक्षित गोविंदा संख्या</p>
          <p className="text-sm sm:text-base font-black text-amber-300 mt-0.5">{formatNumber(totalGovindaCount)}</p>
        </div>

        <div className="bg-black/40 border border-emerald-500/20 p-2 sm:p-2.5 rounded-xl flex flex-col items-center justify-center text-center">
          <p className="text-[8px] sm:text-[10px] text-emerald-400/80 font-bold uppercase truncate w-full">मंजूर अर्ज</p>
          <p className="text-sm sm:text-base font-black text-emerald-400 mt-0.5">{formatNumber(approvedCount)}</p>
        </div>

        <div className="bg-black/40 border border-rose-500/20 p-2 sm:p-2.5 rounded-xl flex flex-col items-center justify-center text-center">
          <p className="text-[8px] sm:text-[10px] text-rose-400/80 font-bold uppercase truncate w-full">प्रलंबित अर्ज</p>
          <p className="text-sm sm:text-base font-black text-rose-400 mt-0.5">{formatNumber(pendingCount)}</p>
        </div>
      </div>

      {/* 📊 2. COLLAPSIBLE DISTRICT SUMMARY */}
      <div className="no-print bg-black/40 border border-amber-500/20 rounded-2xl overflow-hidden shadow-md">
        <div className="flex items-center justify-between p-3 bg-black/60 border-b border-white/5 gap-2">
          <button
            type="button"
            onClick={() => setIsSummaryOpen(!isSummaryOpen)}
            className="flex items-center gap-2 text-left cursor-pointer flex-1"
          >
            <BarChart3 className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs sm:text-sm font-extrabold text-amber-400">
              जिल्हावार संक्षिप्त सारांश <span className="hidden sm:inline text-gray-300 font-normal">(District Summary)</span>
            </span>
            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30 font-mono">
              {districtSummary.length} जिल्हे
            </span>
            {isSummaryOpen ? <ChevronUp className="w-4 h-4 text-gray-400 ml-1" /> : <ChevronDown className="w-4 h-4 text-gray-400 ml-1" />}
          </button>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleDownloadSummaryImage}
              className="px-2 py-1 bg-amber-500/15 hover:bg-amber-500 hover:text-black border border-amber-500/30 text-amber-300 rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
              title="WhatsApp साठी फोटो डाउनलोड करा"
            >
              <ImageIcon className="w-3 h-3" />
              <span>Image</span>
            </button>
            <button
              type="button"
              onClick={handleExportSummaryExcel}
              className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
              title="Excel फाईल डाउनलोड करा"
            >
              <FileSpreadsheet className="w-3 h-3" />
              <span>Excel</span>
            </button>
          </div>
        </div>

        {isSummaryOpen && (
          <div className="p-3">
            
            {/* 📱 A. मोबाईल कार्ड व्ह्यू */}
            <div className="grid grid-cols-1 gap-2 sm:hidden font-mono">
              {districtSummary.map((dist, idx) => (
                <div key={idx} className="bg-black/60 border border-white/10 rounded-xl p-2.5 space-y-1.5 shadow-sm">
                  <div className="flex justify-between items-center border-b border-white/5 pb-1">
                    <span className="font-bold text-xs text-white flex items-center gap-1 font-sans">
                      <MapPin className="w-3 h-3 text-amber-400 shrink-0" /> {toTitleCase(dist.district)}
                    </span>
                    <span className="font-black text-xs text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {formatNumber(dist.totalGovinda)} गोविंदा
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-1.5 rounded-lg">
                      <p className="text-gray-400 font-sans text-[8px] uppercase">मंजूर</p>
                      <p className="text-emerald-400 font-bold mt-0.5">{dist.approvedApps} अर्ज | {formatNumber(dist.approvedGovinda)}</p>
                    </div>
                    <div className="bg-amber-500/10 border border-amber-500/20 p-1.5 rounded-lg">
                      <p className="text-gray-400 font-sans text-[8px] uppercase">प्रलंबित</p>
                      <p className="text-amber-400 font-bold mt-0.5">{dist.pendingApps} अर्ज | {formatNumber(dist.pendingGovinda)}</p>
                    </div>
                  </div>
                </div>
              ))}

              <div className="bg-amber-500/20 border-2 border-amber-500/50 rounded-xl p-2.5 space-y-1 text-center font-mono">
                <p className="font-sans font-black text-amber-300 text-xs uppercase">🚩 एकूण (GRAND TOTAL)</p>
                <div className="flex justify-around items-center pt-1 text-[11px]">
                  <div>
                    <span className="text-[9px] text-gray-400 block font-sans">मंजूर गोविंदा</span>
                    <span className="text-emerald-400 font-bold">{formatNumber(districtSummary.reduce((s, d) => s + d.approvedGovinda, 0))}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-400 block font-sans">प्रलंबित गोविंदा</span>
                    <span className="text-amber-400 font-bold">{formatNumber(districtSummary.reduce((s, d) => s + d.pendingGovinda, 0))}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-400 block font-sans">एकूण गोविंदा</span>
                    <span className="text-white font-black">{formatNumber(districtSummary.reduce((s, d) => s + d.totalGovinda, 0))}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 💻 B. डेस्कटॉप टेबल व्ह्यू */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-black/80 border-b border-amber-500/30 text-amber-300 font-extrabold text-[10px]">
                    <th className="p-1.5 border border-white/10">जिल्हा (District)</th>
                    <th className="p-1.5 border border-white/10 text-center text-emerald-400">मंजूर अर्ज</th>
                    <th className="p-1.5 border border-white/10 text-center text-emerald-400">मंजूर गोविंदा</th>
                    <th className="p-1.5 border border-white/10 text-center text-amber-400">प्रलंबित अर्ज</th>
                    <th className="p-1.5 border border-white/10 text-center text-amber-400">प्रलंबित गोविंदा</th>
                    <th className="p-1.5 border border-white/10 text-center text-white">एकूण गोविंदा</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {districtSummary.map((dist, idx) => (
                    <tr key={idx} className="hover:bg-white/5 transition">
                      <td className="p-1.5 border border-white/5 font-bold text-white flex items-center gap-1 font-sans">
                        <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                        {toTitleCase(dist.district)}
                      </td>
                      <td className="p-1.5 border border-white/5 text-center font-bold text-emerald-400">{formatNumber(dist.approvedApps)}</td>
                      <td className="p-1.5 border border-white/5 text-center font-bold text-emerald-300">{formatNumber(dist.approvedGovinda)}</td>
                      <td className="p-1.5 border border-white/5 text-center text-amber-400">{formatNumber(dist.pendingApps)}</td>
                      <td className="p-1.5 border border-white/5 text-center text-amber-300">{formatNumber(dist.pendingGovinda)}</td>
                      <td className="p-1.5 border border-white/5 text-center font-bold text-white">{formatNumber(dist.totalGovinda)}</td>
                    </tr>
                  ))}
                </tbody>
                
                <tfoot>
                  <tr className="bg-amber-500/10 border-t-2 border-amber-500/50 font-black text-[11px] font-mono">
                    <td className="p-2 border border-white/10 text-amber-300 uppercase tracking-wide font-sans">
                      🚩 एकूण (GRAND TOTAL)
                    </td>
                    <td className="p-2 border border-white/10 text-center text-emerald-400 text-xs font-bold">
                      {formatNumber(districtSummary.reduce((sum, d) => sum + d.approvedApps, 0))}
                    </td>
                    <td className="p-2 border border-white/10 text-center text-emerald-300 text-xs font-bold">
                      {formatNumber(districtSummary.reduce((sum, d) => sum + d.approvedGovinda, 0))}
                    </td>
                    <td className="p-2 border border-white/10 text-center text-amber-400 text-xs font-bold">
                      {formatNumber(districtSummary.reduce((sum, d) => sum + d.pendingApps, 0))}
                    </td>
                    <td className="p-2 border border-white/10 text-center text-amber-300 text-xs font-bold">
                      {formatNumber(districtSummary.reduce((sum, d) => sum + d.pendingGovinda, 0))}
                    </td>
                    <td className="p-2 border border-white/10 text-center text-white text-xs font-bold">
                      {formatNumber(districtSummary.reduce((sum, d) => sum + d.totalGovinda, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

          </div>
        )}
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
          {/* 📱 MOBILE VIEW CARDS */}
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

          {/* 💻 DESKTOP & PRINTABLE SECTION */}
          <div className="hidden md:block print-area rounded-2xl overflow-hidden border border-amber-500/20 shadow-2xl p-4 bg-[#0c0d14] text-white">
            
            <div className="mb-4 pb-3 border-b border-gray-600 flex justify-between items-center">
              <div>
                <h1 className="text-base font-black text-amber-400 uppercase tracking-wide">
                  MAHARASHTRA RAJYA DAHIHANDI GOVINDA ASSOCIATION
                </h1>
                <h2 className="text-xs sm:text-sm font-bold text-white mt-0.5">
                  🛡️ गोविंदा विमा अहवाल (Insurance Report 2026)
                </h2>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  अधिकृत विमा अर्ज यादी | दिनांक: {new Date().toLocaleDateString('mr-IN')} | स्टेटस: <b className="text-amber-400">{statusFilter}</b>
                </p>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-bold bg-amber-500/20 px-2.5 py-1 rounded border border-amber-500/30 text-amber-300">
                  एकूण गोविंदा: {formatNumber(totalGovindaCount)} ({totalCount} मंडळे)
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-black/80 border-b border-amber-500/30 text-amber-400 font-extrabold uppercase text-[10px]">
                    <th className="p-2 border border-white/10 text-center w-8">अ.क्र.</th>
                    <th className="p-2 border border-white/10 w-24">App ID</th>
                    <th className="p-2 border border-white/10">मंडळाचे नाव</th>
                    <th className="p-2 border border-white/10">जिल्हा</th>
                    <th className="p-2 border border-white/10">संपर्क व्यक्ती</th>
                    <th className="p-2 border border-white/10 text-center w-14">गोविंदा</th>
                    <th className="p-2 border border-white/10 text-center w-12">थर</th>
                    <th className="p-2 border border-white/10 text-center no-print w-16">लेटरहेड</th>
                    <th className="p-2 border border-white/10 text-center w-20">स्टेटस</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {filteredData.map((item, idx) => {
                    const phone = item.whatsappNumber || item.phone || '';
                    const isApproved = (item.status || '').includes('Approved') || (item.status || '').includes('मंजूर');
                    const isRejected = (item.status || '').includes('Rejected') || (item.status || '').includes('नामंजूर') || (item.status || '').includes('नाकारलेले');

                    return (
                      <tr key={item.id || idx} className="hover:bg-white/5 transition">
                        <td className="p-2 border border-white/5 text-gray-400 font-mono text-center">{idx + 1}</td>
                        <td className="p-2 border border-white/5 font-mono font-bold text-amber-400 whitespace-nowrap">{item.appId || item.id}</td>
                        <td className="p-2 border border-white/5 font-bold text-white">{toTitleCase(item.teamName)}</td>
                        <td className="p-2 border border-white/5 text-gray-300">{toTitleCase(item.district)}</td>
                        
                        <td className="p-2 border border-white/5">
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

                        <td className="p-2 border border-white/5 text-center font-mono font-bold text-amber-300">{formatNumber(item.govindaCount)}</td>
                        <td className="p-2 border border-white/5 text-center text-gray-300 font-mono">{item.pyramidCapacity || '-'}</td>
                        
                        <td className="p-2 border border-white/5 text-center no-print">
                          {item.fileUrl ? (
                            <a href={item.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] text-amber-400 hover:underline">
                              <ExternalLink className="w-3 h-3" /> पाहा
                            </a>
                          ) : <span className="text-gray-500 text-[10px]">-</span>}
                        </td>

                        <td className="p-2 border border-white/5 text-center">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold border uppercase ${
                            isApproved ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 status-approved-print' :
                            isRejected ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 status-rejected-print' :
                            'bg-amber-500/10 text-amber-400 border-amber-500/30 status-pending-print'
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