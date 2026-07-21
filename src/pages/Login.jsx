import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import Swal from 'sweetalert2';
import { Shield, LogIn } from 'lucide-react';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const user = await authService.loginWithGoogle();
      Swal.fire({
        icon: 'success',
        title: 'लॉगिन यशस्वी!',
        text: `स्वागत आहे, ${user.displayName} (${user.role})`,
        timer: 1500,
        showConfirmButton: false
      });
      navigate('/admin');
    } catch (error) {
      if (error.message === "UNAUTHORIZED_EMAIL") {
        Swal.fire({
          icon: 'error',
          title: 'परवानगी नाही!',
          text: 'तुमचा ईमेल आयडी ॲडमिन लिस्टमध्ये समाविष्ट नाही. कृपया सुपर ॲडमिनशी संपर्क साधा.',
          confirmButtonColor: '#FF6600'
        });
      } else if (error.message === "ACCOUNT_INACTIVE") {
        Swal.fire({
          icon: 'warning',
          title: 'अकाऊंट निष्क्रिय आहे!',
          text: 'तुमचे अकाऊंट सध्या Active नाही.',
          confirmButtonColor: '#FF6600'
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'लॉगिन अयशस्वी!',
          text: 'Google Authentication मध्ये अडचण आली.'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-dark px-4">
      <div className="glass-panel p-8 rounded-3xl max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl flex items-center justify-center mx-auto">
          <Shield className="w-8 h-8" />
        </div>

        <div>
          <h1 className="text-2xl font-black text-white">MRDGA Admin Portal</h1>
          <p className="text-slate-400 text-sm mt-1">फक्त अधिकृत व्यवस्थापकांसाठी</p>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-3.5 px-4 bg-white text-slate-900 font-bold rounded-2xl flex items-center justify-center gap-3 hover:bg-slate-100 transition shadow-lg"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          {loading ? "लॉगिन होत आहे..." : "Google ने लॉगिन करा"}
        </button>
      </div>
    </div>
  );
}