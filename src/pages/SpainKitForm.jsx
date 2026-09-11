import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import Swal from 'sweetalert2';
import { Shirt, Save, X, Loader2, User, Phone } from 'lucide-react';

const TSHIRT_SIZES = ["S (36)", "M (38)", "L (40)", "XL (42)", "XXL (44)", "3XL (46)", "CUSTOM"];
const SHORTS_SIZES = ["28", "30", "32", "34", "36", "38", "40", "42", "CUSTOM"];
const WAIST_SIZES = ["28", "30", "32", "34", "36", "38", "40", "42", "44", "CUSTOM"];
const LENGTH_SIZES = ["36", "38", "39", "40", "41", "42", "43", "44", "CUSTOM"];
const JACKET_SIZES = ["S", "M", "L", "XL", "XXL", "3XL", "CUSTOM"];

const stripDevanagari = (str) => {
  if (!str) return '';
  return str.replace(/[\u0900-\u097F]/g, '');
};

export default function SpainKitForm({ currentUser, initialData, onComplete, onCancel }) {
  const [submitting, setSubmitting] = useState(false);
  
  // 🎯 Custom Values States
  const [customTshirt, setCustomTshirt] = useState('');
  const [customShorts, setCustomShorts] = useState('');
  const [customWaist, setCustomWaist] = useState('');
  const [customLength, setCustomLength] = useState('');
  const [customJacket, setCustomJacket] = useState('');

  const [formData, setFormData] = useState({
    fullName: initialData?.fullNameAsPassport || initialData?.fullName || '',
    gender: initialData?.gender || 'Male',
    contactNo: initialData?.applicantContactNo || initialData?.contactNo || '',
    tshirtSize: initialData?.tshirtSize || 'L (40)',
    shortsSize: initialData?.shortsSize || '32',
    trackpantWaist: initialData?.trackpantWaist || '32',
    trackpantLength: initialData?.trackpantLength || '40',
    jacketSize: initialData?.jacketSize || 'L'
  });

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        fullName: initialData.fullNameAsPassport || initialData.fullName || '',
        gender: initialData.gender || 'Male',
        contactNo: initialData.applicantContactNo || initialData.contactNo || '',
        tshirtSize: initialData.tshirtSize || 'L (40)',
        shortsSize: initialData.shortsSize || '32',
        trackpantWaist: initialData.trackpantWaist || '32',
        trackpantLength: initialData.trackpantLength || '40',
        jacketSize: initialData.jacketSize || 'L'
      }));

      // T-Shirt Custom Check
      if (initialData.tshirtSize && !TSHIRT_SIZES.includes(initialData.tshirtSize)) {
        setFormData(prev => ({ ...prev, tshirtSize: 'CUSTOM' }));
        setCustomTshirt(initialData.tshirtSize);
      }
      // Shorts Custom Check
      if (initialData.shortsSize && !SHORTS_SIZES.includes(initialData.shortsSize)) {
        setFormData(prev => ({ ...prev, shortsSize: 'CUSTOM' }));
        setCustomShorts(initialData.shortsSize);
      }
      // Track Waist Custom Check
      if (initialData.trackpantWaist && !WAIST_SIZES.includes(initialData.trackpantWaist)) {
        setFormData(prev => ({ ...prev, trackpantWaist: 'CUSTOM' }));
        setCustomWaist(initialData.trackpantWaist);
      }
      // Track Length Custom Check
      if (initialData.trackpantLength && !LENGTH_SIZES.includes(initialData.trackpantLength)) {
        setFormData(prev => ({ ...prev, trackpantLength: 'CUSTOM' }));
        setCustomLength(initialData.trackpantLength);
      }
      // Jacket Custom Check
      if (initialData.jacketSize && !JACKET_SIZES.includes(initialData.jacketSize)) {
        setFormData(prev => ({ ...prev, jacketSize: 'CUSTOM' }));
        setCustomJacket(initialData.jacketSize);
      }
    }
  }, [initialData]);

  const handleChange = (field, val) => {
    setFormData(prev => ({ ...prev, [field]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.fullName.trim()) {
      Swal.fire({ icon: 'warning', title: 'Name Required', text: 'Please enter full name.' });
      return;
    }

    setSubmitting(true);
    try {
      const emailLower = currentUser?.email?.toLowerCase().trim() || 'guest@tour.com';
      
      // 🎯 Custom Values Parsing
      const finalTshirt = formData.tshirtSize === 'CUSTOM' ? (customTshirt.trim().toUpperCase() || 'CUSTOM') : formData.tshirtSize;
      const finalShorts = formData.shortsSize === 'CUSTOM' ? (customShorts.trim().toUpperCase() || 'CUSTOM') : formData.shortsSize;
      const finalWaist = formData.trackpantWaist === 'CUSTOM' ? (customWaist.trim() || 'CUSTOM') : formData.trackpantWaist;
      const finalLength = formData.trackpantLength === 'CUSTOM' ? (customLength.trim() || 'CUSTOM') : formData.trackpantLength;
      const finalJacket = formData.jacketSize === 'CUSTOM' ? (customJacket.trim().toUpperCase() || 'CUSTOM') : formData.jacketSize;

      const payload = {
        fullNameAsPassport: formData.fullName.trim().toUpperCase(),
        fullName: formData.fullName.trim().toUpperCase(),
        gender: formData.gender,
        applicantContactNo: formData.contactNo.trim(),
        contactNo: formData.contactNo.trim(),
        tshirtSize: finalTshirt,
        shortsSize: finalShorts,
        trackpantWaist: finalWaist,
        trackpantLength: finalLength,
        jacketSize: finalJacket,
        submittedBy: emailLower,
        status: 'Kit Submitted',
        updatedAt: new Date().toISOString()
      };

      if (initialData?.id) {
        const docRef = doc(db, "spain_tour_applications_2026", initialData.id);
        await updateDoc(docRef, payload);
      } else {
        payload.memberId = `KIT-${Date.now().toString().slice(-6)}`;
        payload.createdAt = new Date().toISOString();
        await addDoc(collection(db, "spain_tour_applications_2026"), payload);
      }

      Swal.fire({
        icon: 'success',
        title: 'Measurements Saved!',
        text: `Kit sizes saved for ${formData.fullName}`,
        timer: 1400,
        showConfirmButton: false,
        background: '#0f172a',
        color: '#fff'
      });

      if (onComplete) onComplete();
    } catch (err) {
      console.error("Kit submit error:", err);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to save kit details.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#0c0d14] border border-amber-500/40 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4 max-w-xl mx-auto font-sans text-slate-200">
      
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <Shirt className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white uppercase tracking-wide">
              {initialData ? 'Update Kit Measurements' : 'Add Kit Measurements'}
            </h2>
            <p className="text-[11px] text-slate-400 font-mono">
              Account: {currentUser?.email}
            </p>
          </div>
        </div>

        {onCancel && (
          <button onClick={onCancel} className="p-1 text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        
        {/* Full Name & Gender */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold text-slate-300 mb-1">
              Member Full Name *
            </label>
            <div className="relative">
              <User className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                required
                placeholder="e.g. SANDESH MAHADIK"
                value={formData.fullName}
                onChange={(e) => handleChange('fullName', stripDevanagari(e.target.value).toUpperCase())}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white uppercase font-bold focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* GENDER DROPDOWN */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">
              Gender (लिंग) *
            </label>
            <select
              value={formData.gender}
              onChange={(e) => handleChange('gender', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-amber-400 font-bold focus:outline-none focus:border-amber-400"
            >
              <option value="Male">Male (पुरुष)</option>
              <option value="Female">Female (महिला)</option>
            </select>
          </div>
        </div>

        {/* Contact No */}
        <div>
          <label className="block text-[11px] font-bold text-slate-300 mb-1">
            Contact Number (Optional)
          </label>
          <div className="relative">
            <Phone className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="tel"
              maxLength="10"
              placeholder="10-digit mobile"
              value={formData.contactNo}
              onChange={(e) => handleChange('contactNo', e.target.value.replace(/[^0-9]/g, ''))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
            />
          </div>
        </div>

        {/* Sizes Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          
          {/* T-Shirt */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 mb-1">T-Shirt *</label>
            <select
              value={formData.tshirtSize}
              onChange={(e) => handleChange('tshirtSize', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-white font-bold focus:outline-none"
            >
              {TSHIRT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {formData.tshirtSize === 'CUSTOM' && (
              <input
                type="text"
                placeholder="उदा. 48"
                value={customTshirt}
                onChange={(e) => setCustomTshirt(stripDevanagari(e.target.value).toUpperCase())}
                className="w-full mt-1 bg-slate-950 border border-amber-500/40 rounded-lg p-1 text-[11px] text-amber-300 font-bold"
                required
              />
            )}
          </div>

          {/* Shorts */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 mb-1">Shorts *</label>
            <select
              value={formData.shortsSize}
              onChange={(e) => handleChange('shortsSize', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-white font-bold focus:outline-none"
            >
              {SHORTS_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {formData.shortsSize === 'CUSTOM' && (
              <input
                type="text"
                placeholder="उदा. 44"
                value={customShorts}
                onChange={(e) => setCustomShorts(stripDevanagari(e.target.value).toUpperCase())}
                className="w-full mt-1 bg-slate-950 border border-amber-500/40 rounded-lg p-1 text-[11px] text-amber-300 font-bold"
                required
              />
            )}
          </div>

          {/* Track Waist (कमर) */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 mb-1">Track Waist *</label>
            <select
              value={formData.trackpantWaist}
              onChange={(e) => handleChange('trackpantWaist', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-white font-bold focus:outline-none"
            >
              {WAIST_SIZES.map(w => <option key={w} value={w}>{w === 'CUSTOM' ? 'CUSTOM' : `${w} in`}</option>)}
            </select>
            {formData.trackpantWaist === 'CUSTOM' && (
              <input
                type="text"
                placeholder="उदा. 33"
                value={customWaist}
                onChange={(e) => setCustomWaist(stripDevanagari(e.target.value).toUpperCase())}
                className="w-full mt-1 bg-slate-950 border border-amber-500/40 rounded-lg p-1 text-[11px] text-amber-300 font-bold"
                required
              />
            )}
          </div>

          {/* Track Length (लांबी) */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 mb-1">Track Length *</label>
            <select
              value={formData.trackpantLength}
              onChange={(e) => handleChange('trackpantLength', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-white font-bold focus:outline-none"
            >
              {LENGTH_SIZES.map(l => <option key={l} value={l}>{l === 'CUSTOM' ? 'CUSTOM' : `${l} in`}</option>)}
            </select>
            {formData.trackpantLength === 'CUSTOM' && (
              <input
                type="text"
                placeholder="उदा. 37.5"
                value={customLength}
                onChange={(e) => setCustomLength(stripDevanagari(e.target.value).toUpperCase())}
                className="w-full mt-1 bg-slate-950 border border-amber-500/40 rounded-lg p-1 text-[11px] text-amber-300 font-bold"
                required
              />
            )}
          </div>
        </div>

        {/* Jacket Size */}
        <div>
          <label className="block text-[10px] font-semibold text-slate-400 mb-1">Jacket Size *</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={formData.jacketSize}
              onChange={(e) => handleChange('jacketSize', e.target.value)}
              className="w-full sm:w-1/2 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-bold focus:outline-none"
            >
              {JACKET_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {formData.jacketSize === 'CUSTOM' && (
              <input
                type="text"
                placeholder="उदा. 48 किंवा 4XL"
                value={customJacket}
                onChange={(e) => setCustomJacket(stripDevanagari(e.target.value).toUpperCase())}
                className="w-full sm:w-1/2 bg-slate-950 border border-amber-500/40 rounded-xl px-2.5 py-1.5 text-xs text-amber-300 font-bold focus:outline-none uppercase"
                required
              />
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3.5 py-1.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Save Measurements</span>
          </button>
        </div>

      </form>
    </div>
  );
}