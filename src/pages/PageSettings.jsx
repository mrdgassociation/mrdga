import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import Swal from 'sweetalert2';
import { ToggleLeft, ToggleRight, Shield, Save } from 'lucide-react';

export default function PageSettings() {
  const [config, setConfig] = useState({
    aboutPage: false,
    insurancePage: false,
    contactPage: false,
    competitionPage: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      const data = await dataService.getPageConfig();
      if (data) setConfig(data);
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
        title: 'पेज परवानग्या अपडेट झाल्या!',
        text: 'वेबसाईटवर त्वरित बदल लागू झाले आहेत.',
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
    <div className="max-w-2xl mx-auto space-y-4 font-sans p-2">
      <div className="flex justify-between items-center bg-black/50 border border-amber-500/20 p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-amber-400" />
          <div>
            <h2 className="text-sm font-black text-white">वेबसाईट पेजेस कंट्रोल (Page Visibility)</h2>
            <p className="text-[10px] text-gray-400">इथून पेजेस ऑन/ऑफ करा. डिप्लॉयमेंटची गरज नाही.</p>
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

      <div className="bg-black/40 border border-amber-500/15 rounded-2xl p-4 space-y-3">
        
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
    </div>
  );
}