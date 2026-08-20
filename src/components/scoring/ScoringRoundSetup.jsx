// ==========================================
// #SECTION: DEDICATED FULL-SCREEN ROUND & GROUP-TEAM ENGINE (EXPLICIT GROUP_DUEL OPTION)
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
  Trophy, Swords, ArrowLeft, CheckCircle2, ShieldCheck, Sparkles, Shuffle
} from 'lucide-react';

export default function ScoringRoundSetup({ tournamentId }) {
  const [rounds, setRounds] = useState([]);
  const [teams, setTeams] = useState([]);
  const [allTournamentScores, setAllTournamentScores] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 'LIST' | 'FORM'
  const [viewMode, setViewMode] = useState('LIST');
  const [editingRoundId, setEditingRoundId] = useState(null);

  // फॉर्मचा मूळ साचा
  const initialFormState = {
    roundNumber: '1',
    roundName: '',
    type: 'LEAGUE',
    matchFormat: 'GROUP',
    groupExecutionType: 'SYNC',
    duelSeedingType: 'PREV_ROUND',
    qualifiedTeamsCount: 16,
    tierHeight: '',
    pyramidFormat: '',      // 🎯 नवीन: पिरॅमिड रचना (उदा. 5+3+2+1+1)
    preparationTime: 60,    // 🎯 नवीन: तयारी वेळ सेकंदात (उदा. 60 sec)
    squadLimit: '',
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
    formationList: [],
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
      const tList = tSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTeams(tList);

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
      roundNumber: String(r.roundNumber || '1'),
      qualifiedTeamsCount: r.qualifiedTeamsCount || 16,
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
      formationList: r.formationList || [],
      penaltyList: r.penaltyList?.length ? r.penaltyList : [{ label: '', type: 'TIME', value: 2, perPlayer: true }]
    });
    setViewMode('FORM');
  };

  // -------------------------------------------------------------
  // 👥 ग्रुप्स व्यवस्थापन फंक्शन्स
  // -------------------------------------------------------------
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

  // -------------------------------------------------------------
  // 🎯 गुण (Points System) फंक्शन्स
  // -------------------------------------------------------------
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

  // -------------------------------------------------------------
  // 🏆 काठिण्य पातळी (Formation Difficulty) फंक्शन्स
  // -------------------------------------------------------------
  const handleAddFormationRow = () => {
    setFormData(prev => ({
      ...prev,
      formationList: [
        ...(prev.formationList || []),
        { name: '', structure: '', descarregat: '', carregat: '', intent: 0 }
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
        [field]: (field === 'descarregat' || field === 'carregat' || field === 'intent') 
          ? (val === '' ? '' : Number(val)) 
          : val
      };
      return { ...prev, formationList: updated };
    });
  };

  // -------------------------------------------------------------
  // ⏱️ पेनल्टी व्यवस्थापन फंक्शन्स
  // -------------------------------------------------------------
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

  // -------------------------------------------------------------
  // 🎯 संघ वाटप (Assign Team to Slot / Match)
  // -------------------------------------------------------------
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
          duelMatchNo: isDuelMode ? duelMatchNo : 1,
          duelSide: isDuelMode ? duelSide : 'FOP1'
        };
      }

      return { ...prev, assignedTeams: updated };
    });
  };

