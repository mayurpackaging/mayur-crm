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
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `${SB_URL}/rest/v1/crm_users?username=eq.${username}&password=eq.${password}&select=*`,
        {
          headers: {
            apikey: SB_KEY,
            Authorization: `Bearer ${SB_KEY}`,
          },
        }
      );
      const data = await res.json();
      if (data.length > 0) {
        setUser(data[0]);
      } else {
        setError("Galat username ya password");
      }
    } catch (e) {
      setError("Connection error");
    }
    setLoading(false);
  };

  if (user) return <CRM currentUser={user} onLogout={() => setUser(null)} />;

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#070d1a" }}>
      <div style={{ background: "#111c2e", border: "1px solid #1c2d47", borderRadius: 16, padding: "36px 40px", width: 360 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 18, fontWeight: 700, color: "#f59e0b" }}>
            Mayur CRM
          </div>
          <div style={{ fontSize: 11, color: "#4a6080", marginTop: 4 }}>
            Mayur Food Packaging Products
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: "#4a6080", textTransform: "uppercase", letterSpacing: ".08em", display: "block", marginBottom: 5 }}>
            Username
          </label>
          <input
            style={{ background: "#162035", border: "1px solid #1c2d47", borderRadius: 8, padding: "9px 12px", color: "#e2e8f0", fontSize: 13, width: "100%", outline: "none" }}
            placeholder="apna username likho"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: "#4a6080", textTransform: "uppercase", letterSpacing: ".08em", display: "block", marginBottom: 5 }}>
            Password
          </label>
          <input
            type="password"
            style={{ background: "#162035", border: "1px solid #1c2d47", borderRadius: 8, padding: "9px 12px", color: "#e2e8f0", fontSize: 13, width: "100%", outline: "none" }}
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()}
          />
        </div>

        {error && (
          <div style={{ color: "#ef4444", fontSize: 12, marginBottom: 12, textAlign: "center" }}>
            {error}
          </div>
        )}

        <button
          style={{ background: "#f59e0b", color: "#000", border: "none", borderRadius: 8, padding: "10px", width: "100%", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          onClick={login}
          disabled={loading}
        >
          {loading ? "..." : "Login"}
        </button>
      </div>
    </div>
  );
}
