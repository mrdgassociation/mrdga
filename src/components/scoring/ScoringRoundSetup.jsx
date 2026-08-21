// ==========================================
// #SECTION: DEDICATED FULL-SCREEN ROUND & DYNAMIC TOURNAMENT STAGE ENGINE (ALL FEATURES PRESERVED)
// ==========================================
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { 
  collection, doc, getDocs, setDoc, deleteDoc, 
  serverTimestamp, query, orderBy, writeBatch 
} from 'firebase/firestore';
import Swal from 'sweetalert2';
import { 
  Layers, Plus, Trash2, Edit3, Settings2, 
  Clock, Award, Users, PlusCircle, Network, 
  Trophy, Swords, ArrowLeft, CheckCircle2, ShieldCheck, Sparkles, Shuffle, Sliders, X, UserCheck
} from 'lucide-react';

// Formation / Concur चा मूळ साचा (Default Template)
const DEFAULT_CONCUR_FORMATIONS = [
  { name: 'Classic-14', category: 7, structure: '5+3+2+1+1+1+1', descarregat: 4000, carregat: 3320, intent: 0, intentDesmuntat: 0 },
  { name: 'Power-17', category: 7, structure: '6+4+3+1+1+1+1', descarregat: 3000, carregat: 2490, intent: 0, intentDesmuntat: 0 },
  { name: 'Elite-18', category: 7, structure: '5+3+3+3+2+1+1', descarregat: 2000, carregat: 1660, intent: 0, intentDesmuntat: 0 },
  { name: 'Crown-17', category: 7, structure: '5+3+3+3+1+1+1', descarregat: 1500, carregat: 1245, intent: 0, intentDesmuntat: 0 },
  { name: 'Titan-21', category: 7, structure: '6+4+3+3+3+1+1', descarregat: 1200, carregat: 1080, intent: 0, intentDesmuntat: 0 },
  { name: 'Prime-16', category: 7, structure: '5+3+3+2+1+1+1', descarregat: 800, carregat: 720, intent: 0, intentDesmuntat: 0 },
  { name: 'Grand-19', category: 7, structure: '6+4+3+3+1+1+1', descarregat: 500, carregat: 450, intent: 0, intentDesmuntat: 0 }
];

