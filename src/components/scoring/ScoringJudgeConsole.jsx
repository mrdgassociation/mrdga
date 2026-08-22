// ==========================================
// #SECTION: DAHI HANDI LIVE SCORING JUDGE CONSOLE (WITH DYNAMIC ADVANCING WINNERS COUNT)
// ==========================================
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { 
  collection, doc, getDocs, setDoc, deleteDoc, 
  serverTimestamp, writeBatch 
} from 'firebase/firestore';
import Swal from 'sweetalert2';
import { 
  CheckCircle2, Trash2, Clock, Award, AlertTriangle, 
  Layers, Users, Swords, Trophy, Sparkles, Network, ArrowRight, XCircle
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
  const [selectedSlotNumber, setSelectedSlotNumber] = useState(1);
  const [fopStates, setFopStates] = useState({});
  const [savingAll, setSavingAll] = useState(false);

  // 1️⃣ इनिशियल डेटा लोड करणे
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
        setTeams(tSnap.docs.map(d => ({ id: d.id, ...d.data() })));

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

  // 2️⃣ स्कोअर लोड करणे (onSnapshot काढून getDocs केले - Zero Background Reads)
  const loadScores = async () => {
    if (!tournamentId) return;
    try {
      const snap = await getDocs(collection(db, 'dahi_handi_tournaments', tournamentId, 'scores'));
      const sList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllTournamentScores(sList);
      if (selectedRoundId) {
        setScores(sList.filter(s => s.roundId === selectedRoundId));
      }
    } catch (e) {
      console.error("Score fetch error:", e);
    }
  };

  useEffect(() => {
    loadScores();
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
  }, [tournamentId, selectedRoundId, activeGroup, selectedDuelMatchNo, selectedSlotNumber]);

  // 🎯 फॉरमॅट व प्रकार निश्चिती
  const currentRound = rounds.find(r => r.id === selectedRoundId);
  const matchFormat = currentRound?.matchFormat || 'GROUP';
  const rawRoundType = currentRound?.type || 'LEAGUE';

  const isWildcard = rawRoundType === 'WILDCARD' || (currentRound?.roundName || '').toLowerCase().includes('wildcard') || (currentRound?.roundName || '').toLowerCase().includes('repechage');
  const isKnockout = rawRoundType === 'KNOCKOUT' && !isWildcard;

  const isPureGroupSync = matchFormat === 'GROUP' && currentRound?.groupExecutionType !== 'DUEL';
  const isGroupDuel = matchFormat === 'GROUP_DUEL' || (matchFormat === 'GROUP' && currentRound?.groupExecutionType === 'DUEL');
  const isDirectDuel = matchFormat === 'DUEL';
  const isFormationConcur = matchFormat === 'FORMATION_DIFFICULTY' || matchFormat === 'CONCUR';
  const isSingleSlot = matchFormat === 'SINGLE' || isWildcard;
  const isSingleOrConcur = isSingleSlot || isFormationConcur;

  const roundQualifiedTeamsCount = Number(currentRound?.qualifiedTeamsCount) || Object.keys(fixtures).length || teams.length;
  const totalDirectDuelMatches = Math.max(1, Math.floor(roundQualifiedTeamsCount / 2));
  const activeGroups = currentRound?.groupList?.length ? currentRound.groupList : (currentRound?.groupsConfig?.map(g => g.name) || ['Group A', 'Group B', 'Group C', 'Group D']);
  const advancingCutoff = Number(currentRound?.advancingWinnersCount) || (isWildcard ? 1 : 2);

  const getOrderedTeamsList = () => {
    if (Object.keys(fixtures).length === 0) return teams;
    return [...teams].sort((a, b) => {
      const slotA = fixtures[a.id]?.slotNumber || 999;
      const slotB = fixtures[b.id]?.slotNumber || 999;
      return slotA - slotB;
    });
  };

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
      const targetTeam = tList.find(t => fMap[t.id]?.slotNumber === selectedSlotNumber);
      newStates['FOP 1'] = createEmptyFopState(targetTeam ? targetTeam.id : (tList[0]?.id || ''), currentR);
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

  // 💾 स्कोअर सेव्ह व रिफ्रेश
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

    if (!isFormationConcur) {
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
      const newlyEnteredMap = {};

      for (const fopKey of activeFopKeys) {
        const data = fopStates[fopKey];
        const teamObj = teams.find(t => t.id === data.teamId);

        const m = Number(data.min) || 0;
        const s = Number(data.sec) || 0;
        const milli = Number(data.ms) || 0;
        const rawTimeMs = (m * 60 * 1000) + (s * 1000) + (milli * 10);

        const { totalPenaltySec, totalDeductedPts } = calculateFopPenalties(data);
        const finalTimingMs = rawTimeMs + (totalPenaltySec * 1000);
        const teamOriginalGroup = fixtures[data.teamId]?.group || r1Fixtures[data.teamId]?.group || activeGroup;

        let selectedFormationName = '';
        let selectedFormationStructure = '';
        if (isFormationConcur) {
          const fmtList = currentRound?.formationList || [];
          const activeFmtName = data.selectedFormation || fmtList[0]?.name;
          const chosenFmt = fmtList.find(f => f.name === activeFmtName) || fmtList[0];
          selectedFormationName = chosenFmt?.name || '';
          selectedFormationStructure = chosenFmt?.structure || '';
        }

        newlyEnteredMap[data.teamId] = {
          roundId: selectedRoundId,
          roundNumber: currentRound?.roundNumber || '1',
          roundName: currentRound?.roundName || '',
          matchFormat: currentRound?.matchFormat || 'GROUP',
          roundType: isWildcard ? 'WILDCARD' : rawRoundType,
          teamId: data.teamId,
          teamName: teamObj?.teamName || '',
          city: teamObj?.city || 'महाराष्ट्र',
          group: teamOriginalGroup,
          fopNo: fopKey,
          duelMatchNo: selectedDuelMatchNo,
          duelSide: fopKey === 'FOP 1' ? 'FOP1' : 'FOP2',
          slotNumber: fixtures[data.teamId]?.slotNumber || selectedSlotNumber,
          formationName: selectedFormationName,
          formationStructure: selectedFormationStructure,
          situation: data.situation,
          rawTimeMs,
          rawFormattedTime: isFormationConcur ? '-' : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(milli).padStart(2, '0')}`,
          penaltySec: totalPenaltySec,
          deductedPts: totalDeductedPts,
          appliedPenalties: data.penalties || {},
          finalTimingMs: isFormationConcur ? 0 : finalTimingMs,
          finalFormattedTime: isFormationConcur ? '-' : `${String(Math.floor(finalTimingMs / 60000)).padStart(2, '0')}:${String(Math.floor((finalTimingMs % 60000) / 1000)).padStart(2, '0')}.${String(Math.floor((finalTimingMs % 1000) / 10)).padStart(2, '0')}`,
          remarks: data.remarks || '',
          timestamp: serverTimestamp()
        };
      }

      const allRoundScoresMap = {};
      scores.forEach(s => { allRoundScoresMap[s.teamId] = { ...s }; });
      Object.entries(newlyEnteredMap).forEach(([tId, sObj]) => {
        allRoundScoresMap[tId] = { ...allRoundScoresMap[tId], ...sObj };
      });

      const pointsList = currentRound?.pointsList || [
        { label: 'Rank 1', points: 1600 },
        { label: 'Rank 2', points: 1500 },
        { label: 'Rank 3', points: 1400 },
        { label: 'Rank 4', points: 1300 }
      ];
      const configuredIntentPts = Number(currentRound?.intentPoints !== undefined ? currentRound.intentPoints : 200);

      const batch = writeBatch(db);

      const getSitWeight = (sit) => {
        if (sit === 'DESCARREGAT') return 1;
        if (sit === 'CARREGAT') return 2;
        return 3;
      };

      if (isWildcard || isSingleSlot) {
        const sortedList = Object.values(allRoundScoresMap).sort((a, b) => {
          const wA = getSitWeight(a.situation);
          const wB = getSitWeight(b.situation);
          if (wA !== wB) return wA - wB;
          return (a.finalTimingMs || 0) - (b.finalTimingMs || 0);
        });

        sortedList.forEach((s, idx) => {
          const isQualified = idx < advancingCutoff;
          s.roundRank = idx + 1;
          s.isWinner = isQualified;
          s.basePoints = 0;
          s.pointsAwarded = 0;

          const scoreDocId = `SCORE_${selectedRoundId}_${s.teamId}`;
          batch.set(doc(db, 'dahi_handi_tournaments', tournamentId, 'scores', scoreDocId), s, { merge: true });
        });

      } else if (isFormationConcur) {
        const fmtList = currentRound?.formationList || [];
        Object.values(allRoundScoresMap).forEach(s => {
          const chosenFmt = fmtList.find(f => f.name === s.formationName) || fmtList[0];
          let basePts = 0;
          if (s.situation === 'DESCARREGAT') basePts = Number(chosenFmt?.descarregat) || 0;
          else if (s.situation === 'CARREGAT') basePts = Number(chosenFmt?.carregat) || 0;
          else basePts = Number(chosenFmt?.intent) || 0;

          s.basePoints = basePts;
          s.pointsAwarded = Math.max(0, basePts - (s.deductedPts || 0));

          const scoreDocId = `SCORE_${selectedRoundId}_${s.teamId}`;
          batch.set(doc(db, 'dahi_handi_tournaments', tournamentId, 'scores', scoreDocId), s, { merge: true });
        });

      } else if (isDirectDuel || isGroupDuel) {
        Object.values(allRoundScoresMap).forEach(s => {
          const scoreDocId = `SCORE_${selectedRoundId}_${s.teamId}`;
          batch.set(doc(db, 'dahi_handi_tournaments', tournamentId, 'scores', scoreDocId), s, { merge: true });
        });

        if (activeFopKeys.length === 2) {
          const d1 = newlyEnteredMap[fopStates['FOP 1']?.teamId];
          const d2 = newlyEnteredMap[fopStates['FOP 2']?.teamId];

          if (d1 && d2) {
            let isFop1Winner = true;
            const w1 = getSitWeight(d1.situation);
            const w2 = getSitWeight(d2.situation);

            if (w1 !== w2) {
              isFop1Winner = w1 < w2;
            } else {
              isFop1Winner = d1.finalTimingMs <= d2.finalTimingMs;
            }

            const winPts = isKnockout ? 0 : (Number(pointsList[0]?.points) || 1000);
            const losePts = isKnockout ? 0 : (Number(pointsList[1]?.points) || 700);

            batch.update(doc(db, 'dahi_handi_tournaments', tournamentId, 'scores', `SCORE_${selectedRoundId}_${d1.teamId}`), {
              roundRank: isFop1Winner ? 1 : 2,
              isWinner: isFop1Winner,
              basePoints: isKnockout ? 0 : (d1.situation === 'INTENT' ? configuredIntentPts : (isFop1Winner ? winPts : losePts)),
              pointsAwarded: isKnockout ? 0 : (d1.situation === 'INTENT' ? configuredIntentPts : Math.max(0, (isFop1Winner ? winPts : losePts) - (d1.deductedPts || 0)))
            });

            batch.update(doc(db, 'dahi_handi_tournaments', tournamentId, 'scores', `SCORE_${selectedRoundId}_${d2.teamId}`), {
              roundRank: isFop1Winner ? 2 : 1,
              isWinner: !isFop1Winner,
              basePoints: isKnockout ? 0 : (d2.situation === 'INTENT' ? configuredIntentPts : (!isFop1Winner ? winPts : losePts)),
              pointsAwarded: isKnockout ? 0 : (d2.situation === 'INTENT' ? configuredIntentPts : Math.max(0, (!isFop1Winner ? winPts : losePts) - (d2.deductedPts || 0)))
            });
          }
        }

      } else {
        const groupWiseBuckets = {};

        if (isPureGroupSync) {
          Object.values(allRoundScoresMap).forEach(s => {
            const grp = s.group || 'Group A';
            if (!groupWiseBuckets[grp]) groupWiseBuckets[grp] = [];
            groupWiseBuckets[grp].push(s);
          });
        } else {
          groupWiseBuckets['ALL'] = Object.values(allRoundScoresMap);
        }

        Object.values(groupWiseBuckets).forEach(teamList => {
          const sortedList = [...teamList].sort((a, b) => {
            const wA = getSitWeight(a.situation);
            const wB = getSitWeight(b.situation);
            if (wA !== wB) return wA - wB;
            return (a.finalTimingMs || 0) - (b.finalTimingMs || 0);
          });

          sortedList.forEach((s, idx) => {
            const assignedRank = idx + 1;
            let basePts = 0;

            if (isKnockout) {
              basePts = 0;
            } else if (s.situation === 'INTENT') {
              basePts = configuredIntentPts;
            } else {
              const rankPointConfig = pointsList[idx] || pointsList[pointsList.length - 1];
              basePts = Number(rankPointConfig?.points) || 1000;
            }

            s.roundRank = assignedRank;
            s.basePoints = basePts;
            s.pointsAwarded = isKnockout ? 0 : Math.max(0, basePts - (s.deductedPts || 0));

            const scoreDocId = `SCORE_${selectedRoundId}_${s.teamId}`;
            batch.set(doc(db, 'dahi_handi_tournaments', tournamentId, 'scores', scoreDocId), s, { merge: true });
          });
        });
      }

      await batch.commit();
      await loadScores(); // 🎯 स्थानिक स्टेट अपडेट

      Swal.fire({
        icon: 'success',
        title: isWildcard ? 'निकाल सेव्ह झाला!' : isKnockout ? 'नॉकआउट निकाल सेव्ह झाला!' : 'निकाल यशस्वीरीत्या सेव्ह झाला!',
        text: isWildcard ? `Top ${advancingCutoff} संघ पुढील फेरीसाठी पात्र ठरले आहेत.` : 'संघाचे गुण व रँक अचूक अपडेट झाले आहेत.',
        timer: 1500,
        showConfirmButton: false,
        background: '#0c0d14',
        color: '#fff'
      });

      if (isSingleOrConcur && selectedSlotNumber < roundQualifiedTeamsCount) {
        setSelectedSlotNumber(prev => prev + 1);
      }

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
      text: `"${name}" या संघाची नोंद हटवली जाईल व रँकिंग पुन्हा कॅल्क्युलेट होईल.`,
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
        await loadScores(); // 🎯 स्थानिक स्टेट अपडेट
      } catch (e) {
        console.error(e);
      }
    }
  };

  const orderedTeams = getOrderedTeamsList();

  return (
    <div className="space-y-4 text-white font-sans w-full">
      {/* 🔝 मुख्य हेडर व कंट्रोल्स */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-[#0c0d14] border border-amber-500/20 p-3.5 sm:p-4 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <Layers className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              📋 जज स्कोअरशीट कन्सोल — {currentRound?.roundName || 'फेरी'}
            </h3>
            <p className="text-[10px] text-gray-400">
              स्टेज: <b className="text-amber-400">{currentRound?.stage || 'LEAGUE'}</b> • पात्रता: <b className="text-emerald-400">Top {advancingCutoff} Winners</b>
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
                setSelectedSlotNumber(1);
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
          {(isPureGroupSync || isGroupDuel) && (
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
          {(isDirectDuel || isGroupDuel) && (
            <div className="flex items-center gap-1.5 bg-black/60 px-2.5 py-1.5 rounded-xl border border-orange-500/30">
              <Swords className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-[11px] font-bold text-gray-300">सामना:</span>
              <select
                value={selectedDuelMatchNo}
                onChange={(e) => setSelectedDuelMatchNo(Number(e.target.value))}
                className="bg-transparent text-orange-400 font-bold text-xs focus:outline-none cursor-pointer"
              >
                {Array.from({ length: isGroupDuel ? 2 : totalDirectDuelMatches }).map((_, idx) => (
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

      {/* 🎯 SINGLE SLOT / CONCUR: स्लॉट क्रमवारी नेव्हिगेशन बार */}
      {isSingleOrConcur && (
        <div className="bg-[#0c0d14] border border-amber-500/20 p-3 rounded-2xl flex items-center gap-2 overflow-x-auto shadow">
          <span className="text-[11px] font-bold text-amber-400 shrink-0 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> स्लॉट निवडा:
          </span>

          <div className="flex items-center gap-1.5">
            {Array.from({ length: roundQualifiedTeamsCount }).map((_, sIdx) => {
              const slotNum = sIdx + 1;
              const teamAtSlot = teams.find(t => fixtures[t.id]?.slotNumber === slotNum);
              const isScored = teamAtSlot && scores.some(s => s.teamId === teamAtSlot.id);
              const isSelected = selectedSlotNumber === slotNum;

              return (
                <button
                  key={slotNum}
                  type="button"
                  onClick={() => setSelectedSlotNumber(slotNum)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1 cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20 font-black'
                      : isScored
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-black/50 text-gray-400 hover:text-white border border-white/5'
                  }`}
                >
                  <span>#{slotNum}</span>
                  {isScored && <span className="text-[10px]">✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 🎯 FOP स्कोरिंग कार्ड्स */}
      <div className={`grid gap-3.5 ${
        isDirectDuel || isGroupDuel 
          ? 'grid-cols-1 md:grid-cols-2' 
          : isSingleOrConcur 
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

          if (isFormationConcur && currentChosenFmt) {
            if (fData.situation === 'DESCARREGAT') currentPreviewPts = Number(currentChosenFmt.descarregat) || 0;
            else if (fData.situation === 'CARREGAT') currentPreviewPts = Number(currentChosenFmt.carregat) || 0;
            else currentPreviewPts = Number(currentChosenFmt.intent) || 0;
          } else if (fData.situation === 'INTENT') {
            currentPreviewPts = Number(currentRound?.intentPoints !== undefined ? currentRound.intentPoints : 200);
          } else {
            currentPreviewPts = currentRound?.pointsList?.[0]?.points || 1600;
          }

          return (
            <div 
              key={fopKey}
              className="bg-[#0c0d14] border border-amber-500/20 hover:border-amber-500/40 rounded-3xl p-4 space-y-3 shadow-xl transition flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-black/60 p-2 rounded-2xl border border-white/5">
                  <span className="text-xs font-black text-amber-400 font-mono flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span> {fopKey} {(isDirectDuel || isGroupDuel) ? (fopKey === 'FOP 1' ? '(Team A)' : '(Team B)') : isSingleOrConcur ? `(स्लॉट #${selectedSlotNumber})` : ''}
                  </span>
                  <span className="text-[10px] text-gray-400 font-bold">
                    {isWildcard ? 'Wildcard Challenge' : (isDirectDuel || isGroupDuel) ? `सामना #${selectedDuelMatchNo}` : isFormationConcur ? 'Formation Challenge' : 'जज कन्सोल'}
                  </span>
                </div>

                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">गोविंदा पथक:</label>
                  <select
                    value={fData.teamId}
                    onChange={(e) => updateFopState(fopKey, 'teamId', e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 text-white font-bold text-xs p-2.5 rounded-xl focus:border-amber-400 focus:outline-none cursor-pointer"
                  >
                    <option value="">-- संघ निवडा --</option>
                    {orderedTeams.map((t) => {
                      const fixSlot = fixtures[t.id]?.slotNumber;
                      return (
                        <option key={t.id} value={t.id}>
                          {fixSlot ? `[स्लॉट #${fixSlot}] ` : ''}#{t.chestNumber || '-'} {t.teamName} ({t.city || 'महाराष्ट्र'})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {isFormationConcur && (
                  <div className="bg-black/50 p-3 rounded-2xl border border-amber-500/30 space-y-2">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-amber-400 font-bold flex items-center gap-1">
                        <Trophy className="w-3.5 h-3.5" /> रचना निवडा (Formations Matrix):
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

                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">सिच्युएशन (Situation):</label>
                  <div className="grid grid-cols-3 gap-1 text-[10px] font-black">
                    <button
                      type="button"
                      onClick={() => handleSituationChange(fopKey, 'DESCARREGAT')}
                      className={`p-1.5 rounded-xl border transition cursor-pointer ${
                        fData.situation === 'DESCARREGAT' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500 font-black shadow' : 'bg-black/40 text-gray-400 border-white/5'
                      }`}
                    >
                      🏆 DESCAR
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSituationChange(fopKey, 'CARREGAT')}
                      className={`p-1.5 rounded-xl border transition cursor-pointer ${
                        fData.situation === 'CARREGAT' ? 'bg-amber-500/20 text-amber-400 border-amber-500 font-black shadow' : 'bg-black/40 text-gray-400 border-white/5'
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

                {!isFormationConcur && (
                  <div className="bg-black/60 p-2.5 rounded-2xl border border-white/5 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-amber-400 text-[10px] flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> मूळ वेळ (Stopwatch Time) <span className="text-rose-400">*</span>:
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

                {currentRound?.penaltyList?.length > 0 && (
                  <div className="space-y-1.5 bg-black/40 p-2.5 rounded-2xl border border-rose-500/20">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-rose-400 font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> पेनल्टी रकाने:
                      </span>
                      <div className="flex gap-2 font-mono text-[9px] font-bold">
                        {!isFormationConcur && totalPenaltySec > 0 && <span className="text-amber-400">+{totalPenaltySec}s</span>}
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

                            {isApplied && pen.perPlayer !== false && !isPointsType && !isFormationConcur && (
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

              <div className="pt-2 border-t border-white/10 flex justify-between items-center bg-black/60 p-2.5 rounded-2xl mt-2">
                <div>
                  <span className="text-[8px] text-gray-400 block">
                    {isFormationConcur ? 'रचना गुण:' : 'अंतिम वेळ:'}
                  </span>
                  <span className="font-mono text-xs font-black text-emerald-400">
                    {isFormationConcur ? `${currentPreviewPts} pts` : `${String(Math.floor(finalTimingMs / 60000)).padStart(2, '0')}:${String(Math.floor((finalTimingMs % 60000) / 1000)).padStart(2, '0')}.${String(Math.floor((finalTimingMs % 1000) / 10)).padStart(2, '0')}`}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[8px] text-gray-400 block">
                    {isSingleOrConcur ? `Top ${advancingCutoff} Qualified` : isKnockout ? 'फेरी प्रकार:' : 'पूर्वावलोकन गुण:'}
                  </span>
                  <span className={`text-xs font-mono font-black ${isSingleOrConcur ? 'text-purple-400' : isKnockout ? 'text-rose-400' : 'text-amber-400'}`}>
                    {isSingleOrConcur ? `Top ${advancingCutoff} Winners` : isKnockout ? 'नॉकआउट (Win/Loss)' : `${Math.max(0, currentPreviewPts - totalDeductedPts)} pts`}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 🏆 निकाल विभाग */}
      <div className="bg-[#0c0d14] border border-amber-500/20 rounded-3xl p-4 sm:p-5 space-y-4 shadow-xl">
        <div className="flex justify-between items-center border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs sm:text-sm font-black text-white">
              {currentRound?.roundName} — {
                isSingleOrConcur ? `🛡️ थेट निकाल (Top ${advancingCutoff} Teams Qualify)` :
                isGroupDuel ? '⚔️ गट अंतर्गत १ vs १ द्वंद्व निकाल (Group Duel)' :
                isPureGroupSync ? '👥 गटनिहाय निकाल (Group Standings)' :
                isDirectDuel ? (isKnockout ? '🔥 १ विरुद्ध १ नॉकआउट निकाल (Knockout Duel Results)' : '⚔️ १ विरुद्ध १ द्वंद्व निकाल (Direct Duel Standings)') :
                '⏱️ फेरीचा थेट निकाल (Live Standings)'
              }
            </h4>
          </div>
          <span className="text-[10px] font-mono text-gray-400 font-bold">{scores.length} संघ नोंद पूर्ण</span>
        </div>

        {/* प्रकार १: GROUP_DUEL */}
        {isGroupDuel && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {activeGroups.map(grpName => {
              const grpScores = scores.filter(s => s.group === grpName);

              return (
                <div key={grpName} className="bg-slate-900/90 border border-orange-500/30 rounded-2xl p-3.5 space-y-3 shadow-lg">
                  <div className="flex justify-between items-center bg-black/60 p-2 rounded-xl border border-white/5">
                    <span className="font-black text-orange-400 text-xs flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" /> {grpName}
                    </span>
                    <span className="text-[9px] text-gray-400 font-mono">२ द्वंद्व सामने</span>
                  </div>

                  <div className="space-y-2.5">
                    {[1, 2].map(matchNo => {
                      const mScores = grpScores.filter(s => Number(s.duelMatchNo) === matchNo);
                      const t1Score = mScores.find(s => s.duelSide === 'FOP1') || mScores[0];
                      const t2Score = mScores.find(s => s.duelSide === 'FOP2' && s.teamId !== t1Score?.teamId) || mScores[1];

                      const t1Fix = teams.find(t => fixtures[t.id]?.group === grpName && fixtures[t.id]?.duelMatchNo === matchNo && fixtures[t.id]?.duelSide === 'FOP1');
                      const t2Fix = teams.find(t => fixtures[t.id]?.group === grpName && fixtures[t.id]?.duelMatchNo === matchNo && fixtures[t.id]?.duelSide === 'FOP2');

                      return (
                        <div key={matchNo} className="bg-black/60 border border-white/5 rounded-2xl p-2.5 space-y-2">
                          <div className="flex justify-between items-center text-[9px] font-bold text-amber-400 border-b border-white/5 pb-1 font-mono">
                            <span>सामना #{matchNo}</span>
                            <span className="text-gray-400">{t1Score && t2Score ? '✅ पूर्ण' : '⏳ बाकी'}</span>
                          </div>

                          <div className={`p-2 rounded-xl border space-y-1 ${
                            t1Score?.isWinner ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-slate-900/60 border-white/5'
                          }`}>
                            <div className="flex justify-between items-center text-xs">
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="text-[10px]">{t1Score?.isWinner ? '🏆' : '●'}</span>
                                <span className={`font-extrabold truncate max-w-[110px] ${t1Score?.isWinner ? 'text-emerald-400' : 'text-white'}`}>
                                  {t1Score?.teamName || t1Fix?.teamName || '-'}
                                </span>
                              </div>
                              {isKnockout ? (
                                t1Score ? (
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-black font-mono ${
                                    t1Score.isWinner ? 'bg-emerald-500 text-black' : 'bg-rose-500/20 text-rose-400'
                                  }`}>
                                    {t1Score.isWinner ? 'WINNER' : 'LOST'}
                                  </span>
                                ) : <span className="text-gray-500 text-[10px]">-</span>
                              ) : (
                                <span className="font-mono text-xs font-black text-amber-400">
                                  {t1Score ? `${t1Score.pointsAwarded} pts` : '-'}
                                </span>
                              )}
                            </div>

                            {t1Score && (
                              <div className="flex items-center justify-between text-[9px] font-mono text-gray-400 pt-1 border-t border-white/5">
                                <span className={`px-1 rounded font-bold ${
                                  t1Score.situation === 'DESCARREGAT' ? 'text-emerald-400 bg-emerald-500/10' :
                                  t1Score.situation === 'CARREGAT' ? 'text-amber-400 bg-amber-500/10' : 'text-rose-400 bg-rose-500/10'
                                }`}>
                                  {t1Score.situation}
                                </span>
                                <span>मूळ: {t1Score.rawFormattedTime}</span>
                                {t1Score.penaltySec > 0 && <span className="text-rose-400">+{t1Score.penaltySec}s</span>}
                                <span className="text-white font-bold">वेळ: {t1Score.finalFormattedTime}</span>
                              </div>
                            )}
                          </div>

                          <div className="text-center font-mono text-[8px] text-rose-400 font-bold -my-1">VS</div>

                          <div className={`p-2 rounded-xl border space-y-1 ${
                            t2Score?.isWinner ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-slate-900/60 border-white/5'
                          }`}>
                            <div className="flex justify-between items-center text-xs">
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="text-[10px]">{t2Score?.isWinner ? '🏆' : '●'}</span>
                                <span className={`font-extrabold truncate max-w-[110px] ${t2Score?.isWinner ? 'text-emerald-400' : 'text-white'}`}>
                                  {t2Score?.teamName || t2Fix?.teamName || '-'}
                                </span>
                              </div>
                              {isKnockout ? (
                                t2Score ? (
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-black font-mono ${
                                    t2Score.isWinner ? 'bg-emerald-500 text-black' : 'bg-rose-500/20 text-rose-400'
                                  }`}>
                                    {t2Score.isWinner ? 'WINNER' : 'LOST'}
                                  </span>
                                ) : <span className="text-gray-500 text-[10px]">-</span>
                              ) : (
                                <span className="font-mono text-xs font-black text-amber-400">
                                  {t2Score ? `${t2Score.pointsAwarded} pts` : '-'}
                                </span>
                              )}
                            </div>

                            {t2Score && (
                              <div className="flex items-center justify-between text-[9px] font-mono text-gray-400 pt-1 border-t border-white/5">
                                <span className={`px-1 rounded font-bold ${
                                  t2Score.situation === 'DESCARREGAT' ? 'text-emerald-400 bg-emerald-500/10' :
                                  t2Score.situation === 'CARREGAT' ? 'text-amber-400 bg-amber-500/10' : 'text-rose-400 bg-rose-500/10'
                                }`}>
                                  {t2Score.situation}
                                </span>
                                <span>मूळ: {t2Score.rawFormattedTime}</span>
                                {t2Score.penaltySec > 0 && <span className="text-rose-400">+{t2Score.penaltySec}s</span>}
                                <span className="text-white font-bold">वेळ: {t2Score.finalFormattedTime}</span>
                              </div>
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

        {/* प्रकार २: GROUP SYNC */}
        {isPureGroupSync && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {activeGroups.map(grpName => {
              const grpScores = scores
                .filter(s => s.group === grpName)
                .sort((a, b) => {
                  const getWeight = (sit) => (sit === 'DESCARREGAT' ? 1 : sit === 'CARREGAT' ? 2 : 3);
                  const wA = getWeight(a.situation);
                  const wB = getWeight(b.situation);
                  if (wA !== wB) return wA - wB;
                  return (b.pointsAwarded || 0) - (a.pointsAwarded || 0) || (a.finalTimingMs || 999999) - (b.finalTimingMs || 999999);
                });

              return (
                <div key={grpName} className="bg-slate-900/90 border border-blue-500/30 rounded-2xl p-3.5 space-y-3 shadow-lg">
                  <div className="flex justify-between items-center bg-black/60 p-2 rounded-xl border border-white/5">
                    <span className="font-black text-blue-300 text-xs flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" /> {grpName}
                    </span>
                    <span className="text-[9px] text-gray-400 font-mono">{grpScores.length} नोंद</span>
                  </div>

                  <div className="space-y-2">
                    {grpScores.length === 0 ? (
                      <div className="p-3 text-center text-[10px] text-gray-500">कोणतीही नोंद नाही</div>
                    ) : (
                      grpScores.map((s, idx) => (
                        <div key={s.id} className="bg-black/50 border border-white/5 p-2.5 rounded-xl space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <div className="flex items-center gap-2 truncate">
                              <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-black ${
                                idx === 0 ? 'bg-amber-400 text-black font-black' : 'bg-white/10 text-gray-300'
                              }`}>
                                #{idx + 1}
                              </span>
                              <span className="font-bold text-white truncate max-w-[120px]">{s.teamName}</span>
                            </div>
                            <span className="font-mono text-xs font-black text-emerald-400 shrink-0">{s.pointsAwarded} pts</span>
                          </div>

                          <div className="flex items-center justify-between text-[9px] font-mono text-gray-400 pt-1 border-t border-white/5">
                            <span className={`px-1 rounded font-bold ${
                              s.situation === 'DESCARREGAT' ? 'text-emerald-400 bg-emerald-500/10' :
                              s.situation === 'CARREGAT' ? 'text-amber-400 bg-amber-500/10' : 'text-rose-400 bg-rose-500/10'
                            }`}>
                              {s.situation}
                            </span>
                            <span>मूळ: {s.rawFormattedTime}</span>
                            {s.penaltySec > 0 && <span className="text-rose-400">+{s.penaltySec}s</span>}
                            <span className="text-white font-bold">वेळ: {s.finalFormattedTime}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* प्रकार ३: DIRECT 1 vs 1 DUEL */}
        {isDirectDuel && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {Array.from({ length: totalDirectDuelMatches }).map((_, mIdx) => {
              const matchNo = mIdx + 1;
              const matchScores = scores.filter(s => Number(s.duelMatchNo) === matchNo);
              const t1Score = matchScores.find(s => s.duelSide === 'FOP1') || matchScores[0];
              const t2Score = matchScores.find(s => s.duelSide === 'FOP2' && s.teamId !== t1Score?.teamId) || matchScores[1];

              const t1Fix = teams.find(t => fixtures[t.id]?.duelMatchNo === matchNo && fixtures[t.id]?.duelSide === 'FOP1');
              const t2Fix = teams.find(t => fixtures[t.id]?.duelMatchNo === matchNo && fixtures[t.id]?.duelSide === 'FOP2');

              return (
                <div key={matchNo} className="bg-slate-900/90 border border-orange-500/30 rounded-2xl p-3.5 space-y-2.5 shadow-lg">
                  <div className="flex justify-between items-center border-b border-white/5 pb-1.5 text-xs font-black text-orange-400 font-mono">
                    <span className="flex items-center gap-1.5">
                      <Swords className="w-3.5 h-3.5" /> सामना #{matchNo}
                    </span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      t1Score && t2Score ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/5 text-gray-400'
                    }`}>
                      {t1Score && t2Score ? '✅ निकाल पूर्ण' : '⏳ चालू / बाकी'}
                    </span>
                  </div>

                  <div className={`p-2.5 rounded-xl border space-y-1.5 ${
                    t1Score?.isWinner ? 'bg-emerald-500/10 border-emerald-500/40 shadow' : 'bg-black/40 border-white/5'
                  }`}>
                    <div className="flex justify-between items-center text-xs">
                      <div className="truncate flex items-center gap-1.5">
                        <span>{t1Score?.isWinner ? '🏆' : '●'}</span>
                        <span className={`font-extrabold truncate ${t1Score?.isWinner ? 'text-emerald-400' : 'text-white'}`}>
                          {t1Score?.teamName || t1Fix?.teamName || 'Team A'}
                        </span>
                      </div>
                      {isKnockout ? (
                        t1Score ? (
                          <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-black font-mono tracking-wider ${
                            t1Score.isWinner ? 'bg-emerald-500 text-black shadow-sm' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}>
                            {t1Score.isWinner ? '🏆 WINNER' : '❌ LOST'}
                          </span>
                        ) : <span className="text-gray-500 text-[10px]">-</span>
                      ) : (
                        <span className="font-mono text-xs font-black text-amber-400">
                          {t1Score ? `${t1Score.pointsAwarded} pts` : '-'}
                        </span>
                      )}
                    </div>

                    {t1Score && (
                      <div className="flex items-center justify-between text-[9px] font-mono text-gray-400 pt-1 border-t border-white/5">
                        <span className={`px-1 rounded font-bold ${
                          t1Score.situation === 'DESCARREGAT' ? 'text-emerald-400 bg-emerald-500/10' :
                          t1Score.situation === 'CARREGAT' ? 'text-amber-400 bg-amber-500/10' : 'text-rose-400 bg-rose-500/10'
                        }`}>
                          {t1Score.situation}
                        </span>
                        <span>मूळ: {t1Score.rawFormattedTime}</span>
                        {t1Score.penaltySec > 0 && <span className="text-rose-400">+{t1Score.penaltySec}s</span>}
                        <span className="text-white font-bold">वेळ: {t1Score.finalFormattedTime}</span>
                      </div>
                    )}
                  </div>

                  <div className="text-center font-mono text-[9px] text-rose-400 font-bold -my-1">VS</div>

                  <div className={`p-2.5 rounded-xl border space-y-1.5 ${
                    t2Score?.isWinner ? 'bg-emerald-500/10 border-emerald-500/40 shadow' : 'bg-black/40 border-white/5'
                  }`}>
                    <div className="flex justify-between items-center text-xs">
                      <div className="truncate flex items-center gap-1.5">
                        <span>{t2Score?.isWinner ? '🏆' : '●'}</span>
                        <span className={`font-extrabold truncate ${t2Score?.isWinner ? 'text-emerald-400' : 'text-white'}`}>
                          {t2Score?.teamName || t2Fix?.teamName || 'Team B'}
                        </span>
                      </div>
                      {isKnockout ? (
                        t2Score ? (
                          <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-black font-mono tracking-wider ${
                            t2Score.isWinner ? 'bg-emerald-500 text-black shadow-sm' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}>
                            {t2Score.isWinner ? '🏆 WINNER' : '❌ LOST'}
                          </span>
                        ) : <span className="text-gray-500 text-[10px]">-</span>
                      ) : (
                        <span className="font-mono text-xs font-black text-amber-400">
                          {t2Score ? `${t2Score.pointsAwarded} pts` : '-'}
                        </span>
                      )}
                    </div>

                    {t2Score && (
                      <div className="flex items-center justify-between text-[9px] font-mono text-gray-400 pt-1 border-t border-white/5">
                        <span className={`px-1 rounded font-bold ${
                          t2Score.situation === 'DESCARREGAT' ? 'text-emerald-400 bg-emerald-500/10' :
                          t2Score.situation === 'CARREGAT' ? 'text-amber-400 bg-amber-500/10' : 'text-rose-400 bg-rose-500/10'
                        }`}>
                          {t2Score.situation}
                        </span>
                        <span>मूळ: {t2Score.rawFormattedTime}</span>
                        {t2Score.penaltySec > 0 && <span className="text-rose-400">+{t2Score.penaltySec}s</span>}
                        <span className="text-white font-bold">वेळ: {t2Score.finalFormattedTime}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* प्रकार ४: SINGLE SLOT / SEMIS / FINALS */}
        {isSingleOrConcur && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
            {scores.length === 0 ? (
              <div className="col-span-full py-6 text-center text-gray-500 text-xs">या फेरीत अद्याप कोणतीही नोंद नाही.</div>
            ) : (
              [...scores]
                .sort((a, b) => {
                  const getWeight = (sit) => (sit === 'DESCARREGAT' ? 1 : sit === 'CARREGAT' ? 2 : 3);
                  const wA = getWeight(a.situation);
                  const wB = getWeight(b.situation);
                  if (wA !== wB) return wA - wB;
                  return (a.finalTimingMs || 0) - (b.finalTimingMs || 0);
                })
                .map((s, idx) => {
                  const isQualifiedWinner = idx < advancingCutoff; 
                  const currentStage = currentRound?.stage || '';

                  let badgeText = isQualifiedWinner ? '🏆 QUALIFIED' : '❌ ELIMINATED';
                  let badgeColor = isQualifiedWinner ? 'bg-emerald-500 text-black shadow-md' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30';

                  if (currentStage === 'GRAND_FINAL') {
                    if (idx === 0) {
                      badgeText = '🥇 WINNER (विजेता)';
                      badgeColor = 'bg-amber-400 text-black font-black shadow-lg shadow-amber-500/30';
                    } else if (idx === 1) {
                      badgeText = '🥈 RUNNER-UP (उपविजेता)';
                      badgeColor = 'bg-slate-300 text-black font-black shadow-md';
                    } else if (idx === 2) {
                      badgeText = '🥉 2ND RUNNER-UP';
                      badgeColor = 'bg-amber-600 text-white font-bold shadow-md';
                    } else {
                      badgeText = '🎖️ FINALIST';
                      badgeColor = 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
                    }
                  } else if (currentStage === 'SEMI_FINAL') {
                    if (isQualifiedWinner) {
                      badgeText = '🏆 FINALIST (फायनलमध्ये प्रवेश)';
                      badgeColor = 'bg-amber-500 text-black font-black shadow-md';
                    } else {
                      badgeText = '🛡️ Wild Card Shootout';
                      badgeColor = 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
                    }
                  }

                  return (
                    <div 
                      key={s.id} 
                      className={`p-3 rounded-2xl space-y-2 text-xs border shadow transition ${
                        isQualifiedWinner 
                          ? 'bg-emerald-500/10 border-emerald-500/60 shadow-lg shadow-emerald-500/20' 
                          : 'bg-slate-900/90 border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-2 truncate">
                          <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-black ${
                            isQualifiedWinner ? 'bg-amber-400 text-black font-black' : 'bg-white/10 text-gray-300'
                          }`}>
                            #{idx + 1}
                          </span>
                          <h5 className="font-bold text-white truncate max-w-[120px]">{s.teamName}</h5>
                        </div>

                        <span className={`px-2 py-0.5 rounded text-[9px] font-black font-mono tracking-wider ${badgeColor}`}>
                          {badgeText}
                        </span>
                      </div>

                      <div className="bg-black/50 p-1.5 rounded-xl border border-white/5 space-y-0.5 text-[9px] font-mono text-gray-400">
                        <div className="flex justify-between items-center">
                          <span className={`px-1 rounded font-bold ${
                            s.situation === 'DESCARREGAT' ? 'text-emerald-400 bg-emerald-500/10' :
                            s.situation === 'CARREGAT' ? 'text-amber-400 bg-amber-500/10' : 'text-rose-400 bg-rose-500/10'
                          }`}>
                            {s.situation} {s.formationName ? `(${s.formationName})` : ''}
                          </span>
                          {s.penaltySec > 0 && <span className="text-rose-400 font-bold">+{s.penaltySec}s पेनल्टी</span>}
                        </div>

                        {s.finalFormattedTime !== '-' && (
                          <div className="flex justify-between items-center text-gray-500 pt-0.5 border-t border-white/5">
                            <span>मूळ: {s.rawFormattedTime}</span>
                            <span className="text-white font-bold">अंतिम: {s.finalFormattedTime}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end">
                        <button
                          onClick={() => handleDeleteScore(s.id, s.teamName)}
                          className="text-[9px] text-gray-500 hover:text-rose-400 flex items-center gap-1 transition cursor-pointer"
                          title="हटवा"
                        >
                          <Trash2 className="w-3 h-3" /> नोंद हटवा
                        </button>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        )}
      </div>
    </div>
  );
}