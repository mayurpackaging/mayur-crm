"use client";
import { useState } from "react";
import CRM from "../components/CRM";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default function Home() {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (!username || !password) return setError("Username aur password dalo");
    setLoading(true); setError("");
    try {
      const res = await fetch(
        `${SB_URL}/rest/v1/crm_users?username=eq.${encodeURIComponent(username)}&password=eq.${encodeURIComponent(password)}&select=*`,
        { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }
      );
      const data = await res.json();
      if (data.length > 0) { setUser(data[0]); }
      else { setError("Galat username ya password"); }
    } catch (e) { setError("Connection error"); }
    setLoading(false);
  };

  if (user) return <CRM currentUser={user} onLogout={() => setUser(null)} />;

  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"#f0f4f8" }}>
      <div style={{ background:"#ffffff", border:"1px solid #e2e8f0", borderRadius:16, padding:"40px 44px", width:380, boxShadow:"0 4px 24px rgba(0,0,0,.08)" }}>
        {/* Header */}
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ width:52, height:52, background:"#fef3c7", borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, margin:"0 auto 14px" }}>📦</div>
          <div style={{ fontSize:20, fontWeight:800, color:"#1e293b", letterSpacing:"-.02em" }}>Mayur CRM</div>
          <div style={{ fontSize:11, color:"#94a3b8", marginTop:4, fontWeight:500 }}>Mayur Food Packaging Products</div>
        </div>

        {/* Username */}
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:10, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:".08em", display:"block", marginBottom:5 }}>Username</label>
          <input
            style={{ background:"#f8fafc", border:"1.5px solid #e2e8f0", borderRadius:8, padding:"10px 14px", color:"#1e293b", fontSize:13, width:"100%", outline:"none", transition:"border .15s" }}
            placeholder="apna username likho"
            value={username}
            onChange={e=>setUsername(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&login()}
            onFocus={e=>e.target.style.borderColor="#f59e0b"}
            onBlur={e=>e.target.style.borderColor="#e2e8f0"}
          />
        </div>

        {/* Password */}
        <div style={{ marginBottom:22 }}>
          <label style={{ fontSize:10, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:".08em", display:"block", marginBottom:5 }}>Password</label>
          <input
            type="password"
            style={{ background:"#f8fafc", border:"1.5px solid #e2e8f0", borderRadius:8, padding:"10px 14px", color:"#1e293b", fontSize:13, width:"100%", outline:"none" }}
            placeholder="password"
            value={password}
            onChange={e=>setPassword(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&login()}
            onFocus={e=>e.target.style.borderColor="#f59e0b"}
            onBlur={e=>e.target.style.borderColor="#e2e8f0"}
          />
        </div>

        {error && <div style={{ color:"#ef4444", fontSize:12, marginBottom:14, textAlign:"center", background:"#fef2f2", padding:"8px 12px", borderRadius:8 }}>{error}</div>}

        <button
          style={{ background:"#f59e0b", color:"#000", border:"none", borderRadius:8, padding:"11px", width:"100%", fontSize:13, fontWeight:700, cursor:"pointer", letterSpacing:".02em" }}
          onClick={login}
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login →"}
        </button>

        <div style={{ textAlign:"center", marginTop:18, fontSize:10, color:"#cbd5e1" }}>
          Shreeja Packaging Industries Pvt. Ltd.
        </div>
      </div>
    </div>
  );
}