export default function ScoringRoundSetup({ tournamentId }) {
  const [rounds, setRounds] = useState([]);
  const [teams, setTeams] = useState([]);
  const [allTournamentScores, setAllTournamentScores] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 'LIST' | 'FORM'
  const [viewMode, setViewMode] = useState('LIST');
  const [editingRoundId, setEditingRoundId] = useState(null);

  // 🎯 कस्टमाईज्ड मल्टी-सोर्स सीडर मोडल स्टेट
  const [showCustomSeedModal, setShowCustomSeedModal] = useState(false);
  const [customSeedSources, setCustomSeedSources] = useState([
    { id: 'src-1', roundId: '', filterType: 'WINNERS', count: 4 },
    { id: 'src-2', roundId: '', filterType: 'TOP_RANK', count: 1 }
  ]);

  // फॉर्मचा मूळ साचा
  const initialFormState = {
    roundNumber: '1',
    roundName: '',
    stage: 'LEAGUE_STAGE', // 'LEAGUE_STAGE' | 'PRE_QUARTER' | 'QUARTER_FINAL' | 'WILDCARD_STAGE' | 'SEMI_FINAL' | 'GRAND_FINAL'
    type: 'LEAGUE', // 'LEAGUE' | 'KNOCKOUT' | 'WILDCARD' | 'CONCUR'
    matchFormat: 'GROUP', // 'GROUP' | 'GROUP_DUEL' | 'DUEL' | 'SINGLE' | 'FORMATION_DIFFICULTY'
    groupExecutionType: 'SYNC', // 'SYNC' | 'DUEL'
    duelSeedingType: 'PREV_ROUND', // 'PREV_ROUND' | 'CUMULATIVE' | 'MANUAL'
    qualifiedTeamsCount: 16,
    advancingWinnersCount: 2, // 👈 पुढील फेरीत जाणारे विजेते संघ (उदा. ५ मधून ३ किंवा ४ मधून २)
    squadLimit: 30, // 👈 खेळाडू संख्या (Squad Size / Number of Players)
    tierHeight: '',
    pyramidFormat: '',
    preparationTime: 60,
    hasGroups: true,
    groupsConfig: [
      { id: 'grp-A', name: 'Group A', maxTeams: 4 },
      { id: 'grp-B', name: 'Group B', maxTeams: 4 },
      { id: 'grp-C', name: 'Group C', maxTeams: 4 },
      { id: 'grp-D', name: 'Group D', maxTeams: 4 }
    ],
    assignedTeams: {},
    pointsList: [
      { label: 'Rank 1 / Winner', points: 1000 },
      { label: 'Rank 2 / Loser', points: 700 },
      { label: 'Rank 3', points: 500 },
      { label: 'Rank 4', points: 300 }
    ],
    intentPoints: 200,
    formationList: DEFAULT_CONCUR_FORMATIONS,
    penaltyList: [
      { label: 'Early Squat / Raising', type: 'TIME', value: 2, perPlayer: true },
      { label: 'Hand / Hands Raised', type: 'TIME', value: 2, perPlayer: true },
      { label: 'Out of Box', type: 'TIME', value: 2, perPlayer: true },
      { label: 'Carregat', type: 'POINTS', value: 50, perPlayer: false }
    ]
  };

  const [formData, setFormData] = useState(initialFormState);

  // 1️⃣ डेटा लोड करणे
  const fetchData = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'dahi_handi_tournaments', tournamentId, 'rounds'), 
        orderBy('createdAt', 'asc')
      );
      const rSnap = await getDocs(q);
      const rList = rSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      rList.sort((a, b) => parseFloat(a.roundNumber) - parseFloat(b.roundNumber));
      setRounds(rList);

      const tSnap = await getDocs(collection(db, 'dahi_handi_tournaments', tournamentId, 'teams'));
      setTeams(tSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const sSnap = await getDocs(collection(db, 'dahi_handi_tournaments', tournamentId, 'scores'));
      setAllTournamentScores(sSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    } catch (err) {
      console.error("Error fetching round setup data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tournamentId) fetchData();
  }, [tournamentId]);

  // नवीन फेरी उघडणे
  const handleOpenNewRoundForm = () => {
    setEditingRoundId(null);
    setFormData({
      ...initialFormState,
      roundNumber: `${rounds.length + 1}`,
      roundName: `Round ${rounds.length + 1}`,
      assignedTeams: {}
    });
    setViewMode('FORM');
  };

  // फेरी एडिट करण्यासाठी उघडणे
  const handleOpenEditRound = async (r) => {
    setEditingRoundId(r.id);
    
    let savedFixtures = {};
    try {
      const fixSnap = await getDocs(collection(db, 'dahi_handi_tournaments', tournamentId, 'rounds', r.id, 'fixtures'));
      fixSnap.docs.forEach(d => { savedFixtures[d.id] = d.data(); });
    } catch (e) {}

    const isGroupBased = r.matchFormat === 'GROUP' || r.matchFormat === 'GROUP_DUEL';

    setFormData({
      ...r,
      stage: r.stage || (r.type === 'KNOCKOUT' ? 'QUARTER_FINAL' : r.type === 'WILDCARD' ? 'WILDCARD_STAGE' : 'LEAGUE_STAGE'),
      type: r.type || 'LEAGUE',
      roundNumber: String(r.roundNumber || '1'),
      qualifiedTeamsCount: r.qualifiedTeamsCount || 16,
      advancingWinnersCount: r.advancingWinnersCount !== undefined ? r.advancingWinnersCount : 2,
      squadLimit: r.squadLimit !== undefined ? r.squadLimit : 30,
      pyramidFormat: r.pyramidFormat || '',
      preparationTime: r.preparationTime !== undefined ? r.preparationTime : 60,
      matchFormat: r.matchFormat || 'GROUP',
      hasGroups: isGroupBased,
      groupExecutionType: r.matchFormat === 'GROUP_DUEL' ? 'DUEL' : (r.groupExecutionType || 'SYNC'),
      duelSeedingType: r.duelSeedingType || 'PREV_ROUND',
      groupsConfig: r.groupsConfig?.length ? r.groupsConfig : [
        { id: 'grp-A', name: 'Group A', maxTeams: 4 },
        { id: 'grp-B', name: 'Group B', maxTeams: 4 }
      ],
      assignedTeams: savedFixtures,
      pointsList: r.pointsList?.length ? r.pointsList : [{ label: '', points: '' }],
      formationList: r.formationList?.length ? r.formationList : DEFAULT_CONCUR_FORMATIONS,
      penaltyList: r.penaltyList?.length ? r.penaltyList : [{ label: '', type: 'TIME', value: 2, perPlayer: true }]
    });
    setViewMode('FORM');
  };

  // 👥 ग्रुप्स व्यवस्थापन
  const handleAddGroup = () => {
    const count = formData.groupsConfig.length;
    const nextChar = String.fromCharCode(65 + count);
    const newGrp = { id: `grp-${nextChar}`, name: `Group ${nextChar}`, maxTeams: 4 };
    setFormData(prev => ({
      ...prev,
      groupsConfig: [...prev.groupsConfig, newGrp]
    }));
  };

  const handleRemoveGroup = (idx) => {
    setFormData(prev => ({
      ...prev,
      groupsConfig: prev.groupsConfig.filter((_, i) => i !== idx)
    }));
  };

  const handleGroupConfigChange = (idx, field, val) => {
    setFormData(prev => {
      const updated = [...prev.groupsConfig];
      updated[idx] = { ...updated[idx], [field]: field === 'maxTeams' ? Number(val) || 1 : val };
      return { ...prev, groupsConfig: updated };
    });
  };

  // 🎯 गुण व्यवस्थापन
  const handleAddPointRow = () => {
    setFormData(prev => ({
      ...prev,
      pointsList: [...prev.pointsList, { label: `Rank ${prev.pointsList.length + 1}`, points: '' }]
    }));
  };

  const handleRemovePointRow = (idx) => {
    setFormData(prev => ({
      ...prev,
      pointsList: prev.pointsList.filter((_, i) => i !== idx)
    }));
  };

  const handlePointChange = (idx, field, val) => {
    setFormData(prev => {
      const updated = [...prev.pointsList];
      updated[idx] = { ...updated[idx], [field]: field === 'points' ? (val === '' ? '' : Number(val)) : val };
      return { ...prev, pointsList: updated };
    });
  };

  // 🏆 Formation व्यवस्थापन
  const handleAddFormationRow = () => {
    setFormData(prev => ({
      ...prev,
      formationList: [
        ...(prev.formationList || []),
        { name: '', category: 7, structure: '', descarregat: '', carregat: '', intent: 0, intentDesmuntat: 0 }
      ]
    }));
  };

  const handleRemoveFormationRow = (idx) => {
    setFormData(prev => ({
      ...prev,
      formationList: prev.formationList.filter((_, i) => i !== idx)
    }));
  };

  const handleFormationChange = (idx, field, val) => {
    setFormData(prev => {
      const updated = [...(prev.formationList || [])];
      updated[idx] = {
        ...updated[idx],
        [field]: (field === 'descarregat' || field === 'carregat' || field === 'intent' || field === 'intentDesmuntat' || field === 'category') 
          ? (val === '' ? '' : Number(val)) 
          : val
      };
      return { ...prev, formationList: updated };
    });
  };

  // ⏱️ पेनल्टी व्यवस्थापन (सर्व जुने फीचर्स सुरक्षित)
  const handleAddPenaltyRow = () => {
    setFormData(prev => ({
      ...prev,
      penaltyList: [
        ...(prev.penaltyList || []),
        { label: '', type: 'TIME', value: 2, perPlayer: true }
      ]
    }));
  };

  const handleRemovePenaltyRow = (idx) => {
    setFormData(prev => ({
      ...prev,
      penaltyList: prev.penaltyList.filter((_, i) => i !== idx)
    }));
  };

  const handlePenaltyChange = (idx, field, val) => {
    setFormData(prev => {
      const updated = [...prev.penaltyList];
      updated[idx] = {
        ...updated[idx],
        [field]: field === 'value' ? (val === '' ? '' : Number(val)) : val
      };
      return { ...prev, penaltyList: updated };
    });
  };

  // 🎯 स्लॉट वाटप
  const handleAssignTeamToSlot = (groupName, slotIndex, teamId, matchNo = null, side = null) => {
    setFormData(prev => {
      const updated = { ...prev.assignedTeams };

      if (teamId) {
        Object.keys(updated).forEach(tId => {
          if (tId === teamId) delete updated[tId];
        });

        const isDuelMode = prev.matchFormat === 'DUEL' || prev.matchFormat === 'GROUP_DUEL';
        let duelMatchNo = matchNo || (Math.floor(slotIndex / 2) + 1);
        let duelSide = side || (slotIndex % 2 === 0 ? 'FOP1' : 'FOP2');

        updated[teamId] = {
          group: groupName || null,
          slotNumber: slotIndex + 1,
          duelMatchNo: isDuelMode ? duelMatchNo : (slotIndex + 1),
          duelSide: isDuelMode ? duelSide : 'FOP1'
        };
      }

      return { ...prev, assignedTeams: updated };
    });
  };

  // -------------------------------------------------------------
  // ⚡ १. ऑटो-सीडिंग इंजिन (All 4 Standard Seeding Modes)
  // -------------------------------------------------------------
  const handleAutoSeed = (seedType = 'PREV_ROUND') => {
    const currentRNum = parseFloat(formData.roundNumber) || 1;
    const prevRounds = rounds.filter(r => parseFloat(r.roundNumber) < currentRNum);
    const prevRoundIds = prevRounds.map(r => r.id);

    if (prevRounds.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'आधीची फेरी उपलब्ध नाही!',
        text: 'या फेरीच्या आधी खेळवल्या गेलेल्या फेऱ्यांचा डेटा सापडला नाही.',
        confirmButtonColor: '#f59e0b',
        background: '#0c0d14',
        color: '#fff'
      });
      return;
    }

    const newAssigned = {};

    // 🎯 मोड १: QF LOSERS (मागील फेरीतील पराभूत संघ)
    if (seedType === 'PREV_LOSERS') {
      const immediatePrevRound = prevRounds[prevRounds.length - 1];
      const prevScores = allTournamentScores.filter(s => s.roundId === immediatePrevRound?.id);

      if (prevScores.length === 0) {
        Swal.fire({
          icon: 'warning',
          title: 'लगतच्या फेरीचे निकाल उपलब्ध नाहीत!',
          text: `कृपया आधी फेरी #${immediatePrevRound?.roundNumber} (${immediatePrevRound?.roundName}) चे निकाल पूर्ण करा.`,
          confirmButtonColor: '#f59e0b',
          background: '#0c0d14',
          color: '#fff'
        });
        return;
      }

      const loserTeamIds = [];
      const matchNumbers = [...new Set(prevScores.map(s => Number(s.duelMatchNo) || 1))].sort((a, b) => a - b);

      matchNumbers.forEach(mNo => {
        const matchScores = prevScores.filter(s => Number(s.duelMatchNo) === mNo);
        if (matchScores.length >= 2) {
          const loser = matchScores.find(s => s.isWinner === false || s.roundRank === 2);
          if (loser) loserTeamIds.push(loser.teamId);
        } else if (matchScores.length === 1 && matchScores[0].isWinner === false) {
          loserTeamIds.push(matchScores[0].teamId);
        }
      });

      const finalLoserIds = loserTeamIds.length > 0 
        ? loserTeamIds 
        : prevScores.filter(s => !s.isWinner).map(s => s.teamId);

      const count = Number(formData.qualifiedTeamsCount) || finalLoserIds.length;
      const selectedLosers = finalLoserIds.slice(0, count);

      if (selectedLosers.length === 0) {
        Swal.fire({ icon: 'warning', title: 'पराभूत संघ सापडले नाहीत!' });
        return;
      }

      if (formData.matchFormat === 'DUEL' || formData.matchFormat === 'GROUP_DUEL') {
        const totalMatches = Math.ceil(selectedLosers.length / 2);
        for (let m = 0; m < totalMatches; m++) {
          const t1 = selectedLosers[m * 2];
          const t2 = selectedLosers[m * 2 + 1];
          if (t1) newAssigned[t1] = { group: null, slotNumber: m * 2 + 1, duelMatchNo: m + 1, duelSide: 'FOP1' };
          if (t2) newAssigned[t2] = { group: null, slotNumber: m * 2 + 2, duelMatchNo: m + 1, duelSide: 'FOP2' };
        }
      } else {
        selectedLosers.forEach((tId, idx) => {
          newAssigned[tId] = { group: null, slotNumber: idx + 1, duelMatchNo: idx + 1, duelSide: 'FOP1' };
        });
      }

      setFormData(prev => ({ ...prev, assignedTeams: newAssigned }));
      Swal.fire({ icon: 'success', title: 'मागील फेरीत पराभूत झालेले संघ सेट झाले!' });
      return;
    }

    // 🎯 मोड २: BOTTOM TEAMS (मागील फेरीतील तळाचे संघ)
    if (seedType === 'BOTTOM_TEAMS') {
      const immediatePrevRound = prevRounds[prevRounds.length - 1];
      const prevScores = allTournamentScores.filter(s => s.roundId === immediatePrevRound?.id);

      if (prevScores.length === 0) {
        Swal.fire({ icon: 'warning', title: 'लगतच्या फेरीचे निकाल उपलब्ध नाहीत!' });
        return;
      }

      const sortedAsc = [...prevScores].sort((a, b) => {
        return (a.pointsAwarded || 0) - (b.pointsAwarded || 0) || (b.finalTimingMs || 0) - (a.finalTimingMs || 0);
      });

      const count = Number(formData.qualifiedTeamsCount) || sortedAsc.length;
      const bottomTeams = sortedAsc.slice(0, count);

      bottomTeams.forEach((item, idx) => {
        newAssigned[item.teamId] = {
          group: null,
          slotNumber: idx + 1,
          duelMatchNo: Math.floor(idx / 2) + 1,
          duelSide: idx % 2 === 0 ? 'FOP1' : 'FOP2'
        };
      });

      setFormData(prev => ({ ...prev, assignedTeams: newAssigned }));
      Swal.fire({ icon: 'success', title: 'तळाचे (Bottom) संघ सेट झाले!' });
      return;
    }

    // 🎯 मोड ३: PREV_WINNERS (मागील फेरीतील विजेते संघ)
    if (seedType === 'PREV_WINNERS') {
      const immediatePrevRound = prevRounds[prevRounds.length - 1];
      const prevScores = allTournamentScores.filter(s => s.roundId === immediatePrevRound?.id);

      const winnerTeamIds = [];
      const matchNumbers = [...new Set(prevScores.map(s => Number(s.duelMatchNo) || 1))].sort((a, b) => a - b);

      matchNumbers.forEach(mNo => {
        const matchScores = prevScores.filter(s => Number(s.duelMatchNo) === mNo);
        const winner = matchScores.find(s => s.isWinner === true || s.roundRank === 1);
        if (winner) winnerTeamIds.push(winner.teamId);
      });

      const finalWinnerIds = winnerTeamIds.length > 0 ? winnerTeamIds : prevScores.filter(s => s.isWinner).map(s => s.teamId);
      const count = Number(formData.qualifiedTeamsCount) || finalWinnerIds.length;
      const selectedWinners = finalWinnerIds.slice(0, count);

      if (formData.matchFormat === 'DUEL' || formData.matchFormat === 'GROUP_DUEL') {
        const totalMatches = Math.ceil(selectedWinners.length / 2);
        for (let m = 0; m < totalMatches; m++) {
          const t1 = selectedWinners[m * 2];
          const t2 = selectedWinners[m * 2 + 1];
          if (t1) newAssigned[t1] = { group: null, slotNumber: m * 2 + 1, duelMatchNo: m + 1, duelSide: 'FOP1' };
          if (t2) newAssigned[t2] = { group: null, slotNumber: m * 2 + 2, duelMatchNo: m + 1, duelSide: 'FOP2' };
        }
      } else {
        selectedWinners.forEach((tId, idx) => {
          newAssigned[tId] = { group: null, slotNumber: idx + 1, duelMatchNo: idx + 1, duelSide: 'FOP1' };
        });
      }

      setFormData(prev => ({ ...prev, assignedTeams: newAssigned }));
      Swal.fire({ icon: 'success', title: 'मागील फेरीतील विजेते संघ सेट झाले!' });
      return;
    }

    // 🎯 मोड ४: PREV_ROUND किंवा CUMULATIVE
    const targetRoundIds = seedType === 'PREV_ROUND' 
      ? [prevRounds[prevRounds.length - 1]?.id] 
      : prevRoundIds;

    const eligibleScores = allTournamentScores.filter(s => targetRoundIds.includes(s.roundId));

    if (eligibleScores.length === 0) {
      Swal.fire({ icon: 'warning', title: 'आधीच्या फेऱ्यांचे निकाल उपलब्ध नाहीत!' });
      return;
    }

    if (formData.matchFormat === 'GROUP_DUEL' || (formData.matchFormat === 'GROUP' && formData.groupExecutionType === 'DUEL')) {
      formData.groupsConfig.forEach(grp => {
        const groupTeamIds = teams.filter(t => {
          const tScores = eligibleScores.filter(s => s.teamId === t.id);
          const lastGrp = tScores[tScores.length - 1]?.group || formData.assignedTeams[t.id]?.group;
          return lastGrp === grp.name;
        }).map(t => t.id);

        const teamStats = groupTeamIds.map(tId => {
          const tScores = eligibleScores.filter(s => s.teamId === tId);
          const totalPoints = tScores.reduce((sum, s) => sum + (Number(s.pointsAwarded) || 0), 0);
          const totalTime = tScores.reduce((sum, s) => sum + (Number(s.finalTimingMs) || 0), 0);
          return { teamId: tId, totalPoints, totalTime };
        });

        teamStats.sort((a, b) => b.totalPoints - a.totalPoints || a.totalTime - b.totalTime);

        if (teamStats.length >= 4) {
          newAssigned[teamStats[0].teamId] = { group: grp.name, slotNumber: 1, duelMatchNo: 1, duelSide: 'FOP1' };
          newAssigned[teamStats[3].teamId] = { group: grp.name, slotNumber: 2, duelMatchNo: 1, duelSide: 'FOP2' };
          newAssigned[teamStats[1].teamId] = { group: grp.name, slotNumber: 3, duelMatchNo: 2, duelSide: 'FOP1' };
          newAssigned[teamStats[2].teamId] = { group: grp.name, slotNumber: 4, duelMatchNo: 2, duelSide: 'FOP2' };
        }
      });
    } else if (formData.matchFormat === 'DUEL') {
      const allTeamStats = teams.map(t => {
        const tScores = eligibleScores.filter(s => s.teamId === t.id);
        const totalPoints = tScores.reduce((sum, s) => sum + (Number(s.pointsAwarded) || 0), 0);
        const totalTime = tScores.reduce((sum, s) => sum + (Number(s.finalTimingMs) || 0), 0);
        return { teamId: t.id, totalPoints, totalTime };
      });

      allTeamStats.sort((a, b) => b.totalPoints - a.totalPoints || a.totalTime - b.totalTime);

      const count = Number(formData.qualifiedTeamsCount) || allTeamStats.length;
      const topTeams = allTeamStats.slice(0, count).map(s => s.teamId);
      const totalMatches = Math.floor(topTeams.length / 2);

      for (let m = 0; m < totalMatches; m++) {
        const t1 = topTeams[m];
        const t2 = topTeams[topTeams.length - 1 - m];
        if (t1) newAssigned[t1] = { group: null, slotNumber: m * 2 + 1, duelMatchNo: m + 1, duelSide: 'FOP1' };
        if (t2) newAssigned[t2] = { group: null, slotNumber: m * 2 + 2, duelMatchNo: m + 1, duelSide: 'FOP2' };
      }
    } else {
      const allTeamStats = teams.map(t => {
        const tScores = eligibleScores.filter(s => s.teamId === t.id);
        const totalPoints = tScores.reduce((sum, s) => sum + (Number(s.pointsAwarded) || 0), 0);
        const totalTime = tScores.reduce((sum, s) => sum + (Number(s.finalTimingMs) || 0), 0);
        return { teamId: t.id, totalPoints, totalTime };
      });

      allTeamStats.sort((a, b) => b.totalPoints - a.totalPoints || a.totalTime - b.totalTime);
      const count = Number(formData.qualifiedTeamsCount) || allTeamStats.length;
      const topTeams = allTeamStats.slice(0, count);

      topTeams.forEach((item, idx) => {
        newAssigned[item.teamId] = { group: null, slotNumber: idx + 1, duelMatchNo: idx + 1, duelSide: 'FOP1' };
      });
    }

    setFormData(prev => ({ ...prev, assignedTeams: newAssigned }));
    Swal.fire({
      icon: 'success',
      title: seedType === 'PREV_ROUND' ? 'मागील रँकनुसार संघ सेट झाले!' : 'एकत्रित रँकनुसार संघ सेट झाले!',
      confirmButtonColor: '#f59e0b',
      background: '#0c0d14',
      color: '#fff'
    });
  };

  // -------------------------------------------------------------
  // 🎯 २. कस्टमाईज्ड मल्टी-सोर्स सीडर (Custom Multi-Round Seeder)
  // -------------------------------------------------------------
  const handleAddCustomSeedSource = () => {
    setCustomSeedSources(prev => [
      ...prev,
      { id: `src-${Date.now()}`, roundId: '', filterType: 'WINNERS', count: 1 }
    ]);
  };

  const handleRemoveCustomSeedSource = (id) => {
    setCustomSeedSources(prev => prev.filter(s => s.id !== id));
  };

  const handleCustomSeedChange = (id, field, val) => {
    setCustomSeedSources(prev => prev.map(s => {
      if (s.id === id) {
        return { ...s, [field]: field === 'count' ? Number(val) || 1 : val };
      }
      return s;
    }));
  };

  const handleApplyCustomSeeding = () => {
    let finalPickedTeamIds = [];

    for (const src of customSeedSources) {
      if (!src.roundId) continue;
      const rScores = allTournamentScores.filter(s => s.roundId === src.roundId);
      
      let filtered = [];

      if (src.filterType === 'WINNERS') {
        filtered = rScores.filter(s => s.isWinner === true || s.roundRank === 1);
      } else if (src.filterType === 'LOSERS') {
        filtered = rScores.filter(s => s.isWinner === false || s.roundRank === 2);
      } else {
        // थेट रँकिंग (Descarregat > Carregat -> कमी वेळ)
        filtered = [...rScores].sort((a, b) => {
          const getWeight = (sit) => (sit === 'DESCARREGAT' ? 1 : sit === 'CARREGAT' ? 2 : 3);
          const wA = getWeight(a.situation);
          const wB = getWeight(b.situation);
          if (wA !== wB) return wA - wB;
          return (a.finalTimingMs || 0) - (b.finalTimingMs || 0);
        });
      }

      const picked = filtered.slice(0, Number(src.count) || 1).map(s => s.teamId);
      finalPickedTeamIds.push(...picked);
    }

    finalPickedTeamIds = [...new Set(finalPickedTeamIds)];

    if (finalPickedTeamIds.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'संघ सापडले नाहीत!',
        text: 'निवडलेल्या फेऱ्यांचे निकाल अद्याप पूर्ण झालेले नाहीत किंवा स्कोअर उपलब्ध नाहीत.',
        confirmButtonColor: '#f59e0b',
        background: '#0c0d14',
        color: '#fff'
      });
      return;
    }

    const newAssigned = {};

    if (formData.matchFormat === 'DUEL' || formData.matchFormat === 'GROUP_DUEL') {
      const totalMatches = Math.ceil(finalPickedTeamIds.length / 2);
      for (let m = 0; m < totalMatches; m++) {
        const t1 = finalPickedTeamIds[m * 2];
        const t2 = finalPickedTeamIds[m * 2 + 1];
        if (t1) newAssigned[t1] = { group: null, slotNumber: m * 2 + 1, duelMatchNo: m + 1, duelSide: 'FOP1' };
        if (t2) newAssigned[t2] = { group: null, slotNumber: m * 2 + 2, duelMatchNo: m + 1, duelSide: 'FOP2' };
      }
    } else {
      finalPickedTeamIds.forEach((tId, idx) => {
        newAssigned[tId] = {
          group: null,
          slotNumber: idx + 1,
          duelMatchNo: idx + 1,
          duelSide: 'FOP1'
        };
      });
    }

    setFormData(prev => ({ 
      ...prev, 
      assignedTeams: newAssigned,
      qualifiedTeamsCount: finalPickedTeamIds.length 
    }));

    setShowCustomSeedModal(false);

    Swal.fire({
      icon: 'success',
      title: 'कस्टमाईज्ड संघ यशस्वीरीत्या सेट झाले!',
      text: `एकूण ${finalPickedTeamIds.length} संघ या फेरीसाठी आणले गेले आहेत.`,
      confirmButtonColor: '#f59e0b',
      background: '#0c0d14',
      color: '#fff'
    });
  };

  // 💾 फेरी आणि Fixtures सेव्ह करणे
  const handleSaveRoundAndFixtures = async (e) => {
    e.preventDefault();
    if (!formData.roundName.trim()) {
      Swal.fire({ icon: 'warning', title: 'कृपया फेरीचे नाव टाका!' });
      return;
    }

    try {
      const roundId = editingRoundId ? editingRoundId : `ROUND_${formData.roundNumber}_${Date.now()}`;
      const roundRef = doc(db, 'dahi_handi_tournaments', tournamentId, 'rounds', roundId);
      const isGroupBased = formData.matchFormat === 'GROUP' || formData.matchFormat === 'GROUP_DUEL';
      const groupNamesList = isGroupBased ? formData.groupsConfig.map(g => g.name) : [];

      await setDoc(roundRef, {
        roundNumber: String(formData.roundNumber).trim(),
        roundName: formData.roundName.trim(),
        stage: formData.stage || 'LEAGUE_STAGE',
        type: formData.type,
        matchFormat: formData.matchFormat,
        groupExecutionType: formData.matchFormat === 'GROUP_DUEL' ? 'DUEL' : (formData.matchFormat === 'GROUP' ? 'SYNC' : 'SYNC'),
        duelSeedingType: formData.duelSeedingType,
        qualifiedTeamsCount: Number(formData.qualifiedTeamsCount) || 16,
        advancingWinnersCount: formData.advancingWinnersCount !== '' ? Number(formData.advancingWinnersCount) : 2,
        squadLimit: formData.squadLimit !== '' ? Number(formData.squadLimit) : 30,
        tierHeight: formData.tierHeight ? Number(formData.tierHeight) : null,
        pyramidFormat: formData.pyramidFormat || '',
        preparationTime: formData.preparationTime !== '' ? Number(formData.preparationTime) : null,
        hasGroups: isGroupBased,
        groupsConfig: isGroupBased ? formData.groupsConfig : [],
        groupList: groupNamesList,
        intentPoints: formData.intentPoints !== '' ? Number(formData.intentPoints) : 200,
        pointsList: (formData.type === 'KNOCKOUT' || formData.type === 'WILDCARD' || formData.matchFormat === 'FORMATION_DIFFICULTY') ? [] : (formData.pointsList || []).filter(p => p.label.trim() !== ''),
        formationList: formData.matchFormat === 'FORMATION_DIFFICULTY' ? (formData.formationList || []) : [],
        penaltyList: (formData.penaltyList || []).filter(p => p.label.trim() !== ''),
        updatedAt: serverTimestamp(),
        createdAt: editingRoundId ? (formData.createdAt || serverTimestamp()) : serverTimestamp()
      }, { merge: true });

      const batch = writeBatch(db);
      const oldFixSnap = await getDocs(collection(db, 'dahi_handi_tournaments', tournamentId, 'rounds', roundId, 'fixtures'));
      oldFixSnap.docs.forEach(d => { batch.delete(d.ref); });

      Object.entries(formData.assignedTeams).forEach(([tId, fixData]) => {
        const tObj = teams.find(t => t.id === tId);
        const fRef = doc(db, 'dahi_handi_tournaments', tournamentId, 'rounds', roundId, 'fixtures', tId);
        batch.set(fRef, {
          teamId: tId,
          teamName: tObj?.teamName || '',
          city: tObj?.city || '',
          ...fixData,
          updatedAt: serverTimestamp()
        });
      });

      await batch.commit();

      Swal.fire({
        icon: 'success',
        title: editingRoundId ? 'फेरी व सामने अद्ययावत झाले!' : 'नवीन फेरी व सामने यशस्वीरीत्या सेव्ह झाले!',
        timer: 1600,
        showConfirmButton: false,
        background: '#0c0d14',
        color: '#fff'
      });

      setViewMode('LIST');
      setEditingRoundId(null);
      fetchData();

    } catch (err) {
      console.error("Save round error:", err);
      Swal.fire({ icon: 'error', title: 'त्रुटी!', text: 'फेरी सेव्ह करताना अडचण आली.' });
    }
  };

  const handleDeleteRound = async (id, name) => {
    const res = await Swal.fire({
      title: 'फेरी हटवायची आहे का?',
      text: `"${name}" मधील सर्व नियम आणि सामने हटवले जातील.`,
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
        await deleteDoc(doc(db, 'dahi_handi_tournaments', tournamentId, 'rounds', id));
        fetchData();
      } catch (e) {}
    }
  };

  const isGroupBasedFormat = formData.matchFormat === 'GROUP' || formData.matchFormat === 'GROUP_DUEL';

  return (
    <div className="space-y-4 text-white font-sans w-full">
      
      {/* 🔝 मोड १: फेऱ्यांची मुख्य यादी (List View) */}
      {viewMode === 'LIST' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-[#0c0d14] border border-amber-500/20 p-4 rounded-2xl shadow-xl">
            <div className="flex items-center gap-3">
              <Layers className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                  📋 फेऱ्या व गट रचना व्यवस्थापन (एकूण फेऱ्या: {rounds.length})
                </h2>
                <p className="text-[10px] text-gray-400">
                  QF (८ संघ $\rightarrow$ ४ विजेते), Wildcard (१ विजेता), Semis (४ किंवा ५ संघ), Finals (२ किंवा ३ संघ) व संघ वाटप
                </p>
              </div>
            </div>

            <button
              onClick={handleOpenNewRoundForm}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" /> + नवीन फेरी जोडा
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-400 text-xs animate-pulse font-bold">फेऱ्या लोड होत आहेत...</div>
          ) : rounds.length === 0 ? (
            <div className="p-8 text-center bg-black/40 border border-dashed border-amber-500/20 rounded-2xl space-y-2">
              <Layers className="w-8 h-8 text-amber-400/50 mx-auto" />
              <p className="text-xs text-gray-400 font-bold">कोणतीही फेरी तयार केलेली नाही.</p>
              <p className="text-[11px] text-gray-500">वर दिलेल्या "+ नवीन फेरी जोडा" बटणावर क्लिक करा.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {rounds.map((r) => (
                <div 
                  key={r.id}
                  className="bg-[#0c0d14] border border-white/10 hover:border-amber-500/40 rounded-2xl p-4 space-y-3 shadow-lg transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-md border ${
                          r.stage === 'GRAND_FINAL' ? 'bg-amber-500 text-black border-amber-400 font-black' :
                          r.stage === 'SEMI_FINAL' ? 'bg-orange-500/20 text-orange-400 border-orange-500/40' :
                          r.stage === 'QUARTER_FINAL' ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' :
                          r.stage === 'WILDCARD_STAGE' ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' :
                          'bg-white/5 text-gray-300 border-white/10'
                        }`}>
                          {r.stage ? r.stage.replace('_', ' ') : `फेरी #${r.roundNumber}`}
                        </span>

                        <span className="text-[9px] font-mono text-gray-400">
                          {r.type}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditRound(r)}
                          className="p-1.5 bg-white/5 hover:bg-amber-500/20 text-gray-400 hover:text-amber-400 rounded-lg transition cursor-pointer"
                          title="एडिट व सामने वाटप"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteRound(r.id, r.roundName)}
                          className="p-1.5 bg-white/5 hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 rounded-lg transition cursor-pointer"
                          title="डिलीट"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-base font-extrabold text-white">{r.roundName}</h3>
                    
                    <div className="space-y-1.5 mt-2.5 text-xs text-gray-300">
                      <div className="flex items-center justify-between bg-black/40 p-2 rounded-xl border border-white/5">
                        <span className="text-gray-400 flex items-center gap-1">
                          <Users className="w-3 h-3 text-amber-400" /> फॉरमॅट:
                        </span>
                        <b className="text-amber-300">
                          {r.matchFormat === 'GROUP_DUEL' 
                            ? '⚔️ ग्रुप डुएल' 
                            : r.matchFormat === 'FORMATION_DIFFICULTY'
                            ? '🏆 Formation'
                            : r.matchFormat === 'SINGLE'
                            ? '⏱️ Single Slot'
                            : r.matchFormat === 'GROUP' 
                            ? '👥 ग्रुप सिंक' 
                            : r.matchFormat}
                        </b>
                      </div>

                      <div className="flex items-center justify-between bg-black/40 p-2 rounded-xl border border-white/5">
                        <span className="text-gray-400">खेळणारे संघ:</span>
                        <span className="font-mono font-bold text-emerald-400">
                          {r.qualifiedTeamsCount || 16} संघ ({r.squadLimit || 30} खेळाडू)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px]">
                    <span className="text-gray-400">पुढील फेरीत जाणारे:</span>
                    <span className="text-amber-400 font-bold font-mono">
                      {r.advancingWinnersCount ? `${r.advancingWinnersCount} विजेते संघ` : 'विजेते संघ'}
                    </span>
                  </div>

                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* ========================================================= */}
      {/* 📝 मोड २: पूर्ण-स्क्रीन फेरी कॉन्फिगरेशन व संघ वाटप       */}
      {/* ========================================================= */}
      {viewMode === 'FORM' && (
        <div className="bg-[#0c0d14] border border-amber-500/20 rounded-3xl p-4 sm:p-6 space-y-6 shadow-2xl">
          
          {/* Header */}
          <div className="flex justify-between items-center border-b border-white/10 pb-3">
            <div className="flex items-center gap-3">
              <button 
                type="button"
                onClick={() => setViewMode('LIST')}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-300 hover:text-white transition cursor-pointer"
                title="मागे जा"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-base font-black text-white flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-amber-400" />
                  {editingRoundId ? 'फेरी, नियम व सामने एडिट करा' : 'नवीन फेरी, नियम व सामने सेट करा'}
                </h2>
                <p className="text-[10px] text-gray-400">टूर्नामेंट स्टेज (QF, Semis, Finals), स्क्वॉड साइज, फॉरमॅट आणि विजेते संघ संख्या ठरवा.</p>
              </div>
            </div>

            <button 
              type="button"
              onClick={() => setViewMode('LIST')}
              className="text-gray-400 hover:text-white text-xs bg-white/5 px-3 py-1.5 rounded-xl cursor-pointer"
            >
              ✕ रद्द करा
            </button>
          </div>

          <form onSubmit={handleSaveRoundAndFixtures} className="space-y-6 text-xs">
            
            {/* १. फेरी मूलभूत तपशील */}
            <div className="bg-black/40 p-3.5 sm:p-4 rounded-2xl border border-white/5 space-y-3">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                १. फेरीची मूलभूत माहिती व स्टेज (Tournament Stage & Info)
              </h3>

              <div className="grid grid-cols-12 gap-2.5 items-end">
                <div className="col-span-12 sm:col-span-2">
                  <label className="block text-gray-300 font-semibold text-[11px] mb-1">
                    फेरी क्र. / कोड *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="उदा. 1, 6, 7.1"
                    value={formData.roundNumber}
                    onChange={(e) => setFormData({ ...formData, roundNumber: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-xl text-amber-300 font-mono font-bold text-xs focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div className="col-span-12 sm:col-span-6">
                  <label className="block text-gray-300 font-semibold text-[11px] mb-1">फेरीचे संपूर्ण नाव *</label>
                  <input
                    type="text"
                    required
                    placeholder="उदा. Round 8 — Semifinals"
                    value={formData.roundName}
                    onChange={(e) => setFormData({ ...formData, roundName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-xl text-white font-bold text-xs focus:border-amber-400 focus:outline-none"
                  />
                </div>

                {/* 🎯 फेरीचा टप्पा / स्टेज */}
                <div className="col-span-12 sm:col-span-4">
                  <label className="block text-amber-400 font-semibold text-[11px] mb-1">
                    टूर्नामेंट स्टेज (Tournament Stage) *
                  </label>
                  <select
                    value={formData.stage || 'LEAGUE_STAGE'}
                    onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                    className="w-full bg-slate-900 border border-amber-500/40 px-2.5 py-1.5 rounded-xl text-amber-300 font-bold text-xs focus:border-amber-400 focus:outline-none cursor-pointer"
                  >
                    <option value="LEAGUE_STAGE">🏁 साखळी फेरी (League Stage)</option>
                    <option value="PRE_QUARTER">⚡ प्री-क्वार्टर (Pre-Quarterfinals / Top 16)</option>
                    <option value="QUARTER_FINAL">⚔️ क्वार्टरफायनल (Quarterfinals / Top 8)</option>
                    <option value="WILDCARD_STAGE">🛡️ वाईल्डकार्ड फेरी (Wildcard Repechage)</option>
                    <option value="SEMI_FINAL">🔥 सेमीफायनल (Semifinals)</option>
                    <option value="GRAND_FINAL">🏆 महाअंतिम सामना (Grand Finals)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1 items-end">
                <div>
                  <label className="block text-gray-300 font-semibold text-[11px] mb-1">फेरीचा प्रकार *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 px-2 py-1.5 rounded-xl text-white font-bold text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="LEAGUE">लीग फेरी (League Points)</option>
                    <option value="KNOCKOUT">नॉकआउट बाद फेरी (Knockout)</option>
                    <option value="WILDCARD">🛡️ वाईल्डकार्ड (Wildcard / 1 Winner)</option>
                    <option value="CONCUR">🏆 फायनल्स (Finals / Concur)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-amber-300 font-semibold text-[11px] mb-1">मॅच फॉरमॅट *</label>
                  <select
                    value={formData.matchFormat}
                    onChange={(e) => {
                      const selected = e.target.value;
                      const isGroup = selected === 'GROUP' || selected === 'GROUP_DUEL';
                      setFormData({
                        ...formData,
                        matchFormat: selected,
                        hasGroups: isGroup,
                        groupExecutionType: selected === 'GROUP_DUEL' ? 'DUEL' : (selected === 'GROUP' ? 'SYNC' : 'SYNC'),
                        formationList: selected === 'FORMATION_DIFFICULTY' ? (formData.formationList?.length ? formData.formationList : DEFAULT_CONCUR_FORMATIONS) : formData.formationList
                      });
                    }}
                    className="w-full bg-slate-900 border border-amber-500/40 px-2 py-1.5 rounded-xl text-amber-300 font-bold text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="GROUP">👥 Group (सर्व संघ एकदम)</option>
                    <option value="GROUP_DUEL">⚔️ Group Duel (1v4, 2v3)</option>
                    <option value="DUEL">⚔️ Duel (1 vs 1 सामने)</option>
                    <option value="SINGLE">⏱️ Single Slot</option>
                    <option value="FORMATION_DIFFICULTY">🏆 Formation / Concur</option>
                  </select>
                </div>

                {/* 🎯 सहभागी संघ संख्या */}
                <div>
                  <label className="block text-emerald-400 font-semibold text-[11px] mb-1">
                    सहभागी संघ *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={64}
                    placeholder="उदा. 4, 5, 8"
                    value={formData.qualifiedTeamsCount}
                    onChange={(e) => setFormData({ ...formData, qualifiedTeamsCount: e.target.value })}
                    className="w-full bg-slate-900 border border-emerald-500/40 px-2.5 py-1.5 rounded-xl text-emerald-400 font-mono font-bold text-xs focus:border-emerald-400 focus:outline-none"
                  />
                </div>

                {/* 🎯 पुढील फेरीत जाणारे विजेते संघ */}
                <div>
                  <label className="block text-amber-300 font-semibold text-[11px] mb-1">
                    पुढील विजेते (Advancing) *
                  </label>
                  <div className="flex items-center bg-slate-900 border border-amber-500/30 rounded-xl px-2 py-1 focus-within:border-amber-400">
                    <input
                      type="number"
                      min={1}
                      max={16}
                      placeholder="2"
                      value={formData.advancingWinnersCount !== undefined ? formData.advancingWinnersCount : 2}
                      onChange={(e) => setFormData({ ...formData, advancingWinnersCount: e.target.value })}
                      className="w-full bg-transparent text-amber-300 font-mono font-bold text-xs focus:outline-none"
                    />
                    <span className="text-[10px] font-mono text-gray-400 font-bold ml-1">विजेते</span>
                  </div>
                </div>

                {/* 🎯 खेळाडूंची संख्या / स्क्वॉड मर्यादा */}
                <div>
                  <label className="block text-cyan-300 font-semibold text-[11px] mb-1 flex items-center gap-1">
                    <Users className="w-3 h-3 text-cyan-400" /> खेळाडू संख्या
                  </label>
                  <div className="flex items-center bg-slate-900 border border-cyan-500/30 rounded-xl px-2 py-1 focus-within:border-cyan-400">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      placeholder="30"
                      value={formData.squadLimit !== undefined ? formData.squadLimit : 30}
                      onChange={(e) => setFormData({ ...formData, squadLimit: e.target.value })}
                      className="w-full bg-transparent text-cyan-300 font-mono font-bold text-xs focus:outline-none"
                    />
                    <span className="text-[10px] font-mono text-gray-400 font-bold ml-1">खेळाडू</span>
                  </div>
                </div>

                <div>
                  <label className="block text-orange-300 font-semibold text-[11px] mb-1">तयारी वेळ</label>
                  <div className="flex items-center bg-slate-900 border border-orange-500/30 rounded-xl px-2 py-1 focus-within:border-orange-400">
                    <input
                      type="number"
                      min={0}
                      placeholder="60"
                      value={formData.preparationTime}
                      onChange={(e) => setFormData({ ...formData, preparationTime: e.target.value })}
                      className="w-full bg-transparent text-orange-300 font-mono font-bold text-xs focus:outline-none"
                    />
                    <span className="text-[10px] font-mono text-gray-400 font-bold ml-1">sec</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 🎯 २. सामने रचना व संघ वाटप */}
            {(isGroupBasedFormat || formData.matchFormat === 'DUEL' || formData.matchFormat === 'SINGLE' || formData.matchFormat === 'FORMATION_DIFFICULTY') && (
              <div className="bg-black/40 p-4 sm:p-5 rounded-2xl border border-orange-500/20 space-y-4">
                
                {/* Header & Seeding Controls */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-white/10 pb-3">
                  <div>
                    <h3 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Swords className="w-4 h-4" /> २. सामने रचना व संघ वाटप (Match-Making & Team Slots)
                    </h3>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {formData.matchFormat === 'GROUP_DUEL' 
                        ? 'प्रत्येक ग्रुपमधील अंतर्गत सामने (1v4 आणि 2v3)'
                        : formData.matchFormat === 'DUEL' 
                        ? '१ विरुद्ध १ सामने (Rank 1 vs 8, 2 vs 7...)' 
                        : `एकल स्लॉट क्रमवारी (स्लॉट १ ते ${formData.qualifiedTeamsCount || 4} एकामागे एक)`}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* 🌟 डायनॅमिक मल्टी-सोर्स सीडर बटण */}
                    <button
                      type="button"
                      onClick={() => setShowCustomSeedModal(true)}
                      className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition cursor-pointer text-[11px]"
                      title="उदा. Quarterfinals मधून ३ किंवा ४ विजेते + Wildcard चा १ संघ थेट आणा"
                    >
                      <Sliders className="w-3.5 h-3.5 stroke-[2.5]" /> 🎯 कस्टमाईज्ड संघ निवड (QF + Wildcard)
                    </button>

                    {/* 🏆 १. मागील फेरीतील विजेते संघ */}
                    <button
                      type="button"
                      onClick={() => handleAutoSeed('PREV_WINNERS')}
                      className="px-2.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-black font-bold rounded-xl border border-emerald-500/30 flex items-center gap-1 transition cursor-pointer text-[11px]"
                      title="मागील फेरीतील विजेते (QF / SF Winners) संघ भरा"
                    >
                      <Trophy className="w-3.5 h-3.5" /> 🏆 विजेते (Winners)
                    </button>

                    {/* ⚔️ २. Wildcard / QF Losers */}
                    <button
                      type="button"
                      onClick={() => handleAutoSeed('PREV_LOSERS')}
                      className="px-2.5 py-1.5 bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white font-bold rounded-xl border border-rose-500/30 flex items-center gap-1 transition cursor-pointer text-[11px]"
                      title="मागील फेरीतील पराभूत (QF Losers / Lost Teams) संघ भरा"
                    >
                      <Shuffle className="w-3.5 h-3.5" /> पराभूत (QF Losers)
                    </button>

                    {/* 📉 ३. तळाचे संघ */}
                    <button
                      type="button"
                      onClick={() => handleAutoSeed('BOTTOM_TEAMS')}
                      className="px-2.5 py-1.5 bg-purple-500/20 hover:bg-purple-500 text-purple-300 hover:text-white font-bold rounded-xl border border-purple-500/30 flex items-center gap-1 transition cursor-pointer text-[11px]"
                      title="मागील फेरीतील तळाचे संघ भरा"
                    >
                      <Layers className="w-3.5 h-3.5" /> तळाचे संघ (Bottom)
                    </button>

                    {/* ✨ ४. मागील रँक सीड */}
                    <button
                      type="button"
                      onClick={() => handleAutoSeed('PREV_ROUND')}
                      className="px-2.5 py-1.5 bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-black font-bold rounded-xl border border-cyan-500/30 flex items-center gap-1 transition cursor-pointer text-[11px]"
                      title="केवळ मागील फेरीच्या रँकनुसार संघ भरा"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> मागील रँक
                    </button>

                    {/* 🏆 ५. एकत्रित गुण सीड */}
                    <button
                      type="button"
                      onClick={() => handleAutoSeed('CUMULATIVE')}
                      className="px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black font-bold rounded-xl border border-amber-500/30 flex items-center gap-1 transition cursor-pointer text-[11px]"
                      title="मागील सर्व फेऱ्यांच्या एकत्रित निकालांनुसार संघ भरा"
                    >
                      <Award className="w-3.5 h-3.5" /> एकत्रित गुण
                    </button>

                    {isGroupBasedFormat && (
                      <button
                        type="button"
                        onClick={handleAddGroup}
                        className="px-2.5 py-1.5 bg-blue-500/20 hover:bg-blue-500 text-blue-300 hover:text-black font-bold rounded-xl border border-blue-500/30 flex items-center gap-1 transition cursor-pointer text-[11px]"
                      >
                        <PlusCircle className="w-3.5 h-3.5" /> + ग्रुप
                      </button>
                    )}
                  </div>
                </div>

                {/* 🎯 A. GROUP_DUEL FORMAT */}
                {formData.matchFormat === 'GROUP_DUEL' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {formData.groupsConfig.map((grp, gIdx) => {
                      const totalMatches = Math.max(1, Math.floor((grp.maxTeams || 4) / 2));

                      return (
                        <div key={grp.id || gIdx} className="bg-slate-900/90 border border-orange-500/30 rounded-2xl p-3.5 space-y-3.5 shadow-xl flex flex-col justify-between">
                          <div className="flex justify-between items-center bg-black/60 p-2 rounded-xl border border-white/5">
                            <input
                              type="text"
                              value={grp.name}
                              onChange={(e) => handleGroupConfigChange(gIdx, 'name', e.target.value)}
                              className="bg-transparent font-black text-orange-400 text-xs focus:outline-none w-24"
                            />
                            
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] text-gray-400">संघ:</span>
                              <input
                                type="number"
                                min={2}
                                max={8}
                                step={2}
                                value={grp.maxTeams || 4}
                                onChange={(e) => handleGroupConfigChange(gIdx, 'maxTeams', e.target.value)}
                                className="w-10 bg-slate-800 text-center font-mono font-bold text-amber-300 text-xs rounded p-0.5 border border-slate-600 focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="space-y-3">
                            {Array.from({ length: totalMatches }).map((_, mIdx) => {
                              const matchNo = mIdx + 1;
                              const slot1Index = mIdx * 2;
                              const slot2Index = mIdx * 2 + 1;

                              const t1Entry = Object.entries(formData.assignedTeams).find(
                                ([_, fix]) => fix.group === grp.name && fix.duelMatchNo === matchNo && fix.duelSide === 'FOP1'
                              );
                              const t2Entry = Object.entries(formData.assignedTeams).find(
                                ([_, fix]) => fix.group === grp.name && fix.duelMatchNo === matchNo && fix.duelSide === 'FOP2'
                              );

                              return (
                                <div key={matchNo} className="bg-black/60 border border-white/10 rounded-2xl p-2.5 space-y-2 relative">
                                  <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 border-b border-white/5 pb-1">
                                    <span className="text-amber-400 flex items-center gap-1 font-mono">
                                      <Swords className="w-3 h-3 text-orange-400" /> सामना #{matchNo}
                                    </span>
                                  </div>

                                  <div className="space-y-0.5">
                                    <select
                                      value={t1Entry ? t1Entry[0] : ''}
                                      onChange={(e) => handleAssignTeamToSlot(grp.name, slot1Index, e.target.value, matchNo, 'FOP1')}
                                      className="w-full bg-slate-900 border border-slate-700 p-1.5 rounded-lg text-white font-bold text-xs focus:border-amber-400 focus:outline-none cursor-pointer"
                                    >
                                      <option value="">-- संघ निवडा (FOP 1) --</option>
                                      {teams.map(t => (
                                        <option key={t.id} value={t.id}>#{t.chestNumber || '-'} {t.teamName}</option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="text-center font-black text-[9px] text-rose-400 font-mono">VS</div>

                                  <div className="space-y-0.5">
                                    <select
                                      value={t2Entry ? t2Entry[0] : ''}
                                      onChange={(e) => handleAssignTeamToSlot(grp.name, slot2Index, e.target.value, matchNo, 'FOP2')}
                                      className="w-full bg-slate-900 border border-slate-700 p-1.5 rounded-lg text-white font-bold text-xs focus:border-amber-400 focus:outline-none cursor-pointer"
                                    >
                                      <option value="">-- संघ निवडा (FOP 2) --</option>
                                      {teams.map(t => (
                                        <option key={t.id} value={t.id}>#{t.chestNumber || '-'} {t.teamName}</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : formData.matchFormat === 'GROUP' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {formData.groupsConfig.map((grp, gIdx) => (
                      <div key={grp.id || gIdx} className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-3.5 space-y-3 shadow-lg flex flex-col justify-between">
                        <div className="flex justify-between items-center bg-black/60 p-2 rounded-xl border border-white/5">
                          <input
                            type="text"
                            value={grp.name}
                            onChange={(e) => handleGroupConfigChange(gIdx, 'name', e.target.value)}
                            className="bg-transparent font-black text-blue-300 text-xs focus:outline-none w-24"
                          />
                        </div>

                        <div className="space-y-2">
                          {Array.from({ length: grp.maxTeams || 4 }).map((_, sIdx) => {
                            const assignedTeamEntry = Object.entries(formData.assignedTeams).find(
                              ([tId, fix]) => fix.group === grp.name && fix.slotNumber === (sIdx + 1)
                            );
                            const currentTeamId = assignedTeamEntry ? assignedTeamEntry[0] : '';

                            return (
                              <div key={sIdx} className="bg-black/50 p-2 rounded-xl border border-white/5 space-y-1">
                                <select
                                  value={currentTeamId}
                                  onChange={(e) => handleAssignTeamToSlot(grp.name, sIdx, e.target.value, 1, 'FOP1')}
                                  className="w-full bg-slate-900 border border-slate-700 p-1.5 rounded-lg text-white font-bold text-xs focus:border-amber-400 focus:outline-none cursor-pointer"
                                >
                                  <option value="">-- संघ निवडा --</option>
                                  {teams.map(t => (
                                    <option key={t.id} value={t.id}>
                                      #{t.chestNumber || '-'} {t.teamName}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : formData.matchFormat === 'DUEL' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                    {Array.from({ length: Math.floor((Number(formData.qualifiedTeamsCount) || 8) / 2) }).map((_, mIdx) => {
                      const matchNo = mIdx + 1;
                      const t1Entry = Object.entries(formData.assignedTeams).find(([_, fix]) => fix.duelMatchNo === matchNo && fix.duelSide === 'FOP1');
                      const t2Entry = Object.entries(formData.assignedTeams).find(([_, fix]) => fix.duelMatchNo === matchNo && fix.duelSide === 'FOP2');

                      return (
                        <div key={matchNo} className="bg-slate-900/90 border border-orange-500/30 rounded-2xl p-3.5 space-y-3 shadow-lg">
                          <div className="flex justify-between items-center border-b border-white/5 pb-1 text-orange-400 font-mono text-xs font-black">
                            <span>सामना #{matchNo}</span>
                          </div>

                          <div className="space-y-1">
                            <select
                              value={t1Entry ? t1Entry[0] : ''}
                              onChange={(e) => handleAssignTeamToSlot(null, mIdx * 2, e.target.value, matchNo, 'FOP1')}
                              className="w-full bg-black/60 border border-slate-700 p-1.5 rounded-lg text-white font-bold text-xs focus:border-amber-400 focus:outline-none cursor-pointer"
                            >
                              <option value="">-- संघ A निवडा --</option>
                              {teams.map(t => (
                                <option key={t.id} value={t.id}>#{t.chestNumber || '-'} {t.teamName}</option>
                              ))}
                            </select>
                          </div>

                          <div className="text-center font-black text-[10px] text-rose-400">VS</div>

                          <div className="space-y-1">
                            <select
                              value={t2Entry ? t2Entry[0] : ''}
                              onChange={(e) => handleAssignTeamToSlot(null, mIdx * 2 + 1, e.target.value, matchNo, 'FOP2')}
                              className="w-full bg-black/60 border border-slate-700 p-1.5 rounded-lg text-white font-bold text-xs focus:border-amber-400 focus:outline-none cursor-pointer"
                            >
                              <option value="">-- संघ B निवडा --</option>
                              {teams.map(t => (
                                <option key={t.id} value={t.id}>#{t.chestNumber || '-'} {t.teamName}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* 🎯 SINGLE SLOT ALLOCATION (उदा. Semis ला ५ किंवा Finals ला ३ संघ) */
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 max-h-96 overflow-y-auto pr-1">
                    {Array.from({ length: Number(formData.qualifiedTeamsCount) || 4 }).map((_, sIdx) => {
                      const slotNum = sIdx + 1;
                      const assignedTeamEntry = Object.entries(formData.assignedTeams).find(
                        ([_, fix]) => fix.slotNumber === slotNum
                      );
                      const currentTeamId = assignedTeamEntry ? assignedTeamEntry[0] : '';

                      return (
                        <div key={slotNum} className="bg-slate-900/90 border border-white/5 rounded-2xl p-2.5 space-y-1.5 shadow">
                          <div className="flex justify-between items-center text-[10px] font-mono text-gray-400">
                            <span className="text-amber-400 font-bold">स्लॉट #{slotNum}</span>
                            {currentTeamId && <span className="text-emerald-400 font-bold">✓ सेट</span>}
                          </div>

                          <select
                            value={currentTeamId}
                            onChange={(e) => handleAssignTeamToSlot(null, sIdx, e.target.value, slotNum, 'FOP1')}
                            className="w-full bg-black/60 border border-slate-700 p-1.5 rounded-lg text-white font-bold text-xs focus:border-amber-400 focus:outline-none cursor-pointer"
                          >
                            <option value="">-- संघ निवडा --</option>
                            {teams.map(t => (
                              <option key={t.id} value={t.id}>
                                #{t.chestNumber || '-'} {t.teamName} ({t.city || 'महाराष्ट्र'})
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ३. पॉईंट्स सिस्टीम (फक्त LEAGUE फेरीसाठी) */}
            {formData.type === 'LEAGUE' && formData.matchFormat !== 'FORMATION_DIFFICULTY' && (
              <div className="bg-black/40 p-4 rounded-2xl border border-amber-500/20 space-y-3.5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-white/10 pb-2.5">
                  <h4 className="font-bold text-amber-400 text-xs flex items-center gap-1.5">
                    <Award className="w-4 h-4" /> ३. रँक व गुण व्यवस्थापन (Points Setup)
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddPointRow}
                    className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500 text-amber-400 hover:text-black font-bold rounded-lg border border-amber-500/30 flex items-center gap-1 transition cursor-pointer text-[11px]"
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> + रँक जोडा
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                  {formData.pointsList.map((pt, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                      <input
                        type="text"
                        placeholder="रँक नाव"
                        value={pt.label}
                        onChange={(e) => handlePointChange(idx, 'label', e.target.value)}
                        className="flex-1 bg-black/60 border border-slate-700 px-2 py-1 rounded-lg text-white font-medium focus:outline-none"
                      />
                      <input
                        type="number"
                        placeholder="गुण"
                        value={pt.points}
                        onChange={(e) => handlePointChange(idx, 'points', e.target.value)}
                        className="w-20 bg-black/60 border border-slate-700 px-2 py-1 rounded-lg text-emerald-400 font-bold font-mono focus:outline-none"
                      />
                      {formData.pointsList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePointRow(idx)}
                          className="text-gray-500 hover:text-rose-400 p-1"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 🏆 ३. FORMATION / CONCUR रचना व गुण तक्ता */}
            {formData.matchFormat === 'FORMATION_DIFFICULTY' && (
              <div className="bg-black/40 p-4 sm:p-5 rounded-2xl border border-amber-500/30 space-y-4">
                <div className="flex justify-between items-center border-b border-white/10 pb-3">
                  <div>
                    <h4 className="font-bold text-amber-400 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                      <Trophy className="w-4 h-4" /> ३. Formation / Concur रचना व गुण तक्ता (Points Matrix)
                    </h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      प्रत्येक रचनेनुसार Descarregat, Carregat आणि Intent चे गुण ठरवा.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddFormationRow}
                    className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500 text-amber-400 hover:text-black font-bold rounded-lg border border-amber-500/30 flex items-center gap-1 transition cursor-pointer text-[11px]"
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> + नवीन रचना जोडा
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900 border-b border-white/10 text-[10px] uppercase font-mono text-gray-400">
                        <th className="p-2.5">Formation Name</th>
                        <th className="p-2.5 w-16 text-center">Category</th>
                        <th className="p-2.5">Formation (Structure)</th>
                        <th className="p-2.5 text-center text-emerald-400 font-bold">Descarregat</th>
                        <th className="p-2.5 text-center text-amber-400 font-bold">Carregat</th>
                        <th className="p-2.5 text-center text-rose-400">Intent</th>
                        <th className="p-2.5 text-center text-gray-400">Intent Desmuntat</th>
                        <th className="p-2.5 text-center w-10">काढा</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono">
                      {formData.formationList.map((fmt, idx) => (
                        <tr key={idx} className="hover:bg-white/5 transition">
                          <td className="p-2">
                            <input
                              type="text"
                              placeholder="Classic-14"
                              value={fmt.name}
                              onChange={(e) => handleFormationChange(idx, 'name', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 px-2 py-1 rounded-lg text-white font-bold text-xs focus:border-amber-400 focus:outline-none"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              value={fmt.category !== undefined ? fmt.category : 7}
                              onChange={(e) => handleFormationChange(idx, 'category', e.target.value)}
                              className="w-12 bg-slate-900 border border-slate-700 px-1 py-1 rounded-lg text-center text-white text-xs focus:outline-none"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              placeholder="5+3+2+1+1+1+1"
                              value={fmt.structure}
                              onChange={(e) => handleFormationChange(idx, 'structure', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 px-2 py-1 rounded-lg text-blue-300 font-bold text-xs focus:border-blue-400 focus:outline-none"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              placeholder="4000"
                              value={fmt.descarregat}
                              onChange={(e) => handleFormationChange(idx, 'descarregat', e.target.value)}
                              className="w-20 bg-slate-900 border border-emerald-500/40 px-2 py-1 rounded-lg text-emerald-400 font-bold text-center text-xs focus:outline-none"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              placeholder="3320"
                              value={fmt.carregat}
                              onChange={(e) => handleFormationChange(idx, 'carregat', e.target.value)}
                              className="w-20 bg-slate-900 border border-amber-500/40 px-2 py-1 rounded-lg text-amber-300 font-bold text-center text-xs focus:outline-none"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              value={fmt.intent !== undefined ? fmt.intent : 0}
                              onChange={(e) => handleFormationChange(idx, 'intent', e.target.value)}
                              className="w-16 bg-slate-900 border border-rose-500/40 px-1 py-1 rounded-lg text-rose-300 font-bold text-center text-xs focus:outline-none"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              value={fmt.intentDesmuntat !== undefined ? fmt.intentDesmuntat : 0}
                              onChange={(e) => handleFormationChange(idx, 'intentDesmuntat', e.target.value)}
                              className="w-16 bg-slate-900 border border-slate-700 px-1 py-1 rounded-lg text-gray-400 text-center text-xs focus:outline-none"
                            />
                          </td>
                          <td className="p-2 text-center">
                            {formData.formationList.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveFormationRow(idx)}
                                className="p-1 text-gray-500 hover:text-rose-400 transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ४. पेनल्टी व्यवस्थापन (सर्व पर्याय आणि डिलीट बटण १००% सुरक्षित) */}
            <div className="bg-black/40 p-4 rounded-2xl border border-rose-500/20 space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-rose-400 text-xs flex items-center gap-1.5">
                  <Clock className="w-4 h-4" /> ४. पेनल्टी व्यवस्थापन (Penalties)
                </h4>
                <button
                  type="button"
                  onClick={handleAddPenaltyRow}
                  className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white font-bold rounded-lg border border-rose-500/30 flex items-center gap-1 transition cursor-pointer text-[11px]"
                >
                  <PlusCircle className="w-3.5 h-3.5" /> + नवीन पेनल्टी जोडा
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {formData.penaltyList.map((pen, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                    <input
                      type="text"
                      placeholder="पेनल्टी नाव"
                      value={pen.label}
                      onChange={(e) => handlePenaltyChange(idx, 'label', e.target.value)}
                      className="flex-1 bg-black/60 border border-slate-700 px-2.5 py-1.5 rounded-lg text-white font-medium focus:outline-none text-xs"
                    />

                    <select
                      value={pen.type || 'TIME'}
                      onChange={(e) => handlePenaltyChange(idx, 'type', e.target.value)}
                      className="bg-black/60 border border-slate-700 px-2 py-1.5 rounded-lg text-xs font-bold text-amber-400 focus:outline-none cursor-pointer"
                    >
                      <option value="TIME">⏱️ वेळ (+sec)</option>
                      <option value="POINTS">🎯 गुण (-pts)</option>
                    </select>

                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        value={pen.value !== undefined ? pen.value : (pen.seconds || '')}
                        onChange={(e) => handlePenaltyChange(idx, 'value', e.target.value)}
                        className="w-16 bg-black/60 border border-slate-700 px-2 py-1.5 rounded-lg text-amber-300 font-bold font-mono text-center text-xs focus:outline-none"
                      />
                      <span className="text-[10px] text-gray-400 font-bold w-6">
                        {pen.type === 'POINTS' ? 'pts' : 'sec'}
                      </span>
                    </div>

                    {/* 🗑️ पेनल्टी हटवण्याचे मूळ बटण */}
                    <button
                      type="button"
                      onClick={() => handleRemovePenaltyRow(idx)}
                      className="p-1 text-gray-500 hover:text-rose-400 transition cursor-pointer"
                      title="पेनल्टी हटवा"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Submit Actions */}
            <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setViewMode('LIST')}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
              >
                रद्द करा
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                {editingRoundId ? '✅ फेरी व सामने सेव्ह करा' : '✅ नवीन फेरी व सामने सेव्ह करा'}
              </button>
            </div>

          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* 🎯 मोडल: कस्टमाईज्ड मल्टी-सोर्स सीडर (Multi-Round Seeder Wizard) */}
      {/* ========================================================= */}
      {showCustomSeedModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#0c0d14] border border-amber-500/40 w-full max-w-xl rounded-3xl p-5 space-y-4 shadow-2xl">
            
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-sm text-white">कस्टमाईज्ड संघ निवड (Multi-Round Seeder)</h3>
              </div>
              <button
                onClick={() => setShowCustomSeedModal(false)}
                className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-gray-400 leading-relaxed">
              उदा. Semifinals साठी <b>Quarterfinals मधील ४ विजेते + Wildcard चा १ विजेता (एकूण ५ संघ)</b> किंवा Finals साठी <b>Semis चे २ किंवा ३ विजेते</b> थेट आणा:
            </p>

            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {customSeedSources.map((src, sIdx) => (
                <div key={src.id} className="bg-slate-900 border border-white/10 p-3 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                  
                  {/* फेरी निवड */}
                  <div className="flex-1 w-full">
                    <label className="text-[9px] text-gray-400 block mb-0.5 font-bold">स्त्रोत फेरी #{sIdx + 1}:</label>
                    <select
                      value={src.roundId}
                      onChange={(e) => handleCustomSeedChange(src.id, 'roundId', e.target.value)}
                      className="w-full bg-black/60 border border-slate-700 px-2 py-1.5 rounded-xl text-white font-bold text-xs focus:border-amber-400 focus:outline-none cursor-pointer"
                    >
                      <option value="">-- फेरी निवडा --</option>
                      {rounds.map(r => (
                        <option key={r.id} value={r.id}>
                          फेरी #{r.roundNumber}: {r.roundName} ({r.stage || r.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* संघ पात्रता */}
                  <div className="w-full sm:w-36">
                    <label className="text-[9px] text-gray-400 block mb-0.5 font-bold">संघ पात्रता:</label>
                    <select
                      value={src.filterType}
                      onChange={(e) => handleCustomSeedChange(src.id, 'filterType', e.target.value)}
                      className="w-full bg-black/60 border border-slate-700 px-2 py-1.5 rounded-xl text-amber-300 font-bold text-xs focus:border-amber-400 focus:outline-none cursor-pointer"
                    >
                      <option value="WINNERS">🏆 विजेते (Winners)</option>
                      <option value="LOSERS">❌ पराभूत (Losers)</option>
                      <option value="TOP_RANK">⚡ रँकनुसार (Top Ranks)</option>
                    </select>
                  </div>

                  {/* संख्या */}
                  <div className="w-full sm:w-20">
                    <label className="text-[9px] text-gray-400 block mb-0.5 font-bold">संख्या:</label>
                    <input
                      type="number"
                      min={1}
                      max={16}
                      value={src.count}
                      onChange={(e) => handleCustomSeedChange(src.id, 'count', e.target.value)}
                      className="w-full bg-black/60 border border-slate-700 px-2 py-1.5 rounded-xl text-emerald-400 font-mono font-black text-center text-xs focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  {customSeedSources.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomSeedSource(src.id)}
                      className="text-gray-500 hover:text-rose-400 p-1 self-end sm:self-center mt-2 sm:mt-4 cursor-pointer"
                      title="हटवा"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddCustomSeedSource}
              className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" /> + आणखी एक फेरी स्त्रोत जोडा
            </button>

            <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCustomSeedModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
              >
                रद्द करा
              </button>
              <button
                type="button"
                onClick={handleApplyCustomSeeding}
                className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black rounded-xl text-xs shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                ✅ संघ लागू करा
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}