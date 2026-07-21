import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { dataService } from '../services/dataService';
import { generateRegistrationId } from '../utils/registrationId';
import Swal from 'sweetalert2';
import { User, Phone, Users, Upload, ChevronRight, ChevronLeft, MessageSquare } from 'lucide-react';

const priorityDistricts = ["Mumbai Suburban", "Mumbai", "Thane", "Palghar"];
const otherDistricts = [
  "Ahilyanagar (Ahmednagar)", "Akola", "Amravati", "Chhatrapati Sambhajinagar (Aurangabad)", 
  "Beed", "Bhandara", "Buldhana", "Chandrapur", "Dhule", "Gadchiroli", "Gondia", 
  "Hingoli", "Jalgaon", "Jalna", "Kolhapur", "Latur", "Nagpur", "Nanded", 
  "Nandurbar", "Nashik", "Dharashiv (Osmanabad)", "Parbhani", "Pune", "Raigad", 
  "Ratnagiri", "Sangli", "Satara", "Sindhudurg", "Solapur", "Wardha", "Washim", "Yavatmal"
];

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

export default function RegistrationForm({ season = "2026" }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [teamLogo, setTeamLogo] = useState(null);
  const [captainPhoto, setCaptainPhoto] = useState(null);
  const [logoOverSize, setLogoOverSize] = useState(false);

  const SUPPORT_WHATSAPP_NUMBER = "919876543210";

  const { register, handleSubmit, trigger, watch, formState: { errors } } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { season }
  });

  const currentTeamName = watch("teamName") || "आमचा संघ";

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1024 * 1024) { // 1 MB limit
        setLogoOverSize(true);
        setTeamLogo(null);
      } else {
        setLogoOverSize(false);
        setTeamLogo(file);
      }
    }
  };

  // स्टेप व्हॅलिडेशन - फक्त पुढील स्टेपवर नेण्यासाठी
  const handleNext = async (e) => {
    e.preventDefault(); // फॉर्म डायरेक्ट सबमिट होण्यापासून रोखणे
    let isValid = false;

    if (step === 1) {
      isValid = await trigger(["teamName", "category", "district", "vibhag", "playerCount"]);
    } else if (step === 2) {
      isValid = await trigger(["captainName", "captainPhone", "managerName", "managerPhone", "email"]);
    }
    
    if (isValid) {
      setStep((prev) => prev + 1); // स्टेप वाढवणे (उदा. 2 वरून 3 वर जाणे)
    }
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {

        // 🛑 १. डुप्लिकेट एन्ट्री चेक
      const dupCheck = await dataService.checkDuplicateTeam(data.teamName, data.captainPhone, season);
      
      if (dupCheck.isDuplicate) {
        setLoading(false);
        Swal.fire({
          icon: 'warning',
          title: 'आधीच नोंदणी झाली आहे!',
          text: dupCheck.reason,
          confirmButtonColor: '#FF6600'
        });
        return; // फॉर्म सबमिट होण्यापासून रोखणे
      }
      
      const seasonYear = season.slice(-2);
      const regId = await generateRegistrationId(data.category, seasonYear);

      const payload = {
        registrationId: regId,
        season,
        teamName: data.teamName,
        category: data.category,
        district: data.district,
        vibhag: data.vibhag,
        pincode: data.pincode || "",
        playerCount: data.playerCount,
        captain: {
          name: data.captainName,
          phone: data.captainPhone,
        },
        manager: {
          name: data.managerName,
          phone: data.managerPhone,
        },
        email: data.email,
        status: "Pending",
        internalProbability: 50
      };

      // ImgBB + Firestore मध्ये सेव्ह करणे
      await dataService.saveTeam(payload, {
        logo: teamLogo,
        captainPhoto: captainPhoto
      });

      Swal.fire({
        icon: 'success',
        title: 'रजिस्ट्रेशन यशस्वी झाले!',
        html: `तुमचा रजिस्ट्रेशन आयडी: <br/><b class="text-2xl text-amber-400 my-2 block">${regId}</b> कृपया हा आयडी जतन करून ठेवा.`,
        confirmButtonColor: '#FF6600',
        confirmButtonText: 'मुख्य पानावर जा'
      }).then(() => {
        window.location.href = "#/";
      });

    } catch (err) {
      console.error("❌ Registration error:", err);
      Swal.fire({ icon: 'error', title: 'त्रुटी!', text: 'रजिस्ट्रेशन करताना अडचण आली. पुन्हा प्रयत्न करा.' });
    } finally {
      setLoading(false);
    }
  };

  const whatsappUrl = `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `नमस्कार, मी माझ्या संघाचा HD Logo/PDF पाठवत आहे.\nसंघ नाव: ${currentTeamName}`
  )}`;

  return (
    <div className="max-w-3xl mx-auto my-8 px-4">
      {/* Stepper Header */}
      <div className="glass-panel p-4 rounded-2xl mb-8 flex justify-between items-center text-xs font-semibold">
        <div className={`flex items-center gap-2 ${step >= 1 ? 'text-amber-400' : 'text-slate-500'}`}>
          <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center">1</span>
          <span>संघ माहिती</span>
        </div>
        <div className="h-[1px] w-8 bg-slate-700" />
        <div className={`flex items-center gap-2 ${step >= 2 ? 'text-amber-400' : 'text-slate-500'}`}>
          <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center">2</span>
          <span>संपर्क (कॅप्टन/मॅनेजर)</span>
        </div>
        <div className="h-[1px] w-8 bg-slate-700" />
        <div className={`flex items-center gap-2 ${step >= 3 ? 'text-amber-400' : 'text-slate-500'}`}>
          <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center">3</span>
          <span>लोगो व फोटो</span>
        </div>
      </div>

      {/* Main Form Body */}
      <form onSubmit={handleSubmit(onSubmit)} className="glass-panel p-6 sm:p-8 rounded-3xl space-y-6">
        
        {/* Step 1: Team Info */}
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
                  <optgroup label="प्रमुख जिल्हे">
                    {priorityDistricts.map(d => <option key={d} value={d}>{d}</option>)}
                  </optgroup>
                  <optgroup label="इतर जिल्हे">
                    {otherDistricts.map(d => <option key={d} value={d}>{d}</option>)}
                  </optgroup>
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

        {/* Step 2: Contact Details */}
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
                <input {...register("captainPhone")} placeholder="9876543210" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-amber-400 focus:outline-none" />
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
                <input {...register("managerPhone")} placeholder="9876543210" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-amber-400 focus:outline-none" />
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

        {/* Step 3: Photo Upload (Optional Step) */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-amber-400 flex items-center gap-2">
              <Upload className="w-5 h-5" /> ३. संघाचा लोगो व कॅप्टनचा फोटो (ऐच्छिक)
            </h2>

            <div className="border-2 border-dashed border-slate-700 rounded-2xl p-6 text-center hover:border-amber-400 transition bg-slate-900/50">
              <label className="cursor-pointer block space-y-2">
                <Upload className="w-8 h-8 text-amber-400 mx-auto" />
                <span className="block text-sm text-slate-200 font-semibold">संघाचा लोगो (Team Logo - Max 1MB)</span>
                <span className="block text-xs text-slate-400">PNG, JPG निवडा (नसल्यास रिकामे ठेवा)</span>
                <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
              </label>

              {teamLogo && <p className="text-xs text-green-400 font-semibold mt-2">✓ निवडले: {teamLogo.name}</p>}

              {logoOverSize && (
                <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-left space-y-2">
                  <p className="text-xs text-amber-300 font-medium">
                    ⚠️ तुमची फाईल १ MB पेक्षा मोठी आहे किंवा HD/PDF आहे.
                  </p>
                  <a 
                    href={whatsappUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-bold text-xs rounded-lg transition"
                  >
                    <MessageSquare className="w-4 h-4" /> WhatsApp वर लोगो पाठवा
                  </a>
                </div>
              )}
            </div>

            <div className="border-2 border-dashed border-slate-700 rounded-2xl p-6 text-center hover:border-amber-400 transition bg-slate-900/50">
              <label className="cursor-pointer block space-y-2">
                <User className="w-8 h-8 text-amber-400 mx-auto" />
                <span className="block text-sm text-slate-200 font-semibold">कॅप्टनचा फोटो (Captain Photo - ऐच्छिक)</span>
                <input type="file" accept="image/*" onChange={(e) => setCaptainPhoto(e.target.files[0])} className="hidden" />
              </label>
              {captainPhoto && <p className="text-xs text-green-400 font-semibold mt-2">✓ निवडले: {captainPhoto.name}</p>}
            </div>
          </div>
        )}

        {/* Buttons Section */}
        <div className="flex justify-between items-center pt-4 border-t border-slate-800">
          {step > 1 ? (
            <button 
              type="button" 
              onClick={() => setStep(step - 1)} 
              className="px-5 py-2.5 bg-slate-800 text-white font-semibold rounded-xl flex items-center gap-1 hover:bg-slate-700"
            >
              <ChevronLeft className="w-4 h-4" /> मागे
            </button>
          ) : <div />}

          {/* स्टेप १ आणि २ वर असताना 'type="button"' मुळे फॉर्म सबमिट न होता स्टेप ३ उघडेल */}
          {step < 3 ? (
            <button 
              type="button" 
              onClick={handleNext} 
              className="px-6 py-2.5 bg-amber-500 text-black font-bold rounded-xl flex items-center gap-1 hover:bg-amber-400"
            >
              पुढील स्टेप <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            /* फक्त स्टेप ३ वरच मुख्य सबमिट बटण येईल */
            <button 
              type="submit" 
              disabled={loading} 
              className="px-8 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-extrabold rounded-xl hover:opacity-90 disabled:opacity-50 shadow-lg shadow-amber-500/20"
            >
              {loading ? "प्रक्रिया सुरू आहे..." : "रजिस्ट्रेशन सबमिट करा"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}