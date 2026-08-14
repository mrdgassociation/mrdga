// ==========================================
// #SECTION: COMPETITION REPORT TAB
// ==========================================
import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { 
  FileSpreadsheet, Printer, Search, BarChart3, 
  MapPin, Phone, MessageSquare, User, Users
} from 'lucide-react';

export default function CompetitionReportTab({ 
  teams = [], competitions = [], competitionFilter, setCompetitionFilter, 
  canExportAndPrint, selectedCompTitle 
}) {
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

  const uniqueDistricts = Array.from(new Set(teams.map(t => t.district).filter(Boolean)));
  const uniqueCategories = Array.from(new Set(teams.map(t => t.category).filter(Boolean)));

  const duplicateMap = useMemo(() => {
    const dupMap = new Map();
    const cleanStr = (str) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    const cleanPhone = (ph) => (ph || '').replace(/[^0-9]/g, '').slice(-10);

    const nameCounts = new Map();
    const phoneCounts = new Map();

    teams.forEach(t => {
      const cName = cleanStr(t.teamName);
      const cPhone = cleanPhone(t.captain?.phone || t.contact1?.phone);
      if (cName && cName.length > 3) nameCounts.set(cName, (nameCounts.get(cName) || 0) + 1);
      if (cPhone && cPhone.length === 10) phoneCounts.set(cPhone, (phoneCounts.get(cPhone) || 0) + 1);
    });

    teams.forEach(t => {
      const cName = cleanStr(t.teamName);
      const cPhone = cleanPhone(t.captain?.phone || t.contact1?.phone);

      const isNameDup = cName && nameCounts.get(cName) > 1;
      const isPhoneDup = cPhone && phoneCounts.get(cPhone) > 1;

      if (isNameDup || isPhoneDup) {
        let reason = '';
        if (isNameDup && isPhoneDup) reason = 'नाव व मोबाईल समान (Name & Phone Match)';
        else if (isNameDup) reason = 'समान मंडळ नाव (Name Match)';
        else reason = `समान मोबाईल (${cPhone})`;

        dupMap.set(t.registrationId, reason);
      }
    });

    return dupMap;
  }, [teams]);

  const filteredTeams = teams.filter(team => {
    const teamName = team.teamName || '';
    const regId = team.registrationId || '';
    const district = team.district || '';
    const captainName = team.captain?.name || team.contact1?.name || '';
    const managerName = team.manager?.name || team.contact2?.name || '';

    const matchesSearch = 
      teamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      regId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      district.toLowerCase().includes(searchTerm.toLowerCase()) ||
      captainName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      managerName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || team.status === statusFilter;
    const matchesDistrict = districtFilter === 'ALL' || team.district === districtFilter;
    const matchesCategory = categoryFilter === 'ALL' || team.category === categoryFilter;
    const matchesComp = competitionFilter === 'ALL' || team.competitionId === competitionFilter;

    return matchesSearch && matchesStatus && matchesDistrict && matchesCategory && matchesComp;
  });

  const totalCount = filteredTeams.length;
  const approvedCount = filteredTeams.filter(t => t.status === 'Approved').length;
  const pendingCount = filteredTeams.filter(t => t.status === 'Pending' || !t.status).length;
  const rejectedCount = filteredTeams.filter(t => t.status === 'Rejected').length;

  const getTeamsByCategory = (catKey) => {
    if (catKey === 'OTHERS') {
      return filteredTeams.filter(t => !['M7', 'M6', 'W'].includes(t.category));
    }
    return filteredTeams.filter(t => t.category === catKey);
  };

  const handleExportToExcel = () => {
    if (filteredTeams.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'डेटा उपलब्ध नाही!',
        text: 'एक्सपोर्ट करण्यासाठी कोणत्याही नोंदी सापडल्या नाहीत.',
        background: '#0c0d14',
        color: '#fff'
      });
      return;
    }

    const excelData = filteredTeams.map((team, index) => {
      const comments = team.comments || [];
      const lastComment = comments.length > 0 ? comments[comments.length - 1] : null;
      const isDuplicate = duplicateMap.has(team.registrationId);
      const dupReason = duplicateMap.get(team.registrationId) || '-';

      return {
        'अ. क्र.': index + 1,
        'Reg ID': team.registrationId || '',
        'स्पर्धा ID': team.competitionId || '',
        'स्पर्धेचे नाव': team.competitionTitle || 'महाराष्ट्र राज्य दहीहंडी नोंदणी',
        'संघाचे नाव': toTitleCase(team.teamName || ''),
        'गट / प्रकार': team.category || '',
        'खेळाडू संख्या': team.playerCount || '',
        'जिल्हा': toTitleCase(team.district || ''),
        'विभाग / तालुका': toTitleCase(team.vibhag || ''),
        'पिनकोड': team.pincode || '',
        'संपर्क १ (कॅप्टन)': toTitleCase(team.captain?.name || team.contact1?.name || ''),
        'संपर्क १ फोन': team.captain?.phone || team.contact1?.phone || '',
        'संपर्क २ नाव': toTitleCase(team.manager?.name || team.contact2?.name || ''),
        'संपर्क २ फोन': team.manager?.phone || team.contact2?.phone || '',
        'ईमेल': team.email || '',
        'एकूण रिमार्क्स संख्या': comments.length,
        'शेवटचा रिमार्क / अपडेट': lastComment ? lastComment.text : 'अद्याप कॉल/रिमार्क नाही',
        'रिमार्क देणारा अधिकारी': lastComment ? `${lastComment.byName || lastComment.name || ''} (${lastComment.role || ''})` : '-',
        'रिमार्क दिनांक व वेळ': lastComment && lastComment.createdAt ? new Date(lastComment.createdAt).toLocaleString('mr-IN') : '-',
        'दुबार नोंदणी शक्यता?': isDuplicate ? 'होय (Yes)' : 'नाही (No)',
        'दुबार असण्याचे कारण': isDuplicate ? dupReason : '-',
        'नोंदणी दिनांक': team.createdAt ? new Date(team.createdAt).toLocaleDateString('mr-IN') : '',
        'स्टेटस': team.status || 'Pending'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "MRDGA_Report");
    const compNameText = competitionFilter === 'ALL' ? 'All_Competitions' : competitionFilter;
    XLSX.writeFile(workbook, `MRDGA_Report_${compNameText}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    const cleanCompName = (selectedCompTitle || 'Report').replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, "_");
    document.title = `MRDGA_Report_${cleanCompName}_${new Date().toISOString().slice(0, 10)}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  return (
    <div className="space-y-3.5 font-sans">
      
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

      {/* Header & Compact Icon Buttons Bar */}
      <div className="no-print flex justify-between items-center bg-black/50 border border-amber-500/20 p-2.5 sm:p-3 rounded-2xl backdrop-blur-md gap-2 shadow-xl">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl shrink-0">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs sm:text-base font-black text-white leading-tight">
              MRDGA <span className="text-amber-400">रिपोर्ट्स व एक्सपोर्ट</span>
            </h2>
            <p className="text-[9px] text-gray-400">स्पर्धानुसार अहवाल, PDF व Excel रिपोर्ट</p>
          </div>
        </div>

        {/* 🎯 कॉम्पॅक्ट आयकॉन बटन्स */}
        {canExportAndPrint && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleExportToExcel}
              className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md transition cursor-pointer"
              title="Excel डाउनलोड करा"
            >
              <FileSpreadsheet className="w-4 h-4" />
            </button>
            <button
              onClick={handlePrint}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl shadow-md transition cursor-pointer"
              title="PDF / प्रिंट काढा"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* STATS CARDS */}
      <div className="no-print grid grid-cols-4 gap-1.5 sm:gap-3">
        <div className="bg-black/40 border border-amber-500/20 p-1.5 sm:p-2.5 rounded-xl flex flex-col items-center justify-center text-center">
          <p className="text-[8px] sm:text-[10px] text-gray-400 font-bold uppercase truncate w-full">एकूण अर्जे</p>
          <p className="text-sm sm:text-base font-black text-white mt-0.5">{totalCount}</p>
        </div>

        <div className="bg-black/40 border border-emerald-500/20 p-1.5 sm:p-2.5 rounded-xl flex flex-col items-center justify-center text-center">
          <p className="text-[8px] sm:text-[10px] text-emerald-400/80 font-bold uppercase truncate w-full">मंजूर</p>
          <p className="text-sm sm:text-base font-black text-emerald-400 mt-0.5">{approvedCount}</p>
        </div>

        <div className="bg-black/40 border border-amber-500/20 p-1.5 sm:p-2.5 rounded-xl flex flex-col items-center justify-center text-center">
          <p className="text-[8px] sm:text-[10px] text-amber-400/80 font-bold uppercase truncate w-full">प्रलंबित</p>
          <p className="text-sm sm:text-base font-black text-amber-400 mt-0.5">{pendingCount}</p>
        </div>

        <div className="bg-black/40 border border-rose-500/20 p-1.5 sm:p-2.5 rounded-xl flex flex-col items-center justify-center text-center">
          <p className="text-[8px] sm:text-[10px] text-rose-400/80 font-bold uppercase truncate w-full">नाकारलेले</p>
          <p className="text-sm sm:text-base font-black text-rose-400 mt-0.5">{rejectedCount}</p>
        </div>
      </div>

      {/* MULTI-COLUMN FILTERS */}
      <div className="no-print bg-black/50 border border-white/10 p-2.5 rounded-2xl space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-amber-400/60" />
          <input
            type="text"
            placeholder="संघाचे नाव, संपर्क व्यक्ती किंवा Reg ID ने शोधा..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/60 border border-amber-500/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400/50"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          <select
            value={competitionFilter}
            onChange={(e) => setCompetitionFilter(e.target.value)}
            className="bg-black/60 border border-amber-500/20 rounded-xl px-2 py-1.5 text-[11px] text-amber-400 font-bold focus:outline-none"
          >
            <option value="ALL" className="bg-[#0c0d14] text-white">सर्व स्पर्धा (All)</option>
            {competitions.map(comp => (
              <option key={comp.competitionId || comp.id} value={comp.competitionId || comp.id} className="bg-[#0c0d14] text-white">
                {comp.title || comp.competitionId}
              </option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-black/60 border border-amber-500/10 rounded-xl px-2 py-1.5 text-[11px] text-white focus:outline-none"
          >
            <option value="ALL" className="bg-[#0c0d14]">सर्व गट / वर्ग</option>
            <option value="M7" className="bg-[#0c0d14]">पुरुष ७ थर (M7)</option>
            <option value="M6" className="bg-[#0c0d14]">पुरुष ६ थर (M6)</option>
            <option value="W" className="bg-[#0c0d14]">महिला पथक (W)</option>
            {uniqueCategories.filter(c => !['M7', 'M6', 'W'].includes(c)).map(cat => (
              <option key={cat} value={cat} className="bg-[#0c0d14]">{cat}</option>
            ))}
          </select>

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

      {filteredTeams.length === 0 ? (
        <p className="p-8 text-center text-gray-400 text-xs font-medium">कोणतीही नोंदणी सापडली नाही.</p>
      ) : (
        <>
          {/* 📱 MOBILE VIEW CARDS (No Horizontal Scroll, Numbers Hidden on Screen) */}
          <div className="no-print grid grid-cols-1 md:hidden gap-3">
            {filteredTeams.map((team, idx) => {
              const rawC1Name = team.captain?.name || team.contact1?.name || 'संपर्क १ नाही';
              const c1Name = toTitleCase(rawC1Name);
              const c1Phone = team.captain?.phone || team.contact1?.phone || '';

              const rawC2Name = team.manager?.name || team.contact2?.name || '';
              const c2Name = toTitleCase(rawC2Name);
              const c2Phone = team.manager?.phone || team.contact2?.phone || '';

              return (
                <div key={team.registrationId || idx} className="p-3.5 rounded-2xl border border-amber-500/20 bg-black/40 space-y-2.5 shadow-md">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        #{team.registrationId}
                      </span>
                      <h3 className="font-bold text-sm text-white mt-1 leading-tight">{toTitleCase(team.teamName)}</h3>
                      <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-amber-400" /> {toTitleCase(team.district) || 'जिल्हा N/A'} | <b className="text-amber-400">{team.category || '-'}</b>
                      </p>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wider ${
                      team.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                      team.status === 'Rejected' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
                      'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    }`}>
                      {team.status || 'Pending'}
                    </span>
                  </div>

                  <div className="bg-black/50 p-2.5 rounded-xl border border-white/5 space-y-2 text-xs">
                    {/* संपर्क १ (कॅप्टन) */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <User className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="text-gray-200 font-semibold truncate text-[11px]">{c1Name} <span className="text-[9px] text-gray-500">(कॅप्टन)</span></span>
                      </div>
                      {c1Phone && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <a href={`https://wa.me/91${c1Phone}`} target="_blank" rel="noreferrer" className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30" title="WhatsApp करा"><MessageSquare className="w-3.5 h-3.5" /></a>
                          <a href={`tel:${c1Phone}`} className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30" title="कॉल करा"><Phone className="w-3.5 h-3.5" /></a>
                        </div>
                      )}
                    </div>

                    {/* संपर्क २ (मॅनेजर) */}
                    {c2Name && (
                      <div className="flex items-center justify-between pt-1.5 border-t border-white/5">
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          <User className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span className="text-gray-200 font-semibold truncate text-[11px]">{c2Name} <span className="text-[9px] text-gray-500">(मॅनेजर)</span></span>
                        </div>
                        {c2Phone && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <a href={`https://wa.me/91${c2Phone}`} target="_blank" rel="noreferrer" className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30" title="WhatsApp करा"><MessageSquare className="w-3.5 h-3.5" /></a>
                            <a href={`tel:${c2Phone}`} className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30" title="कॉल करा"><Phone className="w-3.5 h-3.5" /></a>
                          </div>
                        )}
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
                  🏆 {selectedCompTitle}
                </h2>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  अधिकृत नोंदणीकृत पथकांची यादी | दिनांक: {new Date().toLocaleDateString('mr-IN')}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-bold bg-amber-500/20 px-2.5 py-1 rounded border border-amber-500/30 text-amber-300">
                  एकूण पथके: {filteredTeams.length}
                </span>
              </div>
            </div>

            {/* 🤼 CATEGORY 1: M7 (पुरुष ७ थर) */}
            {getTeamsByCategory('M7').length > 0 && (
              <div className="mb-6 space-y-2">
                <div className="bg-amber-500/20 border-l-4 border-amber-500 p-2 rounded-r-lg text-amber-300 font-extrabold text-xs">
                  🏆 पुरुष ७ थर (M7) - एकूण: {getTeamsByCategory('M7').length}
                </div>
                <CategoryTable teamsList={getTeamsByCategory('M7')} toTitleCase={toTitleCase} />
              </div>
            )}

            {/* 🤼 CATEGORY 2: M6 (पुरुष ६ थर) */}
            {getTeamsByCategory('M6').length > 0 && (
              <div className="mb-6 space-y-2 print-page-break">
                <div className="hidden print:block mb-3 pb-2 border-b border-gray-400">
                  <h1 className="text-sm font-black text-black uppercase">MAHARASHTRA RAJYA DAHIHANDI GOVINDA ASSOCIATION</h1>
                  <h2 className="text-xs font-bold text-black">🏆 {selectedCompTitle}</h2>
                </div>
                <div className="bg-amber-500/20 border-l-4 border-amber-500 p-2 rounded-r-lg text-amber-300 font-extrabold text-xs">
                  🏆 पुरुष ६ थर (M6) - एकूण: {getTeamsByCategory('M6').length}
                </div>
                <CategoryTable teamsList={getTeamsByCategory('M6')} toTitleCase={toTitleCase} />
              </div>
            )}

            {/* 🤼 CATEGORY 3: WOMEN (महिला पथक) */}
            {getTeamsByCategory('W').length > 0 && (
              <div className="mb-6 space-y-2 print-page-break">
                <div className="hidden print:block mb-3 pb-2 border-b border-gray-400">
                  <h1 className="text-sm font-black text-black uppercase">MAHARASHTRA RAJYA DAHIHANDI GOVINDA ASSOCIATION</h1>
                  <h2 className="text-xs font-bold text-black">🏆 {selectedCompTitle}</h2>
                </div>
                <div className="bg-amber-500/20 border-l-4 border-amber-500 p-2 rounded-r-lg text-amber-300 font-extrabold text-xs">
                  🏆 महिला पथक (Women's) - एकूण: {getTeamsByCategory('W').length}
                </div>
                <CategoryTable teamsList={getTeamsByCategory('W')} toTitleCase={toTitleCase} />
              </div>
            )}

            {/* 🤼 OTHER CATEGORIES */}
            {getTeamsByCategory('OTHERS').length > 0 && (
              <div className="mb-6 space-y-2 print-page-break">
                <div className="hidden print:block mb-3 pb-2 border-b border-gray-400">
                  <h1 className="text-sm font-black text-black uppercase">MAHARASHTRA RAJYA DAHIHANDI GOVINDA ASSOCIATION</h1>
                  <h2 className="text-xs font-bold text-black">🏆 {selectedCompTitle}</h2>
                </div>
                <div className="bg-amber-500/20 border-l-4 border-amber-500 p-2 rounded-r-lg text-amber-300 font-extrabold text-xs">
                  🏆 इतर गट (Other Categories) - एकूण: {getTeamsByCategory('OTHERS').length}
                </div>
                <CategoryTable teamsList={getTeamsByCategory('OTHERS')} toTitleCase={toTitleCase} />
              </div>
            )}

          </div>
        </>
      )}

    </div>
  );
}

// 🖨️ Reusable Category Table (Number printed on PDF, Hidden on Screen)
function CategoryTable({ teamsList, toTitleCase }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="bg-black/80 border-b border-amber-500/30 text-amber-400 font-extrabold uppercase text-[10px]">
            <th className="p-2 border border-white/10 text-center">अ.क्र.</th>
            <th className="p-2 border border-white/10">Reg ID</th>
            <th className="p-2 border border-white/10">संघाचे नाव</th>
            <th className="p-2 border border-white/10 text-center">खेळाडू</th>
            <th className="p-2 border border-white/10">जिल्हा / विभाग</th>
            <th className="p-2 border border-white/10">संपर्क १ (कॅप्टन)</th>
            <th className="p-2 border border-white/10">संपर्क २ (मॅनेजर)</th>
            <th className="p-2 border border-white/10 text-center">स्टेटस</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {teamsList.map((team, idx) => {
            const c1Phone = team.captain?.phone || team.contact1?.phone || '';
            const c2Phone = team.manager?.phone || team.contact2?.phone || '';

            return (
              <tr key={team.registrationId || idx} className="hover:bg-white/5 transition">
                <td className="p-2 border border-white/5 text-gray-400 font-mono text-center">{idx + 1}</td>
                <td className="p-2 border border-white/5 font-mono font-bold text-amber-400">{team.registrationId}</td>
                <td className="p-2 border border-white/5 font-bold text-white">{toTitleCase(team.teamName)}</td>
                <td className="p-2 border border-white/5 text-gray-300 text-center font-bold">{team.playerCount || '-'}</td>
                <td className="p-2 border border-white/5 text-gray-300">{toTitleCase(team.district)}, <span className="text-[10px] text-gray-400">{toTitleCase(team.vibhag)}</span></td>
                
                {/* 🎯 संपर्क १: स्क्रीनवर नंबर लपलेला, PDF मध्ये 📞 सह प्रिंट होईल */}
                <td className="p-2 border border-white/5">
                  <div className="flex items-center justify-between gap-1">
                    <div>
                      <p className="font-semibold text-gray-200">{toTitleCase(team.captain?.name || team.contact1?.name || '-')}</p>
                      {c1Phone && (
                        <p className="hidden print:block text-[10px] text-black font-mono font-bold mt-0.5">
                          📞 {c1Phone}
                        </p>
                      )}
                    </div>
                    {c1Phone && (
                      <div className="no-print flex items-center gap-1 shrink-0">
                        <a href={`https://wa.me/91${c1Phone}`} target="_blank" rel="noreferrer" className="p-1 bg-emerald-500/20 text-emerald-400 rounded" title="WhatsApp करा"><MessageSquare className="w-3 h-3" /></a>
                        <a href={`tel:${c1Phone}`} className="p-1 bg-blue-500/20 text-blue-400 rounded" title="कॉल करा"><Phone className="w-3 h-3" /></a>
                      </div>
                    )}
                  </div>
                </td>

                {/* 🎯 संपर्क २: स्क्रीनवर नंबर लपलेला, PDF मध्ये 📞 सह प्रिंट होईल */}
                <td className="p-2 border border-white/5">
                  <div className="flex items-center justify-between gap-1">
                    <div>
                      <p className="font-semibold text-gray-200">{toTitleCase(team.manager?.name || team.contact2?.name || '-')}</p>
                      {c2Phone && (
                        <p className="hidden print:block text-[10px] text-black font-mono font-bold mt-0.5">
                          📞 {c2Phone}
                        </p>
                      )}
                    </div>
                    {c2Phone && (
                      <div className="no-print flex items-center gap-1 shrink-0">
                        <a href={`https://wa.me/91${c2Phone}`} target="_blank" rel="noreferrer" className="p-1 bg-emerald-500/20 text-emerald-400 rounded" title="WhatsApp करा"><MessageSquare className="w-3 h-3" /></a>
                        <a href={`tel:${c2Phone}`} className="p-1 bg-blue-500/20 text-blue-400 rounded" title="कॉल करा"><Phone className="w-3 h-3" /></a>
                      </div>
                    )}
                  </div>
                </td>

                <td className="p-2 border border-white/5 text-center">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold border uppercase ${
                    team.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                    team.status === 'Rejected' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
                    'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  }`}>
                    {team.status || 'Pending'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}