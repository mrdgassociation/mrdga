import React, { useState } from 'react';
import Swal from 'sweetalert2';
import { db } from '../firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { 
  ShieldCheck, HeartHandshake, AlertCircle, Clock, 
  FileText, PhoneCall, CheckCircle2, Building2, Download, Eye, X,
  PlusCircle, UploadCloud, Loader2, CheckCircle, ArrowRight, ArrowLeft,
  Users, Phone
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';

// 📍 महाराष्ट्रातील सर्व जिल्ह्यांची यादी (Priority + Remaining Districts)
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

const insuranceRequirementsList = [
  { id: 1, text: "ओरिएंटल इन्शुरन्स नावाने मंडळाच्या लेटरहेडवर गोविंदाचे नाव व वय अशी यादी तयार करून आणणे." },
  { id: 2, text: "ही सर्व कागदपत्रे मूळ प्रत (Original Letterhead) व एक झेरॉक्स प्रत घेऊन येणे." },
  { id: 3, text: "सोबत धनादेश (Cheque) किंवा रोख रक्कम (₹ ७५/- प्रत्येकी) याप्रमाणे देणे." }
];

const insuranceTermsAndConditions = [
  { id: 1, text: "नाम निर्देश केलेल्या व्यक्ती." },
  { id: 2, text: "फक्त अपघात झालेल्या दुखापतीमुळे रुग्णालयात रहावयास लागल्यास." },
  { id: 3, text: "जर एक दिवस किंवा त्यापेक्षा कमी अवधी रुग्णालयात दुखापतीच्या स्वरूपानुसार रहावे लागल्यास वैद्यकीय अधिका-यांचा दाखला घेणे आवश्यक राहील." },
  { id: 4, text: "रुपये १०००/- पेक्षा कमी रकमेचा दावा स्वीकारला जाणार नाही." },
  { id: 5, text: "रुग्णालयात दाखल न होता घरगुती किंवा बाह्य रुग्ण विभागात औषधोपचार घेणा-यास विमा संरक्षण लागू होणार नाही." }
];

const insuranceClaimRequirements = [
  { id: 1, text: "विमा कंपनीस अपघाताची सूचना (खबर) तात्काळ देणे." },
  { id: 2, text: "अपघाताची प्रथम सूचना (खबर) अहवाल व पंचनामा पोलिस स्टेशन." },
  { id: 3, text: "हॉस्पिटलमधून घरी पाठविल्याचा दाखला व एक्स-रे रिपोर्ट." },
  { id: 4, text: "संबंधीत औषध-पाण्याचे हॉस्पिटलचे कागदपत्र व बिल आणि वैद्यकीय इलाज करणा-या डॉक्टरांचे सर्टिफिकेट." },
  { id: 5, text: "रोग चिकित्सा/रोगाचे निदान यांचे अहवाल व शासकीय किंवा शवपरिक्षा अहवाल सादर करणे आवश्यक आहे." },
  { id: 6, text: "मृत्यू झालेला असल्यास मयताच्या मृत्यूचा दाखला शवपरीक्षा अहवाल सादर करणे आवश्यक आहे." },
  { id: 7, text: "हॉस्पिटलची बिले, बाहेरील औषधांची बिले व हॉस्पिटलच्या वैद्यकिय अधिका-याने सुचविलेली औषधयोजना यांचे हॉस्पिटलचे पत्रक." },
  { id: 8, text: "विमा दावा करण्याचा अर्ज संपूर्णपणे भरुन व त्यावर दावा करणा-याची सही व कोरा धनादेश." },
  { id: 9, text: "विमा दाव्याची रक्कम अपघातग्रस्त व्यक्ती किंवा त्याच्या वारसास RTGS/NEFT द्वारे केली जाईल.", isHighlight: true }
];

