"use client";
import { useState, useEffect } from "react";

export default function PricingTest() {
  const [rows, setRows] = useState([]);
  const [daana, setDaana] = useState({ homo: "", cp: "", random: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // Read env inside component (browser-safe with fallback)
  const SB_URL = typeof window !== "undefined"
    ? (window.__SB_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)
    : process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SB_KEY = typeof window !== "undefined"
    ? (window.__SB_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  async function sb(path, opts = {}) {
    const res = await fetch(SB_URL + "/rest/v1/" + path, {
      ...opts,
      headers: {
        apikey: SB_KEY,
        Authorization: "Bearer " + SB_KEY,
        "Content-Type": "application/json",
        Prefer: "return=representation",
        ...(opts.headers || {}),
      },
    });
    if (!res.ok) throw new Error(await res.text());
    const t = await res.text();
    return t ? JSON.parse(t) : [];
  }

  async function load() {
    setLoading(true);
    try {
      const d = await sb("price_daana?order=rate_date.desc&limit=1");
      if (d[0]) setDaana({ homo: d[0].homo, cp: d[0].cp, random: d[0].random });
      const th = await sb("sales_item_thresholds?order=item_name.asc");
      setRows(th);
    } catch (e) { setMsg("Error: " + e.message); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function saveDaana() {
    setSaving(true); setMsg("");
    try {
      const today = new Date().toISOString().slice(0, 10);
      await fetch(SB_URL + "/rest/v1/price_daana", {
        method: "POST",
        headers: {
          apikey: SB_KEY, Authorization: "Bearer " + SB_KEY,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify({ rate_date: today, homo: +daana.homo, cp: +daana.cp, random: +daana.random }),
      });
      setMsg("Daana saved, recalculating...");
      await load();
      setMsg("Updated — sab N-zones refresh ho gaye.");
    } catch (e) { setMsg("Save error: " + e.message); }
    setSaving(false);
  }

  const zColor = (z) => ({ N3:"#1e7a46", N2:"#c68a12", N1:"#d97706", RED:"#c0392b" }[z] || "#666");
  const zBg = (z) => ({ N3:"#e7f4ec", N2:"#fbf3df", N1:"#fce4d6", RED:"#fdeceb" }[z] || "#f5f5f5");
  const zc = rows.reduce((a,t)=>{a[t.zone]=(a[t.zone]||0)+1;return a;},{});

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 20, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800 }}>Mayur Pricing — Test</h1>

      <div style={{ background:"#0e1a24", color:"#fff", borderRadius:12, padding:16, marginTop:14 }}>
        <div style={{ fontSize:11, color:"#9fb3c0", textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>Aaj ka Daana ₹/kg</div>
        <div style={{ display:"flex", gap:10 }}>
          {["homo","cp","random"].map(k=>(
            <div key={k} style={{ flex:1 }}>
              <input type="number" value={daana[k]} onChange={e=>setDaana({...daana,[k]:e.target.value})}
                style={{ width:"100%", padding:10, borderRadius:8, border:"1px solid #2c3e4c", background:"#1b2b38", color:"#fff", fontSize:18, fontWeight:700, textAlign:"center" }} />
              <div style={{ textAlign:"center", fontSize:10, color:"#7f97a6", marginTop:3 }}>{k.toUpperCase()}</div>
            </div>
          ))}
        </div>
        <button onClick={saveDaana} disabled={saving}
          style={{ marginTop:12, width:"100%", padding:11, borderRadius:8, border:"none", background:"#e0a92a", color:"#0e1a24", fontWeight:700, fontSize:14, cursor:"pointer" }}>
          {saving ? "Saving..." : "Save Daana & Recalculate"}
        </button>
        {msg && <div style={{ marginTop:8, fontSize:12, color:"#9fe6b4" }}>{msg}</div>}
      </div>

      <div style={{ display:"flex", gap:8, marginTop:14 }}>
        {["N3","N2","N1","RED"].map(z=>(
          <div key={z} style={{ flex:1, textAlign:"center", padding:10, borderRadius:8, background:zBg(z), border:"1px solid "+zColor(z) }}>
            <div style={{ fontSize:20, fontWeight:800, color:zColor(z) }}>{zc[z]||0}</div>
            <div style={{ fontSize:10, color:zColor(z), fontWeight:600 }}>{z==="RED"?"LOSS":z}</div>
          </div>
        ))}
      </div>

      {loading ? <p style={{marginTop:16}}>Loading...</p> : (
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13, marginTop:14 }}>
          <thead>
            <tr style={{ background:"#1f3864", color:"#fff" }}>
              <th style={{ padding:8, textAlign:"left" }}>Item</th>
              <th style={{ padding:8 }}>Price</th>
              <th style={{ padding:8 }}>Zone</th>
              <th style={{ padding:8 }}>Floor</th>
              <th style={{ padding:8 }}>Happy</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(t=>(
              <tr key={t.id} style={{ borderBottom:"1px solid #eee" }}>
                <td style={{ padding:8 }}>{t.item_name}</td>
                <td style={{ padding:8, textAlign:"center" }}>₹{t.list_price}</td>
                <td style={{ padding:8, textAlign:"center" }}>
                  <span style={{ padding:"2px 9px", borderRadius:12, fontWeight:700, fontSize:11, color:zColor(t.zone), background:zBg(t.zone) }}>
                    {t.zone==="RED"?"LOSS":t.zone}
                  </span>
                </td>
                <td style={{ padding:8, textAlign:"center", fontWeight:600 }}>₹{t.floor_price}</td>
                <td style={{ padding:8, textAlign:"center", color:"#666" }}>₹{t.happy_price}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
