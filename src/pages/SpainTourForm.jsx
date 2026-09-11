import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { PDFDocument } from 'pdf-lib';
import Swal from 'sweetalert2';
import { 
  Plane, User, FileText, UploadCloud, 
  ArrowLeft, Loader2, Landmark, Briefcase, Eye, Download, X,
  Sparkles, CheckCircle2
} from 'lucide-react';
import Tesseract from 'tesseract.js';

const EMPLOYMENT_CATEGORIES = [
  "Salaried",
  "Business / Self-Employed",
  "Student",
  "Housewife",
  "Retired",
  "Other"
];

const GAS_WEB_APP_URL = import.meta.env.VITE_GOOGLE_APP_SCRIPT_URL;

const stripDevanagari = (str) => {
  if (!str) return '';
  return str.replace(/[\u0900-\u097F]/g, '');
};

const toTitleCase = (str) => {
  const clean = stripDevanagari(str);
  return clean.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
};

const STEPS = [
  { id: 1, label: "Passport & Scan" },
  { id: 2, label: "Personal" },
  { id: 3, label: "Employment" },
  { id: 4, label: "Visa Photo" },
  { id: 5, label: "Docs" }
];

export default function SpainTourForm({ currentUser, initialData, onComplete, onCancel }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [docId, setDocId] = useState(initialData?.id || null);

  const [savingStep, setSavingStep] = useState(false);
  const [convertingPdf, setConvertingPdf] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState('');

  const [previewFile, setPreviewFile] = useState(null);

  // स्कॅनिंगसाठी फ्रंट व बॅक इमेज
  const [scanImageSource, setScanImageSource] = useState(null);
  const [backImageSource, setBackImageSource] = useState(null);

  const [formData, setFormData] = useState({
    passportNo: '',
    issueDate: '',
    expiryDate: '',
    previousEuropeTravel: 'No',

    fullNameAsPassport: '',
    gender: 'Male',
    dob: '',
    relation: 'Self',
    applicantContactNo: '',
    applicantEmail: currentUser?.email || '',
    emergencyContactName: '',
    emergencyContactNo: '',
    residentialAddress: '',

    employmentCategory: EMPLOYMENT_CATEGORIES[0],
    employerName: '',
    employerAddress: '',
    employerContactNo: '',

    passportPdfData: null,
    photoData: null,
    passportPdfUrl: '',
    photoUrl: '',

    salarySlipPdfData: null,
    bankStatementPdfData: null,
    itrPdfData: null,
    leaveLetterPdfData: null,
    additionalDocPdfData: null,
    salarySlipUrl: '',
    bankStatementUrl: '',
    itrUrl: '',
    leaveLetterUrl: '',
    additionalDocUrl: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        ...initialData,
        fullNameAsPassport: initialData.fullNameAsPassport || initialData.fullName || '',
        gender: initialData.gender || 'Male'
      }));
      setDocId(initialData.id);
    }
  }, [initialData]);

  const handleUppercaseChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: stripDevanagari(value).toUpperCase() }));
  };

  const handleTitleCaseChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: toTitleCase(value) }));
  };

  const handleDigitsOnlyChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value.replace(/[^0-9]/g, '') }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: stripDevanagari(value) }));
  };

  // 📄 तयार PDF सिलेक्ट केल्यावर
  const handleDirectPdfUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      Swal.fire({ icon: 'warning', title: 'PDF Required', text: 'Please select a valid PDF.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData(prev => ({ ...prev, passportPdfData: reader.result }));
      setScanImageSource(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // 📸 Front + Back फोटो सिलेक्ट केल्यावर (Auto-Merge into A4 PDF)
  const handlePassportMultiImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const readerFront = new FileReader();
    readerFront.onload = () => setScanImageSource(readerFront.result);
    readerFront.readAsDataURL(files[0]);

    if (files.length > 1) {
      const readerBack = new FileReader();
      readerBack.onload = () => setBackImageSource(readerBack.result);
      readerBack.readAsDataURL(files[1]);
    } else {
      setBackImageSource(null);
    }

    setConvertingPdf(true);
    try {
      const pdfDoc = await PDFDocument.create();

      for (const file of files) {
        if (!file.type.startsWith('image/')) continue;
        const imageBytes = await file.arrayBuffer();

        let imageEmbed;
        if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
          imageEmbed = await pdfDoc.embedJpg(imageBytes);
        } else {
          imageEmbed = await pdfDoc.embedPng(imageBytes);
        }

        const page = pdfDoc.addPage([595.28, 841.89]);
        const { width, height } = imageEmbed.scaleToFit(540, 780);

        page.drawImage(imageEmbed, {
          x: (595.28 - width) / 2,
          y: (841.89 - height) / 2,
          width,
          height,
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, passportPdfData: reader.result }));
        setConvertingPdf(false);
      };
      reader.readAsDataURL(blob);

    } catch (err) {
      console.error("PDF conversion error:", err);
      setConvertingPdf(false);
    }
  };

  // 🎯 स्मार्ट पासपोर्ट पार्सर (Visual Labels + MRZ Fallback)
