// ==========================================
// #SECTION 1: IMPORTS
// ==========================================
import React, { useState, useEffect, useRef } from 'react';
import { dataService } from '../services/dataService';
import { authService } from '../services/authService';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { 
  FileSpreadsheet, Printer, Search, BarChart3, 
  CheckCircle2, Clock, XCircle, MapPin, Users, Phone, MessageSquare, User
} from 'lucide-react';

export default function Reports() {
  // ==========================================
  // #SECTION 2: STATES
  // ==========================================
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [districtFilter, setDistrictFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [userRole, setUserRole] = useState('Reviewer');

  const printRef = useRef();

  // ==========================================
  // #SECTION 3: FETCH DATA
  // ==========================================
  const loadReportsData = async () => {
    setLoading(true);
    try {
      const data = await dataService.getAllTeams();
      setTeams(data);
    } catch (err) {
      console.error("Error loading reports data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = authService.getCurrentUser(async (user) => {
      if (user) {
        try {
          const userDoc = await authService.getUserRole(user.email);
          if (userDoc && userDoc.role) {
            setUserRole(userDoc.role);
          }
        } catch (e) {
          console.error("Role fetch error:", e);
        }
        loadReportsData();
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // ==========================================
  // #SECTION 4: EXPORT & PRINT HANDLERS
  // ==========================================
  const handlePrint = () => {
    window.print();
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

    const excelData = filteredTeams.map((team, index) => ({
      'अ. क्र.': index + 1,
      'Reg ID': team.registrationId || '',
      'संघाचे नाव': team.teamName || '',
      'गट / प्रकार': team.category || '',
      'खेळाडू संख्या': team.playerCount || '',
      'जिल्हा': team.district || '',
      'विभाग / तालुका': team.vibhag || '',
      'संपर्क १ (कॅप्टन)': team.captain?.name || team.contact1?.name || '',
      'संपर्क १ फोन': team.captain?.phone || team.contact1?.phone || '',
      'संपर्क २ नाव': team.manager?.name || team.contact2?.name || '',
      'संपर्क २ फोन': team.manager?.phone || team.contact2?.phone || '',
      'स्टेटस': team.status || 'Pending'
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "MRDGA_Report");

    XLSX.writeFile(workbook, `MRDGA_Teams_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // ==========================================
  // #SECTION 5: FILTER LOGIC & STATS
  // ==========================================
  const uniqueDistricts = Array.from(new Set(teams.map(t => t.district).filter(Boolean)));
  const uniqueCategories = Array.from(new Set(teams.map(t => t.category).filter(Boolean)));

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

    return matchesSearch && matchesStatus && matchesDistrict && matchesCategory;
  });

  const totalCount = teams.length;
  const approvedCount = teams.filter(t => t.status === 'Approved').length;
  const pendingCount = teams.filter(t => t.status === 'Pending' || !t.status).length;
  const rejectedCount = teams.filter(t => t.status === 'Rejected').length;

  return (
    <div className="space-y-3.5 max-w-7xl mx-auto px-1 py-1 font-sans">

{/* ========================================== */}
      {/* #SECTION 6: HEADER & 4-CARDS IN 1 ROW      */}
      {/* ========================================== */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-black/50 border border-amber-500/20 p-2.5 sm:p-3 rounded-2xl backdrop-blur-md gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl shrink-0">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs sm:text-base font-black text-white leading-tight">
              MRDGA <span className="text-amber-400">रिपोर्ट्स</span>
            </h2>
            <p className="text-[9px] text-gray-400">अहवाल व एक्सपोर्ट</p>
          </div>
        </div>

        {/* Action Buttons */}
        {['Super Admin', 'Admin'].includes(userRole) && (
          <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
            <button
              onClick={handleExportToExcel}
              className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1 transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
            </button>
            <button
              onClick={handlePrint}
              className="px-2.5 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1 transition"
            >
              <Printer className="w-3.5 h-3.5" /> Print / PDF
            </button>
          </div>
        )}
      </div>

      {/* 💡 4-CARDS IN 1 ROW FOR MOBILE (grid-cols-4) */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-3">
        {/* Card 1: Total */}
        <div className="bg-black/40 border border-amber-500/20 p-1.5 sm:p-2.5 rounded-xl flex flex-col items-center justify-center text-center">
          <p className="text-[8px] sm:text-[10px] text-gray-400 font-bold uppercase truncate w-full">एकूण</p>
          <p className="text-sm sm:text-base font-black text-white mt-0.5">{totalCount}</p>
        </div>

        {/* Card 2: Approved */}
        <div className="bg-black/40 border border-emerald-500/20 p-1.5 sm:p-2.5 rounded-xl flex flex-col items-center justify-center text-center">
          <p className="text-[8px] sm:text-[10px] text-emerald-400/80 font-bold uppercase truncate w-full">मंजूर</p>
          <p className="text-sm sm:text-base font-black text-emerald-400 mt-0.5">{approvedCount}</p>
        </div>

        {/* Card 3: Pending */}
        <div className="bg-black/40 border border-amber-500/20 p-1.5 sm:p-2.5 rounded-xl flex flex-col items-center justify-center text-center">
          <p className="text-[8px] sm:text-[10px] text-amber-400/80 font-bold uppercase truncate w-full">प्रलंबित</p>
          <p className="text-sm sm:text-base font-black text-amber-400 mt-0.5">{pendingCount}</p>
        </div>

        {/* Card 4: Rejected */}
        <div className="bg-black/40 border border-rose-500/20 p-1.5 sm:p-2.5 rounded-xl flex flex-col items-center justify-center text-center">
          <p className="text-[8px] sm:text-[10px] text-rose-400/80 font-bold uppercase truncate w-full">नाकारलेले</p>
          <p className="text-sm sm:text-base font-black text-rose-400 mt-0.5">{rejectedCount}</p>
        </div>
      </div>

      {/* ========================================== */}
      {/* #SECTION 7: MULTI-COLUMN COMPACT FILTERS   */}
      {/* ========================================== */}
      <div className="glass-panel p-2 rounded-2xl space-y-2">
        {/* Search Bar (Full Width) */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-amber-400/60" />
          <input
            type="text"
            placeholder="नाव, संपर्क किंवा Reg ID ने शोधा..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/60 border border-amber-500/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400/50"
          />
        </div>

        {/* 2 or 3 Filters per Row (Mobile Friendly Grid) */}
        <div className="grid grid-cols-2 sm:grid-cols-43 gap-1.5">
          {/* Status Filter */}
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

          {/* District Filter */}
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

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="col-span-2 sm:col-span-1 bg-black/60 border border-amber-500/10 rounded-xl px-2 py-1.5 text-[11px] text-white focus:outline-none"
          >
            <option value="ALL" className="bg-[#0c0d14]">सर्व गट / वर्ग</option>
            {uniqueCategories.map(cat => (
              <option key={cat} value={cat} className="bg-[#0c0d14]">{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ========================================== */}
      {/* #SECTION 8: MOBILE CARDS & DESKTOP TABLE   */}
      {/* ========================================== */}
      {loading ? (
        <p className="p-8 text-center text-amber-400 font-semibold text-xs animate-pulse">डेटा लोड होत आहे...</p>
      ) : filteredTeams.length === 0 ? (
        <p className="p-8 text-center text-gray-400 text-xs font-medium">कोणतीही नोंदणी सापडली नाही.</p>
      ) : (
        <>
          {/* 📱 MODERN MOBILE CARDS (फक्त मोबाईलवर दिसतील) */}
          <div className="grid grid-cols-1 md:hidden gap-3">
            {filteredTeams.map((team, idx) => {
              const c1Name = team.captain?.name || team.contact1?.name || 'संपर्क १ नाही';
              const c1Phone = team.captain?.phone || team.contact1?.phone || '';

              const c2Name = team.manager?.name || team.contact2?.name || '';
              const c2Phone = team.manager?.phone || team.contact2?.phone || '';

              return (
                <div 
                  key={team.registrationId || idx}
                  className="glass-panel p-3.5 rounded-2xl border border-amber-500/20 bg-black/40 space-y-2.5"
                >
                  {/* Reg ID, Name & Status */}
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        #{team.registrationId}
                      </span>
                      <h3 className="font-bold text-sm text-white mt-1 leading-tight">{team.teamName}</h3>
                      <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-amber-400" /> {team.district || 'जिल्हा N/A'} | <b className="text-amber-400">{team.category || '-'}</b>
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

                  {/* 2 Contacts Details Box with Direct Call & WhatsApp */}
                  <div className="bg-black/50 p-2.5 rounded-xl border border-white/5 space-y-2 text-xs">
                    
                    {/* Contact 1 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <User className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="text-gray-200 font-semibold truncate text-[11px]">{c1Name} <span className="text-[9px] text-gray-500">(कॅप्टन)</span></span>
                      </div>

                      {c1Phone && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <a
                            href={`https://wa.me/91${c1Phone}?text=नमस्कार ${encodeURIComponent(c1Name)}, ${encodeURIComponent(team.teamName)} संदर्भात...`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30 hover:bg-emerald-500 hover:text-black transition"
                            title="WhatsApp"
                          >
                            <MessageSquare className="w-3 h-3" />
                          </a>
                          <a
                            href={`tel:${c1Phone}`}
                            className="p-1 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30 hover:bg-blue-500 hover:text-white transition"
                            title="Call"
                          >
                            <Phone className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Contact 2 */}
                    {c2Name && (
                      <div className="flex items-center justify-between pt-1.5 border-t border-white/5">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <User className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                          <span className="text-gray-200 font-semibold truncate text-[11px]">{c2Name} <span className="text-[9px] text-gray-500">(संपर्क २)</span></span>
                        </div>

                        {c2Phone && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <a
                              href={`https://wa.me/91${c2Phone}?text=नमस्कार ${encodeURIComponent(c2Name)}, ${encodeURIComponent(team.teamName)} संदर्भात...`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30 hover:bg-emerald-500 hover:text-black transition"
                              title="WhatsApp"
                            >
                              <MessageSquare className="w-3 h-3" />
                            </a>
                            <a
                              href={`tel:${c2Phone}`}
                              className="p-1 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30 hover:bg-blue-500 hover:text-white transition"
                              title="Call"
                            >
                              <Phone className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>

          {/* 💻 PRINTABLE TABLE (फक्त लॅपटॉप वर आणि प्रिंटरवर दिसेल - मोबाईल स्क्रीनवर लपवला आहे) */}
          <div className="hidden md:block print-area glass-panel rounded-2xl overflow-hidden border border-amber-500/20 shadow-2xl p-4 bg-[#0c0d14] text-white">
            <div className="mb-3 pb-2 border-b border-gray-600 flex justify-between items-center">
              <div>
                <h1 className="text-base font-black text-amber-400 uppercase tracking-wide">Maharashtra Rajya Dahihandi Govinda Association</h1>
                <p className="text-[10px] text-gray-300">अधिकृत नोंदणीकृत पथकांची यादी | दिनांक: {new Date().toLocaleDateString('mr-IN')}</p>
              </div>
              <span className="text-[10px] font-bold bg-amber-500/20 px-2 py-1 rounded border border-amber-500/30 text-amber-300">
                एकूण नोंदी: {filteredTeams.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-black/80 border-b border-amber-500/30 text-amber-400 font-extrabold uppercase text-[10px]">
                    <th className="p-2 border border-white/10">अ.क्र.</th>
                    <th className="p-2 border border-white/10">Reg ID</th>
                    <th className="p-2 border border-white/10">संघाचे नाव</th>
                    <th className="p-2 border border-white/10">गट</th>
                    <th className="p-2 border border-white/10">जिल्हा / विभाग</th>
                    <th className="p-2 border border-white/10">संपर्क १ (कॅप्टन)</th>
                    <th className="p-2 border border-white/10">संपर्क २</th>
                    <th className="p-2 border border-white/10 text-center">स्टेटस</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {filteredTeams.map((team, idx) => (
                    <tr key={team.registrationId || idx} className="hover:bg-white/5 transition">
                      <td className="p-2 border border-white/5 text-gray-400 font-mono text-center">{idx + 1}</td>
                      <td className="p-2 border border-white/5 font-mono font-bold text-amber-400">{team.registrationId}</td>
                      <td className="p-2 border border-white/5 font-bold text-white">{team.teamName}</td>
                      <td className="p-2 border border-white/5 text-gray-300">{team.category || '-'}</td>
                      <td className="p-2 border border-white/5 text-gray-300">{team.district}, <span className="text-[10px] text-gray-400">{team.vibhag}</span></td>
                      <td className="p-2 border border-white/5">
                        <p className="font-semibold text-gray-200">{team.captain?.name || team.contact1?.name || '-'}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{team.captain?.phone || team.contact1?.phone || ''}</p>
                      </td>
                      <td className="p-2 border border-white/5">
                        <p className="font-semibold text-gray-200">{team.manager?.name || team.contact2?.name || '-'}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{team.manager?.phone || team.contact2?.phone || ''}</p>
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

    </div>
  );
}