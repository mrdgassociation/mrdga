// ==========================================
// #SECTION: SCORING TEAM SETUP (100% MANUAL TEAM SELECTION + OPTIONAL AUTO SEEDING)
// ==========================================
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { 
  collection, doc, getDocs, setDoc, deleteDoc, 
  addDoc, serverTimestamp, writeBatch 
} from 'firebase/firestore';
import Swal from 'sweetalert2';
import { 
  Users, Plus, Trash2, Edit3, Shield, 
  Layers, CheckCircle2, Zap, Swords, Clock, Settings, PlusCircle, Trophy, Shuffle, ArrowDownUp
} from 'lucide-react';

export default function ScoringTeamSetup({ tournamentId }) {
  const [teams, setTeams] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [selectedRoundId, setSelectedRoundId] = useState('');
  const [loading, setLoading] = useState(true);

  // 📝 मोडल स्टेट्स
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [teamForm, setTeamForm] = useState({ teamName: '', city: '', coach: '', captain: '' });

  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');

  const [duelMatches, setDuelMatches] = useState([]);
  const [roundFixtures, setRoundFixtures] = useState({});
  const [allTournamentScores, setAllTournamentScores] = useState([]);
  const [savingFixtures, setSavingFixtures] = useState(false);

  // ⚙️ डायनॅमिक सीडिंग मोडल स्टेट्स
  const [isSeedModalOpen, setIsSeedModalOpen] = useState(false);
  const [seedingMode, setSeedingMode] = useState('OVERALL_KNOCKOUT');
  
  // युझर इनपुट संख्या
  const [customTopCount, setCustomTopCount] = useState(4);
  const [customBottomCount, setCustomBottomCount] = useState(4);
  const [customGroupSeedRules, setCustomGroupSeedRules] = useState([
    { group1: 'Group A', rank1: 1, group2: 'Group A', rank2: 4 },
    { group1: 'Group A', rank1: 2, group2: 'Group A', rank2: 3 }
  ]);

  // 1️⃣ सर्व डेटा लोड करणे
  const loadAllData = async () => {
    if (!tournamentId) return;
    setLoading(true);
    try {
      const teamsSnap = await getDocs(collection(db, 'dahi_handi_tournaments', tournamentId, 'teams'));
      const teamsList = teamsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTeams(teamsList);

      const roundsSnap = await getDocs(collection(db, 'dahi_handi_tournaments', tournamentId, 'rounds'));
      const roundsList = roundsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      roundsList.sort((a, b) => (Number(a.roundNumber) || 0) - (Number(b.roundNumber) || 0));
      setRounds(roundsList);

      if (roundsList.length > 0 && !selectedRoundId) {
        setSelectedRoundId(roundsList[0].id);
      }

      const scoresSnap = await getDocs(collection(db, 'dahi_handi_tournaments', tournamentId, 'scores'));
      setAllTournamentScores(scoresSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Error loading team setup:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [tournamentId]);

  // 2️⃣ निवडलेल्या फेरीचे Fixtures लोड करणे
  useEffect(() => {
    const loadFixturesForRound = async () => {
      if (!tournamentId || !selectedRoundId) return;
      try {
        const fixSnap = await getDocs(
          collection(db, 'dahi_handi_tournaments', tournamentId, 'rounds', selectedRoundId, 'fixtures')
        );
        const mapping = {};
        fixSnap.docs.forEach(d => {
          mapping[d.id] = d.data();
        });
        setRoundFixtures(mapping);

        const currentR = rounds.find(r => r.id === selectedRoundId);
        if (currentR?.matchFormat === 'DUEL') {
          const qCount = Number(currentR?.qualifiedTeamsCount) || teams.length || 8;
          const totalMatches = Math.max(1, Math.floor(qCount / 2));
          const initialMatches = [];

          for (let m = 1; m <= totalMatches; m++) {
            const assignedT1 = teams.find(t => mapping[t.id]?.duelMatchNo === m && mapping[t.id]?.duelSide === 'FOP1');
            const assignedT2 = teams.find(t => mapping[t.id]?.duelSide === 'FOP2' && mapping[t.id]?.duelMatchNo === m);

            initialMatches.push({
              matchNo: m,
              label: mapping[assignedT1?.id]?.duelLabel || `सामना #${m}`,
              team1Id: assignedT1?.id || '',
              team2Id: assignedT2?.id || ''
            });
          }
          setDuelMatches(initialMatches);
        }
      } catch (e) {
        console.error("Error fetching fixtures:", e);
      }
    };
    loadFixturesForRound();
  }, [tournamentId, selectedRoundId, teams.length]);

  const currentRound = rounds.find(r => r.id === selectedRoundId);
  const activeGroups = currentRound?.groupList?.length ? currentRound.groupList : ['Group A', 'Group B', 'Group C', 'Group D'];
  
  const isDuelFormat = currentRound?.matchFormat === 'DUEL';
  const isSingleOrFormationFormat = currentRound?.matchFormat === 'SINGLE' || 
                                     currentRound?.matchFormat === 'MULTI' || 
                                     currentRound?.matchFormat === 'FORMATION_DIFFICULTY' || 
                                     currentRound?.hasGroups === false;
  const isGroupFormat = currentRound?.matchFormat === 'GROUP' && currentRound?.hasGroups !== false;

  const roundQualifiedCount = Number(currentRound?.qualifiedTeamsCount) || teams.length;

  // मागील गुणांनुसार संघ क्रमवारी
  const getSortedTeamsByPreviousRounds = () => {
    const currentRNum = Number(currentRound?.roundNumber) || 1;
    const prevRounds = rounds.filter(r => Number(r.roundNumber) < currentRNum).map(r => r.id);

    const teamStatsMap = {};
    allTournamentScores.forEach(score => {
      if (prevRounds.includes(score.roundId)) {
        if (!teamStatsMap[score.teamId]) {
          teamStatsMap[score.teamId] = { points: 0, timeMs: 0 };
        }
        teamStatsMap[score.teamId].points += Number(score.pointsAwarded || score.points || 0);
        teamStatsMap[score.teamId].timeMs += Number(score.finalTimingMs || 0);
      }
    });

    return [...teams].sort((a, b) => {
      const ptsA = teamStatsMap[a.id]?.points || 0;
      const ptsB = teamStatsMap[b.id]?.points || 0;
      if (ptsB !== ptsA) return ptsB - ptsA;
      return (teamStatsMap[a.id]?.timeMs || 0) - (teamStatsMap[b.id]?.timeMs || 0);
    });
  };

  // ✍️ मॅन्युअल बदल: स्लॉटला संघ नियुक्त करणे (Manual Team Select on Slot)
  const handleManualSlotTeamChange = (slotIndex, newTeamId) => {
    setRoundFixtures(prev => {
      const updated = { ...prev };

      // आधी जर हा संघ दुसऱ्या स्लॉटवर असेल तर त्याला तिथून काढणे
      Object.keys(updated).forEach(tId => {
        if (updated[tId]?.slotNumber === slotIndex) {
          updated[tId] = { ...updated[tId], slotNumber: null };
        }
      });

      if (newTeamId) {
        updated[newTeamId] = {
          ...(updated[newTeamId] || {}),
          slotNumber: slotIndex
        };
      }

      return updated;
    });
  };

  // ✍️ मॅन्युअल बदल: ग्रुपमधील संघाचा ग्रुप किंवा स्लॉट बदलणे
  const handleGroupTeamChange = (teamId, field, value) => {
    setRoundFixtures(prev => ({
      ...prev,
      [teamId]: {
        ...(prev[teamId] || {}),
        [field]: value
      }
    }));
  };

  // ⚡ १. ऑटो Top N सीडिंग
  const handleApplyTopNSeeding = (countToSeed) => {
    const count = Number(countToSeed) || roundQualifiedCount;
    const sorted = getSortedTeamsByPreviousRounds();
    const selected = sorted.slice(0, count);

    const updated = {};
    selected.forEach((t, idx) => {
      updated[t.id] = {
        group: null,
        slotNumber: idx + 1
      };
    });

    setRoundFixtures(updated);
    setIsSeedModalOpen(false);

    Swal.fire({
      icon: 'success',
      title: `Top ${count} संघ क्रमवार सेट झाले!`,
      text: `मागील गुणांनुसार १ ते ${count} स्लॉट क्रम लावला गेला आहे. हवे असल्यास खाली बदल करा व नंतर "गट & सामने सेव्ह करा" दाबा.`,
      timer: 1800,
      showConfirmButton: false,
      background: '#0c0d14',
      color: '#fff'
    });
  };

  // ⚡ २. ऑटो Bottom N सीडिंग
  const handleApplyBottomNSeeding = (countToSeed) => {
    const count = Number(countToSeed) || 4;
    const sorted = getSortedTeamsByPreviousRounds();
    const selected = sorted.slice(-count);

    const updated = {};
    selected.forEach((t, idx) => {
      updated[t.id] = {
        group: null,
        slotNumber: idx + 1,
        isWildCard: true
      };
    });

    setRoundFixtures(updated);
    setIsSeedModalOpen(false);

    Swal.fire({
      icon: 'success',
      title: `तळातील ${count} संघ सेट झाले!`,
      text: `मागील फेऱ्यांमधील Bottom ${count} संघ वाइल्ड कार्ड / पुनरागमन फेरीसाठी लागले आहेत.`,
      timer: 1800,
      showConfirmButton: false,
      background: '#0c0d14',
      color: '#fff'
    });
  };

  // ⚔️ ३. नॉकआउट जोड्या (1 vs N, 2 vs N-1)
  const handleApplyDynamicKnockoutDuels = (teamCountInput) => {
    const count = Number(teamCountInput) || roundQualifiedCount;
    const sorted = getSortedTeamsByPreviousRounds();
    const selected = sorted.slice(0, count);

    const totalMatches = Math.max(1, Math.floor(count / 2));
    const generatedDuels = Array.from({ length: totalMatches }).map((_, idx) => {
      const rank1 = idx + 1;
      const rank2 = count - idx;

      const t1 = selected[rank1 - 1];
      const t2 = selected[rank2 - 1];

      return {
        matchNo: idx + 1,
        label: `Rank #${rank1} vs Rank #${rank2}`,
        team1Id: t1?.id || '',
        team2Id: t2?.id || ''
      };
    });

    setDuelMatches(generatedDuels);
    setIsSeedModalOpen(false);

    Swal.fire({
      icon: 'success',
      title: `${totalMatches} सामने तयार झाले!`,
      text: `Top ${count} संघांच्या नॉकआउट जोड्या लागल्या आहेत. खाली ड्रॉपडाऊनमधून हवे तसे बदलही करता येतील.`,
      background: '#0c0d14',
      color: '#fff'
    });
  };

  // 👥 ४. ग्रुपमधील कस्टमाईज्ड जोड्या (1 vs 4, 2 vs 3 इत्यादी)
  const handleApplyGroupCustomRules = async () => {
    try {
      const r1Doc = rounds.find(r => Number(r.roundNumber) === 1);
      const r1Id = r1Doc?.id || rounds[0]?.id;

      let r1FixturesMap = {};
      if (r1Id) {
        const fixSnap = await getDocs(
          collection(db, 'dahi_handi_tournaments', tournamentId, 'rounds', r1Id, 'fixtures')
        );
        fixSnap.docs.forEach(d => {
          r1FixturesMap[d.id] = d.data();
        });
      }

      const groupTeamsMap = {};
      activeGroups.forEach(g => { groupTeamsMap[g] = []; });

      teams.forEach(t => {
        const grp = r1FixturesMap[t.id]?.group || 'Group A';
        if (groupTeamsMap[grp]) {
          groupTeamsMap[grp].push(t);
        } else if (groupTeamsMap['Group A']) {
          groupTeamsMap['Group A'].push(t);
        }
      });

      const sorted = getSortedTeamsByPreviousRounds();
      Object.keys(groupTeamsMap).forEach(grp => {
        groupTeamsMap[grp].sort((a, b) => sorted.indexOf(a) - sorted.indexOf(b));
      });

      const generatedDuels = customGroupSeedRules.map((rule, idx) => {
        const t1 = groupTeamsMap[rule.group1]?.[rule.rank1 - 1];
        const t2 = groupTeamsMap[rule.group2]?.[rule.rank2 - 1];
        return {
          matchNo: idx + 1,
          label: `${rule.group1} (R${rule.rank1}) vs ${rule.group2} (R${rule.rank2})`,
          team1Id: t1?.id || '',
          team2Id: t2?.id || ''
        };
      });

      setDuelMatches(generatedDuels);
      setIsSeedModalOpen(false);

      Swal.fire({
        icon: 'success',
        title: 'गटनिहाय जोड्या तयार झाल्या!',
        text: 'कार्ड्सवर संघ भरले गेले आहेत. सेव्ह करण्यासाठी "गट & सामने सेव्ह करा" दाबा.',
        background: '#0c0d14',
        color: '#fff'
      });
    } catch (err) {
      console.error("Custom seed error:", err);
      Swal.fire({ icon: 'error', title: 'त्रुटी!', text: 'नियम लागू करताना अडचण आली.', background: '#0c0d14', color: '#fff' });
    }
  };

  // ⚡ ५. ऑटो ४x४ ग्रुप वाटप
  const handleAutoAssignGroups = () => {
    const groups = currentRound?.groupList?.length ? currentRound.groupList : ['Group A', 'Group B', 'Group C', 'Group D'];
    const updated = {};

    teams.forEach((t, idx) => {
      const assignedGroup = groups[idx % groups.length];
      const slotNo = Math.floor(idx / groups.length) + 1;
      updated[t.id] = {
        group: assignedGroup,
        slotNumber: slotNo
      };
    });

    setRoundFixtures(updated);
    Swal.fire({
      icon: 'success',
      title: 'संघ गटांत वाटण्यात आले!',
      timer: 1500,
      showConfirmButton: false,
      background: '#0c0d14',
      color: '#fff'
    });
  };

  const handleDuelTeamChange = (matchIndex, side, selectedId) => {
    setDuelMatches(prev => {
      const updated = [...prev];
      updated[matchIndex] = {
        ...updated[matchIndex],
        [side]: selectedId
      };
      return updated;
    });
  };

  const handleSaveTeam = async (e) => {
    e.preventDefault();
    if (!teamForm.teamName.trim()) return;

    try {
      const cleanPayload = {
        teamName: teamForm.teamName.trim(),
        city: teamForm.city ? teamForm.city.trim() : 'महाराष्ट्र',
        coach: teamForm.coach ? teamForm.coach.trim() : '',
        captain: teamForm.captain ? teamForm.captain.trim() : '',
        updatedAt: serverTimestamp()
      };

      if (editingTeam) {
        await setDoc(doc(db, 'dahi_handi_tournaments', tournamentId, 'teams', editingTeam.id), cleanPayload, { merge: true });
      } else {
        await addDoc(collection(db, 'dahi_handi_tournaments', tournamentId, 'teams'), {
          ...cleanPayload,
          createdAt: serverTimestamp()
        });
      }

      setTeamForm({ teamName: '', city: '', coach: '', captain: '' });
      setIsTeamModalOpen(false);
      setEditingTeam(null);
      loadAllData();
    } catch (err) {
      console.error("Save team error:", err);
    }
  };

  const handleBulkAddTeams = async (e) => {
    e.preventDefault();
    const lines = bulkText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return;

    try {
      const batch = writeBatch(db);
      for (const line of lines) {
        const parts = line.split(',');
        const tName = parts[0]?.trim();
        const tCity = parts[1]?.trim() || 'महाराष्ट्र';

        if (tName) {
          const newDocRef = doc(collection(db, 'dahi_handi_tournaments', tournamentId, 'teams'));
          batch.set(newDocRef, {
            teamName: tName,
            city: tCity,
            createdAt: serverTimestamp()
          });
        }
      }

      await batch.commit();
      Swal.fire({ icon: 'success', title: `${lines.length} संघ जोडले गेले!`, timer: 1200, showConfirmButton: false, background: '#0c0d14', color: '#fff' });
      setBulkText('');
      setIsBulkModalOpen(false);
      loadAllData();
    } catch (err) {
      console.error("Bulk add error:", err);
    }
  };

  const handleDeleteTeam = async (id, name) => {
    const res = await Swal.fire({
      title: 'संघ हटवायचा आहे का?',
      text: `"${name}" या स्पर्धेतून काढून टाकला जाईल.`,
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
        await deleteDoc(doc(db, 'dahi_handi_tournaments', tournamentId, 'teams', id));
        loadAllData();
      } catch (e) {}
    }
  };

  // 💾 सर्व वाटप सेव्ह करणे
  const handleSaveFixtures = async () => {
    if (!selectedRoundId) return;
    setSavingFixtures(true);
    try {
      const isSingleOrFormation = currentRound?.matchFormat === 'SINGLE' || currentRound?.matchFormat === 'MULTI' || currentRound?.matchFormat === 'FORMATION_DIFFICULTY' || currentRound?.hasGroups === false;
      const groups = currentRound?.groupList?.length ? currentRound.groupList : ['Group A', 'Group B', 'Group C', 'Group D'];

      if (isDuelFormat) {
        for (const match of duelMatches) {
          if (match.team1Id) {
            const t1 = teams.find(t => t.id === match.team1Id);
            await setDoc(doc(db, 'dahi_handi_tournaments', tournamentId, 'rounds', selectedRoundId, 'fixtures', match.team1Id), {
              teamId: match.team1Id,
              teamName: t1?.teamName || '',
              city: t1?.city || 'महाराष्ट्र',
              duelMatchNo: match.matchNo,
              duelSide: 'FOP1',
              duelLabel: match.label || `सामना #${match.matchNo}`,
              slotNumber: (match.matchNo * 2) - 1,
              updatedAt: serverTimestamp()
            }, { merge: true });
          }

          if (match.team2Id) {
            const t2 = teams.find(t => t.id === match.team2Id);
            await setDoc(doc(db, 'dahi_handi_tournaments', tournamentId, 'rounds', selectedRoundId, 'fixtures', match.team2Id), {
              teamId: match.team2Id,
              teamName: t2?.teamName || '',
              city: t2?.city || 'महाराष्ट्र',
              duelMatchNo: match.matchNo,
              duelSide: 'FOP2',
              duelLabel: match.label || `सामना #${match.matchNo}`,
              slotNumber: match.matchNo * 2,
              updatedAt: serverTimestamp()
            }, { merge: true });
          }
        }
      } else {
        for (let i = 0; i < teams.length; i++) {
          const t = teams[i];
          const fixData = roundFixtures[t.id] || {};
          const assignedGroup = isSingleOrFormation ? null : (fixData.group || groups[i % groups.length]);
          const assignedSlot = fixData.slotNumber !== undefined ? Number(fixData.slotNumber) : (i + 1);

          const fixRef = doc(db, 'dahi_handi_tournaments', tournamentId, 'rounds', selectedRoundId, 'fixtures', t.id);
          await setDoc(fixRef, {
            teamId: t.id,
            teamName: t.teamName || '',
            city: t.city || 'महाराष्ट्र',
            group: assignedGroup,
            slotNumber: assignedSlot,
            updatedAt: serverTimestamp()
          }, { merge: true });
        }
      }

      Swal.fire({
        icon: 'success',
        title: 'गट & सामने यशस्वीरीत्या सेव्ह झाले!',
        timer: 1500,
        showConfirmButton: false,
        background: '#0c0d14',
        color: '#fff'
      });
    } catch (err) {
      console.error("Save fixtures error:", err);
      Swal.fire({ icon: 'error', title: 'त्रुटी!', text: 'वाटप सेव्ह करताना अडचण आली.', background: '#0c0d14', color: '#fff' });
    } finally {
      setSavingFixtures(false);
    }
  };

  const currentRNum = Number(currentRound?.roundNumber) || 1;
  const prevRounds = rounds.filter(r => Number(r.roundNumber) < currentRNum).map(r => r.id);
  const teamCumulativeMap = {};
  allTournamentScores.forEach(score => {
    if (prevRounds.includes(score.roundId)) {
      if (!teamCumulativeMap[score.teamId]) {
        teamCumulativeMap[score.teamId] = { points: 0, timeMs: 0 };
      }
      teamCumulativeMap[score.teamId].points += Number(score.pointsAwarded || score.points || 0);
      teamCumulativeMap[score.teamId].timeMs += Number(score.finalTimingMs || 0);
    }
  });

  return (
    <div className="space-y-4 text-white font-sans w-full">
      
      {/* 👥 Master Teams Header */}
      <div className="bg-[#0c0d14] border border-amber-500/20 rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs sm:text-sm font-black text-white">सहभागी गोविंदा पथके (Master Teams)</h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
              नोंदणीकृत: {teams.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-amber-300 font-bold text-[11px] rounded-xl border border-amber-500/20 flex items-center gap-1 transition cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" /> बल्क संघ जोडा
            </button>

            <button
              onClick={() => {
                setEditingTeam(null);
                setTeamForm({ teamName: '', city: '', coach: '', captain: '' });
                setIsTeamModalOpen(true);
              }}
              className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-[11px] rounded-xl flex items-center gap-1 transition cursor-pointer shadow-md"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" /> + संघ जोडा
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 text-xs py-3 animate-pulse font-bold">संघ लोड होत आहेत...</div>
        ) : teams.length === 0 ? (
          <div className="text-center py-4 bg-black/40 rounded-xl border border-dashed border-white/10 text-xs text-gray-400">
            कोणतेही संघ जोडलेले नाहीत. वरील "+ संघ जोडा" किंवा "बल्क संघ जोडा" वर क्लिक करा.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
            {teams.map((t, idx) => (
              <div 
                key={t.id} 
                className="bg-black/50 border border-white/10 hover:border-amber-500/40 p-2 rounded-xl flex items-center justify-between gap-1 transition"
              >
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <span className="w-4 h-4 rounded bg-white/5 text-[9px] font-mono text-gray-400 flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div className="truncate">
                    <h4 className="text-[11px] font-bold text-white truncate" title={t.teamName}>{t.teamName}</h4>
                    <p className="text-[9px] text-gray-400 truncate">{t.city || 'महाराष्ट्र'}</p>
                  </div>
                </div>

                <div className="flex items-center shrink-0">
                  <button
                    onClick={() => {
                      setEditingTeam(t);
                      setTeamForm({ teamName: t.teamName || '', city: t.city || '', coach: t.coach || '', captain: t.captain || '' });
                      setIsTeamModalOpen(true);
                    }}
                    className="p-1 text-gray-400 hover:text-amber-400"
                  >
                    <Edit3 className="w-2.5 h-2.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteTeam(t.id, t.teamName)}
                    className="p-1 text-gray-400 hover:text-rose-400"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🎯 Round Fixtures & Dynamic Seeding Engine Bar */}
      <div className="bg-[#0c0d14] border border-amber-500/20 rounded-2xl p-3.5 sm:p-4 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-black/60 p-3 rounded-xl border border-white/5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-gray-300">फेरी निवडा:</span>
            </div>
            <select
              value={selectedRoundId}
              onChange={(e) => setSelectedRoundId(e.target.value)}
              className="bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-xl text-amber-400 font-bold text-xs focus:outline-none cursor-pointer"
            >
              {rounds.map(r => (
                <option key={r.id} value={r.id}>
                  फेरी #{r.roundNumber}: {r.roundName} ({r.qualifiedTeamsCount ? `${r.qualifiedTeamsCount} संघ` : r.matchFormat})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* ⚡ GROUP साठी ऑटो गट वाटप */}
            {isGroupFormat && (
              <button
                type="button"
                onClick={handleAutoAssignGroups}
                className="px-3 py-2 bg-blue-500/20 hover:bg-blue-500 text-blue-300 hover:text-black font-bold text-xs rounded-xl border border-blue-500/40 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>⚡ ऑटो गट वाटप</span>
              </button>
            )}

            {/* ⚡ SINGLE / FORMATION साठी थेट Top N स्लॉट क्रम */}
            {isSingleOrFormationFormat && (
              <button
                type="button"
                onClick={() => handleApplyTopNSeeding(roundQualifiedCount)}
                className="px-3 py-2 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black font-bold text-xs rounded-xl border border-amber-500/40 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>⚡ Top {roundQualifiedCount} संघ थेट लावा</span>
              </button>
            )}

            {/* ⚙️ प्रगत 100% Dynamic Seeding Modal Button */}
            <button
              type="button"
              onClick={() => {
                setCustomTopCount(roundQualifiedCount || 4);
                setCustomBottomCount(4);
                setIsSeedModalOpen(true);
              }}
              className="px-3 py-2 bg-gradient-to-r from-orange-500/20 to-amber-500/20 hover:from-orange-500 hover:to-amber-500 text-orange-300 hover:text-black font-bold text-xs rounded-xl border border-orange-500/40 flex items-center gap-1.5 transition cursor-pointer"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>⚙️ डायनॅमिक संघ निवड (Top/Bottom/Bracket)</span>
            </button>

            {/* 💾 मुख्य सेव्ह बटण */}
            <button
              onClick={handleSaveFixtures}
              disabled={savingFixtures || teams.length === 0 || !selectedRoundId}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{savingFixtures ? 'सेव्ह होत आहे...' : 'गट & सामने सेव्ह करा'}</span>
            </button>
          </div>
        </div>

        {/* Display Content */}
        {teams.length === 0 ? (
          <div className="text-center py-6 text-gray-500 text-xs font-bold">
            वाटप करण्यासाठी वरील विभागात आधी किमान संघ जोडा.
          </div>
        ) : isDuelFormat ? (
          
          /* ------------------------------------------------------------- */
          /* ⚔️ १. DUEL FORMAT VIEW (मॅन्युअल संघ निवड ड्रॉपडाऊनसह)         */
          /* ------------------------------------------------------------- */
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-bold text-orange-400 flex items-center gap-1.5">
                <Swords className="w-4 h-4" /> समोरासमोरील सामने ({duelMatches.length} सामने • {roundQualifiedCount} संघ)
              </span>
              <span className="text-[10px] text-gray-400">खालील ड्रॉपडाऊनमधून कोणताही संघ मॅन्युअली बदलता येईल.</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {duelMatches.map((match, mIdx) => (
                <div key={mIdx} className="bg-black/60 border border-orange-500/30 rounded-2xl p-3 space-y-2.5 shadow-lg">
                  <div className="flex justify-between items-center bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded-xl">
                    <span className="text-[11px] font-black text-orange-400 flex items-center gap-1">
                      <Swords className="w-3.5 h-3.5" /> सामना #{match.matchNo}
                    </span>
                    <span className="text-[9px] text-gray-400 font-mono">{match.label || '1 vs 1'}</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] text-amber-400 font-bold block">FOP 1 (Team A):</label>
                      <select
                        value={match.team1Id}
                        onChange={(e) => handleDuelTeamChange(mIdx, 'team1Id', e.target.value)}
                        className="w-full bg-slate-900 border border-amber-500/30 text-white text-xs font-bold px-2 py-1.5 rounded-xl focus:outline-none"
                      >
                        <option value="">-- संघ निवडा --</option>
                        {teams.map(t => (
                          <option key={t.id} value={t.id}>{t.teamName} ({t.city})</option>
                        ))}
                      </select>
                    </div>

                    <div className="text-center font-black text-[10px] text-gray-500 py-0.5">VS</div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-blue-400 font-bold block">FOP 2 (Team B):</label>
                      <select
                        value={match.team2Id}
                        onChange={(e) => handleDuelTeamChange(mIdx, 'team2Id', e.target.value)}
                        className="w-full bg-slate-900 border border-blue-500/30 text-white text-xs font-bold px-2 py-1.5 rounded-xl focus:outline-none"
                      >
                        <option value="">-- संघ निवडा (किंवा BYE) --</option>
                        {teams.map(t => (
                          <option key={t.id} value={t.id}>{t.teamName} ({t.city})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        ) : isSingleOrFormationFormat ? (

          /* ------------------------------------------------------------- */
          /* 🏆 २. SINGLE / FORMATION VIEW (मॅन्युअल स्लॉट संघ निवड)       */
          /* ------------------------------------------------------------- */
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Trophy className="w-4 h-4" /> स्वतंत्र परफॉर्मन्स क्रम ({roundQualifiedCount} संघ)
              </span>
              <span className="text-[10px] text-gray-400">प्रत्येक स्लॉटवर कोणताही संघ मॅन्युअली निवडा किंवा बदला.</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: roundQualifiedCount }).map((_, sIdx) => {
                const slotNumber = sIdx + 1;
                // या स्लॉटवर सध्या कोणता संघ आहे ते शोधणे
                const assignedTeam = teams.find(t => roundFixtures[t.id]?.slotNumber === slotNumber);
                const prevPoints = assignedTeam ? (teamCumulativeMap[assignedTeam.id]?.points || 0) : 0;

                return (
                  <div key={slotNumber} className="bg-slate-900/90 border border-white/10 hover:border-amber-500/40 p-3 rounded-2xl space-y-2 transition">
                    <div className="flex items-center justify-between">
                      <span className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 font-mono text-xs font-black flex items-center justify-center">
                        #{slotNumber}
                      </span>
                      {assignedTeam && (
                        <span className="text-[10px] font-mono text-emerald-400 font-bold">
                          मागील गुण: {prevPoints} pts
                        </span>
                      )}
                    </div>

                    {/* मॅन्युअल संघ निवड ड्रॉपडाऊन */}
                    <div>
                      <label className="text-[9px] text-gray-400 block mb-1">स्लॉट #{slotNumber} साठी संघ निवडा:</label>
                      <select
                        value={assignedTeam?.id || ''}
                        onChange={(e) => handleManualSlotTeamChange(slotNumber, e.target.value)}
                        className="w-full bg-black/60 border border-slate-700 text-white font-bold text-xs p-2 rounded-xl focus:border-amber-400 focus:outline-none"
                      >
                        <option value="">-- संघ निवडा --</option>
                        {teams.map(t => (
                          <option key={t.id} value={t.id}>{t.teamName} ({t.city})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        ) : (

          /* ------------------------------------------------------------- */
          /* 👥 ३. GROUP VIEW (Group A, B, C, D मॅन्युअल संघ व्यवस्थापन)    */
          /* ------------------------------------------------------------- */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {activeGroups.map((grpName, gIdx) => {
              const groupTeams = teams.filter((t, idx) => {
                const fix = roundFixtures[t.id];
                if (fix && fix.group) return fix.group === grpName;
                return (idx % activeGroups.length) === gIdx;
              });

              return (
                <div key={gIdx} className="bg-black/60 border border-blue-500/30 rounded-2xl p-3 space-y-2.5 shadow-lg flex flex-col justify-between">
                  <div className="flex justify-between items-center bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-xl">
                    <h4 className="text-xs font-black text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-400"></span> {grpName}
                    </h4>
                    <span className="text-[10px] text-gray-400 font-bold font-mono">{groupTeams.length} संघ</span>
                  </div>

                  <div className="space-y-2 min-h-[220px]">
                    {groupTeams.map((t) => {
                      const currentData = roundFixtures[t.id] || {};
                      return (
                        <div key={t.id} className="bg-slate-900/90 border border-white/10 hover:border-amber-500/40 p-2.5 rounded-xl space-y-2 transition">
                          <div className="flex items-center justify-between gap-1">
                            <h5 className="text-xs font-bold text-white truncate" title={t.teamName}>{t.teamName}</h5>
                            <span className="text-[9px] text-gray-400 shrink-0">{t.city}</span>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5 text-[10px]">
                            {/* मॅन्युअल ग्रुप बदल */}
                            <div className="flex items-center gap-1 flex-1">
                              <span className="text-gray-400">गट:</span>
                              <select
                                value={currentData.group || grpName}
                                onChange={(e) => handleGroupTeamChange(t.id, 'group', e.target.value)}
                                className="w-full bg-black/60 border border-slate-700 text-blue-300 font-bold px-1.5 py-1 rounded-lg focus:outline-none"
                              >
                                {activeGroups.map((g, idx) => (
                                  <option key={idx} value={g}>{g}</option>
                                ))}
                              </select>
                            </div>

                            {/* मॅन्युअल स्लॉट नंबर बदल */}
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-gray-400">स्लॉट:</span>
                              <input
                                type="number"
                                min={1}
                                max={32}
                                value={currentData.slotNumber !== undefined ? currentData.slotNumber : (Math.floor(teams.indexOf(t) / activeGroups.length) + 1)}
                                onChange={(e) => handleGroupTeamChange(t.id, 'slotNumber', Number(e.target.value))}
                                className="w-9 bg-black/60 border border-slate-700 text-amber-400 font-mono font-bold text-center rounded-lg py-1 focus:outline-none"
                              />
                            </div>
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
      </div>

      {/* ========================================================================= */}
      {/* ⚙️ 📝 डायनॅमिक सीडिंग मोडल (Top/Bottom/Bracket/Group)                     */}
      {/* ========================================================================= */}
      {isSeedModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#0c0d14] border border-orange-500/40 rounded-3xl w-full max-w-2xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Shuffle className="w-4 h-4 text-orange-400" />
                <h3 className="text-sm font-black text-white">
                  डायनॅमिक संघ निवड व सीडिंग पर्याय (Dynamic Seeding Engine)
                </h3>
              </div>
              <button 
                onClick={() => setIsSeedModalOpen(false)}
                className="text-gray-400 hover:text-white text-xs bg-white/5 px-2.5 py-1 rounded-xl cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Mode Switch Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-black/60 p-1.5 rounded-2xl border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setSeedingMode('OVERALL_KNOCKOUT')}
                className={`py-2 px-2 rounded-xl font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                  seedingMode === 'OVERALL_KNOCKOUT' ? 'bg-amber-500 text-black shadow-lg font-black' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Swords className="w-3.5 h-3.5" />
                <span>१. नॉकआउट जोड्या</span>
              </button>

              <button
                type="button"
                onClick={() => setSeedingMode('TOP_N')}
                className={`py-2 px-2 rounded-xl font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                  seedingMode === 'TOP_N' ? 'bg-emerald-500 text-black shadow-lg font-black' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>२. Top N संघ</span>
              </button>

              <button
                type="button"
                onClick={() => setSeedingMode('BOTTOM_N')}
                className={`py-2 px-2 rounded-xl font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                  seedingMode === 'BOTTOM_N' ? 'bg-orange-500 text-black shadow-lg font-black' : 'text-gray-400 hover:text-white'
                }`}
              >
                <ArrowDownUp className="w-3.5 h-3.5" />
                <span>३. Bottom N (Wild Card)</span>
              </button>

              <button
                type="button"
                onClick={() => setSeedingMode('GROUP_CUSTOM')}
                className={`py-2 px-2 rounded-xl font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                  seedingMode === 'GROUP_CUSTOM' ? 'bg-blue-600 text-white shadow-lg font-bold' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>४. गटनिहाय जोड्या</span>
              </button>
            </div>

            {/* Mode 1: Dynamic Bracket */}
            {seedingMode === 'OVERALL_KNOCKOUT' && (
              <div className="space-y-3 text-xs bg-slate-900/60 p-4 rounded-2xl border border-amber-500/20">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-amber-300">नॉकआउट जोड्या (1 vs N, 2 vs N-1...)</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">खेळणारे संघ:</span>
                    <input
                      type="number"
                      min={2}
                      max={64}
                      value={customTopCount}
                      onChange={(e) => setCustomTopCount(Number(e.target.value))}
                      className="w-14 bg-black/60 border border-amber-500/40 px-2 py-1 rounded-lg text-amber-400 font-mono font-bold text-center"
                    />
                  </div>
                </div>
                <p className="text-gray-300 text-[11px]">
                  मागील फेऱ्यांमधील रँकनुसार थेट 1 vs {customTopCount}, 2 vs {customTopCount - 1} अशा एकूण {Math.floor(customTopCount / 2)} जोड्या आपोआप तयार होतील.
                </p>
                <button
                  type="button"
                  onClick={() => handleApplyDynamicKnockoutDuels(customTopCount)}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black rounded-xl shadow-lg cursor-pointer"
                >
                  ⚡ {customTopCount} संघांच्या {Math.floor(customTopCount / 2)} नॉकआउट जोड्या लावा
                </button>
              </div>
            )}

            {/* Mode 2: Dynamic Top N */}
            {seedingMode === 'TOP_N' && (
              <div className="space-y-3 text-xs bg-slate-900/60 p-4 rounded-2xl border border-emerald-500/20">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-emerald-300">मागील गुणांनुसार थेट Top N संघ निवड</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">किती संघ हवेत (N):</span>
                    <input
                      type="number"
                      min={1}
                      max={64}
                      value={customTopCount}
                      onChange={(e) => setCustomTopCount(Number(e.target.value))}
                      className="w-14 bg-black/60 border border-emerald-500/40 px-2 py-1 rounded-lg text-emerald-400 font-mono font-bold text-center"
                    />
                  </div>
                </div>
                <p className="text-gray-300 text-[11px]">
                  मागील सर्व फेऱ्यांमधील एकत्रित गुणांनुसार (Rank 1 ते Rank {customTopCount}) चे संघ १ ते {customTopCount} स्लॉटमध्ये लागतील.
                </p>
                <button
                  type="button"
                  onClick={() => handleApplyTopNSeeding(customTopCount)}
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-black rounded-xl shadow-lg cursor-pointer"
                >
                  🏆 Top {customTopCount} संघ स्लॉटमध्ये लावा
                </button>
              </div>
            )}

            {/* Mode 3: Dynamic Bottom N (Wild Card) */}
            {seedingMode === 'BOTTOM_N' && (
              <div className="space-y-3 text-xs bg-slate-900/60 p-4 rounded-2xl border border-orange-500/20">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-orange-300">तळातील Bottom N संघ निवड (Wild Card)</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">किती संघ हवेत (N):</span>
                    <input
                      type="number"
                      min={1}
                      max={64}
                      value={customBottomCount}
                      onChange={(e) => setCustomBottomCount(Number(e.target.value))}
                      className="w-14 bg-black/60 border border-orange-500/40 px-2 py-1 rounded-lg text-orange-400 font-mono font-bold text-center"
                    />
                  </div>
                </div>
                <p className="text-gray-300 text-[11px]">
                  मागील निकालांमधील तळातील (Bottom {customBottomCount}) संघ शोधून त्यांची वाइल्ड कार्ड फेरीसाठी निवड होईल.
                </p>
                <button
                  type="button"
                  onClick={() => handleApplyBottomNSeeding(customBottomCount)}
                  className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-black font-black rounded-xl shadow-lg cursor-pointer"
                >
                  🃏 तळातील Bottom {customBottomCount} संघ लावा
                </button>
              </div>
            )}

            {/* Mode 4: Custom Group Rules */}
            {seedingMode === 'GROUP_CUSTOM' && (
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <p className="text-gray-400 text-[11px]">
                    ग्रुपमधील कोणत्या रँकचा कोणाशी सामना लावायचा ते ठरवा:
                  </p>
                  <button
                    type="button"
                    onClick={() => setCustomGroupSeedRules(prev => [...prev, { group1: 'Group A', rank1: 1, group2: 'Group B', rank2: 1 }])}
                    className="px-2.5 py-1 bg-blue-500/20 text-blue-300 font-bold rounded-lg border border-blue-500/30 flex items-center gap-1 hover:bg-blue-500 hover:text-black transition cursor-pointer text-[11px]"
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> + सामना नियम जोडा
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {customGroupSeedRules.map((rule, idx) => (
                    <div key={idx} className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono text-blue-400 font-bold w-14 shrink-0">सामना #{idx + 1}:</span>
                      
                      <div className="flex items-center gap-1 flex-1">
                        <select
                          value={rule.group1}
                          onChange={(e) => {
                            const updated = [...customGroupSeedRules];
                            updated[idx].group1 = e.target.value;
                            setCustomGroupSeedRules(updated);
                          }}
                          className="bg-black/60 border border-slate-700 px-2 py-1 rounded-lg text-amber-300 font-bold text-xs focus:outline-none"
                        >
                          {activeGroups.map((g, gIdx) => <option key={gIdx} value={g}>{g}</option>)}
                        </select>
                        <span className="text-gray-400 text-[10px]">Rank:</span>
                        <input
                          type="number"
                          min={1}
                          max={8}
                          value={rule.rank1}
                          onChange={(e) => {
                            const updated = [...customGroupSeedRules];
                            updated[idx].rank1 = Number(e.target.value);
                            setCustomGroupSeedRules(updated);
                          }}
                          className="w-10 bg-black/60 border border-slate-700 px-1.5 py-1 rounded-lg text-amber-400 font-mono font-bold text-center"
                        />
                      </div>

                      <span className="text-gray-500 font-black text-xs px-1">VS</span>

                      <div className="flex items-center gap-1 flex-1">
                        <select
                          value={rule.group2}
                          onChange={(e) => {
                            const updated = [...customGroupSeedRules];
                            updated[idx].group2 = e.target.value;
                            setCustomGroupSeedRules(updated);
                          }}
                          className="bg-black/60 border border-slate-700 px-2 py-1 rounded-lg text-blue-300 font-bold text-xs focus:outline-none"
                        >
                          {activeGroups.map((g, gIdx) => <option key={gIdx} value={g}>{g}</option>)}
                        </select>
                        <span className="text-gray-400 text-[10px]">Rank:</span>
                        <input
                          type="number"
                          min={1}
                          max={8}
                          value={rule.rank2}
                          onChange={(e) => {
                            const updated = [...customGroupSeedRules];
                            updated[idx].rank2 = Number(e.target.value);
                            setCustomGroupSeedRules(updated);
                          }}
                          className="w-10 bg-black/60 border border-slate-700 px-1.5 py-1 rounded-lg text-blue-400 font-mono font-bold text-center"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => setCustomGroupSeedRules(customGroupSeedRules.filter((_, i) => i !== idx))}
                        className="p-1 text-gray-500 hover:text-rose-400 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleApplyGroupCustomRules}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl shadow-lg cursor-pointer mt-2"
                >
                  ⚡ हे गटनिहाय नियम लागू करा
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* बल्क संघ मोडल */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c0d14] border border-amber-500/30 rounded-3xl w-full max-w-lg p-5 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" /> एकाच वेळी संघ जोडा (Bulk Paste Teams)
              </h3>
              <button onClick={() => setIsBulkModalOpen(false)} className="text-gray-400 hover:text-white text-xs bg-white/5 px-2.5 py-1 rounded-xl cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleBulkAddTeams} className="space-y-3 text-xs">
              <textarea
                required
                rows={8}
                placeholder={`उदा.\nBangaluru Blazers, बंगळुरू\nSurat Titans, सुरत\nHyderabad Dynamos, हैदराबाद`}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 p-3 rounded-2xl text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
              />
              <button type="submit" className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black text-xs rounded-xl shadow-md cursor-pointer">
                ✅ सर्व संघ सेव्ह करा
              </button>
            </form>
          </div>
        </div>
      )}

      {/* सिंगल संघ मोडल */}
      {isTeamModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c0d14] border border-amber-500/30 rounded-3xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-400" /> {editingTeam ? 'संघ माहिती एडिट करा' : 'नवीन गोविंदा पथक जोडा'}
              </h3>
              <button onClick={() => setIsTeamModalOpen(false)} className="text-gray-400 hover:text-white text-xs bg-white/5 px-2.5 py-1 rounded-xl cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveTeam} className="space-y-3 text-xs">
              <input
                type="text"
                required
                placeholder="गोविंदा पथकाचे नाव"
                value={teamForm.teamName || ''}
                onChange={(e) => setTeamForm({ ...teamForm, teamName: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 px-3 py-2 rounded-xl text-white font-bold focus:border-amber-400 focus:outline-none"
              />
              <input
                type="text"
                placeholder="शहर / उपनगर"
                value={teamForm.city || ''}
                onChange={(e) => setTeamForm({ ...teamForm, city: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 px-3 py-2 rounded-xl text-white focus:outline-none"
              />
              <button type="submit" className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black text-xs rounded-xl shadow-md cursor-pointer">
                {editingTeam ? '✅ बदल सेव्ह करा' : '✅ संघ सेव्ह करा'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}