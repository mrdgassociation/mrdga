// ==========================================
// #SECTION: DAHI HANDI TOURNAMENT RANKINGS & CUMULATIVE STANDINGS (DYNAMIC ROUND & KNOCKOUT RANKINGS)
// ==========================================
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { 
  Trophy, Award, Users, Layers, Clock, 
  AlertTriangle, Filter, CheckCircle2, Swords, Sparkles
} from 'lucide-react';

export default function ScoringLeaderboardTab({ tournamentId, onNavigateToDuels }) {
  const [rounds, setRounds] = useState([]);
  const [teams, setTeams] = useState([]);
  const [fixtures, setFixtures] = useState({});
  const [roundFixturesMap, setRoundFixturesMap] = useState({});
  const [allScores, setAllScores] = useState([]);
  const [loading, setLoading] = useState(true);

  // 'ALL' | 'R1_R2' | 'ROUND_ID'
  const [selectedFilter, setSelectedFilter] = useState('R1_R2'); 
  const [activeViewType, setActiveViewType] = useState('GROUP'); // 'GROUP' | 'OVERALL'

  // 1️⃣ Data Load
  useEffect(() => {
    if (!tournamentId) return;
    setLoading(true);

    const loadInitialData = async () => {
      try {
        // फेऱ्या (Rounds)
        const rSnap = await getDocs(collection(db, 'dahi_handi_tournaments', tournamentId, 'rounds'));
        const rList = rSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        rList.sort((a, b) => (Number(a.roundNumber) || 0) - (Number(b.roundNumber) || 0));
        setRounds(rList);

        // संघ (Teams)
        const tSnap = await getDocs(collection(db, 'dahi_handi_tournaments', tournamentId, 'teams'));
        const tList = tSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setTeams(tList);

        // Round 1 Fixtures (मूळ गट A, B, C, D साठी)
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

    // रिअल-टाइम स्कोअर
    const unsub = onSnapshot(collection(db, 'dahi_handi_tournaments', tournamentId, 'scores'), (snap) => {
      const sList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllScores(sList);
    });

    return () => unsub();
  }, [tournamentId]);

  // चालू निवडलेल्या फेरीचे Fixtures लोड करणे
  useEffect(() => {
    if (!tournamentId || !selectedFilter || selectedFilter === 'ALL' || selectedFilter === 'R1_R2') return;
    const fetchRoundFixtures = async () => {
      try {
        const snap = await getDocs(collection(db, 'dahi_handi_tournaments', tournamentId, 'rounds', selectedFilter, 'fixtures'));
        const map = {};
        snap.docs.forEach(d => { map[d.id] = d.data(); });
        setRoundFixturesMap(map);
      } catch (e) {
        console.error("Round fixtures load error:", e);
      }
    };
    fetchRoundFixtures();
  }, [tournamentId, selectedFilter]);

  const currentSelectedRoundObj = rounds.find(r => r.id === selectedFilter);
  const isSelectedRoundDuel = currentSelectedRoundObj?.matchFormat === 'DUEL';
  const isKnockoutRound = currentSelectedRoundObj?.type === 'KNOCKOUT';
  const roundQualifiedCount = Number(currentSelectedRoundObj?.qualifiedTeamsCount) || (isKnockoutRound ? 8 : 16);

  // निवडलेल्या फिल्टरनुसार स्कोअर फिल्टर करणे
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

  // 🎯 रँकिंग आणि गुणतक्ता कॅल्क्युलेशन (फेरी ७ मध्ये फक्त ८ संघच येतील)
  const calculateStandings = () => {
    // जर विशिष्ट फेरी निवडली असेल (उदा. Round 7), तर फक्त त्या फेरीतील पात्र/खेळणारे संघच घेणे
    let targetTeams = [...teams];
    const isSingleSpecificRound = selectedFilter !== 'ALL' && selectedFilter !== 'R1_R2';

    if (isSingleSpecificRound) {
      targetTeams = teams.filter(t => {
        const hasScore = filteredScores.some(s => s.teamId === t.id);
        const inFixtures = !!roundFixturesMap[t.id];
        return hasScore || inFixtures;
      });

      // जर अद्याप निकाल किंवा फिक्सचर्स नसतील तर एकूण संख्येनुसार मर्यादित ठेवणे
      if (targetTeams.length === 0) {
        targetTeams = teams.slice(0, roundQualifiedCount);
      }
    }

    return targetTeams.map(t => {
      const teamScores = filteredScores.filter(s => s.teamId === t.id);
      
      const totalPoints = teamScores.reduce((sum, s) => sum + (Number(s.pointsAwarded) || 0), 0);
      const totalPenaltySec = teamScores.reduce((sum, s) => sum + (Number(s.penaltySec) || 0), 0);
      const totalDeductedPts = teamScores.reduce((sum, s) => sum + (Number(s.deductedPts) || 0), 0);
      const totalTimingMs = teamScores.reduce((sum, s) => sum + (Number(s.finalTimingMs) || 0), 0);
      const completedMatches = teamScores.length;

      const lastScore = teamScores[teamScores.length - 1];
      const isWinner = lastScore?.isWinner || lastScore?.roundRank === 1;
      const roundRank = lastScore?.roundRank || 2;
      const lastSituation = lastScore?.situation || '-';
      const assignedGroup = fixtures[t.id]?.group || roundFixturesMap[t.id]?.group || 'Group A';

      return {
        ...t,
        group: assignedGroup,
        totalPoints,
        totalPenaltySec,
        totalDeductedPts,
        totalTimingMs,
        completedMatches,
        lastSituation,
        isWinner,
        roundRank,
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

  // 🎯 नॉकआउट व सर्वसाधारण रँक सॉर्टिंग (Knockout: Winners on Top, Losers at Bottom for Wild Card)
  const sortedStandings = [...standingsData].sort((a, b) => {
    if (isKnockoutRound) {
      // १. आधी विजयी संघ (Rank 1-4)
      if (a.isWinner !== b.isWinner) {
        return a.isWinner ? -1 : 1;
      }
      // २. मग कमी वेळेनुसार क्रमवारी
      return (a.totalTimingMs || 999999) - (b.totalTimingMs || 999999);
    }

    // सर्वसाधारण फेरीसाठी गुणांनुसार
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    return a.totalTimingMs - b.totalTimingMs;
  });

  return (
    <div className="space-y-4 text-white font-sans w-full">
      
      {/* 🔝 फिल्टर बार */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-[#0c0d14] border border-amber-500/20 p-3.5 sm:p-4 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <Trophy className="w-5 h-5 text-amber-400" />
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              📊 अधिकृत रँकिंग व गुणतक्ता (Official Standings & Leaderboard)
            </h3>
            <p className="text-[10px] text-gray-400">
              {currentSelectedRoundObj 
                ? `फेरी #${currentSelectedRoundObj.roundNumber}: ${currentSelectedRoundObj.roundName} (${standingsData.length} संघ सहभागी)` 
                : 'फेरीनुसार व एकत्रित गुणांवरून ग्रुप रँकिंग व निकाल तपासा.'}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-black/60 px-3 py-1.5 rounded-xl border border-white/10">
            <Filter className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] font-bold text-gray-300">निकाल निवडा:</span>
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="bg-transparent text-amber-400 font-bold text-xs focus:outline-none cursor-pointer"
            >
              <option value="R1_R2" className="bg-slate-900 text-white">⚡ Round 1 + Round 2 (एकत्रित गुण)</option>
              <option value="ALL" className="bg-slate-900 text-white">🏆 सर्व फेऱ्यांचा निकाल (Overall)</option>
              {rounds.map(r => (
                <option key={r.id} value={r.id} className="bg-slate-900 text-white">
                  फेरी #{r.roundNumber}: {r.roundName} ({r.qualifiedTeamsCount ? `${r.qualifiedTeamsCount} संघ` : r.matchFormat})
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
              👥 गटनिहाय (A, B, C, D)
            </button>
            <button
              onClick={() => setActiveViewType('OVERALL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeViewType === 'OVERALL' ? 'bg-blue-500 text-black shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              🏆 सर्व {standingsData.length} संघ (1 to {standingsData.length})
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* ⚔️ १. DUEL FORMAT निकाल (सामन्यांनुसार)                        */}
      {/* ============================================================= */}
      {isSelectedRoundDuel && activeViewType === 'GROUP' ? (
        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <span className="text-xs font-black text-orange-400 flex items-center gap-1.5">
              <Swords className="w-4 h-4" /> {currentSelectedRoundObj?.roundName} — समोरासमोरील सामने ({Math.floor(roundQualifiedCount / 2)} सामने • {standingsData.length} संघ)
            </span>
            <span className="text-[10px] text-gray-400 font-mono">{filteredScores.length} नोंद पूर्ण</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: Math.floor(roundQualifiedCount / 2) || 4 }).map((_, mIdx) => {
              const matchNo = mIdx + 1;
              const matchScores = filteredScores.filter(s => Number(s.duelMatchNo) === matchNo);
              const t1Score = matchScores.find(s => s.duelSide === 'FOP1');
              const t2Score = matchScores.find(s => s.duelSide === 'FOP2');

              return (
                <div key={matchNo} className="bg-[#0c0d14] border border-orange-500/30 rounded-2xl p-3 space-y-2.5 shadow-xl">
                  <div className="flex justify-between items-center text-[10px] font-mono text-orange-400 border-b border-white/5 pb-1">
                    <span className="font-bold">सामना #{matchNo}</span>
                    <span>{isKnockoutRound ? 'नॉकआउट' : `Match ${matchNo}`}</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    {t1Score ? (
                      <div className={`p-2 rounded-xl flex justify-between items-center border ${
                        t1Score.roundRank === 1 ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-bold' : 'bg-slate-900 border-white/5'
                      }`}>
                        <div className="truncate">
                          <span className="block truncate">{t1Score.teamName}</span>
                          <span className="text-[9px] text-gray-400 font-mono">{t1Score.finalFormattedTime}</span>
                        </div>
                        <div className="text-right shrink-0">
                          {isKnockoutRound ? (
                            <span className={`text-[10px] px-2 py-0.5 rounded font-black ${t1Score.roundRank === 1 ? 'bg-emerald-500 text-black' : 'bg-rose-500/20 text-rose-400'}`}>
                              {t1Score.roundRank === 1 ? '🏆 WIN' : 'OUT (Wild Card)'}
                            </span>
                          ) : (
                            <span className="text-amber-400 font-bold font-mono">{t1Score.pointsAwarded} pts</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-900/50 p-2 rounded-xl text-center text-gray-600 text-[10px]">प्रलंबित (FOP 1)</div>
                    )}

                    <div className="text-center text-[9px] font-black text-gray-600">VS</div>

                    {t2Score ? (
                      <div className={`p-2 rounded-xl flex justify-between items-center border ${
                        t2Score.roundRank === 1 ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-bold' : 'bg-slate-900 border-white/5'
                      }`}>
                        <div className="truncate">
                          <span className="block truncate">{t2Score.teamName}</span>
                          <span className="text-[9px] text-gray-400 font-mono">{t2Score.finalFormattedTime}</span>
                        </div>
                        <div className="text-right shrink-0">
                          {isKnockoutRound ? (
                            <span className={`text-[10px] px-2 py-0.5 rounded font-black ${t2Score.roundRank === 1 ? 'bg-emerald-500 text-black' : 'bg-rose-500/20 text-rose-400'}`}>
                              {t2Score.roundRank === 1 ? '🏆 WIN' : 'OUT (Wild Card)'}
                            </span>
                          ) : (
                            <span className="text-amber-400 font-bold font-mono">{t2Score.pointsAwarded} pts</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-900/50 p-2 rounded-xl text-center text-gray-600 text-[10px]">प्रलंबित (FOP 2)</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : activeViewType === 'GROUP' ? (

        /* ============================================================= */
        /* 👥 २. ग्रुपनिहाय रँकिंग (Group A, B, C, D)                    */
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
        /* 🏆 ३. OVERALL STANDINGS TABLE (उदा. फेरी ७ मधील १ ते ८ संघ)    */
        /* ============================================================= */
        <div className="bg-[#0c0d14] border border-amber-500/20 rounded-3xl p-4 shadow-xl space-y-3">
          
          {/* नॉकआउट सूचना व वाइल्ड कार्ड हायलाइट */}
          {isKnockoutRound && (
            <div className="bg-orange-500/10 border border-orange-500/30 p-2.5 rounded-2xl flex items-center justify-between text-xs">
              <span className="text-orange-400 font-bold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> फेरी #{currentSelectedRoundObj?.roundNumber} नॉकआउट रँकिंग निकाल:
              </span>
              <span className="text-[11px] text-gray-300">
                <b className="text-emerald-400">Rank 1 ते 4 = Semi-Finals</b> | <b className="text-rose-400">Rank 5 ते 8 = Wild Card Shootout</b>
              </span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-[10px] text-gray-400 uppercase font-mono tracking-wider">
                  <th className="p-2.5 text-center">रँक</th>
                  <th className="p-2.5">गोविंदा पथक</th>
                  <th className="p-2.5">गट (Group)</th>
                  <th className="p-2.5 text-center">सामने</th>
                  <th className="p-2.5 text-center">अंतिम वेळ</th>
                  <th className="p-2.5 text-center">पेनल्टी (+sec)</th>
                  <th className="p-2.5 text-center">वजावट (-pts)</th>
                  {isKnockoutRound ? (
                    <th className="p-2.5 text-right font-black text-orange-400">पुढील फेरी पात्रता (Status)</th>
                  ) : (
                    <th className="p-2.5 text-right font-black text-amber-400">एकूण गुण (Points)</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sortedStandings.map((t, idx) => {
                  const isTopHalf = idx < Math.floor(standingsData.length / 2);

                  return (
                    <tr 
                      key={t.id} 
                      className={`hover:bg-white/5 transition ${
                        isKnockoutRound 
                          ? (isTopHalf ? 'bg-emerald-500/5' : 'bg-rose-500/5') 
                          : ''
                      }`}
                    >
                      <td className="p-2.5 text-center">
                        <span className={`w-6 h-6 rounded-lg text-[10px] font-black inline-flex items-center justify-center ${
                          idx === 0 ? 'bg-amber-400 text-black shadow' :
                          idx === 1 ? 'bg-slate-300 text-black' :
                          idx === 2 ? 'bg-amber-700 text-white' : 
                          isKnockoutRound && !isTopHalf ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                          'bg-white/5 text-gray-400'
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
                      
                      <td className="p-2.5 text-right font-mono font-black text-sm">
                        {isKnockoutRound ? (
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                            t.isWinner 
                              ? 'bg-emerald-500 text-black shadow' 
                              : 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                          }`}>
                            {t.isWinner ? '🏆 Semi-Finals' : '🃏 Wild Card Shootout'}
                          </span>
                        ) : (
                          <span className="text-amber-400">{t.totalPoints} pts</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}