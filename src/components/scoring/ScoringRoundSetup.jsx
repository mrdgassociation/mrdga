// ==========================================
// #SECTION: SCORING ROUND SETUP (100% DEVANAGARI & USER-DEFINED TEAMS)
// ==========================================
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { 
  collection, doc, getDocs, setDoc, deleteDoc, 
  serverTimestamp, query, orderBy 
} from 'firebase/firestore';
import Swal from 'sweetalert2';
import { 
  Layers, Plus, Trash2, Edit3, Settings2, 
  Clock, Award, Users, PlusCircle, Network, Trophy, Swords
} from 'lucide-react';

export default function ScoringRoundSetup({ tournamentId }) {
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRound, setEditingRound] = useState(null);

  const [formData, setFormData] = useState({
    roundNumber: 1,
    roundName: '',
    type: 'LEAGUE', // 'LEAGUE' | 'KNOCKOUT' | 'CONCUR'
    matchFormat: 'GROUP', // 'GROUP' | 'DUEL' | 'SINGLE' | 'FORMATION_DIFFICULTY'
    qualifiedTeamsCount: 16, // युझर स्वतः संघ संख्या ठरवेल
    tierHeight: '',
    squadLimit: '',
    hasGroups: true,
    groupList: ['Group A', 'Group B', 'Group C', 'Group D'],
    
    pointsList: [
      { label: 'Rank 1 / Winner', points: 1000 },
      { label: 'Rank 2 / Loser', points: 700 },
      { label: 'Rank 3', points: 500 },
      { label: 'Rank 4', points: 300 }
    ],
    intentPoints: 300,
    formationList: [],
    penaltyList: [
      { label: 'Early Squat / Raising', type: 'TIME', value: 2, perPlayer: true },
      { label: 'Hand / Hands Raised', type: 'TIME', value: 2, perPlayer: true },
      { label: 'Out of Box', type: 'TIME', value: 2, perPlayer: true },
      { label: 'Carregat', type: 'POINTS', value: 50, perPlayer: false }
    ]
  });

  const fetchRounds = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'dahi_handi_tournaments', tournamentId, 'rounds'), 
        orderBy('roundNumber', 'asc')
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setRounds(list);
    } catch (err) {
      console.error("Error fetching rounds:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tournamentId) fetchRounds();
  }, [tournamentId]);

  const handleAddGroup = () => {
    const nextChar = String.fromCharCode(65 + formData.groupList.length);
    setFormData(prev => ({ ...prev, groupList: [...prev.groupList, `Group ${nextChar}`] }));
  };

  const handleRemoveGroup = (idx) => {
    setFormData(prev => ({ ...prev, groupList: prev.groupList.filter((_, i) => i !== idx) }));
  };

  const handleGroupChange = (idx, val) => {
    setFormData(prev => {
      const updated = [...prev.groupList];
      updated[idx] = val;
      return { ...prev, groupList: updated };
    });
  };

  const handleAddPointRow = () => {
    setFormData(prev => ({
      ...prev,
      pointsList: [...prev.pointsList, { label: `Rank ${prev.pointsList.length + 1}`, points: '' }]
    }));
  };

  const handleRemovePointRow = (idx) => {
    setFormData(prev => ({ ...prev, pointsList: prev.pointsList.filter((_, i) => i !== idx) }));
  };

  const handlePointChange = (idx, field, val) => {
    setFormData(prev => {
      const updated = [...prev.pointsList];
      updated[idx] = { ...updated[idx], [field]: field === 'points' ? (val === '' ? '' : Number(val)) : val };
      return { ...prev, pointsList: updated };
    });
  };

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

  const handleAddPenaltyRow = () => {
    setFormData(prev => ({
      ...prev,
      penaltyList: [...prev.penaltyList, { label: '', type: 'TIME', value: 2, perPlayer: true }]
    }));
  };

  const handleRemovePenaltyRow = (idx) => {
    setFormData(prev => ({ ...prev, penaltyList: prev.penaltyList.filter((_, i) => i !== idx) }));
  };

  const handlePenaltyChange = (idx, field, val) => {
    setFormData(prev => {
      const updated = [...prev.penaltyList];
      updated[idx] = { ...updated[idx], [field]: field === 'value' ? (val === '' ? '' : Number(val)) : val };
      return { ...prev, penaltyList: updated };
    });
  };

  // 💾 फेरी सेव्ह करणे (देवनागरी संदेशांसह)
  const handleSaveRound = async (e) => {
    e.preventDefault();
    if (!formData.roundName.trim()) {
      Swal.fire({ 
        icon: 'warning', 
        title: 'कृपया फेरीचे नाव टाका!', 
        background: '#0c0d14', 
        color: '#fff' 
      });
      return;
    }

    try {
      const roundId = editingRound ? editingRound.id : `ROUND_${formData.roundNumber}_${Date.now()}`;
      const roundRef = doc(db, 'dahi_handi_tournaments', tournamentId, 'rounds', roundId);

      const cleanPointsList = (formData.pointsList || []).filter(p => p.label.trim() !== '');
      const cleanFormationList = (formData.formationList || []).filter(f => f.name.trim() !== '');
      const cleanPenaltyList = (formData.penaltyList || []).filter(p => p.label.trim() !== '');
      const cleanGroupList = formData.hasGroups ? (formData.groupList || []).filter(g => g.trim() !== '') : [];

      await setDoc(roundRef, {
        ...formData,
        roundNumber: Number(formData.roundNumber) || 1,
        qualifiedTeamsCount: Number(formData.qualifiedTeamsCount) || 16,
        tierHeight: formData.tierHeight ? Number(formData.tierHeight) : null,
        squadLimit: formData.squadLimit ? Number(formData.squadLimit) : null,
        intentPoints: formData.intentPoints !== '' ? Number(formData.intentPoints) : 0,
        pointsList: formData.type === 'KNOCKOUT' ? [] : cleanPointsList,
        formationList: cleanFormationList,
        penaltyList: cleanPenaltyList,
        groupList: cleanGroupList,
        updatedAt: serverTimestamp()
      }, { merge: true });

      Swal.fire({
        icon: 'success',
        title: editingRound ? 'फेरी अद्ययावत झाली!' : 'नवीन फेरी यशस्वीरीत्या जोडली गेली!',
        timer: 1500,
        showConfirmButton: false,
        background: '#0c0d14',
        color: '#fff'
      });

      setIsModalOpen(false);
      setEditingRound(null);
      fetchRounds();
    } catch (err) {
      console.error("Save round error:", err);
      Swal.fire({ 
        icon: 'error', 
        title: 'त्रुटी!', 
        text: 'फेरी सेव्ह करताना अडचण आली.', 
        background: '#0c0d14', 
        color: '#fff' 
      });
    }
  };

  // 🗑️ फेरी डिलीट करणे (देवनागरी संदेशांसह)
  const handleDeleteRound = async (id, name) => {
    const res = await Swal.fire({
      title: 'फेरी हटवायची आहे का?',
      text: `"${name}" मधील सर्व नियम आणि रचना हटवली जाईल.`,
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
        fetchRounds();
      } catch (e) {}
    }
  };

  return (
    <div className="space-y-5 text-white font-sans">
      
      {/* Header */}
      <div className="flex justify-between items-center bg-[#0c0d14] border border-amber-500/20 p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <Layers className="w-5 h-5 text-amber-400" />
          <div>
            <h3 className="text-sm font-black text-white">फेऱ्या & नियम सेट-अप (Rounds & Rules Setup)</h3>
            <p className="text-[10px] text-gray-400">फेरीचे फॉरमॅट, खेळणारे संघ, रचना व पेनल्टी नियम ठरवा.</p>
          </div>
        </div>

        <button
          onClick={() => {
            setEditingRound(null);
            setFormData({
              roundNumber: rounds.length + 1,
              roundName: `Round ${rounds.length + 1}`,
              type: 'LEAGUE',
              matchFormat: 'GROUP',
              qualifiedTeamsCount: 16,
              tierHeight: '',
              squadLimit: '',
              hasGroups: true,
              groupList: ['Group A', 'Group B', 'Group C', 'Group D'],
              pointsList: [
                { label: 'Rank 1 / Winner', points: 1000 },
                { label: 'Rank 2 / Loser', points: 700 },
                { label: 'Rank 3', points: 500 },
                { label: 'Rank 4', points: 300 }
              ],
              intentPoints: 300,
              formationList: [],
              penaltyList: [
                { label: 'Early Squat / Raising', type: 'TIME', value: 2, perPlayer: true },
                { label: 'Hand / Hands Raised', type: 'TIME', value: 2, perPlayer: true },
                { label: 'Out of Box', type: 'TIME', value: 2, perPlayer: true },
                { label: 'Carregat', type: 'POINTS', value: 50, perPlayer: false }
              ]
            });
            setIsModalOpen(true);
          }}
          className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>नवीन फेरी जोडा</span>
        </button>
      </div>

      {/* Rounds List Grid */}
      {loading ? (
        <div className="p-8 text-center text-gray-400 text-xs animate-pulse font-bold">फेऱ्या लोड होत आहेत...</div>
      ) : rounds.length === 0 ? (
        <div className="p-10 text-center bg-black/40 border border-dashed border-amber-500/20 rounded-2xl space-y-2">
          <Layers className="w-8 h-8 text-amber-400/50 mx-auto" />
          <p className="text-xs text-gray-400 font-bold">अद्याप कोणतीही फेरी तयार केलेली नाही.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rounds.map((r) => (
            <div 
              key={r.id}
              className="bg-[#0c0d14] border border-amber-500/20 hover:border-amber-500/50 rounded-2xl p-4.5 space-y-3 shadow-lg transition flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-md border ${
                    r.type === 'KNOCKOUT' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}>
                    फेरी #{r.roundNumber} • {r.type}
                  </span>
                  
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingRound(r);
                        setFormData({
                          ...r,
                          qualifiedTeamsCount: r.qualifiedTeamsCount || 16,
                          hasGroups: r.hasGroups ?? (r.groupList?.length > 0),
                          groupList: r.groupList?.length ? r.groupList : ['Group A', 'Group B'],
                          pointsList: r.pointsList?.length ? r.pointsList : [{ label: '', points: '' }],
                          formationList: r.formationList || [],
                          penaltyList: r.penaltyList?.length ? r.penaltyList : [{ label: '', type: 'TIME', value: 2, perPlayer: true }]
                        });
                        setIsModalOpen(true);
                      }}
                      className="p-1 text-gray-400 hover:text-amber-400 transition"
                      title="एडिट"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteRound(r.id, r.roundName)}
                      className="p-1 text-gray-400 hover:text-rose-400 transition"
                      title="डिलीट"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h4 className="text-sm font-black text-white">{r.roundName}</h4>
                
                <div className="space-y-1 mt-2 text-xs text-gray-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-amber-400" />
                      <span>फॉरमॅट: <b className="text-amber-300">{r.matchFormat}</b></span>
                    </div>
                    <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded font-mono font-bold text-emerald-400">
                      {r.qualifiedTeamsCount || 16} संघ {r.matchFormat === 'DUEL' ? `(${Math.ceil((r.qualifiedTeamsCount || 16) / 2)} सामने)` : ''}
                    </span>
                  </div>
                  
                  {r.groupList?.length > 0 && r.type !== 'KNOCKOUT' && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <Network className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span className="text-[10px] text-gray-400">ग्रुप्स:</span>
                      {r.groupList.map((g, gIdx) => (
                        <span key={gIdx} className="text-[9px] bg-blue-500/10 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/20 font-bold">
                          {g}
                        </span>
                      ))}
                    </div>
                  )}

                  {r.matchFormat === 'FORMATION_DIFFICULTY' && (
                    <div className="pt-1 text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                      <Trophy className="w-3.5 h-3.5" />
                      <span>{r.formationList?.length || 0} रचना उपलब्ध</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Points Preview */}
              {r.type === 'KNOCKOUT' ? (
                <div className="pt-2 border-t border-white/10 text-[10px] text-orange-400 font-bold flex items-center gap-1">
                  <Swords className="w-3 h-3" /> Knockout (गुण नसतील - थेट विजेता/पराभूत)
                </div>
              ) : r.matchFormat !== 'FORMATION_DIFFICULTY' && r.pointsList?.length > 0 ? (
                <div className="pt-2 border-t border-white/10 flex flex-wrap gap-1.5 text-[10px]">
                  {r.pointsList.map((pt, ptIdx) => (
                    <span key={ptIdx} className="text-gray-300 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                      {pt.label}: <b className="text-emerald-400">{pt.points} pts</b>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#0c0d14] border border-amber-500/30 rounded-3xl w-full max-w-2xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-amber-400" />
                {editingRound ? 'फेरी व नियम एडिट करा' : 'नवीन फेरी व नियम सेट करा'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white text-xs bg-white/5 px-2.5 py-1 rounded-xl cursor-pointer"
              >
                ✕ बंद करा
              </button>
            </div>

            <form onSubmit={handleSaveRound} className="space-y-4 text-xs">
              
              {/* १. फेरी मूलभूत माहिती */}
              <div className="bg-black/40 p-3.5 rounded-2xl border border-white/5 space-y-3">
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">फेरी क्र. *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={formData.roundNumber}
                      onChange={(e) => setFormData({ ...formData, roundNumber: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-xl text-amber-300 font-bold focus:outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-gray-300 font-semibold mb-1">फेरीचे नाव *</label>
                    <input
                      type="text"
                      required
                      placeholder="उदा. Round 8 Semi-Finals / Round 6 Concur"
                      value={formData.roundName}
                      onChange={(e) => setFormData({ ...formData, roundName: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-xl text-white font-bold focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">प्रकार</label>
                    <select
                      value={formData.type}
                      onChange={(e) => {
                        const newType = e.target.value;
                        setFormData({ 
                          ...formData, 
                          type: newType,
                          hasGroups: newType === 'LEAGUE' ? formData.hasGroups : false
                        });
                      }}
                      className="w-full bg-slate-900 border border-slate-700 px-2 py-1.5 rounded-xl text-white focus:outline-none font-bold"
                    >
                      <option value="LEAGUE">League</option>
                      <option value="KNOCKOUT">Knockout</option>
                      <option value="CONCUR">Concur / Finals</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-amber-300 font-semibold mb-1">मॅच फॉरमॅट *</label>
                    <select
                      value={formData.matchFormat}
                      onChange={(e) => {
                        const newFormat = e.target.value;
                        setFormData({ 
                          ...formData, 
                          matchFormat: newFormat,
                          hasGroups: newFormat === 'GROUP'
                        });
                      }}
                      className="w-full bg-slate-900 border border-amber-500/40 px-2 py-1.5 rounded-xl text-amber-300 focus:outline-none font-bold"
                    >
                      <option value="GROUP">Group (4 Teams)</option>
                      <option value="DUEL">Duel (2 Teams)</option>
                      <option value="SINGLE">Single (1 Team)</option>
                      <option value="FORMATION_DIFFICULTY">🏆 Formation & Difficulty</option>
                    </select>
                  </div>

                  {/* 🎯 खेळणारे संघ इनपुट */}
                  <div>
                    <label className="block text-emerald-400 font-semibold mb-1">
                      खेळणारे संघ (Team Count) *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={64}
                      placeholder="उदा. 16, 8, 5, 4, 2"
                      value={formData.qualifiedTeamsCount}
                      onChange={(e) => setFormData({ ...formData, qualifiedTeamsCount: e.target.value })}
                      className="w-full bg-slate-900 border border-emerald-500/50 px-3 py-1.5 rounded-xl text-emerald-400 font-mono font-bold text-xs focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">थर (Tiers)</label>
                    <input
                      type="number"
                      placeholder="उदा. 7"
                      value={formData.tierHeight}
                      onChange={(e) => setFormData({ ...formData, tierHeight: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 px-2 py-1.5 rounded-xl text-amber-300 font-bold focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* २. ग्रुप्स व्यवस्थापन */}
              {formData.type === 'LEAGUE' && formData.matchFormat !== 'FORMATION_DIFFICULTY' && (
                <div className="bg-black/40 p-3.5 rounded-2xl border border-blue-500/20 space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Network className="w-4 h-4 text-blue-400" />
                      <h4 className="font-bold text-blue-300 text-xs">या फेरीत ग्रुप्स (Groups) आहेत का?</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, hasGroups: !prev.hasGroups }))}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[10px] border transition cursor-pointer ${
                        formData.hasGroups ? 'bg-blue-500 text-black border-blue-400' : 'bg-slate-900 text-gray-400 border-slate-700'
                      }`}
                    >
                      {formData.hasGroups ? '✅ होय, ग्रुप्स आहेत' : '❌ ग्रुप्स नाहीत'}
                    </button>
                  </div>

                  {formData.hasGroups && (
                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-gray-400">ग्रुपची नावे:</span>
                        <button
                          type="button"
                          onClick={handleAddGroup}
                          className="text-[10px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <PlusCircle className="w-3 h-3" /> + ग्रुप जोडा
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {formData.groupList.map((grp, idx) => (
                          <div key={idx} className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-700">
                            <input
                              type="text"
                              value={grp}
                              onChange={(e) => handleGroupChange(idx, e.target.value)}
                              className="w-full bg-transparent px-1.5 py-0.5 text-blue-300 font-bold text-xs focus:outline-none"
                            />
                            {formData.groupList.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveGroup(idx)}
                                className="text-gray-500 hover:text-rose-400 p-0.5 transition"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ३. पॉईंट्स सिस्टीम किंवा रचना बिल्डर */}
              {formData.type === 'KNOCKOUT' ? (
                <div className="bg-orange-500/10 border border-orange-500/30 p-4 rounded-2xl flex items-center gap-3">
                  <span className="text-xl">⚔️</span>
                  <div>
                    <h4 className="text-xs font-black text-orange-400">Knockout नॉकआउट फेरी ({formData.qualifiedTeamsCount || 8} संघ)</h4>
                    <p className="text-[11px] text-gray-300">
                      या फेरीत फक्त <b>{Math.ceil(Number(formData.qualifiedTeamsCount || 8) / 2)} सामने</b> होतील आणि विजयी संघ थेट पुढील फेरीत पात्र होईल.
                    </p>
                  </div>
                </div>
              ) : formData.matchFormat === 'FORMATION_DIFFICULTY' ? (
                <div className="bg-black/40 p-3.5 rounded-2xl border border-amber-500/30 space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-black text-amber-400 text-xs flex items-center gap-1.5">
                        <Trophy className="w-4 h-4" /> रचना व काठिण्य पातळी व्यवस्थापन
                      </h4>
                      <span className="text-[10px] text-gray-400">रचना व गुण जोडा:</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddFormationRow}
                      className="px-3 py-1 bg-amber-500/20 text-amber-300 font-bold text-[11px] rounded-xl border border-amber-500/30 hover:bg-amber-500 hover:text-black transition cursor-pointer flex items-center gap-1"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> + रचना जोडा
                    </button>
                  </div>

                  <div className="grid grid-cols-12 gap-2 text-[10px] text-gray-400 font-bold px-2 py-1 bg-slate-900/60 rounded-lg">
                    <span className="col-span-4">रचनेचे नाव</span>
                    <span className="col-span-3 text-center">रचना (Structure)</span>
                    <span className="col-span-2 text-center text-emerald-400">Descarregat</span>
                    <span className="col-span-2 text-center text-amber-400">Carregat</span>
                    <span className="col-span-1 text-center">कृती</span>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {(formData.formationList || []).map((fmt, idx) => (
                      <div key={idx} className="bg-slate-900/90 p-2 rounded-xl border border-slate-800 grid grid-cols-12 gap-2 items-center text-xs">
                        <div className="col-span-4">
                          <input
                            type="text"
                            required
                            placeholder="Classic-14"
                            value={fmt.name}
                            onChange={(e) => handleFormationChange(idx, 'name', e.target.value)}
                            className="w-full bg-black/60 border border-slate-700 px-2.5 py-1.5 rounded-lg text-white font-bold text-xs focus:border-amber-400 focus:outline-none"
                          />
                        </div>

                        <div className="col-span-3">
                          <input
                            type="text"
                            placeholder="5+3+2+1+1+1+1"
                            value={fmt.structure}
                            onChange={(e) => handleFormationChange(idx, 'structure', e.target.value)}
                            className="w-full bg-black/60 border border-slate-700 px-2 py-1.5 rounded-lg text-amber-300 font-mono text-[11px] text-center focus:border-amber-400 focus:outline-none"
                          />
                        </div>

                        <div className="col-span-2">
                          <input
                            type="number"
                            required
                            placeholder="4000"
                            value={fmt.descarregat}
                            onChange={(e) => handleFormationChange(idx, 'descarregat', e.target.value)}
                            className="w-full bg-black/60 border border-slate-700 px-1.5 py-1.5 rounded-lg text-emerald-400 font-mono font-bold text-center text-xs focus:border-emerald-400 focus:outline-none"
                          />
                        </div>

                        <div className="col-span-2">
                          <input
                            type="number"
                            required
                            placeholder="3320"
                            value={fmt.carregat}
                            onChange={(e) => handleFormationChange(idx, 'carregat', e.target.value)}
                            className="w-full bg-black/60 border border-slate-700 px-1.5 py-1.5 rounded-lg text-amber-400 font-mono font-bold text-center text-xs focus:border-amber-400 focus:outline-none"
                          />
                        </div>

                        <div className="col-span-1 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveFormationRow(idx)}
                            className="p-1 text-gray-500 hover:text-rose-400 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 mx-auto" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-black/40 p-3.5 rounded-2xl border border-amber-500/20 space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-amber-400 text-xs flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5" /> रँक व गुण व्यवस्थापन
                    </h4>
                    <button
                      type="button"
                      onClick={handleAddPointRow}
                      className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500 text-amber-400 hover:text-black font-bold rounded-lg border border-amber-500/30 flex items-center gap-1 transition cursor-pointer text-[11px]"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> + रँक जोडा
                    </button>
                  </div>

                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {formData.pointsList.map((pt, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
                        <input
                          type="text"
                          placeholder="रँक नाव"
                          value={pt.label}
                          onChange={(e) => handlePointChange(idx, 'label', e.target.value)}
                          className="flex-1 bg-black/60 border border-slate-700 px-2.5 py-1 rounded-lg text-white font-medium focus:outline-none"
                        />
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            placeholder="गुण"
                            value={pt.points}
                            onChange={(e) => handlePointChange(idx, 'points', e.target.value)}
                            className="w-24 bg-black/60 border border-slate-700 px-2.5 py-1 rounded-lg text-emerald-400 font-bold font-mono focus:outline-none"
                          />
                          <span className="text-[10px] text-gray-400 font-bold">pts</span>
                        </div>
                        {formData.pointsList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemovePointRow(idx)}
                            className="p-1 text-gray-500 hover:text-rose-400 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ४. पेनल्टी व्यवस्थापन */}
              <div className="bg-black/40 p-3.5 rounded-2xl border border-rose-500/20 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-rose-400 text-xs flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> पेनल्टी व्यवस्थापन
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddPenaltyRow}
                    className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white font-bold rounded-lg border border-rose-500/30 flex items-center gap-1 transition cursor-pointer text-[11px]"
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> + नवीन पेनल्टी जोडा
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
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
                        className="bg-black/60 border border-slate-700 px-2 py-1.5 rounded-lg text-xs font-bold text-amber-400 focus:outline-none"
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
                        <span className="text-[10px] text-gray-400 font-bold w-7">
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

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                {editingRound ? '✅ बदल सेव्ह करा' : '✅ फेरी सेव्ह करा'}
              </button>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}