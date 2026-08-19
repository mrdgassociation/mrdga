// ==========================================
// #SECTION: DAHI HANDI TOURNAMENT RANKINGS & CUMULATIVE STANDINGS (GROUP-WISE DUEL SUPPORT)
// ==========================================
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { 
  Trophy, Award, Users, Layers, Clock, 
  AlertTriangle, Filter, CheckCircle2, Swords
} from 'lucide-react';

export default function ScoringLeaderboardTab({ tournamentId, onNavigateToDuels }) {
  const [rounds, setRounds] = useState([]);
  const [teams, setTeams] = useState([]);
  const [fixtures, setFixtures] = useState({});
  const [allScores, setAllScores] = useState([]);
  const [loading, setLoading] = useState(true);

  // 'ALL' | 'R1_R2' | 'ROUND_ID'
  const [selectedFilter, setSelectedFilter] = useState('R1_R2'); 
  const [activeViewType, setActiveViewType] = useState('GROUP'); // 'GROUP' | 'OVERALL'

  // 1. Data Load Karne
  useEffect(() => {
    if (!tournamentId) return;
    setLoading(true);

    const loadInitialData = async () => {
      try {
        // Rounds
        const rSnap = await getDocs(collection(db, 'dahi_handi_tournaments', tournamentId, 'rounds'));
        const rList = rSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        rList.sort((a, b) => (Number(a.roundNumber) || 0) - (Number(b.roundNumber) || 0));
        setRounds(rList);

        // Teams
        const tSnap = await getDocs(collection(db, 'dahi_handi_tournaments', tournamentId, 'teams'));
        const tList = tSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setTeams(tList);

        // Fixtures (Round 1 varun groups ghene)
        if (rList.length > 0) {
          const r1Id = rList.find(r => Number(r.roundNumber) === 1)?.id || rList[0].id;
          const fixSnap = await getDocs(
            collection(db, 'dahi_handi_tournaments', tournamentId, 'rounds', r1Id, 'fixtures')
          );
          const fMap = {};
          fixSnap.docs.forEach(d => { fMap[d.id] = d.data(); });
          setFixtures(fMap);
        }
      } catch (err) {
        console.error("Error loading standings data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();

    // Realtime Scores
    const unsub = onSnapshot(collection(db, 'dahi_handi_tournaments', tournamentId, 'scores'), (snap) => {
      const sList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllScores(sList);
    });

    return () => unsub();
  }, [tournamentId]);

  // Filtered Scores ghene
  const getFilteredScores = () => {
    if (selectedFilter === 'ALL') {
      return allScores;
    }
    if (selectedFilter === 'R1_R2') {
      const r1 = rounds.find(r => Number(r.roundNumber) === 1)?.id;
      const r2 = rounds.find(r => Number(r.roundNumber) === 2)?.id;
      return allScores.filter(s => s.roundId === r1 || s.roundId === r2);
    }
    return allScores.filter(s => s.roundId === selectedFilter);
  };

  const filteredScores = getFilteredScores();

  // Standings Calculation
  const calculateStandings = () => {
    return teams.map(t => {
      const teamScores = filteredScores.filter(s => s.teamId === t.id);
      
      const totalPoints = teamScores.reduce((sum, s) => sum + (Number(s.pointsAwarded) || 0), 0);
      const totalPenaltySec = teamScores.reduce((sum, s) => sum + (Number(s.penaltySec) || 0), 0);
      const totalDeductedPts = teamScores.reduce((sum, s) => sum + (Number(s.deductedPts) || 0), 0);
      const totalTimingMs = teamScores.reduce((sum, s) => sum + (Number(s.finalTimingMs) || 0), 0);
      const completedMatches = teamScores.length;

      const lastSituation = teamScores[teamScores.length - 1]?.situation || '-';
      const assignedGroup = fixtures[t.id]?.group || 'Group A';

      return {
        ...t,
        group: assignedGroup,
        totalPoints,
        totalPenaltySec,
        totalDeductedPts,
        totalTimingMs,
        completedMatches,
        lastSituation,
        scoresList: teamScores
      };
    });
  };

  const standingsData = calculateStandings();
  const activeGroups = ['Group A', 'Group B', 'Group C', 'Group D'];

  const formatMs = (ms) => {
    const totalSec = Math.floor((ms || 0) / 1000);
    const minutes = Math.floor(totalSec / 60);
    const seconds = totalSec % 60;
    const centiseconds = Math.floor(((ms || 0) % 1000) / 10);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
  };

  // Check karne ki selected round Duel aahe ka
  const currentSelectedRoundObj = rounds.find(r => r.id === selectedFilter);
  const isSelectedRoundDuel = currentSelectedRoundObj?.matchFormat === 'DUEL';

  return (
    <div className="space-y-4 text-white font-sans w-full">
      
      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-[#0c0d14] border border-amber-500/20 p-3.5 sm:p-4 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <Trophy className="w-5 h-5 text-amber-400" />
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              📊 अधिकृत रँकिंग व गुणतक्ता (Official Standings & Leaderboard)
            </h3>
            <p className="text-[10px] text-gray-400">
              फेरीनुसार व एकत्रित गुणांवरून ग्रुप रँकिंग व निकाल तपासा.
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-black/60 px-3 py-1.5 rounded-xl border border-white/10">
            <Filter className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] font-bold text-gray-300">निकाल:</span>
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="bg-transparent text-amber-400 font-bold text-xs focus:outline-none cursor-pointer"
            >
              <option value="R1_R2" className="bg-slate-900 text-white">⚡ Round 1 + Round 2 (एकत्रित गुण)</option>
              <option value="ALL" className="bg-slate-900 text-white">🏆 सर्व फेऱ्यांचा निकाल (Overall)</option>
              {rounds.map(r => (
                <option key={r.id} value={r.id} className="bg-slate-900 text-white">
                  फेरी #{r.roundNumber}: {r.roundName} ({r.matchFormat})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-blue-500/30">
            <button
              onClick={() => setActiveViewType('GROUP')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeViewType === 'GROUP' ? 'bg-blue-500 text-black shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              👥 ग्रुप्सनुसार (A, B, C, D)
            </button>
            <button
              onClick={() => setActiveViewType('OVERALL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeViewType === 'OVERALL' ? 'bg-blue-500 text-black shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              🏆 सर्व १६ संघ (1 to 16)
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* ⚔️ JAR ROUND 3 (DUEL) ASIL TAR: GROUP-WISE HEAD-TO-HEAD DUELS */}
      {/* ============================================================= */}
      {isSelectedRoundDuel && activeViewType === 'GROUP' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {activeGroups.map((grpName) => {
            // Hya group che scores filter karne
            const grpScores = filteredScores.filter(s => s.group === grpName);

            return (
              <div key={grpName} className="bg-[#0c0d14] border border-orange-500/30 rounded-3xl p-3.5 space-y-3 shadow-xl">
                <div className="flex justify-between items-center bg-orange-500/10 border border-orange-500/20 px-3 py-1.5 rounded-xl">
                  <h4 className="text-xs font-black text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Swords className="w-3.5 h-3.5" /> {grpName} - समोरासमोरील निकाल
                  </h4>
                  <span className="text-[10px] font-mono text-gray-400">{grpScores.length} सामने</span>
                </div>

                <div className="space-y-2">
                  {grpScores.length === 0 ? (
                    <div className="text-center py-6 text-gray-600 text-xs">या गटात अद्याप स्कोअर नोंदवला नाही</div>
                  ) : (
                    grpScores.map((s, idx) => (
                      <div key={s.id} className="bg-slate-900/90 border border-white/10 p-2.5 rounded-2xl flex items-center justify-between gap-1 text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <span className={`w-5 h-5 rounded-lg text-[10px] font-black flex items-center justify-center shrink-0 ${
                            s.roundRank === 1 ? 'bg-amber-400 text-black shadow' : 'bg-white/10 text-gray-400'
                          }`}>
                            {s.roundRank || (idx + 1)}
                          </span>
                          <div className="truncate">
                            <h5 className="font-bold text-white truncate">{s.teamName}</h5>
                            <span className="text-[9px] text-gray-400">{s.city}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-mono text-xs font-bold text-emerald-400 block">{s.finalFormattedTime}</span>
                          <span className="text-[10px] text-amber-400 font-black">{s.pointsAwarded} pts</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : activeViewType === 'GROUP' ? (

        /* ============================================================= */
        /* 👥 NORMAL GROUP STANDINGS (Round 1+2 Cumulative Ranks)        */
        /* ============================================================= */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {activeGroups.map((grpName) => {
            const groupTeams = standingsData
              .filter(t => t.group === grpName)
              .sort((a, b) => {
                if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
                return a.totalTimingMs - b.totalTimingMs;
              });

            return (
              <div 
                key={grpName}
                className="bg-[#0c0d14] border border-blue-500/30 rounded-3xl p-3.5 space-y-3 shadow-xl flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-center bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-xl mb-2.5">
                    <h4 className="text-xs font-black text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-400"></span> {grpName}
                    </h4>
                    <span className="text-[10px] font-mono text-gray-400">
                      {selectedFilter === 'R1_R2' ? 'R1+R2 Seed' : 'Standings'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {groupTeams.map((t, idx) => {
                      const rankNum = idx + 1;
                      return (
                        <div 
                          key={t.id}
                          className={`p-2.5 rounded-2xl border transition space-y-1.5 ${
                            rankNum === 1 
                              ? 'bg-amber-500/10 border-amber-500/50 shadow-md' 
                              : rankNum === 2 
                              ? 'bg-slate-800/80 border-slate-600' 
                              : 'bg-black/50 border-white/5'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-2 truncate">
                              <span className={`w-5 h-5 rounded-lg text-[10px] font-black flex items-center justify-center shrink-0 ${
                                rankNum === 1 ? 'bg-amber-400 text-black shadow' :
                                rankNum === 2 ? 'bg-slate-300 text-black' :
                                rankNum === 3 ? 'bg-amber-700 text-white' : 'bg-white/10 text-gray-400'
                              }`}>
                                {rankNum}
                              </span>
                              <div className="truncate">
                                <h5 className="text-xs font-bold text-white truncate" title={t.teamName}>
                                  {t.teamName}
                                </h5>
                                <span className="text-[9px] text-gray-400 truncate">{t.city}</span>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="font-mono text-xs font-black text-amber-400 block">
                                {t.totalPoints} pts
                              </span>
                              <span className="text-[8px] text-gray-400">{t.completedMatches} सामने</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[9px] text-gray-400 pt-1 border-t border-white/5 font-mono">
                            <span>⏱️ {formatMs(t.totalTimingMs)}</span>
                            <div className="flex gap-1.5">
                              {t.totalPenaltySec > 0 && <span className="text-amber-400">+{t.totalPenaltySec}s</span>}
                              {t.totalDeductedPts > 0 && <span className="text-rose-400">-{t.totalDeductedPts}pts</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (

        /* ============================================================= */
        /* 🏆 OVERALL STANDINGS TABLE (1 to 16)                          */
        /* ============================================================= */
        <div className="bg-[#0c0d14] border border-amber-500/20 rounded-3xl p-4 shadow-xl overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-[10px] text-gray-400 uppercase font-mono tracking-wider">
                <th className="p-2.5">रँक</th>
                <th className="p-2.5">गोविंदा पथक</th>
                <th className="p-2.5">गट (Group)</th>
                <th className="p-2.5 text-center">सामने</th>
                <th className="p-2.5 text-center">अंतिम वेळ</th>
                <th className="p-2.5 text-center">पेनल्टी (+sec)</th>
                <th className="p-2.5 text-center">वजावट (-pts)</th>
                <th className="p-2.5 text-right font-black text-amber-400">एकूण गुण (Points)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {standingsData
                .sort((a, b) => {
                  if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
                  return a.totalTimingMs - b.totalTimingMs;
                })
                .map((t, idx) => (
                  <tr key={t.id} className="hover:bg-white/5 transition">
                    <td className="p-2.5">
                      <span className={`w-6 h-6 rounded-lg text-[10px] font-black flex items-center justify-center ${
                        idx === 0 ? 'bg-amber-400 text-black shadow' :
                        idx === 1 ? 'bg-slate-300 text-black' :
                        idx === 2 ? 'bg-amber-700 text-white' : 'bg-white/5 text-gray-400'
                      }`}>
                        #{idx + 1}
                      </span>
                    </td>
                    <td className="p-2.5 font-bold text-white">
                      {t.teamName}
                      <span className="text-[10px] text-gray-400 block font-normal">{t.city}</span>
                    </td>
                    <td className="p-2.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                        {t.group}
                      </span>
                    </td>
                    <td className="p-2.5 text-center font-mono">{t.completedMatches}</td>
                    <td className="p-2.5 text-center font-mono text-emerald-400">{formatMs(t.totalTimingMs)}</td>
                    <td className="p-2.5 text-center font-mono text-amber-400">+{t.totalPenaltySec}s</td>
                    <td className="p-2.5 text-center font-mono text-rose-400">-{t.totalDeductedPts}pts</td>
                    <td className="p-2.5 text-right font-mono font-black text-amber-400 text-sm">{t.totalPoints} pts</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}