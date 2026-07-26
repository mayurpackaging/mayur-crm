"use client";
import { useState, useEffect } from "react";

// Supabase config — SAME legacy JWT anon key as rest of mayur-crm
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function sbFetch(path, opts = {}) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      "Content-Type": "application/json",
      Prefer: opts.method === "PATCH" ? "return=representation" : "return=representation",
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function PricingAdmin() {
  const [daana, setDaana] = useState({ homo: "", cp: "", random: "" });
  const [items, setItems] = useState([]);
  const [thresholds, setThresholds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState("");

  async function loadAll() {
    setLoading(true);
    try {
      const d = await sbFetch("price_daana?order=rate_date.desc&limit=1");
      if (d[0]) setDaana({ homo: d[0].homo, cp: d[0].cp, random: d[0].random });
      const th = await sbFetch("sales_item_thresholds?order=item_name.asc");
      setThresholds(th);
      const it = await sbFetch("price_items?order=item_name.asc&select=id,item_name,list_price,tonnage,colour");
      setItems(it);
    } catch (e) { setMsg("Load error: " + e.message); }
    setLoading(false);
  }
  useEffect(() => { loadAll(); }, []);

  async function saveDaana() {
    setSaving(true); setMsg("");
    try {
      const today = new Date().toISOString().slice(0, 10);
      // upsert today's row
      await fetch(`${SB_URL}/rest/v1/price_daana`, {
        method: "POST",
        headers: {
          apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify({ rate_date: today, homo: +daana.homo, cp: +daana.cp, random: +daana.random }),
      });
      setMsg("✓ Daana saved. Recalculating...");
      await loadAll();
      setMsg("✓ Daana updated — sab N-zones refresh ho gaye.");
    } catch (e) { setMsg("Save error: " + e.message); }
    setSaving(false);
  }

  async function updatePrice(id, newPrice) {
    try {
      await sbFetch(`price_items?id=eq.${id}`, {
        method: "PATCH",
        body: JSON.stringify({ list_price: +newPrice }),
      });
      await loadAll();
    } catch (e) { setMsg("Price update error: " + e.message); }
  }

  const zoneColor = (z) => ({
    N3: "#1e7a46", N2: "#c68a12", N1: "#d97706", RED: "#c0392b",
  }[z] || "#666");
  const zoneBg = (z) => ({
    N3: "#e7f4ec", N2: "#fbf3df", N1: "#fce4d6", RED: "#fdeceb",
  }[z] || "#f5f5f5");

  const filtered = thresholds.filter((t) =>
    t.item_name.toLowerCase().includes(search.toLowerCase())
  );

  // Zone summary
  const zc = thresholds.reduce((a, t) => { a[t.zone] = (a[t.zone] || 0) + 1; return a; }, {});

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 20, fontFamily: "system-ui, sans-serif", color: "#0e1a24" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800 }}>
        Mayur <span style={{ color: "#e0a92a" }}>Pricing Admin</span>
      </h1>
      <p style={{ color: "#666", fontSize: 13, marginTop: 4 }}>
        Daana roz subah update karo. N1/N2/N3 sab items ke liye auto-recalculate.
      </p>

      {/* DAANA CARD */}
      <div style={{ background: "#0e1a24", color: "#fff", borderRadius: 14, padding: 18, marginTop: 16 }}>
        <div style={{ fontSize: 12, color: "#9fb3c0", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
          Aaj ka Daana Rate (₹/kg)
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {["homo", "cp", "random"].map((k) => (
            <div key={k} style={{ flex: 1 }}>
              <input type="number" value={daana[k]}
                onChange={(e) => setDaana({ ...daana, [k]: e.target.value })}
                style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid #2c3e4c",
                  background: "#1b2b38", color: "#fff", fontSize: 20, fontWeight: 700, textAlign: "center" }} />
              <div style={{ textAlign: "center", fontSize: 10, color: "#7f97a6", marginTop: 4, textTransform: "uppercase" }}>{k}</div>
            </div>
          ))}
        </div>
        <button onClick={saveDaana} disabled={saving}
          style={{ marginTop: 14, width: "100%", padding: 12, borderRadius: 10, border: "none",
            background: "#e0a92a", color: "#0e1a24", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
          {saving ? "Saving..." : "Save Daana & Recalculate"}
        </button>
        {msg && <div style={{ marginTop: 10, fontSize: 13, color: "#9fe6b4" }}>{msg}</div>}
      </div>

      {/* ZONE SUMMARY */}
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        {["N3", "N2", "N1", "RED"].map((z) => (
          <div key={z} style={{ flex: 1, textAlign: "center", padding: 12, borderRadius: 10,
            background: zoneBg(z), border: `1px solid ${zoneColor(z)}` }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: zoneColor(z) }}>{zc[z] || 0}</div>
            <div style={{ fontSize: 11, color: zoneColor(z), fontWeight: 600 }}>
              {z === "RED" ? "LOSS" : z}
            </div>
          </div>
        ))}
      </div>

      {/* SEARCH */}
      <input placeholder="🔍 Search item..." value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: "100%", padding: 11, borderRadius: 10, border: "1.5px solid #d9d3c4",
          marginTop: 16, fontSize: 15 }} />

      {/* ITEMS TABLE */}
      {loading ? <p style={{ marginTop: 20 }}>Loading...</p> : (
        <div style={{ marginTop: 12, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#1f3864", color: "#fff" }}>
                <th style={{ padding: 10, textAlign: "left" }}>Item</th>
                <th style={{ padding: 10 }}>Ton</th>
                <th style={{ padding: 10 }}>Price</th>
                <th style={{ padding: 10 }}>Zone</th>
                <th style={{ padding: 10 }}>Floor (N1)</th>
                <th style={{ padding: 10 }}>Happy (N2)</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: 10 }}>{t.item_name}</td>
                  <td style={{ padding: 10, textAlign: "center", color: "#666" }}>{t.tonnage}</td>
                  <td style={{ padding: 10, textAlign: "center" }}>
                    <input type="number" defaultValue={t.list_price}
                      onBlur={(e) => e.target.value != t.list_price && updatePrice(t.id, e.target.value)}
                      style={{ width: 70, padding: 5, textAlign: "center", border: "1px solid #ddd", borderRadius: 6 }} />
                  </td>
                  <td style={{ padding: 10, textAlign: "center" }}>
                    <span style={{ padding: "3px 10px", borderRadius: 20, fontWeight: 700, fontSize: 12,
                      color: zoneColor(t.zone), background: zoneBg(t.zone) }}>
                      {t.zone === "RED" ? "LOSS" : t.zone}
                    </span>
                  </td>
                  <td style={{ padding: 10, textAlign: "center", fontWeight: 600 }}>₹{t.floor_price}</td>
                  <td style={{ padding: 10, textAlign: "center", color: "#666" }}>₹{t.happy_price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
