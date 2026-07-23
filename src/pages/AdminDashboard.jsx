// ==========================================
// #SECTION 1: IMPORTS & COMPONENT INITIALIZATION
// ==========================================
import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import { authService } from '../services/authService';
import Swal from 'sweetalert2';
import { 
  CheckCircle, XCircle, Search, Filter, RefreshCw, 
  Phone, MessageSquare, ExternalLink, Shield, MapPin, X, ChevronRight, User, Trophy, Layers
} from 'lucide-react';

export default function AdminDashboard() {
  // ==========================================
  // #SECTION 2: STATE MANAGEMENT
  // ==========================================
  const [teams, setTeams] = useState([]);
  const [competitions, setCompetitions] = useState([]); // 🏆 Competitions List State
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // 🎯 FILTERS STATES
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [competitionFilter, setCompetitionFilter] = useState('ALL'); // 🏆 Competition Filter
  const [categoryFilter, setCategoryFilter] = useState('ALL');       // 🤼 Category Filter
  
  const [selectedTeam, setSelectedTeam] = useState(null);

  // User Authentication & Role States
  const [userRole, setUserRole] = useState('Reviewer'); // Default fallback role
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');

  // Track Remarks / Comments States
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Form ON/OFF  
  const [isFormOpen, setIsFormOpen] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);

  // ==========================================
  // #SECTION 3: API & AUTHENTICATION HANDLERS
  // ==========================================
  const loadTeams = async () => {
    setLoading(true);
    try {
      const data = await dataService.getAllTeams();
      setTeams(data);
    } catch (err) {
      console.error("Error loading teams:", err);
    } finally {
      setLoading(false);
    }
  };

  // 🏆 Competitions & Teams Load Handler
