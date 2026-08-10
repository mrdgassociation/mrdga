import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { db } from '../firebase/config';
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import InsuranceAnalysisWidget from '../components/InsuranceAnalysisWidget';
import InsuranceInfoContent from '../components/InsuranceInfoContent';
import { dataService } from '../services/dataService';
import { 
  ShieldCheck, FileText, Download, Eye, X,
  PlusCircle, UploadCloud, Loader2, CheckCircle, ArrowRight, ArrowLeft,
  Users, Phone, TrendingUp
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';

// 📍 महाराष्ट्रातील सर्व जिल्ह्यांची यादी
const priorityDistricts = [
  { val: "Mumbai City", label: "मुंबई शहर (Mumbai City)" },
  { val: "Mumbai Suburban", label: "मुंबई उपनगर (Mumbai Suburban)" },
  { val: "Thane", label: "ठाणे (Thane)" },
  { val: "Palghar", label: "पालघर (Palghar)" },
  { val: "Raigad", label: "रायगड (Raigad)" },
  { val: "Pune", label: "पुणे (Pune)" },
  { val: "Ratnagiri", label: "रत्नागिरी (Ratnagiri)" },
  { val: "Sindhudurg", label: "सिंधुदुर्ग (Sindhudurg)" },
  { val: "Nashik", label: "नाशिक (Nashik)" },
  { val: "Kolhapur", label: "कोल्हापूर (Kolhapur)" },
  { val: "Sangli", label: "सांगली (Sangli)" },
  { val: "Satara", label: "सातारा (Satara)" }
];

const otherDistricts = [
  { val: "Ahilyanagar", label: "अहिल्यानगर (Ahmednagar)" },
  { val: "Akola", label: "अकोला (Akola)" },
  { val: "Amravati", label: "अमरावती (Amravati)" },
  { val: "Beed", label: "बीड (Beed)" },
  { val: "Bhandara", label: "भंडारा (Bhandara)" },
  { val: "Buldhana", label: "बुलढाणा (Buldhana)" },
  { val: "Chandrapur", label: "चंद्रपूर (Chandrapur)" },
  { val: "Chhatrapati Sambhajinagar", label: "छत्रपती संभाजीनगर (Aurangabad)" },
  { val: "Dhule", label: "धुळे (Dhule)" },
  { val: "Dharashiv", label: "धाराशिव (Osmanabad)" },
  { val: "Gadchiroli", label: "गडचिरोली (Gadchiroli)" },
  { val: "Gondia", label: "गोंदिया (Gondia)" },
  { val: "Hingoli", label: "हिंगोली (Hingoli)" },
  { val: "Jalgaon", label: "जळगाव (Jalgaon)" },
  { val: "Jalna", label: "जालना (Jalna)" },
  { val: "Latur", label: "लातूर (Latur)" },
  { val: "Nagpur", label: "नागपूर (Nagpur)" },
  { val: "Nanded", label: "नांदेड (Nanded)" },
  { val: "Nandurbar", label: "नंदुरबार (Nandurbar)" },
  { val: "Parbhani", label: "परभणी (Parbhani)" },
  { val: "Solapur", label: "सोलापूर (Solapur)" },
  { val: "Wardha", label: "वर्धा (Wardha)" },
  { val: "Washim", label: "वाशीम (Washim)" },
  { val: "Yavatmal", label: "यवतमाळ (Yavatmal)" },
  { val: "Other State / Out of Maharashtra", label: "इतर राज्य / महाराष्ट्राबाहेर" }
];

// 📱 STRICT REGEX PATTERNS
const phoneRegex = /^[6-9]\d{9}$/;
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const pincodeRegex = /^[1-9][0-9]{5}$/;

export default function InsuranceInfo() {
  const [activeTab, setActiveTab] = useState('info');
  const [showSampleModal, setShowSampleModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  
  // 🎯 1. फॉर्म ऑन/ऑफ स्टेट
  const [isFormActive, setIsFormActive] = useState(true);

  // 🎯 2. PageSettings ची स्थिती तपासणे (Admin Bypass सह)
  useEffect(() => {
    const checkFormStatus = async () => {
      try {
        const hashParts = window.location.hash.split('?');
        const searchParams = new URLSearchParams(hashParts[1] || '');
        const isAdminBypass = searchParams.get('admin_mode') === 'true';

        if (isAdminBypass) {
          setIsFormActive(true);
          setShowFormModal(true);
          return;
        }

        const config = await dataService.getPageConfig();
        if (config && config.insuranceForm === false) {
          setIsFormActive(false);
        } else {
          setIsFormActive(true);
        }
      } catch (err) {
        console.error("Config check error:", err);
      }
    };
    checkFormStatus();
  }, []);

  // 🎯 Form Step State (1, 2, 3)
  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState({
    teamName: '',
    type: 'Mandal',
    category: 'Mens',
    contactPerson: '',
    whatsappNumber: '',
    alternateNumber: '',
    email: '',
    district: 'Mumbai City',
    address: '',
    pincode: '',
    pyramidCapacity: '6 Layer',
    govindaCount: '',
    isAbove14: true,
    file: null
  });

  const [loading, setLoading] = useState(false);
  const [submittedId, setSubmittedId] = useState(null);

  const sampleFormatImgUrl = "https://i.ibb.co/N2FXL0R6/Whats-App-Image-2026-07-20-at-11-48-52-2.jpg"; 

  // 🎯 🆕 अद्ययावत सीक्वेन्शियल आयडी जनरेटर (फॉरमॅट: MRDGA-INS-YYYYMMDD-0001)
  const generateUniqueAppId = async () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateFormatted = `${year}${month}${day}`; // 20260810

    let serialNo = '0001';
    try {
      // डेटाबेसमधील एकूण अर्जांची संख्या + १
      const querySnapshot = await getDocs(collection(db, "insurance_requests_2026"));
      const count = querySnapshot.size + 1;
      serialNo = String(count).padStart(4, '0');
    } catch (e) {
      console.warn("Serial counter fallback triggered:", e);
      serialNo = String(Math.floor(1000 + Math.random() * 9000));
    }

    return `MRDGA-${dateFormatted}-${serialNo}`;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type !== 'checkbox' && /[\u0900-\u097F]/.test(value)) {
      Swal.fire({
        icon: 'warning',
        title: 'Only English Allowed!',
        text: 'कृपया मंडळाचे नाव व इतर माहिती फक्त इंग्रजी अक्षरांमध्येच टाईप करा.',
        confirmButtonColor: '#f59e0b',
        background: '#0c0d14',
        color: '#fff'
      });
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      if (selectedFile.type !== 'application/pdf') {
        Swal.fire({
          icon: 'warning',
          title: 'फक्त PDF फाईल निवडा!',
          text: 'कृपया मंडळाच्या लेटरहेडची फक्त PDF फाईलच अपलोड करा.',
          confirmButtonColor: '#f59e0b',
          background: '#0c0d14',
          color: '#fff'
        });
        e.target.value = null;
        return;
      }

      const MAX_SIZE_BYTES = 10 * 1024 * 1024;
      if (selectedFile.size > MAX_SIZE_BYTES) {
        Swal.fire({
          icon: 'error',
          title: 'फाईल खूप मोठी आहे!',
          text: `निवडलेली फाईल ${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB ची आहे. कृपया १० MB पेक्षा लहान PDF फाईल निवडा.`,
          confirmButtonColor: '#ef4444',
          background: '#0c0d14',
          color: '#fff'
        });
        e.target.value = null;
        return;
      }
      
      setFormData(prev => ({ ...prev, file: selectedFile }));
    }
  };

  const validateStep = (step) => {
    if (step === 1) {
      if (!formData.teamName.trim()) {
        Swal.fire({ icon: 'warning', title: 'मंडळाचे नाव टाका!', confirmButtonColor: '#f59e0b', background: '#0c0d14', color: '#fff' });
        return false;
      }
    } else if (step === 2) {
      if (!formData.contactPerson.trim()) {
        Swal.fire({ icon: 'warning', title: 'संपर्क व्यक्तीचे नाव टाका!', confirmButtonColor: '#f59e0b', background: '#0c0d14', color: '#fff' });
        return false;
      }

      if (!formData.whatsappNumber || !phoneRegex.test(formData.whatsappNumber.trim())) {
        Swal.fire({ 
          icon: 'warning', 
          title: 'अवैध व्हॉट्सॲप नंबर!', 
          text: 'कृपया ७, ८ किंवा ९ ने सुरू होणारा १० अंकी वैध मोबाईल नंबर टाका.', 
          confirmButtonColor: '#f59e0b', 
          background: '#0c0d14', 
          color: '#fff' 
        });
        return false;
      }

      if (formData.alternateNumber.trim() && !phoneRegex.test(formData.alternateNumber.trim())) {
        Swal.fire({ 
          icon: 'warning', 
          title: 'अवैध पर्यायी नंबर!', 
          text: 'पर्यायी नंबरसुद्धा वैध १० अंकी असणे आवश्यक आहे.', 
          confirmButtonColor: '#f59e0b', 
          background: '#0c0d14', 
          color: '#fff' 
        });
        return false;
      }

      if (!formData.email || !emailRegex.test(formData.email.trim())) {
        Swal.fire({ 
          icon: 'warning', 
          title: 'अवैध ई-मेल आयडी!', 
          text: 'कृपया अचूक ई-मेल आयडी टाका (उदा. mymandal@gmail.com).', 
          confirmButtonColor: '#f59e0b', 
          background: '#0c0d14', 
          color: '#fff' 
        });
        return false;
      }

      if (!formData.pincode || !pincodeRegex.test(formData.pincode.trim())) {
        Swal.fire({ 
          icon: 'warning', 
          title: 'अवैध पिनकोड!', 
          text: 'कृपया ६ अंकी अचूक भारतीय पिनकोड टाका (उदा. 400601).', 
          confirmButtonColor: '#f59e0b', 
          background: '#0c0d14', 
          color: '#fff' 
        });
        return false;
      }

      if (!formData.address.trim()) {
        Swal.fire({ icon: 'warning', title: 'पत्रव्यवहाराचा पत्ता टाका!', confirmButtonColor: '#f59e0b', background: '#0c0d14', color: '#fff' });
        return false;
      }
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  const convertFileToBase64 = async (file) => {
    const originalSizeBytes = file.size;
    const TWO_MB_BYTES = 2 * 1024 * 1024;

    if (originalSizeBytes <= TWO_MB_BYTES) {
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

        const compressedPdfBytes = await pdfDoc.save({
          useObjectStreams: true,
          addDefaultPage: false
        });

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.govindaCount || parseInt(formData.govindaCount) < 1) {
      Swal.fire({ icon: 'warning', title: 'गोविंदा संख्या टाका!', confirmButtonColor: '#f59e0b', background: '#0c0d14', color: '#fff' });
      return;
    }

    if (!formData.file) {
      Swal.fire({ icon: 'warning', title: 'लेटरहेडवर यादीची PDF फाईल अपलोड करा!', confirmButtonColor: '#f59e0b', background: '#0c0d14', color: '#fff' });
      return;
    }

    setLoading(true);

    try {
      // 🎯 क्रमवार नवीन App ID तयार केला
      const appId = await generateUniqueAppId();
      let uploadedFileUrl = "";

      if (formData.file) {
        const base64File = await convertFileToBase64(formData.file);
        const gasUrl = import.meta.env.VITE_GOOGLE_APP_SCRIPT_URL;

        const response = await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            fileName: `${formData.teamName}_${appId}_Letterhead.pdf`,
            fileType: formData.file.type,
            fileData: base64File
          })
        });

        const rawText = await response.text();
        try {
          const resData = JSON.parse(rawText);
          if (resData.status === 'success') {
            uploadedFileUrl = resData.fileUrl;
          }
        } catch (parseErr) {
          console.warn("GAS JSON Parse Warning:", parseErr);
        }
      }

      const phoneNumbers = [formData.whatsappNumber.trim()];
      if (formData.alternateNumber.trim()) {
        phoneNumbers.push(formData.alternateNumber.trim());
      }

      await addDoc(collection(db, "insurance_requests_2026"), {
        appId: appId,
        teamName: formData.teamName.trim(),
        type: formData.type,
        category: formData.category,
        contactPerson: formData.contactPerson.trim(),
        whatsappNumber: formData.whatsappNumber.trim(),
        alternateNumber: formData.alternateNumber.trim() || '',
        phoneNumbers: phoneNumbers,
        email: formData.email.trim().toLowerCase(),
        district: formData.district,
        address: formData.address.trim(),
        pincode: formData.pincode.trim(),
        pyramidCapacity: formData.pyramidCapacity,
        govindaCount: Number(formData.govindaCount),
        isAbove14: formData.isAbove14,
        fileUrl: uploadedFileUrl,
        status: 'प्रलंबित (Pending)',
        createdAt: serverTimestamp()
      });

      Swal.fire({
        icon: 'success',
        title: 'अर्ज सबमिट झाला!',
        text: `तुमचा विमा ॲप्लिकेशन आयडी: ${appId}`,
        confirmButtonColor: '#f59e0b',
        background: '#0c0d14',
        color: '#fff'
      });

      setSubmittedId(appId);

    } catch (err) {
      console.error("Submission Error:", err);
      Swal.fire({
        icon: 'error',
        title: 'त्रुटी आली!',
        text: 'अर्ज सादर करताना समस्या आली. कृपया तुमचे इंटरनेट कनेक्शन तपासा किंवा पुन्हा प्रयत्न करा.',
        confirmButtonColor: '#ef4444',
        background: '#0c0d14',
        color: '#fff'
      });
    } finally {
      setLoading(false);
    }
  };

  const resetFormModal = () => {
    setCurrentStep(1);
    setSubmittedId(null);
    setShowFormModal(false);
  };

  const handleOpenFormModal = () => {
    if (!isFormActive) {
      Swal.fire({
        icon: 'info',
        title: 'अर्ज स्वीकृती बंद आहे!',
        text: 'गोविंदा विमा अर्ज सादर करण्याची प्रक्रिया सध्या बंद करण्यात आली आहे.',
        confirmButtonColor: '#f59e0b',
        background: '#0c0d14',
        color: '#fff'
      });
      return;
    }
    resetFormModal();
    setShowFormModal(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#08090d] text-white font-sans">
      <Navbar />

      <main className="max-w-5xl mx-auto p-4 sm:p-6 flex-1 w-full space-y-6">

        {/* 🔘 TAB NAVIGATION BUTTONS */}
        <div className="flex border-b border-slate-800 gap-2">
          <button
            onClick={() => setActiveTab('info')}
            className={`py-2.5 px-5 font-extrabold text-xs sm:text-sm rounded-t-2xl transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'info'
                ? 'bg-[#0c0d14] border-t-2 border-amber-500 text-amber-400 border-x border-slate-800'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" /> विमा माहिती व अर्ज (Info & Form)
          </button>

          <button
            onClick={() => setActiveTab('analysis')}
            className={`py-2.5 px-5 font-extrabold text-xs sm:text-sm rounded-t-2xl transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'analysis'
                ? 'bg-[#0c0d14] border-t-2 border-amber-500 text-amber-400 border-x border-slate-800'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-4 h-4" /> सविस्तर विश्लेषण (Detailed Analysis)
          </button>
        </div>

        {/* 📄 PAGE HEADER */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-500/15 via-[#0c0d14] to-[#0c0d14] border border-amber-500/30 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-amber-500 text-black font-extrabold text-[10px] rounded-lg uppercase tracking-wider">
                अधिकृत विमा सुरक्षा माहिती
              </span>
              <span className="px-2.5 py-1 bg-slate-800 text-amber-400 font-mono text-[10px] font-bold rounded-lg border border-amber-500/20">
                गोपाळकाला २०२६
              </span>
            </div>

            <button
              onClick={handleOpenFormModal}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" /> नवीन विमा अर्ज करा
            </button>
          </div>

          <h1 className="text-xl sm:text-3xl font-black text-white flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-amber-400 shrink-0" />
            गोविंदा पथक व्यक्तिगत अपघात विमा योजना २०२६
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            दि ओरिएंटल इन्शुरन्स कंपनी लि. (भारत सरकारचा उपक्रम) यांच्या सहकार्याने सर्व नोंदणीकृत गोविंदांना सामाजिक सुरक्षा व विमा संरक्षण देण्याचा उपक्रम.
          </p>
        </div>

        {/* ---------------- TAB 1: INFO & BASIC WIDGET ---------------- */}
        {activeTab === 'info' && (
          <div className="space-y-6">
            <InsuranceAnalysisWidget mode="basic" />
            <InsuranceInfoContent onOpenSampleModal={() => setShowSampleModal(true)} />
          </div>
        )}

        {/* ---------------- TAB 2: DETAILED DISTRICT ANALYSIS ---------------- */}
        {activeTab === 'analysis' && (
          <div className="space-y-6">
            <InsuranceAnalysisWidget mode="detailed" />
          </div>
        )}

      </main>

      {/* SAMPLE FORMAT MODAL */}
      {showSampleModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c0d14] border border-amber-500/30 max-w-2xl w-full rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
              <h3 className="text-xs sm:text-sm font-bold text-amber-400 flex items-center gap-2">
                <FileText className="w-4 h-4" /> मंडळाच्या लेटरहेडचा अधिकृत नमुना
              </h3>
              <button 
                onClick={() => setShowSampleModal(false)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 flex justify-center bg-slate-950">
              <img 
                src={sampleFormatImgUrl} 
                alt="Letterhead Sample Format" 
                className="max-w-full h-auto rounded-xl border border-slate-800 shadow-lg object-contain"
              />
            </div>

            <div className="p-4 border-t border-slate-800 flex justify-between items-center bg-slate-900">
              <p className="text-[11px] text-slate-400">विमा अर्ज सबमिट करताना याच फॉरमॅटचा वापर करावा.</p>
              <a 
                href={sampleFormatImgUrl} 
                target="_blank" 
                rel="noreferrer"
                download="Govinda_Insurance_Letterhead_Format.jpg"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" /> डाउनलोड करा
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 MULTI-STEP INSURANCE APPLICATION FORM MODAL */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-1.5 sm:p-4 overflow-y-auto">
          <div className="bg-[#0c0d14] border border-amber-500/40 w-[96%] sm:w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col my-auto max-h-[94vh]">
            
            {/* Modal Header */}
            <div className="p-3.5 sm:p-4 border-b border-slate-800 bg-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
                <h3 className="font-extrabold text-base sm:text-lg text-white">
                  गोविंदा विमा अर्ज २०२६
                </h3>
              </div>
              <button 
                onClick={resetFormModal}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 sm:p-6 overflow-y-auto space-y-5">
              {submittedId ? (
                <div className="text-center py-8 space-y-4">
                  <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="w-10 h-10" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xl font-black text-white">अर्ज यशस्वीरीत्या सादर झाला!</h4>
                    <p className="text-sm text-slate-300">तुमचा अर्ज पुढील पडताळणीसाठी पाठवण्यात आला आहे.</p>
                  </div>
                  <div className="p-4 bg-slate-900 rounded-2xl border border-amber-500/30 max-w-sm mx-auto space-y-1">
                    <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">तुमचा विमा अर्ज आयडी</span>
                    <p className="text-xl font-mono font-bold text-amber-400">{submittedId}</p>
                  </div>
                  <p className="text-xs text-amber-400/90 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 max-w-sm mx-auto">
                    💡 अर्जाची स्थिती पाहण्यासाठी युझर पोर्टलवरील <strong>"My Status"</strong> या टॅबवर जा.
                  </p>
                  <button
                    onClick={resetFormModal}
                    className="px-6 py-2.5 bg-amber-500 text-black font-extrabold text-sm rounded-xl cursor-pointer"
                  >
                    बंद करा
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  
                  {/* 🎯 STEP PROGRESS INDICATOR */}
                  <div className="flex items-center justify-between px-1 sm:px-6">
                    <div className={`flex items-center gap-1.5 text-xs sm:text-sm font-bold ${currentStep >= 1 ? 'text-amber-400' : 'text-slate-500'}`}>
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${currentStep >= 1 ? 'bg-amber-500 text-black' : 'bg-slate-800 text-slate-400'}`}>१</span>
                      <span className="hidden sm:inline">मंडळ माहिती</span>
                    </div>
                    <div className={`h-0.5 flex-1 mx-2 ${currentStep >= 2 ? 'bg-amber-500' : 'bg-slate-800'}`}></div>
                    <div className={`flex items-center gap-1.5 text-xs sm:text-sm font-bold ${currentStep >= 2 ? 'text-amber-400' : 'text-slate-500'}`}>
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${currentStep >= 2 ? 'bg-amber-500 text-black' : 'bg-slate-800 text-slate-400'}`}>२</span>
                      <span className="hidden sm:inline">संपर्क व पत्ता</span>
                    </div>
                    <div className={`h-0.5 flex-1 mx-2 ${currentStep >= 3 ? 'bg-amber-500' : 'bg-slate-800'}`}></div>
                    <div className={`flex items-center gap-1.5 text-xs sm:text-sm font-bold ${currentStep >= 3 ? 'text-amber-400' : 'text-slate-500'}`}>
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${currentStep >= 3 ? 'bg-amber-500 text-black' : 'bg-slate-800 text-slate-400'}`}>३</span>
                      <span className="hidden sm:inline">थरांचे प्रमाण व फाईल</span>
                    </div>
                  </div>

                  {/* 📝 STEP 1: MANDAL DETAILS */}
                  {currentStep === 1 && (
                    <div className="space-y-4 bg-slate-900/50 p-3.5 sm:p-5 rounded-2xl border border-slate-800">
                      <h4 className="text-xs sm:text-sm font-bold text-amber-400 uppercase tracking-wider border-b border-slate-800 pb-2.5 flex items-center gap-2">
                        <Users className="w-4 h-4" /> टप्पा १: मंडळ व गट माहिती
                      </h4>

                      <div className="space-y-3.5">
                        <div>
                          <label className="text-xs sm:text-sm font-bold text-slate-200 block mb-1.5">मंडळाचे नाव *</label>
                          <input 
                            type="text" 
                            name="teamName"
                            required
                            value={formData.teamName}
                            onChange={handleInputChange}
                            placeholder="उदा. Jai Bajrang Govinda Pathak"
                            className="w-full px-3.5 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div>
                            <label className="text-xs sm:text-sm font-bold text-slate-200 block mb-1.5">मंडळाचा प्रकार (Type)</label>
                            <select 
                              name="type"
                              value={formData.type}
                              onChange={handleInputChange}
                              className="w-full px-3.5 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500 font-semibold"
                            >
                              <option value="Mandal">मंडळ (Mandal)</option>
                              <option value="Trust">रजिस्टर्ड ट्रस्ट (Trust)</option>
                              <option value="Association">असोसिएशन (Association)</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-xs sm:text-sm font-bold text-slate-200 block mb-1.5">पथक प्रकार (Category) *</label>
                            <select 
                              name="category"
                              value={formData.category}
                              onChange={handleInputChange}
                              className="w-full px-3.5 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500 font-bold"
                            >
                              <option value="Mens">पुरुष पथक (Mens Team)</option>
                              <option value="Womens">महिला पथक (Womens Team)</option>
                              <option value="Both">संयुक्त / दोन्ही (Both Mens & Womens)</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={handleNextStep}
                          className="w-full sm:w-auto px-6 py-3 bg-amber-500 text-black font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 hover:bg-amber-400 cursor-pointer shadow-lg shadow-amber-500/20"
                        >
                          पुढील टप्पा <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 📝 STEP 2: CONTACT & ADDRESS DETAILS */}
                  {currentStep === 2 && (
                    <div className="space-y-4 bg-slate-900/50 p-3.5 sm:p-5 rounded-2xl border border-slate-800">
                      <h4 className="text-xs sm:text-sm font-bold text-amber-400 uppercase tracking-wider border-b border-slate-800 pb-2.5 flex items-center gap-2">
                        <Phone className="w-4 h-4" /> टप्पा २: संपर्क, ई-मेल व पत्ता
                      </h4>

                      <div className="space-y-3.5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div>
                            <label className="text-xs sm:text-sm font-bold text-slate-200 block mb-1.5">संपर्क व्यक्तीचे नाव *</label>
                            <input 
                              type="text" 
                              name="contactPerson"
                              required
                              value={formData.contactPerson}
                              onChange={handleInputChange}
                              placeholder="अध्यक्ष / सचिव यांचे नाव (In English)"
                              className="w-full px-3.5 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                            />
                          </div>

                          <div>
                            <label className="text-xs sm:text-sm font-bold text-slate-200 block mb-1.5">व्हॉट्सॲप नंबर (मुख्य) *</label>
                            <input 
                              type="tel" 
                              name="whatsappNumber"
                              required
                              maxLength={10}
                              value={formData.whatsappNumber}
                              onChange={(e) => {
                                const onlyNums = e.target.value.replace(/[^0-9]/g, '');
                                setFormData(prev => ({ ...prev, whatsappNumber: onlyNums }));
                              }}
                              placeholder="10 digit WhatsApp number"
                              className="w-full px-3.5 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 font-mono font-bold"
                            />
                          </div>

                          <div>
                            <label className="text-xs sm:text-sm font-bold text-slate-200 block mb-1.5">पर्यायी फोन नंबर (Alternate No.)</label>
                            <input 
                              type="tel" 
                              name="alternateNumber"
                              maxLength={10}
                              value={formData.alternateNumber}
                              onChange={(e) => {
                                const onlyNums = e.target.value.replace(/[^0-9]/g, '');
                                setFormData(prev => ({ ...prev, alternateNumber: onlyNums }));
                              }}
                              placeholder="पर्यायी कॉल / व्हॉट्सॲप नंबर"
                              className="w-full px-3.5 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 font-mono font-bold"
                            />
                          </div>

                          <div>
                            <label className="text-xs sm:text-sm font-bold text-slate-200 block mb-1.5">ई-मेल आयडी (लॉगिन ई-मेल) *</label>
                            <input 
                              type="email" 
                              name="email"
                              required
                              value={formData.email}
                              onChange={handleInputChange}
                              placeholder="example@gmail.com"
                              className="w-full px-3.5 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div>
                            <label className="text-xs sm:text-sm font-bold text-slate-200 block mb-1.5">जिल्हा *</label>
                            <select 
                              name="district"
                              value={formData.district}
                              onChange={handleInputChange}
                              className="w-full px-3.5 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500 font-semibold"
                            >
                              <optgroup label="प्रमुख जिल्हे (Priority Districts)">
                                {priorityDistricts.map((d) => (
                                  <option key={d.val} value={d.val}>{d.label}</option>
                                ))}
                              </optgroup>
                              <optgroup label="इतर सर्व जिल्हे (Other Districts)">
                                {otherDistricts.map((d) => (
                                  <option key={d.val} value={d.val}>{d.label}</option>
                                ))}
                              </optgroup>
                            </select>
                          </div>

                          <div>
                            <label className="text-xs sm:text-sm font-bold text-slate-200 block mb-1.5">पिनकोड (Pincode) *</label>
                            <input 
                              type="text" 
                              name="pincode"
                              required
                              maxLength={6}
                              value={formData.pincode}
                              onChange={(e) => {
                                const onlyNums = e.target.value.replace(/[^0-9]/g, '');
                                setFormData(prev => ({ ...prev, pincode: onlyNums }));
                              }}
                              placeholder="उदा. 400601"
                              className="w-full px-3.5 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500 font-mono font-bold"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs sm:text-sm font-bold text-slate-200 block mb-1.5">पत्रव्यवहाराचा पत्ता *</label>
                          <textarea 
                            name="address"
                            required
                            rows={2}
                            value={formData.address}
                            onChange={handleInputChange}
                            placeholder="पूर्ण पत्ता टाका (In English)"
                            className="w-full px-3.5 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>

                      <div className="pt-3 flex justify-between gap-3">
                        <button
                          type="button"
                          onClick={handlePrevStep}
                          className="px-4 py-3 bg-slate-800 text-slate-300 font-bold text-xs sm:text-sm rounded-xl flex items-center gap-1.5 hover:bg-slate-700 cursor-pointer"
                        >
                          <ArrowLeft className="w-4 h-4" /> मागील
                        </button>
                        <button
                          type="button"
                          onClick={handleNextStep}
                          className="px-6 py-3 bg-amber-500 text-black font-extrabold text-xs sm:text-sm rounded-xl flex items-center gap-1.5 hover:bg-amber-400 cursor-pointer shadow-lg shadow-amber-500/20"
                        >
                          पुढील टप्पा <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 📝 STEP 3: PYRAMID, COUNT & PDF FILE UPLOAD */}
                  {currentStep === 3 && (
                    <form onSubmit={handleSubmit} className="space-y-4 bg-slate-900/50 p-3.5 sm:p-5 rounded-2xl border border-slate-800">
                      <h4 className="text-xs sm:text-sm font-bold text-amber-400 uppercase tracking-wider border-b border-slate-800 pb-2.5 flex items-center gap-2">
                        <FileText className="w-4 h-4" /> टप्पा ३: थरांचे प्रमाण, संख्या व फाईल
                      </h4>

                      <div className="space-y-3.5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div>
                            <label className="text-xs sm:text-sm font-bold text-slate-200 block mb-1.5">थर क्षमता (Pyramid Capacity)</label>
                            <select 
                              name="pyramidCapacity"
                              value={formData.pyramidCapacity}
                              onChange={handleInputChange}
                              className="w-full px-3.5 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500 font-semibold"
                            >
                              <option value="4 Layer">४ थर</option>
                              <option value="5 Layer">५ थर</option>
                              <option value="6 Layer">६ थर</option>
                              <option value="7 Layer">७ थर</option>
                              <option value="8 Layer">८ थर</option>
                              <option value="9 Layer">९ थर</option>
                              <option value="10 Layer">१० थर</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-xs sm:text-sm font-bold text-slate-200 block mb-1.5">विमा करावयाच्या गोविंदांची संख्या *</label>
                            <input 
                              type="number" 
                              name="govindaCount"
                              required
                              min={1}
                              value={formData.govindaCount}
                              onChange={handleInputChange}
                              placeholder="उदा. 100"
                              className="w-full px-3.5 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500 font-mono font-bold"
                            />
                          </div>
                        </div>

                        <label className="flex items-start gap-2.5 p-3 bg-slate-900/80 rounded-xl border border-slate-800 cursor-pointer">
                          <input 
                            type="checkbox"
                            name="isAbove14"
                            checked={formData.isAbove14}
                            onChange={handleInputChange}
                            className="w-5 h-5 accent-amber-500 rounded mt-0.5 shrink-0"
                          />
                          <span className="text-xs sm:text-sm text-slate-200 leading-snug">
                            मी खात्री देतो की सर्व विमाधारक गोविंदांचे वय १४ वर्षांपेक्षा जास्त आहे.
                          </span>
                        </label>

                        <div className="p-4 border-2 border-dashed border-slate-800 hover:border-amber-500/50 rounded-2xl bg-slate-900/50 text-center space-y-2.5">
                          <UploadCloud className="w-8 h-8 text-amber-400 mx-auto" />
                          <div className="space-y-1">
                            <p className="text-xs sm:text-sm font-bold text-slate-200">लेटरहेडवरील सही-शिक्क्यासह यादी अपलोड करा</p>
                            <p className="text-xs text-amber-400 font-bold">फक्त PDF फाईल (Max 10 MB)</p>
                          </div>
                          <input 
                            type="file" 
                            accept="application/pdf"
                            required
                            onChange={handleFileChange}
                            className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-extrabold file:bg-amber-500 file:text-black hover:file:bg-amber-400 cursor-pointer"
                          />
                        </div>
                      </div>

                      <div className="pt-3 flex justify-between items-center gap-3">
                        <button
                          type="button"
                          onClick={handlePrevStep}
                          className="px-4 py-3 bg-slate-800 text-slate-300 font-bold text-xs sm:text-sm rounded-xl flex items-center gap-1.5 hover:bg-slate-700 cursor-pointer"
                        >
                          <ArrowLeft className="w-4 h-4" /> मागील
                        </button>

                        <button
                          type="submit"
                          disabled={loading}
                          className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs sm:text-sm rounded-xl transition shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          {loading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              सबमिट होत आहे...
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="w-5 h-5" />
                              विमा अर्ज सबमिट करा
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )}

                </div>
              )}
            </div>

          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}