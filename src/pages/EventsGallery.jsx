// ==========================================
// #SECTION: EVENTS GALLERY (LARGE SHOWCASE + BIGGER ALBUM CARDS)
// ==========================================
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs, doc, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { authService } from '../services/authService';
import Swal from 'sweetalert2';
import { 
  Calendar, MapPin, Image as ImageIcon, Plus, Edit3, Trash2, 
  ChevronLeft, ChevronRight, X, Loader2, Maximize2, Sparkles, Play, Pause
} from 'lucide-react';
import Navbar from '../components/Navbar';
import EventModal from '../components/EventModal';

export default function EventsGallery() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 🔒 Super Admin Access
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // 🎯 निवडलेला इव्हेंट व ऑटो-स्लाइडर स्टेट्स
  const [selectedEventIndex, setSelectedEventIndex] = useState(0);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);

  // 🎯 Modal & Lightbox
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [lightbox, setLightbox] = useState({ isOpen: false, photos: [], currentIndex: 0, title: '' });

  const autoPlayRef = useRef(null);

  // 📂 Firestore मधून सर्व इव्हेंट्स लोड करणे
  const loadEvents = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "events_gallery"), orderBy("eventDate", "desc"));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setEvents(list);
      setSelectedEventIndex(0);
      setCurrentSlideIndex(0);
    } catch (err) {
      console.error("Error loading gallery events:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = authService.getCurrentUser(async (user) => {
      if (user) {
        try {
          const uDoc = await authService.getUserRole(user.email);
          if (uDoc && (uDoc.department === 'SUPER' || uDoc.role === 'Super Admin')) {
            setIsSuperAdmin(true);
          }
        } catch (e) {}
      }
      loadEvents();
    });
    return () => unsubscribe();
  }, []);

  // ⏱️ ऑटो-स्लाइडर (Auto-play every 4 seconds)
  const activeEvent = events[selectedEventIndex] || null;
  const activePhotos = activeEvent?.photos || [];

  useEffect(() => {
    if (!isAutoPlay || activePhotos.length <= 1) return;

    autoPlayRef.current = setInterval(() => {
      setCurrentSlideIndex(prev => (prev + 1) % activePhotos.length);
    }, 4000);

    return () => clearInterval(autoPlayRef.current);
  }, [isAutoPlay, activePhotos.length, selectedEventIndex]);

  // इव्हेंट निवडणे
  const handleSelectEvent = (index) => {
    setSelectedEventIndex(index);
    setCurrentSlideIndex(0);
  };

  // 💾 इव्हेंट सेव्ह करणे
  const handleSaveEvent = async (formData) => {
    setSaving(true);
    try {
      const docId = editingEvent ? editingEvent.id : `EVT-${Date.now()}`;
      const docRef = doc(db, "events_gallery", docId);

      await setDoc(docRef, {
        ...formData,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      Swal.fire({
        icon: 'success',
        title: editingEvent ? 'इव्हेंट अपडेट झाला!' : 'नवीन इव्हेंट पब्लिश झाला!',
        timer: 1500,
        showConfirmButton: false,
        background: '#0f172a',
        color: '#fff'
      });

      setIsModalOpen(false);
      setEditingEvent(null);
      loadEvents();
    } catch (err) {
      console.error("Save Event Error:", err);
      Swal.fire({ icon: 'error', title: 'त्रुटी!', text: 'इव्हेंट सेव्ह झाला नाही.' });
    } finally {
      setSaving(false);
    }
  };

  // 🗑️ इव्हेंट डिलीट करणे
  const handleDeleteEvent = async (id, title) => {
    const res = await Swal.fire({
      title: 'इव्हेंट डिलीट करायचा आहे का?',
      text: `"${title}" कायमचा हटवला जाईल.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'होय, डिलीट करा',
      cancelButtonText: 'रद्द करा',
      confirmButtonColor: '#e11d48',
      background: '#0f172a',
      color: '#fff'
    });

    if (res.isConfirmed) {
      try {
        await deleteDoc(doc(db, "events_gallery", id));
        Swal.fire({ icon: 'success', title: 'इव्हेंट हटवला!', timer: 1200, showConfirmButton: false, background: '#0f172a', color: '#fff' });
        loadEvents();
      } catch (e) {
        Swal.fire({ icon: 'error', title: 'त्रुटी!', text: 'इव्हेंट डिलीट करता आला नाही.' });
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#08090d] text-slate-100 font-sans pb-16">
      
      {/* 🔹 मुख्य नेव्हिगेशन बार */}
      <Navbar />

      {/* 🔹 स्लिम हेडर बार */}
      <div className="border-b border-slate-800/80 bg-slate-950/80 px-3 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="p-1 bg-amber-400/10 text-amber-400 rounded-md border border-amber-400/20">
              <Sparkles className="w-3.5 h-3.5" />
            </span>
            <h1 className="text-xs sm:text-sm font-bold text-white tracking-wide">
              MRDGA <span className="text-amber-400">इव्हेंट्स & गॅलरी शोकेस</span>
            </h1>
          </div>

          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => { setEditingEvent(null); setIsModalOpen(true); }}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>नवीन इव्हेंट जोडा</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-slate-400 text-xs animate-pulse space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-400" />
          <p>गॅलरी शोकेस लोड होत आहे...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="max-w-md mx-auto my-12 p-8 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl space-y-2">
          <ImageIcon className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-xs font-bold text-slate-400">अद्याप कोणताही इव्हेंट अपलोड केलेला नाही.</p>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 space-y-6">
          
          {/* ========================================================================= */}
          {/* 🌟 १. मोठा सिनेमॅटिक शोकेस (Large Spotlight with Autofit Contain Image)     */}
          {/* ========================================================================= */}
          {activeEvent && activePhotos.length > 0 && (
            <div className="relative rounded-3xl overflow-hidden border border-slate-800 bg-[#050608] h-[340px] sm:h-[460px] md:h-[520px] shadow-2xl group flex items-center justify-center">
              
              {/* 🎨 अस्पष्ट बॅकड्रॉप (Blurred Ambient Background) */}
              <div 
                className="absolute inset-0 bg-center bg-cover filter blur-2xl opacity-20 scale-110 pointer-events-none"
                style={{ backgroundImage: `url(${activePhotos[currentSlideIndex]})` }}
              />

              {/* 📸 मुख्य ऑटोफिट इमेज (Full Contain View) */}
              <img
                key={currentSlideIndex}
                src={activePhotos[currentSlideIndex]}
                alt={activeEvent.title}
                className="relative z-0 max-h-full max-w-full object-contain transition-all duration-700 ease-out"
              />

              {/* खालचा डार्क ओव्हरले */}
              <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none z-10" />

              {/* इव्हेंट माहिती आणि प्ले/पॉज कंट्रोल्स */}
              <div className="absolute bottom-0 inset-x-0 p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 z-20">
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] sm:text-xs font-mono font-bold bg-amber-500 text-black px-2 py-0.5 rounded-md shadow-sm">
                      {activeEvent.year || '2026'}
                    </span>
                    {activeEvent.location && (
                      <span className="text-[11px] text-slate-200 bg-black/70 backdrop-blur-md px-2.5 py-0.5 rounded-md border border-white/10 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-amber-400" /> {activeEvent.location}
                      </span>
                    )}
                    <span className="text-[11px] text-slate-300 bg-black/70 backdrop-blur-md px-2.5 py-0.5 rounded-md border border-white/10 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-amber-400" /> {new Date(activeEvent.eventDate).toLocaleDateString('mr-IN')}
                    </span>
                  </div>

                  <h2 className="text-base sm:text-2xl font-black text-white leading-tight drop-shadow-md">
                    {activeEvent.title}
                  </h2>

                  {activeEvent.description && (
                    <p className="text-xs text-slate-300 line-clamp-2 max-w-xl font-medium drop-shadow">
                      {activeEvent.description}
                    </p>
                  )}
                </div>

                {/* उजवी बाजू: स्लाइड कंट्रोल्स आणि फुलस्क्रीन */}
                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <button
                    onClick={() => setIsAutoPlay(!isAutoPlay)}
                    className="p-2 bg-black/70 hover:bg-black text-white rounded-xl backdrop-blur-md border border-white/10 transition"
                    title={isAutoPlay ? "ऑटो-प्ले थांबवा" : "ऑटो-प्ले सुरू करा"}
                  >
                    {isAutoPlay ? <Pause className="w-4 h-4 text-amber-400" /> : <Play className="w-4 h-4 text-emerald-400" />}
                  </button>

                  <button
                    onClick={() => setLightbox({ isOpen: true, photos: activePhotos, currentIndex: currentSlideIndex, title: activeEvent.title })}
                    className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition cursor-pointer"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>पाहा ({currentSlideIndex + 1}/{activePhotos.length})</span>
                  </button>
                </div>
              </div>

              {/* मॅन्युअल Next / Prev Arrows */}
              {activePhotos.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentSlideIndex(prev => (prev - 1 + activePhotos.length) % activePhotos.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black text-white border border-white/10 opacity-80 group-hover:opacity-100 transition z-20"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setCurrentSlideIndex(prev => (prev + 1) % activePhotos.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black text-white border border-white/10 opacity-80 group-hover:opacity-100 transition z-20"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* लहान डॉट्स बार */}
              <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 z-20">
                {activePhotos.map((_, dotIdx) => (
                  <span
                    key={dotIdx}
                    onClick={() => setCurrentSlideIndex(dotIdx)}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      currentSlideIndex === dotIdx ? 'w-4 bg-amber-400' : 'w-1.5 bg-slate-600'
                    }`}
                  />
                ))}
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* 🎬 २. मोठे इव्हेंट ॲल्बम कार्ड्स (Bigger Horizontal Event Album Cards)       */}
          {/* ========================================================================= */}
          <div className="space-y-2.5 pt-1">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-xs sm:text-sm font-bold text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-amber-400" /> इतर सर्व उपक्रम & मोहिमा ({events.length})
              </h3>
              <span className="text-[10px] text-slate-400 font-medium">इव्हेंटवर क्लिक करून त्याचे फोटो पाहा</span>
            </div>

            {/* Horizontal Scrollable Row with BIGGER Cards */}
            <div className="flex gap-3.5 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-slate-800 snap-x">
              {events.map((evt, idx) => {
                const isSelected = selectedEventIndex === idx;
                const cover = evt.coverPhoto || evt.photos?.[0] || '';

                return (
                  <div
                    key={evt.id}
                    onClick={() => handleSelectEvent(idx)}
                    className={`relative shrink-0 w-72 sm:w-80 p-3 rounded-2xl border transition-all cursor-pointer snap-start flex gap-3 items-center ${
                      isSelected
                        ? 'bg-slate-900 border-amber-400 shadow-xl shadow-amber-500/10 ring-1 ring-amber-400/60'
                        : 'bg-slate-950/90 border-slate-800 hover:border-slate-700 opacity-80 hover:opacity-100'
                    }`}
                  >
                    {/* Bigger Thumbnail (Autofit & Clean) */}
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-black/60 shrink-0 border border-slate-800 flex items-center justify-center p-1">
                      {cover ? (
                        <img src={cover} alt={evt.title} className="w-full h-full object-contain" />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-slate-600" />
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        {evt.year || '2026'}
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-white truncate leading-snug">
                        {evt.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate">
                        📸 {evt.photos?.length || 0} फोटो • {evt.location || 'महाराष्ट्र'}
                      </p>
                    </div>

                    {/* Admin Actions on card */}
                    {isSuperAdmin && (
                      <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/80 rounded-lg p-0.5 border border-white/10" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => { setEditingEvent(evt); setIsModalOpen(true); }}
                          className="p-1 hover:text-amber-400 text-slate-400"
                          title="एडिट"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(evt.id, evt.title)}
                          className="p-1 hover:text-rose-400 text-slate-400"
                          title="डिलीट"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 🖼️ ३. निवडलेल्या इव्हेंटची संपूर्ण फोटो गॅलरी ग्रिड (Clean Responsive Grid)  */}
          {/* ========================================================================= */}
          {activePhotos.length > 0 && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-3 sm:p-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {activePhotos.map((url, pIdx) => (
                  <div
                    key={pIdx}
                    onClick={() => setLightbox({ isOpen: true, photos: activePhotos, currentIndex: pIdx, title: activeEvent.title })}
                    className="relative group rounded-2xl overflow-hidden border border-slate-800 hover:border-amber-500/50 transition cursor-pointer aspect-[4/3] bg-black/90 flex items-center justify-center p-1.5"
                  >
                    <img
                      src={url}
                      alt={`${activeEvent.title}-${pIdx}`}
                      className="max-h-full max-w-full object-contain group-hover:scale-105 transition duration-300"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <span className="p-2 bg-black/70 rounded-full text-white backdrop-blur-sm">
                        <Maximize2 className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* 🔹 फुलस्क्रीन इमेज लाईटबॉक्स */}
      {lightbox.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-3 sm:p-4 backdrop-blur-md">
          <div className="flex justify-between items-center text-white pb-2 border-b border-slate-800">
            <div>
              <p className="text-xs sm:text-sm font-bold text-amber-400">{lightbox.title}</p>
              <p className="text-[10px] text-slate-400 font-mono">
                फोटो {lightbox.currentIndex + 1} / {lightbox.photos.length}
              </p>
            </div>
            <button
              onClick={() => setLightbox({ ...lightbox, isOpen: false })}
              className="p-1.5 bg-slate-800 rounded-full text-white hover:bg-slate-700 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="relative flex-1 flex items-center justify-center p-1 sm:p-2">
            <img
              src={lightbox.photos[lightbox.currentIndex]}
              alt="Fullscreen View"
              className="max-h-[82vh] max-w-[95vw] object-contain rounded-2xl shadow-2xl"
            />

            {lightbox.photos.length > 1 && (
              <>
                <button
                  onClick={() => setLightbox(prev => ({
                    ...prev,
                    currentIndex: (prev.currentIndex - 1 + prev.photos.length) % prev.photos.length
                  }))}
                  className="absolute left-2 p-2.5 bg-black/60 hover:bg-black text-white rounded-full transition"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setLightbox(prev => ({
                    ...prev,
                    currentIndex: (prev.currentIndex + 1) % prev.photos.length
                  }))}
                  className="absolute right-2 p-2.5 bg-black/60 hover:bg-black text-white rounded-full transition"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* 👑 सुपर ॲडमिन ॲड / एडिट मोडल */}
      {isModalOpen && (
        <EventModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setEditingEvent(null); }}
          onSave={handleSaveEvent}
          eventData={editingEvent}
          saving={saving}
        />
      )}

    </div>
  );
}