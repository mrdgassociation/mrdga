import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { dataService, getCompetitionDetails } from '../services/dataService';
import { generateRegistrationId } from '../utils/registrationId';
import Swal from 'sweetalert2';
import { Trophy, Calendar, MapPin, Users, Phone, Upload, ChevronRight, ChevronLeft, MessageSquare, Clock, User } from 'lucide-react';

const priorityDistricts = ["Mumbai Suburban", "Mumbai", "Thane", "Palghar", "Pune", "Raigad", "Ratnagiri"];
const otherDistricts = ["Ahilyanagar (Ahmednagar)", "Akola", "Amravati", "Chhatrapati Sambhatanagar (Aurangabad)", "Beed", "Bhandara", "Buldhana", "Chandrapur", "Dhule", "Gadchiroli", "Gondia", "Hingoli", "Jalgaon", "Jalna", "Kolhapur", "Latur", "Nagpur", "Nanded", "Nandurbar", "Nashik", "Dharashiv (Osmanabad)", "Parbhani", "Sangli", "Satara", "Sindhudurg", "Solapur", "Wardha", "Washim", "Yavatmal"];

const formSchema = z.object({
  teamName: z.string().min(3, "टीमचे नाव कमीत कमी ३ अक्षरांचे असावे"),
  category: z.string().nonempty("कृपया गट/प्रकार निवडा"),
  district: z.string().nonempty("कृपया जिल्हा निवडा"),
  vibhag: z.string().min(2, "विभाग / तालुका आवश्यक आहे"),
  pincode: z.string().optional(),
  playerCount: z.coerce.number().min(5, "कमीत कमी ५ खेळाडू आवश्यक आहेत"),
  captainName: z.string().min(2, "कॅप्टन/कोचचे नाव आवश्यक आहे"),
  captainPhone: z.string().regex(/^[6-9]\d{9}$/, "१० अंकी वैध मोबाईल नंबर टाका"),
  managerName: z.string().min(2, "मॅनेजरचे नाव आवश्यक आहे"),
  managerPhone: z.string().regex(/^[6-9]\d{9}$/, "१० अंकी वैध मोबाईल नंबर टाका"),
  email: z.string().email("वैध ईमेल आयडी टाका"),
});

