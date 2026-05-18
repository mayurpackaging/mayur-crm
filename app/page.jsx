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
        `${SB_URL}/rest/v1/crm_users?username=eq.${username}&password=eq.${password}&select=*`,
        { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }
      );
      const data = await res.json();
      if (data.length > 0) setUser(data[0]);
      else setError("❌ Galat username ya password");
    } catch (e) { setError("Connection error"); }
    setLoading(false);
  };

  if (user) return <CRM currentUser={user} onLogout={() => setUser(null)} />;

  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#070d1a"}}>
      <div style={{background:"#111c2e",border:"1px solid #1c2d47",borderRadius:16,padding:"3