// 🎯 स्मार्ट पासपोर्ट पार्सर (LLLLLKKK क्लीनर + वेगळी Issue & Expiry Date)
  const parsePassportSmart = (fullText) => {
    console.log("Raw OCR Text:", fullText);

    let fullName = "";
    let passportNo = "";
    let dob = "";
    let issueDate = "";
    let expiryDate = "";
    let gender = "Male";

    // =========================================================================
    // १. नावाची अचूक रचना व LLLLL/KKKK चा कचरा काढणे
    // =========================================================================
    // MRZ Line 1 शोधणे: उदा. P<INDMAHADIK<<SANDESH<RAJARAM<<<<<<<<<<<<<
    const line1Match = fullText.match(/P[<KLI1][A-Z]{3}([A-Z0-9<KLI1]{20,44})/i);
    if (line1Match) {
      let rawLine1 = line1Match[1];
      // उजवीकडील सलग येणारे filler कॅरेक्टर्स (L, K, <, I, 1) कापून काढणे
      rawLine1 = rawLine1.replace(/[<KLI1X]{2,}$/g, '');

      if (rawLine1.includes('<<')) {
        const parts = rawLine1.split('<<');
        const rawSurname = parts[0].replace(/[^A-Z]/g, ' ').trim();
        let rawGiven = parts[1] ? parts[1].replace(/[<KLI1]/g, ' ').trim() : '';
        rawGiven = rawGiven.replace(/[^A-Z\s]/g, '').trim();

        if (rawGiven && rawSurname) {
          fullName = `${rawGiven} ${rawSurname}`.replace(/\s+/g, ' ').trim().toUpperCase();
        } else if (rawSurname) {
          fullName = rawSurname.toUpperCase();
        }
      }
    }

    // बॅकअप: जर MRZ मधे नाव नीट सापडले नाही तर व्हिज्युअल लेबल्सवरून वाचणे
    if (!fullName || (fullName.includes('L') && fullName.length > 25)) {
      const surMatch = fullText.match(/(?:Surname|उपनाम)[\s:\/]+([A-Z\s]{2,25})/i);
      const givMatch = fullText.match(/(?:Given\s*Name|दिया\s*गया\s*नाम)[\s:\/]+([A-Z\s]{2,35})/i);

      if (givMatch && surMatch) {
        const s = surMatch[1].replace(/[^A-Z\s]/g, '').split('\n')[0].trim();
        const g = givMatch[1].replace(/[^A-Z\s]/g, '').split('\n')[0].trim();
        fullName = `${g} ${s}`.replace(/\s+/g, ' ').trim().toUpperCase();
      }
    }

    // शेवटी उरलेला कोणताही सलग 'L' किंवा 'K' चा कचरा स्वच्छ करणे
    if (fullName) {
      fullName = fullName.replace(/\b[LK]{2,}\b/g, '').replace(/[LK]{2,}$/g, '').replace(/\s+/g, ' ').trim();
    }

    // =========================================================================
    // २. पासपोर्ट नंबर, DOB आणि Gender (MRZ Line 2 वरून)
    // =========================================================================
    const line2Match = fullText.match(/([A-PR-WY0-9<KLI1]{8,10})[<KLI10-9][A-Z]{3}([0-9]{6})[0-9]([MF<KLI1])([0-9]{6})/i);
    if (line2Match) {
      passportNo = line2Match[1].substring(0, 8).replace(/[^A-Z0-9]/g, '');

      // जन्मतारीख: YYMMDD -> YYYY-MM-DD
      const rawDob = line2Match[2];
      if (rawDob && rawDob.length === 6) {
        const yy = parseInt(rawDob.substring(0, 2), 10);
        const yyyy = yy > 45 ? "19" + rawDob.substring(0, 2) : "20" + rawDob.substring(0, 2);
        dob = `${yyyy}-${rawDob.substring(2, 4)}-${rawDob.substring(4, 6)}`;
      }

      gender = line2Match[3] === 'F' ? 'Female' : 'Male';

      // समाप्ती तारीख (Expiry Date): YYMMDD -> YYYY-MM-DD
      const rawExp = line2Match[4];
      if (rawExp && rawExp.length === 6) {
        expiryDate = `20${rawExp.substring(0, 2)}-${rawExp.substring(2, 4)}-${rawExp.substring(4, 6)}`;
      }
    }

    // फॉलबॅक: पासपोर्ट नंबर
    if (!passportNo) {
      const pMatch = fullText.match(/\b([A-PR-WYa-pr-wy][0-9]{7})\b/);
      if (pMatch) passportNo = pMatch[1].toUpperCase();
    }

    // =========================================================================
    // ३. Issue Date आणि Expiry Date कधीही सारख्या न होण्यासाठी लॉजिक
    // =========================================================================
    // मजकुरातून सर्व वैध DD/MM/YYYY तारखा गोळा करणे
    const dateMatches = fullText.match(/\b([0-2][0-9]|3[01])[\/\-\.](0[1-9]|1[0-2])[\/\-\.](19[5-9][0-9]|20[0-4][0-9])\b/g);

    if (dateMatches && dateMatches.length > 0) {
      const parsedDates = dateMatches.map(dStr => {
        const parts = dStr.split(/[\/\-\.]/);
        return {
          raw: dStr,
          year: parseInt(parts[2], 10),
          iso: `${parts[2]}-${parts[1]}-${parts[0]}`
        };
      });

      // १. जन्मतारीख (वर्ष १९५० ते २०१०)
      if (!dob) {
        const b = parsedDates.find(d => d.year >= 1950 && d.year <= 2010);
        if (b) dob = b.iso;
      }

      // २. Issue Date: वर्ष २०१५ ते २०२६ मधील तारीख (भूतकाळात जारी झालेली तारीख)
      const iss = parsedDates.find(d => d.year >= 2015 && d.year <= 2026);
      if (iss) {
        issueDate = iss.iso;
      }

      // ३. Expiry Date: वर्ष २०२७ ते २०४५ मधील तारीख (भविष्यातील तारीख)
      if (!expiryDate) {
        const exp = parsedDates.find(d => d.year > 2026 && d.year <= 2045);
        if (exp) expiryDate = exp.iso;
      }
    }

    // जर Issue Date सापडली नाही तर Expiry Date मधून बरोबर १० वर्षे वजा करणे
    if (!issueDate && expiryDate) {
      const parts = expiryDate.split('-');
      const expYr = parseInt(parts[0], 10);
      const nextDay = parseInt(parts[2], 10) + 1; // 08/09/2032 ला संपत असेल तर 09/09/2022 ला जारी झालेला असतो
      const pad = nextDay < 10 ? `0${nextDay}` : `${nextDay}`;
      issueDate = `${expYr - 10}-${parts[1]}-${pad}`;
    }

    return { fullName, passportNo, dob, issueDate, expiryDate, gender };
  };

  // ⚡ इन-ब्राऊझर ऑटो-स्कॅन
  const handleClientSideScan = async () => {
    if (!scanImageSource) {
      Swal.fire({
        icon: 'warning',
        title: 'Upload Passport First',
        text: 'Please select Photos or PDF before scanning.'
      });
      return;
    }

    setOcrLoading(true);
    try {
      const frontRes = await Tesseract.recognize(scanImageSource, 'eng');
      const frontText = frontRes.data.text || "";

      const extracted = parsePassportSmart(frontText);

      // बॅक पेजवरून Address स्कॅनिंग
      let extractedAddress = "";
      if (backImageSource) {
        const backRes = await Tesseract.recognize(backImageSource, 'eng');
        const backText = backRes.data.text || "";
        const pinMatch = backText.match(/\b[1-9][0-9]{5}\b/);
        if (pinMatch) {
          const lines = backText.split("\n").map(l => l.trim()).filter(l => l.length > 2);
          const pinIdx = lines.findIndex(l => l.includes(pinMatch[0]));
          if (pinIdx !== -1) {
            const startIdx = Math.max(0, pinIdx - 2);
            extractedAddress = lines.slice(startIdx, pinIdx + 1).join(", ");
            extractedAddress = extractedAddress.replace(/[^\w\s,\-\/]/gi, " ").replace(/\s+/g, " ").trim().toUpperCase();
          }
        }
      }

      setFormData(prev => ({
        ...prev,
        fullNameAsPassport: extracted.fullName || prev.fullNameAsPassport,
        passportNo: extracted.passportNo || prev.passportNo,
        dob: extracted.dob || prev.dob,
        issueDate: extracted.issueDate || prev.issueDate,
        expiryDate: extracted.expiryDate || prev.expiryDate,
        gender: extracted.gender || prev.gender,
        residentialAddress: extractedAddress || prev.residentialAddress
      }));

      Swal.fire({
        icon: 'success',
        title: 'Details Filled!',
        text: extracted.fullName ? `Identified: ${extracted.fullName}` : 'Passport scanned. Please verify below.',
        timer: 1800,
        showConfirmButton: false,
        background: '#0f172a',
        color: '#fff'
      });

    } catch (err) {
      console.error("Scan Error:", err);
      Swal.fire({
        icon: 'info',
        title: 'Notice',
        text: 'Could not auto-read all fields. Please enter details manually below.',
        background: '#0f172a',
        color: '#fff'
      });
    } finally {
      setOcrLoading(false);
    }
  };

  const uploadToGoogleDrive = async (base64Content, fileName, mimeType, uploadType) => {
    if (!GAS_WEB_APP_URL) return "";
    const payload = { fileData: base64Content, fileName, fileType: mimeType, uploadType };
    const response = await fetch(GAS_WEB_APP_URL, { method: 'POST', body: JSON.stringify(payload) });
    const result = await response.json();
    return result?.fileUrl || "";
  };

  const saveOrUpdateDoc = async (partialData) => {
    const payload = {
      ...partialData,
      submittedBy: currentUser?.email?.toLowerCase().trim() || 'Unknown',
      updatedAt: new Date().toISOString()
    };

    if (docId) {
      await updateDoc(doc(db, "spain_tour_applications_2026", docId), payload);
      return docId;
    } else {
      payload.memberId = `SP-${Date.now().toString().slice(-6)}`;
      payload.status = 'Documents Pending';
      payload.createdAt = new Date().toISOString();
      payload.agentRemarks = [];
      const newRef = await addDoc(collection(db, "spain_tour_applications_2026"), payload);
      setDocId(newRef.id);
      return newRef.id;
    }
  };

  // Step 1 Save
  const handleSaveStep1 = async (e) => {
    e.preventDefault();
    if (!formData.passportPdfData && !formData.passportPdfUrl) {
      Swal.fire({ icon: 'warning', title: 'Passport Required', text: 'Please attach passport images or PDF.' });
      return;
    }

    setSavingStep(true);
    try {
      let pUrl = formData.passportPdfUrl || '';
      if (formData.passportPdfData && formData.passportPdfData.startsWith('data:')) {
        setUploadStatusText('Uploading to Drive...');
        const cleanPassport = (formData.passportNo || 'DOC').replace(/[^a-zA-Z0-9]/g, '');
        const cleanName = (formData.fullNameAsPassport || 'MEMBER').replace(/[^a-zA-Z0-9]/g, '_');
        pUrl = await uploadToGoogleDrive(
          formData.passportPdfData,
          `SPAIN_PASSPORT_${cleanPassport}_${cleanName}.pdf`,
          'application/pdf',
          'spain_passport_doc'
        );
      }

      await saveOrUpdateDoc({
        passportNo: formData.passportNo,
        issueDate: formData.issueDate,
        expiryDate: formData.expiryDate,
        previousEuropeTravel: formData.previousEuropeTravel,
        passportPdfUrl: pUrl
      });

      setFormData(prev => ({ ...prev, passportPdfUrl: pUrl, passportPdfData: null }));
      setCurrentStep(2);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to save passport.' });
    } finally {
      setSavingStep(false);
      setUploadStatusText('');
    }
  };

  // Step 2 Save
  const handleSaveStep2 = async (e) => {
    e.preventDefault();
    setSavingStep(true);
    try {
      await saveOrUpdateDoc({
        fullNameAsPassport: formData.fullNameAsPassport,
        gender: formData.gender,
        dob: formData.dob,
        relation: formData.relation || 'Self',
        applicantContactNo: formData.applicantContactNo,
        applicantEmail: formData.applicantEmail,
        emergencyContactName: formData.emergencyContactName || '',
        emergencyContactNo: formData.emergencyContactNo || '',
        residentialAddress: formData.residentialAddress || ''
      });
      setCurrentStep(3);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to save personal info.' });
    } finally {
      setSavingStep(false);
    }
  };

  // Step 3 Save
  const handleSaveStep3 = async (e) => {
    e.preventDefault();
    setSavingStep(true);
    try {
      await saveOrUpdateDoc({
        employmentCategory: formData.employmentCategory,
        employerName: formData.employerName || '',
        employerAddress: formData.employerAddress || '',
        employerContactNo: formData.employerContactNo || ''
      });
      setCurrentStep(4);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to save employment info.' });
    } finally {
      setSavingStep(false);
    }
  };

  // Step 4 Save
  const handleSaveStep4 = async (e) => {
    e.preventDefault();
    setSavingStep(true);
    try {
      let phUrl = formData.photoUrl || '';
      if (formData.photoData && formData.photoData.startsWith('data:')) {
        setUploadStatusText('Uploading Photo to Drive...');
        const cleanPassport = (formData.passportNo || 'DOC').replace(/[^a-zA-Z0-9]/g, '');
        const cleanName = (formData.fullNameAsPassport || 'MEMBER').replace(/[^a-zA-Z0-9]/g, '_');
        phUrl = await uploadToGoogleDrive(
          formData.photoData,
          `SPAIN_PHOTO_${cleanPassport}_${cleanName}.jpg`,
          'image/jpeg',
          'spain_visa_photo'
        );
      }

      await saveOrUpdateDoc({ photoUrl: phUrl });
      setFormData(prev => ({ ...prev, photoUrl: phUrl, photoData: null }));
      setCurrentStep(5);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Upload Error', text: 'Failed to upload photo.' });
    } finally {
      setSavingStep(false);
      setUploadStatusText('');
    }
  };

  // Step 5 Save
  const handleSaveStep5 = async (e) => {
    e.preventDefault();
    setSavingStep(true);
    try {
      const cleanName = (formData.fullNameAsPassport || 'MEMBER').replace(/[^a-zA-Z0-9]/g, '_');
      const cleanPassport = (formData.passportNo || 'DOC').replace(/[^a-zA-Z0-9]/g, '');

      let salUrl = formData.salarySlipUrl || '';
      let bnkUrl = formData.bankStatementUrl || '';
      let itrUrl = formData.itrUrl || '';
      let lveUrl = formData.leaveLetterUrl || '';

      if (formData.salarySlipPdfData?.startsWith('data:')) {
        salUrl = await uploadToGoogleDrive(formData.salarySlipPdfData, `SPAIN_SALARY_${cleanPassport}_${cleanName}.pdf`, 'application/pdf', 'spain_passport_doc');
      }
      if (formData.bankStatementPdfData?.startsWith('data:')) {
        bnkUrl = await uploadToGoogleDrive(formData.bankStatementPdfData, `SPAIN_BANK_${cleanPassport}_${cleanName}.pdf`, 'application/pdf', 'spain_passport_doc');
      }
      if (formData.itrPdfData?.startsWith('data:')) {
        itrUrl = await uploadToGoogleDrive(formData.itrPdfData, `SPAIN_ITR_${cleanPassport}_${cleanName}.pdf`, 'application/pdf', 'spain_passport_doc');
      }
      if (formData.leaveLetterPdfData?.startsWith('data:')) {
        lveUrl = await uploadToGoogleDrive(formData.leaveLetterPdfData, `SPAIN_LEAVE_${cleanPassport}_${cleanName}.pdf`, 'application/pdf', 'spain_passport_doc');
      }

      await saveOrUpdateDoc({
        salarySlipUrl: salUrl,
        bankStatementUrl: bnkUrl,
        itrUrl: itrUrl,
        leaveLetterUrl: lveUrl
      });

      Swal.fire({
        icon: 'success',
        title: 'Registration Completed!',
        text: 'All passport details & documents recorded successfully.',
        timer: 1600,
        showConfirmButton: false
      });

      if (onComplete) onComplete();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Upload Error', text: 'Could not upload docs.' });
    } finally {
      setSavingStep(false);
      setUploadStatusText('');
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-2 sm:px-4 py-2 font-sans text-slate-200">
      
      {/* 🧭 Progress Header */}
      <div className="bg-slate-900 border border-slate-800 p-3 sm:p-4 rounded-2xl mb-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="p-1.5 bg-slate-800 text-slate-300 rounded-lg hover:text-white cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4"/>
            </button>
            <div>
              <span className="text-[10px] font-mono text-amber-400 font-bold uppercase">
                Step {currentStep} of 5
              </span>
              <h1 className="text-xs sm:text-sm font-black text-white">
                {STEPS[currentStep - 1].label}
              </h1>
            </div>
          </div>
          <span className="text-[11px] font-bold text-amber-400 font-mono bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
            {Math.round((currentStep / 5) * 100)}% Done
          </span>
        </div>

        <div className="grid grid-cols-5 gap-1.5 pt-1">
          {STEPS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => (docId || s.id <= currentStep) ? setCurrentStep(s.id) : null}
              className={`h-1.5 rounded-full transition-all ${
                s.id === currentStep 
                  ? 'bg-amber-400' 
                  : s.id < currentStep 
                    ? 'bg-emerald-500' 
                    : 'bg-slate-800'
              }`}
            />
          ))}
        </div>
      </div>

      {/* STEP 1: PASSPORT UPLOAD + CLIENT SIDE INSTANT SCAN */}
      {currentStep === 1 && (
        <form onSubmit={handleSaveStep1} className="space-y-3">
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-3">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400"/>
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                  1. Passport Upload & Verification
                </h2>
              </div>
            </div>

            {/* Upload Choices */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              
              {/* Option A: Photos (Front + Back) */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <label className="block text-xs font-bold text-amber-400">
                  📸 Option A: Upload Photos (Front & Back)
                </label>
                <p className="text-[10px] text-slate-400">
                  Select 2 photos. Auto-merges into PDF + auto-fills address!
                </p>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handlePassportMultiImageUpload}
                  disabled={convertingPdf || savingStep}
                  className="text-xs text-slate-300 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 cursor-pointer w-full"
                />
              </div>

              {/* Option B: Ready PDF */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <label className="block text-xs font-bold text-white">
                  📄 Option B: Upload Existing PDF
                </label>
                <p className="text-[10px] text-slate-400">
                  Already scanned or DigiLocker combined PDF.
                </p>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleDirectPdfUpload}
                  disabled={convertingPdf || savingStep}
                  className="text-xs text-slate-300 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 cursor-pointer w-full"
                />
              </div>

            </div>

            {/* File Ready Box */}
            {(formData.passportPdfData || formData.passportPdfUrl) && !convertingPdf && (
              <div className="p-3 bg-slate-950 border border-emerald-500/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400"/>
                  <span className="text-xs text-emerald-300 font-bold">Passport Attached</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewFile({
                      url: formData.passportPdfData || formData.passportPdfUrl,
                      title: 'Passport Copy Preview',
                      isPdf: true
                    })}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5"/> View
                  </button>

                  {/* ⚡ थेट OCR बटण */}
                  <button
                    type="button"
                    disabled={ocrLoading}
                    onClick={handleClientSideScan}
                    className="px-3 py-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs rounded-lg flex items-center gap-1 cursor-pointer shadow-md disabled:opacity-50"
                  >
                    {ocrLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Sparkles className="w-3.5 h-3.5"/>}
                    <span>{ocrLoading ? 'Scanning Details...' : '✨ Auto-Fill Details'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Fields */}
            <div className="pt-2 border-t border-slate-800 space-y-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Passport Number *
                </label>
                <input
                  type="text"
                  name="passportNo"
                  required
                  maxLength="9"
                  placeholder="e.g. W3697428"
                  value={formData.passportNo}
                  onChange={handleUppercaseChange}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white uppercase font-mono tracking-widest focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Issue Date *
                  </label>
                  <input
                    type="date"
                    name="issueDate"
                    required
                    value={formData.issueDate}
                    onChange={handleChange}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-2 text-xs text-white [color-scheme:dark] focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Expiry Date *
                  </label>
                  <input
                    type="date"
                    name="expiryDate"
                    required
                    value={formData.expiryDate}
                    onChange={handleChange}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-2 text-xs text-white [color-scheme:dark] focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Previous Europe / Schengen Travel History? *
                </label>
                <div className="flex gap-6 items-center mt-1">
                  {['No', 'Yes'].map(opt => (
                    <label key={opt} className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                      <input
                        type="radio"
                        name="previousEuropeTravel"
                        value={opt}
                        checked={formData.previousEuropeTravel === opt}
                        onChange={handleChange}
                        className="accent-amber-500 w-3.5 h-3.5"
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

          </div>

          <button
            type="submit"
            disabled={savingStep || convertingPdf}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg cursor-pointer"
          >
            {savingStep ? <Loader2 className="w-4 h-4 animate-spin"/> : <span>Save & Continue to Personal Info →</span>}
          </button>
        </form>
      )}

      {/* STEP 2: PERSONAL */}
      {currentStep === 2 && (
        <form onSubmit={handleSaveStep2} className="space-y-3">
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              <User className="w-4 h-4 text-amber-400"/>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                2. Personal Details
              </h2>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Full Name (As on Passport) *
              </label>
              <input
                type="text"
                name="fullNameAsPassport"
                required
                placeholder="e.g. SANDESH RAJARAM MAHADIK"
                value={formData.fullNameAsPassport}
                onChange={handleUppercaseChange}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white uppercase font-mono tracking-wide focus:border-amber-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Gender *
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-400 font-bold"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Date of Birth *
                </label>
                <input
                  type="date"
                  name="dob"
                  required
                  value={formData.dob}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-2 text-xs text-white [color-scheme:dark] focus:border-amber-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  name="applicantContactNo"
                  required
                  maxLength="10"
                  placeholder="10-digit mobile"
                  value={formData.applicantContactNo}
                  onChange={handleDigitsOnlyChange}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  name="applicantEmail"
                  required
                  placeholder="e.g. applicant@gmail.com"
                  value={formData.applicantEmail}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-amber-400"
                />
              </div>
            </div>

            {/* 🏠 Address Field */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Residential Address (As on Passport)
              </label>
              <textarea
                rows="2"
                name="residentialAddress"
                placeholder="Full address as printed on the last page of passport"
                value={formData.residentialAddress}
                onChange={handleUppercaseChange}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white uppercase focus:border-amber-400"
              />
            </div>

            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Emergency Contact (Optional)
              </p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  name="emergencyContactName"
                  placeholder="Person Name"
                  value={formData.emergencyContactName}
                  onChange={handleTitleCaseChange}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:border-amber-400"
                />
                <input
                  type="tel"
                  name="emergencyContactNo"
                  maxLength="10"
                  placeholder="Emergency Phone"
                  value={formData.emergencyContactNo}
                  onChange={handleDigitsOnlyChange}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white font-mono focus:border-amber-400"
                />
              </div>
            </div>

          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="flex-1 py-3 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
            >
              ← Back
            </button>
            <button
              type="submit"
              disabled={savingStep}
              className="flex-2 py-3 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl flex items-center justify-center gap-1 shadow-lg cursor-pointer"
            >
              {savingStep ? <Loader2 className="w-4 h-4 animate-spin"/> : <span>Save & Continue to Employment →</span>}
            </button>
          </div>
        </form>
      )}

      {/* STEP 3: EMPLOYMENT */}
      {currentStep === 3 && (
        <form onSubmit={handleSaveStep3} className="space-y-3">
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              <Briefcase className="w-4 h-4 text-amber-400"/>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                3. Employment Information (For Visa)
              </h2>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Employment Category *
              </label>
              <select
                name="employmentCategory"
                value={formData.employmentCategory}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-400"
              >
                {EMPLOYMENT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Company / Business / College Name
              </label>
              <input
                type="text"
                name="employerName"
                placeholder="e.g. TCS / Self-Business / Mumbai University"
                value={formData.employerName}
                onChange={handleTitleCaseChange}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Office / Business Address
              </label>
              <input
                type="text"
                name="employerAddress"
                placeholder="e.g. Nariman Point, Mumbai"
                value={formData.employerAddress}
                onChange={handleTitleCaseChange}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Office Contact Number (Landline / Mobile)
              </label>
              <input
                type="tel"
                name="employerContactNo"
                placeholder="e.g. 022-22880000 or Mobile"
                value={formData.employerContactNo}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-amber-400"
              />
            </div>

          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="flex-1 py-3 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
            >
              ← Back
            </button>
            <button
              type="submit"
              disabled={savingStep}
              className="flex-2 py-3 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl flex items-center justify-center gap-1 shadow-lg cursor-pointer"
            >
              {savingStep ? <Loader2 className="w-4 h-4 animate-spin"/> : <span>Save & Continue to Photo →</span>}
            </button>
          </div>
        </form>
      )}

      {/* STEP 4: VISA PHOTO */}
      {currentStep === 4 && (
        <form onSubmit={handleSaveStep4} className="space-y-3">
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              <UploadCloud className="w-4 h-4 text-amber-400"/>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                4. Visa Passport Size Photo
              </h2>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
              <label className="block text-xs font-bold text-slate-200">
                🖼️ White Background Photo (35x45mm Schengen specification) *
              </label>
              <input
                type="file"
                accept="image/*"
                capture="user"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setFormData(prev => ({ ...prev, photoData: reader.result }));
                  reader.readAsDataURL(file);
                }}
                disabled={savingStep}
                className="text-xs text-slate-300 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 cursor-pointer w-full"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="flex-1 py-3 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
            >
              ← Back
            </button>
            <button
              type="submit"
              disabled={savingStep}
              className="flex-2 py-3 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl flex items-center justify-center gap-1 shadow-lg cursor-pointer"
            >
              {savingStep ? <Loader2 className="w-4 h-4 animate-spin"/> : <span>Save & Continue to Docs →</span>}
            </button>
          </div>
        </form>
      )}

      {/* STEP 5: SUPPORTING DOCS */}
      {currentStep === 5 && (
        <form onSubmit={handleSaveStep5} className="space-y-3">
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              <Landmark className="w-4 h-4 text-emerald-400"/>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                5. Supporting Docs (PDFs)
              </h2>
            </div>

            {/* Leave Letter */}
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1">
              <label className="block text-[11px] font-bold text-amber-300">
                🏢 Leave Approval Letter / Employer NOC (PDF)
              </label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setFormData(prev => ({ ...prev, leaveLetterPdfData: reader.result }));
                  reader.readAsDataURL(file);
                }}
                className="text-xs text-slate-300 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:bg-slate-800 file:text-slate-200 cursor-pointer w-full"
              />
            </div>

            {/* Bank Statement */}
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1">
              <label className="block text-[11px] font-bold text-slate-200">
                🏦 Bank Statement - Last 6 Months (PDF)
              </label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setFormData(prev => ({ ...prev, bankStatementPdfData: reader.result }));
                  reader.readAsDataURL(file);
                }}
                className="text-xs text-slate-300 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:bg-slate-800 file:text-slate-200 cursor-pointer w-full"
              />
            </div>

            {/* Salary Slips */}
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1">
              <label className="block text-[11px] font-bold text-slate-200">
                💵 Salary Slips - Last 3-6 Months (PDF)
              </label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setFormData(prev => ({ ...prev, salarySlipPdfData: reader.result }));
                  reader.readAsDataURL(file);
                }}
                className="text-xs text-slate-300 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:bg-slate-800 file:text-slate-200 cursor-pointer w-full"
              />
            </div>

            {/* ITR */}
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1">
              <label className="block text-[11px] font-bold text-slate-200">
                📑 Income Tax Returns (ITR / Form 16) (PDF)
              </label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setFormData(prev => ({ ...prev, itrPdfData: reader.result }));
                  reader.readAsDataURL(file);
                }}
                className="text-xs text-slate-300 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:bg-slate-800 file:text-slate-200 cursor-pointer w-full"
              />
            </div>

          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCurrentStep(4)}
              className="flex-1 py-3 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
            >
              ← Back
            </button>
            <button
              type="submit"
              disabled={savingStep}
              className="flex-2 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded-xl flex items-center justify-center gap-1 shadow-lg cursor-pointer"
            >
              {savingStep ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin"/>
                  <span>{uploadStatusText || 'Finalizing...'}</span>
                </>
              ) : (
                <span>Complete Visa Registration ✓</span>
              )}
            </button>
          </div>
        </form>
      )}

      {/* 👁️ PREVIEW MODAL */}
      {previewFile && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#0c0d14] border border-amber-500/40 w-full max-w-3xl h-[80vh] rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-3 border-b border-slate-800 bg-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs truncate">
                <FileText className="w-4 h-4 shrink-0"/> {previewFile.title}
              </div>
              <button 
                type="button"
                onClick={() => setPreviewFile(null)} 
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5"/>
              </button>
            </div>

            <div className="flex-1 bg-slate-950 p-2 overflow-hidden flex items-center justify-center">
              <iframe
                src={previewFile.url}
                title="PDF Preview"
                className="w-full h-full rounded-xl border border-slate-800"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}