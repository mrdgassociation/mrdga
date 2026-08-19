// ==========================================
// #SECTION: TOURNAMENT MANAGER (MASTER ENGINE)
// ==========================================
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Trophy, Plus, MapPin, Calendar, Layers, ChevronRight, 
  Trash2, Edit3, ShieldAlert, Users, Settings2 
} from 'lucide-react';
import { db } from '../firebase/config';
import { 
  collection, addDoc, getDocs, serverTimestamp, 
  query, orderBy, doc, deleteDoc, updateDoc 
} from 'firebase/firestore';
import Swal from 'sweetalert2';

export default function TournamentManager() {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTournament, setEditingTournament] = useState(null);

  const [formData, setFormData] = useState({
    tournamentName: '',
    location: '',
    startDate: '',
    endDate: '',
    totalTeams: 16,
    formatType: 'LEAGUE_KNOCKOUT', // 'LEAGUE_KNOCKOUT' | 'KNOCKOUT' | 'TIME_TRIAL'
    penaltyMode: 'ROUND_WISE',     // 'COMMON' | 'ROUND_WISE'
    organizer: 'MRDGA'
  });

  // 🎯 तारखेवरून Auto-Status ठरवणे
  const calculateAutoStatus = (startDate, endDate) => {
    if (!startDate) return 'UPCOMING';
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = endDate ? new Date(endDate) : new Date(startDate);
    end.setHours(23, 59, 59, 999);

    if (today < start) return 'UPCOMING';
    if (today >= start && today <= end) return 'LIVE';
    return 'COMPLETED';
  };

  // 1️⃣ Firestore मधून सर्व स्पर्धा फेच करणे
  const fetchTournaments = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'dahi_handi_tournaments'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const list = snap.docs.map(doc => {
        const data = doc.data();
        const currentStatus = calculateAutoStatus(data.startDate, data.endDate);
        return { id: doc.id, ...data, status: currentStatus };
      });
      setTournaments(list);
    } catch (err) {
      console.error("Error fetching tournaments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, []);

  // 2️⃣ नवीन स्पर्धा तयार करणे किंवा अपडेट करणे
  const handleSaveTournament = async (e) => {
    e.preventDefault();

    if (!formData.tournamentName.trim()) {
      Swal.fire({ icon: 'warning', title: 'अपूर्ण माहिती!', text: 'कृपया स्पर्धेचे नाव टाका.' });
      return;
    }

    if (!formData.startDate) {
      Swal.fire({ icon: 'warning', title: 'तारीख आवश्यक!', text: 'कृपया सुरुवातीची तारीख निवडा.' });
      return;
    }

    const autoStatus = calculateAutoStatus(formData.startDate, formData.endDate);

    try {
      if (editingTournament) {
        // Update Existing
        await updateDoc(doc(db, 'dahi_handi_tournaments', editingTournament.id), {
          ...formData,
          status: autoStatus,
          updatedAt: serverTimestamp()
        });
        Swal.fire({ icon: 'success', title: 'स्पर्धा अपडेट झाली!', timer: 1500, showConfirmButton: false, background: '#0c0d14', color: '#fff' });
      } else {
        // Create New
        await addDoc(collection(db, 'dahi_handi_tournaments'), {
          ...formData,
          status: autoStatus,
          createdAt: serverTimestamp()
        });
        Swal.fire({ icon: 'success', title: 'स्पर्धा नोंदवली गेली!', timer: 1500, showConfirmButton: false, background: '#0c0d14', color: '#fff' });
      }

      setFormData({
        tournamentName: '',
        location: '',
        startDate: '',
        endDate: '',
        totalTeams: 16,
        formatType: 'LEAGUE_KNOCKOUT',
        penaltyMode: 'ROUND_WISE',
        organizer: 'MRDGA'
      });
      setEditingTournament(null);
      setIsCreateModalOpen(false);
      fetchTournaments();
    } catch (err) {
      console.error("Save tournament error:", err);
      Swal.fire({ icon: 'error', title: 'त्रुटी!', text: 'स्पर्धा सेव्ह करताना अडचण आली.' });
    }
  };

  // 🗑️ स्पर्धा हटवणे
  const handleDeleteTournament = async (id, name) => {
    const res = await Swal.fire({
      title: 'स्पर्धा डिलीट करायची आहे का?',
      text: `"${name}" आणि त्यामधील सर्व फेऱ्या व स्कोअर डेटा कायमचा हटवला जाईल.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'होय, डिलीट करा',
      cancelButtonText: 'रद्द करा',
      confirmButtonColor: '#ef4444',
      background: '#0c0d14',
      color: '#fff'
    });

    if (res.isConfirmed) {
      try {
        await deleteDoc(doc(db, 'dahi_handi_tournaments', id));
        Swal.fire({ icon: 'success', title: 'हटवले!', timer: 1200, showConfirmButton: false, background: '#0c0d14', color: '#fff' });
        fetchTournaments();
      } catch (err) {
        Swal.fire({ icon: 'error', title: 'त्रुटी!', text: 'स्पर्धा डिलीट करता आली नाही.' });
      }
    }
  };

  return (
    <div className="space-y-6 text-white font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0c0d14] p-5 rounded-2xl border border-amber-500/20 shadow-xl">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2.5">
            <Trophy className="w-6 h-6 text-amber-400" /> दहीहंडी स्पर्धा व्यवस्थापन
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            MRDGA आणि SUPER विभागासाठी मास्टर कंट्रोल व स्कोअरिंग मॅनेजर
          </p>
        </div>

        <button 
          onClick={() => {
            setEditingTournament(null);
            setFormData({
              tournamentName: '',
              location: '',
              startDate: '',
              endDate: '',
              totalTeams: 16,
              formatType: 'LEAGUE_KNOCKOUT',
              penaltyMode: 'ROUND_WISE',
              organizer: 'MRDGA'
            });
            setIsCreateModalOpen(true);
          }}
          className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-black text-xs rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-amber-500/20 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" /> नवीन स्पर्धा जोडा
        </button>
      </div>

      {/* Tournaments Grid */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold text-amber-400 uppercase tracking-wider px-1">
          🚩 नोंदणीकृत स्पर्धा ({tournaments.length})
        </h2>

        {loading ? (
          <div className="bg-[#0c0d14] border border-amber-500/10 rounded-2xl p-8 text-center text-gray-400 text-xs">
            स्पर्धा लोड होत आहेत...
          </div>
        ) : tournaments.length === 0 ? (
          <div className="bg-[#0c0d14] border border-amber-500/10 rounded-2xl p-8 text-center text-gray-400 text-xs">
            एकही स्पर्धा उपलब्ध नाही. "नवीन स्पर्धा जोडा" वर क्लिक करून पहिली स्पर्धा तयार करा.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tournaments.map((t) => (
              <div 
                key={t.id} 
                className="bg-[#0c0d14] border border-amber-500/20 rounded-2xl p-5 hover:border-amber-500/50 transition flex flex-col justify-between shadow-lg space-y-4"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                      t.status === 'LIVE' 
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 animate-pulse' 
                        : t.status === 'COMPLETED'
                        ? 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                        : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    }`}>
                      ● {t.status}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingTournament(t);
                          setFormData({
                            tournamentName: t.tournamentName || '',
                            location: t.location || '',
                            startDate: t.startDate || '',
                            endDate: t.endDate || '',
                            totalTeams: t.totalTeams || 16,
                            formatType: t.formatType || 'LEAGUE_KNOCKOUT',
                            penaltyMode: t.penaltyMode || 'ROUND_WISE',
                            organizer: t.organizer || 'MRDGA'
                          });
                          setIsCreateModalOpen(true);
                        }}
                        className="p-1 text-gray-400 hover:text-amber-400 rounded transition"
                        title="एडिट करा"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTournament(t.id, t.tournamentName)}
                        className="p-1 text-gray-400 hover:text-rose-400 rounded transition"
                        title="डिलीट करा"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-base font-black text-white leading-snug mb-2">{t.tournamentName}</h3>

                  <div className="space-y-1.5 text-xs text-gray-400">
                    {t.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{t.location}</span>
                      </div>
                    )}
                    {(t.startDate || t.endDate) && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{t.startDate} {t.endDate ? `ते ${t.endDate}` : ''}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-[11px] text-amber-300/80 pt-1">
                      <Users className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{t.totalTeams || 16} संघ • {t.formatType === 'LEAGUE_KNOCKOUT' ? 'लीग + बाद फेरी' : t.formatType === 'KNOCKOUT' ? 'थेट बाद फेरी' : 'टाईम ट्रायल'}</span>
                    </div>
                  </div>
                </div>

                {/* 🎯 स्कोअरिंग आणि फेऱ्या हबवर जाण्यासाठी मुख्य बटण */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[11px] text-gray-400 font-medium flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-amber-400" /> फेऱ्या & स्कोअरिंग
                  </span>
                  <button 
    type="button"
    onClick={() => {
      if (!t.id) {
        Swal.fire({ icon: 'error', title: 'त्रुटी!', text: 'स्पर्धेचा ID सापडला नाही.' });
        return;
      }
      navigate(`/admin/tournaments/${t.id}`);
    }}
    className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500 hover:to-orange-500 hover:text-black text-amber-400 font-extrabold text-xs rounded-xl border border-amber-500/30 flex items-center gap-1.5 transition cursor-pointer"
  >
    <span>मॅनेज करा</span>
    <ChevronRight className="w-3.5 h-3.5" />
  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 📝 Create / Edit Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c0d14] border border-amber-500/30 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                {editingTournament ? 'स्पर्धा तपशील एडिट करा' : 'नवीन स्पर्धा नोंदवा'}
              </h3>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-white text-xs bg-white/5 px-2.5 py-1 rounded-xl cursor-pointer"
              >
                ✕ बंद करा
              </button>
            </div>

            <form onSubmit={handleSaveTournament} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-gray-300 mb-1">स्पर्धेचे नाव (Tournament Name) *</label>
                <input 
                  type="text" 
                  required
                  placeholder="उदा. Pro Govinda Season 4 / ठाणे मनपा दहीहंडी 2026"
                  value={formData.tournamentName}
                  onChange={(e) => setFormData({ ...formData, tournamentName: e.target.value })}
                  className="w-full bg-black/40 border border-amber-500/20 px-3 py-2 rounded-xl text-white font-bold focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-300 mb-1">ठिकाण (Location)</label>
                  <input 
                    type="text" 
                    placeholder="उदा. NSCI Dome, Mumbai"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full bg-black/40 border border-amber-500/20 px-3 py-2 rounded-xl text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-300 mb-1">एकूण संघ (Total Teams)</label>
                  <select
                    value={formData.totalTeams}
                    onChange={(e) => setFormData({ ...formData, totalTeams: Number(e.target.value) })}
                    className="w-full bg-black/40 border border-amber-500/20 px-3 py-2 rounded-xl text-amber-300 font-bold focus:border-amber-400 focus:outline-none"
                  >
                    <option value={8}>८ संघ (8 Teams)</option>
                    <option value={12}>१२ संघ (12 Teams)</option>
                    <option value={16}>१६ संघ (16 Teams)</option>
                    <option value={24}>२४ संघ (24 Teams)</option>
                    <option value={32}>३२ संघ (32 Teams)</option>
                  </select>
                </div>
              </div>

              {/* Date Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-300 mb-1">सुरुवातीची तारीख *</label>
                  <input 
                    type="date" 
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full bg-black/40 border border-amber-500/20 px-3 py-2 rounded-xl text-white focus:border-amber-400 focus:outline-none [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-300 mb-1">शेवटची तारीख</label>
                  <input 
                    type="date" 
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full bg-black/40 border border-amber-500/20 px-3 py-2 rounded-xl text-white focus:border-amber-400 focus:outline-none [color-scheme:dark]"
                  />
                </div>
              </div>

              {/* Tournament Format & Penalty Mode Setup */}
              <div className="p-3 bg-black/60 rounded-2xl border border-white/5 space-y-2.5">
                <div>
                  <label className="block font-bold text-amber-400 mb-1">स्पर्धेचा प्राथमिक फॉरमॅट</label>
                  <select
                    value={formData.formatType}
                    onChange={(e) => setFormData({ ...formData, formatType: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-xl text-white font-semibold focus:outline-none"
                  >
                    <option value="LEAGUE_KNOCKOUT">गट सामने + बाद फेरी (League + Knockout)</option>
                    <option value="KNOCKOUT">थेट बाद फेरी (Pure Knockout Face-offs)</option>
                    <option value="TIME_TRIAL">वेळेवर आधारित (Individual Time Trial)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-amber-400 mb-1">पेनल्टी व्यवस्थापन पद्धत</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, penaltyMode: 'ROUND_WISE' })}
                      className={`p-2 rounded-xl border text-[11px] font-bold text-left transition cursor-pointer ${
                        formData.penaltyMode === 'ROUND_WISE' 
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300' 
                          : 'bg-slate-900 border-slate-800 text-gray-400'
                      }`}
                    >
                      🔄 फेरीनुसार पेनल्टी (Round-Wise Custom)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, penaltyMode: 'COMMON' })}
                      className={`p-2 rounded-xl border text-[11px] font-bold text-left transition cursor-pointer ${
                        formData.penaltyMode === 'COMMON' 
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300' 
                          : 'bg-slate-900 border-slate-800 text-gray-400'
                      }`}
                    >
                      ⚙️ समान पेनल्टी (Common for All)
                    </button>
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-black text-xs rounded-xl transition shadow-lg shadow-amber-500/20 cursor-pointer mt-2"
              >
                {editingTournament ? '✅ बदल सेव्ह करा' : '✅ स्पर्धा नोंदवा'}
              </button>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}