// ==========================================
// #SECTION: DAHI HANDI JUDGE SCORING CONSOLE (ALL FORMATS 100% COMPLETE & DYNAMIC)
// ==========================================
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { 
  collection, doc, getDocs, setDoc, deleteDoc, 
  serverTimestamp, onSnapshot, writeBatch, query, where 
} from 'firebase/firestore';
import Swal from 'sweetalert2';
import { 
  CheckCircle2, Trash2, Clock, Award, AlertTriangle, 
  Layers, Users, Swords, Trophy
} from 'lucide-react';

export default function ScoringJudgeConsole({ tournamentId }) {
  const [rounds, setRounds] = useState([]);
  const [selectedRoundId, setSelectedRoundId] = useState('');
  const [teams, setTeams] = useState([]);
  const [fixtures, setFixtures] = useState({});
  const [r1Fixtures, setR1Fixtures] = useState({});
  const [scores, setScores] = useState([]);
  const [allTournamentScores, setAllTournamentScores] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeGroup, setActiveGroup] = useState('Group A');
  const [selectedDuelMatchNo, setSelectedDuelMatchNo] = useState(1);
  const [fopStates, setFopStates] = useState({});
  const [savingAll, setSavingAll] = useState(false);
  const [leaderboardTab, setLeaderboardTab] = useState('ROUND'); // 'ROUND' | 'CUMULATIVE'

  // 1️⃣ Initial Data Load
  useEffect(() => {
    if (!tournamentId) return;
    const fetchInitial = async () => {
      setLoading(true);
      try {
        const rSnap = await getDocs(collection(db, 'dahi_handi_tournaments', tournamentId, 'rounds'));
        const rList = rSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        rList.sort((a, b) => (Number(a.roundNumber) || 0) - (Number(b.roundNumber) || 0));
        setRounds(rList);

        if (rList.length > 0) {
          setSelectedRoundId(prev => prev || rList[0].id);
        }

        const tSnap = await getDocs(collection(db, 'dahi_handi_tournaments', tournamentId, 'teams'));
        const tList = tSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setTeams(tList);

        const r1Id = rList.find(r => Number(r.roundNumber) === 1)?.id || rList[0]?.id;
        if (r1Id) {
          const r1FixSnap = await getDocs(collection(db, 'dahi_handi_tournaments', tournamentId, 'rounds', r1Id, 'fixtures'));
          const r1Map = {};
          r1FixSnap.docs.forEach(d => { r1Map[d.id] = d.data(); });
          setR1Fixtures(r1Map);
        }
      } catch (err) {
        console.error("Initial load error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchInitial();
  }, [tournamentId]);

  // 2️⃣ Realtime Scores
  useEffect(() => {
    if (!tournamentId) return;
    const unsub = onSnapshot(collection(db, 'dahi_handi_tournaments', tournamentId, 'scores'), (snap) => {
      const sList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllTournamentScores(sList);
      if (selectedRoundId) {
        setScores(sList.filter(s => s.roundId === selectedRoundId));
      }
    });
    return () => unsub();
  }, [tournamentId, selectedRoundId]);

  // 3️⃣ Fixtures Load & FOP Card Setup
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

        const currentR = rounds.find(r => r.id === selectedRoundId);
        initDynamicFops(currentR, teams, fMap);
      } catch (e) {
        console.error("Fixture load error:", e);
      }
    };
    loadFixtures();
  }, [tournamentId, selectedRoundId, activeGroup, selectedDuelMatchNo]);

  // 🎯 Format-aware FOP Setup
  const initDynamicFops = (currentR, tList = teams, fMap = fixtures) => {
    if (!currentR) return;
    const format = currentR.matchFormat;
    const newStates = {};

    if (format === 'DUEL') {
      // ⚔️ DUEL (R3, R5, R7): FOP 1 vs FOP 2
      const t1 = tList.find(t => fMap[t.id]?.duelMatchNo === selectedDuelMatchNo && fMap[t.id]?.duelSide === 'FOP1');
      const t2 = tList.find(t => fMap[t.id]?.duelSide === 'FOP2' && fMap[t.id]?.duelMatchNo === selectedDuelMatchNo);
      newStates['FOP 1'] = createEmptyFopState(t1?.id || '', currentR);
      newStates['FOP 2'] = createEmptyFopState(t2?.id || '', currentR);
    } else if (format === 'GROUP') {
      // 👥 GROUP: 4 Cards (FOP 1 te FOP 4)
      const groupTeams = tList.filter(t => (r1Fixtures[t.id]?.group || fMap[t.id]?.group || 'Group A') === activeGroup);
      const count = groupTeams.length > 0 ? groupTeams.length : 4;
      for (let i = 0; i < count; i++) {
        newStates[`FOP ${i + 1}`] = createEmptyFopState(groupTeams[i]?.id || '', currentR);
      }
    } else {
      // ⏱️ SINGLE / FORMATION_DIFFICULTY: 1 Single Card
      const defaultTeam = tList[0]?.id || '';
      newStates['FOP 1'] = createEmptyFopState(defaultTeam, currentR);
    }
    setFopStates(newStates);
  };

  const createEmptyFopState = (teamId, currentR = null) => {
    const firstFormationName = currentR?.formationList?.[0]?.name || '';
    return {
      teamId: teamId || '',
      selectedFormation: firstFormationName,
      situation: 'DESCARREGAT',
      min: '',
      sec: '',
      ms: '',
      penalties: {},
      remarks: ''
    };
  };

  const currentRound = rounds.find(r => r.id === selectedRoundId);

  // 🎯 Format Flags
  const isDuelFormat = currentRound?.matchFormat === 'DUEL';
  const isFormationRound = currentRound?.matchFormat === 'FORMATION_DIFFICULTY';
  const isSingleFormat = (currentRound?.matchFormat === 'SINGLE' || currentRound?.matchFormat === 'MULTI' || isFormationRound) && !isDuelFormat;
  const isGroupFormat = currentRound?.matchFormat === 'GROUP' && !isDuelFormat && !isSingleFormat;
  const isKnockout = currentRound?.type === 'KNOCKOUT';
  
  const isDuelWithGroups = isDuelFormat && (Number(currentRound?.roundNumber) <= 3 || currentRound?.hasGroups === true);
  const isDuelOverall16 = isDuelFormat && !isDuelWithGroups;

  // Carregat Auto-penalty
  const handleSituationChange = (fopKey, sit) => {
    setFopStates(prev => {
      const current = prev[fopKey];
      const updatedPenalties = { ...(current.penalties || {}) };

      if (sit === 'CARREGAT') {
        const carregatPen = currentRound?.penaltyList?.find(p => 
          p.label.toLowerCase().includes('carregat') || p.label.toLowerCase().includes('कॅरेगॅट')
        );
        if (carregatPen) {
          updatedPenalties[carregatPen.label] = { applied: true, playerCount: 1 };
        }
      }

      return {
        ...prev,
        [fopKey]: {
          ...current,
          situation: sit,
          penalties: updatedPenalties
        }
      };
    });
  };

  const handleTimeChange = (fopKey, field, val) => {
    setFopStates(prev => ({
      ...prev,
      [fopKey]: { ...prev[fopKey], [field]: val }
    }));
  };

  const updateFopState = (fopKey, field, value) => {
    setFopStates(prev => ({
      ...prev,
      [fopKey]: { ...prev[fopKey], [field]: value }
    }));
  };

  const toggleFopPenalty = (fopKey, penLabel) => {
    setFopStates(prev => {
      const currentPens = prev[fopKey].penalties || {};
      const isCurrentlyApplied = currentPens[penLabel]?.applied;
      return {
        ...prev,
        [fopKey]: {
          ...prev[fopKey],
          penalties: {
            ...currentPens,
            [penLabel]: {
              applied: !isCurrentlyApplied,
              playerCount: !isCurrentlyApplied ? 1 : 0
            }
          }
        }
      };
    });
  };

  const handlePlayerCountChange = (fopKey, penLabel, count) => {
    setFopStates(prev => {
      const currentPens = prev[fopKey].penalties || {};
      return {
        ...prev,
        [fopKey]: {
          ...prev[fopKey],
          penalties: {
            ...currentPens,
            [penLabel]: {
              ...currentPens[penLabel],
              playerCount: Math.max(1, Number(count) || 1)
            }
          }
        }
      };
    });
  };

  const calculateFopPenalties = (fopData) => {
    let totalPenaltySec = 0;
    let totalDeductedPts = 0;

    currentRound?.penaltyList?.forEach(p => {
      const penConfig = fopData.penalties?.[p.label];
      if (penConfig?.applied) {
        const count = p.perPlayer !== false ? (penConfig.playerCount || 1) : 1;
        const val = Number(p.value || p.seconds) || 0;

        if (p.type === 'POINTS') {
          totalDeductedPts += (val * count);
        } else {
          totalPenaltySec += (val * count);
        }
      }
    });

    return { totalPenaltySec, totalDeductedPts };
  };

  // 💾 Save Scores
  const handleSaveScores = async () => {
    const activeFopKeys = Object.keys(fopStates).filter(f => fopStates[f].teamId);

    if (activeFopKeys.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Krupaya aadhi sangh nivada!' });
      return;
    }

    setSavingAll(true);
    try {
      const batch = writeBatch(db);

      for (const fopKey of activeFopKeys) {
        const data = fopStates[fopKey];
        const teamObj = teams.find(t => t.id === data.teamId);

        const m = Number(data.min) || 0;
        const s = Number(data.sec) || 0;
        const milli = Number(data.ms) || 0;
        const rawTimeMs = (m * 60 * 1000) + (s * 1000) + (milli * 10);

        const { totalPenaltySec, totalDeductedPts } = calculateFopPenalties(data);
        const finalTimingMs = rawTimeMs + (totalPenaltySec * 1000);

        const teamOriginalGroup = r1Fixtures[data.teamId]?.group || fixtures[data.teamId]?.group || activeGroup;

        let basePts = 0;
        let selectedFormationName = '';
        let selectedFormationStructure = '';

        if (isFormationRound) {
          const fmtList = currentRound?.formationList || [];
          const activeFmtName = data.selectedFormation || fmtList[0]?.name;
          const chosenFmt = fmtList.find(f => f.name === activeFmtName) || fmtList[0];

          selectedFormationName = chosenFmt?.name || '';
          selectedFormationStructure = chosenFmt?.structure || '';

          if (data.situation === 'DESCARREGAT') {
            basePts = Number(chosenFmt?.descarregat) || 0;
          } else if (data.situation === 'CARREGAT') {
            basePts = Number(chosenFmt?.carregat) || 0;
          } else {
            basePts = Number(chosenFmt?.intent) || 0;
          }
        } else if (isKnockout) {
          basePts = 0;
        } else if (data.situation === 'INTENT') {
          basePts = Number(currentRound?.intentPoints) || 0;
        } else {
          basePts = currentRound?.pointsList?.[0]?.points || 1000;
        }

        const finalAwardedPts = isKnockout ? 0 : Math.max(0, basePts - totalDeductedPts);

        const currentScorePayload = {
          roundId: selectedRoundId,
          roundNumber: currentRound?.roundNumber || 1,
          roundName: currentRound?.roundName || '',
          matchFormat: currentRound?.matchFormat || 'SINGLE',
          roundType: currentRound?.type || 'LEAGUE',
          teamId: data.teamId,
          teamName: teamObj?.teamName || '',
          city: teamObj?.city || 'महाराष्ट्र',
          group: teamOriginalGroup,
          fopNo: fopKey,
          duelMatchNo: selectedDuelMatchNo,
          duelSide: fopKey === 'FOP 1' ? 'FOP1' : 'FOP2',
          formationName: selectedFormationName,
          formationStructure: selectedFormationStructure,
          situation: data.situation,
          rawTimeMs,
          rawFormattedTime: isFormationRound ? '-' : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(milli).padStart(2, '0')}`,
          penaltySec: totalPenaltySec,
          deductedPts: totalDeductedPts,
          appliedPenalties: data.penalties || {},
          finalTimingMs: isFormationRound ? 0 : finalTimingMs,
          finalFormattedTime: isFormationRound ? '-' : `${String(Math.floor(finalTimingMs / 60000)).padStart(2, '0')}:${String(Math.floor((finalTimingMs % 60000) / 1000)).padStart(2, '0')}.${String(Math.floor((finalTimingMs % 1000) / 10)).padStart(2, '0')}`,
          basePoints: basePts,
          pointsAwarded: finalAwardedPts,
          remarks: data.remarks || '',
          timestamp: serverTimestamp()
        };

        const scoreDocId = `SCORE_${selectedRoundId}_${data.teamId}`;
        batch.set(doc(db, 'dahi_handi_tournaments', tournamentId, 'scores', scoreDocId), currentScorePayload, { merge: true });
      }

      await batch.commit();

      // DUEL / Knockout Winner Decision (FOP 1 vs FOP 2)
      if (isDuelFormat && activeFopKeys.length === 2) {
        const d1 = fopStates['FOP 1'];
        const d2 = fopStates['FOP 2'];

        const m1 = (Number(d1.min) || 0) * 60000 + (Number(d1.sec) || 0) * 1000 + (Number(d1.ms) || 0) * 10 + (calculateFopPenalties(d1).totalPenaltySec * 1000);
        const m2 = (Number(d2.min) || 0) * 60000 + (Number(d2.sec) || 0) * 1000 + (Number(d2.ms) || 0) * 10 + (calculateFopPenalties(d2).totalPenaltySec * 1000);

        const sitOrder = { DESCARREGAT: 1, CARREGAT: 2, INTENT: 3 };
        let isFop1Winner = true;

        if (sitOrder[d1.situation] !== sitOrder[d2.situation]) {
          isFop1Winner = sitOrder[d1.situation] < sitOrder[d2.situation];
        } else {
          isFop1Winner = m1 <= m2;
        }

        const duelBatch = writeBatch(db);
        duelBatch.update(doc(db, 'dahi_handi_tournaments', tournamentId, 'scores', `SCORE_${selectedRoundId}_${d1.teamId}`), {
          roundRank: isFop1Winner ? 1 : 2,
          isWinner: isFop1Winner,
          pointsAwarded: isKnockout ? 0 : (isFop1Winner ? (currentRound?.pointsList?.[0]?.points || 1000) : (currentRound?.pointsList?.[1]?.points || 700))
        });
        duelBatch.update(doc(db, 'dahi_handi_tournaments', tournamentId, 'scores', `SCORE_${selectedRoundId}_${d2.teamId}`), {
          roundRank: isFop1Winner ? 2 : 1,
          isWinner: !isFop1Winner,
          pointsAwarded: isKnockout ? 0 : (isFop1Winner ? (currentRound?.pointsList?.[1]?.points || 700) : (currentRound?.pointsList?.[0]?.points || 1000))
        });
        await duelBatch.commit();
      }

      Swal.fire({
        icon: 'success',
        title: 'Nikaal save jhala!',
        text: 'Nikaal taktyat record update jhala ahe.',
        timer: 1500,
        showConfirmButton: false,
        background: '#0c0d14',
        color: '#fff'
      });

    } catch (err) {
      console.error("Save error:", err);
      Swal.fire({ icon: 'error', title: 'Truti!', text: 'Nikaal save karta aala nahi.' });
    } finally {
      setSavingAll(false);
    }
  };

  const handleDeleteScore = async (id, name) => {
    const res = await Swal.fire({
      title: 'Nikaal hatvaycha ahe ka?',
      text: `"${name}" chi nond hatavli jaail.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Hoy, hatva',
      cancelButtonText: 'Radd',
      confirmButtonColor: '#ef4444',
      background: '#0c0d14',
      color: '#fff'
    });

    if (res.isConfirmed) {
      try {
        await deleteDoc(doc(db, 'dahi_handi_tournaments', tournamentId, 'scores', id));
      } catch (e) {}
    }
  };

  // 🎯 Cumulative Standings
  const currentRoundNumber = Number(currentRound?.roundNumber) || 1;
  const targetCumulativeRounds = rounds.filter(r => Number(r.roundNumber) <= currentRoundNumber).map(r => r.id);

  const cumulativeLeaderboard = teams.map(t => {
    const teamScores = allTournamentScores.filter(s => s.teamId === t.id && targetCumulativeRounds.includes(s.roundId));
    const totalPts = teamScores.reduce((sum, s) => sum + (Number(s.pointsAwarded) || 0), 0);
    const totalTimingMs = teamScores.reduce((sum, s) => sum + (Number(s.finalTimingMs) || 0), 0);
    
    return {
      ...t,
      totalPts,
      totalTimingMs,
      completedRounds: teamScores.length,
      group: r1Fixtures[t.id]?.group || fixtures[t.id]?.group || 'Group A'
    };
  }).sort((a, b) => {
    if (b.totalPts !== a.totalPts) return b.totalPts - a.totalPts;
    return a.totalTimingMs - b.totalTimingMs;
  });

  const activeGroups = currentRound?.groupList?.length ? currentRound.groupList : ['Group A', 'Group B', 'Group C', 'Group D'];

  return (
    <div className="space-y-4 text-white font-sans w-full">
      
      {/* Top Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-[#0c0d14] border border-amber-500/20 p-3 sm:p-4 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <Layers className="w-5 h-5 text-amber-400" />
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              📋 जज स्कोअरशीट कन्सोल — {currentRound?.roundName || 'फेरी'}
            </h3>
            <p className="text-[10px] text-gray-400">
              फॉरमॅट: <b className="text-amber-400">{currentRound?.matchFormat}</b> • {isFormationRound ? 'काठिण्य पातळी चॅलेंज' : isKnockout ? 'नॉकआउट थेट पात्रता' : `थर: ${currentRound?.tierHeight || 5}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Round Selector */}
          <div className="flex items-center gap-1.5 bg-black/60 px-2.5 py-1 rounded-xl border border-white/10">
            <span className="text-[11px] font-bold text-gray-300">फेरी:</span>
            <select
              value={selectedRoundId}
              onChange={(e) => setSelectedRoundId(e.target.value)}
              className="bg-transparent text-amber-400 font-bold text-xs focus:outline-none cursor-pointer"
            >
              {rounds.map(r => (
                <option key={r.id} value={r.id} className="bg-slate-900 text-white">
                  फेरी #{r.roundNumber}: {r.roundName} ({r.matchFormat})
                </option>
              ))}
            </select>
          </div>

          {/* Group Selector (फक्त Group स्टेज फेऱ्यांसाठी) */}
          {isGroupFormat && (
            <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-blue-500/30">
              {activeGroups.map(grp => (
                <button
                  key={grp}
                  onClick={() => setActiveGroup(grp)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activeGroup === grp ? 'bg-blue-500 text-black shadow' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {grp}
                </button>
              ))}
            </div>
          )}

          {/* Duel Match Selector (द्वंद्व फेऱ्यांसाठी) */}
          {isDuelFormat && (
            <div className="flex items-center gap-1.5 bg-black/60 px-2.5 py-1 rounded-xl border border-orange-500/30">
              <Swords className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-[11px] font-bold text-gray-300">सामना:</span>
              <select
                value={selectedDuelMatchNo}
                onChange={(e) => setSelectedDuelMatchNo(Number(e.target.value))}
                className="bg-transparent text-orange-400 font-bold text-xs focus:outline-none cursor-pointer"
              >
                {Array.from({ length: Math.ceil(teams.length / 2) || 8 }).map((_, idx) => (
                  <option key={idx + 1} value={idx + 1} className="bg-slate-900 text-white">
                    सामना #{idx + 1} {isDuelOverall16 ? `(Rank ${idx + 1} vs ${16 - idx})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSaveScores}
            disabled={savingAll}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{savingAll ? 'नोंद होत आहे...' : '✅ निकाल सेव्ह करा'}</span>
          </button>
        </div>
      </div>

      {/* FOP Score Entry Cards */}
      <div className={`grid gap-3.5 ${
        isDuelFormat 
          ? 'grid-cols-1 md:grid-cols-2' 
          : isSingleFormat 
          ? 'grid-cols-1 max-w-2xl mx-auto' 
          : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
      }`}>
        {Object.keys(fopStates).map((fopKey) => {
          const fData = fopStates[fopKey];
          const { totalPenaltySec, totalDeductedPts } = calculateFopPenalties(fData);

          const m = Number(fData.min) || 0;
          const s = Number(fData.sec) || 0;
          const milli = Number(fData.ms) || 0;
          const rawMs = (m * 60 * 1000) + (s * 1000) + (milli * 10);
          const finalTimingMs = rawMs + (totalPenaltySec * 1000);

          const fmtList = currentRound?.formationList || [];
          const currentChosenFmt = fmtList.find(f => f.name === (fData.selectedFormation || fmtList[0]?.name));
          let currentPreviewPts = 0;
          if (isFormationRound && currentChosenFmt) {
            if (fData.situation === 'DESCARREGAT') currentPreviewPts = Number(currentChosenFmt.descarregat) || 0;
            else if (fData.situation === 'CARREGAT') currentPreviewPts = Number(currentChosenFmt.carregat) || 0;
            else currentPreviewPts = Number(currentChosenFmt.intent) || 0;
          }

          return (
            <div 
              key={fopKey}
              className="bg-[#0c0d14] border border-amber-500/20 hover:border-amber-500/40 rounded-3xl p-4 space-y-3 shadow-xl transition flex flex-col justify-between"
            >
              <div className="space-y-3">
                
                {/* FOP Header */}
                <div className="flex justify-between items-center bg-black/60 p-2 rounded-2xl border border-white/5">
                  <span className="text-xs font-black text-amber-400 font-mono flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span> {fopKey} {isDuelFormat ? (fopKey === 'FOP 1' ? '(Team A)' : '(Team B)') : ''}
                  </span>
                  <span className="text-[10px] text-gray-400 font-bold">
                    {isDuelFormat ? `सामना #${selectedDuelMatchNo}` : isFormationRound ? 'रचना काठिण्य' : 'जज स्कोअरशीट'}
                  </span>
                </div>

                {/* संघ निवड */}
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">गोविंदा पथक (Team):</label>
                  <select
                    value={fData.teamId}
                    onChange={(e) => updateFopState(fopKey, 'teamId', e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 text-white font-bold text-xs p-2 rounded-xl focus:outline-none"
                  >
                    <option value="">-- संघ निवडा --</option>
                    {teams.map(t => (
                      <option key={t.id} value={t.id}>{t.teamName} ({t.city})</option>
                    ))}
                  </select>
                </div>

                {/* 🏆 Formation Selector (Round 6) */}
                {isFormationRound && (
                  <div className="bg-black/50 p-3 rounded-2xl border border-amber-500/30 space-y-2">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-amber-400 font-bold flex items-center gap-1">
                        <Trophy className="w-3.5 h-3.5" /> रचना निवडा (Selected Formation):
                      </span>
                      <span className="text-gray-400 font-mono">
                        {currentChosenFmt?.structure || ''}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pr-1">
                      {fmtList.map((fmt) => {
                        const activeFmtName = fData.selectedFormation || fmtList[0]?.name;
                        const isSelected = activeFmtName === fmt.name;

                        return (
                          <button
                            key={fmt.name}
                            type="button"
                            onClick={() => updateFopState(fopKey, 'selectedFormation', fmt.name)}
                            className={`p-2 rounded-xl text-left border transition cursor-pointer flex flex-col justify-between ${
                              isSelected
                                ? 'bg-amber-500 text-black border-amber-400 font-black shadow-md'
                                : 'bg-slate-900 text-gray-300 border-white/5 hover:border-white/20'
                            }`}
                          >
                            <span className="text-[11px] font-bold truncate">{fmt.name}</span>
                            <span className="text-[9px] opacity-85 font-mono mt-0.5">
                              {fmt.descarregat} / {fmt.carregat} pts
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* सिच्युएशन निवड */}
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">सिच्युएशन (Situation):</label>
                  <div className="grid grid-cols-3 gap-1 text-[10px] font-black">
                    <button
                      type="button"
                      onClick={() => handleSituationChange(fopKey, 'DESCARREGAT')}
                      className={`p-1.5 rounded-xl border transition cursor-pointer ${
                        fData.situation === 'DESCARREGAT' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500' : 'bg-black/40 text-gray-400 border-white/5'
                      }`}
                    >
                      🏆 DESCAR
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSituationChange(fopKey, 'CARREGAT')}
                      className={`p-1.5 rounded-xl border transition cursor-pointer ${
                        fData.situation === 'CARREGAT' ? 'bg-amber-500/20 text-amber-400 border-amber-500 shadow-md shadow-amber-500/20' : 'bg-black/40 text-gray-400 border-white/5'
                      }`}
                    >
                      ⚠️ CARRE
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSituationChange(fopKey, 'INTENT')}
                      className={`p-1.5 rounded-xl border transition cursor-pointer ${
                        fData.situation === 'INTENT' ? 'bg-rose-500/20 text-rose-400 border-rose-500' : 'bg-black/40 text-gray-400 border-white/5'
                      }`}
                    >
                      ❌ INTENT
                    </button>
                  </div>
                </div>

                {/* ⏱️ वेळ इनपुट (Formation फेरीत लपवले जाईल) */}
                {!isFormationRound && (
                  <div className="bg-black/60 p-2.5 rounded-2xl border border-white/5 space-y-1">
                    <span className="font-bold text-amber-400 text-[10px] flex items-center gap-1">
                      <Clock className="w-3 h-3" /> मूळ वेळ (Stopwatch Time):
                    </span>

                    <div className="grid grid-cols-3 gap-1.5 font-mono text-center">
                      <div>
                        <input
                          type="number"
                          placeholder="00"
                          min={0}
                          max={59}
                          value={fData.min}
                          onChange={(e) => handleTimeChange(fopKey, 'min', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 p-1.5 rounded-xl text-white font-black text-center text-xs focus:border-amber-400 focus:outline-none"
                        />
                        <span className="text-[8px] text-gray-500 block mt-0.5">मिनिटे</span>
                      </div>

                      <div>
                        <input
                          type="number"
                          placeholder="00"
                          min={0}
                          max={59}
                          value={fData.sec}
                          onChange={(e) => handleTimeChange(fopKey, 'sec', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 p-1.5 rounded-xl text-amber-400 font-black text-center text-xs focus:border-amber-400 focus:outline-none"
                        />
                        <span className="text-[8px] text-gray-500 block mt-0.5">सेकंद</span>
                      </div>

                      <div>
                        <input
                          type="number"
                          placeholder="00"
                          min={0}
                          max={99}
                          value={fData.ms}
                          onChange={(e) => handleTimeChange(fopKey, 'ms', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 p-1.5 rounded-xl text-white font-black text-center text-xs focus:border-amber-400 focus:outline-none"
                        />
                        <span className="text-[8px] text-gray-500 block mt-0.5">मिली.</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ⚠️ पेनल्टी रकाने */}
                {currentRound?.penaltyList?.length > 0 && (
                  <div className="space-y-1.5 bg-black/40 p-2.5 rounded-2xl border border-rose-500/20">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-rose-400 font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> पेनल्टी रकाने:
                      </span>
                      <div className="flex gap-2 font-mono text-[9px] font-bold">
                        {!isFormationRound && totalPenaltySec > 0 && <span className="text-amber-400">+{totalPenaltySec}s</span>}
                        {totalDeductedPts > 0 && <span className="text-rose-400">-{totalDeductedPts} pts</span>}
                      </div>
                    </div>

                    <div className="space-y-1">
                      {currentRound.penaltyList.map((pen, pIdx) => {
                        const penConfig = fData.penalties?.[pen.label] || {};
                        const isApplied = penConfig.applied;
                        const isPointsType = pen.type === 'POINTS';

                        return (
                          <div 
                            key={pIdx}
                            className={`p-1.5 rounded-xl border flex items-center justify-between gap-1 transition ${
                              isApplied ? 'bg-rose-500/10 border-rose-500/50' : 'bg-slate-900/80 border-white/5'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => toggleFopPenalty(fopKey, pen.label)}
                              className="flex items-center gap-1 text-left truncate flex-1 cursor-pointer"
                            >
                              <span className={`w-3 h-3 rounded flex items-center justify-center border text-[8px] font-bold ${
                                isApplied ? 'bg-rose-500 text-white border-rose-500' : 'border-gray-600'
                              }`}>
                                {isApplied ? '✓' : ''}
                              </span>
                              <span className={`text-[10px] font-bold truncate ${isApplied ? 'text-rose-300' : 'text-gray-400'}`}>
                                {pen.label}
                              </span>
                            </button>

                            <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              isPointsType ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                            }`}>
                              {isPointsType ? `-${pen.value || 50} pts` : `+${pen.value || pen.seconds || 5}s`}
                            </span>

                            {isApplied && pen.perPlayer !== false && !isPointsType && !isFormationRound && (
                              <div className="flex items-center gap-1 bg-black/60 px-1 py-0.5 rounded-lg border border-slate-700 shrink-0">
                                <span className="text-[8px] text-gray-400">खेळाडू:</span>
                                <input
                                  type="number"
                                  min={1}
                                  max={10}
                                  value={penConfig.playerCount || 1}
                                  onChange={(e) => handlePlayerCountChange(fopKey, pen.label, e.target.value)}
                                  className="w-6 bg-transparent text-amber-400 font-mono font-bold text-[10px] text-center focus:outline-none"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="pt-2 border-t border-white/10 flex justify-between items-center bg-black/60 p-2.5 rounded-2xl mt-2">
                <div>
                  <span className="text-[8px] text-gray-400 block">
                    {isFormationRound ? 'रचना गुण:' : 'अंतिम वेळ:'}
                  </span>
                  <span className="font-mono text-xs font-black text-emerald-400">
                    {isFormationRound ? `${currentPreviewPts} pts` : `${String(Math.floor(finalTimingMs / 60000)).padStart(2, '0')}:${String(Math.floor((finalTimingMs % 60000) / 1000)).padStart(2, '0')}.${String(Math.floor((finalTimingMs % 1000) / 10)).padStart(2, '0')}`}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[8px] text-gray-400 block">
                    {isKnockout ? 'निकाल प्रकार:' : 'अंतिम गुण:'}
                  </span>
                  <span className="text-xs font-mono font-black text-amber-400">
                    {isKnockout ? 'Knockout Match' : `${Math.max(0, currentPreviewPts - totalDeductedPts)} pts`}
                  </span>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 🏆 निकाल विभाग: Results Views                                            */}
      {/* ========================================================================= */}
      <div className="bg-[#0c0d14] border border-amber-500/20 rounded-3xl p-4 space-y-3 shadow-xl">
        <div className="flex justify-between items-center border-b border-white/10 pb-2.5">
          <div className="flex gap-2">
            <button
              onClick={() => setLeaderboardTab('ROUND')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                leaderboardTab === 'ROUND' ? 'bg-amber-500 text-black shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              🚩 या फेरीचा निकाल ({scores.length})
            </button>
            <button
              onClick={() => setLeaderboardTab('CUMULATIVE')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                leaderboardTab === 'CUMULATIVE' ? 'bg-amber-500 text-black shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              🏆 एकूण एकत्रित गुणतक्ता (R1 ते R{currentRoundNumber})
            </button>
          </div>
        </div>

        {leaderboardTab === 'ROUND' ? (
          
          /* ⚔️ १. DUEL (Round 5 / Round 7 Knockout) */
          isDuelFormat ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <span className="text-xs font-black text-orange-400 flex items-center gap-1.5">
                  <Swords className="w-4 h-4" /> द्वंद्व निकाल ({isKnockout ? 'नॉकआउट थेट पात्रता' : 'समोरासमोरील सामने'})
                </span>
                <span className="text-[10px] text-gray-400 font-mono">{scores.length} नोंद</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {Array.from({ length: Math.ceil(teams.length / 2) || 8 }).map((_, mIdx) => {
                  const matchNo = mIdx + 1;
                  const matchScores = scores.filter(s => Number(s.duelMatchNo) === matchNo);
                  const t1Score = matchScores.find(s => s.duelSide === 'FOP1');
                  const t2Score = matchScores.find(s => s.duelSide === 'FOP2');

                  return (
                    <div key={matchNo} className="bg-black/60 border border-orange-500/30 rounded-2xl p-3 space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-mono text-orange-400 border-b border-white/5 pb-1">
                        <span className="font-bold">सामना #{matchNo}</span>
                        <span>{isKnockout ? 'Knockout QF' : `Match ${matchNo}`}</span>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        {t1Score ? (
                          <div className={`p-2 rounded-xl flex justify-between items-center border ${
                            t1Score.roundRank === 1 ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-bold' : 'bg-slate-900 border-white/5'
                          }`}>
                            <div className="truncate">
                              <span className="block truncate">{t1Score.teamName}</span>
                              <span className="text-[9px] text-gray-400 font-mono">{t1Score.finalFormattedTime}</span>
                            </div>
                            <div className="text-right shrink-0">
                              {isKnockout ? (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-black ${t1Score.roundRank === 1 ? 'bg-emerald-500 text-black' : 'bg-rose-500/20 text-rose-400'}`}>
                                  {t1Score.roundRank === 1 ? '🏆 WIN' : 'OUT'}
                                </span>
                              ) : (
                                <span className="text-amber-400 font-bold font-mono">{t1Score.pointsAwarded} pts</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="bg-slate-900/50 p-2 rounded-xl text-center text-gray-600 text-[10px]">TBD (FOP 1)</div>
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
                              {isKnockout ? (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-black ${t2Score.roundRank === 1 ? 'bg-emerald-500 text-black' : 'bg-rose-500/20 text-rose-400'}`}>
                                  {t2Score.roundRank === 1 ? '🏆 WIN' : 'OUT'}
                                </span>
                              ) : (
                                <span className="text-amber-400 font-bold font-mono">{t2Score.pointsAwarded} pts</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="bg-slate-900/50 p-2 rounded-xl text-center text-gray-600 text-[10px]">TBD (FOP 2)</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          /* 🏆 २. FORMATION_DIFFICULTY (Round 6) */
          ) : isFormationRound ? (
            <div className="bg-black/50 border border-amber-500/30 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-center text-xs font-black text-amber-400 border-b border-white/5 pb-2">
                <span className="flex items-center gap-1.5">
                  <Trophy className="w-4 h-4" /> {currentRound?.roundName} (रचना काठिण्य निकाल)
                </span>
                <span className="text-[10px] text-gray-400 font-mono">{scores.length} नोंद पूर्ण</span>
              </div>

              {scores.length === 0 ? (
                <div className="text-center py-6 text-gray-600 text-xs font-bold">या फेरीत अद्याप स्कोअर नोंदवला नाही</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {scores
                    .sort((a, b) => (Number(b.pointsAwarded) || 0) - (Number(a.pointsAwarded) || 0))
                    .map((s, idx) => (
                      <div key={s.id} className="bg-slate-900/90 border border-white/10 p-3 rounded-2xl flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <span className={`w-6 h-6 rounded-lg text-[10px] font-black flex items-center justify-center shrink-0 ${
                            idx === 0 ? 'bg-amber-400 text-black shadow' : 
                            idx === 1 ? 'bg-slate-300 text-black' : 
                            idx === 2 ? 'bg-amber-700 text-white' : 'bg-white/10 text-gray-400'
                          }`}>
                            #{idx + 1}
                          </span>
                          <div className="truncate">
                            <h5 className="font-bold text-white truncate">{s.teamName}</h5>
                            <span className="text-[10px] text-amber-300 font-mono block">
                              {s.formationName || 'रचना'} • {s.situation}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono text-sm font-black text-emerald-400 block">{s.pointsAwarded} pts</span>
                          <button
                            onClick={() => handleDeleteScore(s.id, s.teamName)}
                            className="p-1 text-gray-500 hover:text-rose-400 transition"
                            title="हटवा"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

          /* ⏱️ ३. SINGLE / MULTI (Round 4) */
          ) : isSingleFormat ? (
            <div className="bg-black/50 border border-amber-500/30 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-center text-xs font-black text-amber-400 border-b border-white/5 pb-2">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" /> {currentRound?.roundName} (सिंगल रँकिंग निकाल)
                </span>
                <span className="text-[10px] text-gray-400 font-mono">{scores.length} नोंद पूर्ण</span>
              </div>

              {scores.length === 0 ? (
                <div className="text-center py-6 text-gray-600 text-xs font-bold">या फेरीत अद्याप स्कोअर नोंदवला नाही</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                  {scores
                    .sort((a, b) => {
                      if ((b.pointsAwarded || 0) !== (a.pointsAwarded || 0)) {
                        return (b.pointsAwarded || 0) - (a.pointsAwarded || 0);
                      }
                      return (a.finalTimingMs || 0) - (b.finalTimingMs || 0);
                    })
                    .map((s, idx) => (
                      <div key={s.id} className="bg-slate-900/90 border border-white/10 p-2.5 rounded-xl flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <span className={`w-6 h-6 rounded-lg text-[10px] font-black flex items-center justify-center shrink-0 ${
                            idx === 0 ? 'bg-amber-400 text-black shadow' : 
                            idx === 1 ? 'bg-slate-300 text-black' : 
                            idx === 2 ? 'bg-amber-700 text-white' : 'bg-white/10 text-gray-400'
                          }`}>
                            #{idx + 1}
                          </span>
                          <div className="truncate">
                            <h5 className="font-bold text-white truncate">{s.teamName}</h5>
                            <span className="text-[9px] text-gray-400">{s.city} • {s.situation}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <span className="font-mono text-xs font-bold text-emerald-400 block">{s.finalFormattedTime}</span>
                            <span className="text-[10px] text-amber-400 font-bold">{s.pointsAwarded} pts</span>
                          </div>
                          <button
                            onClick={() => handleDeleteScore(s.id, s.teamName)}
                            className="p-1 text-gray-500 hover:text-rose-400 transition"
                            title="हटवा"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

          /* 👥 ४. GROUP STAGE (Round 1 / Round 2) */
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {activeGroups.map(grpName => {
                const grpScores = scores
                  .filter(s => (r1Fixtures[s.teamId]?.group || s.group) === grpName)
                  .sort((a, b) => {
                    if ((b.pointsAwarded || 0) !== (a.pointsAwarded || 0)) {
                      return (b.pointsAwarded || 0) - (a.pointsAwarded || 0);
                    }
                    return (a.finalTimingMs || 0) - (b.finalTimingMs || 0);
                  });

                return (
                  <div key={grpName} className="bg-black/50 border border-blue-500/30 rounded-2xl p-3 space-y-2">
                    <div className="flex justify-between items-center text-xs font-black text-blue-300 border-b border-white/5 pb-1.5">
                      <span>{grpName}</span>
                      <span className="text-[10px] text-gray-400 font-mono">{grpScores.length} नोंद</span>
                    </div>

                    {grpScores.length === 0 ? (
                      <div className="text-center py-4 text-gray-600 text-xs">नोंद झालेली नाही</div>
                    ) : (
                      grpScores.map((s, idx) => (
                        <div key={s.id} className="bg-slate-900 p-2.5 rounded-xl flex items-center justify-between gap-1 text-xs">
                          <div className="flex items-center gap-2 truncate">
                            <span className={`w-5 h-5 rounded-lg text-[10px] font-black flex items-center justify-center shrink-0 ${
                              idx === 0 ? 'bg-amber-400 text-black' : idx === 1 ? 'bg-slate-300 text-black' : 'bg-white/10 text-gray-400'
                            }`}>
                              {idx + 1}
                            </span>
                            <span className="font-bold text-white truncate">{s.teamName}</span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right">
                              <span className="font-mono text-xs font-bold text-emerald-400 block">{s.finalFormattedTime}</span>
                              <span className="text-[10px] text-amber-400 font-bold">{s.pointsAwarded} pts</span>
                            </div>
                            <button
                              onClick={() => handleDeleteScore(s.id, s.teamName)}
                              className="p-1 text-gray-500 hover:text-rose-400 transition"
                              title="हटवा"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                );
              })}
            </div>
          )

        ) : (

          /* 🏆 एकूण एकत्रित गुणतक्ता (Cumulative Standings) */
          <div className="space-y-2">
            <div className="text-[11px] text-amber-400 font-bold px-1 flex items-center justify-between">
              <span>⚡ चालू फेरी क्र. {currentRoundNumber} पर्यंतचा एकत्रित गुणतक्ता:</span>
              <span className="text-[10px] text-gray-400">जास्त गुणांना सर्वोच्च रँक</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
              {cumulativeLeaderboard.map((t, idx) => (
                <div key={t.id} className="bg-black/50 border border-white/10 p-3 rounded-2xl flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 truncate">
                    <span className={`w-7 h-7 rounded-xl font-black text-xs flex items-center justify-center shrink-0 ${
                      idx === 0 ? 'bg-amber-400 text-black shadow' : 
                      idx === 1 ? 'bg-slate-300 text-black' : 
                      idx === 2 ? 'bg-amber-700 text-white' : 'bg-white/5 text-gray-400'
                    }`}>
                      #{idx + 1}
                    </span>
                    <div className="truncate">
                      <h5 className="text-xs font-bold text-white truncate">{t.teamName}</h5>
                      <span className="text-[10px] text-gray-400">{t.city}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-xs font-black text-amber-400 block">{t.totalPts} pts</span>
                    <span className="text-[9px] text-gray-500">{t.completedRounds} फेऱ्या पूर्ण</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

    </div>
  );
}