export default function InsuranceInfo() {
  const [showSampleModal, setShowSampleModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  
  // 🎯 Form Step State (1, 2, 3)
  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState({
    teamName: '',
    type: 'Mandal',
    category: 'Mens', // Mens | Womens | Both
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

  const generateUniqueAppId = (phone) => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const suffix = phone ? phone.slice(-4) : '0000';
    return `MRDGA-INS-2026-${suffix}-${randomNum}`;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // 🛑 १. फक्त PDF फाईलच स्वीकारणे
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

      // 🛑 २. १० MB पेक्षा मोठ्या फाईलला अटकाव (10 MB Limit Restriction)
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

  // 🎯 Step Validation Helper
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
      if (!formData.whatsappNumber || formData.whatsappNumber.length < 10) {
        Swal.fire({ icon: 'warning', title: 'वैध १० अंकी व्हॉट्सॲप नंबर टाका!', confirmButtonColor: '#f59e0b', background: '#0c0d14', color: '#fff' });
        return false;
      }
      // 📧 Strict Email Validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!formData.email || !emailRegex.test(formData.email.trim())) {
        Swal.fire({ icon: 'warning', title: 'वैध ई-मेल आयडी टाका!', text: 'उदा. mymandal@gmail.com', confirmButtonColor: '#f59e0b', background: '#0c0d14', color: '#fff' });
        return false;
      }
      if (!formData.address.trim()) {
        Swal.fire({ icon: 'warning', title: 'पत्रव्यवहाराचा पत्ता टाका!', confirmButtonColor: '#f59e0b', background: '#0c0d14', color: '#fff' });
        return false;
      }
      if (!formData.pincode || formData.pincode.length < 6) {
        Swal.fire({ icon: 'warning', title: 'वैध ६ अंकी पिनकोड टाका!', confirmButtonColor: '#f59e0b', background: '#0c0d14', color: '#fff' });
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

  // 🗜️ Smart PDF Converter (Bypasses small files < 2MB automatically)
  const convertFileToBase64 = async (file) => {
    const originalSizeBytes = file.size;
    const TWO_MB_BYTES = 2 * 1024 * 1024; // 2 MB

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
      const appId = generateUniqueAppId(formData.whatsappNumber);
      let uploadedFileUrl = "";

      // 📤 १. Google Drive मध्ये File Upload (Apps Script)
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

      // 📞 सर्व फोन नंबर एकाच Array मध्ये ठेवणे (शोधासाठी सोपे)
      const phoneNumbers = [formData.whatsappNumber.trim()];
      if (formData.alternateNumber.trim()) {
        phoneNumbers.push(formData.alternateNumber.trim());
      }

      // 💾 २. Firestore मध्ये Data Save करणे
      await addDoc(collection(db, "insurance_requests_2026"), {
        appId: appId,
        teamName: formData.teamName.trim(),
        type: formData.type,
        category: formData.category, // Mens | Womens | Both
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

      // 🎉 Success Popup
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

  return (
    <div className="min-h-screen flex flex-col bg-[#08090d] text-white font-sans">
      <Navbar />

      <main className="max-w-5xl mx-auto p-4 sm:p-6 flex-1 w-full space-y-6">

        {/* PAGE HEADER */}
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

            {/* ACTION BUTTON */}
            <button
              onClick={() => { resetFormModal(); setShowFormModal(true); }}
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

        {/* EFFORTS SECTION */}
        <div className="p-5 rounded-2xl bg-[#0c0d14] border border-slate-800 space-y-2.5">
          <h2 className="text-sm sm:text-base font-extrabold text-amber-400 flex items-center gap-2">
            <HeartHandshake className="w-5 h-5 text-amber-400" /> 
            MRDGA असोसिएशनचे सातत्यपूर्ण प्रयत्न
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            गोविंदा पथकातील खेळाडूंच्या सुरक्षेचा विचार करून, महाराष्ट्र राज्य दहीहंडी गोविंदा असोसिएशन (MRDGA) तर्फे महाराष्ट्र शासन, नगरविकास विभाग आणि विमा कंपन्यांशी सातत्याने पाठपुरावा व बैठका घेतल्या जातात. विम्याचा हप्ता (Premium) सर्वसामान्य गोविंदांच्या खिशाला परवडणारा राहावा आणि कोणत्याही दुर्घटनेच्या वेळी जास्तीत जास्त नुकसान भरपाई व वैद्यकीय मदत मिळावी, यासाठी असोसिएशन कटिबद्ध आहे.
          </p>
        </div>

        {/* REQUIREMENTS SECTION */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#0c0d14] border-2 border-amber-500/40 space-y-4 shadow-xl">
          <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-black text-amber-400 uppercase tracking-wide flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400 shrink-0" /> 
                विमा काढण्यासाठी आवश्यक बाबी
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">नोंदणीकृत गोविंदा मंडळाने विमा अर्ज सबमिट करताना पाळावयाची नियमावली</p>
            </div>

            <div className="text-xs font-extrabold bg-amber-500/10 border border-amber-500/30 text-amber-400 px-3 py-1.5 rounded-xl w-fit">
              विमा हप्ता: ₹ ७५/- (GST सह) प्रति गोविंदा
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {insuranceRequirementsList.map((item) => (
              <div key={item.id} className="p-3.5 bg-slate-900/80 rounded-2xl border border-slate-800 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-xs text-slate-200 leading-relaxed font-medium">{item.text}</span>
              </div>
            ))}
          </div>

          {/* Sample Format */}
          <div className="p-4 rounded-xl bg-slate-900 border border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="space-y-0.5 text-center sm:text-left">
              <h4 className="text-xs font-bold text-white flex items-center justify-center sm:justify-start gap-1.5">
                <span>📋</span> मंडळाच्या लेटरहेडवर यादी कशी तयार करावी? (Sample Format)
              </h4>
              <p className="text-[11px] text-slate-400">विमा अर्जासोबत द्यावयाच्या यादीचा अधिकृत नमुना येथे पहा व डाउनलोड करा.</p>
            </div>

            <button
              onClick={() => setShowSampleModal(true)}
              className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Eye className="w-3.5 h-3.5" /> नमुना फॉरमॅट पहा
            </button>
          </div>
        </div>

        {/* DURATION & CONDITIONS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-[#0c0d14] border border-slate-800 space-y-3">
            <h3 className="text-xs sm:text-sm font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
              <Clock className="w-4 h-4 text-amber-400 shrink-0" /> विमा संरक्षणाचा अवधी
            </h3>
            <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1.5 text-xs text-slate-200 leading-relaxed">
              <p><b className="text-amber-400">प्रारंभ:</b> २९ जुलै, २०२६ (किंवा विमा प्रिमियम भरल्यापासून सराव सत्रादरम्यान)</p>
              <p><b className="text-amber-400">समाप्ती:</b> ०६ सप्टेंबर, २०२६ पहाटे ६.०० वा. पर्यंत</p>
            </div>
            <p className="text-[11px] text-slate-400">
              * टीप: सर्व गोविंदा पथक सदस्यांचे वय १४ वर्षांपेक्षा जास्त असणे आवश्यक आहे.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#0c0d14] border border-slate-800 space-y-3">
            <h3 className="text-xs sm:text-sm font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" /> खालील अटींना अनुसरून विमा संरक्षण
            </h3>
            <div className="space-y-1.5 text-xs text-slate-300">
              {insuranceTermsAndConditions.map((item) => (
                <div key={item.id} className="p-2 bg-slate-900/50 rounded-xl border border-slate-800/80 flex items-start gap-2">
                  <span className="text-amber-400 font-bold shrink-0">{item.id}.</span>
                  <span className="leading-tight">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* COVERAGE TABLE */}
        <div className="p-5 rounded-2xl bg-[#0c0d14] border border-slate-800 space-y-4">
          <div className="border-b border-slate-800 pb-2">
            <h3 className="font-extrabold text-sm sm:text-base text-white">विमा संरक्षण रक्कमेचा तक्ता</h3>
            <p className="text-[11px] text-slate-400">अटी व शर्तींनुसार देय असणारी नुकसान भरपाई</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900 text-amber-400 font-extrabold border-b border-slate-800">
                  <th className="p-3 border border-slate-800 w-12 text-center">अ.क्र.</th>
                  <th className="p-3 border border-slate-800">तपशील (नुकसान / दुखापत प्रकार)</th>
                  <th className="p-3 border border-slate-800 text-right">नुकसान भरपाई रक्कम</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200 font-medium">
                <tr className="hover:bg-slate-900/40">
                  <td className="p-3 border border-slate-800 text-center font-mono">१</td>
                  <td className="p-3 border border-slate-800 font-bold text-white">अपघाती मृत्यू</td>
                  <td className="p-3 border border-slate-800 text-right font-mono font-bold text-emerald-400">₹ १०,००,०००/-</td>
                </tr>
                <tr className="hover:bg-slate-900/40">
                  <td className="p-3 border border-slate-800 text-center font-mono">२</td>
                  <td className="p-3 border border-slate-800 font-bold text-white">दोन अवयव किंवा दोन डोळे गमावल्यास</td>
                  <td className="p-3 border border-slate-800 text-right font-mono font-bold text-emerald-400">₹ १०,००,०००/-</td>
                </tr>
                <tr className="hover:bg-slate-900/40">
                  <td className="p-3 border border-slate-800 text-center font-mono">३</td>
                  <td className="p-3 border border-slate-800">एक हात, एक पाय किंवा एक डोळा गमावल्यास</td>
                  <td className="p-3 border border-slate-800 text-right font-mono font-bold text-amber-400">₹ ५,००,०००/-</td>
                </tr>
                <tr className="hover:bg-slate-900/40">
                  <td className="p-3 border border-slate-800 text-center font-mono">४</td>
                  <td className="p-3 border border-slate-800 font-bold text-white">कायम स्वरूपी अपंगत्व</td>
                  <td className="p-3 border border-slate-800 text-right font-mono font-bold text-emerald-400">₹ १०,००,०००/-</td>
                </tr>
                <tr className="hover:bg-slate-900/40">
                  <td className="p-3 border border-slate-800 text-center font-mono">५</td>
                  <td className="p-3 border border-slate-800">कायम अपूर्ण / पक्षघाती अपंगत्व</td>
                  <td className="p-3 border border-slate-800 text-right font-mono text-slate-300">% पॉलिसी दरानुसार</td>
                </tr>
                <tr className="hover:bg-slate-900/40">
                  <td className="p-3 border border-slate-800 text-center font-mono">६</td>
                  <td className="p-3 border border-slate-800 font-bold text-amber-300">अपघातग्रस्त व्यक्तीस रुग्णालयात राहावे लागल्यास (Hospitalization)</td>
                  <td className="p-3 border border-slate-800 text-right font-mono font-bold text-amber-400">प्रत्यक्ष खर्च किंवा ₹ २,००,०००/- (जे कमी असेल)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* CLAIM PROCEDURE */}
        <div className="p-5 rounded-2xl bg-[#0c0d14] border border-amber-500/30 space-y-3">
          <div className="border-b border-slate-800 pb-2">
            <h3 className="text-xs sm:text-sm font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              विम्याची नुकसान भरपाईसाठी दावा करण्याची कार्यपद्धती व कागदपत्रे
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">(दि ओरिएंटल इन्शुरन्स कंपनी लि. द्वारे अधिकृत नियम)</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs text-slate-200">
            {insuranceClaimRequirements.map((item) => (
              <div 
                key={item.id} 
                className={`p-3 rounded-xl border flex items-start gap-2 ${
                  item.isHighlight 
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 font-semibold' 
                    : 'bg-slate-900/60 border-slate-800/80'
                }`}
              >
                <span className="text-amber-400 font-bold">•</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* OFFICIAL CONTACT DETAILS */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-[#0c0d14] border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" /> विमा कंपनी संपर्क कार्यालय
            </span>
            <h4 className="font-extrabold text-sm text-white">दि ओरिएंटल इन्शुरन्स कंपनी लिमिटेड</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              मुंबई मंडलीय कार्यालय क्र. १, ओरिएंटल हाऊस, ४ था मजला, ७ जे. टाटा रोड, चर्चगेट, मुंबई - ४०००२०
            </p>
            <p className="text-xs text-amber-300 font-semibold pt-1">शाखा प्रबंधक: सौ. शिल्पा पवार</p>
          </div>

          <a 
            href="tel:8422919066" 
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-xl transition flex items-center gap-2 shadow-lg shadow-emerald-500/20 shrink-0 cursor-pointer"
          >
            <PhoneCall className="w-4 h-4" /> कॉल करा: 8422919066
          </a>
        </div>

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
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[#0c0d14] border border-amber-500/40 max-w-2xl w-full rounded-3xl overflow-hidden shadow-2xl flex flex-col my-auto max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-sm sm:text-base text-white">
                  गोविंदा विमा अर्ज २०२६
                </h3>
              </div>
              <button 
                onClick={resetFormModal}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
              {submittedId ? (
                <div className="text-center py-8 space-y-4">
                  <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="w-10 h-10" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-lg font-black text-white">अर्ज यशस्वीरीत्या सादर झाला!</h4>
                    <p className="text-xs text-slate-300">तुमचा अर्ज पुढील पडताळणीसाठी पाठवण्यात आला आहे.</p>
                  </div>
                  <div className="p-4 bg-slate-900 rounded-2xl border border-amber-500/30 max-w-sm mx-auto space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">तुमचा विमा अर्ज आयडी</span>
                    <p className="text-lg font-mono font-bold text-amber-400">{submittedId}</p>
                  </div>
                  <p className="text-[11px] text-amber-400/80 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 max-w-sm mx-auto">
                    💡 अर्जाची स्थिती पाहण्यासाठी युझर पोर्टलवरील <strong>"My Status"</strong> या टॅबवर जा.
                  </p>
                  <button
                    onClick={resetFormModal}
                    className="px-6 py-2 bg-amber-500 text-black font-extrabold text-xs rounded-xl cursor-pointer"
                  >
                    बंद करा
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  
                  {/* 🎯 STEP PROGRESS INDICATOR */}
                  <div className="flex items-center justify-between px-2 sm:px-6">
                    <div className={`flex items-center gap-1.5 text-xs font-bold ${currentStep >= 1 ? 'text-amber-400' : 'text-slate-600'}`}>
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${currentStep >= 1 ? 'bg-amber-500 text-black' : 'bg-slate-800 text-slate-400'}`}>१</span>
                      <span className="hidden sm:inline">मंडळ माहिती</span>
                    </div>
                    <div className={`h-0.5 flex-1 mx-2 ${currentStep >= 2 ? 'bg-amber-500' : 'bg-slate-800'}`}></div>
                    <div className={`flex items-center gap-1.5 text-xs font-bold ${currentStep >= 2 ? 'text-amber-400' : 'text-slate-600'}`}>
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${currentStep >= 2 ? 'bg-amber-500 text-black' : 'bg-slate-800 text-slate-400'}`}>२</span>
                      <span className="hidden sm:inline">संपर्क व पत्ता</span>
                    </div>
                    <div className={`h-0.5 flex-1 mx-2 ${currentStep >= 3 ? 'bg-amber-500' : 'bg-slate-800'}`}></div>
                    <div className={`flex items-center gap-1.5 text-xs font-bold ${currentStep >= 3 ? 'text-amber-400' : 'text-slate-600'}`}>
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${currentStep >= 3 ? 'bg-amber-500 text-black' : 'bg-slate-800 text-slate-400'}`}>३</span>
                      <span className="hidden sm:inline">थरांचे प्रमाण व फाईल</span>
                    </div>
                  </div>

                  {/* 📝 STEP 1: MANDAL DETAILS */}
                  {currentStep === 1 && (
                    <div className="space-y-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
                      <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center gap-1.5">
                        <Users className="w-4 h-4" /> टप्पा १: मंडळ व गट माहिती
                      </h4>

                      <div className="space-y-3">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-300 block mb-1">मंडळाचे नाव *</label>
                          <input 
                            type="text" 
                            name="teamName"
                            required
                            value={formData.teamName}
                            onChange={handleInputChange}
                            placeholder="उदा. जय बजरंग गोविंदा पथक"
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-semibold text-slate-300 block mb-1">मंडळाचा प्रकार (Type)</label>
                            <select 
                              name="type"
                              value={formData.type}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                            >
                              <option value="Mandal">मंडळ (Mandal)</option>
                              <option value="Trust">रजिस्टर्ड ट्रस्ट (Trust)</option>
                              <option value="Association">असोसिएशन (Association)</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold text-slate-300 block mb-1">पथक प्रकार (Category) *</label>
                            <select 
                              name="category"
                              value={formData.category}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                            >
                              <option value="Mens">पुरुष पथक (Mens Team)</option>
                              <option value="Womens">महिला पथक (Womens Team)</option>
                              <option value="Both">संयुक्त / दोन्ही (Both Mens & Womens)</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={handleNextStep}
                          className="px-5 py-2.5 bg-amber-500 text-black font-extrabold text-xs rounded-xl flex items-center gap-1.5 hover:bg-amber-400 cursor-pointer"
                        >
                          पुढील टप्पा <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 📝 STEP 2: CONTACT & ADDRESS DETAILS */}
                  {currentStep === 2 && (
                    <div className="space-y-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
                      <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center gap-1.5">
                        <Phone className="w-4 h-4" /> टप्पा २: संपर्क, ई-मेल व पत्ता
                      </h4>

                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-semibold text-slate-300 block mb-1">संपर्क व्यक्तीचे नाव *</label>
                            <input 
                              type="text" 
                              name="contactPerson"
                              required
                              value={formData.contactPerson}
                              onChange={handleInputChange}
                              placeholder="अध्यक्ष / सचिव यांचे नाव"
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold text-slate-300 block mb-1">व्हॉट्सॲप नंबर (मुख्य) *</label>
                            <input 
                              type="tel" 
                              name="whatsappNumber"
                              required
                              maxLength={10}
                              value={formData.whatsappNumber}
                              onChange={handleInputChange}
                              placeholder="10 digit WhatsApp number"
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold text-slate-300 block mb-1">पर्यायी फोन नंबर (Alternate No.)</label>
                            <input 
                              type="tel" 
                              name="alternateNumber"
                              maxLength={10}
                              value={formData.alternateNumber}
                              onChange={handleInputChange}
                              placeholder="पर्यायी कॉल / व्हॉट्सॲप नंबर"
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold text-slate-300 block mb-1">ई-मेल आयडी (लॉगिन ई-मेल) *</label>
                            <input 
                              type="email" 
                              name="email"
                              required
                              value={formData.email}
                              onChange={handleInputChange}
                              placeholder="example@gmail.com"
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-semibold text-slate-300 block mb-1">जिल्हा *</label>
                            <select 
                              name="district"
                              value={formData.district}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
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
                            <label className="text-[11px] font-semibold text-slate-300 block mb-1">पिनकोड (Pincode) *</label>
                            <input 
                              type="text" 
                              name="pincode"
                              required
                              maxLength={6}
                              value={formData.pincode}
                              onChange={handleInputChange}
                              placeholder="उदा. 400601"
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-300 block mb-1">पत्रव्यवहाराचा पत्ता *</label>
                          <textarea 
                            name="address"
                            required
                            rows={2}
                            value={formData.address}
                            onChange={handleInputChange}
                            placeholder="पूर्ण पत्ता टाका"
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>

                      <div className="pt-2 flex justify-between">
                        <button
                          type="button"
                          onClick={handlePrevStep}
                          className="px-4 py-2 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl flex items-center gap-1.5 hover:bg-slate-700 cursor-pointer"
                        >
                          <ArrowLeft className="w-4 h-4" /> मागील टप्पा
                        </button>
                        <button
                          type="button"
                          onClick={handleNextStep}
                          className="px-5 py-2 bg-amber-500 text-black font-extrabold text-xs rounded-xl flex items-center gap-1.5 hover:bg-amber-400 cursor-pointer"
                        >
                          पुढील टप्पा <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 📝 STEP 3: PYRAMID, COUNT & PDF FILE UPLOAD */}
                  {currentStep === 3 && (
                    <form onSubmit={handleSubmit} className="space-y-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
                      <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center gap-1.5">
                        <FileText className="w-4 h-4" /> टप्पा ३: थरांचे प्रमाण, संख्या व फाईल
                      </h4>

                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-semibold text-slate-300 block mb-1">थर क्षमता (Pyramid Capacity)</label>
                            <select 
                              name="pyramidCapacity"
                              value={formData.pyramidCapacity}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                            >
                              <option value="5 Layer">५ थर</option>
                              <option value="6 Layer">६ थर</option>
                              <option value="7 Layer">७ थर</option>
                              <option value="8 Layer">८ थर</option>
                              <option value="9 Layer">९ थर</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold text-slate-300 block mb-1">विमा करावयाच्या गोविंदांची संख्या *</label>
                            <input 
                              type="number" 
                              name="govindaCount"
                              required
                              min={1}
                              value={formData.govindaCount}
                              onChange={handleInputChange}
                              placeholder="उदा. 100"
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-mono font-bold"
                            />
                          </div>
                        </div>

                        <label className="flex items-center gap-2 p-2.5 bg-slate-900/60 rounded-xl border border-slate-800 cursor-pointer">
                          <input 
                            type="checkbox"
                            name="isAbove14"
                            checked={formData.isAbove14}
                            onChange={handleInputChange}
                            className="w-4 h-4 accent-amber-500 rounded"
                          />
                          <span className="text-[11px] text-slate-200">
                            मी खात्री देतो की सर्व विमाधारक गोविंदांचे वय १४ वर्षांपेक्षा जास्त आहे.
                          </span>
                        </label>

                        <div className="p-4 border-2 border-dashed border-slate-800 hover:border-amber-500/50 rounded-2xl bg-slate-900/50 text-center space-y-2">
                          <UploadCloud className="w-8 h-8 text-amber-400 mx-auto" />
                          <div className="space-y-0.5">
                            <p className="text-xs font-semibold text-slate-200">लेटरहेडवरील सही-शिक्क्यासह यादी अपलोड करा</p>
                            <p className="text-[10px] text-amber-400 font-bold">फक्त PDF फाईल (Max 10 MB)</p>
                          </div>
                          <input 
                            type="file" 
                            accept="application/pdf"
                            required
                            onChange={handleFileChange}
                            className="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-extrabold file:bg-amber-500 file:text-black hover:file:bg-amber-400 cursor-pointer"
                          />
                        </div>
                      </div>

                      <div className="pt-2 flex justify-between items-center">
                        <button
                          type="button"
                          onClick={handlePrevStep}
                          className="px-4 py-2.5 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl flex items-center gap-1.5 hover:bg-slate-700 cursor-pointer"
                        >
                          <ArrowLeft className="w-4 h-4" /> मागील टप्पा
                        </button>

                        <button
                          type="submit"
                          disabled={loading}
                          className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs sm:text-sm rounded-xl transition shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          {loading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              फॉर्म सबमिट होत आहे...
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