// ==========================================
// #SECTION: MASTER TEAM POOL (TABLE & ROW-BASED SERIAL LAYOUT)
// ==========================================
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { 
  collection, doc, setDoc, deleteDoc, 
  serverTimestamp, getDocs 
} from 'firebase/firestore';
import Swal from 'sweetalert2';
import { 
  Users, Plus, Trash2, Edit3, MapPin, 
  Search, Award, Phone, UserCheck, RefreshCw 
} from 'lucide-react';

export default function ScoringTeamSetup({ tournamentId }) {
  const [teams, setTeams] = useState([]);
  const [allTournamentScores, setAllTournamentScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);

  const [formData, setFormData] = useState({
    teamName: '',
    city: '',
    coachName: '',
    contactNumber: '',
    chestNumber: ''
  });

  // 1️⃣ संघ आणि स्कोअर फेच करणे (onSnapshot ऐवजी getDocs - Zero Background Reads)
  const fetchTeamsAndScores = async (isManual = false) => {
    if (!tournamentId) return;
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      // संघ (Teams)
      const tSnap = await getDocs(collection(db, 'dahi_handi_tournaments', tournamentId, 'teams'));
      const tList = tSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      tList.sort((a, b) => (Number(a.chestNumber) || 0) - (Number(b.chestNumber) || 0));
      setTeams(tList);

      // स्कोअर (Scores)
      const sSnap = await getDocs(collection(db, 'dahi_handi_tournaments', tournamentId, 'scores'));
      const sList = sSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllTournamentScores(sList);

    } catch (err) {
      console.error("Error fetching teams data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTeamsAndScores();
  }, [tournamentId]);

  // 💾 संघ सेव्ह करणे (स्थानिक स्टेट थेट अपडेट - Zero Re-fetch Reads)
  const handleSaveTeam = async (e) => {
    e.preventDefault();
    if (!formData.teamName.trim()) {
      Swal.fire({ icon: 'warning', title: 'संघाचे नाव टाका!', background: '#0c0d14', color: '#fff' });
      return;
    }

    try {
      const teamId = editingTeam ? editingTeam.id : `TEAM_${Date.now()}`;
      const teamRef = doc(db, 'dahi_handi_tournaments', tournamentId, 'teams', teamId);
      const calculatedChestNo = formData.chestNumber ? Number(formData.chestNumber) : teams.length + 1;

      const teamPayload = {
        ...formData,
        chestNumber: calculatedChestNo,
        updatedAt: serverTimestamp()
      };

      await setDoc(teamRef, teamPayload, { merge: true });

      // 🎯 पुन्हा getDocs न मागवता स्थानिक स्टेट अपडेट करणे
      setTeams(prev => {
        let updated;
        if (editingTeam) {
          updated = prev.map(t => t.id === teamId ? { ...t, ...teamPayload, id: teamId } : t);
        } else {
          updated = [...prev, { ...teamPayload, id: teamId }];
        }
        return updated.sort((a, b) => (Number(a.chestNumber) || 0) - (Number(b.chestNumber) || 0));
      });

      Swal.fire({
        icon: 'success',
        title: editingTeam ? 'संघ माहिती अद्ययावत झाली!' : 'नवीन संघ जोडला गेला!',
        timer: 1500,
        showConfirmButton: false,
        background: '#0c0d14',
        color: '#fff'
      });

      setIsModalOpen(false);
      setEditingTeam(null);
      setFormData({ teamName: '', city: '', coachName: '', contactNumber: '', chestNumber: '' });
    } catch (err) {
      console.error("Team save error:", err);
      Swal.fire({ icon: 'error', title: 'त्रुटी!', text: 'संघ सेव्ह करताना अडचण आली.' });
    }
  };

  // 🗑️ संघ डिलीट करणे (स्थानिक स्टेट थेट अपडेट - Zero Re-fetch Reads)
  const handleDeleteTeam = async (id, name) => {
    const res = await Swal.fire({
      title: 'संघ हटवायचा आहे का?',
      text: `"${name}" या संघाची सर्व नोंदणी हटवली जाईल.`,
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
        
        // 🎯 स्थानिक स्टेटमधून थेट काढून टाकणे
        setTeams(prev => prev.filter(t => t.id !== id));

        Swal.fire({ icon: 'success', title: 'संघ हटवला!', timer: 1200, showConfirmButton: false, background: '#0c0d14', color: '#fff' });
      } catch (e) {
        console.error("Delete error:", e);
      }
    }
  };

  // 🎯 संघांची एकूण रँकिंग व आकडेवारी (In-Memory Processing)
  const teamsWithStats = teams.map(t => {
    const teamScores = allTournamentScores.filter(s => s.teamId === t.id);
    const totalPts = teamScores.reduce((sum, s) => sum + (Number(s.pointsAwarded) || 0), 0);
    const totalTimingMs = teamScores.reduce((sum, s) => sum + (Number(s.finalTimingMs) || 0), 0);
    const completedRounds = teamScores.length;

    return {
      ...t,
      totalPts,
      totalTimingMs,
      completedRounds
    };
  });

  const filteredTeams = teamsWithStats.filter(t => 
    t.teamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.city && t.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
    String(t.chestNumber).includes(searchQuery)
  );

  return (
    <div className="space-y-4 text-white font-sans w-full">
      
      {/* 🔝 हेडर व सर्च बार */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-[#0c0d14] border border-amber-500/20 p-3.5 sm:p-4 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
              🚩 नोंदणीकृत संघ यादी (एकूण संघ: {teams.length})
            </h2>
            <p className="text-[10px] text-gray-400">
              स्पर्धेसाठी दाखल झालेले सर्व गोविंदा पथक, चेस्ट नंबर व चालू गुण
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* सर्च बार */}
          <div className="relative flex-1 sm:w-52">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-amber-400/60" />
            <input
              type="text"
              placeholder="नाव, शहर किंवा चेस्ट नंबरने शोधा..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/60 border border-white/10 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400/50"
            />
          </div>

          {/* 🔄 मॅन्युअल रिफ्रेश बटण */}
          <button
            type="button"
            onClick={() => fetchTeamsAndScores(true)}
            disabled={refreshing}
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-xl transition cursor-pointer shrink-0"
            title="रिफ्रेश करा"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          <button
            onClick={() => {
              setEditingTeam(null);
              setFormData({
                teamName: '',
                city: '',
                coachName: '',
                contactNumber: '',
                chestNumber: teams.length + 1
              });
              setIsModalOpen(true);
            }}
            className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> + संघ जोडा
          </button>
        </div>
      </div>

      {/* 📋 टेबल / रो लेआउट */}
      {loading ? (
        <div className="p-8 text-center text-gray-400 text-xs animate-pulse font-bold">संघ लोड होत आहेत...</div>
      ) : teams.length === 0 ? (
        <div className="p-8 text-center bg-black/40 border border-dashed border-amber-500/20 rounded-2xl space-y-2">
          <Users className="w-8 h-8 text-amber-400/50 mx-auto" />
          <p className="text-xs text-gray-400 font-bold">या स्पर्धेत अद्याप कोणताही संघ जोडलेला नाही.</p>
          <p className="text-[11px] text-gray-500">वर दिलेल्या "+ संघ जोडा" बटणावर क्लिक करून संघ नोंदणी करा.</p>
        </div>
      ) : (
        <div className="bg-[#0c0d14] border border-white/10 rounded-2xl shadow-xl overflow-hidden">
          
          {/* 💻 Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-black/60 border-b border-white/10 text-[11px] text-amber-400 uppercase font-mono font-bold">
                  <th className="p-3 text-center w-20">अ.क्र.</th>
                  <th className="p-3">गोविंदा पथकाचे नाव</th>
                  <th className="p-3">शहर / जिल्हा</th>
                  <th className="p-3">कॅप्टन / संपर्क</th>
                  <th className="p-3 text-center">फेऱ्या</th>
                  <th className="p-3 text-right font-black text-emerald-400">एकूण गुण</th>
                  <th className="p-3 text-center w-24">कृती</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {filteredTeams.map((team, idx) => (
                  <tr key={team.id} className="hover:bg-white/5 transition">
                    <td className="p-3 text-center">
                      <span className="w-7 h-7 inline-flex items-center justify-center bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono font-bold text-xs rounded-lg">
                        #{idx + 1}
                      </span>
                    </td>
                    <td className="p-3 font-extrabold text-white text-sm">
                      {team.teamName}
                    </td>
                    <td className="p-3 text-gray-300">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-amber-400" /> {team.city || 'महाराष्ट्र'}
                      </span>
                    </td>
                    <td className="p-3 text-gray-400">
                      {team.coachName || team.contactNumber ? (
                        <div>
                          <span className="text-white block font-medium">{team.coachName || '-'}</span>
                          {team.contactNumber && <span className="font-mono text-[10px] text-gray-400">📞 {team.contactNumber}</span>}
                        </div>
                      ) : (
                        <span className="text-gray-600">-</span>
                      )}
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-gray-300">
                      {team.completedRounds}
                    </td>
                    <td className="p-3 text-right font-mono font-black text-sm text-emerald-400">
                      {team.totalPts} pts
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setEditingTeam(team);
                            setFormData({
                              teamName: team.teamName || '',
                              city: team.city || '',
                              coachName: team.coachName || '',
                              contactNumber: team.contactNumber || '',
                              chestNumber: team.chestNumber || idx + 1
                            });
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 bg-white/5 hover:bg-amber-500/20 text-gray-400 hover:text-amber-400 rounded-lg transition"
                          title="एडिट"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteTeam(team.id, team.teamName)}
                          className="p-1.5 bg-white/5 hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 rounded-lg transition"
                          title="डिलीट"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 📱 Mobile List View */}
          <div className="md:hidden divide-y divide-white/5">
            {filteredTeams.map((team, idx) => (
              <div key={team.id} className="p-3 flex items-center justify-between gap-2.5 hover:bg-white/5 transition">
                <div className="flex items-center gap-2 shrink-0">
                  <span className="w-6 text-center font-mono font-black text-xs text-gray-400">
                    {idx + 1}.
                  </span>
                  <span className="px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono font-bold text-[10px] rounded">
                    #{team.chestNumber || idx + 1}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-extrabold text-xs text-white truncate leading-tight">
                    {team.teamName}
                  </h4>
                  <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-2.5 h-2.5 text-amber-400" /> {team.city || 'महाराष्ट्र'}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <span className="font-mono font-black text-xs text-emerald-400 block">
                      {team.totalPts} pts
                    </span>
                    <span className="text-[9px] text-gray-500 font-mono">
                      {team.completedRounds} फेऱ्या
                    </span>
                  </div>

                  <div className="flex items-center gap-1 border-l border-white/10 pl-1.5">
                    <button
                      onClick={() => {
                        setEditingTeam(team);
                        setFormData({
                          teamName: team.teamName || '',
                          city: team.city || '',
                          coachName: team.coachName || '',
                          contactNumber: team.contactNumber || '',
                          chestNumber: team.chestNumber || idx + 1
                        });
                        setIsModalOpen(true);
                      }}
                      className="p-1 text-gray-400 hover:text-amber-400"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteTeam(team.id, team.teamName)}
                      className="p-1 text-gray-400 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* 📝 Add / Edit Team Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3">
          <div className="bg-[#0c0d14] border border-amber-500/30 rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-2.5">
              <h3 className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                {editingTeam ? 'संघ माहिती अद्ययावत करा' : 'नवीन संघ नोंदणी'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white text-xs bg-white/5 px-2 py-1 rounded-lg"
              >
                ✕ बंद करा
              </button>
            </div>

            <form onSubmit={handleSaveTeam} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-300 font-semibold mb-1">संघाचे नाव (Team Name) *</label>
                <input
                  type="text"
                  required
                  placeholder="उदा. जय बजरंग गोविंदा पथक"
                  value={formData.teamName}
                  onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 px-3 py-2 rounded-xl text-white font-bold focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">शहर / जिल्हा (City)</label>
                  <input
                    type="text"
                    placeholder="उदा. मुंबई / ठाणे"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 px-3 py-2 rounded-xl text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">चेस्ट नंबर (Chest No.)</label>
                  <input
                    type="number"
                    min={1}
                    placeholder="उदा. 1"
                    value={formData.chestNumber}
                    onChange={(e) => setFormData({ ...formData, chestNumber: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 px-3 py-2 rounded-xl text-amber-300 font-mono font-bold focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">प्रमुख / कॅप्टनचे नाव</label>
                  <input
                    type="text"
                    placeholder="उदा. सचिन शिंदे"
                    value={formData.coachName}
                    onChange={(e) => setFormData({ ...formData, coachName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 px-3 py-2 rounded-xl text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">संपर्क फोन नंबर</label>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={formData.contactNumber}
                    onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 px-3 py-2 rounded-xl text-white font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  रद्द करा
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black rounded-xl shadow-lg cursor-pointer"
                >
                  {editingTeam ? '✅ बदल सेव्ह करा' : '✅ संघ सेव्ह करा'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}