export default function RegistrationForm({ competitionId }) {
  const [compDetails, setCompDetails] = useState(null);
  const [compLoading, setCompLoading] = useState(true);

  // 🔒 Security & Lock States
  const [isFormOpen, setIsFormOpen] = useState(true);
  const [statusLoading, setStatusLoading] = useState(true);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [teamLogo, setTeamLogo] = useState(null);
  const [captainPhoto, setCaptainPhoto] = useState(null);

  // 🎯 १. कॉम्पिटिशनचे नाव, Season आणि On/Off Status फेच करणे
  useEffect(() => {
    const loadCompInfo = async () => {
      setCompLoading(true);
      setStatusLoading(true);
      try {
        const targetId = competitionId || '2026';
        const details = await getCompetitionDetails(targetId);
        console.log("📊 [REG FORM] Setting Competition Details in State:", details);
        setCompDetails(details);

        // 🔒 SECURITY CHECK: कॉम्पिटिशनचा isFormOpen === false असेल तर फॉर्म ब्लॉक करा
        if (details && details.isFormOpen === false) {
          setIsFormOpen(false);
        } else {
          // ग्लोबल फॉर्म स्टेटस चेक
          const status = await dataService.getFormStatus(targetId);
          setIsFormOpen(status?.isOpen !== false);
        }
      } catch (err) {
        console.error("❌ [REG FORM] Error fetching details/status:", err);
      } finally {
        setCompLoading(false);
        setStatusLoading(false);
      }
    };

    loadCompInfo();
  }, [competitionId]);

  const { register, handleSubmit, trigger, formState: { errors } } = useForm({
    resolver: zodResolver(formSchema)
  });

  const handleNext = async (e) => {
    e.preventDefault();
    let isValid = false;
    if (step === 1) isValid = await trigger(["teamName", "category", "district", "vibhag", "playerCount"]);
    else if (step === 2) isValid = await trigger(["captainName", "captainPhone", "managerName", "managerPhone", "email"]);
    if (isValid) setStep((prev) => prev + 1);
  };

  // 💾 Form Submit Handler with Back-end Security Check
  const onSubmit = async (data) => {
    // 🔒 BACK-END SECURITY LOCK
    if (!isFormOpen) {
      Swal.fire({
        icon: 'error',
        title: 'अर्जाची मुदत संपली आहे!',
        text: 'या स्पर्धेची ऑनलाइन नोंदणी असोसिएशनतर्फे बंद करण्यात आली आहे.',
        confirmButtonColor: '#ef4444',
        background: '#0c0d14',
        color: '#fff'
      });
      return;
    }

    setLoading(true);
    try {
      const targetSeason = compDetails?.season || "2026";
      const seasonYear = targetSeason.slice(-2);

      const dupCheck = await dataService.checkDuplicateTeam(data.teamName, data.captainPhone, competitionId || targetSeason);
      if (dupCheck.isDuplicate) {
        setLoading(false);
        Swal.fire({ 
          icon: 'warning', 
          title: 'आधीच नोंदणी झाली आहे!', 
          text: dupCheck.reason, 
          confirmButtonColor: '#FF6600',
          background: '#0c0d14',
          color: '#fff'
        });
        return;
      }

      const regId = await generateRegistrationId(data.category, seasonYear);

      const payload = {
        registrationId: regId,
        competitionId: competitionId || `COMP-${targetSeason}`,
        competitionTitle: compDetails?.title || "दहीहंडी स्पर्धा",
        season: targetSeason,
        teamName: data.teamName,
        category: data.category,
        district: data.district,
        vibhag: data.vibhag,
        pincode: data.pincode || "",
        playerCount: data.playerCount,
        captain: { name: data.captainName, phone: data.captainPhone },
        manager: { name: data.managerName, phone: data.managerPhone },
        email: data.email,
        status: "Pending"
      };

      await dataService.saveTeam(payload, { logo: teamLogo, captainPhoto });

      Swal.fire({
        icon: 'success',
        title: 'रजिस्ट्रेशन यशस्वी!',
        html: `संघाचे नाव: <b>${data.teamName}</b><br/>स्पर्धा: <b class="text-amber-400">${compDetails?.title || 'दहीहंडी चषक'}</b><br/>आयडी: <b class="text-xl text-amber-400 font-mono my-2 block">${regId}</b>`,
        confirmButtonColor: '#FF6600',
        confirmButtonText: 'मुख्य पानावर जा',
        background: '#0c0d14',
        color: '#fff'
      }).then(() => { window.location.href = "#/"; });

    } catch (err) {
      console.error("Registration Error:", err);
      Swal.fire({ 
        icon: 'error', 
        title: 'त्रुटी!', 
        text: 'रजिस्ट्रेशन करताना अडचण आली.',
        background: '#0c0d14',
        color: '#fff' 
      });
    } finally {
      setLoading(false);
    }
  };

  // ⏳ Loading State
  if (statusLoading || compLoading) {
    return <div className="min-h-screen bg-[#08090d] text-amber-400 flex items-center justify-center text-xs animate-pulse font-bold">माहिती लोड होत आहे...</div>;
  }

  // 🚫 🔒 FORM CLOSED / BLOCKED SCREEN (जर फॉर्म बंद असेल तर हा स्क्रीन दिसेल)
  if (!isFormOpen) {
    return (
      <div className="max-w-2xl mx-auto my-12 px-4">
        <div className="p-6 sm:p-10 bg-[#0c0d14] border border-rose-500/30 rounded-3xl text-center space-y-4 shadow-2xl">
          
          <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-2xl flex items-center justify-center mx-auto text-3xl font-black shadow-lg">
            🚫
          </div>
          
          <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
            या स्पर्धेची ऑनलाइन नोंदणी बंद झाली आहे!
          </h2>
          
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
            <b className="text-amber-400">{compDetails?.title || 'दहीहंडी स्पर्धा'}</b> साठी अर्जांची मुदत पूर्ण झाली आहे किंवा असोसिएशनतर्फे नवीन अर्ज स्वीकारणे थांबवले आहे.
          </p>

          <div className="pt-4 border-t border-slate-800/80 flex justify-center gap-3">
            <a 
              href="#/competitions" 
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs rounded-xl transition shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              ← इतर उपलब्ध स्पर्धा पहा
            </a>
          </div>

        </div>
      </div>
    );
  }

  // 📝 जर फॉर्म सुरू असेल तर खालील मुख्य फॉर्म उघडेल
  return (
    <div className="max-w-3xl mx-auto my-6 px-4 space-y-4">
      
      {/* 🏆 SECTION: Competition Header Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-[#0c0d14] to-[#0c0d14] border border-amber-500/40 shadow-xl space-y-1 text-left">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-amber-500 text-black font-extrabold text-[10px] rounded-md uppercase tracking-wider">
            अधिकृत नोंदणी अर्ज
          </span>
          {compDetails?.season && (
            <span className="px-2 py-0.5 bg-slate-800 text-amber-400 font-mono text-[10px] font-bold rounded-md">
              हंगाम {compDetails.season}
            </span>
          )}
        </div>

        <h1 className="text-lg sm:text-xl font-black text-white flex items-center gap-2 pt-1">
          <Trophy className="w-5 h-5 text-amber-400 shrink-0" /> 
          {compDetails?.title ? compDetails.title : "महाराष्ट्र राज्य दहीहंडी स्पर्धा नोंदणी"}
        </h1>

        {compDetails?.venue && (
          <p className="text-xs text-slate-300 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" /> {compDetails.venue} 
            {compDetails?.startDate && ` • (${compDetails.startDate})`}
          </p>
        )}
      </div>

      {/* Stepper Header */}
      <div className="glass-panel p-4 rounded-2xl flex justify-between items-center text-xs font-semibold">
        <div className={`flex items-center gap-2 ${step >= 1 ? 'text-amber-400' : 'text-slate-500'}`}>
          <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center">1</span>
          <span>संघ माहिती</span>
        </div>
        <div className="h-[1px] w-8 bg-slate-700" />
        <div className={`flex items-center gap-2 ${step >= 2 ? 'text-amber-400' : 'text-slate-500'}`}>
          <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center">2</span>
          <span>संपर्क</span>
        </div>
        <div className="h-[1px] w-8 bg-slate-700" />
        <div className={`flex items-center gap-2 ${step >= 3 ? 'text-amber-400' : 'text-slate-500'}`}>
          <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center">3</span>
          <span>लोगो व फोटो</span>
        </div>
      </div>

      {/* Main Form Body */}
      <form onSubmit={handleSubmit(onSubmit)} className="glass-panel p-6 sm:p-8 rounded-3xl space-y-6">
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-amber-400 flex items-center gap-2">
              <Users className="w-5 h-5" /> १. संघ (टीम) तपशील
            </h2>

            <div>
              <label className="block text-sm text-slate-300 mb-1">संघाचे नाव (Team Name) *</label>
              <input {...register("teamName")} placeholder="उदा. जय भवानी गोविंद पथक" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-amber-400 focus:outline-none" />
              {errors.teamName && <p className="text-red-400 text-xs mt-1">{errors.teamName.message}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">गट / प्रकार (Category) *</label>
                <select {...register("category")} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-amber-400 focus:outline-none">
                  <option value="">निवडा</option>
                  <option value="M7">पुरुष ७ थर (Men's 7)</option>
                  <option value="M6">पुरुष ६ थर (Men's 6)</option>
                  <option value="W">महिला पथक (Women's)</option>
                </select>
                {errors.category && <p className="text-red-400 text-xs mt-1">{errors.category.message}</p>}
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">एकूण खेळाडू संख्या *</label>
                <input type="number" {...register("playerCount")} placeholder="उदा. 15" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-amber-400 focus:outline-none" />
                {errors.playerCount && <p className="text-red-400 text-xs mt-1">{errors.playerCount.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">जिल्हा (District) *</label>
                <select {...register("district")} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-amber-400 focus:outline-none">
                  <option value="">निवडा</option>
                  <optgroup label="प्रमुख जिल्हे">{priorityDistricts.map(d => <option key={d} value={d}>{d}</option>)}</optgroup>
                  <optgroup label="इतर जिल्हे">{otherDistricts.map(d => <option key={d} value={d}>{d}</option>)}</optgroup>
                </select>
                {errors.district && <p className="text-red-400 text-xs mt-1">{errors.district.message}</p>}
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">विभाग / तालुका (Vibhag) *</label>
                <input {...register("vibhag")} placeholder="उदा. दादर / कल्याण पूर्व" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-amber-400 focus:outline-none" />
                {errors.vibhag && <p className="text-red-400 text-xs mt-1">{errors.vibhag.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1">पिनकोड (Pincode) - ऐच्छिक</label>
              <input {...register("pincode")} placeholder="उदा. 400028" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-amber-400 focus:outline-none" />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-amber-400 flex items-center gap-2">
              <Phone className="w-5 h-5" /> २. संपर्क व प्रमुख व्यक्ती
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">कॅप्टन / कोचचे नाव *</label>
                <input {...register("captainName")} placeholder="नाव व आडनाव" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-amber-400 focus:outline-none" />
                {errors.captainName && <p className="text-red-400 text-xs mt-1">{errors.captainName.message}</p>}
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">कॅप्टन मोबाईल नंबर *</label>
                <input {...register("captainPhone")} placeholder="9876040010" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-amber-400 focus:outline-none" />
                {errors.captainPhone && <p className="text-red-400 text-xs mt-1">{errors.captainPhone.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">टीम मॅनेजरचे नाव *</label>
                <input {...register("managerName")} placeholder="नाव व आडनाव" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-amber-400 focus:outline-none" />
                {errors.managerName && <p className="text-red-400 text-xs mt-1">{errors.managerName.message}</p>}
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">मॅनेजर मोबाईल नंबर *</label>
                <input {...register("managerPhone")} placeholder="9876011010" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-amber-400 focus:outline-none" />
                {errors.managerPhone && <p className="text-red-400 text-xs mt-1">{errors.managerPhone.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1">अधिकृत ईमेल आयडी (Email) *</label>
              <input {...register("email")} placeholder="team@gmail.com" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-amber-400 focus:outline-none" />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-fadeIn">
            <h2 className="text-xl font-bold text-amber-400 flex items-center gap-2">
              <Upload className="w-5 h-5" /> ३. संघाचा लोगो व कॅप्टनचा फोटो (ऐच्छिक)
            </h2>

            <div className="border-2 border-dashed border-slate-700 rounded-2xl p-6 text-center hover:border-amber-400 transition bg-slate-900/50 space-y-3">
              <label className="cursor-pointer block space-y-2">
                <Upload className="w-8 h-8 text-amber-400 mx-auto" />
                <span className="block text-sm text-slate-200 font-semibold">संघाचा लोगो (Team Logo)</span>
                <input type="file" accept="image/*" onChange={(e) => setTeamLogo(e.target.files[0])} className="hidden" />
              </label>
              {teamLogo && <p className="text-xs text-emerald-400 font-semibold">✓ निवडले: {teamLogo.name}</p>}
            </div>

            <div className="border-2 border-dashed border-slate-700 rounded-2xl p-6 text-center hover:border-amber-400 transition bg-slate-900/50 space-y-3">
              <label className="cursor-pointer block space-y-2">
                <User className="w-8 h-8 text-amber-400 mx-auto" />
                <span className="block text-sm text-slate-200 font-semibold">कॅप्टनचा फोटो (Captain Photo)</span>
                <input type="file" accept="image/*" onChange={(e) => setCaptainPhoto(e.target.files[0])} className="hidden" />
              </label>
              {captainPhoto && <p className="text-xs text-emerald-400 font-semibold">✓ निवडले: {captainPhoto.name}</p>}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center pt-4 border-t border-slate-800">
          {step > 1 ? (
            <button type="button" onClick={() => setStep(step - 1)} className="px-5 py-2.5 bg-slate-800 text-white font-semibold rounded-xl flex items-center gap-1 hover:bg-slate-700 cursor-pointer">
              <ChevronLeft className="w-4 h-4" /> मागे
            </button>
          ) : <div />}

          {step < 3 ? (
            <button type="button" onClick={handleNext} className="px-6 py-2.5 bg-amber-500 text-black font-bold rounded-xl flex items-center gap-1 hover:bg-amber-400 cursor-pointer">
              पुढील स्टेप <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button type="submit" disabled={loading} className="px-8 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-extrabold rounded-xl hover:opacity-90 disabled:opacity-50 shadow-lg shadow-amber-500/20 cursor-pointer">
              {loading ? "प्रक्रिया सुरू आहे..." : "रजिस्ट्रेशन सबमिट करा"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}