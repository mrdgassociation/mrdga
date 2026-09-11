import React, { useMemo } from 'react';
import { X, Printer, Download, Shirt } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function TshirtReportModal({ isOpen, onClose, applications = [] }) {
  if (!isOpen) return null;

  // -------------------------------------------------------------
  // 🎯 1. सदस्यांची यादी A to Z क्रमाने सॉर्ट करणे (Alphabetical Sort)
  // -------------------------------------------------------------
  const sortedApplications = useMemo(() => {
    return [...applications].sort((a, b) => {
      const nameA = (a.fullNameAsPassport || a.fullName || '').trim().toLowerCase();
      const nameB = (b.fullNameAsPassport || b.fullName || '').trim().toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [applications]);

  // -------------------------------------------------------------
  // 🎯 2. डायनॅमिक किट समरी (NOT SET वगळून अचूक मोजणी)
  // -------------------------------------------------------------
  const summary = useMemo(() => {
    const tshirtSizes = {};
    const shortsSizes = {};
    const trackpantSizes = {};
    const jacketSizes = {};

    let maleCount = 0;
    let femaleCount = 0;
    let totalWithMeasurements = 0;

    sortedApplications.forEach(app => {
      const tSize = (app.tshirtSize || '').trim().toUpperCase();
      const sSize = (app.shortsSize || '').trim().toUpperCase();
      const trkWaist = (app.trackpantWaist || '').trim();
      const trkLen = (app.trackpantLength || '').trim();
      const jSize = (app.jacketSize || '').trim().toUpperCase();

      // जर कोणतीही एक साईज भरली असेल तरच मोजणे
      const hasAnySize = tSize || sSize || trkWaist || trkLen || jSize;

      if (tSize) {
        tshirtSizes[tSize] = (tshirtSizes[tSize] || 0) + 1;
      }
      if (sSize) {
        shortsSizes[sSize] = (shortsSizes[sSize] || 0) + 1;
      }
      if (trkWaist || trkLen) {
        const trkKey = `W:${trkWaist || '-'} | L:${trkLen || '-'}`;
        trackpantSizes[trkKey] = (trackpantSizes[trkKey] || 0) + 1;
      }
      if (jSize) {
        jacketSizes[jSize] = (jacketSizes[jSize] || 0) + 1;
      }

      if (hasAnySize) {
        totalWithMeasurements++;
        const gender = (app.gender || '').trim().toLowerCase();
        if (gender === 'female' || gender === 'f' || gender === 'महिला') {
          femaleCount++;
        } else {
          maleCount++;
        }
      }
    });

    return {
      totalMembers: sortedApplications.length,
      totalWithMeasurements,
      maleCount,
      femaleCount,
      tshirtSizes,
      shortsSizes,
      trackpantSizes,
      jacketSizes
    };
  }, [sortedApplications]);

  // -------------------------------------------------------------
  // 🎯 3. अधिकृत Excel (.XLSX) जनरेशन (A-Z Sorted & No NOT SET)
  // -------------------------------------------------------------
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // 📄 SHEET 1: A to Z सॉर्ट केलेली सदस्यांची यादी
    const memberRows = sortedApplications.map((item, idx) => ({
      "Sr No": idx + 1,
      "Member ID": item.memberId || '',
      "Full Name": item.fullNameAsPassport || item.fullName || '',
      "Gender": item.gender || 'Male',
      "T-Shirt Size": item.tshirtSize || '-',
      "Shorts Size": item.shortsSize || '-',
      "Track Waist": item.trackpantWaist || '-',
      "Track Length": item.trackpantLength || '-',
      "Jacket Size": item.jacketSize || '-',
      "Mobile No": item.applicantContactNo || item.contactNo || '',
      "Group": item.groupName || 'MRDGA Members'
    }));
    const wsMembers = XLSX.utils.json_to_sheet(memberRows);
    XLSX.utils.book_append_sheet(wb, wsMembers, "Alphabetical Kit List");

    // 📄 SHEET 2: मॅन्युफॅक्चरिंग समरी (फक्त भरलेल्या साईज)
    const summaryRows = [
      { "Category": "OVERALL SUMMARY", "Measurement": "---", "Total Quantity": "---" },
      { "Category": "Total Submissions", "Measurement": "With Sizes", "Total Quantity": summary.totalWithMeasurements },
      { "Category": "Male Members", "Measurement": "Male", "Total Quantity": summary.maleCount },
      { "Category": "Female Members", "Measurement": "Female", "Total Quantity": summary.femaleCount },
      { "Category": "", "Measurement": "", "Total Quantity": "" }
    ];

    if (Object.keys(summary.tshirtSizes).length > 0) {
      summaryRows.push({ "Category": "👕 T-SHIRT", "Measurement": "---", "Total Quantity": "---" });
      Object.entries(summary.tshirtSizes).forEach(([size, count]) => {
        summaryRows.push({ "Category": "T-Shirt", "Measurement": size, "Total Quantity": count });
      });
      summaryRows.push({ "Category": "", "Measurement": "", "Total Quantity": "" });
    }

    if (Object.keys(summary.shortsSizes).length > 0) {
      summaryRows.push({ "Category": "🩳 SHORTS", "Measurement": "---", "Total Quantity": "---" });
      Object.entries(summary.shortsSizes).forEach(([size, count]) => {
        summaryRows.push({ "Category": "Shorts", "Measurement": size, "Total Quantity": count });
      });
      summaryRows.push({ "Category": "", "Measurement": "", "Total Quantity": "" });
    }

    if (Object.keys(summary.trackpantSizes).length > 0) {
      summaryRows.push({ "Category": "👖 TRACKPANT", "Measurement": "---", "Total Quantity": "---" });
      Object.entries(summary.trackpantSizes).forEach(([size, count]) => {
        summaryRows.push({ "Category": "Trackpant", "Measurement": size, "Total Quantity": count });
      });
      summaryRows.push({ "Category": "", "Measurement": "", "Total Quantity": "" });
    }

    if (Object.keys(summary.jacketSizes).length > 0) {
      summaryRows.push({ "Category": "🧥 JACKET", "Measurement": "---", "Total Quantity": "---" });
      Object.entries(summary.jacketSizes).forEach(([size, count]) => {
        summaryRows.push({ "Category": "Jacket", "Measurement": size, "Total Quantity": count });
      });
    }

    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Kit Summary");

    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Spain_Tour_2026_Kit_Report_${dateStr}.xlsx`);
  };

  // -------------------------------------------------------------
  // 🎯 4. प्रिंट / PDF फंक्शन (A4 Landscape, A-Z Order)
  // -------------------------------------------------------------
  const handlePrintPdf = () => {
    const printWindow = window.open('', '_blank');

    const renderSummaryCards = (title, sizesObj) => {
      const entries = Object.entries(sizesObj);
      if (entries.length === 0) return '';

      return `
        <div style="margin-bottom: 8px;">
          <span style="font-size: 11px; font-weight: bold; color: #0f172a; text-transform: uppercase;">${title}</span>
          <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 3px;">
            ${entries.map(([s, c]) => `
              <div style="border: 1px solid #cbd5e1; padding: 3px 8px; border-radius: 4px; text-align: center; background: #f8fafc; font-size: 10px;">
                <b>${s}</b>: <span style="color: #b45309; font-weight: bold;">${c}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    };

    const rowsHtml = sortedApplications.map((item, idx) => `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 10px; font-family: monospace;">
        <td style="padding: 4px; text-align: center;">${idx + 1}</td>
        <td style="padding: 4px; font-weight: bold; font-family: sans-serif; text-transform: uppercase;">${item.fullNameAsPassport || item.fullName || '-'}</td>
        <td style="padding: 4px; text-align: center;">${item.gender ? item.gender[0] : 'M'}</td>
        <td style="padding: 4px; text-align: center; font-weight: bold; color: #b45309;">${item.tshirtSize || '-'}</td>
        <td style="padding: 4px; text-align: center; font-weight: bold;">${item.shortsSize || '-'}</td>
        <td style="padding: 4px; text-align: center;">${item.trackpantWaist || item.trackpantLength ? `W:${item.trackpantWaist || '-'}/L:${item.trackpantLength || '-'}` : '-'}</td>
        <td style="padding: 4px; text-align: center; font-weight: bold;">${item.jacketSize || '-'}</td>
        <td style="padding: 4px;">${item.applicantContactNo || item.contactNo || '-'}</td>
        <td style="padding: 4px; font-family: sans-serif;">${item.groupName || 'MRDGA'}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Spain Tour 2026 - Kit Production Report</title>
          <style>
            @page { size: A4 landscape; margin: 8mm; }
            body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 0; padding: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #0f172a; color: #fff; padding: 5px; font-size: 10px; text-align: left; }
          </style>
        </head>
        <body>
          <div style="border-bottom: 2px solid #f59e0b; padding-bottom: 5px; margin-bottom: 8px;">
            <h2 style="margin: 0; text-transform: uppercase; font-size: 15px;">MRDGA SPAIN TOUR 2026 — KIT PRODUCTION REPORT (A to Z)</h2>
            <p style="margin: 2px 0 0; font-size: 10px; color: #64748b;">
              Submitted Kits: <b>${summary.totalWithMeasurements}</b> of ${summary.totalMembers} | Male: <b>${summary.maleCount}</b> | Female: <b>${summary.femaleCount}</b> | Date: ${new Date().toLocaleDateString('mr-IN')}
            </p>
          </div>

          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; background: #fff; border: 1px solid #e2e8f0; padding: 8px; border-radius: 6px;">
            ${renderSummaryCards("👕 T-Shirt Sizes", summary.tshirtSizes)}
            ${renderSummaryCards("🩳 Shorts Sizes", summary.shortsSizes)}
            ${renderSummaryCards("👖 Trackpants", summary.trackpantSizes)}
            ${renderSummaryCards("🧥 Jackets", summary.jacketSizes)}
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 25px; text-align: center;">#</th>
                <th>Full Name (Alphabetical)</th>
                <th style="text-align: center; width: 35px;">Gen</th>
                <th style="text-align: center; width: 60px;">T-Shirt</th>
                <th style="text-align: center; width: 60px;">Shorts</th>
                <th style="text-align: center; width: 100px;">Trackpant</th>
                <th style="text-align: center; width: 60px;">Jacket</th>
                <th>Mobile</th>
                <th>Group</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 500);
  };

  const renderChips = (title, sizesObj) => {
    const entries = Object.entries(sizesObj);
    return (
      <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
        <span className="text-[10px] font-bold text-amber-400 uppercase block">{title}</span>
        {entries.length === 0 ? (
          <span className="text-[10px] text-slate-500 italic">माहिती उपलब्ध नाही</span>
        ) : (
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
            {entries.map(([size, count]) => (
              <div key={size} className="px-2 py-1 bg-slate-900 border border-slate-800 rounded text-center min-w-[45px]">
                <span className="text-[10px] font-bold text-white block truncate">{size}</span>
                <span className="text-[10px] font-mono text-amber-400 block font-bold">{count} pcs</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 font-sans overflow-y-auto">
      <div className="bg-slate-900 border border-amber-500/40 rounded-2xl w-full max-w-5xl p-4 sm:p-5 space-y-3.5 shadow-2xl my-6">
        
        {/* MODAL HEADER */}
        <div className="flex justify-between items-start border-b border-slate-800 pb-3">
          <div>
            <span className="text-[10px] font-mono text-amber-400 uppercase font-bold flex items-center gap-1">
              <Shirt className="w-3.5 h-3.5" /> Full Kit Production & Vendor Orders
            </span>
            <h3 className="font-bold text-base text-white uppercase mt-0.5">Tour Kit Production Report</h3>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintPdf}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" /> Print / PDF
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition shadow-sm"
            >
              <Download className="w-3.5 h-3.5" /> Export Excel (.xlsx)
            </button>
            <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg ml-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 📊 GENDER & TOTAL SUMMARY */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2 bg-slate-950 border border-slate-800 rounded-xl">
            <span className="text-[10px] text-slate-500 block uppercase">एकूण किट नोंदी</span>
            <b className="text-base text-amber-400 font-mono">
              {summary.totalWithMeasurements} <span className="text-[10px] text-slate-500">/ {summary.totalMembers}</span>
            </b>
          </div>
          <div className="p-2 bg-slate-950 border border-slate-800 rounded-xl">
            <span className="text-[10px] text-slate-500 block uppercase">Male (पुरुष)</span>
            <b className="text-base text-sky-400 font-mono">{summary.maleCount}</b>
          </div>
          <div className="p-2 bg-slate-950 border border-slate-800 rounded-xl">
            <span className="text-[10px] text-slate-500 block uppercase">Female (महिला)</span>
            <b className="text-base text-pink-400 font-mono">{summary.femaleCount}</b>
          </div>
        </div>

        {/* 👕 4 KIT SIZES SUMMARY CHIPS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
          {renderChips("👕 T-Shirt", summary.tshirtSizes)}
          {renderChips("🩳 Shorts", summary.shortsSizes)}
          {renderChips("👖 Trackpants", summary.trackpantSizes)}
          {renderChips("🧥 Jackets", summary.jacketSizes)}
        </div>

        {/* 📋 SCROLLABLE LIST PREVIEW (A to Z Sorted) */}
        <div className="border border-slate-800 rounded-xl overflow-hidden max-h-[260px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800 text-[11px]">
              <tr>
                <th className="p-2 text-center w-8">#</th>
                <th className="p-2">Full Name (A to Z)</th>
                <th className="p-2 text-center">Gen</th>
                <th className="p-2 text-center text-amber-400">T-Shirt</th>
                <th className="p-2 text-center">Shorts</th>
                <th className="p-2 text-center">Trackpant</th>
                <th className="p-2 text-center">Jacket</th>
                <th className="p-2">Mobile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/60 font-mono text-[11px]">
              {sortedApplications.map((item, idx) => (
                <tr key={item.id || idx} className="hover:bg-slate-800/40 transition">
                  <td className="p-2 text-center text-slate-500">{idx + 1}</td>
                  <td className="p-2 font-sans font-bold text-white uppercase">{item.fullNameAsPassport || item.fullName || '-'}</td>
                  <td className="p-2 text-center text-slate-300">{item.gender || 'Male'}</td>
                  <td className="p-2 text-center font-bold text-amber-400">{item.tshirtSize || '-'}</td>
                  <td className="p-2 text-center text-slate-200">{item.shortsSize || '-'}</td>
                  <td className="p-2 text-center text-slate-300 text-[10px]">
                    {item.trackpantWaist || item.trackpantLength ? `W:${item.trackpantWaist || '-'}|L:${item.trackpantLength || '-'}` : '-'}
                  </td>
                  <td className="p-2 text-center text-slate-200">{item.jacketSize || '-'}</td>
                  <td className="p-2 text-slate-300">{item.applicantContactNo || item.contactNo || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}