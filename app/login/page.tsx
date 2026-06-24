"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../utils/supabase";
import { useRouter } from "next/navigation";
import Head from "next/head";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  // DNA Animation Logic copied exactly from your source
  useEffect(() => {
    let dnaAngle = 0;
    let animationFrameId: number;

    const drawDNA = () => {
      const canvas = document.getElementById('dna-canvas') as HTMLCanvasElement;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const numNodes = 14;
      const spacing = (canvas.height - 20) / numNodes;
      
      for (let i = 0; i < numNodes; i++) {
        const y = i * spacing + 10;
        const offset = i * 0.45 + dnaAngle;
        const x1 = centerX + Math.sin(offset) * (canvas.width * 0.35);
        const x2 = centerX - Math.sin(offset) * (canvas.width * 0.35);
        
        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.save();
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#00f0ff';
        
        ctx.beginPath();
        ctx.arc(x1, y, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = Math.sin(offset) > 0 ? '#00f0ff' : '#0369a1';
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(x2, y, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = Math.sin(offset) < 0 ? '#00f0ff' : '#0369a1';
        ctx.fill();
        
        ctx.restore();
      }
      dnaAngle += 0.025;
      animationFrameId = requestAnimationFrame(drawDNA);
    };

    const dnaCanvas = document.getElementById('dna-canvas') as HTMLCanvasElement;
    if (dnaCanvas) {
      dnaCanvas.width = 144;
      dnaCanvas.height = 192;
      drawDNA();
    }
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setMessage("❌ Please provide both Authorized Email and Access Code.");
      return;
    }

    setLoading(true);
    setMessage("");

    // Lock Animation Logic
    const key = document.getElementById('flying-key');
    const lockCircle = document.getElementById('live-lock-circle');
    const lock = document.getElementById('live-lock');
    
    if(key) { key.classList.remove('hidden'); key.classList.add('animate-key-fly'); }
    setTimeout(() => { if(lockCircle) lockCircle.classList.add('glow'); }, 800);
    
    setTimeout(() => {
      if(lock) {
        lock.classList.remove('fa-lock', 'text-sky-400');
        lock.classList.add('fa-lock-open', 'text-emerald-400');
      }
      if(lockCircle) {
        lockCircle.classList.remove('glow');
        lockCircle.classList.add('unlocked', 'rumble-effect');
      }
    }, 1000);

    setTimeout(async () => {
      if(key) { key.classList.add('hidden'); key.classList.remove('animate-key-fly'); }
      if(lockCircle) lockCircle.classList.remove('rumble-effect');

      // Exact Logic connected to Supabase
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setMessage("❌ Invalid Access Code or Email!");
        setLoading(false);
        if(lock) {
          lock.classList.remove('fa-lock-open', 'text-emerald-400');
          lock.classList.add('fa-lock');
        }
        if(lockCircle) lockCircle.classList.remove('unlocked');
      } else {
        document.getElementById('login-view')!.style.opacity = '0';
        setTimeout(() => {
          router.push("/");
        }, 600);
      }
    }, 1500);
  };

  return (
    <>
      <Head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>
      <style dangerouslySetInnerHTML={{__html: `
        .premium-glass { background: rgba(10, 15, 30, 0.6); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.1); }
        .input-group { position: relative; margin-bottom: 1.5rem; }
        .cyber-input { width: 100%; background: rgba(1, 3, 15, 0.85); border: 1px solid rgba(56, 189, 248, 0.25); color: white; padding: 1rem 1rem 1rem 3rem; border-radius: 0.75rem; outline: none; transition: all 0.3s ease; }
        .cyber-input:focus { border-color: #00f0ff; background: rgba(1, 3, 15, 0.98); box-shadow: 0 0 20px rgba(0, 240, 255, 0.3), inset 0 0 10px rgba(0, 240, 255, 0.1); }
        .cyber-pulse-card { animation: cyberGlowPulse 4s infinite ease-in-out; background: rgba(2, 4, 12, 0.75); backdrop-filter: blur(20px); }
        @keyframes cyberGlowPulse { 0%, 100% { border-color: rgba(56, 189, 248, 0.18); box-shadow: 0 0 45px rgba(2, 132, 199, 0.15), inset 0 0 20px rgba(2, 132, 199, 0.06); } 50% { border-color: rgba(0, 240, 255, 0.5); box-shadow: 0 0 65px rgba(0, 240, 255, 0.3), inset 0 0 30px rgba(0, 240, 255, 0.12); } }
        #live-lock-circle { transition: all 0.3s ease; }
        #live-lock-circle.glow { border-color: #00f0ff; box-shadow: 0 0 25px rgba(0, 240, 255, 0.8), inset 0 0 10px rgba(0, 240, 255, 0.4); transform: scale(1.15); }
        #live-lock-circle.unlocked { border-color: #10b981; box-shadow: 0 0 25px rgba(16, 185, 129, 0.8), inset 0 0 10px rgba(16, 185, 129, 0.4); }
        .cyber-corner { position: absolute; width: 12px; height: 12px; border-color: rgba(56, 189, 248, 0.5); border-style: solid; pointer-events: none; }
        .cyber-corner-tl { top: -1px; left: -1px; border-width: 2px 0 0 2px; } .cyber-corner-tr { top: -1px; right: -1px; border-width: 2px 2px 0 0; }
        .cyber-corner-bl { bottom: -1px; left: -1px; border-width: 0 0 2px 2px; } .cyber-corner-br { bottom: -1px; right: -1px; border-width: 0 2px 2px 0; }
        @keyframes keyFlyUp { 0% { top: 88%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg) scale(0.8); opacity: 0; } 15% { opacity: 1; } 80% { top: 22%; left: 50%; transform: translate(-50%, -50%) rotate(45deg) scale(1.2); opacity: 1; } 100% { top: 22%; left: 50%; transform: translate(-50%, -50%) rotate(90deg) scale(0.5); opacity: 0; } }
        .animate-key-fly { animation: keyFlyUp 1.2s cubic-bezier(0.25, 1, 0.5, 1) forwards; }
        .text-glow { text-shadow: 0 0 15px rgba(0, 240, 255, 0.6); }
      `}} />

      <div id="login-view" className="w-screen h-screen flex bg-gradient-to-br from-[#0f172a] via-[#020205] to-[#1e1b4b] relative overflow-hidden transition-opacity duration-300 font-sans select-none items-center justify-center">
        
        {/* Left Panel (Mainframe Monitor) */}
        <div className="hidden lg:flex w-[28%] flex-col justify-between p-7 m-5 border border-sky-500/15 bg-[#03071466] shadow-[0_0_35px_rgba(2,132,199,0.06)] rounded-3xl relative z-10">
          <div className="cyber-corner cyber-corner-tl"></div><div className="cyber-corner cyber-corner-tr"></div><div className="cyber-corner cyber-corner-bl"></div><div className="cyber-corner cyber-corner-br"></div>
          <div>
            <div className="flex items-center gap-3">
              <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span></span>
              <span className="text-[10px] text-sky-400 font-bold tracking-[0.25em] uppercase">MAINFRAME MONITOR</span>
            </div>
            <h3 className="text-white font-black text-xl tracking-wider mt-2">REDCLIFFE LABS</h3>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center my-4">
            <div className="text-center text-[9px] text-slate-500 tracking-[0.3em] uppercase mb-4">3D HELIX SEQUENCE SCAN</div>
            <div className="relative w-full h-48 flex items-center justify-center">
              <canvas id="dna-canvas" className="w-36 h-full"></canvas>
            </div>
            <div className="relative w-full mt-6 bg-slate-950/80 border border-sky-500/15 rounded-xl p-4 text-[10px] font-mono text-sky-400/80 space-y-1.5 shadow-[0_0_20px_rgba(2,132,199,0.05)]">
              <div className="flex justify-between border-b border-sky-500/5 pb-1"><span>&gt; INTEGRITY MATRIX</span><span className="text-emerald-400 font-bold">SECURE</span></div>
              <div className="flex justify-between"><span>&gt; ENCRYPTION PROTOCOL</span><span className="text-sky-300">AES-256</span></div>
            </div>
          </div>
        </div>

        {/* Center Console */}
        <div className="flex-1 lg:w-[44%] flex flex-col justify-center items-center p-8 relative z-10 bg-transparent">
          <div className="text-center mt-4 mb-6">
            <h1 className="text-white font-black text-2xl tracking-[0.25em] uppercase text-glow">REDCLIFFE LIVE DASHBOARD</h1>
            <div className="flex items-center justify-center gap-2 mt-2.5">
              <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span>
              <span className="text-[10px] text-emerald-400 font-bold tracking-widest uppercase">GATEWAY ONLINE</span>
            </div>
          </div>

          <div className="cyber-pulse-card relative w-full max-w-md p-8 rounded-3xl border border-sky-500/20 shadow-[0_0_50px_rgba(2,132,199,0.2)] flex flex-col items-center">
            <div className="cyber-corner cyber-corner-tl"></div><div className="cyber-corner cyber-corner-tr"></div><div className="cyber-corner cyber-corner-bl"></div><div className="cyber-corner cyber-corner-br"></div>
            
            <div className="relative w-28 h-28 flex items-center justify-center mb-6">
              <div className="absolute inset-4 rounded-full bg-slate-950 border border-sky-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(2,132,199,0.3)]">
                <div id="live-lock-circle" className="flex items-center justify-center w-14 h-14 bg-slate-950 rounded-full border border-sky-500/30">
                  <i id="live-lock" className="fas fa-lock text-sky-400 text-xl"></i>
                </div>
              </div>
            </div>
            
            <i id="flying-key" className="fas fa-key hidden text-sky-400 text-xl pointer-events-none drop-shadow-[0_0_8px_rgba(0,240,255,0.8)] absolute"></i>

            {message && <div className="text-rose-400 text-xs text-center mb-4 font-bold">{message}</div>}

            <form onSubmit={handleLogin} className="w-full space-y-5">
              <div className="input-group">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1.5">Authorized Email</label>
                <div className="relative">
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="cyber-input w-full rounded-xl py-3 pl-10 pr-4 text-sm" placeholder="Enter your email ID" required />
                  <i className="fas fa-globe absolute left-3.5 top-3.5 text-sky-500/50 text-sm"></i>
                </div>
              </div>

              <div className="input-group">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1.5">Access Code</label>
                <div className="relative">
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="cyber-input w-full rounded-xl py-3 pl-10 pr-4 text-sm" placeholder="******" required />
                  <i className="fas fa-key absolute left-3.5 top-3.5 text-sky-500/50 text-sm"></i>
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-sky-600 via-blue-600 to-blue-700 border border-sky-400/25 rounded-xl py-3.5 text-white font-bold uppercase tracking-[0.25em] text-xs mt-2 flex items-center justify-center gap-2 hover:shadow-[0_0_25px_rgba(56,189,248,0.45)] transition-all">
                {loading ? <><i className="fas fa-spinner fa-spin"></i> Authenticating...</> : <><i className="fas fa-shield-halved"></i> Initialize Access</>}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}