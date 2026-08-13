// ==========================================
// #SECTION 1: IMPORTS & COMPONENT INITIALIZATION
// ==========================================
import React, { useState, useEffect, useMemo } from 'react';
import { dataService } from '../services/dataService';
import { authService } from '../services/authService';
import Swal from 'sweetalert2';
import { 
  CheckCircle, XCircle, Search, Filter, RefreshCw, 
  Phone, MessageSquare, ExternalLink, Shield, MapPin, X, ChevronRight, User, Trophy, Layers, Lock, Copy, CheckCircle2, MessageSquareCheck
} from 'lucide-react';

import CompetitionStats from '../components/CompetitionStats';
import CompetitionDuplicatesModal from '../components/CompetitionDuplicatesModal';
import CompetitionLeaderboardModal from '../components/CompetitionLeaderboardModal';

export default function AdminDashboard() {
  // ==========================================
  // #SECTION 2: STATE MANAGEMENT
  // ==========================================
  const [teams, setTeams] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // 🎯 FILTERS STATES
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [competitionFilter, setCompetitionFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [remarkFilter, setRemarkFilter] = useState('ALL'); // 🟢 रिमार्क फिल्टर
  
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);

  // User Authentication, Role & Department States
  const [userRole, setUserRole] = useState('Reviewer');
  const [userDepartment, setUserDepartment] = useState('MRDGA');
  
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');

  // Track Remarks / Comments States
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Form ON/OFF  
  const [isFormOpen, setIsFormOpen] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);

  const toTitleCase = (str) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getTeamLogo = (team) => {
    if (!team) return null;
    return team.media?.logo || team.media?.logoUrl || team.logo || team.logoUrl || null;
  };

  // ==========================================
  // #SECTION 3: API & AUTHENTICATION HANDLERS
  // ==========================================
  const loadCompetitionsAndTeams = async () => {
    setLoading(true);
    try {
      const teamsData = await dataService.getAllTeams();
      let compsData = [];
      if (typeof dataService.getAllCompetitions === 'function') {
        compsData = await dataService.getAllCompetitions();
      }

      setTeams(teamsData || []);
      setCompetitions(compsData || []);

    } catch (err) {
      console.error("❌ [ADMIN DASHBOARD LOAD ERROR]:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = authService.getCurrentUser(async (user) => {
      if (user) {
        setUserEmail(user.email || '');
        setUserName(user.displayName || user.email.split('@')[0]);

        try {
          const userDoc = await authService.getUserRole(user.email);
          if (userDoc) {
            if (userDoc.role) setUserRole(userDoc.role);
            if (userDoc.department) setUserDepartment(userDoc.department);
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
      loadCompetitionsAndTeams();
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
      loadCompetitionsAndTeams();

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

  // ==========================================
  // #SECTION 4: SMART DUPLICATE DETECTION LOGIC (Same Name `duplicateTeams`)
  // ==========================================
  const duplicateTeams = useMemo(() => {
    if (!teams || teams.length === 0) return [];

    const groupMap = new Map();
    const cleanStr = (str) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    const cleanPhone = (ph) => (ph || '').replace(/[^0-9]/g, '').slice(-10);

    teams.forEach((team) => {
      const cleanName = cleanStr(team.teamName);
      const c1Phone = cleanPhone(team.captain?.phone || team.contact1?.phone);
      const c2Phone = cleanPhone(team.manager?.phone || team.contact2?.phone);

      // १. नावावरून मॅचिंग
      if (cleanName && cleanName.length > 3) {
        const nameKey = `NAME_${cleanName}`;
        if (!groupMap.has(nameKey)) groupMap.set(nameKey, { matchType: 'समान नाव (Name Match)', teams: [] });
        groupMap.get(nameKey).teams.push(team);
      }

      // २. कॅप्टन फोन नंबर मॅचिंग
      if (c1Phone && c1Phone.length === 10) {
        const p1Key = `PHONE_${c1Phone}`;
        if (!groupMap.has(p1Key)) groupMap.set(p1Key, { matchType: `समान मोबाईल (${c1Phone})`, teams: [] });
        groupMap.get(p1Key).teams.push(team);
      }

      // ३. मॅनेजर फोन नंबर मॅचिंग
      if (c2Phone && c2Phone.length === 10 && c2Phone !== c1Phone) {
        const p2Key = `PHONE_${c2Phone}`;
        if (!groupMap.has(p2Key)) groupMap.set(p2Key, { matchType: `समान मॅनेजर मोबाईल (${c2Phone})`, teams: [] });
        groupMap.get(p2Key).teams.push(team);
      }
    });

    const finalGroups = [];
    const processedTeamIds = new Set();

    groupMap.forEach((groupData) => {
      const uniqueTeamsInGroup = [];
      const seenIds = new Set();

      groupData.teams.forEach(t => {
        if (!seenIds.has(t.registrationId)) {
          seenIds.add(t.registrationId);
          uniqueTeamsInGroup.push(t);
        }
      });

      if (uniqueTeamsInGroup.length > 1) {
        const unparsedCount = uniqueTeamsInGroup.filter(t => !processedTeamIds.has(t.registrationId)).length;
        if (unparsedCount > 0) {
          uniqueTeamsInGroup.forEach(t => processedTeamIds.add(t.registrationId));
          finalGroups.push({
            matchKey: uniqueTeamsInGroup[0].teamName,
            matchReason: groupData.matchType,
            teams: uniqueTeamsInGroup
          });
        }
      }
    });

    return finalGroups;
  }, [teams]);

  const hasMrdgaAccess = (userRole === 'Super Admin' || userDepartment === 'SUPER' || userDepartment === 'MRDGA') && userDepartment !== 'INSURANCE';
  const canApproveReject = userRole === 'Super Admin' || (userRole === 'Admin' && (userDepartment === 'MRDGA' || userDepartment === 'SUPER'));

  if (!loading && !hasMrdgaAccess) {
    return (
      <div className="p-8 text-center space-y-3 font-sans">
        <Lock className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-white">तुम्हाला या डॅशबोर्डचा ॲक्सेस नाही.</h2>
        <p className="text-xs text-gray-400">हे डॅशबोर्ड फक्त स्पर्धा व्यवस्थापन टीमसाठी राखीव आहे.</p>
      </div>
    );
  }

  // ==========================================
  // #SECTION 5: DYNAMIC FILTER & SEARCH LOGIC
  // ==========================================
  const filteredTeams = teams.filter(team => {
    const teamName = team.teamName || '';
    const regId = team.registrationId || '';
    const district = team.district || '';
    const captainName = team.captain?.name || team.contact1?.name || '';
    const managerName = team.manager?.name || team.contact2?.name || '';

    const matchesSearch = teamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          regId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          district.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          captainName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          managerName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || team.status === statusFilter;
    const matchesComp = competitionFilter === 'ALL' || team.competitionId === competitionFilter;
    const matchesCategory = categoryFilter === 'ALL' || team.category === categoryFilter;

    const hasRemark = Boolean(team.comments && team.comments.length > 0);
    const matchesRemark = remarkFilter === 'ALL' || 
                          (remarkFilter === 'WITH_REMARK' && hasRemark) ||
                          (remarkFilter === 'WITHOUT_REMARK' && !hasRemark);

    return matchesSearch && matchesStatus && matchesComp && matchesCategory && matchesRemark;
  });

  return (
    <div className="space-y-3 max-w-7xl mx-auto px-1 py-2 font-sans">
      
      {/* ========================================== */}
      {/* #SECTION 6: TOP HEADER                     */}
      {/* ========================================== */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-black/50 border border-amber-500/20 p-3 sm:p-4 rounded-2xl gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-white leading-tight flex items-center gap-2">
              ॲडमिन <span className="text-amber-400">डॅशबोर्ड (स्पर्धा अर्ज)</span>
              <span className="text-[9px] px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-md font-extrabold uppercase">
                {userRole} ({userDepartment})
              </span>
            </h2>
            <p className="text-[10px] text-gray-400 font-medium">
              एकूण नोंदणीकृत संघ: <b className="text-amber-400 font-bold">{teams.length}</b> 
              {competitionFilter !== 'ALL' && ` • फिल्टर केलेले: ${filteredTeams.length}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* ⚠️ डुप्लिकेट टीम्स अलर्ट बटण */}
          {duplicateTeams.length > 0 && (
            <button
              onClick={() => setShowDuplicatesModal(true)}
              className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-rose-400" />
              <span>दुबार अर्ज ({duplicateTeams.length})</span>
            </button>
          )}

          {/* 🏆 कॉलिंग लीडरबोर्ड बटण */}
          <button
            onClick={() => setShowLeaderboardModal(true)}
            className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-sm"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>कॉलिंग लीडरबोर्ड 🏆</span>
          </button>

          <button 
            onClick={loadCompetitionsAndTeams} 
            className="p-2 sm:px-3 sm:py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">रिफ्रेश</span>
          </button>
        </div>
      </div>

      {/* ========================================== */}
      {/* #SECTION 7: STATS & CALLING TRACKER BOARD   */}
      {/* ========================================== */}
      <CompetitionStats teams={teams} filteredTeams={filteredTeams} />

      {/* ========================================== */}
      {/* #SECTION 8: SEARCH & MOBILE COMPACT FILTERS */}
      {/* ========================================== */}
      <div className="glass-panel p-2.5 rounded-2xl space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-amber-400/60" />
          <input
            type="text"
            placeholder="संघ, संपर्क व्यक्ती किंवा जिल्ह्याने शोधा..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/60 border border-amber-500/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400/50 transition"
          />
        </div>

        {/* 📱 2x2 Compact Grid on Mobile */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          <div>
            <select
              value={competitionFilter}
              onChange={(e) => setCompetitionFilter(e.target.value)}
              className="w-full bg-black/60 border border-amber-500/10 rounded-xl px-2 py-1 text-[11px] text-amber-400 font-bold focus:outline-none"
            >
              <option value="ALL" className="bg-[#0c0d14] text-white">सर्व स्पर्धा</option>
              {competitions.map(comp => (
                <option key={comp.competitionId || comp.id} value={comp.competitionId || comp.id} className="bg-[#0c0d14] text-white">
                  {comp.title || comp.competitionId}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full bg-black/60 border border-amber-500/10 rounded-xl px-2 py-1 text-[11px] text-white focus:outline-none"
            >
              <option value="ALL" className="bg-[#0c0d14]">सर्व गट (Category)</option>
              <option value="M7" className="bg-[#0c0d14]">पुरुष ७ थर (M7)</option>
              <option value="M6" className="bg-[#0c0d14]">पुरुष ६ थर (M6)</option>
              <option value="W" className="bg-[#0c0d14]">महिला पथक (W)</option>
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-black/60 border border-amber-500/10 rounded-xl px-2 py-1 text-[11px] text-white focus:outline-none"
            >
              <option value="ALL" className="bg-[#0c0d14]">सर्व अर्ज (Status)</option>
              <option value="Pending" className="bg-[#0c0d14]">प्रलंबित (Pending)</option>
              <option value="Approved" className="bg-[#0c0d14]">मंजूर (Approved)</option>
              <option value="Rejected" className="bg-[#0c0d14]">नाकारलेले (Rejected)</option>
            </select>
          </div>

          <div>
            <select
              value={remarkFilter}
              onChange={(e) => setRemarkFilter(e.target.value)}
              className="w-full bg-black/60 border border-amber-500/10 rounded-xl px-2 py-1 text-[11px] text-emerald-400 font-bold focus:outline-none"
            >
              <option value="ALL" className="bg-[#0c0d14] text-white">सर्व कॉल्स (Calls)</option>
              <option value="WITH_REMARK" className="bg-[#0c0d14] text-emerald-400">🟢 रिमार्क जोडलेले</option>
              <option value="WITHOUT_REMARK" className="bg-[#0c0d14] text-rose-400">⚪ प्रलंबित कॉल्स</option>
            </select>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* #SECTION 9: MAIN TEAM LIST (MOBILE & DESKTOP) */}
      {/* ========================================== */}
      {loading ? (
        <p className="p-12 text-center text-amber-400 font-semibold text-xs animate-pulse">डेटा लोड होत आहे...</p>
      ) : filteredTeams.length === 0 ? (
        <p className="p-12 text-center text-gray-400 text-xs font-medium">कोणतीही नोंदणी सापडली नाही.</p>
      ) : (
        <>
          {/* 📱 Mobile Cards View */}
          <div className="grid grid-cols-1 md:hidden gap-2">
            {filteredTeams.map((team) => {
              const rawC1Name = team.captain?.name || team.contact1?.name || 'संपर्क १ नाही';
              const c1Name = toTitleCase(rawC1Name);
              const c1Phone = team.captain?.phone || team.contact1?.phone || '';

              const rawC2Name = team.manager?.name || team.contact2?.name || '';
              const c2Name = toTitleCase(rawC2Name);
              const c2Phone = team.manager?.phone || team.contact2?.phone || '';

              const formattedTeamName = toTitleCase(team.teamName);
              const formattedDistrict = toTitleCase(team.district);

              const teamLogo = getTeamLogo(team);
              const hasRemark = Boolean(team.comments && team.comments.length > 0);

              return (
                <div 
                  key={team.registrationId}
                  className="glass-panel p-2.5 rounded-2xl border border-amber-500/20 bg-black/40 space-y-2 relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full border border-amber-500/30 overflow-hidden bg-amber-500/10 shrink-0 flex items-center justify-center">
                        {teamLogo ? (
                          <img src={teamLogo} alt="Logo" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                        ) : (
                          <Shield className="w-5 h-5 text-amber-400/60" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                            #{team.registrationId}
                          </span>
                          {/* 🟢 रिमार्क इंडिकेटर टिक */}
                          {hasRemark ? (
                            <span className="p-0.5 text-emerald-400" title="रिमार्क / कॉल अपडेट जोडला आहे">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span className="p-0.5 text-slate-600" title="कॉल/रिमार्क प्रलंबित">
                              <MessageSquareCheck className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>

                        <h3 className="font-extrabold text-xs text-white leading-tight mt-0.5">{formattedTeamName}</h3>
                        <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-2.5 h-2.5 text-amber-400" /> {formattedDistrict || 'N/A'} ({team.category})
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

                  <div className="bg-black/50 p-2 rounded-xl border border-white/5 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-gray-200 font-semibold truncate">{c1Name}</span>
                      {c1Phone && (
                        <div className="flex items-center gap-1">
                          <a href={`https://wa.me/91${c1Phone}`} target="_blank" rel="noreferrer" className="p-1 bg-emerald-500/20 text-emerald-400 rounded-md">
                            <MessageSquare className="w-3 h-3" />
                          </a>
                          <a href={`tel:${c1Phone}`} className="p-1 bg-blue-500/20 text-blue-400 rounded-md">
                            <Phone className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-white/5">
                    <button onClick={() => setSelectedTeam(team)} className="text-[10px] font-bold text-amber-400 hover:underline flex items-center gap-0.5 cursor-pointer">
                      माहिती व रिमार्क्स <ChevronRight className="w-3 h-3" />
                    </button>

                    {canApproveReject && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleStatusChange(team.registrationId, 'Approved')} className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded text-[9px] font-bold">
                          Approve
                        </button>
                        <button onClick={() => handleStatusChange(team.registrationId, 'Rejected')} className="px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded text-[9px] font-bold">
                          Reject
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
                    const rawC1Name = team.captain?.name || team.contact1?.name || 'N/A';
                    const c1Name = toTitleCase(rawC1Name);
                    const c1Phone = team.captain?.phone || team.contact1?.phone || '';

                    const rawC2Name = team.manager?.name || team.contact2?.name || '-';
                    const c2Name = toTitleCase(rawC2Name);
                    const c2Phone = team.manager?.phone || team.contact2?.phone || '';

                    const formattedTeamName = toTitleCase(team.teamName);
                    const formattedDistrict = toTitleCase(team.district);

                    const teamLogo = getTeamLogo(team);
                    const hasRemark = Boolean(team.comments && team.comments.length > 0);

                    return (
                      <tr key={team.registrationId} className="hover:bg-amber-500/5 transition">
                        <td className="p-3">
                          <div className="w-9 h-9 rounded-full border border-amber-500/30 overflow-hidden bg-amber-500/10 flex items-center justify-center">
                            {teamLogo ? (
                              <img src={teamLogo} alt="Logo" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                            ) : (
                              <Shield className="w-4 h-4 text-amber-400/60" />
                            )}
                          </div>
                        </td>
                        <td className="p-3 font-mono font-bold text-amber-400">{team.registrationId}</td>
                        
                        {/* 🚩 नाव आणि 🟢 रिमार्क इंडिकेटर */}
                        <td className="p-3 font-bold text-white cursor-pointer hover:text-amber-400" onClick={() => setSelectedTeam(team)}>
                          <div className="flex items-center gap-1.5">
                            {formattedTeamName}
                            {hasRemark ? (
                              <span className="p-0.5 text-emerald-400" title="रिमार्क जोडला आहे"><CheckCircle2 className="w-4 h-4" /></span>
                            ) : (
                              <span className="p-0.5 text-slate-600" title="कॉल प्रलंबित"><MessageSquareCheck className="w-4 h-4" /></span>
                            )}
                          </div>
                        </td>

                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded text-[10px] font-extrabold border border-amber-500/30">
                            {team.category}
                          </span>
                        </td>
                        <td className="p-3 text-gray-300">
                          {formattedDistrict}, <span className="text-[10px] text-gray-400 font-medium">{team.vibhag}</span>
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
                              className="p-1.5 bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-black border border-amber-500/30 rounded-lg transition text-[10px] font-bold cursor-pointer"
                            >
                              पहा
                            </button>

                            {canApproveReject && (
                              <>
                                <button
                                  onClick={() => handleStatusChange(team.registrationId, 'Approved')}
                                  title="Approve"
                                  className="p-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-black border border-emerald-500/30 rounded-lg transition cursor-pointer"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleStatusChange(team.registrationId, 'Rejected')}
                                  title="Reject"
                                  className="p-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white border border-rose-500/30 rounded-lg transition cursor-pointer"
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
      {/* #SECTION 10: DUPLICATES COMPARISON MODAL   */}
      {/* ========================================== */}
      {showDuplicatesModal && (
        <CompetitionDuplicatesModal
          duplicateTeams={duplicateTeams}
          onClose={() => setShowDuplicatesModal(false)}
          onSelectTeam={(team) => setSelectedTeam(team)}
        />
      )}

      {/* 🏆 कॉलिंग लीडरबोर्ड आणि सर्व रिमार्क्स मोडल */}
{showLeaderboardModal && (
  <CompetitionLeaderboardModal
    teams={teams}
    onClose={() => setShowLeaderboardModal(false)}
    onSelectTeam={(team) => setSelectedTeam(team)}
  />
)}

      {/* ========================================== */}
      {/* #SECTION 11: POPUP MODAL & TRACK REMARKS   */}
      {/* ========================================== */}
      {selectedTeam && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0c0d14] border border-amber-500/30 rounded-3xl w-full max-w-lg p-5 space-y-4 max-h-[90vh] overflow-y-auto text-white relative shadow-2xl">
            
            <div className="flex justify-between items-start border-b border-amber-500/20 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full border-2 border-amber-500/30 overflow-hidden bg-amber-500/10 shrink-0 flex items-center justify-center">
                  {getTeamLogo(selectedTeam) ? (
                    <img src={getTeamLogo(selectedTeam)} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Shield className="w-6 h-6 text-amber-400/60" />
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    #{selectedTeam.registrationId}
                  </span>
                  <h3 className="text-base font-black text-white mt-1 leading-tight">{toTitleCase(selectedTeam.teamName)}</h3>
                </div>
              </div>

              <button 
                onClick={() => setSelectedTeam(null)}
                className="p-1.5 bg-black/40 text-gray-400 hover:text-white rounded-xl border border-amber-500/20 cursor-pointer"
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
                  <p className="font-bold text-white">{toTitleCase(selectedTeam.district) || 'N/A'}</p>
                </div>
                <div className="mt-2">
                  <p className="text-[10px] text-gray-400">विभाग / तालुका</p>
                  <p className="font-bold text-white">{toTitleCase(selectedTeam.vibhag) || 'N/A'}</p>
                </div>
              </div>

              <div className="bg-black/40 p-3 rounded-2xl border border-white/5 space-y-3">
                <p className="text-[11px] font-bold text-amber-400 border-b border-amber-500/10 pb-1">संपर्क व्यक्ती तपशील</p>
                
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[10px] text-gray-400">संपर्क १ (कॅप्टन)</p>
                    <p className="font-bold text-white">{toTitleCase(selectedTeam.captain?.name || selectedTeam.contact1?.name) || 'N/A'}</p>
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
                      <p className="font-bold text-white">{toTitleCase(selectedTeam.manager?.name || selectedTeam.contact2?.name)}</p>
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

              {getTeamLogo(selectedTeam) && (
                <div className="pt-1">
                  <a href={getTeamLogo(selectedTeam)} target="_blank" rel="noreferrer" className="w-full py-2 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-xl font-bold flex items-center justify-center gap-2">
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
                    className="px-3 py-1.5 bg-amber-500 text-black font-extrabold text-xs rounded-xl disabled:opacity-50 transition cursor-pointer"
                  >
                    {submittingComment ? '...' : 'जोडा'}
                  </button>
                </div>
              </div>
            </div>

            {canApproveReject ? (
              <div className="flex items-center gap-2 pt-2 border-t border-amber-500/20">
                <button onClick={() => handleStatusChange(selectedTeam.registrationId, 'Approved')} className="flex-1 py-2.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-black border border-emerald-500/30 rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer">
                  <CheckCircle className="w-4 h-4" /> Approve करा
                </button>
                <button onClick={() => handleStatusChange(selectedTeam.registrationId, 'Rejected')} className="flex-1 py-2.5 bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white border border-rose-500/30 rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer">
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

