import React, { useState, useEffect } from 'react';
import { Trophy, Plus, MapPin, Calendar, Layers, ChevronRight } from 'lucide-react';
import { db } from '../firebase/config';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy } from 'firebase/firestore';
import Swal from 'sweetalert2'; // 🔔 SweetAlert2 Import केले आहे

export default function TournamentManager() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    tournamentName: '',
    location: '',
    startDate: '',
    endDate: '',
    organizer: 'MRDGA'
  });

  // 🎯 तारखेवरून Auto-Status ठरवणारे लॉजिक
  const calculateAutoStatus = (startDate, endDate) => {
    if (!startDate) return 'UPCOMING';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = endDate ? new Date(endDate) : new Date(startDate);
    end.setHours(23, 59, 59, 999);

    if (today < start) {
      return 'UPCOMING';
    } else if (today >= start && today <= end) {
      return 'LIVE';
    } else {
      return 'COMPLETED';
    }
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

  // 2️⃣ नवीन स्पर्धा सेव्ह करणे (SweetAlert2 सह)
  const handleCreateTournament = async (e) => {
    e.preventDefault();

    if (!formData.tournamentName) {
      Swal.fire({
        icon: 'warning',
        title: 'अपूर्ण माहिती!',
        text: 'कृपया स्पर्धेचे नाव टाका.',
        confirmButtonColor: '#f59e0b'
      });
      return;
    }

    if (!formData.startDate) {
      Swal.fire({
        icon: 'warning',
        title: 'तारीख आवश्यक!',
        text: 'कृपया सुरुवातीची तारीख निवडा किंवा टाईप करा.',
        confirmButtonColor: '#f59e0b'
      });
      return;
    }

    const autoStatus = calculateAutoStatus(formData.startDate, formData.endDate);

    try {
      await addDoc(collection(db, 'dahi_handi_tournaments'), {
        ...formData,
        status: autoStatus,
        createdAt: serverTimestamp()
      });
      
      // 🏆 SweetAlert2 Success Message
      Swal.fire({
        icon: 'success',
        title: 'स्पर्धा नोंदवली गेली!',
        text: 'नवीन दहीहंडी स्पर्धा यशस्वीरित्या तयार झाली आहे.',
        timer: 2000,
        showConfirmButton: false,
        background: '#0c0d14',
        color: '#ffffff'
      });

      setFormData({
        tournamentName: '',
        location: '',
        startDate: '',
        endDate: '',
        organizer: 'MRDGA'
      });
      setIsCreateModalOpen(false);
      fetchTournaments();
    } catch (err) {
      console.error("Error creating tournament:", err);
      Swal.fire({
        icon: 'error',
        title: 'त्रुटी!',
        text: 'स्पर्धा सेव्ह करताना काहीतरी अडचण आली.',
        confirmButtonColor: '#ef4444'
      });
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
            MRDGA आणि SUPER विभागासाठी मास्टर कंट्रोल
          </p>
        </div>

        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-black text-xs rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-amber-500/20 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" /> नवीन स्पर्धा जोडा
        </button>
      </div>

      {/* Tournaments List */}
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
                    <span className="text-[10px] text-gray-500 font-bold">{t.organizer || 'MRDGA'}</span>
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
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[11px] text-gray-400 font-medium flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-amber-400" /> फेऱ्या & मॅचेस
                  </span>
                  <button 
                    onClick={() => {
                      Swal.fire({
                        title: t.tournamentName,
                        text: 'पुढील टप्प्यात या स्पर्धेचे फेऱ्या (Rounds) आणि स्कोअरिंग उघडेल.',
                        icon: 'info',
                        confirmButtonColor: '#f59e0b',
                        background: '#0c0d14',
                        color: '#ffffff'
                      });
                    }}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-amber-400 font-bold text-xs rounded-lg border border-amber-500/20 flex items-center gap-1 transition cursor-pointer"
                  >
                    पहा (Manage) <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c0d14] border border-amber-500/30 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" /> नवीन स्पर्धा नोंदवा
              </h3>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-white text-xs bg-white/5 px-2.5 py-1 rounded-lg cursor-pointer"
              >
                ✕ बंद करा
              </button>
            </div>

            <form onSubmit={handleCreateTournament} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">स्पर्धेचे नाव (Tournament Name) *</label>
                <input 
                  type="text" 
                  required
                  placeholder="उदा. Pro Govinda Season 3 / ठाणे मनपा दहीहंडी 2026"
                  value={formData.tournamentName}
                  onChange={(e) => setFormData({ ...formData, tournamentName: e.target.value })}
                  className="w-full bg-black/40 border border-amber-500/20 px-3 py-2.5 rounded-xl text-xs text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">ठिकाण (Location)</label>
                <input 
                  type="text" 
                  placeholder="उदा. मुंबई / ठाणे"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full bg-black/40 border border-amber-500/20 px-3 py-2.5 rounded-xl text-xs text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              {/* 🎯 Date Inputs - कॅलेंडर + मॅन्युअल कीबोर्ड टाईप दोन्ही चालते */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">
                    शुरुआतीची तारीख * <span className="text-[10px] text-gray-500 font-normal">(कॅलेंडर किंवा टाईप)</span>
                  </label>
                  <input 
                    type="date" 
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full bg-black/40 border border-amber-500/20 px-3 py-2 rounded-xl text-xs text-white focus:border-amber-400 focus:outline-none [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">
                    शेवटची तारीख <span className="text-[10px] text-gray-500 font-normal">(कॅलेंडर किंवा टाईप)</span>
                  </label>
                  <input 
                    type="date" 
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full bg-black/40 border border-amber-500/20 px-3 py-2 rounded-xl text-xs text-white focus:border-amber-400 focus:outline-none [color-scheme:dark]"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-black font-black text-xs rounded-xl hover:brightness-110 transition shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                ✅ स्पर्धा सेव्ह करा
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}