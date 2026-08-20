// ==========================================
// #SECTION: DAHI HANDI LIVE SCORING JUDGE CONSOLE (DYNAMIC RANK-BASED POINTS SYSTEM)
// ==========================================
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { 
  collection, doc, getDocs, setDoc, deleteDoc, 
  serverTimestamp, onSnapshot, writeBatch 
} from 'firebase/firestore';
import Swal from 'sweetalert2';
import { 
  CheckCircle2, Trash2, Clock, Award, AlertTriangle, 
  Layers, Users, Swords, Trophy, Sparkles, Network
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

  // 1️⃣ डेटा लोड करणे
  useEffect(() => {
    if (!tournamentId) return;
    const fetchInitial = async () => {
      setLoading(true);
      try {
        const rSnap = await getDocs(collection(db, 'dahi_handi_tournaments', tournamentId, 'rounds'));
        const rList = rSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        rList.sort((a, b) => parseFloat(a.roundNumber) - parseFloat(b.roundNumber));
        setRounds(rList);

        if (rList.length > 0) {
          setSelectedRoundId(prev => prev || rList[0].id);
        }

        const tSnap = await getDocs(collection(db, 'dahi_handi_tournaments', tournamentId, 'teams'));
        const tList = tSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setTeams(tList);

        const r1Id = rList.find(r => parseFloat(r.roundNumber) === 1)?.id || rList[0]?.id;
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

  // 2️⃣ रिअल-टाइम स्कोअर
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

  // 3️⃣ Fixtures लोड करणे व FOP कार्ड्स तयार करणे
  useEffect(() => {
    if (!tournamentId || !selectedRoundId) return;
    const loadFixturesAndSync = async () => {
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
        console.error("Fixture sync error:", e);
      }
    };
    loadFixturesAndSync();
  }, [tournamentId, selectedRoundId, activeGroup, selectedDuelMatchNo]);

  // फॉरमॅट फ्लॅग्ज
  const currentRound = rounds.find(r => r.id === selectedRoundId);
  const isPureDuelFormat = currentRound?.matchFormat === 'DUEL';
  const isGroupDuel = currentRound?.matchFormat === 'GROUP_DUEL' || (currentRound?.matchFormat === 'GROUP' && currentRound?.groupExecutionType === 'DUEL');
  const isDuelFormat = isPureDuelFormat || isGroupDuel;

  const isFormationRound = currentRound?.matchFormat === 'FORMATION_DIFFICULTY';
  const isSingleFormat = currentRound?.matchFormat === 'SINGLE' || isFormationRound;
  const isGroupFormat = currentRound?.matchFormat === 'GROUP' || currentRound?.matchFormat === 'GROUP_DUEL';
  const isGroupSyncFormat = currentRound?.matchFormat === 'GROUP' && !isGroupDuel;
  const isKnockout = currentRound?.type === 'KNOCKOUT';

  const roundQualifiedTeamsCount = Number(currentRound?.qualifiedTeamsCount) || teams.length;
  const totalDuelMatchesCount = Math.max(1, Math.floor(roundQualifiedTeamsCount / 2));

  // 🎯 FOP सेटअप
  const initDynamicFops = (currentR, tList = teams, fMap = fixtures) => {
    if (!currentR) return;
    const format = currentR.matchFormat;
    const isGrpDuel = format === 'GROUP_DUEL' || (format === 'GROUP' && currentR.groupExecutionType === 'DUEL');
    const newStates = {};

    if (format === 'DUEL' || isGrpDuel) {
      let t1, t2;
      if (isGrpDuel) {
        t1 = tList.find(t => fMap[t.id]?.group === activeGroup && fMap[t.id]?.duelMatchNo === selectedDuelMatchNo && fMap[t.id]?.duelSide === 'FOP1');
        t2 = tList.find(t => fMap[t.id]?.group === activeGroup && fMap[t.id]?.duelMatchNo === selectedDuelMatchNo && fMap[t.id]?.duelSide === 'FOP2');
      } else {
        t1 = tList.find(t => fMap[t.id]?.duelMatchNo === selectedDuelMatchNo && fMap[t.id]?.duelSide === 'FOP1');
        t2 = tList.find(t => fMap[t.id]?.duelMatchNo === selectedDuelMatchNo && fMap[t.id]?.duelSide === 'FOP2');
      }

      newStates['FOP 1'] = createEmptyFopState(t1?.id || '', currentR);
      newStates['FOP 2'] = createEmptyFopState(t2?.id || '', currentR);

    } else if (format === 'GROUP') {
      const groupTeams = tList
        .filter(t => (fMap[t.id]?.group || r1Fixtures[t.id]?.group || 'Group A') === activeGroup)
        .sort((a, b) => (fMap[a.id]?.slotNumber || 0) - (fMap[b.id]?.slotNumber || 0));

      const count = groupTeams.length > 0 ? groupTeams.length : 4;
      for (let i = 0; i < count; i++) {
        newStates[`FOP ${i + 1}`] = createEmptyFopState(groupTeams[i]?.id || '', currentR);
      }

    } else {
      const assignedIds = Object.keys(fMap);
      const defaultTeamId = assignedIds.length > 0 ? assignedIds[0] : (tList[0]?.id || '');
      newStates['FOP 1'] = createEmptyFopState(defaultTeamId, currentR);
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

  // 💾 निकाल सेव्ह करणे (रँकनुसार अचूक गुण वाटप)
  const handleSaveScores = async () => {
    const activeFopKeys = Object.keys(fopStates).filter(f => fopStates[f].teamId);

    if (activeFopKeys.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'संघ निवडलेला नाही!',
        text: 'निकाल नोंदवण्यासाठी कृपया आधी संघ निवडा.',
        confirmButtonColor: '#f59e0b',
        background: '#0c0d14',
        color: '#fff'
      });
      return;
    }

    // ⏱️ अनिवार्य वेळ तपासणी (केवळ गैर-इन्टेंट व गैर-फॉर्मेशनसाठी)
    if (!isFormationRound) {
      for (const fopKey of activeFopKeys) {
        const data = fopStates[fopKey];
        if (data.situation !== 'INTENT') {
          const m = Number(data.min) || 0;
          const s = Number(data.sec) || 0;
          const milli = Number(data.ms) || 0;
          const rawTimeMs = (m * 60 * 1000) + (s * 1000) + (milli * 10);

          if (rawTimeMs === 0) {
            const teamObj = teams.find(t => t.id === data.teamId);
            Swal.fire({
              icon: 'warning',
              title: 'वेळ (Time) भरणे अनिवार्य आहे!',
              text: `कृपया ${fopKey} (${teamObj?.teamName || 'संघ'}) साठी अचूक स्टॉपवॉच वेळ भरा.`,
              confirmButtonColor: '#f59e0b',
              background: '#0c0d14',
              color: '#fff'
            });
            return;
          }
        }
      }
    }

    setSavingAll(true);
    try {
      // १. सर्व सक्रिय FOPs चा डेटा तयार करणे
      const calculatedFops = activeFopKeys.map(fopKey => {
        const data = fopStates[fopKey];
        const teamObj = teams.find(t => t.id === data.teamId);

        const m = Number(data.min) || 0;
        const s = Number(data.sec) || 0;
        const milli = Number(data.ms) || 0;
        const rawTimeMs = (m * 60 * 1000) + (s * 1000) + (milli * 10);

        const { totalPenaltySec, totalDeductedPts } = calculateFopPenalties(data);
        const finalTimingMs = rawTimeMs + (totalPenaltySec * 1000);
        const teamOriginalGroup = fixtures[data.teamId]?.group || r1Fixtures[data.teamId]?.group || activeGroup;

        return {
          fopKey,
          data,
          teamObj,
          m, s, milli,
          rawTimeMs,
          totalPenaltySec,
          totalDeductedPts,
          finalTimingMs,
          teamOriginalGroup
        };
      });

      // 🎯 २. रँकिंग व गुण वाटप लॉजिक (Rank Evaluation)
      const pointsList = currentRound?.pointsList || [
        { label: 'Rank 1', points: 1000 },
        { label: 'Rank 2', points: 700 },
        { label: 'Rank 3', points: 500 },
        { label: 'Rank 4', points: 300 }
      ];
      const configuredIntentPts = Number(currentRound?.intentPoints !== undefined ? currentRound.intentPoints : 200);

      // ज्या संघांनी यशस्वी थर लावले (DESCARREGAT / CARREGAT) त्यांना वेळेनुसार सॉर्ट करणे
      const sitOrder = { DESCARREGAT: 1, CARREGAT: 2, INTENT: 3 };
      
      const sortedSuccessful = calculatedFops
        .filter(item => item.data.situation !== 'INTENT')
        .sort((a, b) => {
          if (sitOrder[a.data.situation] !== sitOrder[b.data.situation]) {
            return sitOrder[a.data.situation] - sitOrder[b.data.situation];
          }
          return a.finalTimingMs - b.finalTimingMs;
        });

      const batch = writeBatch(db);

      for (const item of calculatedFops) {
        const { fopKey, data, teamObj, m, s, milli, rawTimeMs, totalPenaltySec, totalDeductedPts, finalTimingMs, teamOriginalGroup } = item;

        let basePts = 0;
        let assignedRank = 1;
        let isWinner = false;
        let selectedFormationName = '';
        let selectedFormationStructure = '';

        if (isFormationRound) {
          const fmtList = currentRound?.formationList || [];
          const activeFmtName = data.selectedFormation || fmtList[0]?.name;
          const chosenFmt = fmtList.find(f => f.name === activeFmtName) || fmtList[0];

          selectedFormationName = chosenFmt?.name || '';
          selectedFormationStructure = chosenFmt?.structure || '';

          if (data.situation === 'DESCARREGAT') basePts = Number(chosenFmt?.descarregat) || 0;
          else if (data.situation === 'CARREGAT') basePts = Number(chosenFmt?.carregat) || 0;
          else basePts = Number(chosenFmt?.intent) || 0;

        } else if (isKnockout) {
          basePts = 0;
        } else if (data.situation === 'INTENT') {
          // ❌ इन्टेंट गुण
          basePts = configuredIntentPts;
          assignedRank = pointsList.length; // शेवटचा रँक
        } else {
          // 🏆 यशस्वी थरांसाठी वेळेनुसार अचूक रँक गुण (Rank 1 = 1000, Rank 2 = 700, Rank 3 = 500, Rank 4 = 300)
          const rankIndex = sortedSuccessful.findIndex(sItem => sItem.data.teamId === data.teamId);
          assignedRank = rankIndex !== -1 ? rankIndex + 1 : 1;
          
          const rankPointConfig = pointsList[rankIndex] || pointsList[pointsList.length - 1];
          basePts = Number(rankPointConfig?.points) || 1000;
        }

        // DUEL फॉरमॅट असल्यास विजेता ठरवणे
        if (isDuelFormat && activeFopKeys.length === 2) {
          const d1 = calculatedFops.find(f => f.fopKey === 'FOP 1');
          const d2 = calculatedFops.find(f => f.fopKey === 'FOP 2');

          if (d1 && d2) {
            if (sitOrder[d1.data.situation] !== sitOrder[d2.data.situation]) {
              isWinner = fopKey === 'FOP 1' 
                ? sitOrder[d1.data.situation] < sitOrder[d2.data.situation] 
                : sitOrder[d2.data.situation] < sitOrder[d1.data.situation];
            } else {
              isWinner = fopKey === 'FOP 1' 
                ? d1.finalTimingMs <= d2.finalTimingMs 
                : d2.finalTimingMs < d1.finalTimingMs;
            }

            assignedRank = isWinner ? 1 : 2;
            if (!isKnockout && !isFormationRound && data.situation !== 'INTENT') {
              basePts = isWinner ? (Number(pointsList[0]?.points) || 1000) : (Number(pointsList[1]?.points) || 700);
            }
          }
        }

        const finalAwardedPts = isKnockout ? 0 : Math.max(0, basePts - totalDeductedPts);

        const currentScorePayload = {
          roundId: selectedRoundId,
          roundNumber: currentRound?.roundNumber || '1',
          roundName: currentRound?.roundName || '',
          matchFormat: currentRound?.matchFormat || 'GROUP',
          roundType: currentRound?.type || 'LEAGUE',
          teamId: data.teamId,
          teamName: teamObj?.teamName || '',
          city: teamObj?.city || 'महाराष्ट्र',
          group: teamOriginalGroup,
          fopNo: fopKey,
          duelMatchNo: selectedDuelMatchNo,
          duelSide: fopKey === 'FOP 1' ? 'FOP1' : 'FOP2',
          roundRank: assignedRank,
          isWinner,
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

      Swal.fire({
        icon: 'success',
        title: 'निकाल रँकनुसार सेव्ह झाला!',
        text: 'प्रत्येक संघाला त्याच्या वेळेनुसार आणि रँकनुसार अचूक गुण वाटप झाले आहेत.',
        timer: 1500,
        showConfirmButton: false,
        background: '#0c0d14',
        color: '#fff'
      });

    } catch (err) {
      console.error("Save error:", err);
      Swal.fire({ icon: 'error', title: 'त्रुटी!', text: 'निकाल सेव्ह करता आला नाही.' });
    } finally {
      setSavingAll(false);
    }
  };

  const handleDeleteScore = async (id, name) => {
    const res = await Swal.fire({
      title: 'निकाल हटवायचा आहे का?',
      text: `"${name}" या संघाची नोंद हटवली जाईल.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'होय, हटवा',
      cancelButtonText: 'रद्द करा',
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

  const activeGroups = currentRound?.groupList?.length ? currentRound.groupList : ['Group A', 'Group B', 'Group C', 'Group D'];

  return (
    <div className="space-y-5 text-white font-sans w-full">
      
      {/* 🔝 हेडर व कंट्रोल्स */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-[#0c0d14] border border-amber-500/20 p-3.5 sm:p-4 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <Layers className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              📋 जज स्कोअरशीट कन्सोल — {currentRound?.roundName || 'फेरी'}
            </h3>
            <p className="text-[10px] text-gray-400">
              फॉरमॅट: <b className="text-amber-400">{currentRound?.matchFormat}</b> • {isGroupDuel ? '⚔️ ग्रुप अंतर्गत डुएल सामने' : isGroupSyncFormat ? '👥 ग्रुप सिंक (रँकनुसार गुण वाटप)' : isFormationRound ? 'काठिण्य पातळी' : isKnockout ? 'नॉकआउट बाद फेरी' : `थर: ${currentRound?.tierHeight || 5}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Round Selector */}
          <div className="flex items-center gap-1.5 bg-black/60 px-2.5 py-1.5 rounded-xl border border-white/10">
            <span className="text-[11px] font-bold text-gray-300">फेरी:</span>
            <select
              value={selectedRoundId}
              onChange={(e) => {
                setSelectedRoundId(e.target.value);
                setSelectedDuelMatchNo(1);
              }}
              className="bg-transparent text-amber-400 font-bold text-xs focus:outline-none cursor-pointer"
            >
              {rounds.map(r => (
                <option key={r.id} value={r.id} className="bg-slate-900 text-white">
                  फेरी #{r.roundNumber}: {r.roundName}
                </option>
              ))}
            </select>
          </div>

          {/* Group Selector */}
          {isGroupFormat && (
            <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-blue-500/30">
              {activeGroups.map(grp => (
                <button
                  key={grp}
                  onClick={() => {
                    setActiveGroup(grp);
                    setSelectedDuelMatchNo(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activeGroup === grp ? 'bg-blue-500 text-black shadow font-black' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {grp}
                </button>
              ))}
            </div>
          )}

          {/* Match Selector */}
          {isDuelFormat && (
            <div className="flex items-center gap-1.5 bg-black/60 px-2.5 py-1.5 rounded-xl border border-orange-500/30">
              <Swords className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-[11px] font-bold text-gray-300">सामना:</span>
              <select
                value={selectedDuelMatchNo}
                onChange={(e) => setSelectedDuelMatchNo(Number(e.target.value))}
                className="bg-transparent text-orange-400 font-bold text-xs focus:outline-none cursor-pointer"
              >
                {Array.from({ length: isGroupDuel ? 2 : totalDuelMatchesCount }).map((_, idx) => (
                  <option key={idx + 1} value={idx + 1} className="bg-slate-900 text-white">
                    सामना #{idx + 1} {isGroupDuel ? `(${activeGroup})` : ''}
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

      {/* 🎯 FOP स्कोरिंग कार्ड्स */}
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
          } else if (fData.situation === 'INTENT') {
            currentPreviewPts = Number(currentRound?.intentPoints !== undefined ? currentRound.intentPoints : 200);
          } else {
            currentPreviewPts = currentRound?.pointsList?.[0]?.points || 1000;
          }

          return (
            <div 
              key={fopKey}
              className="bg-[#0c0d14] border border-amber-500/20 hover:border-amber-500/40 rounded-3xl p-4 space-y-3 shadow-xl transition flex flex-col justify-between"
            >
              <div className="space-y-3">
                
                {/* Header */}
                <div className="flex justify-between items-center bg-black/60 p-2 rounded-2xl border border-white/5">
                  <span className="text-xs font-black text-amber-400 font-mono flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span> {fopKey} {isDuelFormat ? (fopKey === 'FOP 1' ? '(Team A)' : '(Team B)') : ''}
                  </span>
                  <span className="text-[10px] text-gray-400 font-bold">
                    {isDuelFormat ? `सामना #${selectedDuelMatchNo}` : isFormationRound ? 'काठिण्य पातळी' : 'जज कन्सोल'}
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
                      <option key={t.id} value={t.id}>#{t.chestNumber || '-'} {t.teamName} ({t.city})</option>
                    ))}
                  </select>
                </div>

                {/* काठिण्य पातळी रचना निवड */}
                {isFormationRound && (
                  <div className="bg-black/50 p-3 rounded-2xl border border-amber-500/30 space-y-2">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-amber-400 font-bold flex items-center gap-1">
                        <Trophy className="w-3.5 h-3.5" /> रचना निवडा:
                      </span>
                      <span className="text-gray-400 font-mono">{currentChosenFmt?.structure || ''}</span>
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

                {/* ⏱️ स्टॉपवॉच वेळ */}
                {!isFormationRound && (
                  <div className="bg-black/60 p-2.5 rounded-2xl border border-white/5 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-amber-400 text-[10px] flex items-center gap-1">
                        <Clock className="w-3 h-3" /> मूळ वेळ (Stopwatch Time) <span className="text-rose-400">*</span>:
                      </span>
                      <span className="text-[9px] text-gray-400">अनिवार्य</span>
                    </div>

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
                    {isKnockout ? 'नॉकआउट सामना' : `${Math.max(0, currentPreviewPts - totalDeductedPts)} pts`}
                  </span>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 🏆 निकाल विभाग: गटनिहाय थेट रँकिंग (Group-Wise Live Standings)              */}
      {/* ========================================================================= */}
      <div className="bg-[#0c0d14] border border-amber-500/20 rounded-3xl p-4 sm:p-5 space-y-4 shadow-xl">
        
        <div className="flex justify-between items-center border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs sm:text-sm font-black text-white">
              {currentRound?.roundName} — {isGroupFormat ? 'गटनिहाय चालू निकाल व रँकिंग (Group-Wise Live Standings)' : 'या फेरीचा थेट निकाल'}
            </h4>
          </div>
          <span className="text-[10px] font-mono text-gray-400">{scores.length} नोंद पूर्ण</span>
        </div>

        {/* 👥 १. जर GROUP / GROUP_DUEL फेरी असेल तर गटनिहाय रँकिंग बोर्ड्स */}
        {isGroupFormat ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {activeGroups.map(grpName => {
              const grpScores = scores
                .filter(s => (fixtures[s.teamId]?.group || r1Fixtures[s.teamId]?.group || s.group) === grpName)
                .sort((a, b) => {
                  if ((b.pointsAwarded || 0) !== (a.pointsAwarded || 0)) {
                    return (b.pointsAwarded || 0) - (a.pointsAwarded || 0);
                  }
                  return (a.finalTimingMs || 999999) - (b.finalTimingMs || 999999);
                });

              return (
                <div key={grpName} className="bg-black/50 border border-blue-500/30 rounded-2xl p-3.5 space-y-2.5 shadow-lg">
                  
                  <div className="flex justify-between items-center text-xs font-black text-blue-300 border-b border-white/5 pb-2">
                    <span className="flex items-center gap-1.5">
                      <Network className="w-3.5 h-3.5" /> {grpName}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">{grpScores.length} नोंद</span>
                  </div>

                  {grpScores.length === 0 ? (
                    <div className="text-center py-5 text-gray-600 text-xs">या गटात स्कोअर नोंदवलेला नाही</div>
                  ) : (
                    <div className="space-y-1.5">
                      {grpScores.map((s, idx) => (
                        <div key={s.id} className="bg-slate-900/90 border border-white/5 p-2 rounded-xl flex items-center justify-between gap-1 text-xs">
                          <div className="flex items-center gap-2 truncate">
                            <span className={`w-5 h-5 rounded-lg text-[10px] font-black flex items-center justify-center shrink-0 ${
                              idx === 0 ? 'bg-amber-400 text-black shadow' : 
                              idx === 1 ? 'bg-slate-300 text-black' : 
                              idx === 2 ? 'bg-amber-700 text-white' : 'bg-white/10 text-gray-400'
                            }`}>
                              #{idx + 1}
                            </span>
                            <div className="truncate">
                              <span className="font-bold text-white truncate block">{s.teamName}</span>
                              <span className="text-[9px] text-gray-400 font-mono">
                                {s.situation === 'INTENT' ? 'INTENT' : s.finalFormattedTime}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <div className="text-right">
                              <span className="text-[11px] text-amber-400 font-black font-mono block">{s.pointsAwarded} pts</span>
                              <span className="text-[8px] text-gray-500 uppercase">{s.situation}</span>
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
              );
            })}
          </div>
        ) : (

          /* ⚔️ २. OVERALL DUEL / SINGLE / FORMATION निकाल यादी */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
            {scores.length === 0 ? (
              <div className="col-span-full py-6 text-center text-gray-500 text-xs">या फेरीत अद्याप कोणताही स्कोअर नोंदवलेला नाही.</div>
            ) : (
              scores
                .sort((a, b) => (b.pointsAwarded || 0) - (a.pointsAwarded || 0) || (a.finalTimingMs || 999999) - (b.finalTimingMs || 999999))
                .map((s, idx) => (
                  <div key={s.id} className="bg-slate-900/90 border border-white/10 p-3 rounded-2xl flex items-center justify-between gap-2 text-xs shadow">
                    <div className="flex items-center gap-2 truncate">
                      <span className={`w-6 h-6 rounded-lg text-[10px] font-black flex items-center justify-center shrink-0 ${
                        idx === 0 ? 'bg-amber-400 text-black' : 'bg-white/10 text-gray-300'
                      }`}>
                        #{idx + 1}
                      </span>
                      <div className="truncate">
                        <h5 className="font-bold text-white truncate">{s.teamName}</h5>
                        <span className="text-[9px] text-gray-400 font-mono block">
                          {s.situation} • {s.finalFormattedTime}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-xs font-black text-amber-400">{s.pointsAwarded} pts</span>
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
        )}

      </div>

    </div>
  );
}