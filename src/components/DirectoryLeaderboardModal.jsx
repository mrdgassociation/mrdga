// ==========================================
// #SECTION: DIRECTORY CALLING LEADERBOARD MODAL
// ==========================================
import React, { useState, useMemo } from 'react';
import { 
  X, BarChart2, MessageSquareCheck, ChevronDown, 
  ChevronUp, Building2, UserCheck, MessageSquare 
} from 'lucide-react';

export default function DirectoryLeaderboardModal({ remarksData = [], directoryTeams = [], onClose }) {
  const [expandedUser, setExpandedUser] = useState(null);

  // 🗺️ फोनवरून मंडळाचे नाव शोधणे
  const teamLookup = useMemo(() => {
    const map = {};
    if (Array.isArray(directoryTeams)) {
      directoryTeams.forEach(t => {
        if (t.id) map[t.id] = t;
        if (t.phone) map[String(t.phone).replace(/[^0-9]/g, '')] = t;
        if (t.teamName) map[t.teamName.toLowerCase().trim()] = t;
      });
    }
    return map;
  }, [directoryTeams]);

  // 📊 Col E मधून ॲडमिनचे नाव काढून ग्रुप करणे
  const leaderboardList = useMemo(() => {
    const callerMap = {};

    const list = Array.isArray(remarksData) 
      ? remarksData 
      : Object.values(remarksData);

    list.forEach((item) => {
      let rawColE = '';
      let remarkText = '';
      let teamName = '';
      let phone = '';

      if (typeof item === 'object' && item !== null) {
        rawColE = item.updatedBy || item.callerName || item.byName || item.user || '';
        remarkText = item.remark || item.comment || item.text || '';
        teamName = item.teamName || '';
        phone = item.phone ? String(item.phone).replace(/[^0-9]/g, '') : '';
      } else if (typeof item === 'string') {
        remarkText = item;
      }

      // 🎯 Col E चे फॉरमॅटिंग: "रूपेश तेली (rupesh@gmail.com)" -> "रूपेश तेली"
      let cleanAdminName = '';
      if (rawColE) {
        // ब्रॅकेटमधील ईमेल (abc@xyz.com) काढून टाकणे
        cleanAdminName = rawColE.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
      }

      // जर नाव रिकामे असेल तर कॉलिंग टीम नाव देणे
      if (!cleanAdminName || cleanAdminName.toLowerCase() === 'undefined' || cleanAdminName.toLowerCase() === 'null') {
        cleanAdminName = 'इतर / कॉलिंग टीम';
      }

      // टायटल केस (Pahile akshar mothe)
      cleanAdminName = cleanAdminName.charAt(0).toUpperCase() + cleanAdminName.slice(1);

      // मंडळाची माहिती शोधणे
      const matchedTeam = teamLookup[phone] || teamLookup[teamName.toLowerCase().trim()] || {};
      const finalTeamName = teamName || matchedTeam.teamName || `मंडळ (${phone || 'N/A'})`;
      const finalContact = matchedTeam.contactPerson || '';
      const finalArea = matchedTeam.area || matchedTeam.vibhag || matchedTeam.district || '';

      if (!callerMap[cleanAdminName]) {
        callerMap[cleanAdminName] = {
          name: cleanAdminName,
          count: 0,
          teamsCalled: []
        };
      }

      callerMap[cleanAdminName].count += 1;
      callerMap[cleanAdminName].teamsCalled.push({
        teamName: finalTeamName,
        contactPerson: finalContact,
        area: finalArea,
        phone: phone || matchedTeam.phone || '',
        remark: remarkText
      });
    });

    // जास्त काउंट असलेल्याला वरती (Descending Order)
    return Object.values(callerMap).sort((a, b) => b.count - a.count);
  }, [remarksData, teamLookup]);

  const totalCalls = leaderboardList.reduce((acc, curr) => acc + curr.count, 0);

  const toggleUserAccordion = (userName) => {
    setExpandedUser(prev => prev === userName ? null : userName);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 font-sans">
      <div className="bg-[#0c0d14] border border-amber-500/40 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-white/10 bg-slate-900/80 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base text-white leading-tight">
                कॉलिंग & संपर्क आकडेवारी (Leaderboard)
              </h3>
              <p className="text-[11px] text-slate-400">
                एकूण नोंदवलेले कॉल्स: <b className="text-amber-400 font-mono">{totalCalls}</b> • सक्रिय ॲडमिन्स: <b className="text-white font-mono">{leaderboardList.length}</b>
              </p>
            </div>
          </div>

          <button 
            type="button" 
            onClick={onClose} 
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content List */}
        <div className="p-3 sm:p-4 overflow-y-auto space-y-2.5 flex-1">
          {leaderboardList.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-medium bg-slate-900/40 rounded-2xl border border-dashed border-slate-800">
              अद्याप कोणतीही कॉलिंग नोंद उपलब्ध नाही.
            </div>
          ) : (
            leaderboardList.map((caller, idx) => {
              const isExpanded = expandedUser === caller.name;

              return (
                <div 
                  key={caller.name} 
                  className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden transition shadow-md"
                >
                  {/* User Main Row */}
                  <div 
                    onClick={() => toggleUserAccordion(caller.name)}
                    className="p-3 flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-800/60 select-none transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-slate-950 border border-slate-700 text-amber-400 font-mono font-black text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      
                      <div className="truncate">
                        <p className="font-extrabold text-xs sm:text-sm text-white flex items-center gap-1.5 truncate">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{caller.name}</span>
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {caller.count} मंडळांना संपर्क केला • <span className="text-amber-400 font-semibold underline">मंडळे पाहण्यासाठी क्लिक करा</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800 flex items-center gap-1.5">
                        <MessageSquareCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-xs font-black text-amber-300 font-mono">{caller.count}</span>
                        <span className="text-[10px] text-slate-500">कॉल्स</span>
                      </div>

                      <div className="p-1 rounded-lg bg-slate-800 text-slate-400">
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-amber-400" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* 🎯 Accordion: संबंधित ॲडमिनने कॉल केलेली सर्व मंडळे */}
                  {isExpanded && (
                    <div className="p-3 bg-slate-950/90 border-t border-slate-800 space-y-2">
                      <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-amber-400" />
                        <span>{caller.name} यांनी संपर्क केलेली मंडळे ({caller.teamsCalled.length}):</span>
                      </div>

                      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                        {caller.teamsCalled.map((t, tIdx) => (
                          <div 
                            key={tIdx}
                            className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-1"
                          >
                            <div className="flex justify-between items-start gap-1">
                              <span className="font-extrabold text-white text-[11px] leading-tight">
                                {tIdx + 1}. {t.teamName}
                              </span>
                              {t.area && (
                                <span className="text-[9px] bg-amber-500/10 text-amber-300 border border-amber-500/20 px-1.5 py-0.2 rounded shrink-0">
                                  {t.area}
                                </span>
                              )}
                            </div>

                            {t.contactPerson && (
                              <p className="text-[10px] text-slate-400">
                                संपर्क: <b className="text-slate-300">{t.contactPerson}</b> {t.phone ? `(${t.phone})` : ''}
                              </p>
                            )}

                            {t.remark && (
                              <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800/80 text-[10px] text-emerald-300 flex items-start gap-1">
                                <MessageSquare className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                                <span className="italic leading-relaxed">{t.remark}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/10 bg-slate-900/80 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-400">
            एकूण नोंदी: <b className="text-white font-mono">{totalCalls}</b>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs rounded-xl transition cursor-pointer"
          >
            बंद करा
          </button>
        </div>

      </div>
    </div>
  );
}