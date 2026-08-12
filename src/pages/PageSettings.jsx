import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import Swal from 'sweetalert2';
import { ToggleLeft, ToggleRight, Shield, Save, LayoutDashboard, Trophy, FileText, Calendar, Users } from 'lucide-react';

export default function PageSettings() {
  const [config, setConfig] = useState({
    // Public Pages Visibility
    aboutPage: false,
    insurancePage: false,
    contactPage: false,
    competitionPage: true,

    // 🎯 📝 Form Acceptance Toggles (फॉर्म ऑन/ऑफ सेटिंग्ज)
    insuranceForm: true, // गोविंदा विमा अर्ज स्वीकृती (ON/OFF)
    meetingRsvpForm: true, // १६ ऑगस्ट बैठक RSVP अर्ज (ON/OFF)
    maxRsvpMembers: 2, // 👈 🚩 प्रतिनिधी मर्यादा (Default: 2)

    // 🔒 Admin Menu Visibility Toggles
    showDahiHandiScoringMenu: true,
    showCompetitionsMenu: true,
    showInsuranceMenu: true,
    showReportsMenu: true
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      const data = await dataService.getPageConfig();
      if (data) setConfig(prev => ({ ...prev, ...data }));
      setLoading(false);
    };
    fetchConfig();
  }, []);

  const handleToggle = (key) => {
    setConfig(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await dataService.updatePageConfig(config);
      Swal.fire({
        icon: 'success',
        title: 'सेटिंग्ज सेव्ह झाल्या!',
        text: 'वेबसाईट आणि ॲडमिन पॅनेलवर नवीन बदल लागू झाले आहेत.',
        timer: 1500,
        showConfirmButton: false,
        background: '#0c0d14',
        color: '#fff'
      });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'त्रुटी!', text: 'बदल सेव्ह झाले नाहीत.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="p-8 text-center text-amber-400 text-xs animate-pulse">सेटिंग्ज लोड होत आहेत...</p>;

  return (
    <div className="max-w-2xl mx-auto space-y-5 font-sans p-2 text-white">
      {/* Header Bar */}
      <div className="flex justify-between items-center bg-black/50 border border-amber-500/20 p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-amber-400" />
          <div>
            <h2 className="text-sm font-black text-white">वेबसाईट व ॲडमिन कंट्रोल (Page & Menu Visibility)</h2>
            <p className="text-[10px] text-gray-400">इथून ऑन/ऑफ करा. डिप्लॉयमेंटची गरज नाही.</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
        >
          <Save className="w-4 h-4" /> {saving ? 'सेव्ह...' : 'सेव्ह करा'}
        </button>
      </div>

      {/* 📝 1. Form Acceptance Controls (फॉर्म स्वीकृती विभाग) */}
      <div className="bg-black/40 border border-amber-500/15 rounded-2xl p-4 space-y-3">
        <h3 className="text-xs font-extrabold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <FileText className="w-4 h-4" /> अर्ज स्वीकृती कंट्रोल (Form Submissions)
        </h3>

        {/* Insurance Form Acceptance Toggle */}
        <div className="flex justify-between items-center p-3 bg-black/60 rounded-xl border border-amber-500/30">
          <div>
            <h4 className="text-xs font-bold text-amber-400">गोविंदा विमा अर्ज स्वीकृती (Insurance Form)</h4>
            <p className="text-[10px] text-gray-400">
              {config.insuranceForm !== false ? 'अर्ज स्वीकृती सुरु आहे (Form Active)' : 'अर्ज स्वीकृती बंद (Form Closed)'}
            </p>
          </div>
          <button onClick={() => handleToggle('insuranceForm')} className="text-amber-400 cursor-pointer">
            {config.insuranceForm !== false ? <ToggleRight className="w-8 h-8 text-emerald-400" /> : <ToggleLeft className="w-8 h-8 text-gray-600" />}
          </button>
        </div>

        {/* 🚩 16 AUG RSVP Form Acceptance Toggle & Dynamic Player Limit */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-black/60 rounded-xl border border-amber-500/30 gap-3">
          <div>
            <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> १६ ऑगस्ट बैठक RSVP अर्ज (Meeting RSVP)
            </h4>
            <p className="text-[10px] text-gray-400">
              {config.meetingRsvpForm !== false ? 'नोंदणी सुरु आहे (Active)' : 'नोंदणी बंद (Disabled - Redirects to Home)'}
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            {/* ⚙️ प्रतिनिधी संख्या निवड ड्रॉपडाऊन */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-amber-500/40 px-2.5 py-1 rounded-xl">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px] text-slate-300 font-bold">मर्यादा:</span>
              <select
                value={config.maxRsvpMembers || 2}
                onChange={(e) => setConfig(prev => ({ ...prev, maxRsvpMembers: Number(e.target.value) }))}
                className="bg-black text-amber-400 font-extrabold text-xs border-none focus:outline-none cursor-pointer rounded px-1 py-0.5"
              >
                <option value={1}>१ जण (फक्त कॅप्टन)</option>
                <option value={2}>२ जण (कॅप्टन + १)</option>
                <option value={3}>३ जण (कॅप्टन + २)</option>
                <option value={4}>४ जण (कॅप्टन + ३)</option>
                <option value={5}>५ जण (कॅप्टन + ४)</option>
              </select>
            </div>

            <button onClick={() => handleToggle('meetingRsvpForm')} className="text-amber-400 cursor-pointer shrink-0">
              {config.meetingRsvpForm !== false ? <ToggleRight className="w-8 h-8 text-emerald-400" /> : <ToggleLeft className="w-8 h-8 text-gray-600" />}
            </button>
          </div>
        </div>
      </div>

      {/* 🌐 2. Public Pages Control */}
      <div className="bg-black/40 border border-amber-500/15 rounded-2xl p-4 space-y-3">
        <h3 className="text-xs font-extrabold text-amber-400 uppercase tracking-wider mb-2">🌐 सार्वजनिक वेबसाईट पेजेस</h3>

        {/* Competition Page */}
        <div className="flex justify-between items-center p-3 bg-black/60 rounded-xl border border-white/5">
          <div>
            <h4 className="text-xs font-bold text-white">Competitions Page (स्पर्धा)</h4>
            <p className="text-[10px] text-gray-400">सार्वजनिक नोंदणीसाठी चालू ठेवा</p>
          </div>
          <button onClick={() => handleToggle('competitionPage')} className="text-amber-400 cursor-pointer">
            {config.competitionPage ? <ToggleRight className="w-8 h-8 text-emerald-400" /> : <ToggleLeft className="w-8 h-8 text-gray-600" />}
          </button>
        </div>

        {/* Insurance Info Page */}
        <div className="flex justify-between items-center p-3 bg-black/60 rounded-xl border border-white/5">
          <div>
            <h4 className="text-xs font-bold text-white">Insurance Info Page (विमा माहिती)</h4>
            <p className="text-[10px] text-gray-400">{config.insurancePage ? 'सुरळीत चालू आहे' : 'बंद (Coming Soon दिसेल)'}</p>
          </div>
          <button onClick={() => handleToggle('insurancePage')} className="text-amber-400 cursor-pointer">
            {config.insurancePage ? <ToggleRight className="w-8 h-8 text-emerald-400" /> : <ToggleLeft className="w-8 h-8 text-gray-600" />}
          </button>
        </div>

        {/* About Page */}
        <div className="flex justify-between items-center p-3 bg-black/60 rounded-xl border border-white/5">
          <div>
            <h4 className="text-xs font-bold text-white">About Page (आमच्याबद्दल)</h4>
            <p className="text-[10px] text-gray-400">{config.aboutPage ? 'सुरळीत चालू आहे' : 'बंद (Coming Soon दिसेल)'}</p>
          </div>
          <button onClick={() => handleToggle('aboutPage')} className="text-amber-400 cursor-pointer">
            {config.aboutPage ? <ToggleRight className="w-8 h-8 text-emerald-400" /> : <ToggleLeft className="w-8 h-8 text-gray-600" />}
          </button>
        </div>

        {/* Contact Page */}
        <div className="flex justify-between items-center p-3 bg-black/60 rounded-xl border border-white/5">
          <div>
            <h4 className="text-xs font-bold text-white">Contact / Helpdesk Page (संपर्क)</h4>
            <p className="text-[10px] text-gray-400">{config.contactPage ? 'सुरळीत चालू आहे' : 'बंद (Coming Soon दिसेल)'}</p>
          </div>
          <button onClick={() => handleToggle('contactPage')} className="text-amber-400 cursor-pointer">
            {config.contactPage ? <ToggleRight className="w-8 h-8 text-emerald-400" /> : <ToggleLeft className="w-8 h-8 text-gray-600" />}
          </button>
        </div>
      </div>

      {/* 🔒 3. Admin Dashboard Sidebar Menus Control */}
      <div className="bg-black/40 border border-amber-500/15 rounded-2xl p-4 space-y-3">
        <h3 className="text-xs font-extrabold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <LayoutDashboard className="w-4 h-4" /> ॲडमिन मेन्यू कंट्रोल (Sidebar Menus)
        </h3>

        {/* Dahi Handi Scoring Manager Menu */}
        <div className="flex justify-between items-center p-3 bg-black/60 rounded-xl border border-amber-500/30">
          <div>
            <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5" /> दहीहंडी स्पर्धा मेन्यू (Scoring)
            </h4>
            <p className="text-[10px] text-gray-400">
              {config.showDahiHandiScoringMenu !== false ? 'ॲडमिनला दिसेल' : 'लपवले (Hide)'}
            </p>
          </div>
          <button onClick={() => handleToggle('showDahiHandiScoringMenu')} className="text-amber-400 cursor-pointer">
            {config.showDahiHandiScoringMenu !== false ? <ToggleRight className="w-8 h-8 text-emerald-400" /> : <ToggleLeft className="w-8 h-8 text-gray-600" />}
          </button>
        </div>

        {/* Competition Form Applications */}
        <div className="flex justify-between items-center p-3 bg-black/60 rounded-xl border border-white/5">
          <div>
            <h4 className="text-xs font-bold text-white">स्पर्धा अर्ज मेन्यू (Competitions)</h4>
            <p className="text-[10px] text-gray-400">{config.showCompetitionsMenu !== false ? 'ॲडमिनला दिसेल' : 'लपवले (Hide)'}</p>
          </div>
          <button onClick={() => handleToggle('showCompetitionsMenu')} className="text-amber-400 cursor-pointer">
            {config.showCompetitionsMenu !== false ? <ToggleRight className="w-8 h-8 text-emerald-400" /> : <ToggleLeft className="w-8 h-8 text-gray-600" />}
          </button>
        </div>

        {/* Govinda Insurance Applications */}
        <div className="flex justify-between items-center p-3 bg-black/60 rounded-xl border border-white/5">
          <div>
            <h4 className="text-xs font-bold text-white">गोविंदा विमा अर्ज मेन्यू (Insurance)</h4>
            <p className="text-[10px] text-gray-400">{config.showInsuranceMenu !== false ? 'ॲडमिनला दिसेल' : 'लपवले (Hide)'}</p>
          </div>
          <button onClick={() => handleToggle('showInsuranceMenu')} className="text-amber-400 cursor-pointer">
            {config.showInsuranceMenu !== false ? <ToggleRight className="w-8 h-8 text-emerald-400" /> : <ToggleLeft className="w-8 h-8 text-gray-600" />}
          </button>
        </div>

        {/* Reports & Export */}
        <div className="flex justify-between items-center p-3 bg-black/60 rounded-xl border border-white/5">
          <div>
            <h4 className="text-xs font-bold text-white">रिपोर्ट्स & एक्सपोर्ट मेन्यू (Reports)</h4>
            <p className="text-[10px] text-gray-400">{config.showReportsMenu !== false ? 'ॲडमिनला दिसेल' : 'लपवले (Hide)'}</p>
          </div>
          <button onClick={() => handleToggle('showReportsMenu')} className="text-amber-400 cursor-pointer">
            {config.showReportsMenu !== false ? <ToggleRight className="w-8 h-8 text-emerald-400" /> : <ToggleLeft className="w-8 h-8 text-gray-600" />}
          </button>
        </div>
      </div>
    </div>
  );
}