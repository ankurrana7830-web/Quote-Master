"use client";
import { useState } from "react";
import { supabase } from "../../utils/supabase";
import { useRouter } from "next/navigation";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); // Page ko reload hone se rokta hai
    setLoading(true);
    setError("");

    // Supabase se Email aur Password verify karna
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      setError(error.message); // Agar galat password daala toh error dikhayega
    } else {
      alert("Login Successful! Redirecting to Dashboard...");
      router.push("/"); // Sahi password hone par seedha Dashboard par bhej dega
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f3f4f6" }}>
      <div style={{ backgroundColor: "white", padding: "40px", borderRadius: "10px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)", width: "100%", maxWidth: "400px" }}>
        
        <h1 style={{ fontSize: "24px", fontWeight: "bold", textAlign: "center", marginBottom: "20px", color: "#111827" }}>
          Login to Sales Core
        </h1>
        
        {/* Error Message Box */}
        {error && (
          <div style={{ backgroundColor: "#fee2e2", color: "#dc2626", padding: "12px", borderRadius: "6px", marginBottom: "20px", fontSize: "14px" }}>
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500", color: "#374151" }}>Email Address</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              placeholder="admin@test.com"
              style={{ width: "100%", padding: "10px", border: "1px solid #d1d5db", borderRadius: "6px", boxSizing: "border-box" }}
            />
          </div>
          
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500", color: "#374151" }}>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              placeholder="••••••••"
              style={{ width: "100%", padding: "10px", border: "1px solid #d1d5db", borderRadius: "6px", boxSizing: "border-box" }}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ backgroundColor: "#10b981", color: "white", padding: "12px", border: "none", borderRadius: "6px", fontSize: "16px", fontWeight: "bold", cursor: loading ? "not-allowed" : "pointer", marginTop: "10px" }}
          >
            {loading ? "Verifying..." : "Secure Login"}
          </button>
        </form>

      </div>
    </div>
  );
}