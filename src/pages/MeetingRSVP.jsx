import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { Calendar, MapPin, Users, Send, Loader2, CheckCircle2, Eye, UserCheck } from 'lucide-react';
import { dataService } from '../services/dataService';

export default function MeetingRSVP() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  const [teamName, setTeamName] = useState('');
  const [contactPerson, setContactPerson] = useState(''); // कॅप्टन / अध्यक्ष नाव (प्रतिनिधी १)
  const [mainPhone, setMainPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // ⚙️ Dynamic Max Members Limit State (Super Admin द्वारे कंट्रोल्ड)
  const [maxMembers, setMaxMembers] = useState(2); // डिफॉल्ट २ जण
  const [additionalMembers, setAdditionalMembers] = useState([]);

  const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwduB8dMvnNqbEZ4rnfSBbZoAZqfN4tp9qBFR_6Gm6ErcOfuMAcftC3A8M17MqIsYO3fw/exec";
  const BANNER_IMAGE_URL = "/krishnanand-banner.jpeg";

  useEffect(() => {
    // 🔒 एकाच मोबाईलवरून दुबार एंट्री टाळण्यासाठी चेकिंग
    const hasAlreadySubmitted = localStorage.getItem('mrdga_rsvp_16aug_done');
    if (hasAlreadySubmitted) {
      setSubmitted(true);
    }

    const checkVisibilityAndConfig = async () => {
      try {
        const config = await dataService.getPageConfig();
        
        // जर फॉर्म बंद असेल तर रीडायरेक्ट करा
        if (config && config.meetingRsvpForm === false) {
          navigate('/', { replace: true });
          return;
        }

        // 🎯 सुपर ॲडमिनने सेट केलेली मर्यादा (मर्यादा २ असल्यास कॅप्टन व्यतिरिक्त १ नाव सुरुवातीला दिसेल)
        const limit = config?.maxRsvpMembers || 2;
        setMaxMembers(limit);

        const extraCount = Math.max(0, limit - 1);
        const initialExtra = Array(extraCount).fill('');
        setAdditionalMembers(initialExtra);

      } catch (err) {
        console.error("Config Check Error:", err);
      } finally {
        setChecking(false);
      }
    };

    checkVisibilityAndConfig();
  }, [navigate]);

  const toTitleCase = (str) => {
    if (!str) return '';
    return str
      .trim()
      .toLowerCase()
      .split(' ')
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const containsDevanagari = (str) => /[\u0900-\u097F]/.test(str);
  const isValidMobile = (phone) => /^[6-9]\d{9}$/.test(phone.trim());

  const addMember = () => {
    // 🔒 सुपर ॲडमिनच्या मर्यादेपेक्षा जास्त जोडू देणार नाही
    if (additionalMembers.length < (maxMembers - 1)) {
      setAdditionalMembers([...additionalMembers, '']);
    }
  };

  const removeMember = (index) => {
    if (additionalMembers.length > 0) {
      setAdditionalMembers(additionalMembers.filter((_, i) => i !== index));
    }
  };

  const handleNameChange = (index, value) => {
    const updated = [...additionalMembers];
    updated[index] = value;
    setAdditionalMembers(updated);
  };

  const showBannerPopup = () => {
    Swal.fire({
      title: '🚩 कृष्णानंद सोहळा पत्रिका',
      html: `
        <div style="text-align: center;">
          <img src="${BANNER_IMAGE_URL}" alt="कृष्णानंद सोहळा पत्रिका" style="width: 100%; max-height: 70vh; object-fit: contain; border-radius: 12px; border: 1px solid #f59e0b;" />
          <div style="margin-top: 15px;">
            <a href="${BANNER_IMAGE_URL}" download="Krishnanand_Sohala_Invitation.jpg" target="_blank" style="display: inline-flex; align-items: center; gap: 6px; background-color: #f59e0b; color: #000; font-weight: bold; padding: 8px 16px; border-radius: 10px; text-decoration: none; font-size: 12px;">
              📥 पत्रिका डाऊनलोड करा (Download)
            </a>
          </div>
        </div>
      `,
      showConfirmButton: false,
      showCloseButton: true,
      background: '#0c0d14',
      color: '#fff',
      customClass: {
        popup: 'rounded-3xl border border-amber-500/30'
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (containsDevanagari(teamName) || containsDevanagari(contactPerson)) {
      Swal.fire({
        icon: 'warning',
        title: 'इंग्रजी अक्षरे वापरा (English Only)',
        text: 'कृपया मंडळाचे व अध्यक्षांचे नाव फक्त इंग्रजीमध्ये टाईप करा.',
        background: '#0c0d14',
        color: '#fff'
      });
      return;
    }

    if (!isValidMobile(mainPhone)) {
      Swal.fire({
        icon: 'warning',
        title: 'चुकीचा मोबाईल नंबर',
        text: 'कृपया १० अंकी योग्य मोबाईल नंबर टाका.'
      });
      return;
    }

    // जर maxMembers > 1 असेल तर किमान १ सोबती प्रतिनिधीचे नाव आवश्यक
    if (maxMembers > 1 && (!additionalMembers[0] || !additionalMembers[0].trim())) {
      Swal.fire({ 
        icon: 'warning', 
        title: 'प्रतिनिधी २ चे नाव टाका',
        text: 'कॅप्टन व्यतिरिक्त अतिरिक्त प्रतिनिधीचे नाव आवश्यक आहे.'
      });
      return;
    }

    setLoading(true);

    const formattedTeamName = toTitleCase(teamName);
    const formattedCaptainName = toTitleCase(contactPerson);

    const validAdditionalCount = additionalMembers.filter(n => n.trim() !== '').length;
    const totalCount = 1 + validAdditionalCount;

    const rawPayload = {
      action: "16_AUG_RSVP",
      teamName: formattedTeamName,
      contactPerson: formattedCaptainName,
      mainPhone: mainPhone.trim(),
      totalCount: totalCount,
      m1Name: formattedCaptainName,
      m2Name: toTitleCase(additionalMembers[0] || ''),
      m3Name: toTitleCase(additionalMembers[1] || ''),
      m4Name: toTitleCase(additionalMembers[2] || ''),
      m5Name: toTitleCase(additionalMembers[3] || '')
    };

    try {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(rawPayload)
      });

      localStorage.setItem('mrdga_rsvp_16aug_done', 'true');
      setSubmitted(true);

      Swal.fire({
        icon: 'success',
        title: 'उपस्थिती नोंदवली गेली!',
        text: `${formattedTeamName} ची १६ ऑगस्टच्या सोहळ्यासाठी उपस्थिती कन्फर्म झाली आहे.`,
        background: '#0c0d14',
        color: '#fff'
      });

    } catch (err) {
      console.error("❌ SUBMISSION FAILED:", err);
      Swal.fire({ 
        icon: 'error', 
        title: 'त्रुटी!', 
        html: `डेटा सेव्ह करताना त्रुटी आली.<br/><code style="font-size:10px; color:#f87171">${err.toString()}</code>` 
      });
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-[#08090d] text-white flex items-center justify-center font-sans">
        <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#08090d] text-white p-4 font-sans flex items-center justify-center">
        <div className="max-w-md w-full bg-slate-900 border border-emerald-500/40 p-6 rounded-3xl text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 animate-bounce" />
          </div>
          <div>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold uppercase">
              RSVP CONFIRMED
            </span>
            <h2 className="text-xl font-black text-white mt-2">उपस्थिती नोंदवली आहे!</h2>
            <p className="text-xs text-slate-300 mt-1">
              १६ ऑगस्टच्या 'कृष्णानंद सोहळा' बैठकीसाठी तुमची उपस्थिती यशस्वीरित्या नोंदवली गेली आहे.
            </p>
          </div>
          
          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl text-xs text-amber-300 font-mono space-y-2 text-left">
            <div className="flex justify-between border-b border-slate-800/80 pb-1">
              <span className="text-slate-400 font-sans">बैठक दिनांक:</span>
              <span className="font-bold">१६ ऑगस्ट २०२६</span>
            </div>
            <div className="flex justify-between border-b border-slate-800/80 pb-1">
              <span className="text-slate-400 font-sans">वेळ व ठिकाण:</span>
              <span className="font-bold text-slate-200">१०:०० वा. (परेल)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-sans">स्टेटस:</span>
              <span className="font-bold text-emerald-400 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5" /> नोंदणी पूर्ण
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08090d] text-white p-3 sm:p-6 font-sans flex items-center justify-center">
      <div className="max-w-md w-full bg-slate-900 border border-amber-500/30 p-4 sm:p-5 rounded-3xl space-y-4 shadow-2xl">
        
        {/* Header */}
        <div className="text-center border-b border-slate-800 pb-3 space-y-2">
          <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide">
            MRDGA कृष्णानंद सोहळा २०२६
          </span>
          <h1 className="text-base sm:text-lg font-black text-white">
            १६ ऑगस्ट सोहळा उपस्थिती नोंदणी (RSVP)
          </h1>
          
          <div className="text-[11px] text-slate-300 space-y-1">
            <p className="flex items-center justify-center gap-1.5 text-amber-400 font-bold">
              <Calendar className="w-3.5 h-3.5 shrink-0" /> रविवार, १६ ऑगस्ट २०२६ (सकाळी १०:०० वा.)
            </p>
            <p className="flex items-center justify-center gap-1.5 text-slate-400 text-[10px]">
              <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />राष्ट्रीय मिल मजदूर संघ, मजदूर मंजिल, जी. डी. आंबेकर रोड, भोईवाडा, परेल, मुंबई ४०००१२

            </p>
          </div>

          <div className="pt-1">
            <button
              type="button"
              onClick={showBannerPopup}
              className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-xl text-[11px] font-bold inline-flex items-center gap-1.5 transition cursor-pointer shadow-sm"
            >
              <Eye className="w-3.5 h-3.5 text-amber-400" />
              <span>निमंत्रण पत्रिका पाहा / डाऊनलोड करा</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="text-slate-300 font-bold block mb-1">१. मंडळाचे नाव (English Only) *</label>
            <input
              type="text"
              placeholder="e.g. Jay Bharat Seva Sangh"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-slate-300 font-bold block mb-1">२. अध्यक्ष/कॅप्टन नाव (प्रतिनिधी १) *</label>
              <input
                type="text"
                placeholder="e.g. Amit Pradhan"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                required
              />
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">३. मोबाईल नंबर *</label>
              <input
                type="tel"
                placeholder="१० अंकी मोबाईल नंबर"
                value={mainPhone}
                onChange={(e) => setMainPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400 font-mono"
                required
              />
            </div>
          </div>

          {/* 👥 सोबती प्रतिनिधी विभाग (Dynamic Max Members) */}
          {maxMembers > 1 && (
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="text-amber-400 font-extrabold flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5"/> इतर सोबती प्रतिनिधींची नावे (कमाल {maxMembers - 1})
                </span>
                <span className="text-[10px] text-slate-400 font-normal">(एकूण संघ: १ + {additionalMembers.length})</span>
              </label>

              {additionalMembers.map((name, idx) => (
                <div key={idx} className="bg-slate-950 p-2 rounded-xl border border-slate-800 flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-500 w-20 shrink-0">
                    प्रतिनिधी {idx + 2} {idx === 0 ? '*' : ''}
                  </span>
                  <input
                    type="text"
                    placeholder="प्रतिनिधीचे नाव (English)"
                    value={name}
                    onChange={(e) => handleNameChange(idx, e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white focus:outline-none focus:border-amber-400"
                    required={idx === 0}
                  />
                  {idx > 0 && (
                    <button type="button" onClick={() => removeMember(idx)} className="text-rose-400 hover:underline text-[10px] shrink-0 px-1">
                      हटवा
                    </button>
                  )}
                </div>
              ))}

              {/* 🔒 मर्यादा संपली की '+ आणखी प्रतिनिधी जोडा' बटण लपेल */}
              {additionalMembers.length < (maxMembers - 1) && (
                <button
                  type="button"
                  onClick={addMember}
                  className="w-full py-1.5 bg-slate-800 hover:bg-slate-750 text-amber-300 font-bold text-[11px] rounded-xl border border-amber-500/20 transition cursor-pointer"
                >
                  + आणखी प्रतिनिधी जोडा ({additionalMembers.length + 1}/{maxMembers} जण)
                </button>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4" />}
            {loading ? 'कन्फर्म होत आहे...' : 'उपस्थिती कन्फर्म करा (Submit RSVP)'}
          </button>
        </form>

      </div>
    </div>
  );
}