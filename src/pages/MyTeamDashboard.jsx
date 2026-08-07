import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import Swal from 'sweetalert2';
import { 
  Shield, Trophy, CheckCircle, Clock, XCircle, User, 
  Phone, MapPin, Loader2, Award, FileText, AlertCircle, UploadCloud, RefreshCw, Eye, Download, X
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';

export default function MyTeamDashboard() {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [myTeams, setMyTeams] = useState([]);
  const [myInsurances, setMyInsurances] = useState([]);
  const [activeTab, setActiveTab] = useState('applications'); 

  // 🎯 Re-upload & PDF View Modal States
  const [reuploadingId, setReuploadingId] = useState(null);
  const [newFile, setNewFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [viewPdfUrl, setViewPdfUrl] = useState(null); // 👁️ PDF Inline Viewer Modal साठी
  const [pdfTitle, setPdfTitle] = useState('अपलोड केलेली फाईल (PDF)');

  const fetchDashboardData = async (userEmail) => {
    try {
      const emailLower = userEmail.toLowerCase().trim();

      const [teamsSnap, insuranceSnap] = await Promise.all([
        getDocs(query(collection(db, 'teams'), where('email', '==', emailLower))),
        getDocs(query(collection(db, 'insurance_requests_2026'), where('email', '==', emailLower)))
      ]);

      const teamsData = teamsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const insuranceData = insuranceSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      setMyTeams(teamsData);
      setMyInsurances(insuranceData);

      if (teamsData.length > 0) {
        setActiveTab('applications');
      } else if (insuranceData.length > 0) {
        setActiveTab('insurance');
      }

    } catch (error) {
      console.error("Error fetching user status:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.email) {
        setCurrentUser(user);
        fetchDashboardData(user.email);
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // 🗜️ Smart PDF Converter (< 2MB Direct Bypass)
  const convertFileToBase64 = async (file) => {
    const TWO_MB_BYTES = 2 * 1024 * 1024;
    if (file.size <= TWO_MB_BYTES) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (err) => reject(err);
      });
    }

    if (file.type === 'application/pdf') {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
        const compressedPdfBytes = await pdfDoc.save({ useObjectStreams: true, addDefaultPage: false });
        const compressedBlob = new Blob([compressedPdfBytes], { type: 'application/pdf' });
        
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(compressedBlob);
          reader.onload = () => resolve(reader.result);
          reader.onerror = (err) => reject(err);
        });
      } catch (pdfErr) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result);
          reader.onerror = (err) => reject(err);
        });
      }
    }
  };

  // 📤 Re-upload New PDF Handler
  const handleReuploadSubmit = async (insItem) => {
    if (!newFile) {
      Swal.fire({ icon: 'warning', title: 'कृपया नवीन PDF फाईल निवडा!', confirmButtonColor: '#f59e0b', background: '#0c0d14', color: '#fff' });
      return;
    }

    setUploadLoading(true);
    try {
      const base64File = await convertFileToBase64(newFile);
      const gasUrl = import.meta.env.VITE_GOOGLE_APP_SCRIPT_URL;

      const response = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          fileName: `${insItem.teamName}_${insItem.appId}_Letterhead_Updated.pdf`,
          fileType: newFile.type,
          fileData: base64File
        })
      });

      const rawText = await response.text();
      let uploadedFileUrl = "";
      try {
        const resData = JSON.parse(rawText);
        if (resData.status === 'success') {
          uploadedFileUrl = resData.fileUrl;
        }
      } catch (parseErr) {
        console.warn("GAS JSON Parse Warning:", parseErr);
      }

      // Firestore अपडेट (Status पुन्हा Pending होईल)
      const docRef = doc(db, "insurance_requests_2026", insItem.id);
      await updateDoc(docRef, {
        fileUrl: uploadedFileUrl || insItem.fileUrl,
        status: 'प्रलंबित (Pending)',
        rejectReason: ''
      });

      Swal.fire({
        icon: 'success',
        title: 'सुधारित फाईल यशस्वीपणे सबमिट झाली!',
        text: 'तुमचा अर्ज पुन्हा पडताळणीसाठी पाठवला आहे.',
        confirmButtonColor: '#f59e0b',
        background: '#0c0d14',
        color: '#fff'
      });

      setReuploadingId(null);
      setNewFile(null);
      fetchDashboardData(currentUser.email);

    } catch (err) {
      console.error("Re-upload error:", err);
      Swal.fire({ icon: 'error', title: 'त्रुटी!', text: 'फाईल अपलोड होऊ शकली नाही.', background: '#0c0d14', color: '#fff' });
    } finally {
      setUploadLoading(false);
    }
  };

  // Status Badge Helper
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved':
      case 'मंजूर':
      case 'मंजूर (Approved)':
        return <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-extrabold text-xs rounded-full"><CheckCircle className="w-3.5 h-3.5"/> मंजूर (Approved)</span>;
      case 'Rejected':
      case 'नामंजूर':
      case 'नामंजूर (Rejected)':
        return <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-500/10 border border-red-500/30 text-red-400 font-extrabold text-xs rounded-full"><XCircle className="w-3.5 h-3.5"/> नामंजूर (Rejected)</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 font-extrabold text-xs rounded-full"><Clock className="w-3.5 h-3.5"/> प्रलंबित (Pending)</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08090d] text-white flex flex-col justify-between">
        <Navbar />
        <div className="text-center py-20 text-amber-400 font-bold flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> माहिती शोधत आहे...
        </div>
        <Footer />
      </div>
    );
  }

  const hasNoData = myTeams.length === 0 && myInsurances.length === 0;

  // 🛠️ PDF Inline Open Helper
  const handleOpenPdfModal = (url, titleText = "PDF Viewer") => {
    setPdfTitle(titleText);
    setViewPdfUrl(url);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#08090d] text-white font-sans">
      <Navbar />

      {/* Header Banner */}
      <div className="py-5 px-4 bg-gradient-to-b from-amber-500/10 via-transparent to-transparent border-b border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <Shield className="w-6 h-6 text-amber-400" /> My Status
            </h1>
            <p className="text-slate-400 text-xs mt-0.5">लॉगिन ईमेल: <span className="text-amber-400 font-mono">{currentUser?.email}</span></p>
          </div>
        </div>
      </div>

      {/* DYNAMIC NAVIGATION TABS */}
      {!hasNoData && (
        <div className="max-w-7xl mx-auto px-4 pt-4 w-full">
          <div className="flex border-b border-slate-800 gap-2 overflow-x-auto scrollbar-none">
            
            {myTeams.length > 0 && (
              <button
                onClick={() => setActiveTab('applications')}
                className={`py-2.5 px-4 font-extrabold text-xs rounded-t-xl transition flex items-center gap-2 cursor-pointer ${
                  activeTab === 'applications'
                    ? 'bg-[#0c0d14] border-t-2 border-amber-500 text-amber-400 border-x border-slate-800'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Trophy className="w-4 h-4" /> माझे स्पर्धा अर्ज ({myTeams.length})
              </button>
            )}

            {myInsurances.length > 0 && (
              <button
                onClick={() => setActiveTab('insurance')}
                className={`py-2.5 px-4 font-extrabold text-xs rounded-t-xl transition flex items-center gap-2 cursor-pointer ${
                  activeTab === 'insurance'
                    ? 'bg-[#0c0d14] border-t-2 border-amber-500 text-amber-400 border-x border-slate-800'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Shield className="w-4 h-4" /> गोविंदा विमा अर्ज ({myInsurances.length})
              </button>
            )}

          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 py-6 w-full flex-1">
        
        {hasNoData ? (
          <div className="p-8 bg-[#0c0d14] border border-slate-800 rounded-3xl text-center space-y-3 max-w-xl mx-auto my-6">
            <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
            <h3 className="text-base font-extrabold text-white">तुमचा ई-मेल नोंदणीकृत नाही</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              या ई-मेल आयडीने कोणताही स्पर्धा अर्ज किंवा विमा अर्ज सापडलेला नाही. अधिक माहितीसाठी कृपया ॲडमिनशी संपर्क करा.
            </p>
          </div>
        ) : (
          <>
            {/* 🏆 TAB 1: COMPETITION APPLICATIONS */}
            {activeTab === 'applications' && myTeams.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myTeams.map((team) => {
                  const isApproved = team.status === 'Approved' || team.status === 'मंजूर' || team.status === 'मंजूर (Approved)';
                  const certificateLink = team.certificateUrl || team.certificatePdfUrl || team.approvedCertificateUrl;

                  return (
                    <div key={team.id} className="bg-[#0c0d14] border border-slate-800 hover:border-amber-500/40 transition-colors rounded-[24px] p-5 space-y-4 shadow-xl relative overflow-hidden">
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">REGISTRATION ID</span>
                          <span className="font-mono text-xs font-black text-amber-400">{team.registrationId}</span>
                        </div>
                        {getStatusBadge(team.status)}
                      </div>

                      <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-3 py-2 flex items-center gap-2">
                        <Award className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span className="text-xs font-extrabold text-indigo-300 line-clamp-1">
                          {team.competitionName || `MRDGA अधिकृत दहीहंडी स्पर्धा - ${team.season || '2026'}`}
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        <h3 className="text-[17px] font-black text-white">{team.teamName}</h3>
                        <div className="grid grid-cols-2 gap-2.5 text-xs text-slate-300 pt-1">
                          <p className="flex items-center gap-1.5 truncate">
                            <MapPin className="w-4 h-4 text-amber-400 shrink-0"/> {team.district}, {team.vibhag}
                          </p>
                          <p className="flex items-center gap-1.5">
                            <Trophy className="w-4 h-4 text-amber-400 shrink-0"/> गट: <span className="font-bold text-white">{team.category}</span>
                          </p>
                          <p className="flex items-center gap-1.5 truncate">
                            <User className="w-4 h-4 text-amber-400 shrink-0"/> कॅप्टन: {team.captain?.name}
                          </p>
                          <p className="flex items-center gap-1.5">
                            <Phone className="w-4 h-4 text-amber-400 shrink-0"/> {team.captain?.phone}
                          </p>
                        </div>
                      </div>

                      <div className="p-3 bg-[#12141f] rounded-xl border border-slate-800 flex justify-between items-center text-[11px] text-slate-400">
                        <span>हंगाम (Season): <strong className="text-white">{team.season || '2026'}</strong></span>
                        <span>एकूण खेळाडू: <strong className="text-amber-400 font-bold">{team.playerCount}</strong></span>
                      </div>

                      {/* 🎓 APPROVED CERTIFICATE SECTION FOR COMPETITION */}
                      {isApproved && certificateLink && (
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                              <Award className="w-4 h-4" /> अधिकृत सहभाग प्रमाणपत्र (Approval Certificate)
                            </span>
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleOpenPdfModal(certificateLink, "स्पर्धा सहभाग प्रमाणपत्र")}
                              className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer shadow-lg shadow-emerald-500/10"
                            >
                              <Eye className="w-3.5 h-3.5" /> प्रमाणपत्र पहा
                            </button>
                            <a
                              href={certificateLink}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 flex items-center justify-center transition"
                              title="डाऊनलोड करा"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}

            {/* 🛡️ TAB 2: GOVINDA INSURANCE APPLICATIONS */}
            {activeTab === 'insurance' && myInsurances.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myInsurances.map((ins) => {
                  const isApproved = ins.status === 'Approved' || ins.status === 'मंजूर' || ins.status === 'मंजूर (Approved)';
                  const isRejected = ins.status === 'नामंजूर (Rejected)' || ins.status === 'Rejected' || ins.status === 'नामंजूर';
                  
                  // प्रमाणपत्र किंवा अप्रूव्ह्ड कॉपीची लिंक
                  const certificateLink = ins.certificateUrl || ins.approvedCopyUrl || ins.approvedCertificateUrl || ins.policyCopyUrl;

                  return (
                    <div key={ins.id} className="bg-[#0c0d14] border border-slate-800 hover:border-amber-500/40 transition-colors rounded-[24px] p-5 space-y-4 shadow-xl relative overflow-hidden">
                      
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">INSURANCE APPLICATION ID</span>
                          <span className="font-mono text-xs font-black text-amber-400">{ins.appId}</span>
                        </div>
                        {getStatusBadge(ins.status)}
                      </div>

                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                          <span className="text-xs font-extrabold text-amber-300">
                            गोविंदा व्यक्तिगत अपघात विमा योजना २०२६
                          </span>
                        </div>
                        {ins.policyNumber && (
                          <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">
                            पॉलिसी: {ins.policyNumber}
                          </span>
                        )}
                      </div>

                      <div className="space-y-2.5">
                        <h3 className="text-[17px] font-black text-white">{ins.teamName}</h3>
                        <div className="grid grid-cols-2 gap-2.5 text-xs text-slate-300 pt-1">
                          <p className="flex items-center gap-1.5 truncate">
                            <User className="w-4 h-4 text-amber-400 shrink-0"/> संपर्क: {ins.contactPerson}
                          </p>
                          <p className="flex items-center gap-1.5">
                            <Phone className="w-4 h-4 text-amber-400 shrink-0"/> {ins.whatsappNumber}
                          </p>
                          <p className="flex items-center gap-1.5 truncate">
                            <MapPin className="w-4 h-4 text-amber-400 shrink-0"/> जिल्हा: {ins.district} ({ins.pincode || '-'})
                          </p>
                          <p className="flex items-center gap-1.5">
                            <Trophy className="w-4 h-4 text-amber-400 shrink-0"/> थर क्षमता: <span className="font-bold text-white">{ins.pyramidCapacity}</span>
                          </p>
                        </div>
                      </div>

                      <div className="p-3 bg-[#12141f] rounded-xl border border-slate-800 flex justify-between items-center text-[11px] text-slate-400">
                        <span>प्रकार: <strong className="text-white">{ins.category || ins.type}</strong></span>
                        <span>विमा गोविंदा संख्या: <strong className="text-amber-400 font-bold">{ins.govindaCount} गोविंदा</strong></span>
                      </div>

                      {/* 🎓 APPROVED STATUS: SHOW OFFICIAL CERTIFICATE / APPROVED COPY */}
                      {isApproved && certificateLink && (
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                              <Award className="w-4 h-4" /> मंजूर विमा प्रमाणपत्र / कॉपी (Approved Certificate)
                            </span>
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleOpenPdfModal(certificateLink, "मंजूर विमा प्रमाणपत्र")}
                              className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer shadow-lg shadow-emerald-500/20"
                            >
                              <Eye className="w-4 h-4" /> मंजूर प्रत / Certificate पहा
                            </button>
                            <a
                              href={certificateLink}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 flex items-center justify-center transition"
                              title="डाऊनलोड करा"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          </div>
                        </div>
                      )}

                      {/* 🛑 ॲडमिनचे नाकारण्याचे कारण */}
                      {isRejected && ins.rejectReason && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl space-y-1">
                          <p className="text-[11px] font-bold text-red-400 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> अर्ज नाकारण्याचे कारण (Reject Reason):
                          </p>
                          <p className="text-xs text-red-200 leading-relaxed font-medium pl-4">
                            "{ins.rejectReason}"
                          </p>
                        </div>
                      )}

                      {/* 👁️ जुनी अपलोड केलेली लेटरहेड फाईल (FILE PREVIEW & DOWNLOAD) */}
                      {ins.fileUrl && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenPdfModal(ins.fileUrl, "तुमची लेटरहेड अर्ज प्रत")}
                            className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-slate-300 flex items-center justify-center gap-1.5 transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-amber-400" /> मूळ अर्ज लेटरहेड पहा
                          </button>

                          <a
                            href={ins.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-slate-300 flex items-center justify-center transition"
                            title="डाऊनलोड करा"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )}

                      {/* 📤 RE-UPLOAD OPTION FOR REJECTED APPLICATIONS */}
                      {isRejected && (
                        <div className="pt-1">
                          {reuploadingId === ins.id ? (
                            <div className="p-3 bg-slate-900 border border-amber-500/30 rounded-xl space-y-2">
                              <label className="text-[11px] font-bold text-amber-400 block">
                                नवीन सुधारित लेटरहेड यादी निवडा (फक्त PDF, Max 10MB):
                              </label>
                              <input 
                                type="file" 
                                accept="application/pdf"
                                onChange={(e) => setNewFile(e.target.files[0])}
                                className="text-xs text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-black cursor-pointer w-full"
                              />
                              <div className="flex gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => setReuploadingId(null)}
                                  className="flex-1 py-1.5 bg-slate-800 text-slate-300 text-xs font-bold rounded-lg cursor-pointer"
                                >
                                  रद्द करा
                                </button>
                                <button
                                  type="button"
                                  disabled={uploadLoading}
                                  onClick={() => handleReuploadSubmit(ins)}
                                  className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-lg transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                                >
                                  {uploadLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                                  पुन्हा सबमिट करा
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button 
                              onClick={() => setReuploadingId(ins.id)}
                              className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-extrabold text-xs rounded-xl transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <UploadCloud className="w-4 h-4" /> सुधारित फाईल / यादी पुन्हा अपलोड करा
                            </button>
                          )}
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

      </div>

      {/* 👁️ INLINE PDF PREVIEW MODAL */}
      {viewPdfUrl && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#0c0d14] border border-amber-500/40 w-full max-w-4xl h-[85vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            
            {/* Modal Header */}
            <div className="p-3.5 border-b border-slate-800 bg-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs sm:text-sm">
                <FileText className="w-4 h-4" /> {pdfTitle}
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={viewPdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1 bg-amber-500 text-black font-bold text-xs rounded-lg flex items-center gap-1 hover:bg-amber-400 transition"
                >
                  <Download className="w-3.5 h-3.5" /> डाऊनलोड
                </a>
                <button
                  onClick={() => setViewPdfUrl(null)}
                  className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Embedded PDF Frame */}
            <div className="flex-1 bg-slate-950 p-2 overflow-hidden relative">
              <iframe
                src={
                  viewPdfUrl.includes('drive.google.com')
                    ? `https://drive.google.com/file/d/${viewPdfUrl.match(/[-\w]{25,}/)?.[0]}/preview`
                    : `https://docs.google.com/gview?url=${encodeURIComponent(viewPdfUrl)}&embedded=true`
                }
                title="PDF Document Viewer"
                className="w-full h-full rounded-xl border border-slate-800"
              />
            </div>

          </div>
        </div>
      )}
      <Footer />
    </div>
  );
}