// -------------------------------------------------------------
  // ⚡ प्रगत ग्रुपनिहाय एकत्रित ऑटो-सीडिंग (Round 1 + Round 2 Cumulative: 1v4 & 2v3)
  // -------------------------------------------------------------
  const handleAutoSeed = (seedType = 'PREV_ROUND') => {
    const currentRNum = parseFloat(formData.roundNumber) || 1;

    // चालू फेरीच्या आधी खेळवल्या गेलेल्या सर्व फेऱ्या शोधणे
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

    // आधीच्या सर्व फेऱ्यांमधील स्कोअर्स
    const eligibleScores = allTournamentScores.filter(s => prevRoundIds.includes(s.roundId));

    if (eligibleScores.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'आधीच्या फेऱ्यांचे निकाल उपलब्ध नाहीत!',
        text: 'कृपया आधी मागील फेऱ्यांचे निकाल पूर्ण करून सेव्ह करा.',
        confirmButtonColor: '#f59e0b',
        background: '#0c0d14',
        color: '#fff'
      });
      return;
    }

    const newAssigned = {};

    // 🎯 A. GROUP_DUEL (प्रत्येक ग्रुपमधील 1v4 आणि 2v3 सामने)
    if (formData.matchFormat === 'GROUP_DUEL' || (formData.matchFormat === 'GROUP' && formData.groupExecutionType === 'DUEL')) {

      formData.groupsConfig.forEach(grp => {
        // या ग्रुपशी संबंधित संघांची यादी मिळवणे
        const groupTeamIds = teams.filter(t => {
          const tScores = eligibleScores.filter(s => s.teamId === t.id);
          const lastGrp = tScores[tScores.length - 1]?.group || formData.assignedTeams[t.id]?.group;
          return lastGrp === grp.name;
        }).map(t => t.id);

        // मागील सर्व फेऱ्यांची एकूण एकत्रित बेरीज (Total Cumulative Points & Time)
        const teamStats = groupTeamIds.map(tId => {
          const tScores = eligibleScores.filter(s => s.teamId === tId);
          const totalPoints = tScores.reduce((sum, s) => sum + (Number(s.pointsAwarded) || 0), 0);
          const totalTime = tScores.reduce((sum, s) => sum + (Number(s.finalTimingMs) || 0), 0);

          return {
            teamId: tId,
            totalPoints,
            totalTime
          };
        });

        // 🏆 ग्रुपमधील अचूक क्रमवारी (जास्त गुण -> कमी वेळ)
        teamStats.sort((a, b) => {
          if (b.totalPoints !== a.totalPoints) {
            return b.totalPoints - a.totalPoints;
          }
          return a.totalTime - b.totalTime;
        });

        // ⚔️ अचूक 1v4 आणि 2v3 जोड्या लावणे
        if (teamStats.length >= 4) {
          const rank1Team = teamStats[0].teamId;
          const rank2Team = teamStats[1].teamId;
          const rank3Team = teamStats[2].teamId;
          const rank4Team = teamStats[3].teamId;

          // सामना #१: Rank 1 (FOP 1) VS Rank 4 (FOP 2)
          newAssigned[rank1Team] = { group: grp.name, slotNumber: 1, duelMatchNo: 1, duelSide: 'FOP1' };
          newAssigned[rank4Team] = { group: grp.name, slotNumber: 2, duelMatchNo: 1, duelSide: 'FOP2' };

          // सामना #२: Rank 2 (FOP 1) VS Rank 3 (FOP 2)
          newAssigned[rank2Team] = { group: grp.name, slotNumber: 3, duelMatchNo: 2, duelSide: 'FOP1' };
          newAssigned[rank3Team] = { group: grp.name, slotNumber: 4, duelMatchNo: 2, duelSide: 'FOP2' };
        }
      });

    // 🎯 B. OVERALL DUEL (Rank 1 vs 8, Rank 2 vs 7...)
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

    // 🎯 C. GROUP SYNC
    } else {
      let teamIndex = 0;
      const allTeamStats = teams.map(t => {
        const tScores = eligibleScores.filter(s => s.teamId === t.id);
        const totalPoints = tScores.reduce((sum, s) => sum + (Number(s.pointsAwarded) || 0), 0);
        const totalTime = tScores.reduce((sum, s) => sum + (Number(s.finalTimingMs) || 0), 0);
        return { teamId: t.id, totalPoints, totalTime };
      });

      allTeamStats.sort((a, b) => b.totalPoints - a.totalPoints || a.totalTime - b.totalTime);

      formData.groupsConfig.forEach(grp => {
        for (let i = 0; i < grp.maxTeams; i++) {
          if (teamIndex < allTeamStats.length) {
            const tId = allTeamStats[teamIndex].teamId;
            newAssigned[tId] = { group: grp.name, slotNumber: i + 1, duelMatchNo: 1, duelSide: 'FOP1' };
            teamIndex++;
          }
        }
      });
    }

    setFormData(prev => ({ ...prev, assignedTeams: newAssigned }));

    Swal.fire({
      icon: 'success',
      title: 'एकत्रित रँकनुसार संघ अचूक सेट झाले!',
      html: `
        <div style="text-align: left; font-size: 12px; margin-top: 5px;">
          <p style="color: #10b981; font-weight: bold;">मागील सर्व फेऱ्यांच्या एकूण एकत्रित गुणांवरून जोड्या लावल्या:</p>
          <ul style="margin-top: 5px; padding-left: 15px; color: #d1d5db;">
            <li>सामना #१: <b>Rank 1 (FOP1) VS Rank 4 (FOP2)</b></li>
            <li>सामना #२: <b>Rank 2 (FOP1) VS Rank 3 (FOP2)</b></li>
          </ul>
        </div>
      `,
      confirmButtonColor: '#f59e0b',
      background: '#0c0d14',
      color: '#fff'
    });
  };

  // -------------------------------------------------------------
  // 💾 फेरी आणि संघ Fixtures सेव्ह करणे
  // -------------------------------------------------------------
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
        type: formData.type,
        matchFormat: formData.matchFormat,
        groupExecutionType: formData.matchFormat === 'GROUP_DUEL' ? 'DUEL' : (formData.matchFormat === 'GROUP' ? 'SYNC' : 'SYNC'),
        duelSeedingType: formData.duelSeedingType,
        qualifiedTeamsCount: Number(formData.qualifiedTeamsCount) || 16,
        tierHeight: formData.tierHeight ? Number(formData.tierHeight) : null,
        pyramidFormat: formData.pyramidFormat || '',
        preparationTime: formData.preparationTime !== '' ? Number(formData.preparationTime) : null,
        squadLimit: formData.squadLimit ? Number(formData.squadLimit) : null,
        hasGroups: isGroupBased,
        groupsConfig: isGroupBased ? formData.groupsConfig : [],
        groupList: groupNamesList,
        intentPoints: formData.intentPoints !== '' ? Number(formData.intentPoints) : 200,
        pointsList: formData.type === 'KNOCKOUT' ? [] : (formData.pointsList || []).filter(p => p.label.trim() !== ''),
        formationList: (formData.formationList || []).filter(f => f.name.trim() !== ''),
        penaltyList: (formData.penaltyList || []).filter(p => p.label.trim() !== ''),
        updatedAt: serverTimestamp(),
        createdAt: editingRoundId ? (formData.createdAt || serverTimestamp()) : serverTimestamp()
      }, { merge: true });

      // Fixtures सेव्ह करणे
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

  // 🗑️ फेरी डिलीट करणे
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
                  फेरीचे फॉरमॅट, सब-राऊंड्स (`7.1`, `7A`), ग्रुप डुएल (1v4, 2v3), ओव्हरऑल डुएल व संघ वाटप
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
                      <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-md border ${
                        r.type === 'KNOCKOUT' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      }`}>
                        फेरी #{r.roundNumber} • {r.type}
                      </span>
                      
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
                          {r.matchFormat === 'GROUP_DUEL' ? '⚔️ ग्रुप डुएल (1v4, 2v3)' : r.matchFormat === 'GROUP' ? '👥 ग्रुप सिंक' : r.matchFormat}
                        </b>
                      </div>

                      <div className="flex items-center justify-between bg-black/40 p-2 rounded-xl border border-white/5">
                        <span className="text-gray-400">खेळणारे संघ:</span>
                        <span className="font-mono font-bold text-emerald-400">
                          {r.qualifiedTeamsCount || 16} संघ
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px]">
                    <span className="text-gray-400">सामने पद्धत:</span>
                    <span className="text-amber-400 font-bold">
                      {r.matchFormat === 'GROUP_DUEL' ? '⚔️ ग्रुप डुएल' : r.matchFormat === 'GROUP' ? '👥 ग्रुप सिंक' : r.matchFormat}
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
                  {editingRoundId ? 'फेरी, नियम व द्वंद्व सामने एडिट करा' : 'नवीन फेरी, नियम व द्वंद्व सामने सेट करा'}
                </h2>
                <p className="text-[10px] text-gray-400">फेरीचे नाव, सब-राऊंड क्रमांक, फॉरमॅट (Group, Group Duel, Duel) आणि संघ ठरवा.</p>
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
            
            {/* १. फेरी मूलभूत तपशील (Compact & Balanced Grid) */}
<div className="bg-black/40 p-3.5 sm:p-4 rounded-2xl border border-white/5 space-y-3">
  <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
    १. फेरीची मूलभूत माहिती (Round Info & Setup)
  </h3>

  {/* Row 1: Basic Info (Balanced Columns) */}
  <div className="grid grid-cols-12 gap-2.5 items-end">
    <div className="col-span-12 sm:col-span-2">
      <label className="block text-gray-300 font-semibold text-[11px] mb-1">
        फेरी क्र. / कोड *
      </label>
      <input
        type="text"
        required
        placeholder="उदा. 1, 7, 7.1"
        value={formData.roundNumber}
        onChange={(e) => setFormData({ ...formData, roundNumber: e.target.value })}
        className="w-full bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-xl text-amber-300 font-mono font-bold text-xs focus:border-amber-400 focus:outline-none"
      />
    </div>

    <div className="col-span-12 sm:col-span-7">
      <label className="block text-gray-300 font-semibold text-[11px] mb-1">फेरीचे संपूर्ण नाव *</label>
      <input
        type="text"
        required
        placeholder="उदा. Round 2 — Tower Ka Dangal"
        value={formData.roundName}
        onChange={(e) => setFormData({ ...formData, roundName: e.target.value })}
        className="w-full bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-xl text-white font-bold text-xs focus:border-amber-400 focus:outline-none"
      />
    </div>

    <div className="col-span-12 sm:col-span-3">
      <label className="block text-emerald-400 font-semibold text-[11px] mb-1">
        सहभागी संघ *
      </label>
      <input
        type="number"
        required
        min={1}
        max={64}
        placeholder="उदा. 16"
        value={formData.qualifiedTeamsCount}
        onChange={(e) => setFormData({ ...formData, qualifiedTeamsCount: e.target.value })}
        className="w-full bg-slate-900 border border-emerald-500/40 px-2.5 py-1.5 rounded-xl text-emerald-400 font-mono font-bold text-xs focus:border-emerald-400 focus:outline-none"
      />
    </div>
  </div>

  {/* Row 2: Format, Rules & Timings (5 Compact Columns) */}
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-1 items-end">
    <div>
      <label className="block text-gray-300 font-semibold text-[11px] mb-1">फेरीचा प्रकार</label>
      <select
        value={formData.type}
        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
        className="w-full bg-slate-900 border border-slate-700 px-2 py-1.5 rounded-xl text-white font-bold text-xs focus:outline-none cursor-pointer"
      >
        <option value="LEAGUE">लीग फेरी (League)</option>
        <option value="KNOCKOUT">नॉकआउट (Knockout)</option>
        <option value="CONCUR">फायनल्स (Finals)</option>
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
            groupExecutionType: selected === 'GROUP_DUEL' ? 'DUEL' : (selected === 'GROUP' ? 'SYNC' : 'SYNC')
          });
        }}
        className="w-full bg-slate-900 border border-amber-500/40 px-2 py-1.5 rounded-xl text-amber-300 font-bold text-xs focus:outline-none cursor-pointer"
      >
        <option value="GROUP">👥 Group (सर्व संघ एकदम)</option>
        <option value="GROUP_DUEL">⚔️ Group Duel (1v4, 2v3)</option>
        <option value="DUEL">⚔️ Duel (1 vs 1 सामने)</option>
        <option value="SINGLE">⏱️ Single Slot</option>
        <option value="FORMATION_DIFFICULTY">🏆 काठिण्य पातळी</option>
      </select>
    </div>

    <div>
      <label className="block text-gray-300 font-semibold text-[11px] mb-1">थर मर्यादा</label>
      <input
        type="number"
        placeholder="उदा. 6 किंवा 7"
        value={formData.tierHeight}
        onChange={(e) => setFormData({ ...formData, tierHeight: e.target.value })}
        className="w-full bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-xl text-white font-mono font-bold text-xs focus:outline-none"
      />
    </div>

    <div>
      <label className="block text-blue-300 font-semibold text-[11px] mb-1">पिरॅमिड रचना</label>
      <input
        type="text"
        placeholder="5+3+2+1+1"
        value={formData.pyramidFormat}
        onChange={(e) => setFormData({ ...formData, pyramidFormat: e.target.value })}
        className="w-full bg-slate-900 border border-blue-500/30 px-2.5 py-1.5 rounded-xl text-blue-300 font-mono font-bold text-xs focus:border-blue-400 focus:outline-none"
      />
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

            {/* 🎯 २. द्वंद्व व गट सामने वाटप (DUEL & GROUP ALLOCATION ENGINE) */}
    {(isGroupBasedFormat || formData.matchFormat === 'DUEL') && (
      <div className="bg-black/40 p-4 sm:p-5 rounded-2xl border border-orange-500/20 space-y-4">
        
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-white/10 pb-3">
          <div>
            <h3 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
              <Swords className="w-4 h-4" /> २. द्वंद्व सामने व गट रचना (Match-Making & Team Slots)
            </h3>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {formData.matchFormat === 'GROUP_DUEL' 
                ? 'प्रत्येक ग्रुपमधील अंतर्गत सामने (सामना १: FOP1 vs FOP2 आणि सामना २: FOP1 vs FOP2)'
                : formData.matchFormat === 'DUEL' 
                ? 'संपूर्ण फेरीतील १ विरुद्ध १ सामने (Rank 1 vs 8, 2 vs 7...)' 
                : 'प्रत्येक ग्रुपमधील सर्व संघ एकाच वेळी (Group Sync)'}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => handleAutoSeed('PREV_ROUND')}
              className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-black font-bold rounded-xl border border-emerald-500/30 flex items-center gap-1 transition cursor-pointer text-[11px]"
              title="मागील फेरीच्या रँकनुसार (1v4, 2v3)"
            >
              <Sparkles className="w-3.5 h-3.5" /> मागील रँक सीड (1v4, 2v3)
            </button>

            <button
              type="button"
              onClick={() => handleAutoSeed('CUMULATIVE')}
              className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black font-bold rounded-xl border border-amber-500/30 flex items-center gap-1 transition cursor-pointer text-[11px]"
              title="एकत्रित गुणतक्त्यानुसार"
            >
              <Trophy className="w-3.5 h-3.5" /> एकत्रित गुण सीड
            </button>

            {isGroupBasedFormat && (
              <button
                type="button"
                onClick={handleAddGroup}
                className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500 text-blue-300 hover:text-black font-bold rounded-xl border border-blue-500/30 flex items-center gap-1 transition cursor-pointer text-[11px]"
              >
                <PlusCircle className="w-3.5 h-3.5" /> + ग्रुप जोडा
              </button>
            )}
          </div>
        </div>

        {/* 🎯 A. GROUP_DUEL FORMAT (प्रत्येक ग्रुपमध्ये स्पष्ट VS सामने) */}
        {formData.matchFormat === 'GROUP_DUEL' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {formData.groupsConfig.map((grp, gIdx) => {
              const totalMatches = Math.max(1, Math.floor((grp.maxTeams || 4) / 2));

              return (
                <div key={grp.id || gIdx} className="bg-slate-900/90 border border-orange-500/30 rounded-2xl p-3.5 space-y-3.5 shadow-xl flex flex-col justify-between">
                  
                  {/* Group Title Bar */}
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
                      {formData.groupsConfig.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveGroup(gIdx)}
                          className="text-gray-500 hover:text-rose-400 p-0.5 ml-1"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ग्रुपमधील द्वंद्व सामने (Match 1 & Match 2 with VS badge) */}
                  <div className="space-y-3">
                    {Array.from({ length: totalMatches }).map((_, mIdx) => {
                      const matchNo = mIdx + 1;
                      const slot1Index = mIdx * 2;
                      const slot2Index = mIdx * 2 + 1;

                      // FOP 1 आणि FOP 2 संघ शोधणे
                      const t1Entry = Object.entries(formData.assignedTeams).find(
                        ([_, fix]) => fix.group === grp.name && fix.duelMatchNo === matchNo && fix.duelSide === 'FOP1'
                      );
                      const t2Entry = Object.entries(formData.assignedTeams).find(
                        ([_, fix]) => fix.group === grp.name && fix.duelMatchNo === matchNo && fix.duelSide === 'FOP2'
                      );

                      return (
                        <div key={matchNo} className="bg-black/60 border border-white/10 rounded-2xl p-2.5 space-y-2 relative">
                          
                          {/* Match Header */}
                          <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 border-b border-white/5 pb-1">
                            <span className="text-amber-400 flex items-center gap-1 font-mono">
                              <Swords className="w-3 h-3 text-orange-400" /> सामना #{matchNo}
                            </span>
                            <span className="text-[9px] text-gray-500">1 vs 1 Face-off</span>
                          </div>

                          {/* FOP 1 (Team A) */}
                          <div className="space-y-0.5">
                            <div className="flex justify-between text-[9px] font-mono text-gray-400">
                              <span>FOP 1 (स्लॉट #{slot1Index + 1})</span>
                              {t1Entry && <span className="text-emerald-400 font-bold">✓ सेट</span>}
                            </div>
                            <select
                              value={t1Entry ? t1Entry[0] : ''}
                              onChange={(e) => handleAssignTeamToSlot(grp.name, slot1Index, e.target.value, matchNo, 'FOP1')}
                              className="w-full bg-slate-900 border border-slate-700 p-1.5 rounded-lg text-white font-bold text-xs focus:border-amber-400 focus:outline-none cursor-pointer"
                            >
                              <option value="">-- संघ निवडा --</option>
                              {teams.map(t => (
                                <option key={t.id} value={t.id}>#{t.chestNumber || '-'} {t.teamName}</option>
                              ))}
                            </select>
                          </div>

                          {/* VS Divider */}
                          <div className="flex items-center justify-center gap-2 py-0.5">
                            <div className="h-[1px] bg-white/10 flex-1"></div>
                            <span className="text-[9px] font-black text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 font-mono">
                              VS
                            </span>
                            <div className="h-[1px] bg-white/10 flex-1"></div>
                          </div>

                          {/* FOP 2 (Team B) */}
                          <div className="space-y-0.5">
                            <div className="flex justify-between text-[9px] font-mono text-gray-400">
                              <span>FOP 2 (स्लॉट #{slot2Index + 1})</span>
                              {t2Entry && <span className="text-emerald-400 font-bold">✓ सेट</span>}
                            </div>
                            <select
                              value={t2Entry ? t2Entry[0] : ''}
                              onChange={(e) => handleAssignTeamToSlot(grp.name, slot2Index, e.target.value, matchNo, 'FOP2')}
                              className="w-full bg-slate-900 border border-slate-700 p-1.5 rounded-lg text-white font-bold text-xs focus:border-amber-400 focus:outline-none cursor-pointer"
                            >
                              <option value="">-- संघ निवडा --</option>
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

          /* 🎯 B. GROUP SYNC FORMAT (सर्व ४ संघ एकाखाली एक) */
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
                  
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-gray-400">संघ:</span>
                    <input
                      type="number"
                      min={1}
                      max={8}
                      value={grp.maxTeams}
                      onChange={(e) => handleGroupConfigChange(gIdx, 'maxTeams', e.target.value)}
                      className="w-10 bg-slate-800 text-center font-mono font-bold text-amber-300 text-xs rounded p-0.5 border border-slate-600 focus:outline-none"
                    />
                    {formData.groupsConfig.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveGroup(gIdx)}
                        className="text-gray-500 hover:text-rose-400 p-0.5 ml-1"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  {Array.from({ length: grp.maxTeams || 4 }).map((_, sIdx) => {
                    const assignedTeamEntry = Object.entries(formData.assignedTeams).find(
                      ([tId, fix]) => fix.group === grp.name && fix.slotNumber === (sIdx + 1)
                    );
                    const currentTeamId = assignedTeamEntry ? assignedTeamEntry[0] : '';

                    return (
                      <div key={sIdx} className="bg-black/50 p-2 rounded-xl border border-white/5 space-y-1">
                        <div className="flex justify-between items-center text-[9px] font-mono text-gray-400">
                          <span>स्लॉट #{sIdx + 1} (FOP {sIdx + 1})</span>
                          {currentTeamId && <span className="text-emerald-400 font-bold">✓ सेट</span>}
                        </div>

                        <select
                          value={currentTeamId}
                          onChange={(e) => handleAssignTeamToSlot(grp.name, sIdx, e.target.value, 1, 'FOP1')}
                          className="w-full bg-slate-900 border border-slate-700 p-1.5 rounded-lg text-white font-bold text-xs focus:border-amber-400 focus:outline-none cursor-pointer"
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

              </div>
            ))}
          </div>
        ) : (

          /* 🎯 C. OVERALL DUEL / KNOCKOUT (थेट बाद फेरी सामने) */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
            {Array.from({ length: Math.floor((Number(formData.qualifiedTeamsCount) || 8) / 2) }).map((_, mIdx) => {
              const matchNo = mIdx + 1;
              
              const t1Entry = Object.entries(formData.assignedTeams).find(([_, fix]) => fix.duelMatchNo === matchNo && fix.duelSide === 'FOP1');
              const t2Entry = Object.entries(formData.assignedTeams).find(([_, fix]) => fix.duelMatchNo === matchNo && fix.duelSide === 'FOP2');

              return (
                <div key={matchNo} className="bg-slate-900/90 border border-orange-500/30 rounded-2xl p-3.5 space-y-3 shadow-lg">
                  <div className="flex justify-between items-center border-b border-white/5 pb-1 text-orange-400 font-mono text-xs font-black">
                    <span>सामना #{matchNo}</span>
                    <span className="text-[9px] text-gray-400">1 vs 1 Duel</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-mono text-gray-400 block">FOP 1 (Team A):</span>
                    <select
                      value={t1Entry ? t1Entry[0] : ''}
                      onChange={(e) => handleAssignTeamToSlot(null, mIdx * 2, e.target.value, matchNo, 'FOP1')}
                      className="w-full bg-black/60 border border-slate-700 p-1.5 rounded-lg text-white font-bold text-xs focus:border-amber-400 focus:outline-none cursor-pointer"
                    >
                      <option value="">-- संघ निवडा --</option>
                      {teams.map(t => (
                        <option key={t.id} value={t.id}>#{t.chestNumber || '-'} {t.teamName}</option>
                      ))}
                    </select>
                  </div>

                  <div className="text-center font-black text-[10px] text-rose-400">VS</div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-mono text-gray-400 block">FOP 2 (Team B):</span>
                    <select
                      value={t2Entry ? t2Entry[0] : ''}
                      onChange={(e) => handleAssignTeamToSlot(null, mIdx * 2 + 1, e.target.value, matchNo, 'FOP2')}
                      className="w-full bg-black/60 border border-slate-700 p-1.5 rounded-lg text-white font-bold text-xs focus:border-amber-400 focus:outline-none cursor-pointer"
                    >
                      <option value="">-- संघ निवडा --</option>
                      {teams.map(t => (
                        <option key={t.id} value={t.id}>#{t.chestNumber || '-'} {t.teamName}</option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    )}

            {/* ३. पॉईंट्स सिस्टीम (Rank Points + Intent Points) */}
            {formData.type !== 'KNOCKOUT' && formData.matchFormat !== 'FORMATION_DIFFICULTY' && (
              <div className="bg-black/40 p-4 rounded-2xl border border-amber-500/20 space-y-3.5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-white/10 pb-2.5">
                  <div>
                    <h4 className="font-bold text-amber-400 text-xs flex items-center gap-1.5">
                      <Award className="w-4 h-4" /> रँक व गुण व्यवस्थापन (Points & Intent Setup)
                    </h4>
                    <p className="text-[10px] text-gray-400">यशस्वी थरांसाठी रँकनुसार गुण आणि केवळ प्रयत्न (Intent) साठीचे गुण ठरवा.</p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddPointRow}
                    className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500 text-amber-400 hover:text-black font-bold rounded-lg border border-amber-500/30 flex items-center gap-1 transition cursor-pointer text-[11px]"
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> + रँक जोडा
                  </button>
                </div>

                {/* 🎯 इन्टेंट गुण इनपुट */}
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                    <div>
                      <span className="text-xs font-black text-rose-300 block">❌ इन्टेंट गुण (Intent Points)</span>
                      <span className="text-[9px] text-gray-400">थर न लागल्यास / केवळ प्रयत्न केल्यास मिळणारे गुण:</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <input
                      type="number"
                      min={0}
                      placeholder="200"
                      value={formData.intentPoints !== undefined ? formData.intentPoints : 200}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        intentPoints: e.target.value === '' ? '' : Number(e.target.value) 
                      })}
                      className="w-20 bg-slate-900 border border-rose-500/40 px-2 py-1 rounded-lg text-rose-300 font-mono font-bold text-center text-xs focus:border-rose-400 focus:outline-none"
                    />
                    <span className="text-[10px] text-gray-400 font-bold font-mono">pts</span>
                  </div>
                </div>

                {/* 🏆 रँकनिहाय गुण ग्रिड */}
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

            {/* ४. पेनल्टी व्यवस्थापन */}
            <div className="bg-black/40 p-4 rounded-2xl border border-rose-500/20 space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-rose-400 text-xs flex items-center gap-1.5">
                  <Clock className="w-4 h-4" /> पेनल्टी व्यवस्थापन (Penalties)
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

                    <button
                      type="button"
                      onClick={() => handleRemovePenaltyRow(idx)}
                      className="p-1 text-gray-500 hover:text-rose-400 transition"
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

    </div>
  );
}