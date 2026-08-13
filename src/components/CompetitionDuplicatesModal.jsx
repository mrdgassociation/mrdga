// ==========================================
// #SECTION 1: IMPORTS & COMPONENT INITIALIZATION
// ==========================================
import React from 'react';
import { X, Copy, Phone, MessageSquare, AlertTriangle, ArrowRight, Layers } from 'lucide-react';

export default function CompetitionDuplicatesModal({ duplicateTeams = [], onClose, onSelectTeam }) {
  // 🛡️ सेफ्टी फॉलबॅक: डेटा कसाही आला तरी ॲप क्रॅश होणार नाही
  const rawData = Array.isArray(duplicateTeams) ? duplicateTeams : [];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto font-sans">
      <div className="bg-[#0c0d14] border border-rose-500/40 w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] text-white">
        
        {/* ========================================== */}
        {/* #SECTION 2: MODAL HEADER                   */}
        {/* ========================================== */}
        <div className="p-3.5 border-b border-slate-800 bg-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl">
              <Copy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-xs sm:text-sm text-rose-400 flex items-center gap-1.5">
                दुबार नोंदणी तुलना तक्ता (Duplicate Entries Comparison)
              </h3>
              <p className="text-[10px] text-slate-400">
                नाव, मोबाईल नंबर किंवा गटामधील (M7/M6/W) दुबार नोंदी ({rawData.length} गट आढळले)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ========================================== */}
        {/* #SECTION 3: DUPLICATE GROUPS COMPARISON     */}
        {/* ========================================== */}
        <div className="p-3 sm:p-4 overflow-y-auto space-y-4 flex-1">
          {rawData.length === 0 ? (
            <p className="text-center text-slate-400 text-xs py-12">कोणतीही दुबार (Duplicate) नोंदणी सापडली नाही.</p>
          ) : (
            rawData.map((group, groupIdx) => {
              const groupTeams = group.teams || [group];
              const matchKey = group.matchKey || group.teamName || 'संघाचे नाव';
              const matchReason = group.matchReason || 'दुबार नोंदणी';

              return (
                <div 
                  key={groupIdx} 
                  className="bg-slate-900/90 border border-rose-500/30 rounded-2xl p-3 space-y-2.5 shadow-lg"
                >
                  {/* Group Title Badge */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 flex-wrap gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-400" /> गट #{groupIdx + 1}
                      </span>
                      <h4 className="font-extrabold text-xs text-white">
                        {matchKey}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-rose-400 font-bold bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/40">
                        {matchReason}
                      </span>
                      <span className="text-[10px] text-amber-300 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-bold">
                        {groupTeams.length} नोंदी
                      </span>
                    </div>
                  </div>

                  {/* Side-by-Side Cards Comparison Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {groupTeams.map((team) => {
                      const c1Name = team.captain?.name || team.contact1?.name || 'N/A';
                      const c1Phone = team.captain?.phone || team.contact1?.phone || '';
                      const c2Name = team.manager?.name || team.contact2?.name || '';
                      const c2Phone = team.manager?.phone || team.contact2?.phone || '';

                      return (
                        <div 
                          key={team.registrationId} 
                          className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 hover:border-amber-500/40 transition relative flex flex-col justify-between"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                Reg ID: #{team.registrationId}
                              </span>
                              
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center gap-1">
                                <Layers className="w-3 h-3 text-indigo-400" /> गट: {team.category || 'M7'}
                              </span>
                            </div>

                            <h5 className="font-extrabold text-xs text-white leading-tight">{team.teamName}</h5>

                            <div className="text-[11px] text-slate-300 space-y-1 bg-slate-900/60 p-2 rounded-lg border border-slate-800/80 font-sans">
                              <p><span className="text-slate-400">जिल्हा/विभाग:</span> <b>{team.district}</b> ({team.vibhag || '-'})</p>
                              <p><span className="text-slate-400">कॅप्टन:</span> <b>{c1Name}</b> <span className="font-mono text-amber-300">({c1Phone || '-'})</span></p>
                              {c2Name && <p><span className="text-slate-400">मॅनेजर:</span> <b>{c2Name}</b> <span className="font-mono text-amber-300">({c2Phone || '-'})</span></p>}
                              
                              {team.createdAt && (
                                <p className="text-[10px] text-slate-400 pt-0.5 border-t border-slate-800/60 mt-1">
                                  अर्ज वेळ: {new Date(team.createdAt).toLocaleString('mr-IN')}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-800 mt-2">
                            <div className="flex items-center gap-1">
                              {c1Phone && (
                                <a 
                                  href={`tel:${c1Phone}`} 
                                  className="p-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-500/30 rounded-lg text-xs font-bold transition"
                                  title="कॉल करा"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                </a>
                              )}
                              {c1Phone && (
                                <a 
                                  href={`https://wa.me/91${c1Phone}`} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="p-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-500/30 rounded-lg text-xs font-bold transition"
                                  title="व्हॉट्सॲप"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>

                            <button
                              onClick={() => { onClose(); onSelectTeam(team); }}
                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-[11px] rounded-lg transition cursor-pointer flex items-center gap-1"
                            >
                              <span>ही नोंद तपासा / रिमार्क</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>

                        </div>
                      );
                    })}
                  </div>

                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}