// 🎯 SECTION: Load Competitions & Teams with Debug Logs
  const loadCompetitionsAndTeams = async () => {
    setLoading(true);
    console.log("==========================================");
    console.log("🚀 [ADMIN DASHBOARD] Loading Teams and Competitions...");
    
    try {
      const teamsData = await dataService.getAllTeams();
      console.log("📊 [ADMIN DASHBOARD] Total Teams Loaded:", teamsData?.length || 0);

      let compsData = [];
      if (typeof dataService.getAllCompetitions === 'function') {
        compsData = await dataService.getAllCompetitions();
        console.log("📊 [ADMIN DASHBOARD] Total Competitions Loaded:", compsData?.length || 0);
      } else {
        console.error("❌ [ADMIN DASHBOARD] 'dataService.getAllCompetitions' function is missing!");
      }

      setTeams(teamsData || []);
      setCompetitions(compsData || []);

    } catch (err) {
      console.error("❌ [ADMIN DASHBOARD LOAD ERROR]:", err);
    } finally {
      setLoading(false);
      console.log("==========================================");
    }
  };



  useEffect(() => {
    const unsubscribe = authService.getCurrentUser(async (user) => {
      if (user) {
        setUserEmail(user.email || '');
        setUserName(user.displayName || user.email.split('@')[0]);

        try {
          const userDoc = await authService.getUserRole(user.email);
          if (userDoc && userDoc.role) {
            setUserRole(userDoc.role);
          }
        } catch (e) {
          console.error("Role fetch error:", e);
        }

        loadCompetitionsAndTeams();
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Update Status Handler (Only for Admins)
  const handleStatusChange = async (regId, newStatus) => {
    try {
      await dataService.updateTeamStatus(regId, newStatus);
      Swal.fire({ 
        icon: 'success', 
        title: 'स्टेटस अपडेट झाले!', 
        timer: 1200, 
        showConfirmButton: false,
        background: '#0c0d14',
        color: '#fff'
      });
      loadTeams();
      if (selectedTeam && selectedTeam.registrationId === regId) {
        setSelectedTeam(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      Swal.fire({ 
        icon: 'error', 
        title: 'त्रुटी!', 
        text: 'स्टेटस अपडेट करता आले नाही.',
        background: '#0c0d14',
        color: '#fff'
      });
    }
  };

  // Add Internal Comment / Track Note Handler
  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedTeam) return;

    setSubmittingComment(true);
    try {
      const commentObj = {
        email: userEmail,
        name: userName,
        role: userRole,
        text: newComment.trim()
      };

      await dataService.addTeamComment(selectedTeam.registrationId, commentObj);

      const updatedComments = [
        ...(selectedTeam.comments || []),
        {
          id: Date.now().toString(),
          byEmail: userEmail,
          byName: userName,
          role: userRole,
          text: newComment.trim(),
          createdAt: new Date().toISOString()
        }
      ];

      setSelectedTeam(prev => ({ ...prev, comments: updatedComments }));
      setNewComment('');
      loadTeams();

      Swal.fire({
        icon: 'success',
        title: 'रिमार्क जोडला!',
        timer: 1000,
        showConfirmButton: false,
        background: '#0c0d14',
        color: '#fff'
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'त्रुटी!',
        text: 'कमेंट सेव्ह झाली नाही.',
        background: '#0c0d14',
        color: '#fff'
      });
    } finally {
      setSubmittingComment(false);
    }
  };

  // Fetch Form Status
  useEffect(() => {
    const fetchStatus = async () => {
      const status = await dataService.getFormStatus(competitionFilter);
      setIsFormOpen(status?.isOpen !== false);
    };
    fetchStatus();
  }, [competitionFilter]);

  // Toggle Form Status Handler
  const handleToggleFormStatus = async () => {
    const newStatus = !isFormOpen;
    const targetCompText = competitionFilter === 'ALL' ? 'सर्व सामान्य फॉर्म' : competitionFilter;
    
    const result = await Swal.fire({
      title: `${targetCompText} ${newStatus ? 'सुरू करायचा का?' : 'बंद करायचा का?'}`,
      text: newStatus 
        ? 'नवीन पथकांना अर्ज भरता येईल.' 
        : 'फॉर्म बंद केल्यास नवीन नोंदणी करता येणार नाही.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: newStatus ? 'होय, सुरू करा' : 'होय, बंद करा',
      cancelButtonText: 'रद्द करा',
      background: '#0c0d14',
      color: '#fff'
    });

    if (result.isConfirmed) {
      setStatusLoading(true);
      try {
        await dataService.updateFormStatus(newStatus, competitionFilter);
        setIsFormOpen(newStatus);
        Swal.fire({
          icon: 'success',
          title: newStatus ? 'फॉर्म सुरू झाला!' : 'फॉर्म बंद झाला!',
          timer: 1500,
          showConfirmButton: false,
          background: '#0c0d14',
          color: '#fff'
        });
      } catch (err) {
        Swal.fire({ icon: 'error', title: 'त्रुटी!', text: 'स्टेटस बदलता आला नाही.' });
      } finally {
        setStatusLoading(false);
      }
    }
  };

  // ==========================================
  // #SECTION 4: DYNAMIC FILTER & SEARCH LOGIC
  // ==========================================
  const filteredTeams = teams.filter(team => {
    const teamName = team.teamName || '';
    const regId = team.registrationId || '';
    const district = team.district || '';
    const captainName = team.captain?.name || team.contact1?.name || '';
    const managerName = team.manager?.name || team.contact2?.name || '';

    // 1. टेक्स्ट सर्च (नाव, आयडी, जिल्हा, संपर्क व्यक्ती)
    const matchesSearch = teamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          regId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          district.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          captainName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          managerName.toLowerCase().includes(searchTerm.toLowerCase());
    
    // 2. 📄 स्टेटसनुसार (Pending, Approved, Rejected)
    const matchesStatus = statusFilter === 'ALL' || team.status === statusFilter;

    // 3. 🏆 स्पर्धेनुसार (COMP-2026-01, COMP-2025-01)
    const matchesComp = competitionFilter === 'ALL' || team.competitionId === competitionFilter;

    // 4. 🤼 गटानुसार (M7, M6, W...)
    const matchesCategory = categoryFilter === 'ALL' || team.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesComp && matchesCategory;
  });

  return (
    <div className="space-y-4 max-w-7xl mx-auto px-1 py-2 font-sans">
      
      {/* ========================================== */}
      {/* #SECTION 5: HEADER & SEARCH-FILTER BAR    */}
      {/* ========================================== */}
      <div className="flex justify-between items-center bg-black/50 border border-amber-500/20 p-3 sm:p-4 rounded-2xl backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-white leading-tight flex items-center gap-2">
              ॲडमिन <span className="text-amber-400">डॅशबोर्ड</span>
              <span className="text-[9px] px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-md font-extrabold uppercase">
                {userRole}
              </span>
            </h2>
            <p className="text-[10px] text-gray-400 font-medium">
              एकूण नोंदणीकृत संघ: <b className="text-amber-400 font-bold">{teams.length}</b> 
              {competitionFilter !== 'ALL' && ` • फिल्टर केलेले: ${filteredTeams.length}`}
            </p>
          </div>
        </div>

        <button 
          onClick={loadCompetitionsAndTeams} 
          className="p-2 sm:px-3 sm:py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">रिफ्रेश</span>
        </button>
      </div>

      {/* Form ON/OFF Toggle Switch Bar */}
      {/* <div className="flex items-center justify-between bg-black/40 border border-amber-500/20 p-2.5 rounded-xl">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-300">अर्ज नोंदणी:</span>
          <span className="text-[10px] text-amber-400/80 font-mono">
            ({competitionFilter === 'ALL' ? 'सामान्य फॉर्म' : competitionFilter})
          </span>
        </div>

        <button
          onClick={handleToggleFormStatus}
          disabled={statusLoading}
          className={`px-3 py-1 rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
            isFormOpen 
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30' 
              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${isFormOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
          {isFormOpen ? 'सुरू (ONLINE)' : 'बंद (OFFLINE)'}
        </button>
        
      </div> */}

      {/* Search & Dynamic Filter Inputs */}
      <div className="glass-panel p-2.5 rounded-2xl flex flex-col sm:flex-row gap-2">
        {/* Search Field */}
        <div className="flex-1 relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-amber-400/60" />
          <input
            type="text"
            placeholder="संघ, संपर्क व्यक्ती किंवा जिल्ह्याने शोधा..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/60 border border-amber-500/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400/50 transition"
          />
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-amber-400/60 shrink-0 ml-1" />
          
          {/* 🏆 1. Competition Filter Dropdown */}
          <select
            value={competitionFilter}
            onChange={(e) => setCompetitionFilter(e.target.value)}
            className="w-full sm:w-auto bg-black/60 border border-amber-500/10 rounded-xl px-2.5 py-1.5 text-xs text-amber-400 font-bold focus:outline-none focus:border-amber-400/50 transition"
          >
            <option value="ALL" className="bg-[#0c0d14] text-white">सर्व स्पर्धा (All)</option>
            {competitions.map(comp => (
              <option key={comp.competitionId || comp.id} value={comp.competitionId || comp.id} className="bg-[#0c0d14] text-white">
                {comp.title || comp.competitionId}
              </option>
            ))}
          </select>

          {/* 🤼 2. Category Filter Dropdown (M7, M6, Women) */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full sm:w-auto bg-black/60 border border-amber-500/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400/50 transition"
          >
            <option value="ALL" className="bg-[#0c0d14]">सर्व गट (Category)</option>
            <option value="M7" className="bg-[#0c0d14]">पुरुष ७ थर (M7)</option>
            <option value="M6" className="bg-[#0c0d14]">पुरुष ६ थर (M6)</option>
            <option value="W" className="bg-[#0c0d14]">महिला पथक (W)</option>
          </select>

          {/* 📄 3. Status Filter Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto bg-black/60 border border-amber-500/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400/50 transition"
          >
            <option value="ALL" className="bg-[#0c0d14]">सर्व अर्जे (Status)</option>
            <option value="Pending" className="bg-[#0c0d14]">प्रलंबित (Pending)</option>
            <option value="Approved" className="bg-[#0c0d14]">मंजूर (Approved)</option>
            <option value="Rejected" className="bg-[#0c0d14]">नाकारलेले (Rejected)</option>
          </select>
        </div>
      </div>

      {/* ========================================== */}
      {/* #SECTION 6: MOBILE CARDS & DESKTOP TABLE UI */}
      {/* ========================================== */}
      {loading ? (
        <p className="p-12 text-center text-amber-400 font-semibold text-xs animate-pulse">डेटा लोड होत आहे...</p>
      ) : filteredTeams.length === 0 ? (
        <p className="p-12 text-center text-gray-400 text-xs font-medium">कोणतीही नोंदणी सापडली नाही.</p>
      ) : (
        <>
          {/* 📱 Mobile Responsive Cards View */}
          <div className="grid grid-cols-1 md:hidden gap-3">
            {filteredTeams.map((team) => {
              const c1Name = team.captain?.name || team.contact1?.name || 'संपर्क १ नाही';
              const c1Phone = team.captain?.phone || team.contact1?.phone || '';

              const c2Name = team.manager?.name || team.contact2?.name || '';
              const c2Phone = team.manager?.phone || team.contact2?.phone || '';

              return (
                <div 
                  key={team.registrationId}
                  className="glass-panel p-3.5 rounded-2xl border border-amber-500/20 bg-black/40 space-y-3 relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full border-2 border-amber-500/30 overflow-hidden bg-amber-500/10 shrink-0 flex items-center justify-center">
                        {team.media?.logoUrl ? (
                          <img src={team.media.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                          <Shield className="w-6 h-6 text-amber-400/60" />
                        )}
                      </div>

                      <div>
                        <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          #{team.registrationId}
                        </span>
                        <h3 className="font-bold text-sm text-white leading-tight mt-1">{team.teamName}</h3>
                        <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-amber-400" /> {team.district || 'जिल्हा N/A'}
                        </p>
                      </div>
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
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <User className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="text-gray-200 font-semibold truncate text-[11px]">{c1Name} <span className="text-[9px] text-gray-500">(कॅप्टन)</span></span>
                      </div>

                      {c1Phone && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <a href={`https://wa.me/91${c1Phone}?text=नमस्कार ${encodeURIComponent(c1Name)}, ${encodeURIComponent(team.teamName)} संदर्भात...`} target="_blank" rel="noreferrer" className="p-1 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30 hover:bg-emerald-500 hover:text-black transition">
                            <MessageSquare className="w-3 h-3" />
                          </a>
                          <a href={`tel:${c1Phone}`} className="p-1 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30 hover:bg-blue-500 hover:text-white transition">
                            <Phone className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>

                    {c2Name && (
                      <div className="flex items-center justify-between pt-1.5 border-t border-white/5">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <User className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                          <span className="text-gray-200 font-semibold truncate text-[11px]">{c2Name} <span className="text-[9px] text-gray-500">(संपर्क २)</span></span>
                        </div>

                        {c2Phone && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <a href={`https://wa.me/91${c2Phone}?text=नमस्कार ${encodeURIComponent(c2Name)}, ${encodeURIComponent(team.teamName)} संदर्भात...`} target="_blank" rel="noreferrer" className="p-1 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30 hover:bg-emerald-500 hover:text-black transition">
                              <MessageSquare className="w-3 h-3" />
                            </a>
                            <a href={`tel:${c2Phone}`} className="p-1 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30 hover:bg-blue-500 hover:text-white transition">
                              <Phone className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-white/5">
                    <button onClick={() => setSelectedTeam(team)} className="text-[11px] font-bold text-amber-400 hover:underline flex items-center gap-1">
                      संपूर्ण माहिती व रिमार्क्स <ChevronRight className="w-3 h-3" />
                    </button>

                    {['Super Admin', 'Admin'].includes(userRole) && (
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => handleStatusChange(team.registrationId, 'Approved')} className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg text-[10px] font-bold flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Approve
                        </button>
                        <button onClick={() => handleStatusChange(team.registrationId, 'Rejected')} className="px-2.5 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-lg text-[10px] font-bold flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 💻 Desktop Table View */}
          <div className="hidden md:block glass-panel rounded-2xl overflow-hidden border border-amber-500/20 shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-black/80 border-b border-amber-500/20 text-amber-400 font-extrabold uppercase tracking-wider text-[11px]">
                    <th className="p-3">लोगो</th>
                    <th className="p-3">Reg ID</th>
                    <th className="p-3">संघाचे नाव</th>
                    <th className="p-3">गट</th>
                    <th className="p-3">जिल्हा / विभाग</th>
                    <th className="p-3">संपर्क १ (कॅप्टन)</th>
                    <th className="p-3">संपर्क २</th>
                    <th className="p-3">स्टेटस</th>
                    <th className="p-3 text-center">ॲक्शन</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-500/10">
                  {filteredTeams.map((team) => {
                    const c1Name = team.captain?.name || team.contact1?.name || 'N/A';
                    const c1Phone = team.captain?.phone || team.contact1?.phone || '';

                    const c2Name = team.manager?.name || team.contact2?.name || '-';
                    const c2Phone = team.manager?.phone || team.contact2?.phone || '';

                    return (
                      <tr key={team.registrationId} className="hover:bg-amber-500/5 transition">
                        <td className="p-3">
                          <div className="w-9 h-9 rounded-full border border-amber-500/30 overflow-hidden bg-amber-500/10 flex items-center justify-center">
                            {team.media?.logoUrl ? (
                              <img src={team.media.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                            ) : (
                              <Shield className="w-4 h-4 text-amber-400/60" />
                            )}
                          </div>
                        </td>
                        <td className="p-3 font-mono font-bold text-amber-400">{team.registrationId}</td>
                        <td className="p-3 font-bold text-white cursor-pointer hover:text-amber-400" onClick={() => setSelectedTeam(team)}>
                          {team.teamName}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded text-[10px] font-extrabold border border-amber-500/30">
                            {team.category}
                          </span>
                        </td>
                        <td className="p-3 text-gray-300">
                          {team.district}, <span className="text-[10px] text-gray-400 font-medium">{team.vibhag}</span>
                        </td>

                        <td className="p-3">
                          <p className="font-semibold text-gray-200">{c1Name}</p>
                          {c1Phone && (
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-gray-400 font-mono">{c1Phone}</span>
                              <a href={`https://wa.me/91${c1Phone}`} target="_blank" rel="noreferrer" className="text-emerald-400 hover:scale-110 transition">
                                <MessageSquare className="w-3 h-3" />
                              </a>
                              <a href={`tel:${c1Phone}`} className="text-blue-400 hover:scale-110 transition">
                                <Phone className="w-3 h-3" />
                              </a>
                            </div>
                          )}
                        </td>

                        <td className="p-3">
                          <p className="font-semibold text-gray-200">{c2Name}</p>
                          {c2Phone && (
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-gray-400 font-mono">{c2Phone}</span>
                              <a href={`https://wa.me/91${c2Phone}`} target="_blank" rel="noreferrer" className="text-emerald-400 hover:scale-110 transition">
                                <MessageSquare className="w-3 h-3" />
                              </a>
                              <a href={`tel:${c2Phone}`} className="text-blue-400 hover:scale-110 transition">
                                <Phone className="w-3 h-3" />
                              </a>
                            </div>
                          )}
                        </td>

                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                            team.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                            team.status === 'Rejected' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
                            'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          }`}>
                            {team.status || 'Pending'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedTeam(team)}
                              title="माहिती व रिमार्क्स पहा"
                              className="p-1.5 bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-black border border-amber-500/30 rounded-lg transition text-[10px] font-bold"
                            >
                              पहा
                            </button>

                            {['Super Admin', 'Admin'].includes(userRole) && (
                              <>
                                <button
                                  onClick={() => handleStatusChange(team.registrationId, 'Approved')}
                                  title="Approve"
                                  className="p-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-black border border-emerald-500/30 rounded-lg transition"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleStatusChange(team.registrationId, 'Rejected')}
                                  title="Reject"
                                  className="p-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white border border-rose-500/30 rounded-lg transition"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
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

      {/* ========================================== */}
      {/* #SECTION 7: POPUP MODAL & TRACK REMARKS    */}
      {/* ========================================== */}
      {selectedTeam && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0c0d14] border border-amber-500/30 rounded-3xl w-full max-w-lg p-5 space-y-4 max-h-[90vh] overflow-y-auto text-white relative shadow-2xl">
            
            <div className="flex justify-between items-start border-b border-amber-500/20 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full border-2 border-amber-500/30 overflow-hidden bg-amber-500/10 shrink-0 flex items-center justify-center">
                  {selectedTeam.media?.logoUrl ? (
                    <img src={selectedTeam.media.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Shield className="w-6 h-6 text-amber-400/60" />
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    #{selectedTeam.registrationId}
                  </span>
                  <h3 className="text-base font-black text-white mt-1 leading-tight">{selectedTeam.teamName}</h3>
                </div>
              </div>

              <button 
                onClick={() => setSelectedTeam(null)}
                className="p-1.5 bg-black/40 text-gray-400 hover:text-white rounded-xl border border-amber-500/20"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-black/40 p-3 rounded-2xl border border-white/5">
                <div>
                  <p className="text-[10px] text-gray-400">गट / प्रकार</p>
                  <p className="font-bold text-amber-400">{selectedTeam.category || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400">एकूण खेळाडू संख्या</p>
                  <p className="font-bold text-white">{selectedTeam.playerCount || 'N/A'}</p>
                </div>
                <div className="mt-2">
                  <p className="text-[10px] text-gray-400">जिल्हा</p>
                  <p className="font-bold text-white">{selectedTeam.district || 'N/A'}</p>
                </div>
                <div className="mt-2">
                  <p className="text-[10px] text-gray-400">विभाग / तालुका</p>
                  <p className="font-bold text-white">{selectedTeam.vibhag || 'N/A'}</p>
                </div>
              </div>

              <div className="bg-black/40 p-3 rounded-2xl border border-white/5 space-y-3">
                <p className="text-[11px] font-bold text-amber-400 border-b border-amber-500/10 pb-1">संपर्क व्यक्ती तपशील</p>
                
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[10px] text-gray-400">संपर्क १ (कॅप्टन)</p>
                    <p className="font-bold text-white">{selectedTeam.captain?.name || selectedTeam.contact1?.name || 'N/A'}</p>
                    <p className="text-[10px] text-gray-400 font-mono">{selectedTeam.captain?.phone || selectedTeam.contact1?.phone}</p>
                  </div>
                  {(selectedTeam.captain?.phone || selectedTeam.contact1?.phone) && (
                    <div className="flex items-center gap-1.5">
                      <a href={`https://wa.me/91${selectedTeam.captain?.phone || selectedTeam.contact1?.phone}`} target="_blank" rel="noreferrer" className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30 font-bold flex items-center gap-1 text-[11px]">
                        <MessageSquare className="w-3 h-3" /> WhatsApp
                      </a>
                      <a href={`tel:${selectedTeam.captain?.phone || selectedTeam.contact1?.phone}`} className="px-2.5 py-1 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30 font-bold flex items-center gap-1 text-[11px]">
                        <Phone className="w-3 h-3" /> Call
                      </a>
                    </div>
                  )}
                </div>

                {(selectedTeam.manager?.name || selectedTeam.contact2?.name) && (
                  <div className="flex justify-between items-center pt-2 border-t border-white/5">
                    <div>
                      <p className="text-[10px] text-gray-400">संपर्क २ (अध्यक्ष/मॅनेजर)</p>
                      <p className="font-bold text-white">{selectedTeam.manager?.name || selectedTeam.contact2?.name}</p>
                      <p className="text-[10px] text-gray-400 font-mono">{selectedTeam.manager?.phone || selectedTeam.contact2?.phone}</p>
                    </div>
                    {(selectedTeam.manager?.phone || selectedTeam.contact2?.phone) && (
                      <div className="flex items-center gap-1.5">
                        <a href={`https://wa.me/91${selectedTeam.manager?.phone || selectedTeam.contact2?.phone}`} target="_blank" rel="noreferrer" className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30 font-bold flex items-center gap-1 text-[11px]">
                          <MessageSquare className="w-3 h-3" /> WhatsApp
                        </a>
                        <a href={`tel:${selectedTeam.manager?.phone || selectedTeam.contact2?.phone}`} className="px-2.5 py-1 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30 font-bold flex items-center gap-1 text-[11px]">
                          <Phone className="w-3 h-3" /> Call
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {selectedTeam.media?.logoUrl && (
                <div className="pt-1">
                  <a href={selectedTeam.media.logoUrl} target="_blank" rel="noreferrer" className="w-full py-2 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-xl font-bold flex items-center justify-center gap-2">
                    मूळ लोगो इमेज उघडा <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              <div className="bg-black/40 p-3 rounded-2xl border border-white/5 space-y-2 mt-2">
                <p className="text-[11px] font-bold text-amber-400 border-b border-amber-500/10 pb-1">
                  अधिकारी ट्रॅकिंग नोट्स / रिमार्क्स ({selectedTeam.comments?.length || 0})
                </p>

                <div className="max-h-32 overflow-y-auto space-y-2 pr-1">
                  {selectedTeam.comments && selectedTeam.comments.length > 0 ? (
                    selectedTeam.comments.map((c, i) => (
                      <div key={c.id || i} className="bg-black/60 p-2 rounded-xl border border-white/5 text-[11px] space-y-0.5">
                        <div className="flex justify-between items-center text-[9px] text-gray-400">
                          <span className="font-bold text-amber-400/90">{c.byName} ({c.role})</span>
                          <span>{c.createdAt ? new Date(c.createdAt).toLocaleDateString('mr-IN') : ''}</span>
                        </div>
                        <p className="text-gray-200 font-medium">{c.text}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] text-gray-500 italic">अद्याप कोणताही रिमार्क जोडलेला नाही.</p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 pt-1">
                  <input
                    type="text"
                    placeholder="उदा. कॅप्टनशी बोलणे झाले, फी भरली..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-1 bg-black/80 border border-amber-500/20 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400/50"
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={submittingComment || !newComment.trim()}
                    className="px-3 py-1.5 bg-amber-500 text-black font-extrabold text-xs rounded-xl disabled:opacity-50 transition"
                  >
                    {submittingComment ? '...' : 'जोडा'}
                  </button>
                </div>
              </div>
            </div>

            {['Super Admin', 'Admin'].includes(userRole) ? (
              <div className="flex items-center gap-2 pt-2 border-t border-amber-500/20">
                <button onClick={() => handleStatusChange(selectedTeam.registrationId, 'Approved')} className="flex-1 py-2.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-black border border-emerald-500/30 rounded-xl font-bold transition flex items-center justify-center gap-1.5">
                  <CheckCircle className="w-4 h-4" /> Approve करा
                </button>
                <button onClick={() => handleStatusChange(selectedTeam.registrationId, 'Rejected')} className="flex-1 py-2.5 bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white border border-rose-500/30 rounded-xl font-bold transition flex items-center justify-center gap-1.5">
                  <XCircle className="w-4 h-4" /> Reject करा
                </button>
              </div>
            ) : (
              <p className="text-[10px] text-center text-gray-400 italic pt-2 border-t border-amber-500/10">
                (टीप: स्टेटस बदलण्याचे अधिकार फक्त Admins ना आहेत.)
              </p>
            )}

          </div>
        </div>
      )}

    </div>
  );
}