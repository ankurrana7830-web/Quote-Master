"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../utils/supabase";
import { useRouter } from "next/navigation";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [isResetMode, setIsResetMode] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setIsLightMode(savedTheme === 'light');
    } else {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsLightMode(!systemPrefersDark);
    }
  }, []);

  const toggleTheme = () => {
    const newMode = !isLightMode;
    setIsLightMode(newMode);
    localStorage.setItem('theme', newMode ? 'light' : 'dark');
  };

  // 🧬 DYNAMIC 3D DNA LOGIC (Fixed Wavelength & Width)
  useEffect(() => {
    const canvas = document.getElementById('dna-canvas') as HTMLCanvasElement;
    
    if (!canvas || !canvas.parentElement) return;

    const ctx = canvas.getContext('2d');
    
    const handleResize = () => {
      canvas.width = canvas.parentElement!.offsetWidth; 
      canvas.height = window.innerHeight * 0.60; 
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    let dnaAngle = 0;
    let animationFrameId: number;

    const drawDNA = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const centerX = canvas.width / 2;
      const numNodes = 30; 
      const spacing = (canvas.height - 70) / (numNodes - 1); 
      
      // 🟢 FIXED: Chaudai (Width) ko control karne ke liye amplitude badhaya
      const amplitude = canvas.width * 0.45; 
      
      // 🟢 FIXED: y-axis par loop ki length badhane ke liye frequency kam ki (Stretched Look)
      const frequency = 0.25; 

      const colorRed = '#e3004f';
      const colorBlue = isLightMode ? '#0f2e5a' : '#3b82f6'; 

      for (let i = 0; i < numNodes; i++) {
        const y = i * spacing + 30; 
        const offset = i * frequency + dnaAngle;
        
        const x1 = centerX + Math.sin(offset) * amplitude;
        const x2 = centerX + Math.sin(offset + Math.PI) * amplitude;

        const z1 = Math.cos(offset);
        const z2 = Math.cos(offset + Math.PI);

        const scale1 = (z1 + 2) / 3; 
        const scale2 = (z2 + 2) / 3;

        const alpha1 = (z1 + 1.5) / 2.5; 
        const alpha2 = (z2 + 1.5) / 2.5;

        // Connecting Rungs
        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
        const lineAlpha = isLightMode ? 0.2 : 0.15;
        ctx.strokeStyle = isLightMode 
          ? `rgba(15, 46, 90, ${lineAlpha * Math.max(alpha1, alpha2)})` 
          : `rgba(255, 255, 255, ${lineAlpha * Math.max(alpha1, alpha2)})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Red Strand Node
        ctx.save();
        ctx.beginPath();
        ctx.arc(x1, y, 4.5 * scale1, 0, Math.PI * 2);
        ctx.fillStyle = colorRed;
        ctx.globalAlpha = alpha1;
        ctx.shadowBlur = 12 * scale1;
        ctx.shadowColor = colorRed;
        ctx.fill();
        ctx.restore();

        // Blue Strand Node
        ctx.save();
        ctx.beginPath();
        ctx.arc(x2, y, 4.5 * scale2, 0, Math.PI * 2);
        ctx.fillStyle = colorBlue;
        ctx.globalAlpha = scale2; // Bright front dots
        ctx.shadowBlur = 12 * scale2;
        ctx.shadowColor = colorBlue;
        ctx.fill();
        ctx.restore();
      }
      
      dnaAngle -= 0.02; 
      animationFrameId = requestAnimationFrame(drawDNA);
    };

    drawDNA();
    
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isLightMode, message.text, isResetMode]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: "", type: "" });

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMessage({ text: "❌ Invalid Access Code or Email!", type: "error" });
      setLoading(false);
    } else {
      router.push("/");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: "", type: "" });

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    if (error) {
      setMessage({ text: `❌ Error: ${error.message}`, type: "error" });
    } else {
      setMessage({ text: "✅ Password reset link sent to your email!", type: "success" });
    }
    setLoading(false);
  };

  return (
    <div className={`w-screen h-screen relative overflow-hidden transition-colors duration-700 flex items-center justify-center ${isLightMode ? 'bg-[#f8fafc]' : 'bg-[#050505]'}`}>
      
      {/* Background Floating Orbs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className={`absolute w-[45vw] h-[45vw] rounded-full blur-[120px] opacity-50 mix-blend-screen animate-blob ${isLightMode ? 'bg-[#93c5fd] top-[-10%] left-[-10%]' : 'bg-[#0f2e5a] top-[-10%] left-[-10%]'}`}></div>
        <div className={`absolute w-[40vw] h-[40vw] rounded-full blur-[120px] opacity-40 mix-blend-screen animate-blob animation-delay-2000 ${isLightMode ? 'bg-[#fca5a5] bottom-[-10%] right-[-10%]' : 'bg-[#e3004f] bottom-[-10%] right-[-10%]'}`}></div>
      </div>
      
      {/* Theme Toggle Button */}
      <button onClick={toggleTheme} className={`absolute top-6 right-6 z-50 p-3.5 rounded-full shadow-lg border transition-all backdrop-blur-md ${isLightMode ? 'bg-white/50 border-white/60 text-slate-700 hover:bg-white/80' : 'bg-black/30 border-white/10 text-yellow-400 hover:bg-black/60'}`}>
        <i className={`fas ${isLightMode ? 'fa-moon' : 'fa-sun'} text-xl`}></i>
      </button>

      {/* Main Flex Container */}
      <div className="relative z-10 flex items-center justify-center gap-6 md:gap-12 w-full max-w-5xl px-6">
        
        {/* 🟢 FIXED: Canvas Column Chaudai (Width) badha di gayi hai */}
        <div className="hidden md:block w-40 lg:w-48 flex-shrink-0 flex items-center justify-center h-full">
          <canvas id="dna-canvas" className="w-full pointer-events-none opacity-90"></canvas>
        </div>

        {/* Login Card */}
        <div id="login-card" className={`w-full max-w-md p-10 rounded-[2rem] backdrop-blur-2xl border transition-all duration-500 ${isLightMode ? 'bg-white/40 border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.1)]' : 'bg-white/5 border-white/10 shadow-[0_8px_32px_rgba(255,255,255,0.05)]'}`}>
          
          <div className="text-center mb-8">
            <img src="/logo.jpg" alt="Redcliffe Labs" className="w-24 h-24 mx-auto rounded-2xl shadow-[0_10px_25px_rgba(0,0,0,0.2)] mb-5 object-cover" />
            <h1 className={`font-black text-2xl md:text-3xl tracking-[0.2em] uppercase ${isLightMode ? 'text-[#0f2e5a]' : 'text-white'}`}>{isResetMode ? 'RECOVERY' : 'QUOTE MASTER'}</h1>
            <p className={`text-[10px] mt-2 tracking-[0.3em] font-bold uppercase ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>{isResetMode ? 'Secure Key Reset' : 'Sales Intelligence Core'}</p>
          </div>
          
          {message.text && (
            <div className={`mb-5 p-3 rounded-xl border text-sm text-center font-bold animate-fade-in ${message.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-500' : 'bg-rose-500/20 border-rose-500/50 text-rose-500'}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={isResetMode ? handleResetPassword : handleLogin} className="space-y-6">
            <div>
              <label className={`block text-[10px] font-bold tracking-widest uppercase mb-2 ${isLightMode ? 'text-slate-600' : 'text-slate-300'}`}>Authorized Email</label>
              <div className="relative">
                <i className="fas fa-envelope absolute left-4 top-4 text-slate-400"></i>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`w-full pl-12 pr-4 py-3.5 rounded-xl outline-none transition-all backdrop-blur-sm text-sm ${isLightMode ? 'bg-white/60 border border-white/80 focus:bg-white focus:border-[#0f2e5a] text-slate-800' : 'bg-black/30 border border-white/10 focus:bg-black/50 focus:border-[#e3004f] text-white'}`} placeholder="Enter your email ID" required />
              </div>
            </div>

            {!isResetMode && (
              <div>
                <label className={`block text-[10px] font-bold tracking-widest uppercase mb-2 ${isLightMode ? 'text-slate-600' : 'text-slate-300'}`}>Access Code</label>
                <div className="relative">
                  <i className="fas fa-lock absolute left-4 top-4 text-slate-400"></i>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={`w-full pl-12 pr-4 py-3.5 rounded-xl outline-none transition-all backdrop-blur-sm text-sm ${isLightMode ? 'bg-white/60 border border-white/80 focus:bg-white focus:border-[#0f2e5a] text-slate-800' : 'bg-black/30 border border-white/10 focus:bg-black/50 focus:border-[#e3004f] text-white'}`} placeholder="••••••••" required={!isResetMode} />
                </div>
                
                <div className="flex justify-end mt-2">
                  <button type="button" onClick={() => { setIsResetMode(true); setMessage({ text: "", type: "" }); }} className={`text-[10px] font-bold uppercase tracking-wider hover:underline transition-colors ${isLightMode ? 'text-[#0f2e5a]' : 'text-[#e3004f]'}`}>
                    Forgot Password
                  </button>
                </div>
              </div>
            )}

            <button type="submit" disabled={loading} className={`w-full py-4 rounded-xl font-bold uppercase tracking-[0.2em] text-xs transition-all text-white flex items-center justify-center gap-3 mt-4 ${isLightMode ? 'bg-[#0f2e5a] hover:bg-[#153e7a] shadow-lg' : 'bg-[#e3004f] hover:bg-[#ff0059] shadow-[0_0_20px_rgba(227,0,79,0.3)]'}`}>
              {loading ? <i className="fas fa-spinner fa-spin text-lg"></i> : <i className={`fas ${isResetMode ? 'fa-paper-plane' : 'fa-shield-halved'} text-lg`}></i>}
              {loading ? (isResetMode ? 'Processing...' : 'Authenticating...') : (isResetMode ? 'Send Reset Link' : 'Login')}
            </button>
          </form>

          {isResetMode && (
            <div className="mt-6 text-center animate-fade-in">
              <button type="button" onClick={() => { setIsResetMode(false); setMessage({ text: "", type: "" }); }} className={`text-[10px] font-bold tracking-[0.2em] uppercase transition-colors flex items-center justify-center w-full ${isLightMode ? 'text-slate-500 hover:text-[#0f2e5a]' : 'text-slate-500 hover:text-white'}`}>
                <i className="fas fa-arrow-left mr-2"></i> Return to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}