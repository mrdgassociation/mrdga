// ==========================================
// #SECTION 1: IMPORTS & COMPONENT INITIALIZATION
// ==========================================
import React, { useState, useMemo } from 'react';
import { X, Users, Search, UserCheck, Calendar, MessageSquare } from 'lucide-react';

export default function CompetitionLeaderboardModal({ teams = [], onClose, onSelectTeam }) {
  const [activeTab, setActiveTab] = useState('LEADERBOARD'); // 'LEADERBOARD' किंवा 'ALL_REMARKS'
  const [searchTerm, setSearchTerm] = useState('');

  // 🔤 Title Case Helper
  const toTitleCase = (str) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // ==========================================
  // #SECTION 2: OFFICER CALLING STATS (रँकशिवाय फक्त आकडेवारी)
  // ==========================================
  const officerStats = useMemo(() => {
    const statsMap = new Map();

    teams.forEach(team => {
      if (team.comments && Array.isArray(team.comments)) {
        team.comments.forEach(comment => {
          const emailKey = comment.byEmail || comment.email || comment.byName || 'Unknown';
          const name = comment.byName || comment.name || comment.byEmail || 'अधिकारी';
          const role = comment.role || 'Officer';

          if (!statsMap.has(emailKey)) {
            statsMap.set(emailKey, {
              email: emailKey,
              name: name,
              role: role,
              totalRemarks: 0,
              uniqueTeamsSet: new Set(),
              lastActive: comment.createdAt ? new Date(comment.createdAt) : null
            });
          }

          const entry = statsMap.get(emailKey);
          entry.totalRemarks += 1;
          entry.uniqueTeamsSet.add(team.registrationId);

          if (comment.createdAt) {
            const commentDate = new Date(comment.createdAt);
            if (!entry.lastActive || commentDate > entry.lastActive) {
              entry.lastActive = commentDate;
            }
          }
        });
      }
    });

    // रँकिंग न ठेवता कॉलिंगच्या संख्येनुसार नॉर्मल क्रमवारी
    return Array.from(statsMap.values())
      .map(item => ({
        ...item,
        uniqueTeamsCount: item.uniqueTeamsSet.size
      }))
      .sort((a, b) => b.uniqueTeamsCount - a.uniqueTeamsCount);
  }, [teams]);

  // ==========================================
  // #SECTION 3: ALL REMARKS FEED (सर्व रिमार्क्स क्रमाने एकत्र करणे)
  // ==========================================
  const allRemarksList = useMemo(() => {
    const list = [];

    teams.forEach(team => {
      if (team.comments && Array.isArray(team.comments)) {
        team.comments.forEach(comment => {
          list.push({
            teamId: team.registrationId,
            teamName: team.teamName,
            district: team.district,
            category: team.category,
            teamRef: team,
            ...comment
          });
        });
      }
    });

    return list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [teams]);

  // रिमार्क सर्च फिल्टर
  const filteredRemarks = useMemo(() => {
    if (!searchTerm.trim()) return allRemarksList;
    const term = searchTerm.toLowerCase();
    return allRemarksList.filter(item => 
      (item.teamName || '').toLowerCase().includes(term) ||
      (item.byName || '').toLowerCase().includes(term) ||
      (item.text || '').toLowerCase().includes(term) ||
      (item.teamId || '').toLowerCase().includes(term)
    );
  }, [allRemarksList, searchTerm]);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto font-sans">
      <div className="bg-[#0c0d14] border border-amber-500/40 w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] text-white">
        
        {/* ========================================== */}
        {/* #SECTION 4: MODAL HEADER                   */}
        {/* ========================================== */}
        <div className="p-3.5 border-b border-slate-800 bg-slate-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-xs sm:text-sm text-amber-400 flex items-center gap-1.5">
                टीम कॉलिंग व रिमार्क्स समरी (Calling & Remarks Summary)
              </h3>
              <p className="text-[10px] text-slate-400">
                टीम सदस्यांचे कॉलिंग योगदान व लाईव्ह अपडेट्स
              </p>
            </div>
          </div>

          {/* 🎯 Tab Switcher */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between">
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
              <button
                onClick={() => setActiveTab('LEADERBOARD')}
                className={`px-3 py-1 rounded-lg transition ${activeTab === 'LEADERBOARD' ? 'bg-amber-500 text-black shadow' : 'text-slate-400 hover:text-white'}`}
              >
                👥 टीम योगदान ({officerStats.length})
              </button>
              <button
                onClick={() => setActiveTab('ALL_REMARKS')}
                className={`px-3 py-1 rounded-lg transition ${activeTab === 'ALL_REMARKS' ? 'bg-amber-500 text-black shadow' : 'text-slate-400 hover:text-white'}`}
              >
                📝 सर्व रिमार्क्स ({allRemarksList.length})
              </button>
            </div>

            <button onClick={onClose} className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================== */}
        {/* #SECTION 5: TAB 1 - OFFICER CALLING STATS (रँकशिवाय) */}
        {/* ========================================== */}
        {activeTab === 'LEADERBOARD' && (
          <div className="p-3 sm:p-5 overflow-y-auto space-y-3 flex-1">
            {officerStats.length === 0 ? (
              <p className="text-center text-slate-400 text-xs py-12">अद्याप कोणत्याही सदस्याने रिमार्क नोंदवलेला नाही.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {officerStats.map((officer, idx) => (
                  <div 
                    key={officer.email || idx} 
                    className="p-3.5 rounded-2xl border border-slate-800 bg-slate-950/80 flex justify-between items-center gap-3 relative hover:border-slate-700 transition"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold">
                          <UserCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-xs sm:text-sm text-white">{officer.name}</h4>
                          <p className="text-[10px] text-amber-400/90 font-semibold uppercase tracking-wider">
                            {officer.role}
                          </p>
                        </div>
                      </div>

                      {officer.lastActive && (
                        <p className="text-[10px] text-slate-400 pt-1 flex items-center gap-1 font-sans">
                          <Calendar className="w-3 h-3 text-slate-500" /> 
                          शेवटचा रिमार्क: {officer.lastActive.toLocaleTimeString('mr-IN', { hour: '2-digit', minute: '2-digit' })} ({officer.lastActive.toLocaleDateString('mr-IN')})
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-right">
                        <p className="text-base font-black text-amber-300 font-mono leading-tight">{officer.uniqueTeamsCount}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">संपर्क टीम्स</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================== */}
        {/* #SECTION 6: TAB 2 - ALL REMARKS FEED       */}
        {/* ========================================== */}
        {activeTab === 'ALL_REMARKS' && (
          <div className="p-3 sm:p-4 overflow-y-auto space-y-3 flex-1">
            {/* Search Input for Remarks */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-amber-400/60" />
              <input
                type="text"
                placeholder="टीमचे नाव, रिमार्क मजकूर किंवा नावाने शोधा..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            {filteredRemarks.length === 0 ? (
              <p className="text-center text-slate-400 text-xs py-12">कोणताही रिमार्क सापडला नाही.</p>
            ) : (
              <div className="space-y-2">
                {filteredRemarks.map((remark, idx) => (
                  <div key={remark.id || idx} className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1.5 hover:border-slate-700 transition">
                    <div className="flex items-center justify-between flex-wrap gap-1 border-b border-slate-800/80 pb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          #{remark.teamId}
                        </span>
                        <h5 className="font-extrabold text-xs text-white">{toTitleCase(remark.teamName)}</h5>
                        <span className="text-[10px] text-slate-400 font-sans">({remark.district})</span>
                      </div>

                      <span className="text-[10px] text-slate-400 font-sans">
                        {remark.createdAt ? new Date(remark.createdAt).toLocaleString('mr-IN') : ''}
                      </span>
                    </div>

                    <div className="text-xs text-slate-200 pl-1">
                      <p className="leading-snug">{remark.text}</p>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                      <span className="font-bold text-amber-400 flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-emerald-400" />
                        {remark.byName || remark.name} ({remark.role || 'Officer'})
                      </span>

                      <button
                        onClick={() => { onClose(); onSelectTeam(remark.teamRef); }}
                        className="text-amber-400 font-bold hover:underline cursor-pointer"
                      >
                        टीम उघडा ➔
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}