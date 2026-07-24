import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useCompetitions } from '../hooks/useCompetitions';

import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import { dataService,uploadToImgBB } from '../services/dataService';

import { 
  Trophy, Calendar, MapPin, Plus, Edit2, Trash2, 
  X, ArrowLeft, ArrowRight, Radio, Info, Loader2, PlayCircle, Award, FileText, Users, Clock, Trash, Hash
} from 'lucide-react';
import Swal from 'sweetalert2';

export default function Competitions() {
  const { competitions, loading, addCompetition, updateCompetition, deleteCompetition } = useCompetitions();

  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [activeDetailComp, setActiveDetailComp] = useState(null);

  const [formData, setFormData] = useState({
    competitionId: '',
    title: '',
    startDate: '',
    endDate: '',
    time: 'सायंकाळी ४:०० वाजता',
    venue: '',
    bannerUrl: '',
    youtubeUrl: '',
    rulesAndDetails: '',
    regLink: '#/form/COMP-2026-01',
    participatingTeamsRaw: '',
    galleryImagesRaw: '',
    categories: []
  });

  const todayStr = new Date().toISOString().split('T')[0];

  // 🔑 AUTHENTICATION & SUPER ADMIN CHECK (Email Key Based)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.email) {
        const emailDocKey = user.email.toLowerCase().trim();
        try {
          const userDocRef = doc(db, 'users', emailDocKey);
          const userSnap = await getDoc(userDocRef);

          if (userSnap.exists()) {
            const userData = userSnap.data();
            if (['Super Admin' ].includes(userData.role)) {
              setIsSuperAdmin(true);
            } else {
              setIsSuperAdmin(false);
            }
          } else {
            setIsSuperAdmin(false);
          }
        } catch (error) {
          console.error("Auth Check Error:", error);
          setIsSuperAdmin(false);
        }
      } else {
        setIsSuperAdmin(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // ==========================================
// 5. DATE-BASED AUTO FILTERING & SORTING (LATEST FIRST)
// ==========================================

 // 1. थेट सुरु असलेल्या स्पर्धा (Live)
const liveComps = competitions
  .filter(c => c.startDate <= todayStr && c.endDate >= todayStr)
  .sort((a, b) => new Date(b.startDate) - new Date(a.startDate)); // 👈 Latest First

  // 2. आगामी स्पर्धा (Upcoming)
const upcomingComps = competitions
  .filter(c => c.startDate > todayStr)
  .sort((a, b) => new Date(a.startDate) - new Date(b.startDate)); // 👈 जवळ येणारी तारीख आधी


  // 3. मागील स्पर्धा (History: 2026, 2025, 2024, 2023...)
const completedComps = competitions
  .filter(c => c.endDate < todayStr)
  .sort((a, b) => new Date(b.startDate) - new Date(a.startDate)); // 👈 नवीन वर्षाच्या स्पर्धा आधी (2026 -> 2025 -> 2024)


  // 🎯 SECTION: Dynamic Competition ID Generator by Year
const generateDynamicCompId = (selectedDateStr, existingCompetitions = []) => {
  // १. निवडलेल्या तारखेतून वर्ष काढा (किंवा चालू वर्ष घ्या)
  const targetYear = selectedDateStr ? selectedDateStr.split('-')[0] : new Date().getFullYear().toString();
  
  // २. त्या विशिष्ट वर्षातील आधीच्या स्पर्धा मोजा
  const countForYear = existingCompetitions.filter(comp => {
    const compYear = comp.startDate ? comp.startDate.split('-')[0] : '';
    const compIdYear = comp.competitionId ? comp.competitionId.split('-')[1] : '';
    return compYear === targetYear || compIdYear === targetYear;
  }).length;

  // ३. नवीन सिरीयल नंबर (01, 02, 03...)
  const nextSerial = String(countForYear + 1).padStart(2, '0');
  
  const generatedId = `COMP-${targetYear}-${nextSerial}`;
  
  console.log(`🎯 [ID GEN] Date: ${selectedDateStr} | Year: ${targetYear} | Count: ${countForYear} | Generated: ${generatedId}`);
  
  return generatedId;
};



  // 📝 ADMIN MODAL OPEN HANDLER
  const handleOpenAdminModal = (e, item = null) => {
    if (e) e.stopPropagation();

    if (item) {
      setEditingItem(item);

      const existingCompId = item.competitionId || item.id;
      const dynamicRegLink = item.regLink ? item.regLink : `#/form/${existingCompId}`;

      setFormData({ 
        ...item,
        competitionId: existingCompId,
        regLink: dynamicRegLink,
        title: item.title || '',
        startDate: item.startDate || todayStr,
        endDate: item.endDate || todayStr,
        time: item.time || 'सायंकाळी ४:०० वाजता',
        venue: item.venue || '',
        bannerUrl: item.bannerUrl || '',
        youtubeUrl: item.youtubeUrl || '',
        rulesAndDetails: item.rulesAndDetails || '',
        
        participatingTeamsRaw: Array.isArray(item.participatingTeams) 
          ? item.participatingTeams.join(', ') 
          : (typeof item.participatingTeams === 'string' ? item.participatingTeams : ''),
        
        galleryImagesRaw: Array.isArray(item.galleryImages) 
          ? item.galleryImages.join(', ') 
          : (typeof item.galleryImages === 'string' ? item.galleryImages : ''),
        
        categories: Array.isArray(item.categories) && item.categories.length > 0 
          ? item.categories 
          : []
      });
    } else {
      setEditingItem(null);

   //   const autoGeneratedId = `COMP-2026-${String(competitions.length + 1).padStart(2, '0')}`;
      // 🗓️ आजच्या तारखेवरून dynamic ID बनवणे
  const autoGeneratedId = generateDynamicCompId(todayStr, competitions);
      
      setFormData({
        competitionId: autoGeneratedId,
        title: '',
        startDate: todayStr,
        endDate: todayStr,
        time: 'सायंकाळी ४:०० वाजता',
        venue: '',
        bannerUrl: '',
        youtubeUrl: '',
        rulesAndDetails: '',
        regLink: `#/form/${autoGeneratedId}`,
        participatingTeamsRaw: '',
        galleryImagesRaw: '',
        categories: [
          {
            categoryName: 'पुरुष ६ थर',
            winners: [
              { rank: '🥇 प्रथम', teamName: '', timing: '' },
              { rank: '🥈 द्वितीय', teamName: '', timing: '' }
            ]
          }
        ]
      });
    }
    setIsModalOpen(true);
  };

  const handleCompIdChange = (idVal) => {
    const cleanId = idVal.toUpperCase().replace(/\s+/g, '-');
    setFormData(prev => ({
      ...prev,
      competitionId: cleanId,
      regLink: `#/form/${cleanId}`
    }));
  };

  const addCategory = () => {
    setFormData(prev => ({
      ...prev,
      categories: [
        ...prev.categories,
        {
          categoryName: '',
          winners: [{ rank: '🥇 प्रथम', teamName: '', timing: '' }]
        }
      ]
    }));
  };

  const removeCategory = (catIdx) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.filter((_, idx) => idx !== catIdx)
    }));
  };

  const addWinnerRow = (catIdx) => {
    const updated = [...formData.categories];
    updated[catIdx].winners.push({ rank: '', teamName: '', timing: '' });
    setFormData({ ...formData, categories: updated });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const imageUrl = await uploadToImgBB(file);
      if (imageUrl) {
        setFormData(prev => ({ ...prev, bannerUrl: imageUrl }));
        Swal.fire({
          icon: 'success', title: 'पोस्टर अपलोड झाले!', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, background: '#0c0d14', color: '#fff'
        });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'अपलोड अपयशी!', background: '#0c0d14', color: '#fff' });
    } finally {
      setUploadingImage(false);
    }
  };

  // 💾 FORM SUBMIT HANDLER
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const teamsArray = typeof formData.participatingTeamsRaw === 'string' && formData.participatingTeamsRaw.trim() !== ''
        ? formData.participatingTeamsRaw.split(',').map(t => t.trim()).filter(Boolean)
        : (Array.isArray(formData.participatingTeams) ? formData.participatingTeams : []);

      const galleryArray = typeof formData.galleryImagesRaw === 'string' && formData.galleryImagesRaw.trim() !== ''
        ? formData.galleryImagesRaw.split(',').map(img => img.trim()).filter(Boolean)
        : (Array.isArray(formData.galleryImages) ? formData.galleryImages : []);

      const compId = formData.competitionId || editingItem?.id || `COMP-${Date.now()}`;

      const cleanData = {
        competitionId: compId,
        title: formData.title || '',
        startDate: formData.startDate || '',
        endDate: formData.endDate || '',
        time: formData.time || '',
        venue: formData.venue || '',
        bannerUrl: formData.bannerUrl || '',
        youtubeUrl: formData.youtubeUrl || '',
        rulesAndDetails: formData.rulesAndDetails || '',
        regLink: `#/form/${compId}`,
        season: formData.season || '2026',
        participatingTeams: teamsArray,
        galleryImages: galleryArray,
        categories: formData.categories || []
      };

      if (editingItem) {
        await updateCompetition(editingItem.id, cleanData);
        Swal.fire({ icon: 'success', title: 'माहिती अपडेट झाली!', background: '#0c0d14', color: '#fff', confirmButtonColor: '#f59e0b' });
      } else {
        await addCompetition(cleanData);
        Swal.fire({ icon: 'success', title: 'नवीन स्पर्धा जोडली!', background: '#0c0d14', color: '#fff', confirmButtonColor: '#f59e0b' });
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error("Save Error:", err);
      Swal.fire({ icon: 'error', title: 'सेव्ह करताना अडचण आली!', text: err.message, background: '#0c0d14', color: '#fff' });
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    const result = await Swal.fire({
      title: 'नक्की ही स्पर्धा हटवायची आहे का?',
      text: "माहिती कायमची निघून जाईल!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#334155',
      confirmButtonText: 'होय, हटवा',
      cancelButtonText: 'रद्द करा',
      background: '#0c0d14',
      color: '#fff'
    });

    if (result.isConfirmed) {
      await deleteCompetition(id);
      if (activeDetailComp?.id === id) setActiveDetailComp(null);
      Swal.fire({ icon: 'success', title: 'स्पर्धा हटवली!', background: '#0c0d14', color: '#fff' });
    }
  };

  const getEmbedYoutubeUrl = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null;
  };

