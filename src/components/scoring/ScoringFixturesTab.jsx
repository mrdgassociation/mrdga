// ==========================================
// #SECTION: SCORING FIXTURES TAB (HORIZONTAL LIST-CARD VIEW FOR SINGLE & CONCUR)
// ==========================================
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { 
  Calendar, Layers, Users, Swords, Play, 
  MapPin, CheckCircle2, Trophy, Clock, ShieldAlert, Sparkles
} from 'lucide-react';

export default function ScoringFixturesTab({ tournamentId, onGoToScoring }) {
  const [rounds, setRounds] = useState([]);
  const [selectedRoundId, setSelectedRoundId] = useState('');
  const [fixtures, setFixtures] = useState({});
  const [teams, setTeams] = useState([]);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1️⃣ सर्व फेऱ्या व संघ फेच करणे
  useEffect(() => {
    if (!tournamentId) return;
    const fetchInitial = async () => {
      setLoading(true);
      try {
        const rSnap = await getDocs(
          query(collection(db, 'dahi_handi_tournaments', tournamentId, 'rounds'), orderBy('createdAt', 'asc'))
        );
        const rList = rSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        rList.sort((a, b) => parseFloat(a.roundNumber) - parseFloat(b.roundNumber));
        setRounds(rList);

        if (rList.length > 0) {
          setSelectedRoundId(rList[0].id);
        }

        const tSnap = await getDocs(collection(db, 'dahi_handi_tournaments', tournamentId, 'teams'));
        setTeams(tSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const sSnap = await getDocs(collection(db, 'dahi_handi_tournaments', tournamentId, 'scores'));
        setScores(sSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Fixtures initial load error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchInitial();
  }, [tournamentId]);

  // 2️⃣ निवडलेल्या फेरीचे Fixtures लोड करणे
  useEffect(() => {
    if (!tournamentId || !selectedRoundId) return;
    const loadFixtures = async () => {
      try {
        const fixSnap = await getDocs(
          collection(db, 'dahi_handi_tournaments', tournamentId, 'rounds', selectedRoundId, 'fixtures')
        );
        const fMap = {};
        fixSnap.docs.forEach(d => { fMap[d.id] = d.data(); });
        setFixtures(fMap);
      } catch (e) {
        console.error("Fixture load error:", e);
      }
    };
    loadFixtures();
  }, [tournamentId, selectedRoundId]);

  const currentRound = rounds.find(r => r.id === selectedRoundId);
  const isGroupBased = currentRound?.matchFormat === 'GROUP' || currentRound?.matchFormat === 'GROUP_DUEL';
  const isGroupDuel = currentRound?.matchFormat === 'GROUP_DUEL' || (currentRound?.matchFormat === 'GROUP' && currentRound?.groupExecutionType === 'DUEL');
  const isPureDuel = currentRound?.matchFormat === 'DUEL';
  const isSingleSlot = currentRound?.matchFormat === 'SINGLE';
  const isFormationConcur = currentRound?.matchFormat === 'FORMATION_DIFFICULTY' || currentRound?.matchFormat === 'CONCUR';
  
  const roundScores = scores.filter(s => s.roundId === selectedRoundId);
  const activeGroups = currentRound?.groupList?.length ? currentRound.groupList : ['Group A', 'Group B', 'Group C', 'Group D'];

  return (
    <div className="space-y-4 text-white font-sans w-full">
      
      {/* 🔝 हेडर व फेरी सिलेक्टर */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-[#0c0d14] border border-amber-500/20 p-3.5 sm:p-4 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
              📅 अधिकृत सामने व वेळापत्रक (Official Match Schedule)
            </h2>
            <p className="text-[10px] text-gray-400">
              फेरी: <b className="text-amber-300">{currentRound?.roundName || 'फेरी निवडा'}</b> • फॉरमॅट: <b className="text-emerald-400">{isFormationConcur ? 'Formation / Concur' : currentRound?.matchFormat}</b>
            </p>
          </div>
        </div>

        {/* Round Switcher */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 bg-black/60 px-3 py-1.5 rounded-xl border border-white/10 w-full sm:w-auto">
            <span className="text-[11px] font-bold text-gray-400">फेरी निवडा:</span>
            <select
              value={selectedRoundId}
              onChange={(e) => setSelectedRoundId(e.target.value)}
              className="bg-transparent text-amber-400 font-bold text-xs focus:outline-none cursor-pointer"
            >
              {rounds.map(r => (
                <option key={r.id} value={r.id} className="bg-slate-900 text-white">
                  फेरी #{r.roundNumber}: {r.roundName}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => onGoToScoring && onGoToScoring(selectedRoundId)}
            className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md transition cursor-pointer shrink-0"
          >
            <Play className="w-3.5 h-3.5" /> स्कोअरिंगला जा
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-400 text-xs animate-pulse font-bold">सामने लोड होत आहेत...</div>
      ) : Object.keys(fixtures).length === 0 ? (
        <div className="p-10 text-center bg-black/40 border border-dashed border-amber-500/20 rounded-3xl space-y-2">
          <Calendar className="w-8 h-8 text-amber-400/50 mx-auto" />
          <p className="text-xs text-gray-400 font-bold">या फेरीसाठी अद्याप सामने किंवा संघ सेव्ह केलेले नाहीत.</p>
          <p className="text-[11px] text-gray-500">"२. फेऱ्या & नियम" टॅबमध्ये जाऊन या फेरीचे संघ व सामने सेव्ह करा.</p>
        </div>
      ) : (
        <div className="space-y-4">
          
          {/* 🎯 प्रकार १: GROUP DUEL (गट अंतर्गत १ विरुद्ध १ सामने) */}
          {isGroupDuel && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {activeGroups.map(grpName => {
                const grpTeams = teams.filter(t => fixtures[t.id]?.group === grpName);
                
                const m1_t1 = grpTeams.find(t => fixtures[t.id]?.duelMatchNo === 1 && fixtures[t.id]?.duelSide === 'FOP1');
                const m1_t2 = grpTeams.find(t => fixtures[t.id]?.duelMatchNo === 1 && fixtures[t.id]?.duelSide === 'FOP2');
                const m2_t1 = grpTeams.find(t => fixtures[t.id]?.duelMatchNo === 2 && fixtures[t.id]?.duelSide === 'FOP1');
                const m2_t2 = grpTeams.find(t => fixtures[t.id]?.duelMatchNo === 2 && fixtures[t.id]?.duelSide === 'FOP2');

                const m1_s1 = roundScores.find(s => s.teamId === m1_t1?.id);
                const m1_s2 = roundScores.find(s => s.teamId === m1_t2?.id);
                const m2_s1 = roundScores.find(s => s.teamId === m2_t1?.id);
                const m2_s2 = roundScores.find(s => s.teamId === m2_t2?.id);

                return (
                  <div key={grpName} className="bg-[#0c0d14] border border-orange-500/30 rounded-3xl p-4 space-y-3.5 shadow-xl">
                    <div className="flex justify-between items-center bg-black/60 p-2 rounded-2xl border border-white/5">
                      <span className="font-black text-orange-400 text-xs flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" /> {grpName}
                      </span>
                      <span className="text-[9px] bg-orange-500/20 text-orange-300 font-bold px-2 py-0.5 rounded-full border border-orange-500/30 font-mono">
                        २ द्वंद्व सामने
                      </span>
                    </div>

                    {/* सामना #१ */}
                    <div className="bg-black/60 border border-white/5 rounded-2xl p-3 space-y-2">
                      <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold border-b border-white/5 pb-1">
                        <span className="text-amber-400 font-mono">सामना #१ (1 vs 4)</span>
                        <span className="text-[9px]">{m1_s1 && m1_s2 ? '✅ पूर्ण' : '⏳ बाकी'}</span>
                      </div>

                      <div className="flex justify-between items-center text-xs">
                        <span className="font-extrabold text-white truncate max-w-[140px]">{m1_t1?.teamName || '-'}</span>
                        {m1_s1 && <span className="font-mono text-emerald-400 font-bold text-[11px]">{m1_s1.pointsAwarded} pts</span>}
                      </div>

                      <div className="text-center font-black text-[9px] text-rose-400 font-mono">VS</div>

                      <div className="flex justify-between items-center text-xs">
                        <span className="font-extrabold text-white truncate max-w-[140px]">{m1_t2?.teamName || '-'}</span>
                        {m1_s2 && <span className="font-mono text-emerald-400 font-bold text-[11px]">{m1_s2.pointsAwarded} pts</span>}
                      </div>
                    </div>

                    {/* सामना #२ */}
                    <div className="bg-black/60 border border-white/5 rounded-2xl p-3 space-y-2">
                      <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold border-b border-white/5 pb-1">
                        <span className="text-amber-400 font-mono">सामना #२ (2 vs 3)</span>
                        <span className="text-[9px]">{m2_s1 && m2_s2 ? '✅ पूर्ण' : '⏳ बाकी'}</span>
                      </div>

                      <div className="flex justify-between items-center text-xs">
                        <span className="font-extrabold text-white truncate max-w-[140px]">{m2_t1?.teamName || '-'}</span>
                        {m2_s1 && <span className="font-mono text-emerald-400 font-bold text-[11px]">{m2_s1.pointsAwarded} pts</span>}
                      </div>

                      <div className="text-center font-black text-[9px] text-rose-400 font-mono">VS</div>

                      <div className="flex justify-between items-center text-xs">
                        <span className="font-extrabold text-white truncate max-w-[140px]">{m2_t2?.teamName || '-'}</span>
                        {m2_s2 && <span className="font-mono text-emerald-400 font-bold text-[11px]">{m2_s2.pointsAwarded} pts</span>}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

          {/* 🎯 प्रकार २: GROUP SYNC (गट सामने - सर्व संघ एकदम) */}
          {isGroupBased && !isGroupDuel && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {activeGroups.map(grpName => {
                const grpTeams = teams
                  .filter(t => fixtures[t.id]?.group === grpName)
                  .sort((a, b) => (fixtures[a.id]?.slotNumber || 0) - (fixtures[b.id]?.slotNumber || 0));

                return (
                  <div key={grpName} className="bg-[#0c0d14] border border-blue-500/30 rounded-3xl p-4 space-y-3 shadow-xl">
                    <div className="flex justify-between items-center bg-black/60 p-2 rounded-2xl border border-white/5">
                      <span className="font-black text-blue-300 text-xs flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" /> {grpName}
                      </span>
                      <span className="text-[9px] bg-blue-500/20 text-blue-300 font-bold px-2 py-0.5 rounded-full font-mono">
                        {grpTeams.length} संघ (Group Sync)
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {grpTeams.map((team, idx) => {
                        const teamScore = roundScores.find(s => s.teamId === team.id);

                        return (
                          <div key={team.id} className="bg-slate-900/90 border border-white/5 p-2 rounded-xl flex items-center justify-between gap-1 text-xs">
                            <div className="flex items-center gap-2 truncate">
                              <span className="w-5 h-5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black font-mono flex items-center justify-center shrink-0">
                                #{idx + 1}
                              </span>
                              <span className="font-bold text-white truncate">{team.teamName}</span>
                            </div>
                            <div className="text-right shrink-0">
                              {teamScore ? (
                                <span className="font-mono text-[11px] font-black text-emerald-400">{teamScore.pointsAwarded} pts</span>
                              ) : (
                                <span className="text-[9px] text-gray-500 font-mono">Pending</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 🎯 प्रकार ३: OVERALL DUEL / KNOCKOUT (थेट १ विरुद्ध १ सामने) */}
          {isPureDuel && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: Math.floor((Number(currentRound?.qualifiedTeamsCount) || 8) / 2) }).map((_, mIdx) => {
                const matchNo = mIdx + 1;
                const t1 = teams.find(t => fixtures[t.id]?.duelMatchNo === matchNo && fixtures[t.id]?.duelSide === 'FOP1');
                const t2 = teams.find(t => fixtures[t.id]?.duelMatchNo === matchNo && fixtures[t.id]?.duelSide === 'FOP2');

                const s1 = roundScores.find(s => s.teamId === t1?.id);
                const s2 = roundScores.find(s => s.teamId === t2?.id);

                return (
                  <div key={matchNo} className="bg-[#0c0d14] border border-orange-500/30 rounded-3xl p-4 space-y-3 shadow-xl">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2 text-xs font-black text-orange-400 font-mono">
                      <span className="flex items-center gap-1">
                        <Swords className="w-3.5 h-3.5" /> सामना #{matchNo}
                      </span>
                      <span className="text-[9px] text-gray-400">{s1 && s2 ? '✅ पूर्ण' : '⏳ चालू'}</span>
                    </div>

                    <div className="bg-black/60 p-2.5 rounded-2xl border border-white/5 space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-extrabold text-white truncate max-w-[130px]">{t1?.teamName || '-'}</span>
                        {s1 && <span className="font-mono text-emerald-400 font-bold">{s1.finalFormattedTime}</span>}
                      </div>

                      <div className="text-center font-black text-[9px] text-rose-400 font-mono">VS</div>

                      <div className="flex justify-between items-center text-xs">
                        <span className="font-extrabold text-white truncate max-w-[130px]">{t2?.teamName || '-'}</span>
                        {s2 && <span className="font-mono text-emerald-400 font-bold">{s2.finalFormattedTime}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 🎯 प्रकार ४: SINGLE SLOT (एकाखाली एक सुटसुटीत लिस्ट कार्ड्स) */}
          {isSingleSlot && (
            <div className="bg-[#0c0d14] border border-amber-500/20 rounded-3xl p-4 sm:p-5 space-y-3.5 shadow-xl">
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs sm:text-sm font-black text-white">
                    ⏱️ एकल स्लॉट सामने क्रमवारी (Single Slot Execution Schedule)
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-gray-400 font-bold">
                  {roundScores.length} / {Object.keys(fixtures).length} सामने पूर्ण
                </span>
              </div>

              <div className="space-y-2">
                {Object.entries(fixtures)
                  .sort((a, b) => (a[1].slotNumber || 0) - (b[1].slotNumber || 0))
                  .map(([tId, fix]) => {
                    const tObj = teams.find(t => t.id === tId);
                    const tScore = roundScores.find(s => s.teamId === tId);

                    return (
                      <div 
                        key={tId} 
                        className="bg-slate-900/80 hover:bg-slate-900 border border-white/5 hover:border-amber-500/30 p-3 sm:p-3.5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 transition shadow"
                      >
                        <div className="flex items-center gap-3 w-full sm:w-auto truncate">
                          <span className="w-7 h-7 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono font-black text-xs flex items-center justify-center shrink-0">
                            #{fix.slotNumber || 1}
                          </span>
                          <div className="truncate">
                            <h4 className="font-extrabold text-white text-xs sm:text-sm truncate">{tObj?.teamName || fix.teamName}</h4>
                            <p className="text-[10px] text-gray-400">#{tObj?.chestNumber || '-'} • {tObj?.city || 'महाराष्ट्र'}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                          <div className="text-left sm:text-right">
                            <span className="text-[9px] text-gray-500 block font-mono">वेळ व गुण:</span>
                            <span className="font-mono text-xs font-black text-amber-400">
                              {tScore ? `${tScore.pointsAwarded} pts (${tScore.finalFormattedTime})` : '—'}
                            </span>
                          </div>

                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-xl shrink-0 ${
                            tScore ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-white/5 text-gray-400 border border-white/5'
                          }`}>
                            {tScore ? '✅ पूर्ण' : '⏳ स्टेजवर बाकी'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* 🎯 प्रकार ५: FORMATION / CONCUR (एकाखाली एक सुटसुटीत लिस्ट कार्ड्स) */}
          {isFormationConcur && (
            <div className="bg-[#0c0d14] border border-amber-500/30 rounded-3xl p-4 sm:p-5 space-y-4 shadow-xl">
              
              {/* Header & Rules Info */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                      🏆 Formation / Concur — अधिकृत संघ व आव्हान वेळापत्रक
                    </h3>
                    <p className="text-[10px] text-gray-400">
                      थर: <b className="text-amber-300">{currentRound?.tierHeight || 7}</b> • तयारी वेळ: <b className="text-orange-400">{currentRound?.preparationTime || 60}s</b> • रचना गुणतक्त्यानुसार स्कोअरिंग
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 font-bold">
                  {roundScores.length} / {Object.keys(fixtures).length} संघ पूर्ण
                </span>
              </div>

              {/* Concur Formations Points Reference Pills */}
              {currentRound?.formationList?.length > 0 && (
                <div className="p-3 bg-black/50 border border-white/5 rounded-2xl space-y-1.5">
                  <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> या फेरीतील उपलब्ध रचना (Formations Matrix):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {currentRound.formationList.map((fmt, fIdx) => (
                      <span key={fIdx} className="text-[9px] font-mono bg-slate-900 border border-slate-700 text-gray-300 px-2 py-0.5 rounded-lg">
                        <b>{fmt.name}</b> ({fmt.structure}) : <span className="text-emerald-400 font-bold">{fmt.descarregat}</span> / <span className="text-amber-400">{fmt.carregat}</span> pts
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Concur Horizontal List Cards */}
              <div className="space-y-2">
                {Object.entries(fixtures)
                  .sort((a, b) => (a[1].slotNumber || 0) - (b[1].slotNumber || 0))
                  .map(([tId, fix]) => {
                    const tObj = teams.find(t => t.id === tId);
                    const tScore = roundScores.find(s => s.teamId === tId);

                    return (
                      <div 
                        key={tId} 
                        className="bg-slate-900/80 hover:bg-slate-900 border border-amber-500/20 hover:border-amber-500/40 p-3 sm:p-3.5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 transition shadow-lg"
                      >
                        <div className="flex items-center gap-3 w-full sm:w-auto truncate">
                          <span className="w-7 h-7 rounded-xl bg-amber-500 text-black font-mono font-black text-xs flex items-center justify-center shrink-0 shadow">
                            #{fix.slotNumber || 1}
                          </span>
                          <div className="truncate">
                            <h4 className="font-extrabold text-white text-xs sm:text-sm truncate">{tObj?.teamName || fix.teamName}</h4>
                            <p className="text-[10px] text-gray-400">#{tObj?.chestNumber || '-'} • {tObj?.city || 'महाराष्ट्र'}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                          {tScore ? (
                            <div className="flex items-center gap-3 text-left sm:text-right font-mono">
                              <div>
                                <span className="text-[9px] text-gray-500 block">रचना:</span>
                                <span className="text-blue-300 font-bold text-[11px]">{tScore.formationName || 'Standard'}</span>
                              </div>
                              <div>
                                <span className="text-[9px] text-gray-500 block">स्थिती:</span>
                                <span className={`text-[11px] font-black ${tScore.situation === 'DESCARREGAT' ? 'text-emerald-400' : tScore.situation === 'CARREGAT' ? 'text-amber-400' : 'text-rose-400'}`}>
                                  {tScore.situation}
                                </span>
                              </div>
                              <div>
                                <span className="text-[9px] text-gray-500 block">गुण:</span>
                                <span className="text-amber-400 font-black text-xs sm:text-sm">{tScore.pointsAwarded} pts</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-[10px] text-gray-500 font-mono">Pending Challenge</span>
                          )}

                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-xl shrink-0 ${
                            tScore ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-white/5 text-gray-400 border border-white/5'
                          }`}>
                            {tScore ? '✅ पूर्ण' : '⏳ बाकी'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}