//Competitions.jsx मध्येच Form ON/OFF स्विच ठेवण्याचे ४ मोठे फायदे आहेत:
  // 🎯 SECTION: Toggle Competition Registration Form Status
// 🎯 SECTION: Toggle Competition Registration Form Status (Fixed)
const handleToggleCompForm = async (compId, currentStatus) => {
  const newStatus = !currentStatus;
  
  const result = await Swal.fire({
    title: `फॉर्म ${newStatus ? 'सुरू' : 'बंद'} करायचा का?`,
    text: `स्पर्धा आयडी: ${compId}`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: newStatus ? 'होय, सुरू करा' : 'होय, बंद करा',
    cancelButtonText: 'रद्द करा',
    background: '#0c0d14',
    color: '#fff'
  });

  if (result.isConfirmed) {
    try {
      // 1️⃣ Firestore अपडेट करणे (डेटाबेसमध्ये सेव्ह करणे)
      await dataService.updateCompetitionFormStatus(compId, newStatus);
      
      // 2️⃣ UI मध्ये अपडेट दिसण्यासाठी 'updateCompetition' चा वापर (useCompetitions hook कडून)
      // आधी कॉम्पिटिशन्स मधून तो डॉक्युमेंट शोधा
      const targetComp = competitions.find(c => c.competitionId === compId || c.id === compId);
      if (targetComp) {
        await updateCompetition(targetComp.id, { isFormOpen: newStatus });
      }

      Swal.fire({
        icon: 'success',
        title: `फॉर्म ${newStatus ? 'सुरू' : 'बंद'} झाला!`,
        timer: 1200,
        showConfirmButton: false,
        background: '#0c0d14',
        color: '#fff'
      });
    } catch (err) {
      console.error("Error toggling comp form:", err);
      Swal.fire({ icon: 'error', title: 'त्रुटी!', text: 'स्टेटस बदलता आला नाही.' });
    }
  }
};

  return (
    <div className="min-h-screen flex flex-col bg-[#08090d] text-white font-sans">
      <Navbar />

      <div className="relative py-4 px-4 bg-gradient-to-b from-amber-500/10 via-transparent to-transparent border-b border-amber-500/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" /> स्पर्धा व इतिहास
            </h1>
            <p className="text-slate-400 text-[11px] mt-0.5">अधिकृत दहीहंडी स्पर्धा व डिजिटल रेकॉर्ड पोर्टल</p>
          </div>

          {isSuperAdmin && !activeDetailComp && (
            <button
              onClick={(e) => handleOpenAdminModal(e)}
              className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-extrabold text-xs rounded-xl shadow-md hover:opacity-90 transition flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> जोडा (Admin)
            </button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4 w-full flex-1">
        {activeDetailComp ? (
          <div className="space-y-4 animate-fadeIn">
            <button 
              onClick={() => setActiveDetailComp(null)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-amber-400 hover:text-white text-xs font-bold transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> मागे जा (Back)
            </button>

            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-[#0c0d14] to-[#0c0d14] border border-amber-500/30 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 font-mono text-[10px] font-bold rounded-md">
                      ID: {activeDetailComp.competitionId || activeDetailComp.id}
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-2xl font-black text-white">{activeDetailComp.title}</h2>
                  <div className="flex flex-wrap gap-3 text-xs text-slate-300">
                    <span className="text-amber-400 font-bold flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5"/> {activeDetailComp.startDate} ते {activeDetailComp.endDate} ({activeDetailComp.time})
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-amber-400"/> {activeDetailComp.venue}
                    </span>
                  </div>
                </div>


                <div className="flex items-center gap-2 shrink-0">
                  {activeDetailComp.startDate > todayStr && (
                    <a
                      href={activeDetailComp.regLink || `#/form/${activeDetailComp.competitionId || '2026'}`}
                      className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-extrabold text-xs sm:text-sm rounded-xl hover:opacity-90 transition flex items-center gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer"
                    >
                      ऑनलाइन अर्ज भरा <ArrowRight className="w-4 h-4"/>
                    </a>
                  )}

                  {isSuperAdmin && (
                    <div className="flex gap-1">
                      <button onClick={(e) => handleOpenAdminModal(e, activeDetailComp)} className="p-2 bg-slate-800 text-amber-400 rounded-xl hover:bg-slate-700"><Edit2 className="w-4 h-4"/></button>
                      <button onClick={(e) => handleDelete(e, activeDetailComp.id)} className="p-2 bg-slate-800 text-red-400 rounded-xl hover:bg-slate-700"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-7 space-y-4">
                {getEmbedYoutubeUrl(activeDetailComp.youtubeUrl) ? (
                  <div className="space-y-1">
                    <span className="text-[11px] text-amber-400 font-bold flex items-center gap-1"><PlayCircle className="w-3.5 h-3.5"/> व्हिडिओ हायलाइट्स</span>
                    <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-amber-500/20 bg-slate-900">
                      <iframe className="w-full h-full" src={getEmbedYoutubeUrl(activeDetailComp.youtubeUrl)} title="YouTube video" allowFullScreen />
                    </div>
                  </div>
                ) : (
                  <ImageCarousel 
                    images={[
                      activeDetailComp.bannerUrl, 
                      ...(activeDetailComp.galleryImages || [])
                    ].filter(Boolean)} 
                  />
                )}

                <div className="p-4 rounded-2xl bg-[#0c0d14] border border-slate-800 space-y-2">
                  <h3 className="text-xs font-extrabold text-amber-400 flex items-center gap-1.5 border-b border-slate-800 pb-2">
                    <FileText className="w-4 h-4"/> सविस्तर माहिती व नियम
                  </h3>
                  <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-line font-sans">
                    {activeDetailComp.rulesAndDetails || 'माहिती दिलेली नाही.'}
                  </div>
                </div>

                {activeDetailComp.participatingTeams && activeDetailComp.participatingTeams.length > 0 && (
                  <div className="p-4 rounded-2xl bg-[#0c0d14] border border-slate-800 space-y-2">
                    <h3 className="text-xs font-extrabold text-amber-400 flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="flex items-center gap-1.5"><Users className="w-4 h-4"/> सहभागी संघ</span>
                      <span className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full text-[10px]">एकूण: {activeDetailComp.participatingTeams.length}</span>
                    </h3>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {activeDetailComp.participatingTeams.map((team, idx) => (
                        <span key={idx} className="bg-slate-900 border border-slate-700/80 text-slate-200 text-[11px] px-2.5 py-1 rounded-xl">
                          {team}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="lg:col-span-5 space-y-4">
                {activeDetailComp.categories && activeDetailComp.categories.length > 0 ? (
                  <div className="p-4 rounded-2xl bg-[#0c0d14] border border-amber-500/20 space-y-3">
                    <h3 className="text-xs font-extrabold text-amber-400 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                      <Award className="w-4 h-4"/> 🏆 गटानुसार विजेते व वेळ (Timing)
                    </h3>
                    
                    <div className="space-y-3">
                      {activeDetailComp.categories.map((cat, idx) => (
                        <div key={idx} className="bg-[#12141f] p-3 rounded-xl border border-slate-800 space-y-2">
                          <h4 className="font-extrabold text-xs text-amber-400 border-b border-slate-800/80 pb-1">
                            {cat.categoryName}
                          </h4>

                          <div className="space-y-1.5">
                            {cat.winners && cat.winners.map((w, wIdx) => (
                              <div key={wIdx} className="flex items-center justify-between text-xs bg-slate-900/80 p-2 rounded-lg">
                                <span className="font-bold text-white">{w.rank}: <span className="text-emerald-400">{w.teamName || 'जाहीर करणे बाकी'}</span></span>
                                {w.timing && (
                                  <span className="text-amber-400 text-[10px] bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md font-mono flex items-center gap-1">
                                    <Clock className="w-3 h-3"/> {w.timing}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-[#0c0d14] border border-slate-800 text-center text-slate-500 text-xs">
                    विजेते निकाल नंतर अपडेट होतील.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {loading ? (
              <div className="text-center py-12 text-slate-500 text-xs">माहिती लोड होत आहे...</div>
            ) : (
              <>
                {liveComps.length > 0 && (
                  <section className="space-y-2">
                    <h2 className="text-sm font-extrabold text-red-500 flex items-center gap-1.5">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                      </span>
                      थेट सुरु असलेल्या स्पर्धा (Live)
                    </h2>
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-amber-500/20 snap-x">
                        {/* 1️⃣ Live Competitions Card Call */}
                        {liveComps.map(comp => (
                          <Card 
                            key={comp.id || comp.competitionId} 
                            comp={comp} 
                            isLive={true} 
                            isSuperAdmin={isSuperAdmin} 
                            onClick={() => setActiveDetailComp(comp)} 
                            onEdit={e => handleOpenAdminModal(e, comp)} 
                            onDelete={e => handleDelete(e, comp.id)} 
                            onToggleForm={e => {
                              e.stopPropagation();
                              handleToggleCompForm(comp.competitionId || comp.id, comp.isFormOpen !== false);
                            }}
                          />
                        ))}
                    </div>
                  </section>
                )}

                {upcomingComps.length > 0 && (
                  <section className="space-y-2">
                    <h2 className="text-sm font-extrabold text-amber-400 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" /> आगामी स्पर्धा (Upcoming)
                    </h2>
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-amber-500/20 snap-x">
                      {/* 2️⃣ Upcoming Competitions Card Call */}
                      {upcomingComps.map(comp => (
                        <Card 
                          key={comp.id || comp.competitionId} 
                          comp={comp} 
                          isSuperAdmin={isSuperAdmin} 
                          onClick={() => setActiveDetailComp(comp)} 
                          onEdit={e => handleOpenAdminModal(e, comp)} 
                          onDelete={e => handleDelete(e, comp.id)} 
                          onToggleForm={e => {
                            e.stopPropagation();
                            handleToggleCompForm(comp.competitionId || comp.id, comp.isFormOpen !== false);
                          }}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {completedComps.length > 0 && (
                  <section className="space-y-2">
                    <h2 className="text-sm font-extrabold text-slate-400 flex items-center gap-1.5">
                      <Trophy className="w-4 h-4 text-slate-500" /> मागील स्पर्धा (History)
                    </h2>
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700 snap-x">
                    {/* 3️⃣ History Competitions Card Call */}
                    {completedComps.map(comp => (
                      <Card 
                        key={comp.id || comp.competitionId} 
                        comp={comp} 
                        isCompleted={true} 
                        isSuperAdmin={isSuperAdmin} 
                        onClick={() => setActiveDetailComp(comp)} 
                        onEdit={e => handleOpenAdminModal(e, comp)} 
                        onDelete={e => handleDelete(e, comp.id)} 
                        onToggleForm={e => {
                          e.stopPropagation();
                          handleToggleCompForm(comp.competitionId || comp.id, comp.isFormOpen !== false);
                        }}
                      />
                    ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* ADMIN MODAL FORM */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-2xl bg-[#0c0d14] border border-amber-500/30 rounded-2xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-extrabold text-amber-400 text-sm">
                {editingItem ? 'स्पर्धा माहिती व निकाल अपडेट करा' : 'नवीन स्पर्धा जोडा'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1">
                <label className="block text-amber-400 font-bold flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5" /> स्पर्धा युनिक आयडी (Unique Competition ID) *
                </label>
                <input 
                  type="text" 
                  required 
                  disabled={!!editingItem}
                  value={formData.competitionId} 
                  onChange={e => handleCompIdChange(e.target.value)} 
                  placeholder="उदा. COMP-2026-01" 
                  className={`w-full border rounded-xl p-2 font-mono font-bold outline-none uppercase ${
                    editingItem 
                      ? 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed' 
                      : 'bg-[#12141f] border-slate-700 text-amber-300'
                  }`} 
                />
                <p className="text-[10px] text-slate-400">फॉर्मची लिंक आपोआप ही बनेल: <span className="text-amber-400 font-mono">{formData.regLink}</span></p>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-bold">स्पर्धेचे नाव</label>
                <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-[#12141f] border border-slate-700 rounded-xl p-2 text-white outline-none" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">स्पर्धेचा फोटो / पोस्टर (ImgBB)</label>
                  <div className="flex items-center gap-2">
                    <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} className="text-slate-400 text-[11px] file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:bg-amber-500/20 file:text-amber-400 font-bold cursor-pointer" />
                    {uploadingImage && <span className="text-amber-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin"/> अपलोड...</span>}
                  </div>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">YouTube Video Link (ऐच्छिक)</label>
                  <input type="text" placeholder="https://www.youtube.com/watch?v=..." value={formData.youtubeUrl} onChange={e => setFormData({...formData, youtubeUrl: e.target.value})} className="w-full bg-[#12141f] border border-slate-700 rounded-xl p-2 text-white outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">शुरुवात तारीख</label>
                  <input type="date" required value={formData.startDate} 
                  onChange={e => {
                        const newStartDate = e.target.value;
                        
                        // 💡 जर नवीन स्पर्धा जोडत असू (Edit करत नसू), तर तारखेनुसार ID आपोआप अपडेट करा
                        if (!editingItem) {
                          const newCompId = generateDynamicCompId(newStartDate, competitions);
                          setFormData(prev => ({
                            ...prev,
                            startDate: newStartDate,
                            competitionId: newCompId,
                            regLink: `#/form/${newCompId}`
                          }));
                        } else {
                          setFormData(prev => ({ ...prev, startDate: newStartDate }));
                        }
                      }} 
                      className="w-full bg-[#12141f] border border-slate-700 rounded-xl p-2 text-white outline-none" 
                    />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">शेवट तारीख</label>
                  <input type="date" required value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} className="w-full bg-[#12141f] border border-slate-700 rounded-xl p-2 text-white outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">वेळ</label>
                  <input type="text" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="w-full bg-[#12141f] border border-slate-700 rounded-xl p-2 text-white outline-none" />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">स्थान / ठिकाण</label>
                  <input type="text" required value={formData.venue} onChange={e => setFormData({...formData, venue: e.target.value})} className="w-full bg-[#12141f] border border-slate-700 rounded-xl p-2 text-white outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-amber-400 mb-1 font-bold">👥 सहभागी संघ (Commas ने वेगळे करा)</label>
                <input 
                  type="text" 
                  placeholder="उदा. जय जवान, कोकण नगर, ताडदेव गोविंदा, तेजस्विनी महिला..." 
                  value={formData.participatingTeamsRaw} 
                  onChange={e => setFormData({...formData, participatingTeamsRaw: e.target.value})} 
                  className="w-full bg-[#12141f] border border-slate-700 rounded-xl p-2 text-white outline-none" 
                />
              </div>

              <div className="space-y-2 bg-[#10121a] p-3 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <span className="font-extrabold text-amber-400">🏆 गटानुसार विजेते व वेळ (Winners & Timing)</span>
                  <button type="button" onClick={addCategory} className="px-2 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer">
                    <Plus className="w-3 h-3"/> नवीन गट जोडा
                  </button>
                </div>

                {formData.categories.map((cat, catIdx) => (
                  <div key={catIdx} className="p-2.5 bg-[#161826] rounded-xl border border-slate-700/60 space-y-2">
                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        placeholder="गटाचे नाव (उदा. पुरुष ६ थर / महिला ४ थर)" 
                        value={cat.categoryName} 
                        onChange={e => {
                          const updated = [...formData.categories];
                          updated[catIdx].categoryName = e.target.value;
                          setFormData({ ...formData, categories: updated });
                        }}
                        className="flex-1 bg-[#12141f] border border-slate-700 rounded-lg p-1.5 text-white font-bold outline-none" 
                      />
                      <button type="button" onClick={() => removeCategory(catIdx)} className="p-1.5 bg-red-500/20 text-red-400 rounded-lg cursor-pointer"><Trash className="w-3.5 h-3.5"/></button>
                    </div>

                    <div className="space-y-1.5 pl-2 border-l-2 border-amber-500/40">
                      {cat.winners.map((win, winIdx) => (
                        <div key={winIdx} className="grid grid-cols-12 gap-1.5 items-center">
                          <input 
                            type="text" 
                            placeholder="क्रमांक" 
                            value={win.rank} 
                            onChange={e => {
                              const updated = [...formData.categories];
                              updated[catIdx].winners[winIdx].rank = e.target.value;
                              setFormData({ ...formData, categories: updated });
                            }}
                            className="col-span-3 bg-[#12141f] border border-slate-800 rounded p-1 text-slate-300" 
                          />
                          <input 
                            type="text" 
                            placeholder="विजेत्या संघाचे नाव" 
                            value={win.teamName} 
                            onChange={e => {
                              const updated = [...formData.categories];
                              updated[catIdx].winners[winIdx].teamName = e.target.value;
                              setFormData({ ...formData, categories: updated });
                            }}
                            className="col-span-5 bg-[#12141f] border border-slate-800 rounded p-1 text-white" 
                          />
                          <input 
                            type="text" 
                            placeholder="वेळ (Timing)" 
                            value={win.timing} 
                            onChange={e => {
                              const updated = [...formData.categories];
                              updated[catIdx].winners[winIdx].timing = e.target.value;
                              setFormData({ ...formData, categories: updated });
                            }}
                            className="col-span-4 bg-[#12141f] border border-slate-800 rounded p-1 text-amber-400 font-mono" 
                          />
                        </div>
                      ))}
                      <button type="button" onClick={() => addWinnerRow(catIdx)} className="text-[10px] text-amber-400 font-bold hover:underline cursor-pointer">+ क्रमांक/बक्षीस जोडा</button>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-bold">📜 सविस्तर माहिती व नियम (Copy-Paste)</label>
                <textarea rows="3" value={formData.rulesAndDetails} onChange={e => setFormData({...formData, rulesAndDetails: e.target.value})} className="w-full bg-[#12141f] border border-slate-700 rounded-xl p-2 text-white outline-none leading-relaxed" />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-bold">🔗 नोंदणी अर्ज लिंक</label>
                <input type="text" value={formData.regLink} onChange={e => setFormData({...formData, regLink: e.target.value})} className="w-full bg-[#12141f] border border-slate-700 rounded-xl p-2 text-white outline-none font-mono" />
              </div>

              <div className="pt-2 flex gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl cursor-pointer">रद्द करा</button>
                <button type="submit" className="flex-1 py-2.5 bg-amber-500 text-black font-extrabold rounded-xl cursor-pointer">सेव्ह करा</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

function ImageCarousel({ images = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 3500);

    return () => clearInterval(interval);
  }, [images]);

  if (images.length === 0) return null;

  return (
    <div className="relative w-full h-[320px] sm:h-[380px] rounded-2xl overflow-hidden border border-amber-500/20 bg-black/90 flex items-center justify-center group">
      <img 
        src={images[currentIndex]} 
        alt="Competition Media" 
        className="w-full h-full object-contain transition-all duration-500 ease-in-out"
        onError={(e) => e.target.src = './event-banner.jpg'}
      />

      {images.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/60 px-3 py-1 rounded-full border border-white/10">
          {images.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-1.5 rounded-full transition-all ${idx === currentIndex ? 'w-5 bg-amber-400' : 'w-1.5 bg-white/40'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// 🎯 SECTION: Updated Card Component with Registration Form ON/OFF Toggle
function Card({ comp, isLive, isSuperAdmin, onClick, onEdit, onDelete, onToggleForm }) {
  const isOnline = comp.isFormOpen !== false;

  return (
    <div 
      onClick={onClick} 
      className="min-w-[250px] max-w-[250px] snap-start bg-[#0c0d14] border border-amber-500/20 rounded-2xl overflow-hidden shadow-lg hover:border-amber-500/50 transition cursor-pointer flex flex-col justify-between relative group"
    >
      <div className="relative h-32 bg-[#050608] flex items-center justify-center overflow-hidden border-b border-slate-800/80">
        <img 
          src={comp.bannerUrl || './event-banner.jpg'} 
          alt={comp.title} 
          className="w-full h-full object-contain p-1 transition-transform duration-300 group-hover:scale-105" 
          onError={e => e.target.src = './event-banner.jpg'} 
        />
        
        {isLive && (
          <span className="absolute top-2 left-2 bg-red-600 text-white font-extrabold text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse z-10 shadow-md">
            <Radio className="w-2.5 h-2.5" /> LIVE
          </span>
        )}

        {isSuperAdmin && (
          <div className="absolute top-2 right-2 flex gap-1 z-10">
            <button onClick={onEdit} className="p-1 bg-black/80 text-amber-400 rounded-lg hover:bg-black cursor-pointer" title="संपादित करा"><Edit2 className="w-3 h-3"/></button>
            <button onClick={onDelete} className="p-1 bg-black/80 text-red-400 rounded-lg hover:bg-black cursor-pointer" title="हटवा"><Trash2 className="w-3 h-3"/></button>
          </div>
        )}
      </div>

      <div className="p-3 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-amber-400 font-mono font-bold">{comp.competitionId || comp.id}</span>
        </div>
        <h3 className="font-extrabold text-xs text-white line-clamp-2 leading-tight">{comp.title}</h3>
        <p className="text-[10px] text-amber-400 font-bold">{comp.startDate} • {comp.venue}</p>
      </div>

      {/* 🔒 Form Status & Card Footer */}
      <div className="p-2.5 bg-[#11131c] border-t border-slate-800 space-y-2">
        
        {/* 👑 Only Super Admin can Toggle Form ON/OFF directly on the card */}
        {isSuperAdmin && (
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5" onClick={e => e.stopPropagation()}>
            <span className="text-[10px] text-slate-400 font-semibold">फॉर्म:</span>
            <button
              onClick={onToggleForm}
              className={`px-2 py-0.5 rounded-md text-[10px] font-black transition flex items-center gap-1 cursor-pointer ${
                isOnline 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30' 
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
              {isOnline ? 'सुरू (ONLINE)' : 'बंद (OFFLINE)'}
            </button>
          </div>
        )}

        <div className="flex items-center justify-between text-[10px]">
          <span className="text-slate-400">माहिती व निकाल</span>
          <span className="text-amber-400 font-bold flex items-center gap-0.5">पहा <Info className="w-3 h-3"/></span>
        </div>

      </div>
    </div>
  );
}