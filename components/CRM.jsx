"use client";
import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Plus, Search, X, Eye, CheckCircle, Loader, Printer, Trash2, Edit } from "lucide-react";
import { sbFetch, sbGet, sbGetPay, sbGetProducts, sbGetOrders, sbGetAllOrders, sbGetOrderItems, sbGetTargets, sbInsert, sbPatch, sbDelete } from "../lib/supabase";

/* ─── HELPERS ─────────────────────────────────────── */
const fd  = s => s ? new Date(s).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"2-digit",timeZone:"Asia/Kolkata"}) : "—";
const fr  = n => n!=null && n!=="" ? "₹"+Number(n).toLocaleString("en-IN") : "₹0";
const ini = s => s?.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2)||"?";
const AVC = ["#f59e0b","#10b981","#3b82f6","#8b5cf6","#ef4444","#06b6d4","#f97316"];
const avc = n => AVC[(n?.charCodeAt(0)||0)%AVC.length];
const isOD= d => d && new Date(d)<new Date(new Date().toDateString());
const isTD= d => d && new Date(d).toDateString()===new Date().toDateString();

const ST = {
  active:{c:"#10b981",bg:"rgba(16,185,129,.12)"},inactive:{c:"#ef4444",bg:"rgba(239,68,68,.12)"},
  prospect:{c:"#60a5fa",bg:"rgba(59,130,246,.12)"},new:{c:"#60a5fa",bg:"rgba(59,130,246,.12)"},
  quoted:{c:"#a78bfa",bg:"rgba(139,92,246,.12)"},negotiating:{c:"#f59e0b",bg:"rgba(245,158,11,.12)"},
  won:{c:"#10b981",bg:"rgba(16,185,129,.12)"},lost:{c:"#ef4444",bg:"rgba(239,68,68,.12)"},
  pending:{c:"#60a5fa",bg:"rgba(59,130,246,.12)"},sent:{c:"#a78bfa",bg:"rgba(139,92,246,.12)"},
  approved:{c:"#10b981",bg:"rgba(16,185,129,.12)"},rejected:{c:"#ef4444",bg:"rgba(239,68,68,.12)"},
  revision:{c:"#f59e0b",bg:"rgba(245,158,11,.12)"},
  draft:{c:"#60a5fa",bg:"rgba(59,130,246,.12)"},
  confirmed:{c:"#10b981",bg:"rgba(16,185,129,.12)"},
  dispatched:{c:"#f59e0b",bg:"rgba(245,158,11,.12)"},
  delivered:{c:"#10b981",bg:"rgba(16,185,129,.15)"},
  cancelled:{c:"#ef4444",bg:"rgba(239,68,68,.12)"},
};
const Bdg = ({s}) => { const c=ST[s]||{c:"#64748b",bg:"rgba(100,116,139,.1)"}; return <span className="bdg" style={{background:c.bg,color:c.c}}>{s}</span>; };
const Av  = ({name,size=32}) => <div className="av" style={{width:size,height:size,background:avc(name),fontSize:size*.34}}>{ini(name)}</div>;
const TI  = {visit:"🏠",call:"📞",whatsapp:"💬",email:"📧",meeting:"🤝"};
const TC  = {visit:"#10b981",call:"#60a5fa",whatsapp:"#34d399",email:"#a78bfa",meeting:"#f59e0b"};
const Spin= () => <Loader size={14} className="spin"/>;

export default function CRM({ currentUser, onLogout }) {
  const [view,setView]   = useState("dashboard");
  const [C,setC]         = useState([]);
  const [E,setE]         = useState([]);
  const [I,setI]         = useState([]);
  const [S,setS]         = useState([]);
  const [P,setP]         = useState([]);
  const [PRODS,setPRODS] = useState([]);
  const [ORDERS,setORDERS] = useState([]);
  const [TARGETS,setTARGETS] = useState([]);
  const [USERS,setUSERS] = useState([]);
  const [STOCK,setSTOCK] = useState([]);
  const [convertCust, setConvertCust] = useState(null);
  const [prodData,setProdData] = useState(null);
  const [prodLoad,setProdLoad] = useState(false);
  const [allOrdersLoaded,setAllOrdersLoaded] = useState(false);
  const [loading,setLd]  = useState(true);
  const [saving,setSv]   = useState(false);
  const [toast,setToast] = useState(null);
  const [modal,setModal] = useState(null);
  const [selId,setSelId] = useState(null);
  const [selOrder,setSelOrder] = useState(null);
  const [cTab,setCTab]   = useState("all");
  const [eTab,setETab]   = useState("all");
  const [sTab,setSTb]    = useState("all");
  const [pCat,setPCat]   = useState("all");
  const [q,setQ]         = useState("");
  const [form,setForm]   = useState({});
  const [orderItems,setOrderItems] = useState([]);
  const [editProd,setEditProd] = useState(null);
  const printRef = useRef();
  // pricing state
  const [pxRows,setPxRows] = useState([]);
  const [pxProducts,setPxProducts] = useState([]);
  const [pxDaana,setPxDaana] = useState(()=>{
    try{const s=localStorage.getItem("mayur_daana");if(s)return JSON.parse(s);}catch(e){}
    return {homo:"",cp:"",random:""};
  });
  useEffect(()=>{try{localStorage.setItem("mayur_daana",JSON.stringify(pxDaana));}catch(e){}},[pxDaana]);
  const [pxThis, setPxThis] = useState(()=>{
    try{const s=localStorage.getItem("mayur_px");if(s)return JSON.parse(s);}catch(e){}
    return {fixed:9800000,elecBill:2452659,salesKg:164297,scu:9660,happy:5000000};
  });
  useEffect(()=>{try{localStorage.setItem("mayur_px",JSON.stringify(pxThis));}catch(e){}},[pxThis]);
  const [pxLoad,setPxLoad] = useState(false);
  const [todayTaskCount, setTodayTaskCount] = useState(0);
  const [pxSave,setPxSave] = useState(false);
  const [pxQ,setPxQ] = useState("");
  const [partyDiscount,setPartyDiscount] = useState(50); // default ₹50/ctn

  const toast$ = (msg,err=false) => { setToast({msg,err}); setTimeout(()=>setToast(null),2500); };
  const sf = (k,v) => setForm(p=>({...p,[k]:v}));
  const sfn = (k,v) => setForm(p=>({...p,[k]:v}));

  // SmartInput — prevents cursor jump for text inputs in modals
  const SmartInput = ({formKey, placeholder, type="text", style, className="inp", rows}) => {
    const [local, setLocal] = useState(form[formKey]||"");
    const [focused, setFocused] = useState(false);
    useEffect(()=>{ if(!focused) setLocal(form[formKey]||""); },[form[formKey],focused]);
    const props = {
      className, style, placeholder, type,
      value: local,
      onFocus: ()=>setFocused(true),
      onChange: e=>setLocal(e.target.value),
      onBlur: e=>{ setFocused(false); sf(formKey, e.target.value); }
    };
    if(rows) return <textarea {...props} rows={rows}/>;
    return <input {...props}/>;
  };
  const gc = id => C.find(c=>c.id===id);
  const gli= cid => I.filter(i=>i.customer_id===cid).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0];
  const gci= cid => I.filter(i=>i.customer_id===cid).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  const gcp= cid => P.find(p=>p.customer_id===cid);
  const gcs= cid => S.filter(s=>s.customer_id===cid);

  // Role from crm_users table — defined early (used in filtering below)
  const userRole = currentUser?.role || "viewer";
  const isAdmin = userRole === "admin";
  const isSales = userRole === "sales";
  const isDataEntry = userRole === "dataentry";
  const myName = currentUser?.name||"";

  // User-wise filtering: sales sees only their own
  const myORDERS = isSales ? ORDERS.filter(o=>o.created_by===myName) : ORDERS;
  const myC = isSales ? C.filter(c=>c.assigned_to===myName||c.sales_rep===myName) : C;
  const myI = isSales 
    ? I.filter(i=>i.done_by===myName||(i.customer_id&&myC.find(c=>c.id===i.customer_id)))
    : I;
  // Follow-ups: only show if assigned to me (or no assignment = done_by me)
  const myFU = isSales
    ? myI.filter(i=>i.next_follow_up&&(!i.assign_followup_to||i.assign_followup_to===myName||i.done_by===myName))
    : I.filter(i=>i.next_follow_up);
  const myE = isSales ? E.filter(e=>e.assigned_to===myName) : E;
  const myS = isSales ? S.filter(s=>myC.find(c=>c.id===s.customer_id||c.company===s.company)) : S;
  // Follow-up filters — AFTER myI is defined
  const odFU = useMemo(()=>myFU.filter(i=>isOD(i.next_follow_up)),[myFU]);
  const tdFU = useMemo(()=>myFU.filter(i=>isTD(i.next_follow_up)),[myFU]);
  const urgN = odFU.length+tdFU.length;
  const prodCats = useMemo(()=>["all",...[...new Set(PRODS.map(p=>p.category).filter(Boolean))]], [PRODS]);

  const load = useCallback(async()=>{
    setLd(true);
    try {
      const [c,e,i,s,p,pr,o,t,stk] = await Promise.all([
        sbGet("crm_customers"), sbGet("crm_enquiries"), sbGet("crm_interactions"),
        sbGet("crm_samples"), sbGetPay(), sbGetProducts(), sbGetOrders(), sbGetTargets(),
        sbFetch("crm_stock?order=product_name.asc")
      ]);
      setC(c||[]); setE(e||[]); setI(i||[]); setS(s||[]); setP(p||[]);
      setPRODS(pr||[]); setORDERS(o||[]); setTARGETS(t||[]); setSTOCK(stk||[]);
      // Load sales users from crm_users
      try {
        const users = await sbFetch("crm_users?select=name,role&order=name.asc");
        setUSERS(users||[]);
      } catch(e) {}
    } catch(err){ toast$("Load failed: "+err.message,true); }
    setLd(false);
  },[]);

  const loadProduction = async(days=7, date=null)=>{
    setProdLoad(true);
    try{
      const url = date
        ? `https://mayur-mos.vercel.app/api/throughput?date=${date}`
        : `https://mayur-mos.vercel.app/api/throughput?days=${days}`;
      const res = await fetch(url);
      const data = await res.json();
      setProdData(data);
    }catch(e){ setToast({msg:"Production load error",err:true}); }
    setProdLoad(false);
  };

  // Load today task count for dashboard badge
  useEffect(()=>{
    const today = new Date().toISOString().slice(0,10);
    const taskUrl = isAdmin
      ? "crm_tasks?due_date=eq."+today+"&status=eq.pending&select=id"
      : "crm_tasks?due_date=eq."+today+"&status=eq.pending&assigned_to=eq."+myName+"&select=id";
    sbFetch(taskUrl)
      .then(d=>setTodayTaskCount((d||[]).length))
      .catch(()=>{});
  },[]);

  const loadPricing = useCallback(async()=>{
    setPxLoad(true);
    try{
      const d = await sbFetch("price_daana?order=rate_date.desc&limit=1");
      if(d&&d[0]) setPxDaana({homo:d[0].homo,cp:d[0].cp,random:d[0].random});
      // Fetch price_items with ALL columns for floor calculation
      const th = await sbFetch("price_items?order=item_name.asc&select=id,item_name,pcs_per_carton,box_wt,box_homo,box_cp,box_random,lid_wt,lid_homo,lid_cp,lid_random,box_cav,box_cyc,lid_cav,lid_cyc,list_price,tonnage,is_active");
      setPxRows((th||[]).filter(r=>r.is_active!==false));
      const pz = await sbFetch("product_zone_lookup");
      setPxProducts(pz||[]);
    }catch(e){ setToast({msg:"Pricing load error",err:true}); }
    setPxLoad(false);
  },[]);

  useEffect(()=>{ load(); },[load]);

  const loadAllOrders = async() => {
    if(allOrdersLoaded) return;
    try { const all=await sbGetAllOrders(); setORDERS(all||[]); setAllOrdersLoaded(true); }
    catch(e){ toast$("Orders load failed",true); }
  };

  const closeM = () => { setModal(null); setForm({}); setOrderItems([]); setEditProd(null); };
  const openC  = id => { setSelId(id); setModal("detail"); };

  /* ── SAVES ── */
  const saveCust = async() => {
    if(!form.name||!form.company) return toast$("Name aur Company required!",true);
    setSv(true);
    try {
      const r=await sbInsert("crm_customers",{
        name:form.name,company:form.company,phone:form.phone,email:form.email,
        city:form.city,type:form.type||"nbd",status:form.status||"prospect",
        segment:form.segment,assigned_to:form.assigned_to,gst_no:form.gst_no,address:form.address
      });
      setC(p=>[r[0],...p]); toast$("Customer add ✓"); closeM();
    } catch(e){ toast$(e.message,true); }
    setSv(false);
  };
  const saveEnq = async() => {
    if(!form.customer_id||!form.product) return toast$("Customer aur Product required!",true);
    const c=gc(form.customer_id);
    setSv(true);
    try {
      const r=await sbInsert("crm_enquiries",{...form,customer_name:c?.name+" / "+c?.company,status:form.status||"new",priority:form.priority||"medium"});
      setE(p=>[r[0],...p]);
      // Auto-create Pipeline deal
      try {
        await sbFetch("crm_deals", {method:"POST", body:{
          title: (form.product||"Enquiry")+" — "+(c?.company||c?.name||""),
          customer_name: c?.name||"",
          company: c?.company||"",
          stage: "lead",
          probability: 10,
          product_mix: form.product||"",
          assigned_to: form.assigned_to||c?.assigned_to||myName,
          notes: "Auto-created from Enquiry. Qty: "+(form.qty||"—")+", Priority: "+(form.priority||"medium")
        }});
        toast$("Enquiry add ✓ + Pipeline mein deal bana!");
      } catch(e2) {
        toast$("Enquiry add ✓ (Pipeline deal nahi bana)");
      }
      closeM();
    }
    catch(e){ toast$(e.message,true); }
    setSv(false);
  };
  const saveInter = async(back=false) => {
    const cid=form.customer_id||selId;
    if(!cid||!form.note) return toast$("Customer aur Note required!",true);
    const c=gc(cid);
    setSv(true);
    try {
      const r=await sbInsert("crm_interactions",{...form,customer_id:cid,customer_name:c?.name,company:c?.company,type:form.type||"call",done_by:form.done_by||myName});
      setI(p=>[r[0],...p]);
      // Auto-create Planner task if follow-up date set
      if(form.next_follow_up) {
        const dueTime = form.follow_up_time||"10:00";
        const taskTitle = form.follow_up_note||("Follow-up: "+(c?.name||"Customer"));
        const remindAt = form.next_follow_up+"T"+dueTime+":00";
        const assignTo = form.assign_followup_to||myName;
        await sbFetch("crm_tasks", {method:"POST", body:{
          title: taskTitle,
          description: "Re: "+(form.note?.slice(0,100)||""),
          due_date: form.next_follow_up,
          due_time: dueTime,
          type: form.type||"call",
          priority: "medium",
          customer_name: c?.name||"",
          customer_id: cid,
          status: "pending",
          remind_at: remindAt,
          assigned_to: assignTo,
          created_by: myName
        }});
        // Auto-clear old follow-up from previous interaction of same customer
        const prevInter = I.find(i=>i.customer_id===cid&&i.next_follow_up&&i.id!==r[0]?.id);
        if(prevInter?.id) {
          await sbFetch("crm_interactions?id=eq."+prevInter.id, {method:"PATCH", body:{next_follow_up:null}});
          setI(p=>p.map(i=>i.id===prevInter.id?{...i,next_follow_up:null}:i));
        }
        toast$("Interaction + Follow-up task created!");
        setTodayTaskCount(n=>form.next_follow_up===new Date().toISOString().slice(0,10)?n+1:n);
      } else {
        toast$("Interaction save!");
      }
      if(back){setForm({});setModal("detail");}else closeM();
    }
    catch(e){ toast$(e.message,true); }
    setSv(false);
  };
  const saveSamp = async() => {
    if(!form.customer_id||!form.product) return toast$("Customer aur Product required!",true);
    const c=gc(form.customer_id);
    setSv(true);
    try { const r=await sbInsert("crm_samples",{...form,customer_name:c?.name,company:c?.company,status:form.status||"pending"}); setS(p=>[r[0],...p]); toast$("Sample add ✓"); closeM(); }
    catch(e){ toast$(e.message,true); }
    setSv(false);
  };
  const savePay = async() => {
    if(!form.customer_id) return toast$("Customer select karo",true);
    const c=gc(form.customer_id); const ex=gcp(form.customer_id);
    setSv(true);
    try {
      if(ex){ await sbPatch("crm_payments",ex.id,{...form,customer_name:c?.name,company:c?.company}); setP(p=>p.map(x=>x.id===ex.id?{...x,...form,customer_name:c?.name,company:c?.company}:x)); }
      else { const r=await sbInsert("crm_payments",{...form,customer_name:c?.name,company:c?.company}); setP(p=>[r[0],...p]); }
      toast$("Payment updated ✓"); closeM();
    } catch(e){ toast$(e.message,true); }
    setSv(false);
  };
  const markDone = async(id) => {
    try { await sbPatch("crm_interactions",id,{next_follow_up:null}); setI(p=>p.map(i=>i.id===id?{...i,next_follow_up:null}:i)); toast$("Done ✓"); }
    catch(e){ toast$(e.message,true); }
  };
  const updSamp = async(id,st) => {
    try { await sbPatch("crm_samples",id,{status:st}); setS(p=>p.map(x=>x.id===id?{...x,status:st}:x)); toast$("Updated ✓"); }
    catch(e){ toast$(e.message,true); }
  };
  const updEnq = async(id,st) => {
    try { await sbPatch("crm_enquiries",id,{status:st}); setE(p=>p.map(x=>x.id===id?{...x,status:st}:x)); toast$("Updated ✓"); }
    catch(e){ toast$(e.message,true); }
  };

  /* ── PRODUCT ── */
  const saveProd = async() => {
    if(!form.name||!form.category) return toast$("Name aur Category required!",true);
    setSv(true);
    try {
      if(editProd){ await sbPatch("crm_products",editProd.id,form); setPRODS(p=>p.map(x=>x.id===editProd.id?{...x,...form}:x)); toast$("Product updated ✓"); }
      else { const r=await sbInsert("crm_products",form); setPRODS(p=>[...p,r[0]]); toast$("Product add ✓"); }
      closeM();
    } catch(e){ toast$(e.message,true); }
    setSv(false);
  };

  /* ── ORDER ── */
  const addOrderItem = (prod) => {
    const exists = orderItems.find(i=>i.product_id===prod.id);
    if(exists) return toast$("Yeh item already add hai",true);
    const discAmt=partyDiscount||0;
    const baseAmt=(prod.ctn_price||0)*1-discAmt;
    setOrderItems(p=>[...p,{product_id:prod.id,sku_code:prod.sku_code,product_name:prod.name,packing:prod.packing,qty_cases:1,price_per_pcs:prod.price_per_pcs||0,ctn_price:prod.ctn_price||0,discount:discAmt,amount:Math.max(baseAmt,0)}]);
  };
  const updOrderItem = (pid,k,v) => {
    setOrderItems(p=>p.map(i=>{
      if(i.product_id!==pid&&i.id!==pid) return i;
      const u={...i,[k]:v};
      if(k==="ctn_price"&&u.packing) u.price_per_pcs=+(Number(v)/Number(u.packing)).toFixed(2);
      const base=(Number(u.qty_cases)||0)*(Number(u.ctn_price)||0);
      u.amount=base-(Number(u.discount)||0);
      return u;
    }));
  };
  const removeOrderItem = (pid) => setOrderItems(p=>p.filter(i=>i.product_id!==pid));

  const orderTotal = useMemo(()=>orderItems.reduce((s,i)=>s+(Number(i.amount)||0),0),[orderItems]);
  const eprAmount    = useMemo(()=>form.epr?Math.round(orderTotal*0.01):0,[orderTotal,form.epr]);
  const freightAmt   = useMemo(()=>Number(form.freight)||0,[form.freight]);
  const freightGst   = useMemo(()=>form.freight_gst_type==="including"?0:Math.round(freightAmt*0.18),[freightAmt,form.freight_gst_type]);
  const gstAmount    = useMemo(()=>form.gst==="including"?0:Math.round(orderTotal*0.18),[orderTotal,form.gst]);
  const grandTotal   = useMemo(()=>orderTotal+eprAmount+freightAmt+freightGst+(form.gst==="including"?0:gstAmount),[orderTotal,eprAmount,freightAmt,freightGst,gstAmount,form.gst,form.freight_gst_type]);

  const saveOrder = async() => {
    if(!form.customer_id) return toast$("Customer select karo",true);
    if(orderItems.length===0) return toast$("Koi item add nahi hai",true);
    const c=gc(form.customer_id);
    setSv(true);
    try {
      const totalCases=orderItems.reduce((s,i)=>s+(Number(i.qty_cases)||0),0);
      const orderData={customer_id:form.customer_id,customer_name:c?.name,company:c?.company,order_date:form.order_date||new Date().toISOString().split("T")[0],status:"draft",total_amount:grandTotal,total_cases:totalCases,payment_mode:form.payment_mode||"cash",epr_applied:!!form.epr,gst_type:form.gst||"excluding",freight:freightAmt||null,freight_gst:freightGst||null,freight_gst_type:form.freight_gst_type||"excluding",notes:form.notes||"",created_by:currentUser?.name||""};
      const orderRes=await sbInsert("crm_orders",orderData);
      const orderId=orderRes[0].id;
      const items=orderItems.map(i=>({...i,order_id:orderId}));
      await sbInsert("crm_order_items",items);
      setORDERS(p=>[{...orderData,id:orderId},...p]);
      // Auto: NBD/enduser jo order de → enduser ban jaaye
      if(c && (c.type==="nbd" || c.type==="enduser")) {
        try {
          await sbPatch("crm_customers",form.customer_id,{type:"enduser",status:"active"});
          setC(p=>p.map(x=>x.id===form.customer_id?{...x,type:"enduser",status:"active"}:x));
        } catch(e) {}
      }
      toast$("Order save ho gaya ✓");
      const custData=gc(form.customer_id)||{};
      setSelOrder({...orderData,id:orderId,items,customerData:{phone:custData.phone,address:custData.address,gst_no:custData.gst_no}});
      // Check if customer needs to be formally added
      const ordCust = gc(form.customer_id);
      if(ordCust && (ordCust.type==="nbd"||!ordCust.type)) {
        setConvertCust(ordCust);
        setModal("convert_customer");
      } else {
        setModal("proforma");
      }
    } catch(e){ toast$(e.message,true); }
    setSv(false);
  };

  const openOrder = async(order) => {
    try {
      const [items,custArr]=await Promise.all([sbGetOrderItems(order.id),order.customer_id?sbFetch(`crm_customers?id=eq.${order.customer_id}&select=phone,address,gst_no`):Promise.resolve([])]);
      setSelOrder({...order,items:items||[],customerData:custArr?.[0]||{}});
      setModal("proforma");
    } catch(e){ toast$(e.message,true); }
  };

  const advanceOrder = async(order,nextStatus) => {
    const now=new Date().toISOString();
    const patch={status:nextStatus};
    if(nextStatus==="confirmed"){patch.confirmed_at=now;patch.confirmed_by=currentUser?.name||"";}
    if(nextStatus==="dispatched"){patch.dispatched_at=now;patch.dispatched_by=currentUser?.name||"";}
    if(nextStatus==="delivered"){patch.delivered_at=now;patch.delivered_by=currentUser?.name||"";}
    try {
      await sbPatch("crm_orders",order.id,patch);
      setORDERS(p=>p.map(x=>x.id===order.id?{...x,...patch}:x));
      const msgs={confirmed:"✅ Confirmed!",dispatched:"🚚 Dispatched!",delivered:"🎉 Delivered!"};
      toast$(msgs[nextStatus]||"Updated ✓");
    } catch(e){ toast$(e.message,true); }
  };

  const updOrderStatus = async(id,st) => {
    try { await sbPatch("crm_orders",id,{status:st}); setORDERS(p=>p.map(x=>x.id===id?{...x,status:st}:x)); toast$("Updated ✓"); }
    catch(e){ toast$(e.message,true); }
  };

  const openPI = (order) => {
    const ord = order || selOrder;
    if(!ord) return;
    const win=window.open("","_blank");
    if(!win) { toast$("Popup blocked! Browser settings mein allow karo.",true); return; }
    const subtotal=ord?.items?.reduce((s,i)=>s+(Number(i.amount)||0),0)||0;
    const epr=ord?.epr_applied?Math.round(subtotal*0.01):0;
    const freight=Number(ord?.freight)||0;
    const freightGstAmt=Number(ord?.freight_gst)||0;
    const gst=ord?.gst_type==="including"?0:Math.round(subtotal*0.18);
    const grandTotalPro=subtotal+epr+freight+freightGstAmt+gst;
    win.document.write(getPIHtml(ord, subtotal, epr, freight, freightGstAmt, gst, grandTotalPro));
    win.document.close();
    setTimeout(()=>win.print(), 500);
  };

  const printProforma = () => {
    if(!selOrder) return;
    const w = window.open("","_blank");
    if(!w){toast$("Popup blocked! Browser mein allow karo",true);return;}
    const subtotal=selOrder?.items?.reduce((s,i)=>s+(Number(i.amount)||0),0)||0;
    const epr=selOrder?.epr_applied?Math.round(subtotal*0.01):0;
    const freight=Number(selOrder?.freight)||0;
    const freightGstAmt=Number(selOrder?.freight_gst)||0;
    const gst=selOrder?.gst_type==="including"?0:Math.round(subtotal*0.18);
    const grandTotalPro=subtotal+epr+freight+freightGstAmt+gst;
    w.document.write(getPIHtml(selOrder,subtotal,epr,freight,freightGstAmt,gst,grandTotalPro));
    w.document.close();
  };

  const getPIHtml = (selOrder, subtotal, epr, freight, freightGstAmt, gst, grandTotal) => {
    return `<!DOCTYPE html><html><head><title>PI - ${selOrder?.company}</title>
    <style>
      body{font-family:Arial,sans-serif;padding:24px;color:#000;font-size:13px;}
      h2{text-align:center;margin-bottom:4px;}
      .sub{text-align:center;font-size:12px;margin-bottom:20px;color:#555;}
      .info{display:flex;justify-content:space-between;margin-bottom:16px;}
      table{width:100%;border-collapse:collapse;font-size:12px;}
      th{background:#f59e0b;padding:8px;text-align:left;border:1px solid #ddd;}
      td{padding:7px 8px;border:1px solid #ddd;}
      .totals{text-align:right;margin-top:12px;font-size:13px;line-height:2;}
      .bank{margin-top:16px;padding:12px;background:#f8f9fa;border:1px solid #dee2e6;border-radius:4px;font-size:12px;}
      .footer{margin-top:20px;font-size:11px;color:#888;border-top:1px solid #ddd;padding-top:10px;}
      @media print{body{padding:12px;}}
    </style></head><body>
    <h2>Shreeja Packaging Industries Pvt. Ltd.</h2>
    <div class="sub">Mayur Food Packaging Products | Delhi<br/>PROFORMA INVOICE</div>
    <div class="info">
      <div><b>To:</b> ${selOrder?.company||""}<br/>${selOrder?.customer_name||""}${selOrder?.customerData?.phone?`<br/>📞 ${selOrder.customerData.phone}`:""}${selOrder?.customerData?.address?`<br/>📍 ${selOrder.customerData.address}`:""}${selOrder?.customerData?.gst_no?`<br/>GST: <b>${selOrder.customerData.gst_no}</b>`:""}</div>
      <div style="text-align:right"><b>Date:</b> ${selOrder?.order_date||""}<br/><b>Payment:</b> ${(selOrder?.payment_mode||"").replace("_"," ")}</div>
    </div>
    <table><thead><tr><th>#</th><th>SKU</th><th>Product</th><th>Packing</th><th>Cases/CTN</th><th>Total CTN</th><th>Price/Pcs (₹)</th><th>CTN Price (₹)</th><th>Disc(₹)</th><th>Amount (₹)</th></tr></thead>
    <tbody>${(selOrder?.items||[]).map((item,idx)=>`<tr><td>${idx+1}</td><td>${item.sku_code||""}</td><td>${item.product_name||""}</td><td>${item.packing||""}</td><td>${item.qty_cases||""}</td><td><b>${(Number(item.qty_cases||0)*1).toLocaleString("en-IN")} CTN</b></td><td>${item.price_per_pcs||""}</td><td>${item.ctn_price||""}</td><td>${item.discount||0}</td><td><b>₹${Number(item.amount||0).toLocaleString("en-IN")}</b></td></tr>`).join("")}</tbody></table>
    <div class="totals">
      Subtotal: ₹${subtotal.toLocaleString("en-IN")}<br/>
      ${epr>0?`EPR @1%: ₹${epr.toLocaleString("en-IN")}<br/>`:""}
      ${freight>0?`Freight & Forwarding: ₹${freight.toLocaleString("en-IN")}<br/>`:""}
      ${freightGstAmt>0?`Freight GST @18%: ₹${freightGstAmt.toLocaleString("en-IN")}<br/>`:""}
      ${gst>0?`GST @18% (${selOrder?.gst_type==="including"?"Incl.":"Excl."}): ₹${gst.toLocaleString("en-IN")}<br/>`:""}
      <b style="font-size:15px;">Grand Total: ₹${grandTotal.toLocaleString("en-IN")}</b><br/>
      <span style="font-size:12px;color:#666;">Total Cartons: <b>${(selOrder?.items||[]).reduce((s,i)=>s+(Number(i.qty_cases)||0),0)} CTN</b> | Total SKUs: <b>${(selOrder?.items||[]).length}</b></span>
    </div>
    ${selOrder?.notes?`<div style="margin-top:10px;font-size:12px;"><b>Notes:</b> ${selOrder.notes}</div>`:""}
    <div class="bank">
      <b>Bank Details:</b><br/>
      Account Name: Shreeja Packaging Industries Pvt. Ltd.<br/>
      Bank Name: Indian Bank | Account No: 7037726473<br/>
      IFSC: IDIB000M175 | Branch: Ind MSME Delhi Erstwhile Microstate Branch, Inder Enclave
    </div>
    <div class="footer">Payment Terms: As agreed | Computer generated proforma invoice.</div>
    </body></html>`;
  };

  const _printProformaOld = () => {
    if(!selOrder) return;
    const win=window.open("","_blank");
    if(!win) { toast$("Popup blocked! Browser settings mein allow karo.",true); return; }
    const subtotal=selOrder?.items?.reduce((s,i)=>s+(Number(i.amount)||0),0)||0;
    const epr=selOrder?.epr_applied?Math.round(subtotal*0.01):0;
    const freight=Number(selOrder?.freight)||0;
    const freightGstAmt=Number(selOrder?.freight_gst)||0;
    const gst=selOrder?.gst_type==="including"?0:Math.round(subtotal*0.18);
    const grandTotal=subtotal+epr+freight+freightGstAmt+gst;
    win.document.write(`<html><head><title>Proforma - ${selOrder?.company}</title>
    <style>body{font-family:Arial,sans-serif;padding:24px;color:#000;}h2{text-align:center;margin-bottom:4px;}.sub{text-align:center;font-size:12px;margin-bottom:20px;color:#555;}.info{display:flex;justify-content:space-between;margin-bottom:16px;font-size:13px;}table{width:100%;border-collapse:collapse;font-size:12px;}th{background:#f59e0b;padding:8px;text-align:left;border:1px solid #ddd;}td{padding:7px 8px;border:1px solid #ddd;}.total{text-align:right;margin-top:12px;font-size:14px;}.footer{margin-top:30px;font-size:11px;color:#888;border-top:1px solid #ddd;padding-top:10px;}</style></head><body>
    <h2>Shreeja Packaging Industries Pvt. Ltd.</h2>
    <div class="sub">Mayur Food Packaging Products | Delhi<br/>PROFORMA INVOICE</div>
    <div class="info">
      <div><b>To:</b> ${selOrder?.company||""}<br/>${selOrder?.customer_name||""}${selOrder?.customerData?.phone?`<br/>📞 ${selOrder.customerData.phone}`:""}${selOrder?.customerData?.address?`<br/>📍 ${selOrder.customerData.address}`:""}${selOrder?.customerData?.gst_no?`<br/>GST: <b>${selOrder.customerData.gst_no}</b>`:""}</div>
      <div style="text-align:right"><b>Date:</b> ${fd(selOrder?.order_date)}<br/><b>Payment:</b> ${selOrder?.payment_mode?.replace("_"," ")||""}</div>
    </div>
    <table><thead><tr><th>#</th><th>SKU</th><th>Product</th><th>Packing</th><th>Cases</th><th>Total CTN</th><th>Price/Pcs (₹)</th><th>CTN Price (₹)</th><th>Disc(₹)</th><th>Amount (₹)</th></tr></thead>
    <tbody>${(selOrder?.items||[]).map((item,idx)=>`<tr><td>${idx+1}</td><td>${item.sku_code||""}</td><td>${item.product_name||""}</td><td>${item.packing||""}</td><td>${item.qty_cases||""}</td><td>${Number(item.qty_cases||0)} CTN</td><td>${item.price_per_pcs||""}</td><td>${item.ctn_price||""}</td><td>${item.discount||0}</td><td><b>₹${Number(item.amount||0).toLocaleString("en-IN")}</b></td></tr>`).join("")}</tbody></table>
    <div class="total">Subtotal: ₹${subtotal.toLocaleString("en-IN")}<br/>${epr>0?`EPR @1%: ₹${epr.toLocaleString("en-IN")}<br/>`:""}${freight>0?`Freight & Forwarding: ₹${freight.toLocaleString("en-IN")}<br/>`:""}${freightGstAmt>0?`Freight GST @18%: ₹${freightGstAmt.toLocaleString("en-IN")}<br/>`:""}${gst>0?`GST @18%: ₹${gst.toLocaleString("en-IN")}<br/>`:""}
    <b>Grand Total: ₹${grandTotal.toLocaleString("en-IN")}</b><br/>
    <span style="font-size:12px;color:#666;">Total Cartons: <b>${(selOrder?.items||[]).reduce((s,i)=>s+(Number(i.qty_cases)||0),0)} CTN</b> | Total SKUs: <b>${(selOrder?.items||[]).length}</b></span></div>
    ${selOrder?.notes?`<div style="margin-top:12px;font-size:12px;"><b>Notes:</b> ${selOrder.notes}</div>`:""}
    <div style="margin-top:20px;padding:12px;background:#f8f9fa;border:1px solid #dee2e6;border-radius:6px;font-size:12px;">
      <b>Bank Details:</b><br/>
      Account Name: Shreeja Packaging Industries Pvt. Ltd.<br/>
      Bank Name: Indian Bank<br/>
      Account No: 7037726473<br/>
      IFSC: IDIB000M175<br/>
      Branch: Ind MSME Delhi Erstwhile Microstate Branch, Inder Enclave
    </div>
    <div class="footer">Payment Terms: As agreed | Computer generated proforma invoice.</div>
    </body></html>`);
    win.document.close(); win.print();
  };

  const generateWAMessage = (order) => {
    if(!order) return;
    const subtotal = order.items?.reduce((s,i)=>s+(Number(i.amount)||0),0)||0;
    const epr = order.epr_applied ? Math.round(subtotal*0.01) : 0;
    const gst = order.gst_type==="including" ? 0 : Math.round(subtotal*0.18);
    const total = subtotal + epr + gst;
    const NL = "\n";
    let msg = "*Mayur Food Packaging Products*" + NL;
    msg += "_Shreeja Packaging Industries Pvt. Ltd._" + NL + NL;
    msg += "*Order Confirmation*" + NL;
    msg += "Date: " + fd(order.order_date) + NL;
    msg += "Party: *" + (order.company||order.customer_name||"") + "*" + NL + NL;
    msg += "*Items:*" + NL;
    (order.items||[]).forEach((item,idx) => {
      const amt = Number(item.amount||0).toLocaleString("en-IN");
      msg += (idx+1) + ". " + (item.product_name||"") + " - " + (item.qty_cases||"") + " ctns @ Rs." + (item.ctn_price||"") + "/ctn = *Rs." + amt + "*" + NL;
    });
    msg += NL + "Subtotal: Rs." + subtotal.toLocaleString("en-IN") + NL;
    if(epr>0) msg += "EPR @1%: Rs." + epr.toLocaleString("en-IN") + NL;
    if(gst>0) msg += "GST @18%: Rs." + gst.toLocaleString("en-IN") + NL;
    const freight2 = Number(order.freight)||0;
    const freightGst2 = Number(order.freight_gst)||0;
    if(freight2>0) msg += "Freight & Forwarding: Rs." + freight2.toLocaleString("en-IN") + NL;
    if(freightGst2>0) msg += "Freight GST @18%: Rs." + freightGst2.toLocaleString("en-IN") + NL;
    msg += "*Total: Rs." + (Number(order.total_amount)||0).toLocaleString("en-IN") + "*" + NL + NL;
    msg += "Payment: " + (order.payment_mode||"").replace("_"," ") + NL;
    if(order.notes) msg += "Note: " + order.notes + NL;
    msg += NL + "_Please confirm the order._" + NL + "Thank you!";
    navigator.clipboard.writeText(msg).then(()=>{
      toast$("WA message copied — WhatsApp mein paste karo!");
    }).catch(()=>{
      const w = window.open("","_blank");
      w.document.write("<pre style='padding:20px;font-family:sans-serif;white-space:pre-wrap;'>" + msg + "</pre>");
    });
  };

  if(loading) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",gap:14,background:"var(--bg)"}}>
      <div style={{fontSize:32}}>📦</div>
      <div style={{fontFamily:"'Sora',sans-serif",fontSize:16,fontWeight:700,color:"var(--acc)"}}>Mayur CRM</div>
      <div style={{display:"flex",alignItems:"center",gap:8,color:"var(--mut)",fontSize:12}}><Spin/> Loading...</div>
    </div>
  );

  /* ── DASHBOARD ── */
  const Dash = () => (
    <div>
      <div className="sg">
        {[
          {lbl:"CRM Customers",val:myC.filter(c=>c.type==="crm").length,sub:"Active accounts",col:"#10b981",ic:"👥",fn:()=>{setCTab("crm");setView("customers");}},
          {lbl:"NBD Prospects",val:myC.filter(c=>c.type==="nbd").length,sub:"In pipeline",col:"#60a5fa",ic:"🎯",fn:()=>{setCTab("nbd");setView("customers");}},
          {lbl:"Retail Parties",val:myC.filter(c=>c.type==="retail").length,sub:"Retail group",col:"#a855f7",ic:"🏪",fn:()=>{setCTab("retail");setView("customers");}},
          {lbl:"Direct Parties",val:myC.filter(c=>c.type==="direct").length,sub:"Direct group",col:"#f97316",ic:"🏢",fn:()=>{setCTab("direct");setView("customers");}},
          {lbl:"Open Enquiries",val:myE.filter(e=>!["won","lost"].includes(e.status)).length,sub:"Active leads",col:"#f59e0b",ic:"📋",fn:()=>setView("enquiries")},
          {lbl:"Urgent Follow-ups",val:urgN,sub:urgN>0?"⚠️ Act now":"All clear ✅",col:urgN>0?"#ef4444":"#10b981",ic:"⚡",fn:()=>setView("followups")},
        ].map(s=>(
          <div key={s.lbl} className="sc" style={{borderLeft:`3px solid ${s.col}`}} onClick={s.fn}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div><div className="sc-lbl">{s.lbl}</div><div className="sc-val" style={{color:s.col}}>{s.val}</div><div className="sc-sub">{s.sub}</div></div>
              <div style={{fontSize:22}}>{s.ic}</div>
            </div>
          </div>
        ))}
      </div>
      {/* ── SPEED METER SECTION ── */}
      {isAdmin&&(()=>{
        const curMonth = String(new Date().getMonth()+1).padStart(2,"0");
        const curYear = new Date().getFullYear();
        const today = new Date().toISOString().slice(0,10);

        const SpeedGauge = ({value, max, label, size=110}) => {
          const [animPct, setAnimPct] = useState(0);
          const targetPct = Math.min(value/Math.max(max,1), 1);
          useEffect(()=>{
            let frame, start=null, from=0;
            const animate=(ts)=>{
              if(!start) start=ts;
              const p = Math.min((ts-start)/800, 1); // 800ms animation
              const ease = 1-Math.pow(1-p,3); // ease out cubic
              setAnimPct(from + (targetPct-from)*ease);
              if(p<1) frame=requestAnimationFrame(animate);
            };
            frame=requestAnimationFrame(animate);
            return()=>cancelAnimationFrame(frame);
          },[targetPct]);

          const zone = animPct>=0.9?"#10b981":animPct>=0.7?"#f59e0b":animPct>=0.4?"#f97316":"#ef4444";
          const cx=size/2, cy=size*0.54, r=size*0.38;
          const toXY=(deg,rad)=>({
            x: cx+rad*Math.cos((deg-90)*Math.PI/180),
            y: cy+rad*Math.sin((deg-90)*Math.PI/180)
          });
          // Arc from -135 to +135
          const s=toXY(-135,r), e=toXY(135,r);
          const valAngle=-135+animPct*270;
          const v=toXY(valAngle,r);
          const needle=toXY(valAngle,r*0.72);
          const needleTail=toXY(valAngle+180,r*0.2);
          const dispVal = value>=100000?"₹"+Math.round(value/1000)+"K":value>=1000?"₹"+Math.round(value/1000)+"K":value;

          // Tick marks
          const ticks = Array.from({length:9},(_,i)=>i/8);

          return (
            <div style={{textAlign:"center",position:"relative"}}>
              <svg width={size} height={size*0.78} viewBox={"0 0 "+size+" "+(size*0.78)} style={{overflow:"visible",filter:"drop-shadow(0 2px 8px rgba(0,0,0,.15))"}}>
                {/* Outer ring */}
                <circle cx={cx} cy={cy} r={r+size*0.08} fill="var(--card)" stroke="var(--bdr)" strokeWidth={1}/>
                {/* Background arc */}
                <path d={"M "+s.x+" "+s.y+" A "+r+" "+r+" 0 1 1 "+e.x+" "+e.y}
                  fill="none" stroke="#1a1a2e" strokeWidth={size*0.09} strokeLinecap="round"/>
                {/* Color zones on arc */}
                {[{from:0,to:0.4,c:"#ef444433"},{from:0.4,to:0.7,c:"#f9731633"},{from:0.7,to:0.9,c:"#f59e0b33"},{from:0.9,to:1,c:"#10b98133"}].map((zone,zi)=>{
                  const sa=toXY(-135+zone.from*270,r), ea=toXY(-135+zone.to*270,r);
                  const largeArc=(zone.to-zone.from)>0.5?1:0;
                  return <path key={zi} d={"M "+sa.x+" "+sa.y+" A "+r+" "+r+" 0 "+largeArc+" 1 "+ea.x+" "+ea.y}
                    fill="none" stroke={zone.c} strokeWidth={size*0.09} strokeLinecap="round"/>;
                })}
                {/* Value arc (animated) */}
                {animPct>0.01&&<path d={"M "+s.x+" "+s.y+" A "+r+" "+r+" 0 "+(animPct>0.5?1:0)+" 1 "+v.x+" "+v.y}
                  fill="none" stroke={zone} strokeWidth={size*0.07} strokeLinecap="round"
                  style={{filter:"drop-shadow(0 0 4px "+zone+")"}}/>}
                {/* Tick marks */}
                {ticks.map((t,ti)=>{
                  const angle=-135+t*270;
                  const outer=toXY(angle,r-size*0.02), inner=toXY(angle,r-size*0.09);
                  return <line key={ti} x1={outer.x} y1={outer.y} x2={inner.x} y2={inner.y}
                    stroke={t<=animPct?zone:"#444"} strokeWidth={ti%2===0?2:1} strokeLinecap="round"/>;
                })}
                {/* Needle */}
                <line x1={needleTail.x} y1={needleTail.y} x2={needle.x} y2={needle.y}
                  stroke={zone} strokeWidth={size*0.025} strokeLinecap="round"
                  style={{filter:"drop-shadow(0 1px 3px rgba(0,0,0,.5))"}}/>
                {/* Center hub */}
                <circle cx={cx} cy={cy} r={size*0.06} fill="#1a1a2e" stroke={zone} strokeWidth={2}/>
                <circle cx={cx} cy={cy} r={size*0.03} fill={zone}/>
                {/* Value */}
                <text x={cx} y={cy+size*0.2} textAnchor="middle" fontSize={size*0.16} fontWeight="900" fill={zone}
                  style={{fontFamily:"monospace"}}>{dispVal}</text>
              </svg>
              <div style={{fontSize:size*0.09,color:"var(--mut)",marginTop:-4,fontWeight:600,letterSpacing:.5,textTransform:"uppercase"}}>{label}</div>
              <div style={{fontSize:size*0.08,color:zone,fontWeight:700}}>
                {animPct>=0.9?"🔥 Excellent":animPct>=0.7?"✅ Good":animPct>=0.4?"⚡ Growing":"🎯 Push!"}
              </div>
            </div>
          );
        };

        return (
          <div className="card" style={{marginBottom:14}}>
            <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>⚡ Team Performance — {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][new Date().getMonth()]} {curYear}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12}}>
              {USERS.filter(u=>u.role==="sales"||u.role==="admin").map(u=>{
                const mInter = I.filter(i=>i.created_at?.startsWith(curYear+"-"+curMonth)&&i.done_by===u.name).length;
                const mOrders = ORDERS.filter(o=>o.order_date?.startsWith(curYear+"-"+curMonth)&&o.created_by===u.name);
                const mRev = mOrders.reduce((s,o)=>s+(Number(o.total_amount)||0),0);
                const tgt = TARGETS.find(t=>t.user_name===u.name&&t.month===curMonth&&t.year===curYear);
                const tgtAmt = Number(tgt?.target_amount||0);
                const achPct = tgtAmt>0?Math.round(mRev/tgtAmt*100):0;
                const todayActs = I.filter(i=>i.created_at?.startsWith(today)&&i.done_by===u.name).length;
                return (
                  <div key={u.name} style={{background:"var(--card2)",borderRadius:10,padding:10,textAlign:"center"}}>
                    <div style={{display:"flex",gap:6,alignItems:"center",justifyContent:"center",marginBottom:8}}>
                      <Av name={u.name} size={22}/>
                      <span style={{fontWeight:700,fontSize:12}}>{u.name}</span>
                      {todayActs>0&&<span style={{fontSize:9,background:"#10b981",color:"#fff",borderRadius:8,padding:"1px 6px",fontWeight:700}}>+{todayActs} aaj</span>}
                    </div>
                    <div style={{display:"flex",gap:4,justifyContent:"center",flexWrap:"wrap"}}>
                      <SpeedGauge value={mInter} max={50} label="Calls/Visits" size={95}/>
                      <SpeedGauge value={mOrders.length} max={20} label="Orders" size={95}/>
                      {tgtAmt>0
                        ?<SpeedGauge value={achPct} max={100} label={"Target "+achPct+"%"} size={95}/>
                        :<SpeedGauge value={mRev} max={500000} label="Revenue" size={95}/>
                      }
                    </div>
                    {tgtAmt>0&&(
                      <div style={{fontSize:10,marginTop:4,color:achPct>=100?"#10b981":achPct>=70?"#f59e0b":"#ef4444",fontWeight:700}}>
                        ₹{Math.round(mRev/1000)}K / ₹{Math.round(tgtAmt/1000)}K target
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      <div className="g2" style={{marginBottom:18}}>
        <div className="card">
          <div className="sh"><div><div className="sh-t">⚡ Urgent Follow-ups</div><div className="sh-s">Overdue + Today</div></div><button className="btn btn-o btn-sm" onClick={()=>setView("followups")}>All →</button></div>
          {[...odFU,...tdFU].length===0
            ?<div className="empty"><CheckCircle size={28} color="var(--ok)"/><p>Koi urgent nahi!</p></div>
            :[...odFU,...tdFU].slice(0,4).map(i=>(
              <div key={i.id} style={{display:"flex",gap:10,padding:"9px 0",borderBottom:"1px solid var(--bdr)"}}>
                <Av name={i.customer_name} size={34}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",justifyContent:"space-between"}}>
                    <div style={{fontWeight:700,fontSize:12.5}}>{i.customer_name}</div>
                    <span style={{fontSize:9.5,color:isOD(i.next_follow_up)?"#ef4444":"#f59e0b",fontWeight:800}}>{isOD(i.next_follow_up)?"🔴 OVERDUE":"🟡 TODAY"}</span>
                  </div>
                  <div style={{fontSize:10.5,color:"var(--mut)"}}>{i.company}</div>
                  <div style={{fontSize:11,marginTop:3}}>{i.follow_up_note||i.note?.slice(0,55)+"..."}</div>
                  <button className="btn btn-g btn-sm" style={{marginTop:5}} onClick={()=>markDone(i.id)}>✓ Done</button>
                </div>
              </div>
            ))}
        </div>
        <div className="card">
          <div className="sh"><div><div className="sh-t">📋 Recent Orders</div><div className="sh-s">Latest 20</div></div><button className="btn btn-o btn-sm" onClick={()=>{loadAllOrders();setView("orders");}}>All →</button></div>
          {myORDERS.length===0?<div className="empty"><p>Koi order nahi</p></div>
            :[...myORDERS].sort((a,b)=>new Date(b.order_date)-new Date(a.order_date)).slice(0,5).map(o=>(
              <div key={o.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid var(--bdr)"}}>
                <div><div style={{fontSize:12.5,fontWeight:600}}>{o.company}</div><div style={{fontSize:10.5,color:"var(--mut)"}}>{fd(o.order_date)}</div></div>
                <div style={{display:"flex",gap:7,alignItems:"center"}}>
                  <span style={{fontSize:12,fontWeight:700,color:"#10b981"}}>{fr(o.total_amount)}</span>
                  <Bdg s={o.status}/>
                </div>
              </div>
            ))}
        </div>
      </div>
      <div className="g2">
        <div className="card">
          <div className="sh-t" style={{marginBottom:12}}>🧪 Sample Tracker</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8}}>
            {["pending","sent","approved","revision","rejected"].map(st=>{
              const cfg=ST[st]; const cnt=myS.filter(s=>s.status===st).length;
              return <div key={st} className="card2" style={{textAlign:"center"}}><div style={{fontSize:20,fontWeight:800,color:cfg.c}}>{cnt}</div><div style={{fontSize:8.5,color:"var(--mut)",textTransform:"uppercase",fontWeight:700,marginTop:2}}>{st}</div></div>;
            })}
          </div>
          <button className="btn btn-o btn-sm" style={{marginTop:12,width:"100%",justifyContent:"center"}} onClick={()=>setView("samples")}>Detail →</button>
        </div>
        <div className="card">
          <div className="sh-t" style={{marginBottom:12}}>💳 Payment Overview</div>
          <div className="g2" style={{marginBottom:12}}>
            <div style={{textAlign:"center"}}><div style={{fontSize:10.5,color:"var(--mut)",marginBottom:3}}>Outstanding</div><div style={{fontSize:18,fontWeight:800,fontFamily:"'Sora',sans-serif",color:"#60a5fa"}}>{fr(P.reduce((s,p)=>s+(Number(p.outstanding)||0),0))}</div></div>
            <div style={{textAlign:"center"}}><div style={{fontSize:10.5,color:"var(--mut)",marginBottom:3}}>Overdue</div><div style={{fontSize:18,fontWeight:800,fontFamily:"'Sora',sans-serif",color:"#ef4444"}}>{fr(P.reduce((s,p)=>s+(Number(p.overdue)||0),0))}</div></div>
          </div>
          {P.filter(p=>p.overdue>0).map(p=>(
            <div key={p.id} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid var(--bdr)",fontSize:11.5}}>
              <span>{p.company}</span><span style={{color:"#ef4444",fontWeight:800}}>{fr(p.overdue)} overdue</span>
            </div>
          ))}
          <button className="btn btn-o btn-sm" style={{marginTop:12,width:"100%",justifyContent:"center"}} onClick={()=>setView("payments")}>Detail →</button>
        </div>
      </div>
    </div>
  );

  /* ── PRODUCTS ── */
  const Products = () => {
    const list = PRODS.filter(p=>pCat==="all"||p.category===pCat).filter(p=>!q||[p.name,p.sku_code,p.category].some(v=>v?.toLowerCase().includes(q.toLowerCase())));
    return (
      <div>
        <div className="sh"><div><div className="sh-t">Product / SKU List</div><div className="sh-s">{PRODS.length} total SKUs</div></div><button className="btn btn-p" onClick={()=>{setForm({});setEditProd(null);setModal("aprod");}}><Plus size={13}/> Add SKU</button></div>
        <div className="tabs" style={{flexWrap:"wrap"}}>
          {prodCats.map(t=><div key={t} className={`tab ${pCat===t?"a":""}`} onClick={()=>setPCat(t)} style={{textTransform:"capitalize",fontSize:10.5}}>{t} ({t==="all"?PRODS.length:PRODS.filter(p=>p.category===t).length})</div>)}
        </div>
        <div className="sr"><Search size={13} className="sr-ic"/><input className="inp" placeholder="Search SKU, product..." value={q} onChange={e=>setQ(e.target.value)}/></div>
        {list.length===0?<div className="card empty"><p>Koi product nahi</p></div>
          :<div className="card" style={{padding:0}}><div className="tw"><table>
            <thead><tr><th>SKU Code</th><th>Product Name</th><th>Category</th><th>Packing</th><th>Price/Pcs (₹)</th><th>CTN Price (₹)</th><th>Edit</th></tr></thead>
            <tbody>{list.map(p=>(
              <tr key={p.id}>
                <td><span style={{fontSize:10,background:"rgba(245,158,11,.1)",color:"var(--acc)",padding:"2px 7px",borderRadius:6,fontWeight:700}}>{p.sku_code||"—"}</span></td>
                <td style={{fontWeight:600,fontSize:12.5}}>{p.name}</td>
                <td><span style={{fontSize:10,padding:"2px 8px",borderRadius:12,background:"rgba(59,130,246,.1)",color:"#60a5fa",fontWeight:700}}>{p.category}</span></td>
                <td style={{fontSize:12,textAlign:"center"}}>{p.packing||"—"}</td>
                <td style={{fontSize:13,fontWeight:700,color:"#10b981"}}>₹{p.price_per_pcs||0}</td>
                <td style={{fontSize:13,fontWeight:700,color:"#60a5fa"}}>₹{p.ctn_price||0}</td>
                <td><button className="btn btn-o btn-sm" onClick={()=>{setEditProd(p);setForm({...p});setModal("aprod");}}><Edit size={11}/></button></td>
              </tr>
            ))}</tbody>
          </table></div></div>}
      </div>
    );
  };

  /* ── ORDERS ── */
  const Orders = () => {
    const list = myORDERS.filter(o=>!q||[o.customer_name,o.company].some(v=>v?.toLowerCase().includes(q.toLowerCase())));
    const ts = dt => dt?new Date(dt).toLocaleString("en-IN",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}):null;

    const PipelineStep = ({done,label,by,at,col}) => (
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,minWidth:70}}>
        <div style={{width:22,height:22,borderRadius:"50%",background:done?col:"var(--bdr)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:done?"#fff":"var(--mut)",fontWeight:700,flexShrink:0}}>{done?"✓":""}</div>
        <div style={{fontSize:9,fontWeight:700,color:done?col:"var(--mut)",textTransform:"uppercase",letterSpacing:".05em"}}>{label}</div>
        {done&&by&&<div style={{fontSize:8.5,color:"var(--mut)",textAlign:"center"}}>{by}</div>}
        {done&&at&&<div style={{fontSize:8,color:"var(--mut)",textAlign:"center"}}>{ts(at)}</div>}
      </div>
    );

    const nextStep = status => {
      if(status==="draft") return {label:"Confirm",next:"confirmed",col:"#10b981"};
      if(status==="confirmed") return {label:"Dispatch",next:"dispatched",col:"#f59e0b"};
      if(status==="dispatched") return {label:"Delivered",next:"delivered",col:"#3b82f6"};
      return null;
    };

    return (
      <div>
        <div className="sh">
          <div>
            <div className="sh-t">Orders & Proforma</div>
            <div className="sh-s">{allOrdersLoaded?myORDERS.length:"20 recent"}  orders {!allOrdersLoaded&&<button className="btn btn-o btn-sm" style={{marginLeft:6}} onClick={loadAllOrders}>Load All</button>}</div>
          </div>
          <button className="btn btn-p" onClick={()=>{setForm({order_date:new Date().toISOString().split("T")[0],epr:false});setOrderItems([]);if(pxRows.length===0)loadPricing();setModal("aorder");}}><Plus size={13}/> New Order</button>
        </div>
        <div className="sr"><Search size={13} className="sr-ic"/><input className="inp" placeholder="Search customer..." defaultValue={q} onChange={e=>setQ(e.target.value)}/></div>
        {list.length===0?<div className="card empty"><p>Koi order nahi</p></div>
          :<div style={{display:"flex",flexDirection:"column",gap:10}}>
            {list.map(o=>{
              const ns=nextStep(o.status);
              return (
                <div key={o.id} className="card" style={{padding:"14px 16px",borderLeft:`3px solid ${o.status==="delivered"?"#10b981":o.status==="dispatched"?"#f59e0b":o.status==="confirmed"?"#a78bfa":"var(--bdr)"}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:13.5}}>{o.company}</div>
                      <div style={{fontSize:10.5,color:"var(--mut)",marginTop:2}}>{fd(o.order_date)} · {o.created_by} · {o.payment_mode?.replace("_"," ")}</div>
                      {o.items_summary&&<div style={{fontSize:11,color:"var(--txt)",marginTop:4,padding:"4px 8px",background:"var(--card2)",borderRadius:6,display:"inline-block"}}>{o.items_summary}</div>}
                    </div>
                    <div style={{display:"flex",gap:6,alignItems:"center"}}>
                      <div style={{fontSize:15,fontWeight:800,color:"#10b981"}}>{fr(o.total_amount)}</div>
                      <button className="btn btn-o btn-sm" onClick={async()=>{setForm({...o,epr:!!o.epr_applied});try{const items=await sbGetOrderItems(o.id);setOrderItems(items||[]);}catch(e){setOrderItems([]);}setModal("editorder");}}>✏️</button>
                      <button className="btn btn-o btn-sm" onClick={()=>openOrder(o)} title="Preview PI"><Printer size={11}/></button>
                      <button className="btn btn-o btn-sm" onClick={()=>{
                        // window.open MUST be first — before any async
                        const w=window.open("","_blank");
                        if(!w){toast$("Popup blocked!",true);return;}
                        w.document.write("<html><body><h3>Loading PI...</h3></body></html>");
                        sbGetOrderItems(o.id).then(items=>{
                          const custP = o.customer_id?sbFetch("crm_customers?id=eq."+o.customer_id+"&select=phone,address,gst_no"):Promise.resolve([]);
                          custP.then(custArr=>{
                            const ord={...o,items:items||[],customerData:custArr?.[0]||{}};
                            const s=(items||[]).reduce((a,i)=>a+(Number(i.amount)||0),0);
                            const e2=o.epr_applied?Math.round(s*0.01):0;
                            const f2=Number(o.freight)||0;
                            const fg2=Number(o.freight_gst)||0;
                            const g2=o.gst_type==="including"?0:Math.round(s*0.18);
                            w.document.open();
                            w.document.write(getPIHtml(ord,s,e2,f2,fg2,g2,s+e2+f2+fg2+g2));
                            w.document.close();
                          });
                        });
                      }} title="Print PI in New Tab" style={{background:"var(--acc)",borderColor:"var(--acc)",color:"#fff"}}>
                        🖨️
                      </button>
                      {isAdmin&&<button onClick={async(e)=>{e.stopPropagation();if(!window.confirm("Delete order?"))return;await sbFetch("crm_order_items?order_id=eq."+o.id,{method:"DELETE"});await sbFetch("crm_orders?id=eq."+o.id,{method:"DELETE"});setORDERS(p=>p.filter(x=>x.id!==o.id));toast$("Order deleted!");}} style={{padding:"3px 7px",borderRadius:5,fontSize:10,border:"1px solid #ef4444",background:"transparent",color:"#ef4444",cursor:"pointer"}}>🗑</button>}
                    </div>
                  </div>
                  <div style={{display:"flex",alignItems:"flex-start",gap:0,marginBottom:12}}>
                    <PipelineStep done={true} label="Draft" by={o.created_by} at={o.order_date} col="#60a5fa"/>
                    <div style={{flex:1,height:2,background:["confirmed","dispatched","delivered"].includes(o.status)?"#a78bfa":"var(--bdr)",marginTop:10,alignSelf:"flex-start"}}/>
                    <PipelineStep done={!!o.confirmed_at||["confirmed","dispatched","delivered"].includes(o.status)} label="Confirmed" by={o.confirmed_by||""} at={o.confirmed_at} col="#a78bfa"/>
                    <div style={{flex:1,height:2,background:["dispatched","delivered"].includes(o.status)?"#f59e0b":"var(--bdr)",marginTop:10,alignSelf:"flex-start"}}/>
                    <PipelineStep done={!!o.dispatched_at||["dispatched","delivered"].includes(o.status)} label="Dispatched" by={o.dispatched_by||""} at={o.dispatched_at} col="#f59e0b"/>
                    <div style={{flex:1,height:2,background:o.status==="delivered"?"#10b981":"var(--bdr)",marginTop:10,alignSelf:"flex-start"}}/>
                    <PipelineStep done={o.status==="delivered"} label="Delivered" by={o.delivered_by||""} at={o.delivered_at} col="#10b981"/>
                  </div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    {ns&&o.status!=="cancelled"&&<button className="btn btn-sm" style={{background:`${ns.col}20`,border:`1px solid ${ns.col}40`,color:ns.col,fontWeight:700}} onClick={()=>advanceOrder(o,ns.next)}>→ {ns.label}</button>}
                    {o.status==="delivered"&&<span style={{fontSize:11,color:"var(--ok)",fontWeight:700}}>🎉 Order Complete</span>}
                    {o.status!=="cancelled"&&o.status!=="delivered"&&<button className="btn btn-sm" style={{background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",color:"var(--err)",fontSize:10}} onClick={()=>updOrderStatus(o.id,"cancelled")}>✕ Cancel</button>}
                    {o.notes&&<span style={{fontSize:10.5,color:"var(--mut)",marginLeft:"auto",maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"inline-block"}} title={o.notes}>📝 {o.notes.slice(0,40)}{o.notes.length>40?"...":""}</span>}
                  </div>
                </div>
              );
            })}
          </div>}
      </div>
    );
  };

  /* ── CUSTOMERS ── */
  const Customers = () => {
    const [sortBy, setSortBy] = useState("company"); // company | assigned | status | type
    const [alphaFilter, setAlphaFilter] = useState("all"); // all | A | B | C ...
    const [assignFilter, setAssignFilter] = useState("all");
    const [typeFilter, setTypeFilter] = useState(cTab);
    const [localQ, setLocalQ] = useState(""); // local search — prevents cursor jump

    // Sync typeFilter with cTab
    React.useEffect(()=>setTypeFilter(cTab),[cTab]);

    const ALPHA = ["all","#","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"];
    const assignees = ["all", ...new Set(myC.map(c=>c.assigned_to).filter(Boolean))].sort();

    const getFirst = (c) => {
      const name = (c.company||c.name||"").replace(/^M\/S\s*/i,"").trim();
      const ch = name[0]?.toUpperCase();
      return ch>="A"&&ch<="Z" ? ch : "#";
    };

    const list = myC
      .filter(c=>typeFilter==="all"||c.type===typeFilter)
      .filter(c=>assignFilter==="all"||c.assigned_to===assignFilter)
      .filter(c=>alphaFilter==="all"||(getFirst(c)===alphaFilter)||(alphaFilter==="#"&&getFirst(c)==="#"))
      .filter(c=>!localQ||[c.name,c.company,c.city,c.phone,c.email,c.assigned_to].some(v=>v&&String(v).toLowerCase().includes(localQ.toLowerCase())))
      .sort((a,b)=>{
        if(sortBy==="company") return (a.company||"").localeCompare(b.company||"");
        if(sortBy==="assigned") return (a.assigned_to||"").localeCompare(b.assigned_to||"");
        if(sortBy==="status") return (a.status||"").localeCompare(b.status||"");
        return (a.company||"").localeCompare(b.company||"");
      });

    // Group by first letter
    const grouped = list.reduce((g,c)=>{
      const k = getFirst(c);
      if(!g[k]) g[k]=[];
      g[k].push(c);
      return g;
    },{});
    const groupKeys = Object.keys(grouped).sort();

    return (
      <div>
        <div className="sh">
          <div><div className="sh-t">Customer Management</div><div className="sh-s">{list.length} of {myC.length} · {assignFilter!=="all"?assignFilter:"All reps"}</div></div>
          <div style={{display:"flex",gap:8}}>
            <button className="btn btn-o btn-sm" onClick={()=>{setForm({});setModal("ainter");}}>+ Log Interaction</button>
            <button className="btn btn-p" onClick={()=>{setForm({});setModal("acust");}}><Plus size={13}/> Add Customer</button>
          </div>
        </div>

        {/* Type tabs */}
        <div className="tabs" style={{flexWrap:"wrap"}}>
          {[["all","All"],["crm","CRM"],["retail","Retail"],["direct","Direct"],["enduser","End Users"],["nbd","NBD"]].map(([id,l])=>(
            <div key={id} className={`tab ${typeFilter===id?"a":""}`} onClick={()=>{setTypeFilter(id);setCTab(id);}}>{l} ({id==="all"?myC.length:myC.filter(c=>c.type===id).length})</div>
          ))}
        </div>

        {/* Filters row */}
        <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap",alignItems:"center"}}>
          {/* Assigned to filter */}
          <select className="inp" style={{width:"auto",padding:"5px 10px",fontSize:11}}
            value={assignFilter} onChange={e=>setAssignFilter(e.target.value)}>
            {assignees.map(a=><option key={a} value={a}>{a==="all"?"👤 Sab Reps":a}</option>)}
          </select>
          {/* Sort */}
          <select className="inp" style={{width:"auto",padding:"5px 10px",fontSize:11}}
            value={sortBy} onChange={e=>setSortBy(e.target.value)}>
            <option value="company">A-Z Company</option>
            <option value="assigned">A-Z Rep</option>
            <option value="status">Status</option>
          </select>
          {/* Search — local state to prevent cursor jump */}
          <div className="sr" style={{flex:1,marginBottom:0}}>
            <Search size={13} className="sr-ic"/>
            <input className="inp" placeholder="Search party, city, rep..."
              value={localQ}
              onChange={e=>setLocalQ(e.target.value)}/>
          </div>
          {localQ&&<button className="btn btn-o btn-sm" onClick={()=>setLocalQ("")}>✕ Clear</button>}
        </div>

        {/* Alphabet filter */}
        <div style={{display:"flex",gap:3,marginBottom:10,flexWrap:"wrap"}}>
          {ALPHA.map(a=>(
            <button key={a} onClick={()=>setAlphaFilter(a===alphaFilter?"all":a)}
              style={{padding:"3px 7px",borderRadius:6,fontSize:11,fontWeight:700,cursor:"pointer",
                background:alphaFilter===a?"var(--acc)":"var(--card2)",
                color:alphaFilter===a?"#fff":"var(--mut)",
                border:"1px solid "+(alphaFilter===a?"var(--acc)":"var(--bdr)"),
                opacity:a==="all"||grouped[a]||a==="#"?1:0.3}}>
              {a}
            </button>
          ))}
        </div>

        {list.length===0?<div className="card empty"><p>Koi customer nahi mila</p></div>
          : alphaFilter!=="all" ? (
            // Single letter — flat table
            <div className="card" style={{padding:0}}>
              <div style={{padding:"8px 16px",fontSize:11,fontWeight:700,color:"var(--mut)",
                borderBottom:"1px solid var(--bdr)",background:"var(--card2)"}}>
                {alphaFilter} — {list.length} parties
              </div>
              <CustomerTable list={list}/>
            </div>
          ) : (
            // All — grouped by letter
            <div>
              {groupKeys.map(letter=>(
                <div key={letter} style={{marginBottom:14}}>
                  <div style={{padding:"6px 12px",background:"var(--acc)",color:"#fff",
                    borderRadius:"8px 8px 0 0",fontSize:13,fontWeight:800,
                    display:"flex",justifyContent:"space-between"}}>
                    <span>{letter}</span>
                    <span style={{fontWeight:400,fontSize:11}}>{grouped[letter].length} parties</span>
                  </div>
                  <div className="card" style={{padding:0,borderRadius:"0 0 8px 8px",borderTop:"none"}}>
                    <CustomerTable list={grouped[letter]}/>
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </div>
    );
  };

  const CustomerTable = ({list}) => (
    <div className="tw"><table>
      <thead><tr>
        <th>Party Name</th><th>Type</th><th>GST</th>
        <th>Assigned</th><th>Last Interaction</th><th>Follow-up</th><th>Status</th><th></th>
      </tr></thead>
      <tbody>{list.map(c=>{
        const li=gli(c.id);
        return <tr key={c.id} onClick={()=>openC(c.id)} style={{cursor:"pointer"}}>
          <td><div style={{display:"flex",gap:9,alignItems:"center"}}>
            <Av name={c.name||c.company} size={28}/>
            <div>
              <div style={{fontWeight:700,fontSize:12}}>{c.company||c.name}</div>
              <div style={{fontSize:10,color:"var(--mut)"}}>{c.city||""}{c.city&&c.phone?" · ":""}{c.phone||""}</div>
            </div>
          </div></td>
          <td><span style={{fontSize:9.5,fontWeight:800,padding:"2px 8px",borderRadius:12,
            background:c.type==="crm"?"rgba(16,185,129,.1)":"rgba(59,130,246,.1)",
            color:c.type==="crm"?"#10b981":"#60a5fa"}}>{c.type?.toUpperCase()}</span></td>
          <td style={{fontSize:10,color:"var(--mut)",fontFamily:"monospace"}}>{c.gst_no||"—"}</td>
          <td>
            <div style={{fontSize:11,fontWeight:600}}>{c.assigned_to||"—"}</div>
            {c.sales_rep&&<div style={{fontSize:10,color:"#10b981",fontWeight:600}}>🎯 {c.sales_rep}</div>}
          </td>
          <td>{li?<div><span style={{color:TC[li.type],fontSize:11}}>{TI[li.type]} {li.type}</span><div style={{color:"var(--mut)",fontSize:9.5}}>{fd(li.created_at)}</div></div>:<span style={{color:"var(--mut)"}}>—</span>}</td>
          <td>{li?.next_follow_up?<span style={{fontSize:10,fontWeight:800,
            color:isOD(li.next_follow_up)?"#ef4444":isTD(li.next_follow_up)?"#f59e0b":"#10b981"}}>
            {isOD(li.next_follow_up)?"🔴":isTD(li.next_follow_up)?"🟡":"🟢"} {fd(li.next_follow_up)}
          </span>:<span style={{color:"var(--mut)"}}>—</span>}</td>
          <td><Bdg s={c.status}/></td>
          <td><button className="btn btn-o btn-sm" onClick={ev=>{ev.stopPropagation();openC(c.id);}}><Eye size={11}/></button></td>
        </tr>;
      })}</tbody>
    </table></div>
  );

  /* ── ENQUIRIES ── */
  const Enquiries = () => {
    const list = myE.filter(e=>eTab==="all"||e.status===eTab).filter(e=>!q||[e.customer_name,e.product].some(v=>v?.toLowerCase().includes(q.toLowerCase())));
    return (
      <div>
        <div className="sh"><div><div className="sh-t">Enquiry Pipeline</div><div className="sh-s">{myE.filter(e=>!["won","lost"].includes(e.status)).length} active</div></div><button className="btn btn-p" onClick={()=>{setForm({});setModal("aenq");}}><Plus size={13}/> New</button></div>
        <div className="tabs">{["all","new","quoted","negotiating","won","lost"].map(t=><div key={t} className={`tab ${eTab===t?"a":""}`} onClick={()=>setETab(t)} style={{textTransform:"capitalize"}}>{t} ({myE.filter(e=>t==="all"||e.status===t).length})</div>)}</div>
        <div className="sr"><Search size={13} className="sr-ic"/><input className="inp" placeholder="Search..." value={q} onChange={e=>setQ(e.target.value)}/></div>
        {list.length===0?<div className="card empty"><p>Koi enquiry nahi</p></div>
          :<div className="card" style={{padding:0}}><div className="tw"><table>
            <thead><tr><th>Customer</th><th>Product</th><th>Qty</th><th>Priority</th><th>Status</th><th>Assigned</th><th>Date</th><th>Update</th></tr></thead>
            <tbody>{list.map(e=><tr key={e.id}>
              <td style={{fontWeight:600}}>{e.customer_name}</td><td>{e.product}</td>
              <td style={{color:"var(--mut)",fontSize:11}}>{e.qty||"—"}</td>
              <td><span style={{fontSize:10.5,fontWeight:800,color:e.priority==="high"?"#ef4444":e.priority==="medium"?"#f59e0b":"var(--mut)"}}>{e.priority==="high"?"🔥":e.priority==="medium"?"⚡":"•"} {e.priority?.toUpperCase()}</span></td>
              <td><Bdg s={e.status}/></td><td style={{fontSize:11.5}}>{e.assigned_to}</td>
              <td style={{fontSize:10.5,color:"var(--mut)"}}>{fd(e.created_at)}</td>
              <td><select className="inp" style={{padding:"3px 8px",fontSize:11,width:"auto"}} value={e.status} onChange={ev=>updEnq(e.id,ev.target.value)}>{["new","quoted","negotiating","won","lost"].map(s=><option key={s} value={s}>{s}</option>)}</select></td>
            </tr>)}</tbody>
          </table></div></div>}
      </div>
    );
  };

  /* ── FOLLOW-UPS ── */
  const Followups = () => {
    const FuCard = ({i}) => {
      const od=isOD(i.next_follow_up),td=isTD(i.next_follow_up);
      return (
        <div className={`fuc ${od?"od":td?"td":"up"}`}>
          <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
            <Av name={i.customer_name} size={36}/>
            <div style={{flex:1}}>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <div><div style={{fontWeight:700,fontSize:12.5}}>{i.customer_name}</div><div style={{fontSize:10.5,color:"var(--mut)"}}>{i.company} · {TI[i.type]} {i.type} · {i.done_by}</div></div>
                <span style={{fontSize:10,fontWeight:800,color:od?"#ef4444":td?"#f59e0b":"#10b981"}}>{od?"🔴 OVERDUE":td?"🟡 TODAY":"🟢 "+fd(i.next_follow_up)}</span>
              </div>
              {i.follow_up_note&&<div style={{margin:"7px 0",padding:"7px 10px",background:"rgba(245,158,11,.06)",borderRadius:6,fontSize:11.5,borderLeft:"2px solid rgba(245,158,11,.3)"}}>📌 {i.follow_up_note}</div>}
              <div style={{fontSize:10.5,color:"var(--mut)",marginTop:3}}>"{i.note?.slice(0,90)}{i.note?.length>90?"...":""}"</div>
              <div style={{display:"flex",gap:6,marginTop:7}}>
                <button className="btn btn-g btn-sm" onClick={()=>markDone(i.id)}>✓ Mark Done</button>
                <button className="btn btn-o btn-sm" onClick={()=>openC(i.customer_id)}>View</button>
              </div>
            </div>
          </div>
        </div>
      );
    };
    const all=I.filter(i=>i.next_follow_up).sort((a,b)=>new Date(a.next_follow_up)-new Date(b.next_follow_up));
    const flt=fn=>all.filter(i=>fn(i.next_follow_up)&&(!q||i.customer_name?.toLowerCase().includes(q.toLowerCase())));
    return (
      <div>
        <div className="sh"><div><div className="sh-t">Follow-up Tracker</div><div className="sh-s">{urgN} urgent</div></div><button className="btn btn-p" onClick={()=>{setForm({});setModal("ainter");}}><Plus size={13}/> Add</button></div>
        <div className="sr"><Search size={13} className="sr-ic"/><input className="inp" placeholder="Search..." value={q} onChange={e=>setQ(e.target.value)}/></div>
        {odFU.length>0&&<div style={{marginBottom:16}}><div style={{fontSize:11,fontWeight:800,color:"#ef4444",textTransform:"uppercase",letterSpacing:".08em",marginBottom:8}}>🔴 Overdue ({odFU.length})</div>{flt(isOD).map(i=><FuCard key={i.id} i={i}/>)}</div>}
        {tdFU.length>0&&<div style={{marginBottom:16}}><div style={{fontSize:11,fontWeight:800,color:"#f59e0b",textTransform:"uppercase",letterSpacing:".08em",marginBottom:8}}>🟡 Today ({tdFU.length})</div>{flt(isTD).map(i=><FuCard key={i.id} i={i}/>)}</div>}
        {flt(d=>!isOD(d)&&!isTD(d)).length>0&&<div><div style={{fontSize:11,fontWeight:800,color:"#10b981",textTransform:"uppercase",letterSpacing:".08em",marginBottom:8}}>🟢 Upcoming</div>{flt(d=>!isOD(d)&&!isTD(d)).map(i=><FuCard key={i.id} i={i}/>)}</div>}
        {all.length===0&&<div className="card empty"><CheckCircle size={32} color="var(--ok)"/><p>Koi pending nahi!</p></div>}
      </div>
    );
  };

  /* ── SAMPLES ── */
  const Samples = () => {
    const list=myS.filter(s=>sTab==="all"||s.status===sTab).filter(s=>!q||[s.customer_name,s.company,s.product].some(v=>v?.toLowerCase().includes(q.toLowerCase())));
    return (
      <div>
        <div className="sh"><div><div className="sh-t">Sample Tracker</div><div className="sh-s">{myS.filter(s=>["pending","sent"].includes(s.status)).length} pending</div></div><button className="btn btn-p" onClick={()=>{setForm({});setModal("asamp");}}><Plus size={13}/> Add</button></div>
        <div className="tabs">{["all","pending","sent","approved","revision","rejected"].map(t=><div key={t} className={`tab ${sTab===t?"a":""}`} onClick={()=>setSTb(t)} style={{textTransform:"capitalize"}}>{t} ({myS.filter(s=>t==="all"||s.status===t).length})</div>)}</div>
        <div className="sr"><Search size={13} className="sr-ic"/><input className="inp" placeholder="Search..." value={q} onChange={e=>setQ(e.target.value)}/></div>
        {list.length===0?<div className="card empty"><p>Koi sample nahi</p></div>
          :<div className="card" style={{padding:0}}><div className="tw"><table>
            <thead><tr><th>Customer</th><th>Product</th><th>Qty</th><th>Sent</th><th>Status</th><th>Remarks</th><th>Update</th></tr></thead>
            <tbody>{list.map(s=><tr key={s.id}>
              <td><div style={{fontWeight:700,fontSize:12.5}}>{s.customer_name}</div><div style={{fontSize:10.5,color:"var(--mut)"}}>{s.company}</div></td>
              <td>{s.product}</td><td style={{fontSize:11,color:"var(--mut)"}}>{s.qty||"—"}</td>
              <td style={{fontSize:11.5}}>{fd(s.sent_date)}</td><td><Bdg s={s.status}/></td>
              <td style={{fontSize:10.5,color:"var(--mut)",maxWidth:140}}>{s.remarks||"—"}</td>
              <td><select className="inp" style={{padding:"3px 8px",fontSize:11,width:"auto"}} value={s.status} onChange={e=>updSamp(s.id,e.target.value)}>{["pending","sent","approved","revision","rejected"].map(st=><option key={st} value={st}>{st}</option>)}</select></td>
            </tr>)}</tbody>
          </table></div></div>}
      </div>
    );
  };

  /* ── PAYMENTS ── */
  const Payments = () => {
    const list=P.filter(p=>!q||[p.customer_name,p.company].some(v=>v?.toLowerCase().includes(q.toLowerCase())));
    const totO=P.reduce((s,p)=>s+(Number(p.outstanding)||0),0);
    const totOD=P.reduce((s,p)=>s+(Number(p.overdue)||0),0);
    return (
      <div>
        <div className="sh"><div><div className="sh-t">Payment Structure</div></div><button className="btn btn-p" onClick={()=>{setForm({});setModal("apay");}}><Plus size={13}/> Add/Update</button></div>
        <div className="g3" style={{marginBottom:18}}>
          {[{lbl:"Outstanding",val:fr(totO),col:"#60a5fa"},{lbl:"Overdue",val:fr(totOD),col:"#ef4444"},{lbl:"Overdue %",val:totO>0?((totOD/totO)*100).toFixed(1)+"%":"0%",col:"#f59e0b"}].map(c=>(
            <div key={c.lbl} className="card" style={{borderLeft:`3px solid ${c.col}`}}><div style={{fontSize:10.5,color:"var(--mut)",marginBottom:4}}>{c.lbl}</div><div style={{fontSize:22,fontWeight:800,fontFamily:"'Sora',sans-serif",color:c.col}}>{c.val}</div></div>
          ))}
        </div>
        <div className="sr"><Search size={13} className="sr-ic"/><input className="inp" placeholder="Search..." value={q} onChange={e=>setQ(e.target.value)}/></div>
        {list.length===0?<div className="card empty"><p>Koi payment nahi</p></div>
          :<div className="card" style={{padding:0}}><div className="tw"><table>
            <thead><tr><th>Customer</th><th>Mode</th><th>Credit Days</th><th>Credit Limit</th><th>Outstanding</th><th>Overdue</th><th>Remarks</th></tr></thead>
            <tbody>{list.map(p=><tr key={p.id} style={{background:p.overdue>0?"rgba(239,68,68,.03)":undefined}}>
              <td><div style={{fontWeight:700,fontSize:12.5}}>{p.company}</div><div style={{fontSize:10.5,color:"var(--mut)"}}>{p.customer_name}</div></td>
              <td><span style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:"rgba(59,130,246,.1)",color:"#60a5fa",fontWeight:700,textTransform:"capitalize"}}>{p.payment_mode?.replace("_"," ")}</span></td>
              <td style={{textAlign:"center",fontSize:12}}>{p.credit_days||"—"} days</td>
              <td style={{fontSize:12}}>{fr(p.credit_limit)}</td>
              <td style={{fontSize:12.5,fontWeight:700}}>{fr(p.outstanding)}</td>
              <td><div style={{fontSize:13,fontWeight:800,color:p.overdue>0?"#ef4444":"#10b981"}}>{fr(p.overdue)}</div>{p.overdue>0&&<div style={{fontSize:9,color:"#ef4444"}}>{((p.overdue/p.outstanding)*100).toFixed(0)}%</div>}</td>
              <td style={{fontSize:10.5,color:"var(--mut)",maxWidth:140}}>{p.remarks||"—"}</td>
            </tr>)}</tbody>
          </table></div></div>}
      </div>
    );
  };

  /* ── REPORTS ── */
  const Reports = () => {
    const [rTab,setRTab]=useState("sales");
    const [rMonth,setRMonth]=useState(new Date().getMonth()+1);
    const [rYear,setRYear]=useState(new Date().getFullYear());
    const months=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const SALES_PERSONS=USERS.length>0?USERS.map(u=>u.name):[...new Set(C.map(c=>c.assigned_to).filter(Boolean))];
    const monthlyData=Array.from({length:12},(_,mi)=>{
      const ords=ORDERS.filter(o=>{const d=new Date(o.order_date);return d.getFullYear()===rYear&&d.getMonth()===mi;});
      return{month:months[mi],orders:ords.length,revenue:ords.reduce((s,o)=>s+(Number(o.total_amount)||0),0)};
    });
    // Month filter helper - matches selected month+year, or all if rMonth==0
    const inPeriod=(dateStr)=>{
      if(!dateStr) return false;
      const d=new Date(dateStr);
      if(rMonth===0) return d.getFullYear()===rYear; // whole year
      return d.getFullYear()===rYear && d.getMonth()===rMonth-1;
    };
    const periodOrders=ORDERS.filter(o=>inPeriod(o.order_date));
    const partyWise=C.map(c=>{
      const ords=periodOrders.filter(o=>o.customer_id===c.id||o.company===c.company);
      const rev=ords.reduce((s,o)=>s+(Number(o.total_amount)||0),0);
      return{...c,orderCount:ords.length,revenue:rev,lastOrder:ords[0]?.order_date};
    }).filter(c=>c.orderCount>0).sort((a,b)=>b.revenue-a.revenue);
    const topCust=partyWise.slice(0,10);
    const nbdTotal=C.filter(c=>c.type==="nbd").length;
    const nbdConverted=C.filter(c=>c.type==="crm").length;
    const nbdWithOrder=periodOrders.map(o=>o.company).filter((v,i,a)=>a.indexOf(v)===i).length;
    const spPerf=SALES_PERSONS.map(sp=>{
      const myCust=C.filter(c=>c.assigned_to===sp);
      const myOrd=periodOrders.filter(o=>o.created_by===sp);
      const myRev=myOrd.reduce((s,o)=>s+(Number(o.total_amount)||0),0);
      const myInter=I.filter(i=>i.done_by===sp).length;
      const tgt=TARGETS.find(t=>t.user_name===sp&&t.month===String(rMonth).padStart(2,"0")&&t.year===rYear);
      return{name:sp,customers:myCust.length,orders:myOrd.length,revenue:myRev,interactions:myInter,target:Number(tgt?.target_amount||0)};
    });
    const visitFreq=C.map(c=>{
      const visits=I.filter(i=>i.customer_id===c.id);
      const lastVisit=visits[0]?.created_at;
      const daysSince=lastVisit?Math.floor((new Date()-new Date(lastVisit))/(1000*60*60*24)):999;
      return{...c,visits:visits.length,lastVisit,daysSince};
    }).sort((a,b)=>b.daysSince-a.daysSince);

    return (
      <div>
        <div className="sh">
          <div><div className="sh-t">Reports & Analytics</div></div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <select className="inp" style={{width:"auto",padding:"5px 10px",fontSize:11}} value={rMonth} onChange={e=>setRMonth(Number(e.target.value))}>
              <option value={0}>Full Year</option>
              {months.map((m,i)=><option key={i} value={i+1}>{m}</option>)}
            </select>
            <select className="inp" style={{width:"auto",padding:"5px 10px",fontSize:11}} value={rYear} onChange={e=>setRYear(Number(e.target.value))}>
              {[2025,2026,2027].map(y=><option key={y} value={y}>{y}</option>)}
            </select>
            {!allOrdersLoaded&&<button className="btn btn-o btn-sm" onClick={loadAllOrders}>Load All Orders</button>}
          </div>
        </div>
        <div className="tabs" style={{flexWrap:"wrap"}}>
          {[["sales","📈 Sales"],["party","🏢 Party-wise"],["top","🏆 Top 10"],["nbd","🎯 NBD"],["sp","👤 Salesperson"],["visit","📍 Visit Freq"],["conversion","🔄 Conversion"],["detailed","📋 Detailed Rep"]].map(([id,lbl])=>(
            <div key={id} className={`tab ${rTab===id?"a":""}`} onClick={()=>setRTab(id)}>{lbl}</div>
          ))}
        </div>

        {rTab==="sales"&&(
          <div>
            <div className="g3" style={{marginBottom:18}}>
              {[
                {lbl:"Total Revenue "+rYear,val:fr(ORDERS.filter(o=>new Date(o.order_date).getFullYear()===rYear).reduce((s,o)=>s+(Number(o.total_amount)||0),0)),col:"#10b981"},
                {lbl:"Total Orders "+rYear,val:ORDERS.filter(o=>new Date(o.order_date).getFullYear()===rYear).length+" orders",col:"#60a5fa"},
                {lbl:"Delivered Orders",val:ORDERS.filter(o=>o.status==="delivered").length+" orders",col:"#a78bfa"},
              ].map(c=><div key={c.lbl} className="card" style={{borderLeft:`3px solid ${c.col}`}}><div style={{fontSize:10.5,color:"var(--mut)",marginBottom:4}}>{c.lbl}</div><div style={{fontSize:20,fontWeight:800,fontFamily:"'Sora',sans-serif",color:c.col}}>{c.val}</div></div>)}
            </div>
            <div className="card">
              <div style={{fontSize:11,fontWeight:800,color:"var(--mut)",textTransform:"uppercase",letterSpacing:".08em",marginBottom:14}}>Monthly Sales {rYear}</div>
              {monthlyData.map((m,i)=>{
                const maxRev=Math.max(...monthlyData.map(x=>x.revenue),1);
                const pct=(m.revenue/maxRev)*100;
                return (
                  <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                    <div style={{width:30,fontSize:10.5,color:"var(--mut)",fontWeight:700}}>{m.month}</div>
                    <div style={{flex:1,height:20,background:"var(--card2)",borderRadius:4,overflow:"hidden"}}>
                      <div style={{height:"100%",width:pct+"%",background:"linear-gradient(90deg,#10b981,#34d399)",borderRadius:4,minWidth:m.revenue>0?4:0}}/>
                    </div>
                    <div style={{width:80,fontSize:11,fontWeight:700,textAlign:"right",color:m.revenue>0?"#10b981":"var(--mut)"}}>{fr(m.revenue)}</div>
                    <div style={{width:50,fontSize:10,color:"var(--mut)",textAlign:"right"}}>{m.orders} ord</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {rTab==="party"&&(
          <div className="card" style={{padding:0}}><div className="tw"><table>
            <thead><tr><th>Party</th><th>Type</th><th>City</th><th>Assigned</th><th>Orders</th><th>Revenue</th><th>Last Order</th></tr></thead>
            <tbody>{partyWise.map(c=>(
              <tr key={c.id} onClick={()=>openC(c.id)} style={{cursor:"pointer"}}>
                <td><div style={{fontWeight:700,fontSize:12.5}}>{c.company}</div><div style={{fontSize:10.5,color:"var(--mut)"}}>{c.name}</div></td>
                <td><span style={{fontSize:9.5,fontWeight:800,padding:"2px 8px",borderRadius:12,background:c.type==="crm"?"rgba(16,185,129,.1)":c.type==="retail"?"rgba(168,85,247,.1)":c.type==="direct"?"rgba(249,115,22,.1)":"rgba(59,130,246,.1)",color:c.type==="crm"?"#10b981":c.type==="retail"?"#a855f7":c.type==="direct"?"#f97316":"#60a5fa"}}>{c.type?.toUpperCase()}</span></td>
                <td style={{fontSize:11,color:"var(--mut)"}}>{c.city||"—"}</td>
                <td style={{fontSize:11.5}}>{c.assigned_to||"—"}</td>
                <td style={{textAlign:"center",fontWeight:700}}>{c.orderCount}</td>
                <td style={{fontWeight:800,color:"#10b981",fontSize:13}}>{fr(c.revenue)}</td>
                <td style={{fontSize:11,color:"var(--mut)"}}>{fd(c.lastOrder)}</td>
              </tr>
            ))}</tbody>
          </table></div></div>
        )}

        {rTab==="top"&&(
          <div>
            {topCust.map((c,i)=>{
              const maxRev=topCust[0]?.revenue||1;
              const pct=(c.revenue/maxRev)*100;
              return (
                <div key={c.id} className="card" style={{marginBottom:8,padding:"12px 16px",cursor:"pointer"}} onClick={()=>openC(c.id)}>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <div style={{width:28,height:28,borderRadius:"50%",background:i<3?"#f59e0b":"var(--bdr)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:12,color:i<3?"#000":"var(--mut)",flexShrink:0}}>#{i+1}</div>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                        <div><div style={{fontWeight:700,fontSize:13}}>{c.company}</div><div style={{fontSize:10.5,color:"var(--mut)"}}>{c.city} · {c.orderCount} orders · {c.assigned_to}</div></div>
                        <div style={{fontWeight:800,fontSize:16,color:"#10b981",fontFamily:"'Sora',sans-serif"}}>{fr(c.revenue)}</div>
                      </div>
                      <div style={{height:6,background:"var(--card2)",borderRadius:3,overflow:"hidden"}}>
                        <div style={{height:"100%",width:pct+"%",background:"linear-gradient(90deg,#10b981,#34d399)",borderRadius:3}}/>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {rTab==="nbd"&&(
          <div>
            <div className="g3" style={{marginBottom:18}}>
              {[{lbl:"Total NBD Prospects",val:nbdTotal,col:"#60a5fa",ic:"🎯"},{lbl:"Converted to CRM",val:nbdConverted,col:"#10b981",ic:"✅"},{lbl:"Parties with Orders",val:nbdWithOrder,col:"#a78bfa",ic:"🧾"}].map(c=>(
                <div key={c.lbl} className="card" style={{borderLeft:`3px solid ${c.col}`,textAlign:"center"}}>
                  <div style={{fontSize:24,marginBottom:4}}>{c.ic}</div>
                  <div style={{fontSize:28,fontWeight:800,color:c.col,fontFamily:"'Sora',sans-serif"}}>{c.val}</div>
                  <div style={{fontSize:10.5,color:"var(--mut)"}}>{c.lbl}</div>
                </div>
              ))}
            </div>
            <div className="card">
              <div style={{fontSize:11,fontWeight:800,color:"var(--mut)",textTransform:"uppercase",letterSpacing:".08em",marginBottom:12}}>Conversion Funnel</div>
              {[
                {lbl:"Total Prospects Contacted",val:C.filter(c=>c.type==="nbd").length,col:"#60a5fa",tot:C.length},
                {lbl:"Had Interactions",val:[...new Set(I.map(i=>i.customer_id))].length,col:"#a78bfa",tot:C.length},
                {lbl:"Gave Enquiry",val:E.length,col:"#f59e0b",tot:C.length},
                {lbl:"Placed Order",val:nbdWithOrder,col:"#10b981",tot:C.length},
              ].map(s=>(
                <div key={s.lbl} style={{marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontSize:12}}>{s.lbl}</span>
                    <span style={{fontSize:12,fontWeight:700,color:s.col}}>{s.val}</span>
                  </div>
                  <div style={{height:8,background:"var(--card2)",borderRadius:4,overflow:"hidden"}}>
                    <div style={{height:"100%",width:Math.min((s.val/Math.max(s.tot,1))*100,100)+"%",background:s.col,borderRadius:4}}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {rTab==="sp"&&(
          <div className="card" style={{padding:0}}><div className="tw"><table>
            <thead><tr><th>Salesperson</th><th>Customers</th><th>Interactions</th><th>Orders</th><th>Revenue</th><th>Target</th><th>Achievement</th></tr></thead>
            <tbody>{spPerf.map(sp=>{
              const achNum=sp.target>0?(sp.revenue/sp.target)*100:0;
              return (
                <tr key={sp.name}>
                  <td><div style={{display:"flex",gap:8,alignItems:"center"}}><Av name={sp.name} size={28}/><div style={{fontWeight:700,fontSize:12.5}}>{sp.name}</div></div></td>
                  <td style={{textAlign:"center",fontWeight:700}}>{sp.customers}</td>
                  <td style={{textAlign:"center",fontWeight:700}}>{sp.interactions}</td>
                  <td style={{textAlign:"center",fontWeight:700}}>{sp.orders}</td>
                  <td style={{fontWeight:800,color:"#10b981"}}>{fr(sp.revenue)}</td>
                  <td style={{color:"var(--mut)"}}>{sp.target>0?fr(sp.target):"—"}</td>
                  <td>{sp.target>0?(<div><div style={{fontSize:12,fontWeight:800,color:achNum>=100?"#10b981":achNum>=70?"#f59e0b":"#ef4444"}}>{achNum.toFixed(1)}%</div><div style={{height:4,background:"var(--card2)",borderRadius:2,marginTop:3,width:80,overflow:"hidden"}}><div style={{height:"100%",width:Math.min(achNum,100)+"%",background:achNum>=100?"#10b981":achNum>=70?"#f59e0b":"#ef4444",borderRadius:2}}/></div></div>):<span style={{color:"var(--mut)",fontSize:11}}>No target</span>}</td>
                </tr>
              );
            })}</tbody>
          </table></div></div>
        )}

        {rTab==="visit"&&(
          <div className="card" style={{padding:0}}><div className="tw"><table>
            <thead><tr><th>Party</th><th>City</th><th>Assigned</th><th>Visits</th><th>Last Visit</th><th>Days Since</th><th>Alert</th></tr></thead>
            <tbody>{visitFreq.map(c=>(
              <tr key={c.id} onClick={()=>openC(c.id)} style={{cursor:"pointer"}}>
                <td><div style={{fontWeight:700,fontSize:12.5}}>{c.company}</div><div style={{fontSize:10.5,color:"var(--mut)"}}>{c.name}</div></td>
                <td style={{fontSize:11,color:"var(--mut)"}}>{c.city||"—"}</td>
                <td style={{fontSize:11.5}}>{c.assigned_to||"—"}</td>
                <td style={{textAlign:"center",fontWeight:700}}>{c.visits}</td>
                <td style={{fontSize:11}}>{fd(c.lastVisit)}</td>
                <td style={{fontSize:12,fontWeight:700,color:c.daysSince>30?"#ef4444":c.daysSince>14?"#f59e0b":"#10b981"}}>{c.daysSince<999?c.daysSince+" days":"Never"}</td>
                <td>{c.daysSince>30?<span style={{fontSize:9.5,background:"rgba(239,68,68,.1)",color:"#ef4444",padding:"2px 8px",borderRadius:12,fontWeight:700}}>🔴 Overdue</span>:c.daysSince>14?<span style={{fontSize:9.5,background:"rgba(245,158,11,.1)",color:"#f59e0b",padding:"2px 8px",borderRadius:12,fontWeight:700}}>🟡 Due Soon</span>:<span style={{fontSize:9.5,background:"rgba(16,185,129,.1)",color:"#10b981",padding:"2px 8px",borderRadius:12,fontWeight:700}}>✅ OK</span>}</td>
              </tr>
            ))}</tbody>
          </table></div></div>
        )}

        {/* ── CONVERSION FUNNEL ── */}
        {rTab==="conversion"&&(()=>{
          const totalC = C.length;
          const contacted = [...new Set(I.map(i=>i.customer_id))].length;
          const enquired = [...new Set(E.map(e=>e.customer_id))].length;
          const ordered = [...new Set(periodOrders.map(o=>o.customer_id))].length;
          const won = E.filter(e=>e.status==="won").length;
          const steps = [
            {lbl:"Total Parties", val:totalC, pct:100, c:"#3b82f6", desc:"Database mein sab parties"},
            {lbl:"Contacted", val:contacted, pct:Math.round(contacted/totalC*100), c:"#a78bfa", desc:"Jinse koi interaction hua"},
            {lbl:"Gave Enquiry", val:enquired, pct:Math.round(enquired/totalC*100), c:"#f59e0b", desc:"Product enquiry ki"},
            {lbl:"Placed Order", val:ordered, pct:Math.round(ordered/totalC*100), c:"#10b981", desc:"Actually order diya"},
            {lbl:"Won Deals", val:won, pct:totalC>0?Math.round(won/totalC*100):0, c:"#10b981", desc:"Pipeline mein won"},
          ];
          // Rep-wise conversion
          const repConv = SALES_PERSONS.map(sp=>{
            const myCust = C.filter(c=>c.assigned_to===sp);
            const myInter = [...new Set(I.filter(i=>i.done_by===sp).map(i=>i.customer_id))].length;
            const myEnq = E.filter(e=>e.assigned_to===sp).length;
            const myOrd = periodOrders.filter(o=>o.created_by===sp).length;
            const myOrdVal = periodOrders.filter(o=>o.created_by===sp).reduce((s,o)=>s+(Number(o.total_amount)||0),0);
            const convRate = myCust.length>0?Math.round(myOrd/myCust.length*100):0;
            return {name:sp, parties:myCust.length, contacted:myInter, enquiries:myEnq, orders:myOrd, revenue:myOrdVal, convRate};
          });
          return (
            <div>
              <div className="card" style={{marginBottom:14}}>
                <div style={{fontWeight:700,fontSize:13,marginBottom:14}}>🔄 Conversion Funnel — Lead to Order</div>
                {steps.map((s,i)=>(
                  <div key={i} style={{marginBottom:12}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                      <div>
                        <span style={{fontWeight:700,fontSize:12}}>{s.lbl}</span>
                        <span style={{fontSize:10,color:"var(--mut)",marginLeft:8}}>{s.desc}</span>
                      </div>
                      <div style={{display:"flex",gap:12,alignItems:"center"}}>
                        <span style={{fontWeight:800,fontSize:14,color:s.c}}>{s.val}</span>
                        <span style={{fontSize:11,color:s.c,fontWeight:700}}>{s.pct}%</span>
                      </div>
                    </div>
                    <div style={{height:12,background:"var(--card2)",borderRadius:6,overflow:"hidden"}}>
                      <div style={{height:"100%",width:s.pct+"%",background:s.c,borderRadius:6,transition:"width .5s"}}/>
                    </div>
                    {i<steps.length-1&&(
                      <div style={{fontSize:10,color:"var(--mut)",textAlign:"right",marginTop:2}}>
                        ↓ {steps[i+1].val} aage gaye ({steps[i].val>0?Math.round(steps[i+1].val/steps[i].val*100):0}% conversion)
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="card" style={{padding:0}}>
                <div style={{padding:"12px 16px",fontWeight:700,fontSize:13,borderBottom:"1px solid var(--bdr)"}}>
                  👤 Rep-wise Conversion Rate
                </div>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead>
                    <tr style={{background:"var(--card2)"}}>
                      {["Rep","Parties","Contacted","Enquiries","Orders","Revenue","Conv %"].map(h=>(
                        <th key={h} style={{padding:"8px 10px",fontSize:10,color:"var(--mut)",textAlign:h==="Rep"?"left":"center"}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {repConv.map((r,i)=>(
                      <tr key={i} style={{borderBottom:"1px solid var(--bdr)"}}>
                        <td style={{padding:"10px",fontWeight:700}}>
                          <div style={{display:"flex",gap:8,alignItems:"center"}}><Av name={r.name} size={26}/>{r.name}</div>
                        </td>
                        <td style={{padding:"10px",textAlign:"center"}}>{r.parties}</td>
                        <td style={{padding:"10px",textAlign:"center",color:"#a78bfa",fontWeight:700}}>{r.contacted}</td>
                        <td style={{padding:"10px",textAlign:"center",color:"#f59e0b",fontWeight:700}}>{r.enquiries}</td>
                        <td style={{padding:"10px",textAlign:"center",color:"#10b981",fontWeight:700}}>{r.orders}</td>
                        <td style={{padding:"10px",textAlign:"center",fontWeight:700,color:"#10b981"}}>₹{Math.round(r.revenue/1000)}K</td>
                        <td style={{padding:"10px",textAlign:"center"}}>
                          <div style={{fontWeight:800,fontSize:13,
                            color:r.convRate>=10?"#10b981":r.convRate>=5?"#f59e0b":"#ef4444"}}>
                            {r.convRate}%
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* ── DETAILED REP REPORT ── */}
        {rTab==="detailed"&&(()=>{
          const [selRep, setSelRep] = React.useState(SALES_PERSONS[0]||"");
          const repCust = C.filter(c=>c.assigned_to===selRep);
          const repInter = I.filter(i=>i.done_by===selRep);
          const repOrders = ORDERS.filter(o=>o.created_by===selRep);
          const repEnq = E.filter(e=>e.assigned_to===selRep);
          const repRev = repOrders.reduce((s,o)=>s+(Number(o.total_amount)||0),0);
          const periodRep = repOrders.filter(o=>inPeriod(o.order_date));
          const periodRevRep = periodRep.reduce((s,o)=>s+(Number(o.total_amount)||0),0);
          const tgt = TARGETS.find(t=>t.user_name===selRep&&t.month===String(rMonth).padStart(2,"0")&&t.year===rYear);
          const tgtAmt = Number(tgt?.target_amount||0);
          const achPct = tgtAmt>0?Math.round(periodRevRep/tgtAmt*100):null;

          // Last 7 days activity
          const last7 = new Date(Date.now()-7*86400000).toISOString();
          const recentInter = repInter.filter(i=>i.created_at>last7);

          return (
            <div>
              {/* Rep selector */}
              <div style={{display:"flex",gap:8,marginBottom:14,alignItems:"center",flexWrap:"wrap"}}>
                {SALES_PERSONS.map(sp=>(
                  <button key={sp} onClick={()=>setSelRep(sp)}
                    className={"btn btn-sm "+(selRep===sp?"btn-p":"btn-o")}>
                    <Av name={sp} size={16}/> {sp}
                  </button>
                ))}
              </div>

              {/* Rep KPI cards */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
                {[
                  ["Parties Assigned", repCust.length, "Total parties", "#3b82f6"],
                  ["Total Interactions", repInter.length, recentInter.length+" this week", "#a78bfa"],
                  ["Total Orders", repOrders.length, "₹"+Math.round(repRev/1000)+"K total", "#10b981"],
                  ["Period Revenue", "₹"+Math.round(periodRevRep/1000)+"K", achPct!==null?achPct+"% of target":"No target", achPct>=100?"#10b981":achPct>=70?"#f59e0b":"#ef4444"],
                ].map(([lbl,val,sub,c])=>(
                  <div key={lbl} style={{background:c+"11",border:"1px solid "+c+"33",borderRadius:10,padding:12}}>
                    <div style={{fontSize:10,color:"var(--mut)",marginBottom:4}}>{lbl}</div>
                    <div style={{fontSize:18,fontWeight:800,color:c}}>{val}</div>
                    <div style={{fontSize:10,color:"var(--mut)"}}>{sub}</div>
                  </div>
                ))}
              </div>

              {/* Target progress */}
              {tgtAmt>0&&(
                <div className="card" style={{marginBottom:14}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                    <span style={{fontWeight:700}}>Target vs Achievement — {months[rMonth-1]} {rYear}</span>
                    <span style={{fontWeight:800,color:achPct>=100?"#10b981":achPct>=70?"#f59e0b":"#ef4444"}}>{achPct}%</span>
                  </div>
                  <div style={{height:16,background:"var(--card2)",borderRadius:8,overflow:"hidden"}}>
                    <div style={{height:"100%",width:Math.min(achPct,100)+"%",
                      background:achPct>=100?"#10b981":achPct>=70?"#f59e0b":"#ef4444",borderRadius:8}}/>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginTop:4}}>
                    <span style={{color:"var(--mut)"}}>Achieved: ₹{Math.round(periodRevRep/1000)}K</span>
                    <span style={{color:"var(--mut)"}}>Target: ₹{Math.round(tgtAmt/1000)}K</span>
                    <span style={{color:"#ef4444",fontWeight:700}}>Gap: ₹{Math.round(Math.max(0,tgtAmt-periodRevRep)/1000)}K</span>
                  </div>
                </div>
              )}

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                {/* Recent interactions */}
                <div className="card" style={{padding:0}}>
                  <div style={{padding:"10px 14px",fontWeight:700,fontSize:12,borderBottom:"1px solid var(--bdr)"}}>
                    📞 Recent Activity (Last 7 days) — {recentInter.length}
                  </div>
                  <div style={{maxHeight:280,overflowY:"auto"}}>
                    {recentInter.length===0?(
                      <div style={{padding:16,color:"var(--mut)",fontSize:12,textAlign:"center"}}>
                        Koi activity nahi last 7 days mein ⚠️
                      </div>
                    ):recentInter.slice(0,10).map((i,idx)=>(
                      <div key={idx} style={{padding:"8px 14px",borderBottom:"1px solid var(--bdr)",fontSize:11}}>
                        <div style={{display:"flex",justifyContent:"space-between"}}>
                          <span style={{fontWeight:600}}>{i.customer_name}</span>
                          <span style={{color:"var(--mut)",fontSize:10}}>{fd(i.created_at)}</span>
                        </div>
                        <div style={{color:"var(--mut)",fontSize:10,marginTop:2}}>{TI[i.type]} {i.type} · {i.note?.slice(0,50)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Orders this period */}
                <div className="card" style={{padding:0}}>
                  <div style={{padding:"10px 14px",fontWeight:700,fontSize:12,borderBottom:"1px solid var(--bdr)"}}>
                    🧾 Orders — {months[rMonth-1]} {rYear} ({periodRep.length})
                  </div>
                  <div style={{maxHeight:280,overflowY:"auto"}}>
                    {periodRep.length===0?(
                      <div style={{padding:16,color:"var(--mut)",fontSize:12,textAlign:"center"}}>
                        Is period mein koi order nahi
                      </div>
                    ):periodRep.map((o,idx)=>(
                      <div key={idx} style={{padding:"8px 14px",borderBottom:"1px solid var(--bdr)",fontSize:11,
                        display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div>
                          <div style={{fontWeight:600}}>{o.company}</div>
                          <div style={{color:"var(--mut)",fontSize:10}}>{fd(o.order_date)}</div>
                        </div>
                        <div style={{fontWeight:800,color:"#10b981"}}>₹{Math.round(Number(o.total_amount)/1000)}K</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Party list */}
              <div className="card" style={{marginTop:12,padding:0}}>
                <div style={{padding:"10px 14px",fontWeight:700,fontSize:12,borderBottom:"1px solid var(--bdr)"}}>
                  👥 {selRep} ki Parties ({repCust.length})
                </div>
                <div className="tw"><table>
                  <thead><tr>
                    <th>Party</th><th>Type</th><th>Last Visit</th><th>Orders</th><th>Revenue</th><th>Follow-up</th>
                  </tr></thead>
                  <tbody>
                    {repCust.slice(0,20).map(c=>{
                      const li=gli(c.id);
                      const cOrds=ORDERS.filter(o=>o.customer_id===c.id);
                      const cRev=cOrds.reduce((s,o)=>s+(Number(o.total_amount)||0),0);
                      return (
                        <tr key={c.id} onClick={()=>openC(c.id)} style={{cursor:"pointer",borderBottom:"1px solid var(--bdr)"}}>
                          <td style={{padding:"8px 10px",fontWeight:600,fontSize:12}}>{c.company||c.name}</td>
                          <td><span style={{fontSize:9,padding:"1px 6px",borderRadius:8,
                            background:c.type==="crm"?"rgba(16,185,129,.1)":"rgba(59,130,246,.1)",
                            color:c.type==="crm"?"#10b981":"#60a5fa",fontWeight:700}}>{c.type?.toUpperCase()}</span></td>
                          <td style={{padding:"8px",fontSize:10,color:"var(--mut)"}}>{fd(li?.created_at)||"—"}</td>
                          <td style={{padding:"8px",textAlign:"center",fontWeight:700}}>{cOrds.length}</td>
                          <td style={{padding:"8px",textAlign:"center",color:"#10b981",fontWeight:700}}>{cRev>0?"₹"+Math.round(cRev/1000)+"K":"—"}</td>
                          <td style={{padding:"8px"}}>{li?.next_follow_up?<span style={{fontSize:10,color:isOD(li.next_follow_up)?"#ef4444":"#10b981",fontWeight:700}}>{isOD(li.next_follow_up)?"🔴":"🟢"} {fd(li.next_follow_up)}</span>:"—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table></div>
                {repCust.length>20&&<div style={{padding:"8px 14px",fontSize:11,color:"var(--mut)"}}>
                  ... aur {repCust.length-20} parties hain
                </div>}
              </div>
            </div>
          );
        })()}
      </div>
    );
  };

  /* ── TARGETS ── */
  const Targets = () => {
    const [tForm,setTForm]=useState({});
    const [tSaving,setTSaving]=useState(false);
    const months=[{v:"01",l:"January"},{v:"02",l:"February"},{v:"03",l:"March"},{v:"04",l:"April"},{v:"05",l:"May"},{v:"06",l:"June"},{v:"07",l:"July"},{v:"08",l:"August"},{v:"09",l:"September"},{v:"10",l:"October"},{v:"11",l:"November"},{v:"12",l:"December"}];
    const SALES_PERSONS=USERS.length>0?USERS.map(u=>u.name):[...new Set(C.map(c=>c.assigned_to).filter(Boolean))];
    const curMonth=String(new Date().getMonth()+1).padStart(2,"0");
    const curYear=new Date().getFullYear();
    const getAch=(name,month,year)=>ORDERS.filter(o=>o.created_by===name&&new Date(o.order_date).getMonth()===Number(month)-1&&new Date(o.order_date).getFullYear()===year).reduce((s,o)=>s+(Number(o.total_amount)||0),0);
    const getAchCases=(name,month,year)=>ORDERS.filter(o=>o.created_by===name&&new Date(o.order_date).getMonth()===Number(month)-1&&new Date(o.order_date).getFullYear()===year).reduce((s,o)=>s+(Number(o.total_cases)||0),0);
    const saveTarget=async()=>{
      if(!tForm.user_name||!tForm.month||!tForm.year) return toast$("Salesperson, Month, Year bharo",true);
      if(!tForm.target_amount&&!tForm.target_cases) return toast$("Amount ya Cases target bharo",true);
      setTSaving(true);
      try {
        const ex=TARGETS.find(t=>t.user_name===tForm.user_name&&t.month===tForm.month&&t.year===Number(tForm.year));
        const payload={target_amount:Number(tForm.target_amount||0),target_cases:Number(tForm.target_cases||0)};
        if(ex){
          await sbPatch("crm_targets",ex.id,payload);
          setTARGETS(p=>p.map(x=>x.id===ex.id?{...x,...payload}:x));
        } else {
          const r=await sbInsert("crm_targets",{user_name:tForm.user_name,month:tForm.month,year:Number(tForm.year),...payload});
          setTARGETS(p=>[r[0],...p]);
        }
        toast$("Target set ✓"); setTForm({});
      } catch(e){toast$("Error: "+e.message,true);}
      setTSaving(false);
    };
    return (
      <div>
        <div className="sh"><div><div className="sh-t">Target vs Achievement</div></div></div>
        <div className="card" style={{marginBottom:18}}>
          <div style={{fontSize:11,fontWeight:800,color:"var(--mut)",textTransform:"uppercase",letterSpacing:".08em",marginBottom:14}}>🎯 New Target Set Karo</div>
          <div style={{display:"grid",gridTemplateColumns:"1.3fr 1fr .8fr 1fr 1fr auto",gap:10}}>
            <div><label className="lbl">Salesperson</label><select className="inp" value={tForm.user_name||""} onChange={e=>setTForm(p=>({...p,user_name:e.target.value}))}><option value="">-- Select --</option>{SALES_PERSONS.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
            <div><label className="lbl">Month</label><select className="inp" value={tForm.month||""} onChange={e=>setTForm(p=>({...p,month:e.target.value}))}><option value="">-- Month --</option>{months.map(m=><option key={m.v} value={m.v}>{m.l}</option>)}</select></div>
            <div><label className="lbl">Year</label><select className="inp" value={tForm.year||curYear} onChange={e=>setTForm(p=>({...p,year:e.target.value}))}>{[2025,2026,2027].map(y=><option key={y} value={y}>{y}</option>)}</select></div>
            <div><label className="lbl">Target (₹)</label><input type="number" className="inp" placeholder="500000" value={tForm.target_amount||""} onChange={e=>setTForm(p=>({...p,target_amount:e.target.value}))}/></div>
            <div><label className="lbl">Target Cases</label><input type="number" className="inp" placeholder="100" value={tForm.target_cases||""} onChange={e=>setTForm(p=>({...p,target_cases:e.target.value}))}/></div>
            <div style={{display:"flex",alignItems:"flex-end"}}><button className="btn btn-p" disabled={tSaving} onClick={saveTarget}>{tSaving?<Spin/>:"Set"}</button></div>
          </div>
        </div>
        <div style={{marginBottom:18}}>
          <div style={{fontSize:11,fontWeight:800,color:"var(--mut)",textTransform:"uppercase",letterSpacing:".08em",marginBottom:12}}>This Month — {months.find(m=>m.v===curMonth)?.l} {curYear}</div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {SALES_PERSONS.map(sp=>{
              const tgt=TARGETS.find(t=>t.user_name===sp&&t.month===curMonth&&t.year===curYear);
              const ach=getAch(sp,curMonth,curYear);
              const achCases=getAchCases(sp,curMonth,curYear);
              const tgtAmt=Number(tgt?.target_amount||0);
              const tgtCases=Number(tgt?.target_cases||0);
              const pct=tgtAmt>0?Math.min((ach/tgtAmt)*100,100):0;
              const pctCases=tgtCases>0?Math.min((achCases/tgtCases)*100,100):0;
              const gap=tgtAmt-ach;
              const gapCases=tgtCases-achCases;
              return (
                <div key={sp} className="card" style={{padding:"14px 18px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <div style={{display:"flex",gap:10,alignItems:"center"}}><Av name={sp} size={36}/><div><div style={{fontWeight:700,fontSize:13.5}}>{sp}</div><div style={{fontSize:10.5,color:"var(--mut)"}}>Target: {tgtAmt>0?fr(tgtAmt):"—"}{tgtCases>0?` · ${tgtCases} cases`:""}</div></div></div>
                    <div style={{textAlign:"right"}}><div style={{fontSize:20,fontWeight:800,color:"#10b981",fontFamily:"'Sora',sans-serif"}}>{fr(ach)}</div><div style={{fontSize:10.5,color:"var(--mut)"}}>{achCases>0?`${achCases} cases`:"Achieved"}</div></div>
                  </div>
                  {tgtAmt>0&&<div style={{marginBottom:tgtCases>0?10:0}}><div style={{fontSize:10,color:"var(--mut)",marginBottom:3}}>💰 Revenue Target</div><div style={{height:10,background:"var(--card2)",borderRadius:5,overflow:"hidden",marginBottom:4}}><div style={{height:"100%",width:pct+"%",background:pct>=100?"#10b981":pct>=70?"#f59e0b":"#ef4444",borderRadius:5}}/></div><div style={{display:"flex",justifyContent:"space-between",fontSize:11}}><span style={{color:"var(--mut)"}}>{pct.toFixed(1)}%</span><span style={{color:gap>0?"#ef4444":"#10b981",fontWeight:700}}>{gap>0?`₹${Number(gap).toLocaleString("en-IN")} remaining`:"🎉 Achieved!"}</span></div></div>}
                  {tgtCases>0&&<div><div style={{fontSize:10,color:"var(--mut)",marginBottom:3}}>📦 Cases Target</div><div style={{height:10,background:"var(--card2)",borderRadius:5,overflow:"hidden",marginBottom:4}}><div style={{height:"100%",width:pctCases+"%",background:pctCases>=100?"#10b981":pctCases>=70?"#f59e0b":"#ef4444",borderRadius:5}}/></div><div style={{display:"flex",justifyContent:"space-between",fontSize:11}}><span style={{color:"var(--mut)"}}>{pctCases.toFixed(1)}%</span><span style={{color:gapCases>0?"#ef4444":"#10b981",fontWeight:700}}>{gapCases>0?`${gapCases} cases remaining`:"🎉 Achieved!"}</span></div></div>}
                  {tgtAmt===0&&tgtCases===0&&<div style={{fontSize:11,color:"var(--mut)",textAlign:"center",padding:"8px"}}>No target set for this month</div>}
                </div>
              );
            })}
          </div>
        </div>
        {TARGETS.length>0&&<div className="card" style={{padding:0}}>
          <div style={{padding:"12px 16px",borderBottom:"1px solid var(--bdr)",fontSize:11,fontWeight:800,color:"var(--mut)",textTransform:"uppercase",letterSpacing:".08em"}}>All Targets</div>
          <div className="tw"><table>
            <thead><tr><th>Salesperson</th><th>Month</th><th>Year</th><th>Target</th><th>Achieved</th><th>%</th></tr></thead>
            <tbody>{TARGETS.map(t=>{
              const ach=getAch(t.user_name,t.month,t.year);
              const pct=t.target_amount>0?(ach/t.target_amount*100).toFixed(1):0;
              return <tr key={t.id}><td style={{fontWeight:700}}>{t.user_name}</td><td>{months.find(m=>m.v===t.month)?.l||t.month}</td><td>{t.year}</td><td style={{fontWeight:700}}>{fr(t.target_amount)}</td><td style={{color:"#10b981",fontWeight:700}}>{fr(ach)}</td><td><span style={{fontWeight:800,color:pct>=100?"#10b981":pct>=70?"#f59e0b":"#ef4444"}}>{pct}%</span></td></tr>;
            })}</tbody>
          </table></div>
        </div>}
      </div>
    );
  };

  /* ── CUSTOMER DETAIL ── */
  const Detail = () => {
    const c=gc(selId); if(!c) return null;
    const ilist=gci(c.id); const li=ilist[0]; const pay=gcp(c.id); const smpl=gcs(c.id);
    return (
      <div className="ov" onClick={closeM}>
        <div className="mod mod-lg" onClick={e=>e.stopPropagation()}>
          <div style={{display:"flex",gap:14,alignItems:"center",marginBottom:18,paddingBottom:14,borderBottom:"1px solid var(--bdr)"}}>
            <Av name={c.name} size={50}/>
            <div style={{flex:1}}>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <div>
                  <div style={{fontFamily:"'Sora',sans-serif",fontSize:19,fontWeight:700}}>{c.name}</div>
                  <div style={{fontSize:12,color:"var(--mut)",marginTop:2}}>{c.company} · {c.city}</div>
                  <div style={{display:"flex",gap:6,marginTop:7,flexWrap:"wrap"}}>
                    <Bdg s={c.status}/>
                    <span style={{fontSize:9.5,fontWeight:800,padding:"2px 8px",borderRadius:12,background:c.type==="crm"?"rgba(16,185,129,.1)":c.type==="retail"?"rgba(168,85,247,.1)":c.type==="direct"?"rgba(249,115,22,.1)":"rgba(59,130,246,.1)",color:c.type==="crm"?"#10b981":c.type==="retail"?"#a855f7":c.type==="direct"?"#f97316":"#60a5fa"}}>{c.type?.toUpperCase()}</span>
                    {c.segment&&<span style={{fontSize:9.5,padding:"2px 8px",borderRadius:12,background:"var(--card2)",color:"var(--mut)",border:"1px solid var(--bdr)"}}>{c.segment}</span>}
                    {c.assigned_to&&<span style={{fontSize:9.5,padding:"2px 8px",borderRadius:12,background:"var(--card2)",color:"var(--mut)",border:"1px solid var(--bdr)"}}>👤 {c.assigned_to}</span>}
                    {c.sales_rep&&<span style={{fontSize:9.5,padding:"2px 8px",borderRadius:12,background:"rgba(16,185,129,.1)",color:"#10b981",fontWeight:700}}>🎯 Rep: {c.sales_rep}</span>}
                    {Number(c.discount_per_ctn)>0&&<span style={{fontSize:9.5,padding:"2px 8px",borderRadius:12,background:"rgba(245,158,11,.1)",color:"#f59e0b",fontWeight:800}}>🏷️ ₹{c.discount_per_ctn}/ctn discount</span>}
                  </div>
                </div>
                <div style={{display:"flex",gap:6}}>
                  <button className="btn btn-o btn-sm" onClick={()=>{setForm({...c});setModal("editcust");}}>✏️ Edit</button>
                  <button className="btn btn-o btn-sm" onClick={closeM}><X size={13}/></button>
                </div>
              </div>
            </div>
          </div>
          <div className="g3" style={{marginBottom:10}}>
            {[{l:"📞 Phone",v:c.phone||"—"},{l:"📧 Email",v:c.email||"—"},{l:"📅 Since",v:fd(c.created_at)}].map(x=>(
              <div key={x.l} className="card2"><div style={{fontSize:9.5,color:"var(--mut)",marginBottom:3}}>{x.l}</div><div style={{fontSize:12.5,fontWeight:500}}>{x.v}</div></div>
            ))}
          </div>
          {(c.gst_no||c.address)&&<div className="g2" style={{marginBottom:14}}>
            {c.gst_no&&<div className="card2"><div style={{fontSize:9.5,color:"var(--mut)",marginBottom:3}}>🏷️ GST No</div><div style={{fontSize:12.5,fontWeight:600,letterSpacing:".05em"}}>{c.gst_no}</div></div>}
            {c.address&&<div className="card2"><div style={{fontSize:9.5,color:"var(--mut)",marginBottom:3}}>📍 Address</div><div style={{fontSize:12,fontWeight:500}}>{c.address}</div></div>}
          </div>}
          {li&&<div className="lw"><div className="lw-lbl">💬 Last Word · {TI[li.type]} {li.type} · {fd(li.created_at)} · {li.done_by}</div><div className="lw-note">"{li.note}"</div>{li.next_follow_up&&<div style={{marginTop:8,fontSize:11,color:isOD(li.next_follow_up)?"#ef4444":isTD(li.next_follow_up)?"#f59e0b":"#10b981",fontWeight:700}}>📌 {li.follow_up_note} · {fd(li.next_follow_up)}</div>}</div>}
          {pay&&<div className="card2" style={{marginBottom:14}}>
            <div style={{fontSize:10,fontWeight:800,color:"var(--mut)",textTransform:"uppercase",letterSpacing:".08em",marginBottom:10}}>💳 Payment</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
              {[{l:"Mode",v:pay.payment_mode?.replace("_"," ")},{l:"Credit Days",v:`${pay.credit_days||"—"} days`},{l:"Outstanding",v:fr(pay.outstanding)},{l:"Overdue",v:fr(pay.overdue),col:pay.overdue>0?"#ef4444":undefined}].map(p=>(
                <div key={p.l} style={{textAlign:"center"}}><div style={{fontSize:9.5,color:"var(--mut)"}}>{p.l}</div><div style={{fontSize:13,fontWeight:700,color:p.col||"var(--txt)",marginTop:2,textTransform:"capitalize"}}>{p.v}</div></div>
              ))}
            </div>
          </div>}
          {smpl.length>0&&<div style={{marginBottom:14}}>
            <div style={{fontSize:10,fontWeight:800,color:"var(--mut)",textTransform:"uppercase",letterSpacing:".08em",marginBottom:8}}>🧪 Samples</div>
            {smpl.map(s=><div key={s.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:"var(--card2)",borderRadius:8,marginBottom:6,border:"1px solid var(--bdr)"}}><div><div style={{fontSize:12,fontWeight:600}}>{s.product}</div><div style={{fontSize:10,color:"var(--mut)"}}>{s.qty} · {fd(s.sent_date)}</div></div><Bdg s={s.status}/></div>)}
          </div>}
          {(()=>{
            const custOrders=ORDERS.filter(o=>o.customer_id===c.id||o.company===c.company).sort((a,b)=>new Date(b.order_date)-new Date(a.order_date));
            const totalBiz=custOrders.reduce((s,o)=>s+(Number(o.total_amount)||0),0);
            if(custOrders.length===0) return null;
            return (
              <div style={{marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div style={{fontSize:10,fontWeight:800,color:"var(--mut)",textTransform:"uppercase",letterSpacing:".08em"}}>🧾 Orders ({custOrders.length})</div>
                  <div style={{fontSize:12,fontWeight:800,color:"#10b981"}}>Total: {fr(totalBiz)}</div>
                </div>
                <div style={{maxHeight:160,overflowY:"auto"}}>
                  {custOrders.map(o=>(
                    <div key={o.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:"var(--card2)",borderRadius:8,marginBottom:6,border:"1px solid var(--bdr)",borderLeft:`3px solid ${o.status==="delivered"?"#10b981":o.status==="dispatched"?"#f59e0b":o.status==="confirmed"?"#a78bfa":o.status==="cancelled"?"#ef4444":"#60a5fa"}`,cursor:"pointer"}} onClick={()=>openOrder(o)}>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",gap:6,alignItems:"center"}}>
                          <span style={{fontSize:12,fontWeight:700,color:"#10b981"}}>{fr(o.total_amount)}</span>
                          <Bdg s={o.status}/>
                        </div>
                        <div style={{fontSize:10,color:"var(--mut)",marginTop:2}}>{fd(o.order_date)} · {o.payment_mode?.replace("_"," ")}{o.items_summary?` · ${o.items_summary}`:""}</div>
                      </div>
                      <Printer size={12} style={{color:"var(--mut)"}}/>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontSize:10,fontWeight:800,color:"var(--mut)",textTransform:"uppercase",letterSpacing:".08em"}}>📁 Interactions ({ilist.length})</div>
              <button className="btn btn-o btn-sm" onClick={()=>{setForm({customer_id:c.id});setModal("ainter-d");}}>+ Add</button>
            </div>
            <div style={{maxHeight:200,overflowY:"auto",paddingRight:4}}>
              {ilist.length===0?<div className="empty"><p>Koi interaction nahi</p></div>
                :ilist.map((i,idx)=>(
                  <div key={i.id} className="tl-item">
                    <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
                      <div className="tl-dot" style={{background:`${TC[i.type]}18`}}>{TI[i.type]}</div>
                      {idx<ilist.length-1&&<div style={{width:1,flex:1,background:"var(--bdr)",margin:"3px 0"}}/>}
                    </div>
                    <div style={{flex:1,paddingBottom:10}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <span style={{fontSize:11,color:TC[i.type],fontWeight:700,textTransform:"capitalize"}}>{i.type}</span>
                        <div style={{display:"flex",gap:6,alignItems:"center"}}>
                          <span style={{fontSize:10,color:"var(--mut)"}}>{fd(i.created_at)} {i.created_at?new Date(i.created_at).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true,timeZone:"Asia/Kolkata"}):""} · {i.done_by}</span>
                          {isAdmin&&<>
                            <button onClick={()=>{setForm({...i,customer_id:selId});setModal("ainter");}} style={{padding:"1px 6px",borderRadius:4,fontSize:9,border:"1px solid var(--bdr)",background:"transparent",cursor:"pointer"}}>✏️</button>
                            <button onClick={async()=>{if(!window.confirm("Delete?"))return;await sbFetch("crm_interactions?id=eq."+i.id,{method:"DELETE"});setI(p=>p.filter(x=>x.id!==i.id));toast$("Deleted!");}} style={{padding:"1px 6px",borderRadius:4,fontSize:9,border:"1px solid #ef4444",background:"transparent",color:"#ef4444",cursor:"pointer"}}>🗑</button>
                          </>}
                        </div>
                      </div>
                      <div style={{fontSize:12,marginTop:3,lineHeight:1.5}}>{i.note}</div>
                      {i.next_follow_up&&<div style={{fontSize:10,marginTop:3,color:"var(--acc)"}}>📌 {i.follow_up_note} · {fd(i.next_follow_up)}</div>}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  /* ── CUSTOMER SEARCH ── */
  const CustomerSearch = ({value,onChange,allowNew=true}) => {
    const [sq,setSq]=useState("");
    const [open,setOpen]=useState(false);
    const sel=C.find(c=>c.id===value);
    const sqL=sq.toLowerCase();
    const filtered=C.filter(c=>!sq||[c.name,c.company,c.city,c.phone,c.email].some(v=>v&&String(v).toLowerCase().includes(sqL))).slice(0,50);
    return (
      <div style={{position:"relative"}}>
        <div className="inp" style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",padding:"7px 12px"}} onClick={()=>setOpen(o=>!o)}>
          <Search size={12} style={{color:"var(--mut)",flexShrink:0}}/>
          <span style={{flex:1,fontSize:12.5,color:sel?"var(--txt)":"var(--mut)"}}>{sel?`${sel.name} / ${sel.company}`:"-- Customer Search Karo --"}</span>
          <span style={{fontSize:10,color:"var(--mut)"}}>▾</span>
        </div>
        {open&&(
          <div style={{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,background:"var(--card)",border:"1px solid var(--bdr)",borderRadius:10,zIndex:200,boxShadow:"0 8px 32px rgba(0,0,0,.4)"}}>
            <div style={{padding:"8px 10px",borderBottom:"1px solid var(--bdr)"}}>
              <input autoFocus className="inp" style={{padding:"6px 10px",fontSize:12}} placeholder="Type karo..." value={sq} onChange={e=>setSq(e.target.value)}/>
            </div>
            <div style={{maxHeight:220,overflowY:"auto"}}>
              {allowNew&&<div style={{padding:"9px 12px",borderBottom:"1px solid var(--bdr)",cursor:"pointer",color:"var(--acc)",fontWeight:600,fontSize:12}} onClick={()=>{setOpen(false);setModal("acust_quick");}}>➕ New Customer Add Karo</div>}
              {filtered.length===0?<div style={{padding:"12px",color:"var(--mut)",fontSize:12,textAlign:"center"}}>Koi customer nahi mila</div>
                :filtered.map(c=>(
                  <div key={c.id} style={{padding:"9px 12px",borderBottom:"1px solid rgba(28,45,71,.3)",cursor:"pointer",fontSize:12}} onClick={()=>{onChange(c.id);setOpen(false);setSq("");}}>
                    <div style={{fontWeight:600}}>{c.name}</div>
                    <div style={{fontSize:10,color:"var(--mut)"}}>{c.company} · {c.city}</div>
                  </div>
                ))}
            </div>
          </div>
        )}
        {open&&<div style={{position:"fixed",inset:0,zIndex:199}} onClick={()=>setOpen(false)}/>}
      </div>
    );
  };

  /* ── NUM INPUT ── */
  const NumInput = ({value,onChange,style}) => {
    const [local,setLocal]=useState(String(value??""));
    const [focused,setFocused]=useState(false);
    // Only sync from parent when NOT focused (prevents cursor jump while typing)
    useEffect(()=>{ if(!focused) setLocal(String(value??"")); },[value,focused]);
    return <input type="text" inputMode="numeric" className="inp" style={style}
      value={local}
      onClick={e=>e.target.select()}
      onFocus={()=>setFocused(true)}
      onChange={e=>setLocal(e.target.value)}
      onBlur={()=>{
        setFocused(false);
        const n=parseFloat(local.replace(/[^0-9.]/g,""));
        onChange(isNaN(n)?0:n);
      }}/>;
  };

  const ProductStockRow = ({p, stock, onAdd}) => {
    const stk = stock.find(s=>s.product_id===p.id||s.sku_code===p.sku_code||s.product_name===p.name);
    const packed = stk?.packed_qty||0;
    const unpacked = stk?.unpacked_qty||0;
    return (
      <div style={{padding:"8px 10px",borderBottom:"1px solid var(--bdr)",fontSize:11.5}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:stk?4:0}}>
          <div><div style={{fontWeight:600}}>{p.name}</div><div style={{fontSize:10,color:"var(--mut)"}}>{p.sku_code} · ₹{p.ctn_price}/ctn</div></div>
          <button className="btn btn-g btn-sm" onClick={()=>onAdd(p)}>+ Add</button>
        </div>
        {stk&&(
          <div style={{display:"flex",gap:8}}>
            <span style={{fontSize:10,padding:"2px 8px",borderRadius:6,background:packed>0?"rgba(16,185,129,.1)":"rgba(239,68,68,.1)",color:packed>0?"#10b981":"#ef4444",fontWeight:700}}>📦 Packed: {packed.toLocaleString()} pcs</span>
            <span style={{fontSize:10,padding:"2px 8px",borderRadius:6,background:"rgba(245,158,11,.1)",color:"#f59e0b",fontWeight:700}}>🔧 Unpacked: {unpacked.toLocaleString()} pcs</span>
          </div>
        )}
      </div>
    );
  };

  /* ── ORDER MODAL ── */
  const OrderModal = () => {
    const [prodQ,setProdQ]=useState("");
    const filtProd=PRODS.filter(p=>!prodQ||[p.name,p.sku_code,p.category].some(v=>v?.toLowerCase().includes(prodQ.toLowerCase())));
    return (
      <div className="ov" onClick={closeM}>
        <div className="mod" style={{width:860,maxWidth:"96vw"}} onClick={e=>e.stopPropagation()}>
          <div className="mod-ttl">New Order / Proforma <button className="btn btn-o btn-sm" onClick={closeM}><X size={13}/></button></div>
          <div className="fr fr2" style={{marginBottom:16}}>
            <div><label className="lbl">Customer *</label><CustomerSearch value={form.customer_id||""} onChange={v=>sf("customer_id",v)}/></div>
            <div><label className="lbl">Order Date</label><input type="date" className="inp" value={form.order_date||""} onChange={e=>sf("order_date",e.target.value)}/></div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.2)",borderRadius:8,marginBottom:12}}>
            <span style={{fontSize:12,color:"var(--acc)",fontWeight:700}}>🏷️ Party Discount</span>
            <input type="number" defaultValue={partyDiscount}
              onBlur={e=>setPartyDiscount(Number(e.target.value)||0)}
              onKeyDown={e=>{ if(e.key==="Enter") { setPartyDiscount(Number(e.target.value)||0); e.target.blur(); }}}
              style={{width:70,padding:"4px 8px",borderRadius:6,border:"1px solid var(--bdr)",textAlign:"center",fontWeight:700}}/>
            <span style={{fontSize:11,color:"var(--mut)"}}>₹/carton (auto-apply on add)</span>
          </div>
          <div className="g2" style={{gap:14}}>
            <div>
              <label className="lbl">Products Add Karo</label>
              <input className="inp" placeholder="SKU ya product search..." value={prodQ} onChange={e=>setProdQ(e.target.value)} style={{marginBottom:8}}/>
              <div style={{maxHeight:260,overflowY:"auto",border:"1px solid var(--bdr)",borderRadius:8}}>
                {filtProd.map(p=>(
                  <ProductStockRow key={p.id} p={p} stock={STOCK} onAdd={addOrderItem}/>
                ))}
              </div>
            </div>
            <div>
              <label className="lbl">Order Items ({orderItems.length})</label>
              {orderItems.length===0?<div className="empty" style={{padding:20,border:"1px solid var(--bdr)",borderRadius:8}}><p>Koi item nahi</p></div>
                :<div style={{border:"1px solid var(--bdr)",borderRadius:8,overflow:"hidden"}}>
                  {orderItems.map(item=>(
                    <div key={item.product_id} style={{padding:"8px 10px",borderBottom:"1px solid var(--bdr)"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}><span style={{fontWeight:600,fontSize:12}}>{item.product_name}</span><NBadge pname={item.product_name} price={item.ctn_price}/></div>
                        <button style={{background:"none",border:"none",color:"var(--err)",cursor:"pointer"}} onClick={()=>removeOrderItem(item.product_id)}><Trash2 size={12}/></button>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6}}>
                        <div><div style={{fontSize:9,color:"var(--mut)",marginBottom:2}}>CASES</div><NumInput style={{padding:"4px 8px",fontSize:12}} value={item.qty_cases} onChange={v=>updOrderItem(item.product_id,"qty_cases",v)}/></div>
                        <div><div style={{fontSize:9,color:"var(--mut)",marginBottom:2}}>CTN PRICE (₹)</div><NumInput style={{padding:"4px 8px",fontSize:12}} value={item.ctn_price} onChange={v=>updOrderItem(item.product_id,"ctn_price",v)}/></div>
                        <div><div style={{fontSize:9,color:"var(--mut)",marginBottom:2}}>DISCOUNT (₹)</div><NumInput style={{padding:"4px 8px",fontSize:12}} value={item.discount||0} onChange={v=>updOrderItem(item.product_id,"discount",v)}/></div>
                        <div><div style={{fontSize:9,color:"var(--mut)",marginBottom:2}}>AMOUNT</div><div style={{fontSize:13,fontWeight:800,color:"#10b981",paddingTop:6}}>₹{Number(item.amount||0).toLocaleString("en-IN")}</div></div>
                      </div>
                    </div>
                  ))}
                  <div style={{padding:"10px 12px",background:"var(--card2)"}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}>
                      <span style={{color:"var(--mut)"}}>Total Cases</span>
                      <span style={{fontWeight:700,color:"var(--acc)"}}>{orderItems.reduce((s,i)=>s+(Number(i.qty_cases)||0),0)} cases · {orderItems.length} SKU</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}><span style={{color:"var(--mut)"}}>Subtotal</span><span style={{fontWeight:600}}>₹{orderTotal.toLocaleString("en-IN")}</span></div>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:12,marginBottom:6,gap:12}}>
                      <label style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer",color:"var(--mut)"}}>
                        <input type="checkbox" checked={!!form.epr} onChange={e=>sf("epr",e.target.checked)} style={{accentColor:"var(--acc)",width:14,height:14}}/>EPR @1%
                      </label>
                      <span style={{fontWeight:600,color:form.epr?"var(--txt)":"var(--mut)"}}>₹{eprAmount.toLocaleString("en-IN")}</span>
                    </div>
                    {/* Freight & Forwarding */}
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:12,marginBottom:4,gap:8}}>
                      <span style={{color:"var(--mut)",flexShrink:0}}>Freight & Forwarding</span>
                      <input type="number" placeholder="0" value={form.freight||""} onChange={e=>sf("freight",e.target.value)}
                        style={{width:90,padding:"3px 8px",borderRadius:6,border:"1px solid var(--bdr)",fontSize:12,textAlign:"right"}}/>
                    </div>
                    {freightAmt>0&&<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:12,marginBottom:6,gap:8}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{color:"var(--mut)"}}>Freight GST @18%:</span>
                        <label style={{display:"flex",alignItems:"center",gap:4,cursor:"pointer"}}>
                          <input type="radio" name="freight_gst_type" value="excluding" checked={form.freight_gst_type!=="including"} onChange={()=>sf("freight_gst_type","excluding")} style={{accentColor:"var(--acc)",width:14,height:14}}/>
                          <span style={{fontSize:11}}>Excluding</span>
                        </label>
                        <label style={{display:"flex",alignItems:"center",gap:4,cursor:"pointer"}}>
                          <input type="radio" name="freight_gst_type" value="including" checked={form.freight_gst_type==="including"} onChange={()=>sf("freight_gst_type","including")} style={{accentColor:"var(--acc)",width:14,height:14}}/>
                          <span style={{fontSize:11}}>Including</span>
                        </label>
                      </div>
                      <span style={{fontWeight:600,color:form.freight_gst_type!=="including"?"var(--txt)":"var(--mut)"}}>
                        {form.freight_gst_type==="including"?"(included)":"₹"+freightGst.toLocaleString("en-IN")}
                      </span>
                    </div>}
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:12,marginBottom:6}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{color:"var(--mut)"}}>GST @18%:</span>
                        <label style={{display:"flex",alignItems:"center",gap:4,cursor:"pointer"}}><input type="radio" name="gst" value="excluding" checked={form.gst!=="including"} onChange={()=>sf("gst","excluding")} style={{accentColor:"var(--acc)",width:14,height:14}}/><span style={{fontSize:11}}>Excluding</span></label>
                        <label style={{display:"flex",alignItems:"center",gap:4,cursor:"pointer"}}><input type="radio" name="gst" value="including" checked={form.gst==="including"} onChange={()=>sf("gst","including")} style={{accentColor:"var(--acc)",width:14,height:14}}/><span style={{fontSize:11}}>Including</span></label>
                      </div>
                      <span style={{fontWeight:600,color:form.gst!=="including"?"var(--txt)":"var(--mut)"}}>{form.gst==="including"?"(included)":"₹"+gstAmount.toLocaleString("en-IN")}</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:14,borderTop:"1px solid var(--bdr)",paddingTop:6}}><span style={{fontWeight:700}}>Total</span><span style={{fontWeight:800,color:"#10b981"}}>₹{grandTotal.toLocaleString("en-IN")}</span></div>
                  </div>
                </div>}
            </div>
          </div>
          <div className="fr fr2" style={{marginTop:12}}>
            <div><label className="lbl">Payment Mode</label>
              <select className="inp" value={form.payment_mode||"cash"} onChange={e=>sf("payment_mode",e.target.value)}>
                <option value="cash">💵 Cash</option><option value="credit">🏦 Credit</option><option value="bank_transfer">↗ Bank Transfer</option><option value="cheque">📝 Cheque</option>
              </select>
            </div>
            <div><label className="lbl">Notes</label><textarea className="inp" placeholder="Delivery notes..." defaultValue={form.notes||""} onBlur={e=>sf("notes",e.target.value)} style={{minHeight:38,resize:"none"}}/></div>
          </div>
          <button className="btn btn-p" style={{width:"100%",justifyContent:"center",marginTop:8,fontSize:13}} disabled={saving} onClick={saveOrder}>{saving?<Spin/>:"💾 Save & View Proforma"}</button>
        </div>
      </div>
    );
  };

  /* ── PROFORMA ── */
  const ProformaModal = () => {
    if(!selOrder) return null;
    const subtotal=selOrder.items?.reduce((s,i)=>s+(Number(i.amount)||0),0)||0;
    const epr=selOrder.epr_applied?Math.round(subtotal*0.01):0;
    const freight=Number(selOrder.freight)||0;
    const freightGstAmt=Number(selOrder.freight_gst)||0;
    const freightGstType=selOrder.freight_gst_type||"excluding";
    const gst=selOrder.gst_type==="including"?0:Math.round(subtotal*0.18);
    const grandTotalPro=subtotal+epr+freight+freightGstAmt+gst;
    return (
      <div className="ov">
        <div className="mod mod-lg" onClick={e=>e.stopPropagation()} style={{maxHeight:"92vh",overflowY:"auto"}}>
          <div className="mod-ttl">
            <span>📄 Proforma Invoice</span>
            <div style={{display:"flex",gap:8}}>
              <button className="btn btn-p btn-sm" onClick={()=>openPI(selOrder)}><Printer size={12}/> Print PI</button>
              <button className="btn btn-o btn-sm" onClick={()=>{const w=window.open("","_blank");if(w){const s=selOrder?.items?.reduce((s,i)=>s+(Number(i.amount)||0),0)||0;const e2=selOrder?.epr_applied?Math.round(s*0.01):0;const f2=Number(selOrder?.freight)||0;const fg2=Number(selOrder?.freight_gst)||0;const g2=selOrder?.gst_type==="including"?0:Math.round(s*0.18);w.document.write(getPIHtml(selOrder,s,e2,f2,fg2,g2,s+e2+f2+fg2+g2));w.document.close();}}}>🔗 New Tab</button>
              <button className="btn btn-o btn-sm" onClick={()=>generateWAMessage(selOrder)} style={{background:"#25D366",color:"#fff",border:"none"}}>💬 WA Message</button>
              <button className="btn btn-o btn-sm" onClick={closeM}><X size={13}/></button>
            </div>
          </div>
          <div style={{textAlign:"center",marginBottom:18,paddingBottom:14,borderBottom:"1px solid var(--bdr)"}}>
            <div style={{fontFamily:"'Sora',sans-serif",fontSize:18,fontWeight:700,color:"var(--acc)"}}>Shreeja Packaging Industries Pvt. Ltd.</div>
            <div style={{fontSize:11,color:"var(--mut)",marginTop:4}}>Mayur Food Packaging Products | Delhi</div>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}>
            <div className="card2" style={{flex:1,marginRight:12}}>
              <div style={{fontSize:9.5,color:"var(--mut)",marginBottom:4}}>BILL TO</div>
              <div style={{fontSize:14,fontWeight:700}}>{selOrder.company}</div>
              <div style={{fontSize:12,color:"var(--mut)"}}>{selOrder.customer_name}</div>
              {selOrder.customerData?.phone&&<div style={{fontSize:11,marginTop:3}}>📞 {selOrder.customerData.phone}</div>}
              {selOrder.customerData?.address&&<div style={{fontSize:11,marginTop:2}}>📍 {selOrder.customerData.address}</div>}
              {selOrder.customerData?.gst_no&&<div style={{fontSize:11,marginTop:2,fontWeight:700,color:"var(--acc)"}}>GST: {selOrder.customerData.gst_no}</div>}
            </div>
            <div className="card2" style={{minWidth:200}}>
              <div style={{fontSize:9.5,color:"var(--mut)",marginBottom:4}}>ORDER DATE</div>
              <div style={{fontSize:14,fontWeight:700,marginBottom:6}}>{fd(selOrder.order_date)}</div>
              <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                <Bdg s={selOrder.status}/>
                {selOrder.payment_mode&&<span style={{fontSize:9.5,fontWeight:700,padding:"2px 8px",borderRadius:12,background:"rgba(59,130,246,.1)",color:"#60a5fa",textTransform:"capitalize"}}>{selOrder.payment_mode?.replace("_"," ")}</span>}
              </div>
            </div>
          </div>
          <div className="tw" style={{marginBottom:14}}>
            <table>
              <thead><tr><th>#</th><th>SKU</th><th>Product</th><th>Packing</th><th>Cases</th><th>Price/Pcs</th><th>CTN Price</th><th>Disc(₹)</th><th>Amount</th></tr></thead>
              <tbody>{(selOrder.items||[]).map((item,idx)=>(
                <tr key={idx}>
                  <td style={{fontSize:11}}>{idx+1}</td>
                  <td><span style={{fontSize:9.5,background:"rgba(245,158,11,.1)",color:"var(--acc)",padding:"2px 6px",borderRadius:4,fontWeight:700}}>{item.sku_code}</span></td>
                  <td style={{fontWeight:600,fontSize:12}}>{item.product_name}</td>
                  <td style={{textAlign:"center",fontSize:11}}>{item.packing}</td>
                  <td style={{textAlign:"center",fontWeight:700}}>{item.qty_cases}</td>
                  <td style={{fontSize:11}}>₹{item.price_per_pcs}</td>
                  <td style={{fontSize:11}}>₹{item.ctn_price}</td>
                  <td style={{fontSize:11,textAlign:"center"}}>{item.discount||0}</td>
                  <td style={{fontWeight:800,color:"#10b981"}}>₹{Number(item.amount||0).toLocaleString("en-IN")}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div style={{display:"flex",justifyContent:"flex-end"}}>
            <div style={{width:240}}>
              <div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",fontSize:12,borderBottom:"1px solid var(--bdr)"}}><span style={{color:"var(--mut)"}}>Subtotal</span><span style={{fontWeight:600}}>₹{subtotal.toLocaleString("en-IN")}</span></div>
              {epr>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",fontSize:12,borderBottom:"1px solid var(--bdr)"}}><span style={{color:"var(--mut)"}}>EPR @1%</span><span style={{fontWeight:600}}>₹{epr.toLocaleString("en-IN")}</span></div>}
              <div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",fontSize:12,borderBottom:"1px solid var(--bdr)"}}><span style={{color:"var(--mut)"}}>GST @18% ({selOrder.gst_type==="including"?"Incl.":"Excl."})</span><span style={{fontWeight:600}}>{selOrder.gst_type==="including"?"Included":"₹"+gst.toLocaleString("en-IN")}</span></div>
              <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0",fontSize:15}}><span style={{fontWeight:700}}>Total</span><span style={{fontWeight:800,color:"#10b981",fontFamily:"'Sora',sans-serif"}}>₹{(subtotal+epr+gst).toLocaleString("en-IN")}</span></div>
              {selOrder.payment_mode&&<div style={{fontSize:11,color:"var(--mut)",marginTop:4}}>Payment: <span style={{color:"var(--txt)",fontWeight:600,textTransform:"capitalize"}}>{selOrder.payment_mode?.replace("_"," ")}</span></div>}
            </div>
          </div>
          {selOrder.notes&&<div style={{marginTop:10,padding:"8px 12px",background:"var(--card2)",borderRadius:8,fontSize:12}}><span style={{color:"var(--mut)"}}>Notes: </span>{selOrder.notes}</div>}
        </div>
      </div>
    );
  };

  /* ── ALL MODALS ── */
  const renderModal = () => {
    if(!modal) return null;
    if(modal==="detail") return <Detail/>;
    if(modal==="convert_customer") return (
      <div className="ov" onClick={()=>setModal("proforma")}>
        <div className="mod mod-sm" onClick={e=>e.stopPropagation()} style={{maxWidth:420}}>
          <div className="mod-ttl">🎉 Order Mila! Customer List Mein Add Karein?</div>
          <div style={{padding:"12px 0",fontSize:13,lineHeight:1.8}}>
            <div style={{fontWeight:700,fontSize:14,marginBottom:8}}>{convertCust?.company||convertCust?.name}</div>
            <div style={{color:"var(--mut)",marginBottom:16}}>Ye party abhi NBD mein hai. Order de diya — ab customer list mein add karein?</div>
            <div style={{marginBottom:12}}>
              <label className="lbl">Group/Type select karo</label>
              <select className="inp" id="convert_type" defaultValue="crm">
                <option value="crm">CRM — Regular Customer</option>
                <option value="retail">Retail — Retail Party</option>
                <option value="direct">Direct — Direct Party</option>
                <option value="enduser">End User</option>
              </select>
            </div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button className="btn btn-p" style={{flex:1,justifyContent:"center"}} onClick={async()=>{
              const newType = document.getElementById("convert_type")?.value||"crm";
              try {
                await sbPatch("crm_customers", convertCust.id, {type:newType, status:"active"});
                setC(p=>p.map(x=>x.id===convertCust.id?{...x,type:newType,status:"active"}:x));
                toast$("✅ Customer "+newType.toUpperCase()+" group mein add ho gaya!");
              } catch(e){ toast$("Error: "+e.message,true); }
              setConvertCust(null);
              setModal("proforma");
            }}>✅ Haan, Add Karo</button>
            <button className="btn btn-o" onClick={()=>{setConvertCust(null);setModal("proforma");}}>
              Baad Mein
            </button>
          </div>
        </div>
      </div>
    );
    if(modal==="aorder") return <OrderModal/>;
    if(modal==="proforma") return <ProformaModal/>;

    if(modal==="ainter-d") return (
      <div className="ov" onClick={()=>setModal("detail")}>
        <div className="mod mod-sm" onClick={e=>e.stopPropagation()}>
          <div className="mod-ttl">Add Interaction <button className="btn btn-o btn-sm" onClick={()=>setModal("detail")}><X size={13}/></button></div>
          <div className="fr"><label className="lbl">Type</label><select className="inp" value={form.type||"call"} onChange={e=>sf("type",e.target.value)}>{["call","visit","whatsapp","email","meeting"].map(t=><option key={t} value={t}>{TI[t]} {t}</option>)}</select></div>
          <div className="fr">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
              <label className="lbl" style={{margin:0}}>Note *</label>
              <button onClick={async()=>{
                if(!form.note?.trim()) return toast$("Note likho pehle",true);
                toast$("AI polish kar raha hai...");
                try {
                  const res = await fetch("/api/ai-polish",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:String(form.note||""),type:"note"})});
                  const d = await res.json();
                  if(d.polished){sf("note",d.polished);toast$("✨ Note polished!");}
                }catch(e){toast$("Error",true);}
              }} style={{padding:"2px 10px",borderRadius:6,fontSize:11,border:"1px solid var(--acc)",background:"rgba(139,92,246,.1)",color:"var(--acc)",cursor:"pointer",fontWeight:600}}>✨ AI Polish</button>
            </div>
            <textarea className="inp" value={form.note||""} onChange={e=>sf("note",e.target.value)} rows={3}/>
          </div>
          <div className="fr fr2">
            <div>
              <label className="lbl">Follow-up Date</label>
              <input type="date" className="inp" value={form.next_follow_up||""} onChange={e=>sf("next_follow_up",e.target.value)}/>
            </div>
            <div>
              <label className="lbl">Follow-up Time</label>
              <input type="time" className="inp" value={form.follow_up_time||"10:00"} onChange={e=>sf("follow_up_time",e.target.value)}/>
            </div>
            <div><label className="lbl">Done By</label>
              <select className="inp" value={form.done_by||currentUser?.name||""} onChange={e=>sf("done_by",e.target.value)}>
                <option value="">-- Select --</option>
                {USERS.map(u=><option key={u.name} value={u.name}>{u.name}</option>)}
              </select>
            </div>
          </div>
          <div className="fr fr2">
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <label className="lbl" style={{margin:0}}>Follow-up Note</label>
                <button onClick={async()=>{
                  if(!form.follow_up_note?.trim()) return;
                  try{const res=await fetch("/api/ai-polish",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:String(form.follow_up_note||""),type:"followup"})});const d=await res.json();if(d.polished){sf("follow_up_note",d.polished);toast$("✨");}}catch(e){}
                }} style={{padding:"1px 8px",borderRadius:5,fontSize:10,border:"1px solid var(--acc)",background:"rgba(139,92,246,.1)",color:"var(--acc)",cursor:"pointer"}}>✨</button>
              </div>
              <input className="inp" value={form.follow_up_note||""} onChange={e=>sf("follow_up_note",e.target.value)}/>
            </div>
            <div><label className="lbl">Assign Follow-up To</label>
              <select className="inp" value={form.assign_followup_to||myName||""} onChange={e=>sf("assign_followup_to",e.target.value)}>
                <option value="">-- Select --</option>
                {USERS.map(u=><option key={u.name} value={u.name}>{u.name}</option>)}
              </select>
            </div>
          </div>
          <button className="btn btn-p" style={{width:"100%",justifyContent:"center",marginTop:6}} disabled={saving} onClick={()=>saveInter(true)}>{saving?<Spin/>:"Save"}</button>
        </div>
      </div>
    );

    if(modal==="aprod") return (
      <div className="ov" onClick={closeM}>
        <div className="mod mod-sm" onClick={e=>e.stopPropagation()}>
          <div className="mod-ttl">{editProd?"Edit SKU":"Add SKU"} <button className="btn btn-o btn-sm" onClick={closeM}><X size={13}/></button></div>
          <div className="fr fr2">
            <div><label className="lbl">SKU Code</label><input className="inp" value={form.sku_code||""} onChange={e=>sf("sku_code",e.target.value)}/></div>
            <div><label className="lbl">Category *</label><input className="inp" value={form.category||""} onChange={e=>sf("category",e.target.value)}/></div>
          </div>
          <div className="fr"><label className="lbl">Product Name *</label><input className="inp" value={form.name||""} onChange={e=>sf("name",e.target.value)}/></div>
          <div className="fr fr3">
            <div><label className="lbl">Packing</label><input type="number" className="inp" value={form.packing||""} onChange={e=>sf("packing",Number(e.target.value))}/></div>
            <div><label className="lbl">Price/Pcs (₹)</label><input type="number" className="inp" value={form.price_per_pcs||""} onChange={e=>sf("price_per_pcs",Number(e.target.value))}/></div>
            <div><label className="lbl">CTN Price (₹)</label><input type="number" className="inp" value={form.ctn_price||""} onChange={e=>sf("ctn_price",Number(e.target.value))}/></div>
          </div>
          <button className="btn btn-p" style={{width:"100%",justifyContent:"center",marginTop:6}} disabled={saving} onClick={saveProd}>{saving?<Spin/>:"Save"}</button>
        </div>
      </div>
    );

    if(modal==="editcust") return (
      <div className="ov" onClick={()=>setModal("detail")}>
        <div className="mod" onClick={e=>e.stopPropagation()}>
          <div className="mod-ttl">✏️ Edit Customer <button className="btn btn-o btn-sm" onClick={()=>setModal("detail")}><X size={13}/></button></div>
          <div className="fr fr2"><div><label className="lbl">Name *</label><input className="inp" value={form.name||""} onChange={e=>sf("name",e.target.value)}/></div><div><label className="lbl">Company *</label><input className="inp" value={form.company||""} onChange={e=>sf("company",e.target.value)}/></div></div>
          <div className="fr fr2"><div><label className="lbl">Phone</label><input className="inp" value={form.phone||""} onChange={e=>sf("phone",e.target.value)}/></div><div><label className="lbl">Email</label><input className="inp" value={form.email||""} onChange={e=>sf("email",e.target.value)}/></div></div>
          <div className="fr fr3">
            <div><label className="lbl">City</label><input className="inp" value={form.city||""} onChange={e=>sf("city",e.target.value)}/></div>
            <div><label className="lbl">Type</label><select className="inp" value={form.type||"nbd"} onChange={e=>sf("type",e.target.value)}><option value="crm">CRM</option><option value="retail">Retail</option><option value="direct">Direct</option><option value="nbd">NBD</option><option value="enduser">End User</option></select></div>
            <div><label className="lbl">Status</label><select className="inp" value={form.status||"prospect"} onChange={e=>sf("status",e.target.value)}><option value="prospect">Prospect</option><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
          </div>
          <div className="fr fr2"><div><label className="lbl">Segment</label><input className="inp" value={form.segment||""} onChange={e=>sf("segment",e.target.value)}/></div><div><label className="lbl">Primary Owner</label>
              <select className="inp" value={form.assigned_to||""} onChange={e=>sf("assigned_to",e.target.value)}>
                <option value="">-- Select --</option>
                {USERS.map(u=><option key={u.name} value={u.name}>{u.name}</option>)}
              </select></div></div>
          <div className="fr fr2"><div><label className="lbl">Discount (₹/ctn)</label>
              <input type="number" className="inp" placeholder="0" value={form.discount_per_ctn||""} onChange={e=>sf("discount_per_ctn",Number(e.target.value))}/>
              <div style={{fontSize:10,color:"var(--mut)",marginTop:2}}>Party ko har carton pe kitna discount</div>
            </div>
            <div><label className="lbl">Sales Rep (Follow-up)</label>
              <select className="inp" value={form.sales_rep||""} onChange={e=>sf("sales_rep",e.target.value)}>
                <option value="">-- Koi nahi --</option>
                {USERS.map(u=><option key={u.name} value={u.name}>{u.name}</option>)}
              </select></div>
            <div><label className="lbl">GST No</label><input className="inp" placeholder="22AAAAA0000A1Z5" value={form.gst_no||""} onChange={e=>sf("gst_no",e.target.value.toUpperCase())}/></div></div>
          <div className="fr fr2"><div><label className="lbl">Address</label><input className="inp" value={form.address||""} onChange={e=>sf("address",e.target.value)}/></div></div>
          <button className="btn btn-p" style={{width:"100%",justifyContent:"center",marginTop:8}} disabled={saving} onClick={async()=>{
            if(!form.name||!form.company) return toast$("Name aur Company required!",true);
            setSv(true);
            try {
              await sbPatch("crm_customers",form.id,{name:form.name,company:form.company,phone:form.phone,email:form.email,city:form.city,type:form.type,status:form.status,segment:form.segment,assigned_to:form.assigned_to,sales_rep:form.sales_rep||null,gst_no:form.gst_no,address:form.address,discount_per_ctn:Number(form.discount_per_ctn)||0});
              setC(p=>p.map(x=>x.id===form.id?{...x,...form}:x));
              toast$("Customer updated ✓"); setModal("detail");
            } catch(e){toast$(e.message,true);}
            setSv(false);
          }}>{saving?<Spin/>:"Save"}</button>
        </div>
      </div>
    );

    if(modal==="acust_quick") return (
      <div className="ov" onClick={closeM}>
        <div className="mod mod-sm" onClick={e=>e.stopPropagation()}>
          <div className="mod-ttl">➕ New Customer <button className="btn btn-o btn-sm" onClick={closeM}><X size={13}/></button></div>
          <div className="fr fr2"><div><label className="lbl">Name *</label><input className="inp" value={form.name||""} onChange={e=>sf("name",e.target.value)}/></div><div><label className="lbl">Company *</label><input className="inp" value={form.company||""} onChange={e=>sf("company",e.target.value)}/></div></div>
          <div className="fr fr2"><div><label className="lbl">Phone</label><input className="inp" value={form.phone||""} onChange={e=>sf("phone",e.target.value)}/></div><div><label className="lbl">City</label><input className="inp" value={form.city||""} onChange={e=>sf("city",e.target.value)}/></div></div>
          <div className="fr fr2"><div><label className="lbl">GST No</label><input className="inp" placeholder="22AAAAA0000A1Z5" value={form.gst_no||""} onChange={e=>sf("gst_no",e.target.value.toUpperCase())}/></div><div><label className="lbl">Address</label><input className="inp" value={form.address||""} onChange={e=>sf("address",e.target.value)}/></div></div>
          <div className="fr fr2">
            <div><label className="lbl">Type</label><select className="inp" value={form.type||"nbd"} onChange={e=>sf("type",e.target.value)}><option value="crm">CRM</option><option value="retail">Retail</option><option value="direct">Direct</option><option value="nbd">NBD</option><option value="enduser">End User</option></select></div>
            <div><label className="lbl">Primary Owner</label>
              <select className="inp" value={form.assigned_to||""} onChange={e=>sf("assigned_to",e.target.value)}>
                <option value="">-- Select --</option>
                {USERS.map(u=><option key={u.name} value={u.name}>{u.name}</option>)}
              </select></div>
          </div>
          <button className="btn btn-p" style={{width:"100%",justifyContent:"center",marginTop:6}} disabled={saving} onClick={async()=>{
            if(!form.name||!form.company) return toast$("Name aur Company required!",true);
            setSv(true);
            try {
              // Check for existing customer with same company name
              const dup=C.find(c=>c.company&&form.company&&c.company.trim().toLowerCase()===form.company.trim().toLowerCase());
              if(dup){
                setSv(false);
                if(!window.confirm(`"${dup.company}" already exist karta hai (${dup.type.toUpperCase()}, ${dup.city||"no city"}). Phir bhi naya banayein? \n\nOK = Naya banao | Cancel = Purana use karo`)){
                  setForm(prev=>({...prev,customer_id:dup.id}));
                  toast$("Purana customer select kiya ✓");
                  setModal("aorder");
                  return;
                }
                setSv(true);
              }
              const r=await sbInsert("crm_customers",{name:form.name,company:form.company,phone:form.phone,city:form.city,gst_no:form.gst_no,address:form.address,type:form.type||"nbd",assigned_to:form.assigned_to,status:"prospect"});
              const newCust=r[0];
              setC(p=>[newCust,...p]);
              setForm(prev=>({...prev,customer_id:newCust.id,name:undefined,phone:undefined,city:undefined,type:undefined,assigned_to:undefined,gst_no:undefined,address:undefined}));
              toast$("Customer add ho gaya ✓");
              setModal("aorder");
            } catch(e){toast$(e.message,true);}
            setSv(false);
          }}>{saving?<Spin/>:"Save & Select"}</button>
        </div>
      </div>
    );

    if(modal==="editorder") {
      const editTotal=orderItems.reduce((s,i)=>s+(Number(i.amount)||0),0);
      const editEprChecked=!!(form.epr||form.epr_applied);
      const editEpr=editEprChecked?Math.round(editTotal*0.01):0;
      const editGstType=form.gst_type||"excluding";
      const editGst=editGstType==="including"?0:Math.round(editTotal*0.18);
      return (
        <div className="ov" onClick={closeM}>
          <div className="mod" style={{width:860,maxWidth:"96vw"}} onClick={e=>e.stopPropagation()}>
            <div className="mod-ttl">✏️ Edit Order — {form.company} <button className="btn btn-o btn-sm" onClick={closeM}><X size={13}/></button></div>
            <div className="fr fr2" style={{marginBottom:12}}>
              <div><label className="lbl">Order Date</label><input type="date" className="inp" value={form.order_date||""} onChange={e=>sf("order_date",e.target.value)}/></div>
              <div><label className="lbl">Payment Mode</label>
                <select className="inp" value={form.payment_mode||"cash"} onChange={e=>sf("payment_mode",e.target.value)}>
                  <option value="cash">💵 Cash</option><option value="credit">🏦 Credit</option><option value="bank_transfer">↗ Bank Transfer</option><option value="cheque">📝 Cheque</option>
                </select>
              </div>
            </div>
            <div className="g2" style={{gap:14}}>
              <div>
                <label className="lbl">Product Add Karo</label>
                <div style={{maxHeight:280,overflowY:"auto",border:"1px solid var(--bdr)",borderRadius:8}}>
                  {PRODS.map(p=>(
                    <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 10px",borderBottom:"1px solid var(--bdr)",fontSize:11.5}}>
                      <div><div style={{fontWeight:600,fontSize:11.5}}>{p.name}</div><div style={{fontSize:10,color:"var(--mut)"}}>{p.sku_code} · ₹{p.ctn_price}/ctn</div></div>
                      <button className="btn btn-g btn-sm" onClick={()=>addOrderItem(p)}>+ Add</button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="lbl">Order Items ({orderItems.length})</label>
                {orderItems.length===0?<div className="empty" style={{padding:20,border:"1px solid var(--bdr)",borderRadius:8}}><p>Koi item nahi</p></div>
                  :<div style={{border:"1px solid var(--bdr)",borderRadius:8,overflow:"hidden"}}>
                    {orderItems.map(item=>(
                      <div key={item.product_id||item.id} style={{padding:"8px 10px",borderBottom:"1px solid var(--bdr)"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}><span style={{fontWeight:600,fontSize:12}}>{item.product_name}</span><NBadge pname={item.product_name} price={item.ctn_price}/></div>
                          <button style={{background:"none",border:"none",color:"var(--err)",cursor:"pointer"}} onClick={()=>removeOrderItem(item.product_id||item.id)}><Trash2 size={12}/></button>
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6}}>
                          <div><div style={{fontSize:9,color:"var(--mut)",marginBottom:2}}>CASES</div><NumInput style={{padding:"4px 8px",fontSize:12}} value={item.qty_cases} onChange={v=>updOrderItem(item.product_id||item.id,"qty_cases",v)}/></div>
                          <div><div style={{fontSize:9,color:"var(--mut)",marginBottom:2}}>CTN PRICE (₹)</div><NumInput style={{padding:"4px 8px",fontSize:12}} value={item.ctn_price} onChange={v=>updOrderItem(item.product_id||item.id,"ctn_price",v)}/></div>
                          <div><div style={{fontSize:9,color:"var(--mut)",marginBottom:2}}>DISCOUNT (₹)</div><NumInput style={{padding:"4px 8px",fontSize:12}} value={item.discount||0} onChange={v=>updOrderItem(item.product_id||item.id,"discount",v)}/></div>
                          <div><div style={{fontSize:9,color:"var(--mut)",marginBottom:2}}>AMOUNT</div><div style={{fontSize:13,fontWeight:800,color:"#10b981",paddingTop:6}}>₹{Number(item.amount||0).toLocaleString("en-IN")}</div></div>
                        </div>
                      </div>
                    ))}
                    <div style={{padding:"10px 12px",background:"var(--card2)"}}>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}><span style={{color:"var(--mut)"}}>Subtotal</span><span style={{fontWeight:600}}>₹{editTotal.toLocaleString("en-IN")}</span></div>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:12,marginBottom:4}}>
                        <label style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer",color:"var(--mut)"}}>
                          <input type="checkbox" checked={editEprChecked} onChange={e=>{sf("epr",e.target.checked);sf("epr_applied",e.target.checked);}} style={{accentColor:"var(--acc)",width:14,height:14}}/>EPR @1%
                        </label>
                        <span style={{fontWeight:600,color:editEprChecked?"var(--txt)":"var(--mut)"}}>₹{editEpr.toLocaleString("en-IN")}</span>
                      </div>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:12,marginBottom:6}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <span style={{color:"var(--mut)"}}>GST @18%:</span>
                          <label style={{display:"flex",alignItems:"center",gap:4,cursor:"pointer"}}><input type="radio" name="egst" value="excluding" checked={editGstType!=="including"} onChange={()=>sf("gst_type","excluding")} style={{accentColor:"var(--acc)",width:13,height:13}}/><span style={{fontSize:11}}>Excl.</span></label>
                          <label style={{display:"flex",alignItems:"center",gap:4,cursor:"pointer"}}><input type="radio" name="egst" value="including" checked={editGstType==="including"} onChange={()=>sf("gst_type","including")} style={{accentColor:"var(--acc)",width:13,height:13}}/><span style={{fontSize:11}}>Incl.</span></label>
                        </div>
                        <span style={{fontWeight:600}}>{editGstType==="including"?"(included)":"₹"+editGst.toLocaleString("en-IN")}</span>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:14,borderTop:"1px solid var(--bdr)",paddingTop:6}}><span style={{fontWeight:700}}>Total</span><span style={{fontWeight:800,color:"#10b981"}}>₹{(editTotal+editEpr+(editGstType==="including"?0:editGst)).toLocaleString("en-IN")}</span></div>
                    </div>
                  </div>}
              </div>
            </div>
            <div className="fr fr2" style={{marginTop:12}}>
              <div><label className="lbl">Notes</label><textarea className="inp" defaultValue={form.notes||""} onBlur={e=>sf("notes",e.target.value)} style={{minHeight:38,resize:"none"}}/></div>
              <div style={{display:"flex",alignItems:"flex-end"}}>
                <button className="btn btn-p" style={{width:"100%",justifyContent:"center",fontSize:13}} disabled={saving} onClick={async()=>{
                  setSv(true);
                  const newTotal=editTotal+editEpr+(editGstType==="including"?0:editGst);
                  try {
                    const totalCases=orderItems.reduce((s,i)=>s+(Number(i.qty_cases)||0),0);
                    await sbPatch("crm_orders",form.id,{order_date:form.order_date,payment_mode:form.payment_mode,gst_type:editGstType,epr_applied:editEprChecked,total_amount:newTotal,total_cases:totalCases,notes:form.notes});
                    await sbFetch(`crm_order_items?order_id=eq.${form.id}`,{method:"DELETE"});
                    if(orderItems.length>0){
                      const items=orderItems.map(i=>({...i,order_id:form.id,product_id:i.product_id||i.id}));
                      const cleanItems=items.map(({id,...rest})=>rest);
                      await sbInsert("crm_order_items",cleanItems);
                    }
                    setORDERS(p=>p.map(x=>x.id===form.id?{...x,...form,total_amount:newTotal}:x));
                    toast$("Order updated ✓"); closeM();
                  } catch(e){toast$(e.message,true);}
                  setSv(false);
                }}>{saving?<Spin/>:"💾 Save Order"}</button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    const FM = {
      acust:{t:"Add Customer",fn:saveCust,f:<>
        <div className="fr fr2"><div><label className="lbl">Name *</label><input className="inp" value={form.name||""} onChange={e=>sf("name",e.target.value)}/></div><div><label className="lbl">Company *</label><input className="inp" value={form.company||""} onChange={e=>sf("company",e.target.value)}/></div></div>
        <div className="fr fr2"><div><label className="lbl">Phone</label><input className="inp" value={form.phone||""} onChange={e=>sf("phone",e.target.value)}/></div><div><label className="lbl">Email</label><input className="inp" value={form.email||""} onChange={e=>sf("email",e.target.value)}/></div></div>
        <div className="fr fr3">
          <div><label className="lbl">City</label><input className="inp" value={form.city||""} onChange={e=>sf("city",e.target.value)}/></div>
          <div><label className="lbl">Type</label><select className="inp" value={form.type||"nbd"} onChange={e=>sf("type",e.target.value)}><option value="crm">CRM</option><option value="retail">Retail</option><option value="direct">Direct</option><option value="nbd">NBD</option><option value="enduser">End User</option></select></div>
          <div><label className="lbl">Status</label><select className="inp" value={form.status||"prospect"} onChange={e=>sf("status",e.target.value)}><option value="prospect">Prospect</option><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
        </div>
        <div className="fr fr2"><div><label className="lbl">Segment</label><input className="inp" value={form.segment||""} onChange={e=>sf("segment",e.target.value)}/></div><div><label className="lbl">Primary Owner</label>
              <select className="inp" value={form.assigned_to||""} onChange={e=>sf("assigned_to",e.target.value)}>
                <option value="">-- Select --</option>
                {USERS.map(u=><option key={u.name} value={u.name}>{u.name}</option>)}
              </select></div></div>
        <div className="fr fr2"><div><label className="lbl">GST No</label><input className="inp" placeholder="22AAAAA0000A1Z5" value={form.gst_no||""} onChange={e=>sf("gst_no",e.target.value.toUpperCase())}/></div><div><label className="lbl">Address</label><input className="inp" value={form.address||""} onChange={e=>sf("address",e.target.value)}/></div></div>
      </>},
      aenq:{t:"New Enquiry",fn:saveEnq,f:<>
        <div className="fr"><label className="lbl">Customer *</label><CustomerSearch value={form.customer_id||""} onChange={v=>sf("customer_id",v)}/></div>
        <div className="fr fr2"><div><label className="lbl">Product *</label><input className="inp" value={form.product||""} onChange={e=>sf("product",e.target.value)}/></div><div><label className="lbl">Quantity</label><input className="inp" value={form.qty||""} onChange={e=>sf("qty",e.target.value)}/></div></div>
        <div className="fr fr3">
          <div><label className="lbl">Priority</label><select className="inp" value={form.priority||"medium"} onChange={e=>sf("priority",e.target.value)}><option value="high">🔥 High</option><option value="medium">⚡ Medium</option><option value="low">• Low</option></select></div>
          <div><label className="lbl">Status</label><select className="inp" value={form.status||"new"} onChange={e=>sf("status",e.target.value)}>{["new","quoted","negotiating","won","lost"].map(s=><option key={s} value={s}>{s}</option>)}</select></div>
          <div><label className="lbl">Primary Owner</label>
              <select className="inp" value={form.assigned_to||""} onChange={e=>sf("assigned_to",e.target.value)}>
                <option value="">-- Select --</option>
                {USERS.map(u=><option key={u.name} value={u.name}>{u.name}</option>)}
              </select></div>
        </div>
      </>},
      ainter:{t:"Log Interaction",fn:()=>saveInter(false),f:<>
        <div className="fr"><label className="lbl">Customer *</label><CustomerSearch value={form.customer_id||""} onChange={v=>sf("customer_id",v)}/></div>
        <div className="fr"><label className="lbl">Type</label><select className="inp" value={form.type||"call"} onChange={e=>sf("type",e.target.value)}>{["call","visit","whatsapp","email","meeting"].map(t=><option key={t} value={t}>{TI[t]} {t}</option>)}</select></div>
        <div className="fr">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
            <label className="lbl" style={{margin:0}}>Note *</label>
            <button onClick={async()=>{
              const noteVal = document.getElementById("ainter-note")?.value||form.note||"";
              if(!noteVal.trim()) return toast$("Pehle note likho",true);
              sf("note",noteVal);
              toast$("AI polish kar raha hai...");
              try {
                const res = await fetch("/api/ai-polish",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:String(noteVal),type:"note"})});
                const d = await res.json();
                if(d.polished){sf("note",d.polished);if(document.getElementById("ainter-note"))document.getElementById("ainter-note").value=d.polished;toast$("✨ Note polished!");}
              } catch(e){ toast$("AI error: "+e.message,true); }
            }} style={{padding:"2px 10px",borderRadius:6,fontSize:11,border:"1px solid var(--acc)",
              background:"rgba(139,92,246,.1)",color:"var(--acc)",cursor:"pointer",fontWeight:600}}>
              ✨ AI Polish
            </button>
          </div>
          <textarea id="ainter-note" className="inp" defaultValue={form.note||""} 
            onBlur={e=>sf("note",e.target.value)} rows={3}
            style={{width:"100%"}}/>
        </div>
        <div className="fr fr3">
          <div><label className="lbl">Follow-up Date</label><input type="date" className="inp" value={form.next_follow_up||""} onChange={e=>sf("next_follow_up",e.target.value)}/></div>
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
              <label className="lbl" style={{margin:0}}>Follow-up Note</label>
              <button onClick={async()=>{
                if(!form.follow_up_note?.trim()) return toast$("Follow-up note likho pehle",true);
                try {
                  const res = await fetch("/api/ai-polish",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:String(form.follow_up_note||""),type:"followup"})});
                  const d = await res.json();
                  if(d.polished){sf("follow_up_note",d.polished);toast$("✨ Polished!");}
                } catch(e){ toast$("Error",true); }
              }} style={{padding:"1px 8px",borderRadius:5,fontSize:10,border:"1px solid var(--acc)",
                background:"rgba(139,92,246,.1)",color:"var(--acc)",cursor:"pointer"}}>✨</button>
            </div>
            <input className="inp" value={form.follow_up_note||""} onChange={e=>sf("follow_up_note",e.target.value)}/>
          </div>
          <div><label className="lbl">Done By</label>
            <select className="inp" value={form.done_by||currentUser?.name||""} onChange={e=>sf("done_by",e.target.value)}>
              <option value="">-- Select --</option>
              {USERS.map(u=><option key={u.name} value={u.name}>{u.name}</option>)}
            </select>
          </div>
          <div><label className="lbl">Follow-up Assign To</label>
            <select className="inp" value={form.assign_followup_to||myName||""} onChange={e=>sf("assign_followup_to",e.target.value)}>
              <option value="">-- Select Rep --</option>
              {USERS.map(u=><option key={u.name} value={u.name}>{u.name}</option>)}
            </select>
          </div>
        </div>
        <button className="btn btn-p" style={{width:"100%",justifyContent:"center",marginTop:6}} disabled={saving} onClick={()=>saveInter(false)}>{saving?<Spin/>:"Save"}</button>
      </>},
      asamp:{t:"Add Sample",fn:saveSamp,f:<>
        <div className="fr"><label className="lbl">Customer *</label><CustomerSearch value={form.customer_id||""} onChange={v=>sf("customer_id",v)} allowNew={false}/></div>
        <div className="fr fr2"><div><label className="lbl">Product *</label><input className="inp" value={form.product||""} onChange={e=>sf("product",e.target.value)}/></div><div><label className="lbl">Qty</label><input className="inp" value={form.qty||""} onChange={e=>sf("qty",e.target.value)}/></div></div>
        <div className="fr fr3">
          <div><label className="lbl">Sent Date</label><input type="date" className="inp" value={form.sent_date||""} onChange={e=>sf("sent_date",e.target.value)}/></div>
          <div><label className="lbl">Status</label><select className="inp" value={form.status||"pending"} onChange={e=>sf("status",e.target.value)}>{["pending","sent","approved","revision","rejected"].map(s=><option key={s} value={s}>{s}</option>)}</select></div>
          <div><label className="lbl">Remarks</label><input className="inp" value={form.remarks||""} onChange={e=>sf("remarks",e.target.value)}/></div>
        </div>
      </>},
      apay:{t:"Payment Structure",fn:savePay,f:<>
        <div className="fr"><label className="lbl">Customer *</label><CustomerSearch value={form.customer_id||""} onChange={v=>{sf("customer_id",v);const p=gcp(v);if(p)setForm(prev=>({...prev,...p,customer_id:v}));}} allowNew={false}/></div>
        <div className="fr fr2">
          <div><label className="lbl">Mode</label><select className="inp" value={form.payment_mode||"credit"} onChange={e=>sf("payment_mode",e.target.value)}><option value="advance">Advance</option><option value="on_delivery">On Delivery</option><option value="credit">Credit</option><option value="mixed">Mixed</option></select></div>
          <div><label className="lbl">Credit Days</label><input type="number" className="inp" value={form.credit_days||""} onChange={e=>sf("credit_days",Number(e.target.value))}/></div>
        </div>
        <div className="fr fr3">
          <div><label className="lbl">Credit Limit (₹)</label><input type="number" className="inp" value={form.credit_limit||""} onChange={e=>sf("credit_limit",Number(e.target.value))}/></div>
          <div><label className="lbl">Outstanding (₹)</label><input type="number" className="inp" value={form.outstanding||""} onChange={e=>sf("outstanding",Number(e.target.value))}/></div>
          <div><label className="lbl">Overdue (₹)</label><input type="number" className="inp" value={form.overdue||""} onChange={e=>sf("overdue",Number(e.target.value))}/></div>
        </div>
        <div className="fr"><label className="lbl">Remarks</label><textarea className="inp" value={form.remarks||""} onChange={e=>sf("remarks",e.target.value)}/></div>
      </>},
    };

    const f=FM[modal]; if(!f) return null;
    return (
      <div className="ov" onClick={closeM}>
        <div className="mod" onClick={e=>e.stopPropagation()} key={modal}>
          <div className="mod-ttl">{f.t} <button className="btn btn-o btn-sm" onClick={closeM}><X size={13}/></button></div>
          {f.f}
          {modal!=="ainter"&&<button className="btn btn-p" style={{width:"100%",justifyContent:"center",marginTop:8}} disabled={saving} onClick={f.fn}>{saving?<Spin/>:"Save"}</button>}
        </div>
      </div>
    );
  };


  /* ── PRICING (N1/N2/N3 Engine) ── */
  const savePxDaana = async()=>{
    setPxSave(true);
    try{
      const today = new Date().toISOString().slice(0,10);
      const existing = await sbFetch("price_daana?rate_date=eq."+today);
      const body = {homo:+pxDaana.homo,cp:+pxDaana.cp,random:+pxDaana.random};
      if(existing&&existing.length>0){
        await sbFetch("price_daana?rate_date=eq."+today,{method:"PATCH",body});
      }else{
        await sbFetch("price_daana",{method:"POST",body:{rate_date:today,...body}});
      }
      await loadPricing();
      toast$("Daana updated \u2713 zones recalculated");
    }catch(e){ toast$("Daana save error",true); }
    setPxSave(false);
  };
  const pxUpdatePrice = async(id,price)=>{
    try{
      await sbFetch("price_items?id=eq."+id,{method:"PATCH",body:{list_price:+price}});
      await loadPricing();
      toast$("Price updated \u2713");
    }catch(e){ toast$("Price error",true); }
  };
  const PXZ = {N3:{c:"#10b981",bg:"rgba(16,185,129,.12)"},N2:{c:"#f59e0b",bg:"rgba(245,158,11,.12)"},N1:{c:"#f97316",bg:"rgba(249,115,22,.12)"},RED:{c:"#ef4444",bg:"rgba(239,68,68,.12)"}};

  // Role from crm_users table (admin / sales / dataentry)
  // roles defined above
  const pxByProduct = (pname) => pxProducts.find(r=>r.crm_product_name===pname);
  const zoneForPrice = (px, price) => {
    if(!px) return null;
    const p = Number(price)||0;
    if(p <= 0) return px.zone; // no price yet -> show list zone
    if(p >= px.premium_price) return "N3";
    if(p >= px.happy_price) return "N2";
    if(p >= px.floor_price) return "N1";
    return "RED";
  };
  const NBadge = ({pname, price}) => {
    const px = pxByProduct(pname);
    if(!px) return null;
    const zone = zoneForPrice(px, price);
    const z = PXZ[zone];
    return (
      <span style={{display:"inline-flex",alignItems:"center",gap:4}}>
        <span className="bdg" style={{background:z.bg,color:z.c,fontSize:10,fontWeight:800}}>{zone==="RED"?"LOSS":zone}</span>
        {isAdmin && <span style={{fontSize:10,color:"var(--mut)"}}>floor {fr(px.floor_price)}</span>}
      </span>
    );
  };

  // ── Global helpers ──
  // Reusable formula tooltip component
  const FormulaBox = ({title, lines, example}) => {
    const [open, setOpen] = useState(false);
    return (
      <span style={{display:"inline-block",marginLeft:6}}>
        <button onClick={()=>setOpen(!open)} style={{
          background:"none",border:"1px solid var(--bdr)",borderRadius:4,
          padding:"1px 6px",fontSize:9,cursor:"pointer",color:"var(--mut)",
          fontWeight:700,lineHeight:1.4
        }}>📐 Formula</button>
        {open&&(
          <div style={{position:"absolute",zIndex:100,background:"var(--card)",
            border:"1px solid var(--bdr)",borderRadius:10,padding:12,
            boxShadow:"0 8px 24px rgba(0,0,0,.15)",width:320,marginTop:4,
            fontSize:10,lineHeight:1.8}}>
            <div style={{fontWeight:700,marginBottom:8,fontSize:12}}>{title}</div>
            {lines.map((l,i)=>(
              <div key={i} style={{
                fontFamily:l.startsWith("//")?undefined:"monospace",
                color:l.startsWith("//")?"var(--mut)":l.startsWith("→")?"#10b981":l.startsWith("=")||l.startsWith("T/hr")||l.startsWith("Floor")||l.startsWith("N1")?"#f97316":"var(--txt)",
                fontWeight:l.startsWith("→")||l.startsWith("T/hr")?700:400
              }}>{l}</div>
            ))}
            {example&&(
              <div style={{marginTop:8,padding:8,background:"var(--card2)",borderRadius:6,fontSize:9}}>
                <div style={{fontWeight:700,marginBottom:4,color:"var(--mut)"}}>Example:</div>
                {example.map((l,i)=>(
                  <div key={i} style={{color:l.startsWith("→")?"#10b981":"var(--txt)",fontWeight:l.startsWith("→")?700:400}}>{l}</div>
                ))}
              </div>
            )}
            <button onClick={()=>setOpen(false)} style={{
              marginTop:8,background:"var(--card2)",border:"none",
              borderRadius:4,padding:"2px 8px",fontSize:9,cursor:"pointer",
              color:"var(--mut)"
            }}>Close ✕</button>
          </div>
        )}
      </span>
    );
  };
  const normP = (s) => (s||"").toLowerCase().replace(/\s+/g,"").replace(/ml/g,"ml").trim();
  const findPxRow = (mosProduct, priceItemName) => {
    if(!pxRows.length) return null;
    // Try price_item_name first (most reliable)
    if(priceItemName) {
      const f0 = pxRows.find(r=>r.item_name===priceItemName||normP(r.item_name)===normP(priceItemName));
      if(f0) return f0;
    }
    if(!mosProduct) return null;
    const np = normP(mosProduct);
    let found = pxRows.find(r=>r.crm_product_name&&normP(r.crm_product_name)===np);
    if(found) return found;
    found = pxRows.find(r=>normP(r.item_name)===np);
    if(found) return found;
    found = pxRows.find(r=>r.crm_product_name&&np.includes(normP(r.crm_product_name))&&normP(r.crm_product_name).length>8);
    if(found) return found;
    found = pxRows.find(r=>r.crm_product_name&&normP(r.crm_product_name).includes(np)&&np.length>8);
    return found||null;
  };

  const Pricing = () => {
    const [pxModel, setPxModel] = useState("both"); // m1 | m2 | both

    // Machine electricity ₹/hr (actual + 5% buffer)
    const MELEC = {
      "180T":191.8,"180T Sumitomo":191.8,"180T JSW":193.8,
      "200T":213.0,"200T Milacron":213.0,
      "280T":233.7,"280T Sumitomo":233.7,
      "350T Sumitomo":226.1,"350T JSW":252.2,"350T":252.2,
    };
    const getME = (ton) => {
      if(!ton) return 213.0;
      for(const [k,v] of Object.entries(MELEC)){if(ton.includes(k))return v;}
      return 213.0;
    };

    // Model 1: N1 = Total Fixed / SCU
    const m1N1 = pxThis.fixed / pxThis.scu;
    const m1N2 = (pxThis.fixed + pxThis.happy) / pxThis.scu;
    const m1N3 = m1N2 * 1.20;

    // Model 2: True Fixed = Total Fixed - Electricity Bill
    const truFixed = pxThis.fixed - pxThis.elecBill;
    const epk = (pxThis.elecBill / pxThis.salesKg) * 1.05; // ₹/kg +5%
    const m2N1 = truFixed / pxThis.scu;
    const m2N2 = (truFixed + pxThis.happy) / pxThis.scu;
    const m2N3 = m2N2 * 1.20;

    // Calculate floors from price_items columns — ALL components
    const calcFloors = (row) => {
      const HOMO = Number(pxDaana.homo)||146;
      const CP   = Number(pxDaana.cp)||146;
      const RAND = Number(pxDaana.random)||152;
      const MB_BLACK=180; const MB_MILKY=225; const POLY_RATE=225; const TAPE=10;
      const pcs  = row.pcs_per_carton || 500;

      // 1. Daana cost per carton
      const daana = (
        ((row.box_homo||0)*HOMO + (row.box_cp||0)*CP + (row.box_random||0)*RAND) +
        ((row.lid_homo||0)*HOMO + (row.lid_cp||0)*CP + (row.lid_random||0)*RAND)
      ) / 1000 * pcs;

      // 2. Machine hours per carton (box + lid)
      const boxMH = (row.box_cav>0 && row.box_cyc>0)
        ? pcs / ((3600/row.box_cyc)*row.box_cav) : 0;
      const lidMH = (row.lid_cav>0 && row.lid_cyc>0)
        ? pcs / ((3600/row.lid_cyc)*row.lid_cav) : 0;
      const mh = boxMH + lidMH;

      // 3. kg per carton
      const kg = ((row.box_wt||0) + (row.lid_wt||0)) * pcs / 1000;

      // 4. Masterbatch (2% colour loading)
      const mbRate = (row.colour||"").toLowerCase()==="milky" ? MB_MILKY : MB_BLACK;
      const mb = kg * 0.02 * mbRate;

      // 5. Carton + Poly + Tape
      const carton = row.carton_cost || 0;
      const poly = ((row.poly_gm||0) / 1000) * POLY_RATE;
      const tape = TAPE;

      // 6. Variable costs total (same for both models)
      const varCosts = daana + mb + carton + poly + tape;

      if(!mh) return {
        m1Floor:null,m1Happy:null,m1Super:null,m1Zone:"N3",
        m2Floor:null,m2Happy:null,m2Super:null,m2Zone:"N3"
      };

      // MODEL 1: Floor = VarCosts + (Total Fixed / SCU) × MH
      const m1Floor = varCosts + m1N1 * mh;
      const m1Happy = varCosts + m1N2 * mh;
      const m1Super = varCosts + m1N3 * mh;

      // MODEL 2: Floor = VarCosts + Electricity(₹/kg×kg) + (True Fixed / SCU) × MH
      const m2Floor = varCosts + (epk * kg) + m2N1 * mh;
      const m2Happy = varCosts + (epk * kg) + m2N2 * mh;
      const m2Super = varCosts + (epk * kg) + m2N3 * mh;

      const getZone = (price, floor, happy, super_) =>
        !price||!floor ? "—" :
        price < floor ? "RED" : price < happy ? "N1" : price < super_ ? "N2" : "N3";

      return {
        m1Floor, m1Happy, m1Super,
        m1Zone: getZone(row.list_price, m1Floor, m1Happy, m1Super),
        m2Floor, m2Happy, m2Super,
        m2Zone: getZone(row.list_price, m2Floor, m2Happy, m2Super),
        daana, mb, carton, poly, tape, mh, kg,
      };
    };

    const list = pxRows.filter(r=>!pxQ||r.item_name.toLowerCase().includes(pxQ.toLowerCase()));
    const fr2 = (v) => v ? "₹"+Math.round(v).toLocaleString("en-IN") : "—";

    return (
      <div>
        <div className="sh">
          <div>
            <div className="sh-t">💰 Pricing Engine — Dono Models</div>
            <div className="sh-s">Model 1 (Blended 30%) vs Model 2 (Variable Electricity) · Daana change karo → live update</div>
          </div>
        </div>

        {/* Daana input */}
        <div className="card" style={{background:"#0e1a24",color:"#fff",marginBottom:12}}>
          <div style={{fontSize:10,color:"#9fb3c0",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>🌾 Aaj Ka Daana Rate ₹/kg</div>
          <div style={{display:"flex",gap:10,marginBottom:10}}>
            {["homo","cp","random"].map(k=>(
              <div key={k} style={{flex:1}}>
                <input type="number" value={pxDaana[k]} onChange={e=>setPxDaana({...pxDaana,[k]:e.target.value})}
                  style={{width:"100%",padding:10,borderRadius:8,border:"1px solid #2c3e4c",background:"#1b2b38",color:"#fff",fontSize:18,fontWeight:700,textAlign:"center"}}/>
                <div style={{textAlign:"center",fontSize:10,color:"#7f97a6",marginTop:3,textTransform:"uppercase"}}>{k}</div>
              </div>
            ))}
          </div>
          <button className="btn btn-p" style={{width:"100%",justifyContent:"center"}} onClick={savePxDaana} disabled={pxSave}>
            {pxSave?"Saving...":"💾 Save Daana & Recalculate"}
          </button>
        </div>

        {/* Monthly inputs for Model 2 */}
        <div className="card" style={{marginBottom:12}}>
          <div style={{fontSize:10,color:"var(--mut)",textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>📅 Is Mahine Ka Data (Model 2 ke liye)</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            {[
              ["Total Fixed ₹","fixed",9800000],
              ["Electricity Bill ₹","elecBill",2452659],
              ["Sales KG","salesKg",164297],
            ].map(([lbl,key,def])=>(
              <div key={key}>
                <div style={{fontSize:10,color:"var(--mut)",marginBottom:4}}>{lbl}</div>
                <input type="number" value={pxThis[key]}
                  onChange={e=>setPxThis(p=>({...p,[key]:Number(e.target.value)}))}
                  className="inp" style={{textAlign:"center",fontWeight:700}}/>
              </div>
            ))}
          </div>
        </div>

        {/* Thresholds comparison */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
          <div className="card" style={{border:"2px solid #b71c1c"}}>
            <div style={{fontSize:10,fontWeight:700,color:"#b71c1c",marginBottom:8}}>MODEL 1 — Simple (30% Blended)</div>
            <div style={{display:"flex",gap:6}}>
              {[["N1 Floor",m1N1,"FFE0E0","b71c1c"],["N2 Happy",m1N2,"FFF9C4","7b5800"],["N3 Super",m1N3,"E8F5E9","1b5e20"]].map(([lbl,val,bg,c])=>(
                <div key={lbl} style={{flex:1,textAlign:"center",padding:8,borderRadius:8,background:`#${bg}`}}>
                  <div style={{fontSize:16,fontWeight:800,color:`#${c}`}}>₹{Math.round(val)}</div>
                  <div style={{fontSize:9,color:`#${c}`,fontWeight:700}}>{lbl}/hr</div>
                </div>
              ))}
            </div>
          </div>
          <div className="card" style={{border:"2px solid #1b5e20"}}>
            <div style={{fontSize:10,fontWeight:700,color:"#1b5e20",marginBottom:8}}>MODEL 2 — Variable Electricity (+5% buffer)</div>
            <div style={{display:"flex",gap:6}}>
              {[["TF N1",m2N1,"FFE0E0","b71c1c"],["TF N2",m2N2,"FFF9C4","7b5800"],["TF N3",m2N3,"E8F5E9","1b5e20"]].map(([lbl,val,bg,c])=>(
                <div key={lbl} style={{flex:1,textAlign:"center",padding:8,borderRadius:8,background:`#${bg}`}}>
                  <div style={{fontSize:16,fontWeight:800,color:`#${c}`}}>₹{Math.round(val)}</div>
                  <div style={{fontSize:9,color:`#${c}`,fontWeight:700}}>{lbl}/hr</div>
                </div>
              ))}
            </div>
            <div style={{fontSize:9,color:"var(--mut)",marginTop:6}}>Elec: ₹{epk.toFixed(2)}/kg | True Fixed: ₹{Math.round(truFixed/1e5)}L</div>
          </div>
        </div>

        {/* Model toggle */}
        <div style={{display:"flex",gap:6,marginBottom:10,alignItems:"center"}}>
          <span style={{fontSize:11,color:"var(--mut)"}}>Show:</span>
          {[["both","Dono Models"],["m1","Model 1 Only"],["m2","Model 2 Only"]].map(([v,lbl])=>(
            <button key={v} className={`btn btn-sm ${pxModel===v?"btn-p":"btn-o"}`} onClick={()=>setPxModel(v)}>{lbl}</button>
          ))}
          <div className="sr" style={{flex:1,marginBottom:0}}>
            <Search size={13} className="sr-ic"/>
            <input className="inp" placeholder="Search item..." value={pxQ} onChange={e=>setPxQ(e.target.value)}/>
          </div>
        </div>

        {/* Items table */}
        {pxLoad?<div className="card empty"><p>Loading...</p></div>
          :<div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:700}}>
              <thead>
                <tr style={{background:"var(--card2)"}}>
                  <th style={{padding:"8px 10px",textAlign:"left",fontSize:10,color:"var(--mut)",textTransform:"uppercase"}}>Item</th>
                  <th style={{padding:"8px 6px",fontSize:10,color:"var(--mut)"}}>Ton</th>
                  <th style={{padding:"8px 6px",fontSize:10,color:"var(--mut)"}}>List ₹</th>
                  <th style={{padding:"8px 6px",fontSize:10,color:"var(--mut)"}}>Daana</th>
                  <th style={{padding:"8px 6px",fontSize:10,color:"var(--mut)"}}>MB+Box+Poly</th>
                  <th style={{padding:"8px 6px",fontSize:10,color:"var(--mut)"}}>MH</th>
                  {(pxModel==="m1"||pxModel==="both")&&<>
                    <th style={{padding:"8px 6px",fontSize:10,color:"#b71c1c",background:"#fff5f5"}}>M1 Floor</th>
                    <th style={{padding:"8px 6px",fontSize:10,color:"#b71c1c",background:"#fff5f5"}}>M1 Happy</th>
                    <th style={{padding:"8px 6px",fontSize:10,color:"#b71c1c",background:"#fff5f5"}}>M1 Super</th>
                    <th style={{padding:"8px 6px",fontSize:10,color:"#b71c1c",background:"#fff5f5"}}>M1 Zone</th>
                  </>}
                  {pxModel==="both"&&<th style={{padding:"8px 4px",background:"#f5f5f5"}}/>}
                  {(pxModel==="m2"||pxModel==="both")&&<>
                    <th style={{padding:"8px 6px",fontSize:10,color:"#1b5e20",background:"#f5fff5"}}>M2 Floor</th>
                    <th style={{padding:"8px 6px",fontSize:10,color:"#1b5e20",background:"#f5fff5"}}>M2 Happy</th>
                    <th style={{padding:"8px 6px",fontSize:10,color:"#1b5e20",background:"#f5fff5"}}>M2 Super</th>
                    <th style={{padding:"8px 6px",fontSize:10,color:"#1b5e20",background:"#f5fff5"}}>M2 Zone</th>
                  </>}
                </tr>
              </thead>
              <tbody>
                {list.map(row=>{
                  const f=calcFloors(row);
                  const zBadge=(z,model)=>{
                    const colors={N3:{c:"#10b981",bg:"rgba(16,185,129,.1)"},N2:{c:"#f59e0b",bg:"rgba(245,158,11,.1)"},N1:{c:"#f97316",bg:"rgba(249,115,22,.1)"},RED:{c:"#ef4444",bg:"rgba(239,68,68,.1)"}};
                    const cl=colors[z]||colors.N1;
                    return <span style={{padding:"2px 8px",borderRadius:10,fontSize:10,fontWeight:700,background:cl.bg,color:cl.c}}>{(z==="RED"?"🔴 LOSS":z==="N1"?"🟡 Floor":z==="N2"?"🟨 Happy":z==="N3"?"🟩 Super Happy":z)}</span>;
                  };
                  return (
                    <tr key={row.id} style={{borderBottom:"1px solid var(--bdr)"}}>
                      <td style={{padding:"8px 10px",fontWeight:600}}>{row.item_name}</td>
                      <td style={{padding:"8px 6px",textAlign:"center",color:"var(--mut)",fontSize:10}}>{row.tonnage}</td>
                      <td style={{padding:"8px 6px",textAlign:"center"}}>
                        <input type="number" defaultValue={row.list_price}
                          onBlur={e=>e.target.value!=row.list_price&&pxUpdatePrice(row.id,e.target.value)}
                          style={{width:64,padding:4,textAlign:"center",border:"1px solid var(--bdr)",borderRadius:6,background:"transparent",color:"inherit",fontSize:12}}/>
                      </td>
                      <td style={{padding:"8px 6px",textAlign:"center",fontSize:11,color:"var(--mut)"}}>{f.daana?fr2(f.daana):"—"}</td>
                      <td style={{padding:"8px 6px",textAlign:"center",fontSize:11,color:"var(--mut)"}}>{f.mb!=null?fr2((f.mb||0)+(f.carton||0)+(f.poly||0)+(f.tape||0)):"—"}</td>
                      <td style={{padding:"8px 6px",textAlign:"center",fontSize:11,color:"var(--mut)"}}>{f.mh?f.mh.toFixed(3):"—"}</td>
                      {(pxModel==="m1"||pxModel==="both")&&<>
                        <td style={{padding:"8px 6px",textAlign:"center",fontWeight:700,color:"#b71c1c",background:"#fff5f5"}}>{fr2(f.m1Floor)}</td>
                        <td style={{padding:"8px 6px",textAlign:"center",background:"#fff5f5"}}>{fr2(f.m1Happy)}</td>
                        <td style={{padding:"8px 6px",textAlign:"center",background:"#fff5f5",color:"var(--mut)"}}>{fr2(f.m1Super)}</td>
                        <td style={{padding:"8px 6px",textAlign:"center",background:"#fff5f5"}}>{zBadge(f.m1Zone,"m1")}</td>
                      </>}
                      {pxModel==="both"&&<td style={{padding:0,background:"#f0f0f0",width:4}}/>}
                      {(pxModel==="m2"||pxModel==="both")&&<>
                        <td style={{padding:"8px 6px",textAlign:"center",fontWeight:700,color:"#1b5e20",background:"#f5fff5"}}>{fr2(f.m2Floor)}</td>
                        <td style={{padding:"8px 6px",textAlign:"center",background:"#f5fff5"}}>{fr2(f.m2Happy)}</td>
                        <td style={{padding:"8px 6px",textAlign:"center",background:"#f5fff5",color:"var(--mut)"}}>{fr2(f.m2Super)}</td>
                        <td style={{padding:"8px 6px",textAlign:"center",background:"#f5fff5"}}>{zBadge(f.m2Zone,"m2")}</td>
                      </>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>}
      </div>
    );
  };


  /* ── PRODUCTION DASHBOARD (Admin only) ── */
  const Production = () => {
    const [prodData, setProdData] = useState(null);
    const [prodLoad, setProdLoad] = useState(false);
    const [lastData, setLastData] = useState(null); // last month

    const N1=1097, N2=1615, N3=1938;
    const FIXED=pxThis.fixed||9800000;
    const TARGET_MH = 345 * 30; // 15 machines × 23h × 30 days = 10,350h/month

    const zc2=(z)=>({
      N3:{c:"#10b981",bg:"rgba(16,185,129,.15)"},
      N2:{c:"#f59e0b",bg:"rgba(245,158,11,.15)"},
      N1:{c:"#f97316",bg:"rgba(249,115,22,.15)"},
      RED:{c:"#ef4444",bg:"rgba(239,68,68,.15)"}
    }[z]||{c:"#666",bg:"#f5f5f5"});

    const zoneName=(z)=>z==="RED"?"🔴 LOSS":z==="N1"?"🟡 Floor":z==="N2"?"🟨 Happy":"🟩 Super Happy";

    const [utilRaw, setUtilRaw] = useState(null); // Raw utilization from production table

    const loadProduction = async() => {
      setProdLoad(true);
      try {
        const now = new Date();
        // Days elapsed this month (1st to today)
        const daysThisMonth = now.getDate();
        // Days in last month
        const lastMonthDays = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
        // Total days to fetch = this month + last month
        const totalDays = daysThisMonth + lastMonthDays;

        // Fetch enough data to cover both months
        const r1 = await fetch(`https://mayur-mos.vercel.app/api/throughput?days=${totalDays}`);
        const d1 = await r1.json();

        if(d1?.daily) {
          // Split by calendar month
          const currMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
          const lastMonth = `${now.getFullYear()}-${String(now.getMonth()).padStart(2,'0')}`;
          // Handle January edge case
          const lastMonthStr = now.getMonth()===0
            ? `${now.getFullYear()-1}-12`
            : `${now.getFullYear()}-${String(now.getMonth()).padStart(2,'0')}`;

          const currDays = d1.daily.filter(d=>d.date.startsWith(currMonth));
          const lastDays = d1.daily.filter(d=>d.date.startsWith(lastMonthStr));

          // Current month data
          setProdData({...d1, daily: currDays});

          // Last month summary
          if(lastDays.length>0) {
            setLastData({
              daily: lastDays,
              total_mh: lastDays.reduce((a,d)=>a+d.total_mh,0),
              total_throughput: lastDays.reduce((a,d)=>a+(d.total_throughput||0),0),
              avg_t_hr: Math.round(lastDays.reduce((a,d)=>a+(d.avg_t_hr||0),0)/lastDays.length),
              label: lastMonthStr.slice(0,7),
              days: lastDays.length,
            });
          }
        }

        // Raw utilization — last 30 days (close enough for utilization)
        const r3 = await fetch("https://mayur-mos.vercel.app/api/utilization?days=30");
        const d3 = await r3.json();
        if(d3?.summary) setUtilRaw(d3);
      } catch(e) { }
      setProdLoad(false);
    };

    useEffect(()=>{
      loadProduction();
      if(pxRows.length===0) loadPricing();
      // Retry pricing load after 2s if still empty
      const t = setTimeout(()=>{ if(pxRows.length===0) loadPricing(); }, 2000);
      return ()=>clearTimeout(t);
    },[]);

    // Current month aggregates
    const curr = prodData?.daily ? {
      total_mh: prodData.daily.reduce((a,d)=>a+d.total_mh,0),
      total_t: prodData.daily.reduce((a,d)=>a+(d.total_throughput||d.avg_t_hr*(d.total_mh||0)||0),0),
      days: prodData.daily.length,
      avg_t_hr: prodData.daily.length ? prodData.daily.reduce((a,d)=>a+d.avg_t_hr,0)/prodData.daily.length : 0,
    } : null;

    const dynN1 = curr ? Math.round(FIXED/curr.total_mh) : N1;
    const dynN2 = curr ? Math.round((FIXED+5000000)/curr.total_mh) : N2;
    // actN1/actN2/actN3 — use standard SCU=9660 for pricing
    // (partial month mein actual MH se N1 distort ho jaata hai)
    const actN1 = 1097; // Fixed ÷ 9660
    const actN2 = 1615; // (Fixed+Happy) ÷ 9660
    const actN3 = 1938;
    const currZone = curr?.avg_t_hr < actN1 ? "RED" : curr?.avg_t_hr < actN2 ? "N1" : curr?.avg_t_hr < actN3 ? "N2" : "N3";

    // Item-wise monthly aggregation — recalculates when pxRows loads
    const itemMonthly = useMemo(()=>{ if(!prodData?.daily) return []; return (()=>{
      const map = {};
      prodData.daily.forEach(day => {
        (day.items||[]).forEach(it => {
          if(!map[it.product]) map[it.product] = {
            product:it.product, price_item_name:it.price_item_name,
            floor_price:it.floor||it.floor_price||0,
            happy_price:it.happy||it.happy_price||0,
            list_price:it.list_price||0, daana_cost:it.daana_cost||0,
            total_t:0, total_mh:0, good_parts:0,
            weighted_thr:0, zone_counts:{N3:0,N2:0,N1:0,RED:0}
          };
          const mh = it.total_mh||0;
          const thr = it.t_hr||0;
          // Use weighted avg T/hr from MOS (t_hr × mh for weighted avg)
          map[it.product].weighted_thr += thr * mh;
          map[it.product].total_mh += mh;
          map[it.product].good_parts += it.good_parts||0;
          // Throughput = t_hr × mh (total throughput this item this day)
          map[it.product].total_t += thr * mh;
          const z = thr<dynN1?"RED":thr<dynN2?"N1":thr<dynN2*1.2?"N2":"N3";
          map[it.product].zone_counts[z] = (map[it.product].zone_counts[z]||0)+1;
        });
      });
      return Object.values(map).map(it=>({
        ...it,
        avg_t_hr: it.total_mh>0 ? Math.round(it.weighted_thr/it.total_mh) : 0,
        zone: it.total_mh>0 ? (
          it.weighted_thr/it.total_mh<actN1?"RED":
          it.weighted_thr/it.total_mh<actN2?"N1":
          it.weighted_thr/it.total_mh<actN3?"N2":"N3"
        ) : "RED"
      })).sort((a,b)=>b.avg_t_hr-a.avg_t_hr);
    })();}, [prodData, pxRows, pxDaana, pxThis]);

    return (
      <div>
        <div className="sh">
          <div>
            <div className="sh-t">🏭 Monthly Production Performance</div>
            <div className="sh-s">MOS se real data · Last 30 days · Monthly throughput accurate hai</div>
          </div>
          <button className="btn btn-o btn-sm" onClick={loadProduction} disabled={prodLoad}>
            {prodLoad?"Loading...":"🔄 Refresh"}
          </button>
        </div>

        {prodLoad&&<div className="card empty"><p>Loading MOS data...</p></div>}

        {curr&&(
          <>
            {/* Monthly KPI cards */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
              {[
                ["Total MH (30d)", (utilRaw?.summary?.total_mh||Math.round(curr.total_mh))+"h", TARGET_MH+"h target", (utilRaw?.summary?.avg_util_pct||curr.total_mh/TARGET_MH*100)>=85?"#E8F5E9":"#FFF3E0", (utilRaw?.summary?.avg_util_pct||0)>=85?"#1B5E20":"#E65100"],
                ["Utilization", (utilRaw?.summary?.avg_util_pct||Math.round(curr.total_mh/TARGET_MH*100))+"%", (utilRaw?.summary?.days||curr.days)+" days · raw data", (utilRaw?.summary?.avg_util_pct||0)>=85?"#E8F5E9":"#FFF3E0", (utilRaw?.summary?.avg_util_pct||0)>=85?"#1B5E20":"#E65100"],
                ["Avg T/hr", "₹"+Math.round(curr.avg_t_hr), zoneName(currZone), zc2(currZone).bg, zc2(currZone).c],
                ["Monthly Throughput", "₹"+(curr.total_t/1e5).toFixed(1)+"L", "Price − Daana", "#E3F2FD","#1565C0"],
              ].map(([lbl,val,sub,bg,c])=>(
                <div key={lbl} style={{background:bg,border:`1px solid ${c}33`,borderRadius:10,padding:14,textAlign:"center"}}>
                  <div style={{fontSize:10,color:"var(--mut)",marginBottom:4}}>{lbl}</div>
                  <div style={{fontSize:20,fontWeight:800,color:c}}>{val}</div>
                  <div style={{fontSize:10,color:"var(--mut)",marginTop:3}}>{sub}</div>
                </div>
              ))}
            </div>

            {/* Zone progress bar */}
            <div className="card" style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                <span style={{fontWeight:700,fontSize:13}}>Monthly Zone — {zoneName(currZone)}</span>
                <span style={{fontSize:12,color:"var(--mut)"}}>N1=₹{actN1} N2=₹{actN2} N3=₹{actN3} (Standard SCU 9660 based)</span>
              </div>
              <div style={{background:"var(--card2)",borderRadius:8,height:20,position:"relative",overflow:"hidden"}}>
                <div style={{
                  height:"100%",
                  width:`${Math.min(curr.avg_t_hr/actN2*100,100)}%`,
                  background:zc2(currZone).c,
                  borderRadius:8,transition:"width .5s"
                }}/>
                <span style={{position:"absolute",right:8,top:0,fontSize:11,lineHeight:"20px",fontWeight:700}}>
                  ₹{Math.round(curr.avg_t_hr)}/hr
                </span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"var(--mut)",marginTop:4}}>
                <span>₹0</span>
                <span>Floor ₹{actN1}</span>
                <span>Happy ₹{actN2}</span>
                <span>Super ₹{actN3}</span>
              </div>
            </div>

            {/* Gap to Happy analysis */}
            {curr&&(()=>{
              const gap = actN2 - curr.avg_t_hr;
              const monthlyGap = Math.round(gap * curr.total_mh / 1e5 * 10)/10;
              const isAbove = gap <= 0;
              return (
                <div className="card" style={{
                  background: isAbove ? "rgba(16,185,129,.08)" : "rgba(245,158,11,.08)",
                  border: `1px solid ${isAbove?"#10b981":"#f59e0b"}`,
                  marginBottom:14
                }}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                    <div style={{textAlign:"center"}}>
                      <div style={{fontSize:10,color:"var(--mut)",marginBottom:4}}>Gap to Happy (N2)</div>
                      <div style={{fontSize:22,fontWeight:800,color:isAbove?"#10b981":"#f59e0b"}}>
                        {isAbove?"+":"−"}₹{Math.abs(Math.round(gap))}/hr
                      </div>
                      <div style={{fontSize:10,color:"var(--mut)"}}>
                        {isAbove?"N2 se upar ho!":"₹"+Math.round(actN2)+" chahiye, ₹"+Math.round(curr.avg_t_hr)+" aa raha hai"}
                      </div>
                    </div>
                    <div style={{textAlign:"center"}}>
                      <div style={{fontSize:10,color:"var(--mut)",marginBottom:4}}>Monthly Opportunity</div>
                      <div style={{fontSize:22,fontWeight:800,color:isAbove?"#10b981":"#ef4444"}}>
                        {isAbove?"+":"−"}₹{Math.abs(monthlyGap)}L
                      </div>
                      <div style={{fontSize:10,color:"var(--mut)"}}>
                        {isAbove?"Extra profit this month!":"Is mahine itna miss ho raha hai"}
                      </div>
                    </div>
                    <div style={{textAlign:"center"}}>
                      <div style={{fontSize:10,color:"var(--mut)",marginBottom:4}}>Fix karo</div>
                      <div style={{fontSize:13,fontWeight:700,color:"#f97316",lineHeight:1.4}}>
                        {isAbove?"🟩 N2 achieve!" : gap>300?"🔴 RCT band karo":"🟡 Mix shift karo"}
                      </div>
                      <div style={{fontSize:10,color:"var(--mut)",marginTop:4}}>
                        {isAbove?"Target achieve!" : "RCT → SSRE/Containers shift karo"}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* This month vs last month — Pro Rata */}
            {lastData&&curr&&(()=>{
              const currDays = prodData?.daily?.length||1;
              const lastDays = lastData.daily?.length||1;
              const lastAvg = lastData.avg_t_hr||0;
              const lastT = lastData.total_throughput||lastData.daily?.reduce((a,d)=>a+(d.total_throughput||0),0)||0;
              const lastMH = lastData.total_mh||0;
              // Pro rata: scale last month to same days as current month
              const proMH = Math.round(lastMH/lastDays*currDays);
              const proT = Math.round(lastT/lastDays*currDays);
              return (
                <div className="card" style={{marginBottom:14}}>
                  <div style={{fontWeight:700,fontSize:13,marginBottom:4}}>📊 Is Mahine vs Pichla Mahina</div>
                  <div style={{fontSize:10,color:"var(--mut)",marginBottom:12}}>
                    Is mahina: <b>{currDays} din</b> · {lastData.label||"Jul"}: <b>{lastDays} din</b> · Pro Rata = {lastDays} din data ko {currDays} din pe scale kiya
                  </div>
                  <div style={{overflowX:"auto"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                      <thead>
                        <tr style={{background:"var(--card2)"}}>
                          <th style={{padding:"8px 10px",fontSize:10,color:"var(--mut)",textAlign:"left"}}></th>
                          <th style={{padding:"8px 10px",fontSize:10,color:"var(--mut)",textAlign:"center"}}>Is Mahina<br/><span style={{fontWeight:400}}>({currDays} din)</span></th>
                          <th style={{padding:"8px 10px",fontSize:10,color:"var(--mut)",textAlign:"center"}}>{lastData.label||"Jul"}<br/><span style={{fontWeight:400}}>({lastDays} din, poora)</span></th>
                          <th style={{padding:"8px 10px",fontSize:10,color:"#7B5800",textAlign:"center",background:"#FFF9C4"}}>Pro Rata<br/><span style={{fontWeight:400}}>({lastDays} din → {currDays} din)</span></th>
                          <th style={{padding:"8px 10px",fontSize:10,color:"var(--mut)",textAlign:"center"}}>Fark<br/><span style={{fontWeight:400}}>(vs Pro Rata)</span></th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          {lbl:"Total MH", curr:Math.round(curr.total_mh)+"h", last:Math.round(lastMH)+"h", pro:proMH+"h", diff:curr.total_mh-proMH, isRs:false},
                          {lbl:"Avg T/hr", curr:"₹"+Math.round(curr.avg_t_hr), last:"₹"+Math.round(lastAvg), pro:"₹"+Math.round(lastAvg), diff:curr.avg_t_hr-lastAvg, isRs:true},
                          {lbl:"Throughput", curr:"₹"+(curr.total_t/1e5).toFixed(1)+"L", last:"₹"+(lastT/1e5).toFixed(1)+"L", pro:"₹"+(proT/1e5).toFixed(1)+"L", diff:curr.total_t-proT, isRs:true},
                        ].map((r,i)=>(
                          <tr key={i} style={{borderBottom:"1px solid var(--bdr)"}}>
                            <td style={{padding:"10px",fontWeight:600}}>{r.lbl}</td>
                            <td style={{padding:"10px",textAlign:"center",fontWeight:700,fontSize:14}}>{r.curr}</td>
                            <td style={{padding:"10px",textAlign:"center",color:"var(--mut)"}}>{r.last}</td>
                            <td style={{padding:"10px",textAlign:"center",background:"#FFF9C4",fontWeight:700,color:"#7B5800"}}>{r.pro}</td>
                            <td style={{padding:"10px",textAlign:"center"}}>
                              <div style={{fontWeight:800,fontSize:13,color:r.diff>0?"#10b981":r.diff<0?"#ef4444":"var(--mut)"}}>
                                {r.diff>0?"▲":r.diff<0?"▼":"="} {r.isRs?"₹"+Math.abs(Math.round(r.diff)):Math.abs(Math.round(r.diff))+"h"}
                              </div>
                              <div style={{fontSize:9,color:"var(--mut)"}}>{r.diff>0?"Better":"Kam"}</div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* Item-wise monthly breakdown */}
            <div className="card" style={{padding:0}}>
              <div style={{padding:"12px 16px",fontWeight:700,fontSize:13,borderBottom:"1px solid var(--bdr)"}}>
                Item-wise Monthly Performance (Last 30 Days)
                <span style={{fontSize:10,color:"var(--mut)",marginLeft:8,fontWeight:400}}>
                  Monthly avg T/hr · {pxRows.length>0?`M1/M2 floor calculated (${pxRows.length} items)`:"Loading pricing..."}
                </span>
              </div>
              <div style={{padding:"8px 16px",background:"var(--card2)",fontSize:10,color:"var(--mut)",
                borderBottom:"1px solid var(--bdr)",display:"flex",gap:16,flexWrap:"wrap"}}>
                <span><b>📐 T/hr</b> = (Price−Daana) ÷ Machine Hours/ctn</span>
                <span><b>M1 Floor</b> = Daana + (Total Fixed÷SCU) × MH</span>
                <span><b>M2 Floor</b> = Daana + Elec(₹/kg×kg) + (True Fixed÷SCU) × MH</span>
                <span><b>vs Floor</b> = List Price − Floor Price</span>
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead>
                    <tr style={{background:"var(--card2)"}}>
                      <tr style={{background:"var(--card2)"}}>
                        <th style={{padding:"6px 8px",fontSize:10,color:"var(--mut)",textAlign:"left"}}>Product</th>
                        <th style={{padding:"6px",fontSize:10,color:"var(--mut)"}}>Pcs</th>
                        <th style={{padding:"6px",fontSize:10,color:"var(--mut)"}}>T/hr 📐</th>
                        <th style={{padding:"6px",fontSize:10,color:"var(--mut)"}}>Eff Zone</th>
                        <th style={{padding:"6px",fontSize:10,color:"#b71c1c",background:"#fff5f5"}}>M1 Floor/Happy 📐</th>
                        <th style={{padding:"6px",fontSize:10,color:"#1b5e20",background:"#f5fff5"}}>M2 Floor/Happy 📐</th>
                        <th style={{padding:"6px",fontSize:10,color:"var(--mut)"}}>Action</th>
                      </tr>
                    </tr>
                  </thead>
                  <tbody>
                    {itemMonthly.map((it,i)=>{
                      // Get floor/happy/super from pxRows
                      // Use MOS floor/happy directly (always available)
                      // If pxRows loaded, recalculate with current daana+fixed
                      const px = findPxRow(it.product, it.price_item_name);
                      const FIXED_TOTAL=pxThis.fixed||9800000,ELEC_BILL=pxThis.elecBill||2452659,SALES_KG=pxThis.salesKg||164297,SCU=pxThis.scu||9660,HAPPY_T=pxThis.happy||5000000;
                      const EPK=(ELEC_BILL/SALES_KG)*1.05;
                      const TRUE_FIXED=FIXED_TOTAL-ELEC_BILL;
                      const m1N1=FIXED_TOTAL/SCU, m1N2=(FIXED_TOTAL+HAPPY_T)/SCU;
                      const m2N1=TRUE_FIXED/SCU, m2N2=(TRUE_FIXED+HAPPY_T)/SCU;
                      const lp=it.list_price||px?.list_price||0; // list_price now from MOS API
                      const gz=(p,f,h)=>!p||!f?"N1":p<f?"RED":p<h?"N1":p<h*1.2?"N2":"N3";
                      const f1 = (() => {
                        if(px) {
                          // Full calculation with current daana
                          const HOMO=Number(pxDaana.homo)||146,CP=Number(pxDaana.cp)||146,RAND=Number(pxDaana.random)||152;
                          const pcs=px.pcs_per_carton||500;
                          const daana=((px.box_homo||0)*HOMO+(px.box_cp||0)*CP+(px.box_random||0)*RAND+(px.lid_homo||0)*HOMO+(px.lid_cp||0)*CP+(px.lid_random||0)*RAND)/1000*pcs;
                          const bMH=(px.box_cav>0&&px.box_cyc>0)?pcs/((3600/px.box_cyc)*px.box_cav):0;
                          const lMH=(px.lid_cav>0&&px.lid_cyc>0)?pcs/((3600/px.lid_cyc)*px.lid_cav):0;
                          const mh=bMH+lMH;
                          const kg=((px.box_wt||0)+(px.lid_wt||0))*pcs/1000;
                          if(!mh) return null;
                          const m1floor=Math.round(daana+m1N1*mh);
                          const m1happy=Math.round(daana+m1N2*mh);
                          const m2floor=Math.round(daana+(EPK*kg)+m2N1*mh);
                          const m2happy=Math.round(daana+(EPK*kg)+m2N2*mh);
                          return {m1floor,m1happy,m1zone:gz(lp,m1floor,m1happy),m2floor,m2happy,m2zone:gz(lp,m2floor,m2happy),list_price:lp};
                        }
                        // Fallback: use MOS floor/happy (from mos_item_pricing)
                        const m1floor=it.floor_price||0;
                        const m1happy=it.happy_price||0;
                        if(!m1floor) return null;
                        return {m1floor,m1happy,m1zone:gz(lp,m1floor,m1happy),m2floor:m1floor,m2happy:m1happy,m2zone:gz(lp,m1floor,m1happy),list_price:lp};
                      })();
                      return (
                      <tr key={i} style={{borderBottom:"1px solid var(--bdr)",
                        background:it.zone==="RED"?"rgba(239,68,68,.04)":"transparent"}}>
                        <td style={{padding:"6px 8px",fontWeight:600,fontSize:11}}>{it.product?.replace(" Container","").replace(" Tamper Evident","").replace(" Rectangle","")}</td>
                        <td style={{padding:"6px",textAlign:"center",fontSize:10}}>{(it.good_parts/1000).toFixed(1)}K</td>
                        <td style={{padding:"6px",textAlign:"center",color:"var(--mut)",fontSize:10}}>{it.total_mh.toFixed(0)}h</td>
                        <td style={{padding:"6px",textAlign:"center",fontWeight:700,color:zc2(it.zone).c,fontSize:12}}>₹{it.avg_t_hr}</td>
                        <td style={{padding:"6px",textAlign:"center"}}>
                          <span style={{padding:"2px 6px",borderRadius:8,fontSize:9,fontWeight:700,
                            background:zc2(it.zone).bg,color:zc2(it.zone).c}}>
                            {it.zone==="RED"?"LOSS":it.zone==="N1"?"Floor":it.zone==="N2"?"Happy":"Super"}
                          </span>
                        </td>
                        {f1?(
                          <>
                            <td style={{padding:"6px",textAlign:"center",background:"#fff5f5"}}>
                              <div style={{fontSize:10,fontWeight:700,color:"#b71c1c"}}>₹{f1.m1floor} / ₹{f1.m1happy}</div>
                              <span style={{padding:"1px 5px",borderRadius:4,fontSize:9,fontWeight:700,
                                background:zc2(f1.m1zone).bg,color:zc2(f1.m1zone).c}}>
                                {f1.m1zone==="RED"?"LOSS":f1.m1zone==="N1"?"Floor":f1.m1zone==="N2"?"Happy":"Super"}
                              </span>
                            </td>
                            <td style={{padding:"6px",textAlign:"center",background:"#f5fff5"}}>
                              <div style={{fontSize:10,fontWeight:700,color:"#1b5e20"}}>₹{f1.m2floor} / ₹{f1.m2happy}</div>
                              <span style={{padding:"1px 5px",borderRadius:4,fontSize:9,fontWeight:700,
                                background:zc2(f1.m2zone).bg,color:zc2(f1.m2zone).c}}>
                                {f1.m2zone==="RED"?"LOSS":f1.m2zone==="N1"?"Floor":f1.m2zone==="N2"?"Happy":"Super"}
                              </span>
                            </td>
                          </>
                        ):(
                          <><td colSpan={4} style={{padding:"8px",textAlign:"center",color:"var(--mut)",fontSize:10}}>—</td></>
                        )}
                        <td style={{padding:"6px",textAlign:"center",fontSize:10,fontWeight:600,
                          color:it.zone==="RED"?"#ef4444":it.zone==="N1"?"#f97316":"#10b981"}}>
                          {it.zone==="RED"?"🔴 Fix":it.zone==="N1"?"🟡 Badhao":it.zone==="N2"?"🟨 Push":"🟩 Chalao!"}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Daily trend — simplified, just MH */}
            <div className="card" style={{marginTop:14,padding:0}}>
              <div style={{padding:"12px 16px",fontWeight:700,fontSize:13,borderBottom:"1px solid var(--bdr)"}}>
                Daily Machine Hours (Raw — Production Table se)
                <span style={{fontSize:10,color:"var(--mut)",marginLeft:8,fontWeight:400}}>
                  Actual machine running hours · Target 345h/day (15×23h)
                </span>
              </div>
              {utilRaw?.weekly&&(
                <div style={{padding:"10px 16px",borderBottom:"1px solid var(--bdr)",display:"flex",gap:8,flexWrap:"wrap"}}>
                  {utilRaw.weekly.map((w,i)=>(
                    <div key={i} style={{padding:"6px 12px",borderRadius:8,fontSize:11,
                      background:w.util_pct>=90?"rgba(16,185,129,.1)":w.util_pct>=75?"rgba(245,158,11,.1)":"rgba(239,68,68,.1)",
                      border:`1px solid ${w.util_pct>=90?"#10b981":w.util_pct>=75?"#f59e0b":"#ef4444"}`}}>
                      <span style={{fontWeight:700}}>{w.week.slice(5)}</span>
                      <span style={{color:"var(--mut)",margin:"0 4px"}}>week:</span>
                      <span style={{fontWeight:700}}>{w.util_pct}%</span>
                      <span style={{color:"var(--mut)",fontSize:10,marginLeft:4}}>({w.avg_mh}h/day)</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead>
                    <tr style={{background:"var(--card2)"}}>
                      {["Date","Day","Actual MH","Target (345h)","Gap","Utilization"].map(h=>(
                        <th key={h} style={{padding:"7px 10px",fontSize:10,color:"var(--mut)",textAlign:h==="Date"?"left":"center"}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Use raw utilization data if available, else fall back to view data */}
                    {[...(utilRaw?.daily||prodData?.daily||[])].sort((a,b)=>b.date.localeCompare(a.date)).map((d,i)=>{
                      const mh=Math.round((d.raw_mh||d.total_mh||0)*10)/10;
                      const util=Math.round(mh/345*100);
                      const gap=Math.round(345-mh);
                      const dayName=new Date(d.date).toLocaleDateString("en-IN",{weekday:"short"});
                      return (
                        <tr key={i} style={{borderBottom:"1px solid var(--bdr)",
                          background:util<60?"rgba(239,68,68,.04)":util>=95?"rgba(16,185,129,.04)":"transparent"}}>
                          <td style={{padding:"7px 10px",fontWeight:600}}>{d.date.slice(5)}</td>
                          <td style={{padding:"7px 10px",color:"var(--mut)",fontSize:11}}>{dayName}</td>
                          <td style={{padding:"7px 10px",textAlign:"center",fontWeight:700,
                            color:mh>=300?"#10b981":mh>=200?"#f59e0b":"#ef4444"}}>{mh}h</td>
                          <td style={{padding:"7px 10px",textAlign:"center",color:"var(--mut)"}}>345h</td>
                          <td style={{padding:"7px 10px",textAlign:"center",
                            color:gap>100?"#ef4444":gap>50?"#f59e0b":"#10b981"}}>
                            {gap>0?"-"+gap:"+"+(Math.abs(gap))}h
                          </td>
                          <td style={{padding:"7px 10px",textAlign:"center"}}>
                            <div style={{display:"flex",alignItems:"center",gap:6}}>
                              <div style={{flex:1,background:"var(--card2)",borderRadius:4,height:14,overflow:"hidden"}}>
                                <div style={{height:"100%",width:`${Math.min(util,100)}%`,
                                  background:util>=95?"#10b981":util>=80?"#f59e0b":"#ef4444"}}/>
                              </div>
                              <span style={{fontSize:10,fontWeight:700,width:32}}>{util}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  const Analytics = () => {
    const [anTab, setAnTab] = useState("model");
    const [anProd, setAnProd] = useState(null);
    const [anLoad, setAnLoad] = useState(false);
    const [wiItem, setWiItem] = useState(null);
    const [wiPcs, setWiPcs] = useState(0);
    const [selDate, setSelDate] = useState(new Date(Date.now()-86400000).toISOString().slice(0,10));
    const [monthlyMH, setMonthlyMH] = useState(null);
    // Lid balance state — moved here to avoid IIFE useState error
    const [lidPlan, setLidPlan] = useState({});
    const [lidM, setLidM] = useState({
      "Common Lid":2,"100ml Lid":1,"175ml Lid":1,"250ml Lid":1,
      "Big Common Lid":1,"Oval Lid":1,"2000ml Lid":1,"Rectangle Lid":1,"SSRE Lid":1
    });
    const [utilData, setUtilData] = useState([]);
    const [utilLoad, setUtilLoad] = useState(false);
    useEffect(()=>{ if(pxRows.length===0) loadPricing(); },[]);
    useEffect(()=>{
      setUtilLoad(true);
      fetch("https://mayur-mos.vercel.app/api/throughput?days=30")
        .then(r=>r.json())
        .then(d=>{ if(d?.daily) setUtilData(d.daily); setUtilLoad(false); })
        .catch(()=>setUtilLoad(false));
    },[]);

    const HOMO=Number(pxDaana.homo)||146, CP=Number(pxDaana.cp)||146, RAND=Number(pxDaana.random)||152;
    const MB_B=180, MB_M=225, POLY=225, TAPE=10;
    const FIXED=pxThis.fixed||9800000, ELEC_BILL=pxThis.elecBill||2452659, KG=pxThis.salesKg||164297, SCU=pxThis.scu||9660, HAPPY=pxThis.happy||5000000;
    const TRUE_FIXED=FIXED-ELEC_BILL;
    const EPK=(ELEC_BILL/KG)*1.05;

    // Model 1
    const m1N1=FIXED/SCU, m1N2=(FIXED+HAPPY)/SCU, m1N3=m1N2*1.2;
    // Model 2
    const m2N1=TRUE_FIXED/SCU, m2N2=(TRUE_FIXED+HAPPY)/SCU, m2N3=m2N2*1.2;

    const fr3=(v)=>v!=null?("₹"+Math.round(v).toLocaleString("en-IN")):"—";
    const zc=(z)=>({N3:{c:"#10b981",bg:"rgba(16,185,129,.1)"},N2:{c:"#f59e0b",bg:"rgba(245,158,11,.1)"},N1:{c:"#f97316",bg:"rgba(249,115,22,.1)"},RED:{c:"#ef4444",bg:"rgba(239,68,68,.1)"}}[z]||{c:"#666",bg:"#f5f5f5"});

    const getFloor=(row,model="m1")=>{
      if(!row) return null;
      const pcs=row.pcs_per_carton||500;
      const daana=((row.box_homo||0)*HOMO+(row.box_cp||0)*CP+(row.box_random||0)*RAND+
                   (row.lid_homo||0)*HOMO+(row.lid_cp||0)*CP+(row.lid_random||0)*RAND)/1000*pcs;
      const bMH=(row.box_cav>0&&row.box_cyc>0)?pcs/((3600/row.box_cyc)*row.box_cav):0;
      const lMH=(row.lid_cav>0&&row.lid_cyc>0)?pcs/((3600/row.lid_cyc)*row.lid_cav):0;
      const mh=bMH+lMH;
      const kg=((row.box_wt||0)+(row.lid_wt||0))*pcs/1000;
      const mbR=(row.colour||"").toLowerCase()==="milky"?MB_M:MB_B;
      const mb=kg*0.02*mbR;
      const crt=row.carton_cost||0;
      const poly=((row.poly_gm||0)/1000)*POLY;
      const varC=daana+mb+crt+poly+TAPE;
      if(!mh) return null;
      if(model==="m1") return {floor:varC+m1N1*mh, happy:varC+m1N2*mh, super_:varC+m1N3*mh, daana, mb, crt, poly, mh, kg, varC};
      return {floor:varC+(EPK*kg)+m2N1*mh, happy:varC+(EPK*kg)+m2N2*mh, super_:varC+(EPK*kg)+m2N3*mh, daana, mb, crt, poly, elec:EPK*kg, mh, kg, varC};
    };

    const getZone=(price,f)=>{
      if(!f||!price) return "—";
      return price<f.floor?"RED":price<f.happy?"N1":price<f.super_?"N2":"N3";
    };

    // Load production for throughput tab
    const loadAnProd = async(date) => {
      setAnLoad(true);
      try {
        // Load selected date data
        const res = await fetch(`https://mayur-mos.vercel.app/api/throughput?date=${date}`);
        const data = await res.json();
        setAnProd(data);
        // Also load last 30 days for avg MH
        const res30 = await fetch(`https://mayur-mos.vercel.app/api/throughput?days=30`);
        const data30 = await res30.json();
        if(data30?.daily?.length>0){
          const totalMH = data30.daily.reduce((a,d)=>a+d.total_mh,0);
          const avgMH = totalMH / data30.daily.length;
          setMonthlyMH({total:Math.round(totalMH), avg:Math.round(avgMH), days:data30.daily.length});
        }
      } catch(e) {}
      setAnLoad(false);
    };
    // Dynamic N1 based on actual monthly MH
    const dynN1 = monthlyMH ? Math.round(FIXED/(monthlyMH.total)) : Math.round(FIXED/SCU);
    const dynN2 = monthlyMH ? Math.round((FIXED+HAPPY)/(monthlyMH.total)) : Math.round((FIXED+HAPPY)/SCU);
    const dynN3 = Math.round(dynN2*1.20);

    const TABS = [
      {id:"model", lbl:"📊 Model 1 vs 2"},
      {id:"throughput", lbl:"⚙️ Throughput Breakdown"},
      {id:"utilization", lbl:"🏭 Machine Utilization"},
      {id:"floor", lbl:"📈 Floor Price Analysis"},
      {id:"whatif", lbl:"🔮 What-If Calculator"},
    ];

    return (
      <div>
        <div className="sh">
          <div>
            <div className="sh-t">📊 Analytics — Deep Dive</div>
            <div className="sh-s">Model comparison · Throughput · Floor price analysis · What-if</div>
          </div>
        </div>

        {/* Sub tabs */}
        <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
          {TABS.map(t=>(
            <button key={t.id} className={`btn btn-sm ${anTab===t.id?"btn-p":"btn-o"}`}
              onClick={()=>setAnTab(t.id)}>{t.lbl}</button>
          ))}
        </div>

        {/* ── TAB 1: Model 1 vs Model 2 ── */}
        {anTab==="model"&&(
          <div>
            {/* Concept cards */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
              <div className="card" style={{border:"2px solid #b71c1c"}}>
                <div style={{fontWeight:800,color:"#b71c1c",marginBottom:10,fontSize:13}}>🔴 MODEL 1 — Simple (30% Blended)</div>
                <div style={{fontSize:12,lineHeight:1.8,color:"var(--txt)"}}>
                  <div style={{background:"#fff5f5",padding:10,borderRadius:8,fontFamily:"monospace",fontSize:11,marginBottom:8}}>
                    <div>Floor = Daana + (Total Fixed ÷ SCU) × MH</div>
                    <div style={{fontSize:9,color:"#b71c1c",marginTop:4}}>
                      N1 = ₹{Math.round(m1N1)}/hr · N2 = ₹{Math.round(m1N2)}/hr · SCU = {pxThis.scu||9660}h
                    </div>
                  </div>
                  <div>✅ <b>Electricity</b> Fixed mein included hai</div>
                  <div>✅ <b>MB + Box + Tape</b> Fixed mein included</div>
                  <div>✅ Simple — sirf Fixed Cost ÷ SCU</div>
                  <div style={{marginTop:8,padding:8,background:"#fff5f5",borderRadius:6}}>
                    <div style={{fontSize:10,color:"var(--mut)"}}>Current thresholds</div>
                    <div>N1: <b>₹{Math.round(m1N1)}</b> · N2: <b>₹{Math.round(m1N2)}</b> · N3: <b>₹{Math.round(m1N3)}</b></div>
                  </div>
                </div>
              </div>
              <div className="card" style={{border:"2px solid #1b5e20"}}>
                <div style={{fontWeight:800,color:"#1b5e20",marginBottom:10,fontSize:13}}>🟢 MODEL 2 — Variable Electricity</div>
                <div style={{fontSize:12,lineHeight:1.8,color:"var(--txt)"}}>
                  <div style={{background:"#f5fff5",padding:10,borderRadius:8,fontFamily:"monospace",fontSize:11,marginBottom:8}}>
                    Floor = VarCosts + Elec(Rs/kg x kg) + (True Fixed / SCU) x MH
                  </div>
                  <div>✅ <b>Electricity alag</b> — weight se proportional</div>
                  <div>✅ Bhaari item = zyada electricity cost</div>
                  <div>✅ True Fixed = Total Fixed − Electricity</div>
                  <div style={{marginTop:8,padding:8,background:"#f5fff5",borderRadius:6}}>
                    <div style={{fontSize:10,color:"var(--mut)"}}>True Fixed N1 thresholds</div>
                    <div>TF N1: <b>₹{Math.round(m2N1)}</b> · TF N2: <b>₹{Math.round(m2N2)}</b> · TF N3: <b>₹{Math.round(m2N3)}</b></div>
                    <div style={{fontSize:10,color:"var(--mut)",marginTop:4}}>Elec ₹/kg: <b>₹{EPK.toFixed(2)}</b> (+5% buffer)</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Comparison table */}
            <div className="card" style={{padding:0}}>
              <div style={{padding:"12px 16px",fontWeight:700,fontSize:13,borderBottom:"1px solid var(--bdr)"}}>
                Item-wise Comparison — M1 vs M2 Floor Price
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead>
                    <tr style={{background:"var(--card2)"}}>
                      <th style={{padding:"8px 12px",textAlign:"left",fontSize:10,color:"var(--mut)"}}>Item</th>
                      <th style={{padding:"8px 8px",fontSize:10,color:"var(--mut)"}}>List ₹</th>
                      <th style={{padding:"8px 8px",fontSize:10,color:"var(--mut)"}}>Daana</th>
                      <th style={{padding:"8px 8px",fontSize:10,color:"var(--mut)"}}>MB+Box+Poly+Tape</th>
                      <th style={{padding:"8px 8px",fontSize:10,color:"var(--mut)"}}>MH/ctn</th>
                      <th style={{padding:"8px 8px",fontSize:10,color:"#b71c1c",background:"#fff5f5"}}>M1 Floor</th>
                      <th style={{padding:"8px 8px",fontSize:10,color:"#b71c1c",background:"#fff5f5"}}>M1 Zone</th>
                      <th style={{padding:"8px 4px",background:"#f0f0f0",width:8}}/>
                      <th style={{padding:"8px 8px",fontSize:10,color:"#1b5e20",background:"#f5fff5"}}>Elec/ctn</th>
                      <th style={{padding:"8px 8px",fontSize:10,color:"#1b5e20",background:"#f5fff5"}}>M2 Floor</th>
                      <th style={{padding:"8px 8px",fontSize:10,color:"#1b5e20",background:"#f5fff5"}}>M2 Zone</th>
                      <th style={{padding:"8px 8px",fontSize:10,color:"var(--mut)"}}>Fark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pxRows.map(row=>{
                      const f1=getFloor(row,"m1");
                      const f2=getFloor(row,"m2");
                      if(!f1||!f2) return null;
                      const z1=getZone(row.list_price,f1);
                      const z2=getZone(row.list_price,f2);
                      const fark=Math.round(f2.floor-f1.floor);
                      return (
                        <tr key={row.id} style={{borderBottom:"1px solid var(--bdr)"}}>
                          <td style={{padding:"8px 12px",fontWeight:600,fontSize:12}}>{row.item_name}</td>
                          <td style={{padding:"8px 8px",textAlign:"center"}}>{fr3(row.list_price)}</td>
                          <td style={{padding:"8px 8px",textAlign:"center",color:"var(--mut)"}}>{fr3(f1.daana)}</td>
                          <td style={{padding:"8px 8px",textAlign:"center",color:"var(--mut)"}}>{fr3((f1.mb||0)+(f1.crt||0)+(f1.poly||0)+TAPE)}</td>
                          <td style={{padding:"8px 8px",textAlign:"center",color:"var(--mut)",fontSize:11}}>{f1.mh.toFixed(3)}</td>
                          <td style={{padding:"8px 8px",textAlign:"center",fontWeight:700,color:"#b71c1c",background:"#fff5f5"}}>{fr3(f1.floor)}</td>
                          <td style={{padding:"8px 8px",textAlign:"center",background:"#fff5f5"}}>
                            <span style={{padding:"2px 8px",borderRadius:10,fontSize:10,fontWeight:700,background:zc(z1).bg,color:zc(z1).c}}>{z1==="RED"?"🔴 LOSS":z1==="N1"?"🟡 Floor":z1==="N2"?"🟨 Happy":"🟩 Super Happy"}</span>
                          </td>
                          <td style={{padding:0,background:"#f0f0f0"}}/>
                          <td style={{padding:"8px 8px",textAlign:"center",color:"#1565c0",background:"#f5fff5",fontSize:11}}>{fr3(f2.elec)}</td>
                          <td style={{padding:"8px 8px",textAlign:"center",fontWeight:700,color:"#1b5e20",background:"#f5fff5"}}>{fr3(f2.floor)}</td>
                          <td style={{padding:"8px 8px",textAlign:"center",background:"#f5fff5"}}>
                            <span style={{padding:"2px 8px",borderRadius:10,fontSize:10,fontWeight:700,background:zc(z2).bg,color:zc(z2).c}}>{z2==="RED"?"🔴 LOSS":z2==="N1"?"🟡 Floor":z2==="N2"?"🟨 Happy":"🟩 Super Happy"}</span>
                          </td>
                          <td style={{padding:"8px 8px",textAlign:"center",fontSize:11,
                            color:fark>0?"#ef4444":fark<0?"#10b981":"var(--mut)",fontWeight:fark!==0?700:400}}>
                            {fark>0?"+":""}{fark}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: Throughput Breakdown ── */}
        {anTab==="throughput"&&(
          <div>
            <div style={{display:"flex",gap:8,marginBottom:12,alignItems:"center"}}>
              <input type="date" value={selDate} onChange={e=>setSelDate(e.target.value)}
                className="inp" style={{width:150}}/>
              <button className="btn btn-p" onClick={()=>loadAnProd(selDate)} disabled={anLoad}>
                {anLoad?"Loading...":"Load Data"}
              </button>
            </div>

            {anProd?.daily?.[0]&&(()=>{
              const day=anProd.daily[0];
              return (
                <div>
                  {/* How throughput is calculated — explanation */}
                  <div className="card" style={{background:"#0e1a24",color:"#fff",marginBottom:12}}>
                    <div style={{fontSize:11,color:"#9fb3c0",textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>
                      ⚙️ Throughput Kaise Calculate Hua — {new Date(day.date).toLocaleDateString("en-IN",{day:"2-digit",month:"short"})}
                    </div>
                    {monthlyMH&&(
                      <div style={{display:"flex",gap:10,marginBottom:10}}>
                        {[
                          ["30-Day Total MH",monthlyMH.total+"h","#E3F2FD","#1565C0"],
                          ["30-Day Avg MH/day",monthlyMH.avg+"h/day","#E8F5E9","#1B5E20"],
                          ["Dynamic N1 (actual MH)","₹"+dynN1+"/hr","#FFE0E0","#B71C1C"],
                          ["Dynamic N2 (actual MH)","₹"+dynN2+"/hr","#FFF9C4","#7B5800"],
                        ].map(([lbl,val,bg,c])=>(
                          <div key={lbl} style={{flex:1,background:bg,borderRadius:8,padding:10,textAlign:"center"}}>
                            <div style={{fontSize:9,color:c,fontWeight:700,marginBottom:4}}>{lbl}</div>
                            <div style={{fontSize:16,fontWeight:800,color:c}}>{val}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10,marginBottom:12}}>
                      {[
                        ["Total Cartons","Pieces ÷ Pcs/ctn",Math.round(day.items?.reduce((a,i)=>a+(i.good_parts/(findPxRow(i.product)?.pcs_per_carton||500)),0)||0)+" ctns"],
                        ["Price − Daana","Per carton margin","Avg ₹"+(day.items?.length?Math.round(day.items.reduce((a,i)=>a+(i.throughput_per_carton||0),0)/day.items.length):0)+"/ctn"],
                        ["Total MH","Box MH + Lid MH",day.total_mh+"h"],
                        ["T/hr","Total Throughput ÷ MH","₹"+day.avg_t_hr+"/hr"],
                      ].map(([lbl,sub,val])=>(
                        <div key={lbl} style={{background:"rgba(255,255,255,.07)",borderRadius:8,padding:10}}>
                          <div style={{fontSize:9,color:"#9fb3c0",marginBottom:4}}>{lbl}</div>
                          <div style={{fontSize:16,fontWeight:800}}>{val}</div>
                          <div style={{fontSize:9,color:"#7f97a6",marginTop:2}}>{sub}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{background:"rgba(255,255,255,.05)",borderRadius:8,padding:12,fontFamily:"monospace",fontSize:11,lineHeight:2}}>
                      <div style={{color:"#9fb3c0"}}>// Step 1: Machine Hours per carton</div>
                      <div>Box MH = Pcs ÷ ((3600 ÷ Cycle) × Cavities)</div>
                      <div>Lid MH = Pcs ÷ ((3600 ÷ Cycle) × Lid Cavities)</div>
                      <div style={{color:"#9fb3c0",marginTop:4}}>// Step 2: Throughput</div>
                      <div>T/ctn = List Price − Daana Cost</div>
                      <div>Total T = Σ (T/ctn × Cartons per item)</div>
                      <div style={{color:"#9fb3c0",marginTop:4}}>// Step 3: T/hr</div>
                      <div style={{color:"#f59e0b",fontWeight:700}}>T/hr = Total Throughput ÷ Total MH</div>
                      <div style={{color:"#9fb3c0",marginTop:4}}>// Floor price (N1)</div>
                      <div>N1 = Total Fixed ÷ SCU ({pxThis.scu||9660}h)</div>
                      <div style={{color:"#ef4444",fontWeight:700}}>Floor/ctn = Daana + N1 × MH/ctn</div>
                      <div style={{color:"#9fb3c0",marginTop:4}}>// vs Floor</div>
                      <div style={{color:"#10b981",fontWeight:700}}>vs Floor = T/hr − N1 (positive = profit)</div>
                    </div>
                  </div>

                  {/* Item breakdown table */}
                  {pxRows.length===0&&<div className="card"><p style={{color:"var(--mut)",fontSize:12}}>
                    ⚠️ Pricing data load ho raha hai... please wait ya Pricing tab ek baar kholo.
                  </p></div>}
                  <div className="card" style={{padding:0}}>
                    <div style={{padding:"12px 16px",fontWeight:700,fontSize:13,borderBottom:"1px solid var(--bdr)"}}>
                      Item-wise Throughput Breakdown
                      {pxRows.length>0&&<span style={{fontSize:10,color:"var(--mut)",marginLeft:8}}>
                        ({pxRows.length} items loaded)
                      </span>}
                    </div>
                    <div style={{overflowX:"auto"}}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                        <thead>
                          <tr style={{background:"var(--card2)"}}>
                            {["Product","Plant","Pieces","Cartons","Price/ctn","Daana/ctn","T/ctn","Box MH","Lid MH","Total MH","T/hr","Zone","Floor N1","Happy N2","vs Floor"].map(h=>(
                              <th key={h} style={{padding:"8px 8px",fontSize:10,color:"var(--mut)",textAlign:h==="Product"?"left":"center"}}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(day.items||[]).sort((a,b)=>b.t_hr-a.t_hr).map((it,i)=>{
                            const pxR=findPxRow(it.product, it.price_item_name);
                            const pcs=pxR?.pcs_per_carton||500;
                            const ctns=it.good_parts/pcs;
                            const vsFloor=it.t_hr-it.floor;
                            const z=it.zone;
                            return (
                              <tr key={i} style={{borderBottom:"1px solid var(--bdr)"}}>
                                <td style={{padding:"7px 8px",fontWeight:600,fontSize:11}}>{it.product?.replace(" Container","")}</td>
                                <td style={{padding:"7px 8px",textAlign:"center",color:"var(--mut)",fontSize:10}}>{it.plant?.replace("Plant ","P")}</td>
                                <td style={{padding:"7px 8px",textAlign:"center"}}>{Number(it.good_parts).toLocaleString()}</td>
                                <td style={{padding:"7px 8px",textAlign:"center"}}>{ctns.toFixed(1)}</td>
                                <td style={{padding:"7px 8px",textAlign:"center"}}>{fr3(it.list_price)}</td>
                                <td style={{padding:"7px 8px",textAlign:"center",color:"var(--mut)"}}>{fr3(it.daana_cost)}</td>
                                <td style={{padding:"7px 8px",textAlign:"center",fontWeight:600}}>{fr3(it.throughput_per_carton)}</td>
                                <td style={{padding:"7px 8px",textAlign:"center",color:"var(--mut)",fontSize:10}}>{it.box_mh?.toFixed(2)}h</td>
                                <td style={{padding:"7px 8px",textAlign:"center",color:"var(--mut)",fontSize:10}}>{it.lid_mh?.toFixed(2)}h</td>
                                <td style={{padding:"7px 8px",textAlign:"center",fontWeight:600}}>{it.total_mh?.toFixed(2)}h</td>
                                <td style={{padding:"7px 8px",textAlign:"center",fontWeight:700,color:zc(z).c}}>₹{Math.round(it.t_hr)}</td>
                                <td style={{padding:"7px 8px",textAlign:"center"}}>
                                  <span style={{padding:"2px 6px",borderRadius:8,fontSize:10,fontWeight:700,background:zc(z).bg,color:zc(z).c}}>{(z==="RED"?"🔴 LOSS":z==="N1"?"🟡 Floor":z==="N2"?"🟨 Happy":z==="N3"?"🟩 Super Happy":z)}</span>
                                </td>
                                <td style={{padding:"7px 8px",textAlign:"center",fontSize:10,color:"#f97316"}}>{fr3(it.floor_price)}</td>
                                <td style={{padding:"7px 8px",textAlign:"center",fontSize:10,color:"#f59e0b"}}>{fr3(it.happy_price)}</td>
                                <td style={{padding:"7px 8px",textAlign:"center",fontSize:11,fontWeight:700,
                                  color:(it.t_hr-dynN1)>=0?"#10b981":"#ef4444"}}>
                                  {(it.t_hr-dynN1)>=0?"+":""}{Math.round(it.t_hr-dynN1)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  {/* Sales Impact Table */}
                  <div className="card" style={{marginTop:14}}>
                    <div style={{padding:"12px 16px 8px",fontWeight:700,fontSize:13,borderBottom:"1px solid var(--bdr)"}}>
                      🚀 Sales Impact — Agar Ye Items 10% Zyada Bikein Toh?
                      <div style={{fontSize:10,color:"var(--mut)",fontWeight:400,marginTop:2}}>
                        Current production × 30 days × 10% extra
                      </div>
                    </div>
                    <div style={{overflowX:"auto"}}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                        <thead>
                          <tr style={{background:"var(--card2)"}}>
                            {["Item","T/hr","Ctns/day","10% Extra","Extra T/day","Extra Profit/month","Action"].map(h=>(
                              <th key={h} style={{padding:"8px",fontSize:10,color:"var(--mut)",textAlign:h==="Item"?"left":"center"}}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(()=>{
                            const grp={};
                            (day.items||[]).forEach(it=>{
                              const px=findPxRow(it.product, it.price_item_name);
                              const pcs=px?.pcs_per_carton||500;
                              if(!grp[it.product]) grp[it.product]={product:it.product,t_hr:it.t_hr,tpc:it.throughput_per_carton||0,ctns:0,mh:0,zone:it.zone};
                              grp[it.product].ctns+=it.good_parts/pcs;
                              grp[it.product].mh+=it.total_mh||0;
                            });
                            const fph=FIXED/(day.total_mh*30||9660);
                            return Object.values(grp).sort((a,b)=>b.t_hr-a.t_hr).map((item,i)=>{
                              const e=item.ctns*0.1;
                              const eT=e*item.tpc;
                              const eMH=item.mh>0?(item.mh/item.ctns)*e:0;
                              const ePr=(eT-fph*eMH)*30;
                              const z=item.zone;
                              const act=item.t_hr>=1938?"🟩 Push Sales!":item.t_hr>=1615?"🟨 Sell More":item.t_hr>=1097?"🟡 Price Review":"🔴 Fix Price";
                              return (
                                <tr key={i} style={{borderBottom:"1px solid var(--bdr)",background:item.t_hr>=1938?"rgba(16,185,129,.04)":"transparent"}}>
                                  <td style={{padding:"8px",fontWeight:600,fontSize:11}}>{item.product?.replace(" Container","")}</td>
                                  <td style={{padding:"8px",textAlign:"center",fontWeight:700,color:zc(z).c}}>₹{Math.round(item.t_hr)}</td>
                                  <td style={{padding:"8px",textAlign:"center"}}>{item.ctns.toFixed(1)}</td>
                                  <td style={{padding:"8px",textAlign:"center",color:"#10b981",fontWeight:700}}>+{e.toFixed(1)}</td>
                                  <td style={{padding:"8px",textAlign:"center",color:"#10b981"}}>+₹{Math.round(eT).toLocaleString()}</td>
                                  <td style={{padding:"8px",textAlign:"center",fontWeight:800,fontSize:13,color:ePr>0?"#10b981":"#ef4444"}}>
                                    {ePr>0?"+":" "}₹{Math.round(Math.abs(ePr)/1000)}K
                                  </td>
                                  <td style={{padding:"8px",textAlign:"center",fontSize:11}}>{act}</td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                        <tfoot>
                          <tr style={{background:"#0e1a24",color:"#fff"}}>
                            <td colSpan={5} style={{padding:"10px 12px",fontWeight:700}}>
                              💰 Total agar sab items 10% zyada bikein (monthly)
                            </td>
                            <td colSpan={2} style={{padding:"10px 12px",textAlign:"center",fontWeight:800,fontSize:16,color:"#10b981"}}>
                              +₹{(()=>{
                                const grp2={};
                                (day.items||[]).forEach(it=>{
                                  const px=findPxRow(it.product, it.price_item_name);
                                  const pcs=px?.pcs_per_carton||500;
                                  if(!grp2[it.product]) grp2[it.product]={tpc:it.throughput_per_carton||0,ctns:0,mh:0};
                                  grp2[it.product].ctns+=it.good_parts/pcs;
                                  grp2[it.product].mh+=it.total_mh||0;
                                });
                                const fph2=FIXED/(day.total_mh*30||9660);
                                return Math.round(Object.values(grp2).reduce((s,item)=>{
                                  const e=item.ctns*0.1;
                                  const eMH=item.mh>0?(item.mh/item.ctns)*e:0;
                                  return s+(e*item.tpc-fph2*eMH)*30;
                                },0)/1000);
                              })()}K/month
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()}
            {!anProd&&!anLoad&&(
              <div className="card empty"><p>Date select karo aur "Load Data" dabao</p></div>
            )}
          </div>
        )}

        {/* ── TAB 3: Machine Utilization ── */}
        {anTab==="utilization"&&(()=>{
          // utilData and utilLoad state is at Analytics component level
          const TARGET=345;
          const avgMH=utilData.length?Math.round(utilData.reduce((a,d)=>a+d.total_mh,0)/utilData.length):0;
          const avgUtil=utilData.length?Math.round(avgMH/TARGET*100):0;
          const lowDays=utilData.filter(d=>d.total_mh/TARGET*100<60).length;
          const bestDay=utilData.reduce((best,d)=>d.total_mh>best.mh?{mh:d.total_mh,date:d.date}:best,{mh:0,date:""});
          return (
          <div>
            {utilLoad&&<div className="card empty"><p>Loading utilization data...</p></div>}
            {/* Summary cards */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
              {[
                ["Avg MH/day",avgMH+"h","Target: "+TARGET+"h (15×23)","#E3F2FD","#1565C0"],
                ["Avg Utilization",avgUtil+"%","vs 15 machine target","#E8F5E9","#1B5E20"],
                ["Low Days (<60%)",lowDays+" days","Investigate reason","#FFF3E0","#E65100"],
                ["Best Day",bestDay.mh?bestDay.mh+"h":"—",bestDay.date?bestDay.date.slice(5):"","#F3E5F5","#4A148C"],
              ].map(([lbl,val,sub,bg,c])=>(
                <div key={lbl} style={{background:bg,border:`1px solid ${c}22`,borderRadius:10,padding:12,textAlign:"center"}}>
                  <div style={{fontSize:10,color:"var(--mut)",marginBottom:4}}>{lbl}</div>
                  <div style={{fontSize:20,fontWeight:800,color:c}}>{val}</div>
                  <div style={{fontSize:10,color:"var(--mut)",marginTop:4}}>{sub}</div>
                </div>
              ))}
            </div>

            {/* 30 day trend table */}
            <div className="card" style={{padding:0}}>
              <div style={{padding:"12px 16px",fontWeight:700,fontSize:13,borderBottom:"1px solid var(--bdr)",
                display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span>30 Days Machine Utilization</span>
                <span style={{fontSize:11,color:"var(--mut)"}}>Target: 345 hrs/day (15 machines × 23 hrs)</span>
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead>
                    <tr style={{background:"var(--card2)"}}>
                      {["Date","Day","Actual MH","Target (345h)","Gap (hrs)","Utilization %","Status","Note"].map(h=>(
                        <th key={h} style={{padding:"8px 10px",fontSize:10,color:"var(--mut)",textAlign:h==="Date"||h==="Day"?"left":"center"}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {utilData.map((d)=>{
                      const date=d.date;
                      const actual=Math.round(d.total_mh*10)/10;
                      const dayName=new Date(date).toLocaleDateString("en-IN",{weekday:"short"});
                      const target=15*23;
                      const notRunning=0;
                      const gap=target-actual;
                      const util=Math.round(actual/target*100);
                      const status=util>=95?"🟢 Excellent":util>=80?"🟡 Good":util>=60?"🟠 Low":"🔴 Poor";
                      const rowBg=util<60?"rgba(239,68,68,.05)":util>=95?"rgba(16,185,129,.05)":"transparent";
                      return (
                        <tr key={date} style={{borderBottom:"1px solid var(--bdr)",background:rowBg}}>
                          <td style={{padding:"7px 10px",fontWeight:600}}>{date.slice(5)}</td>
                          <td style={{padding:"7px 10px",color:"var(--mut)",fontSize:11}}>{dayName}</td>
                          <td style={{padding:"7px 10px",textAlign:"center",fontWeight:700,
                            color:actual>=300?"#10b981":actual>=200?"#f59e0b":"#ef4444"}}>{actual}h</td>
                          <td style={{padding:"7px 10px",textAlign:"center",color:"var(--mut)"}}>345h</td>
                          <td style={{padding:"7px 10px",textAlign:"center",
                            color:gap>50?"#ef4444":gap>20?"#f59e0b":"#10b981",fontWeight:700}}>
                            {gap>0?`-${gap.toFixed(1)}h`:"+"+Math.abs(gap).toFixed(1)+"h"}
                          </td>
                          <td style={{padding:"7px 10px",textAlign:"center"}}>
                            <div style={{background:"var(--card2)",borderRadius:4,overflow:"hidden",height:16,width:"100%",position:"relative"}}>
                              <div style={{height:"100%",width:`${Math.min(util,100)}%`,
                                background:util>=95?"#10b981":util>=80?"#f59e0b":"#ef4444",
                                transition:"width .3s"}}/>
                              <span style={{position:"absolute",right:4,top:0,fontSize:9,lineHeight:"16px",fontWeight:700}}>
                                {util}%
                              </span>
                            </div>
                          </td>
                          <td style={{padding:"7px 10px",textAlign:"center",fontSize:11}}>{status}</td>
                          <td style={{padding:"7px 10px",fontSize:10,color:"var(--mut)"}}>
                            {util<60?"⚠️ Low — investigate":util>=95?"✅ Full production":""}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Low utilization analysis */}
            <div className="card" style={{marginTop:14}}>
              <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>🔍 Low Utilization Days — Investigate Karo</div>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead>
                  <tr style={{background:"var(--card2)"}}>
                    {["Date","MH","Util%","Machines","Possible Reason","Action"].map(h=>(
                      <th key={h} style={{padding:"8px",fontSize:10,color:"var(--mut)",textAlign:"left"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["08 Aug","75.6h","22%",13,"Aaj ka data (partial day)","Wait — din pura hone do"],
                    ["01 Aug","124.3h","36%",7,"Sirf 7 machines — baaki band?","Machine/mould issue check karo"],
                    ["11 Jul","100.9h","29%",11,"11 machines — Sunday?","Planned shutdown check karo"],
                    ["16 Jul","188.1h","55%",13,"13 machines par kam hours","Power cut ya breakdown?"],
                    ["18 Jul","198.7h","58%",9,"9 machines","Mould change ya maintenance?"],
                  ].map(([date,mh,util,mach,reason,action],i)=>(
                    <tr key={i} style={{borderBottom:"1px solid var(--bdr)",background:"rgba(239,68,68,.03)"}}>
                      <td style={{padding:"8px",fontWeight:600,color:"#ef4444"}}>{date}</td>
                      <td style={{padding:"8px"}}>{mh}</td>
                      <td style={{padding:"8px",fontWeight:700,color:"#ef4444"}}>{util}</td>
                      <td style={{padding:"8px"}}>{mach}</td>
                      <td style={{padding:"8px",color:"var(--mut)"}}>{reason}</td>
                      <td style={{padding:"8px",color:"#f59e0b",fontWeight:600}}>{action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Plant-wise capacity note */}
            <div className="card" style={{marginTop:14,background:"#0e1a24",color:"#fff"}}>
              <div style={{fontWeight:700,marginBottom:10}}>🏭 Plant-wise Capacity</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                {[
                  ["Plant 433","2 × 200T Milacron","Target: 46h/day","RCT items","#ef4444"],
                  ["Plant 477","7 × 180T + 1 × 280T","Target: 184h/day","Containers + Sipper","#10b981"],
                  ["Plant 488","7 × 180T/350T","Target: 161h/day","Containers + SSRE","#f59e0b"],
                ].map(([plant,machines,target,items,c])=>(
                  <div key={plant} style={{background:"rgba(255,255,255,.07)",borderRadius:8,padding:12}}>
                    <div style={{fontWeight:700,color:c,marginBottom:6}}>{plant}</div>
                    <div style={{fontSize:11,color:"#9fb3c0"}}>{machines}</div>
                    <div style={{fontSize:11,color:"#9fb3c0"}}>{target}</div>
                    <div style={{fontSize:11,color:"#9fb3c0",marginTop:4}}>{items}</div>
                  </div>
                ))}
              </div>
              <div style={{marginTop:10,fontSize:11,color:"#9fb3c0"}}>
                💡 Plant-wise actual MH ke liye MOS mein machine column se filter karo
              </div>
            </div>
          </div>
          );
        })()}

        {/* ── TAB 3: Floor Price Analysis ── */}
        {anTab==="floor"&&(
          <div>
            <div className="card" style={{marginBottom:12}}>
              <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>📈 Floor Price Increase Ki Wajah — 5 Reasons</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {[
                  ["1. Daana Rate Badha","Market se PP granule rate daily change hota hai. Homo ₹1 badha → 500ml ka floor ~₹9 badh jaata hai.","#fff3e0","#e65100"],
                  ["2. Electricity Bill Badha","Naye plants add hue → bill badha. FY25-26 avg ₹6.33/kg → FY26-27 ₹14.93/kg (2.3x)","#e3f2fd","#0d47a1"],
                  ["3. Fixed Cost Badha","New salary, rent increase, repairs — fixed cost badhi to N1 threshold badha.","#fce4ec","#880e4f"],
                  ["4. Machine Hours Kam","Agar machines breakdown pe thi → actual MH kam → fixed per hour badha → floor badha.","#e8f5e9","#1b5e20"],
                  ["5. MB/Box Cost Badha","Corrugated box rate, masterbatch price market rate se change hota hai.","#f3e5f5","#4a148c"],
                  ["6. Mix Change","Zyada bade items (1500ml, 2000ml) → zyada MH/ctn → zyada fixed cost absorption.","#fff8e1","#f57f17"],
                ].map(([title,desc,bg,color])=>(
                  <div key={title} style={{background:bg,border:`1px solid ${color}22`,borderRadius:10,padding:12}}>
                    <div style={{fontWeight:700,color,fontSize:12,marginBottom:6}}>{title}</div>
                    <div style={{fontSize:11,lineHeight:1.6,color:"var(--txt)"}}>{desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action sheet */}
            <div className="card" style={{padding:0}}>
              <div style={{padding:"12px 16px",fontWeight:700,fontSize:13,borderBottom:"1px solid var(--bdr)"}}>
                📋 Action Sheet — Floor Price Theek Karne Ke Liye
              </div>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead>
                  <tr style={{background:"var(--card2)"}}>
                    {["Problem","Item/Area","Action","Priority","Status"].map(h=>(
                      <th key={h} style={{padding:"8px 12px",fontSize:10,color:"var(--mut)",textAlign:"left"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["RCT floor > price","RCT 500/650/750/1000","Price badhao ya band karo","🔴 High","Pending"],
                    ["250ml Milky N1","250ml Milky 1000pc","Price ₹2,600 → ₹2,900 karo","🔴 High","Pending"],
                    ["Machine idle time","June 87% util","Preventive maintenance schedule","🟡 Medium","In Progress"],
                    ["Electricity ₹/kg high","All plants","Compressor efficiency check","🟡 Medium","Pending"],
                    ["Mix shift","All","RCT → SSRE shift karo 350T pe","🟢 Strategic","Planning"],
                    ["Daana negotiation","Homo/CP","Supplier rate negotiate karo","🟡 Medium","Pending"],
                  ].map(([prob,item,action,pri,status],i)=>(
                    <tr key={i} style={{borderBottom:"1px solid var(--bdr)"}}>
                      <td style={{padding:"9px 12px",fontWeight:600}}>{prob}</td>
                      <td style={{padding:"9px 12px",color:"var(--mut)"}}>{item}</td>
                      <td style={{padding:"9px 12px"}}>{action}</td>
                      <td style={{padding:"9px 12px"}}>{pri}</td>
                      <td style={{padding:"9px 12px",color:"var(--mut)"}}>{status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 4: What-If Calculator ── */}
        {anTab==="whatif"&&(
          <div>
            <div className="card" style={{marginBottom:12}}>
              <div style={{fontWeight:700,fontSize:13,marginBottom:4}}>🔮 What-If Calculator</div>
              <div style={{fontSize:11,color:"var(--mut)",marginBottom:12}}>
                💡 T/hr pieces se nahi badlta — sirf <b>Price</b>, <b>Cavity</b> ya <b>Cycle Time</b> change karne se badlta hai. Neeche try karo.
              </div>

              {/* Item select */}
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,color:"var(--mut)",marginBottom:6}}>Item select karo</div>
                <select className="inp" value={wiItem?.id||""} onChange={e=>{
                  const val=e.target.value;
                  const r=pxRows.find(p=>String(p.id)===String(val));
                  setWiItem(r?{...r,wi_price:r.list_price,wi_bcav:r.box_cav,wi_bcyc:r.box_cyc,wi_lcav:r.lid_cav,wi_lcyc:r.lid_cyc}:null);
                  setWiPcs(0);
                }}>
                  <option value="">-- Item chuniye --</option>
                  {pxRows.length===0&&<option disabled>Loading...</option>}
                  {pxRows.map(r=><option key={r.id} value={String(r.id)}>{r.item_name}</option>)}
                </select>
              </div>

              {wiItem&&(()=>{
                const HOMO=Number(pxDaana.homo)||146,CP=Number(pxDaana.cp)||146,RAND=Number(pxDaana.random)||152;
                const pcs=wiItem.pcs_per_carton||500;

                // Daana per carton
                const daana=((wiItem.box_homo||0)*HOMO+(wiItem.box_cp||0)*CP+(wiItem.box_random||0)*RAND+
                             (wiItem.lid_homo||0)*HOMO+(wiItem.lid_cp||0)*CP+(wiItem.lid_random||0)*RAND)/1000*pcs;

                // Calculate T/hr from given params
                const calcThr=(price,bcav,bcyc,lcav,lcyc)=>{
                  const bMH=(bcav>0&&bcyc>0)?pcs/((3600/bcyc)*bcav):0;
                  const lMH=(lcav>0&&lcyc>0)?pcs/((3600/lcyc)*lcav):0;
                  const mh=bMH+lMH;
                  if(!mh) return {thr:0,mh:0,zone:"RED"};
                  const thr=(price-daana)/mh;
                  const z=thr<1097?"RED":thr<1615?"N1":thr<1938?"N2":"N3";
                  return {thr:Math.round(thr),mh:mh.toFixed(3),zone:z,margin:Math.round(price-daana)};
                };

                // Current actual
                const curr=calcThr(wiItem.list_price,wiItem.box_cav,wiItem.box_cyc,wiItem.lid_cav,wiItem.lid_cyc);

                // Scenarios — price/cavity/cycle changes
                const scenarios=[
                  {label:"📍 Current",price:wiItem.list_price,bcav:wiItem.box_cav,bcyc:wiItem.box_cyc,lcav:wiItem.lid_cav,lcyc:wiItem.lid_cyc,note:"Abhi ka"},
                  {label:"💰 Price +10%",price:Math.round(wiItem.list_price*1.1),bcav:wiItem.box_cav,bcyc:wiItem.box_cyc,lcav:wiItem.lid_cav,lcyc:wiItem.lid_cyc,note:"Price 10% badhao"},
                  {label:"💰 Price +20%",price:Math.round(wiItem.list_price*1.2),bcav:wiItem.box_cav,bcyc:wiItem.box_cyc,lcav:wiItem.lid_cav,lcyc:wiItem.lid_cyc,note:"Price 20% badhao"},
                  {label:"⚡ Cycle -10%",price:wiItem.list_price,bcav:wiItem.box_cav,bcyc:+(wiItem.box_cyc*0.9).toFixed(1),lcav:wiItem.lid_cav,lcyc:wiItem.lid_cyc,note:"Cycle time 10% kam karo"},
                  {label:"🔧 Cavity ×2",price:wiItem.list_price,bcav:(wiItem.box_cav||1)*2,bcyc:wiItem.box_cyc,lcav:wiItem.lid_cav,lcyc:wiItem.lid_cyc,note:"Double cavity mould"},
                  {label:"🚀 Price+10% + Cycle-10%",price:Math.round(wiItem.list_price*1.1),bcav:wiItem.box_cav,bcyc:+(wiItem.box_cyc*0.9).toFixed(1),lcav:wiItem.lid_cav,lcyc:wiItem.lid_cyc,note:"Dono improve"},
                ];

                return (
                  <div>
                    {/* Current stats — compact summary */}
                    <div style={{background:"var(--card2)",borderRadius:10,padding:12,marginBottom:12}}>
                      <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:8}}>
                        {[
                          ["List Price","₹"+wiItem.list_price,"#1565C0"],
                          ["Daana/ctn","₹"+Math.round(daana),"#2E7D32"],
                          ["Margin/ctn","₹"+Math.round(wiItem.list_price-daana),"#E65100"],
                          ["MH/ctn",curr.mh+"h","#6A1B9A"],
                          ["T/hr","₹"+curr.thr,({N3:"#10b981",N2:"#f59e0b",N1:"#f97316",RED:"#ef4444"})[curr.zone]],
                          ["Zone",curr.zone==="N1"?"Floor":curr.zone==="N2"?"Happy":curr.zone==="N3"?"Super":"LOSS",({N3:"#10b981",N2:"#f59e0b",N1:"#f97316",RED:"#ef4444"})[curr.zone]],
                        ].map(([l,v,c])=>(
                          <div key={l} style={{display:"flex",flexDirection:"column",alignItems:"center",
                            background:"var(--bg)",borderRadius:8,padding:"6px 12px",minWidth:80}}>
                            <div style={{fontSize:9,color:"var(--mut)"}}>{l}</div>
                            <div style={{fontSize:14,fontWeight:800,color:c}}>{v}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{fontSize:11,color:"var(--mut)"}}>
                        Box {wiItem.box_cav} cav × {wiItem.box_cyc}s
                        {wiItem.lid_cav>0&&` | Lid ${wiItem.lid_cav} cav × ${wiItem.lid_cyc}s`}
                      </div>
                    </div>

                    {/* Scenarios table — full P&L */}
                    <div style={{fontWeight:600,fontSize:12,marginBottom:8}}>Agar ye change karein — complete P&L kya hoga?</div>
                    <div style={{overflowX:"auto"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:700}}>
                      <thead>
                        <tr style={{background:"#0e1a24",color:"#9fb3c0"}}>
                          <th style={{padding:"8px 10px",textAlign:"left",fontSize:10}}>Scenario</th>
                          <th style={{padding:"8px",fontSize:10}}>Price</th>
                          <th style={{padding:"8px",fontSize:10}}>Daana</th>
                          <th style={{padding:"8px",fontSize:10,color:"#f59e0b"}}>Margin/ctn</th>
                          <th style={{padding:"8px",fontSize:10}}>MH/ctn</th>
                          <th style={{padding:"8px",fontSize:10,color:"#ef4444"}}>M1 Floor</th>
                          <th style={{padding:"8px",fontSize:10,color:"#f59e0b"}}>M1 Happy</th>
                          <th style={{padding:"8px",fontSize:10,color:"#10b981"}}>M1 Super</th>
                          <th style={{padding:"8px",fontSize:10,color:"#10b981"}}>T/hr</th>
                          <th style={{padding:"8px",fontSize:10}}>Zone</th>
                          <th style={{padding:"8px",fontSize:10}}>vs Floor</th>
                          <th style={{padding:"8px",fontSize:10}}>vs Happy</th>
                          <th style={{padding:"8px",fontSize:10}}>Gain/hr</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scenarios.map((s,i)=>{
                          const res=calcThr(s.price,s.bcav,s.bcyc,s.lcav,s.lcyc);
                          const gain=res.thr-curr.thr;
                          const isBase=i===0;
                          const margin=Math.round(s.price-daana);
                          // Floor/Happy/Super per carton
                          const bMH2=(s.bcav>0&&s.bcyc>0)?pcs/((3600/s.bcyc)*s.bcav):0;
                          const lMH2=(s.lcav>0&&s.lcyc>0)?pcs/((3600/s.lcyc)*s.lcav):0;
                          const mh2=bMH2+lMH2;
                          const FIXED_TOTAL=pxThis.fixed||9800000,ELEC_BILL=pxThis.elecBill||2452659,SCU=pxThis.scu||9660,HAPPY_T=pxThis.happy||5000000;
                          const m1N1=FIXED_TOTAL/SCU, m1N2=(FIXED_TOTAL+HAPPY_T)/SCU, m1N3=m1N2*1.2;
                          const floorCtn=Math.round(daana+m1N1*mh2);
                          const happyCtn=Math.round(daana+m1N2*mh2);
                          const superCtn=Math.round(daana+m1N3*mh2);
                          const vsFloor=s.price-floorCtn;
                          const vsHappy=s.price-happyCtn;
                          const zc2=(z)=>({N3:{c:"#10b981",bg:"rgba(16,185,129,.1)"},N2:{c:"#f59e0b",bg:"rgba(245,158,11,.1)"},N1:{c:"#f97316",bg:"rgba(249,115,22,.1)"},RED:{c:"#ef4444",bg:"rgba(239,68,68,.1)"}}[z]||{c:"#666",bg:"#f5f5f5"});
                          return (
                            <tr key={i} style={{borderBottom:"1px solid var(--bdr)",
                              background:isBase?"var(--card2)":vsFloor<0?"rgba(239,68,68,.03)":"transparent"}}>
                              <td style={{padding:"8px 10px",fontWeight:isBase?700:400,fontSize:11}}>
                                <div>{s.label}</div>
                                <div style={{fontSize:9,color:"var(--mut)"}}>{s.note}</div>
                              </td>
                              <td style={{padding:"8px",textAlign:"center",fontWeight:700,
                                color:s.price>wiItem.list_price?"#10b981":s.price<wiItem.list_price?"#ef4444":"inherit"}}>
                                ₹{s.price}
                              </td>
                              <td style={{padding:"8px",textAlign:"center",color:"var(--mut)"}}>₹{Math.round(daana)}</td>
                              <td style={{padding:"8px",textAlign:"center",fontWeight:700,
                                color:margin>0?"#10b981":"#ef4444"}}>₹{margin}</td>
                              <td style={{padding:"8px",textAlign:"center",color:"var(--mut)",fontSize:10}}>{mh2.toFixed(3)}h</td>
                              <td style={{padding:"8px",textAlign:"center",fontSize:10,color:"#ef4444"}}>₹{floorCtn}</td>
                              <td style={{padding:"8px",textAlign:"center",fontSize:10,color:"#f59e0b"}}>₹{happyCtn}</td>
                              <td style={{padding:"8px",textAlign:"center",fontSize:10,color:"#10b981"}}>₹{superCtn}</td>
                              <td style={{padding:"8px",textAlign:"center",fontWeight:800,fontSize:13,
                                color:zc2(res.zone).c}}>₹{res.thr}</td>
                              <td style={{padding:"8px",textAlign:"center"}}>
                                <span style={{padding:"2px 6px",borderRadius:6,fontSize:9,fontWeight:700,
                                  background:zc2(res.zone).bg,color:zc2(res.zone).c}}>
                                  {res.zone==="RED"?"LOSS":res.zone==="N1"?"Floor":res.zone==="N2"?"Happy":"Super"}
                                </span>
                              </td>
                              <td style={{padding:"8px",textAlign:"center",fontWeight:700,fontSize:11,
                                color:vsFloor>=0?"#10b981":"#ef4444"}}>
                                {vsFloor>=0?"+":""}{vsFloor>=0?"₹"+vsFloor:"−₹"+Math.abs(vsFloor)}
                              </td>
                              <td style={{padding:"8px",textAlign:"center",fontWeight:700,fontSize:11,
                                color:vsHappy>=0?"#10b981":"#ef4444"}}>
                                {vsHappy>=0?"+":""}{vsHappy>=0?"₹"+vsHappy:"−₹"+Math.abs(vsHappy)}
                              </td>
                              <td style={{padding:"8px",textAlign:"center",fontWeight:700,
                                color:gain>0?"#10b981":gain<0?"#ef4444":"var(--mut)"}}>
                                {isBase?"—":gain>0?"+₹"+gain:"₹"+gain}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    </div>
                  
                    {/* Formula explanation */}
                    <div style={{marginTop:12,background:"var(--card2)",borderRadius:10,padding:12}}>
                      <div style={{fontWeight:700,fontSize:12,marginBottom:10}}>Formula — Kaise Calculate Hua?</div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,fontSize:11}}>
                        <div style={{background:"var(--bg)",borderRadius:8,padding:10}}>
                          <div style={{fontWeight:700,color:"#10b981",marginBottom:6}}>T/hr (Throughput per Hour)</div>
                          <div style={{fontFamily:"monospace",fontSize:10,lineHeight:1.8}}>
                            <div style={{color:"var(--mut)"}}>Step 1: MH per carton</div>
                            <div>Box MH = Pcs / ((3600/Cycle) x Cavity)</div>
                            <div>Lid MH = Pcs / ((3600/Cycle) x Cavity)</div>
                            <div>Total MH = Box MH + Lid MH</div>
                            <div style={{color:"var(--mut)",marginTop:4}}>Step 2: T/hr</div>
                            <div>Margin = List Price - Daana</div>
                            <div style={{color:"#10b981",fontWeight:700}}>T/hr = Margin / Total MH</div>
                          </div>
                          <div style={{marginTop:6,padding:6,background:"rgba(16,185,129,.08)",borderRadius:6,fontSize:9}}>
                            {wiItem&&curr&&<span>MH={curr.mh}h | Margin={Math.round(wiItem.list_price-daana)} | T/hr=<b>{curr.thr}</b>/hr</span>}
                          </div>
                        </div>
                        <div style={{background:"var(--bg)",borderRadius:8,padding:10}}>
                          <div style={{fontWeight:700,color:"#f97316",marginBottom:6}}>Floor / Happy / Super</div>
                          <div style={{fontFamily:"monospace",fontSize:10,lineHeight:1.8}}>
                            <div style={{color:"var(--mut)"}}>N1 = Fixed / SCU = {Math.round((pxThis.fixed||9800000)/(pxThis.scu||9660))}/hr</div>
                            <div style={{color:"var(--mut)"}}>N2 = (Fixed+Happy) / SCU = {Math.round(((pxThis.fixed||9800000)+(pxThis.happy||5000000))/(pxThis.scu||9660))}/hr</div>
                            <div style={{color:"#ef4444",fontWeight:700}}>Floor = Daana + N1 x MH</div>
                            <div style={{color:"#f59e0b",fontWeight:700}}>Happy = Daana + N2 x MH</div>
                          </div>
                          <div style={{marginTop:6,padding:6,background:"rgba(249,115,22,.08)",borderRadius:6,fontSize:9}}>
                            {wiItem&&curr&&(
                              <span>Floor={Math.round(daana+((pxThis.fixed||9800000)/(pxThis.scu||9660))*parseFloat(curr.mh))} | Happy={Math.round(daana+(((pxThis.fixed||9800000)+(pxThis.happy||5000000))/(pxThis.scu||9660))*parseFloat(curr.mh))}</span>
                            )}
                          </div>
                        </div>
                        <div style={{background:"var(--bg)",borderRadius:8,padding:10}}>
                          <div style={{fontWeight:700,color:"#1565C0",marginBottom:6}}>Gain per Hour</div>
                          <div style={{fontFamily:"monospace",fontSize:10,lineHeight:1.8}}>
                            <div style={{color:"#1565C0",fontWeight:700}}>Gain = New T/hr - Current T/hr</div>
                            <div>Monthly = Gain x {Math.round((pxThis.scu||9660)/15)} hrs/machine</div>
                          </div>
                        </div>
                        <div style={{background:"var(--bg)",borderRadius:8,padding:10}}>
                          <div style={{fontWeight:700,color:"#7B1FA2",marginBottom:6}}>Volume se T/hr nahi badlta</div>
                          <div style={{fontSize:10,lineHeight:1.8}}>
                            <div>Zyada pieces = zyada T + zyada MH = same ratio</div>
                            <div style={{color:"#7B1FA2",fontWeight:700}}>T/hr sirf 3 se badlta hai:</div>
                            <div style={{color:"#10b981"}}>1. Price badhao 2. Cavity badhao 3. Cycle kam karo</div>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })()}
              {!wiItem&&(
                <div style={{textAlign:"center",padding:20,color:"var(--mut)"}}>
                  Upar se item select karo — scenarios dikhenge
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 6: Lid Balance ── */}
        {anTab==="lid"&&(()=>{
          const LID_TYPES = {
            "Common Lid":     {cav:4, cyc:5.0, pps:Math.round((3600/5.0)*4)},
            "100ml Lid":      {cav:12,cyc:6.1, pps:Math.round((3600/6.1)*12)},
            "175ml Lid":      {cav:4, cyc:4.9, pps:Math.round((3600/4.9)*4)},
            "250ml Lid":      {cav:3, cyc:4.5, pps:Math.round((3600/4.5)*3)},
            "Big Common Lid": {cav:2, cyc:5.0, pps:Math.round((3600/5.0)*2)},
            "Oval Lid":       {cav:2, cyc:5.8, pps:Math.round((3600/5.8)*2)},
            "2000ml Lid":     {cav:2, cyc:6.3, pps:Math.round((3600/6.3)*2)},
            "Rectangle Lid":  {cav:2, cyc:4.5, pps:Math.round((3600/4.5)*2)},
            "SSRE Lid":       {cav:4, cyc:6.5, pps:Math.round((3600/6.5)*4)},
          };
          const ITEMS = [
            {n:"100ml Black/Milky",  lid:"100ml Lid",      bph:Math.round((3600/6.0)*6)},
            {n:"50ml",               lid:"100ml Lid",      bph:Math.round((3600/5.3)*8)},
            {n:"175ml",              lid:"175ml Lid",      bph:Math.round((3600/5.1)*4)},
            {n:"250ml 1000pc",       lid:"250ml Lid",      bph:Math.round((3600/5.4)*4)},
            {n:"300ml",              lid:"Common Lid",     bph:Math.round((3600/4.75)*2)},
            {n:"400ml",              lid:"Common Lid",     bph:Math.round((3600/5.3)*2)},
            {n:"500ml Black",        lid:"Common Lid",     bph:Math.round((3600/6.2)*4)},
            {n:"500ml Milky",        lid:"Common Lid",     bph:Math.round((3600/7.3)*6)},
            {n:"750ml",              lid:"Common Lid",     bph:Math.round((3600/5.6)*2)},
            {n:"1000ml",             lid:"Common Lid",     bph:Math.round((3600/6.6)*2)},
            {n:"1200ml",             lid:"Big Common Lid", bph:Math.round((3600/5.2)*1)},
            {n:"1500ml",             lid:"Big Common Lid", bph:Math.round((3600/5.5)*1)},
            {n:"500ml Oval",         lid:"Oval Lid",       bph:Math.round((3600/6.0)*2)},
            {n:"750ml Oval",         lid:"Oval Lid",       bph:Math.round((3600/6.9)*1)},
            {n:"1000ml Oval",        lid:"Oval Lid",       bph:Math.round((3600/6.6)*1)},
            {n:"2000ml/2500ml",      lid:"2000ml Lid",     bph:Math.round((3600/9.5)*1)},
            {n:"RCT 500",            lid:"Rectangle Lid",  bph:Math.round((3600/5.5)*1)},
            {n:"RCT 750",            lid:"Rectangle Lid",  bph:Math.round((3600/5.55)*1)},
            {n:"RCT 1000",           lid:"Rectangle Lid",  bph:Math.round((3600/5.75)*1)},
            {n:"SSRE 500",           lid:"SSRE Lid",       bph:Math.round((3600/6.5)*2)},
            {n:"SSRE 750",           lid:"SSRE Lid",       bph:Math.round((3600/6.5)*2)},
            {n:"SSRE 1000",          lid:"SSRE Lid",       bph:Math.round((3600/6.5)*2)},
          ];

          // plan and lidM state is at Analytics component level

          const demand = ITEMS.reduce((acc,it)=>{
            const m=plan[it.n]||0;
            if(m>0) acc[it.lid]=(acc[it.lid]||0)+it.bph*m;
            return acc;
          },{});

          const groups = ITEMS.reduce((g,it)=>{g[it.lid]=[...(g[it.lid]||[]),it];return g;},{});

          return (
            <div>
              <div style={{fontWeight:700,fontSize:14,marginBottom:4}}>🔵 Lid Balance Calculator</div>
              <div style={{fontSize:11,color:"var(--mut)",marginBottom:14}}>
                Box machines daalo → lid bottleneck instantly pata chalega
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                {/* Left: Plan input */}
                <div className="card" style={{maxHeight:600,overflowY:"auto"}}>
                  <div style={{fontWeight:700,fontSize:12,marginBottom:10}}>📋 Aaj Ka Plan — Box Machines</div>
                  {Object.entries(groups).map(([lt,items])=>(
                    <div key={lt} style={{marginBottom:12}}>
                      <div style={{fontSize:10,fontWeight:700,color:"#1565C0",background:"#E3F2FD",
                        padding:"3px 8px",borderRadius:4,marginBottom:6}}>{lt}</div>
                      {items.map(it=>(
                        <div key={it.n} style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                          <div style={{flex:1,fontSize:12}}>{it.n}</div>
                          <div style={{fontSize:10,color:"var(--mut)",width:60}}>{it.bph}/hr</div>
                          <select style={{width:70,padding:"3px 6px",borderRadius:6,border:"1px solid var(--bdr)",
                            fontSize:12,background:"var(--bg)",color:"inherit"}}
                            value={plan[it.n]||0}
                            onChange={e=>setPlan(p=>({...p,[it.n]:Number(e.target.value)}))}>
                            {[0,1,2,3,4,5,6,7].map(n=>(
                              <option key={n} value={n}>{n===0?"OFF":n+" mach"}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                {/* Right: Result */}
                <div>
                  <div className="card" style={{marginBottom:12}}>
                    <div style={{fontWeight:700,fontSize:12,marginBottom:8}}>🔵 Lid Machines Available</div>
                    {Object.entries(LID_TYPES).map(([lt,ld])=>(
                      <div key={lt} style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                        <div style={{flex:1,fontSize:11}}>{lt}</div>
                        <div style={{fontSize:10,color:"var(--mut)",width:65}}>{ld.pps}/hr</div>
                        <select style={{width:70,padding:"3px 6px",borderRadius:6,border:"1px solid var(--bdr)",
                          fontSize:12,background:"var(--bg)",color:"inherit"}}
                          value={lidM[lt]||0}
                          onChange={e=>setLidM(p=>({...p,[lt]:Number(e.target.value)}))}>
                          {[0,1,2,3,4].map(n=><option key={n} value={n}>{n} mach</option>)}
                        </select>
                      </div>
                    ))}
                  </div>

                  <div className="card">
                    <div style={{fontWeight:700,fontSize:12,marginBottom:10}}>⚖️ Balance Result</div>
                    {Object.keys(demand).length===0?(
                      <div style={{textAlign:"center",padding:16,color:"var(--mut)",fontSize:12}}>
                        Left mein plan fill karo
                      </div>
                    ):Object.entries(LID_TYPES).map(([lt,ld])=>{
                      const dem=demand[lt]||0;
                      const sup=ld.pps*(lidM[lt]||0);
                      const gap=sup-dem;
                      if(!dem&&!sup) return null;
                      const ok=gap>=0;
                      const maxBox=dem>0?Math.floor(sup/dem*100)/100:0;
                      return (
                        <div key={lt} style={{marginBottom:10,padding:10,borderRadius:8,
                          background:ok?"rgba(16,185,129,.08)":"rgba(239,68,68,.08)",
                          border:`1px solid ${ok?"#10b981":"#ef4444"}`}}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                            <div style={{fontWeight:700,fontSize:12}}>{lt}</div>
                            <span style={{padding:"2px 10px",borderRadius:10,fontSize:11,fontWeight:700,
                              background:ok?"#10b981":"#ef4444",color:"#fff"}}>
                              {ok?"✅ OK":"🔴 BOTTLENECK"}
                            </span>
                          </div>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4,fontSize:11,marginBottom:ok?0:6}}>
                            <div style={{textAlign:"center",background:"rgba(239,68,68,.1)",borderRadius:4,padding:4}}>
                              <div style={{fontSize:9,color:"var(--mut)"}}>Box Demand</div>
                              <div style={{fontWeight:700}}>{dem.toLocaleString()}/hr</div>
                            </div>
                            <div style={{textAlign:"center",background:"rgba(16,185,129,.1)",borderRadius:4,padding:4}}>
                              <div style={{fontSize:9,color:"var(--mut)"}}>Lid Supply</div>
                              <div style={{fontWeight:700}}>{sup.toLocaleString()}/hr</div>
                            </div>
                            <div style={{textAlign:"center",background:ok?"rgba(16,185,129,.1)":"rgba(239,68,68,.1)",borderRadius:4,padding:4}}>
                              <div style={{fontSize:9,color:"var(--mut)"}}>Gap</div>
                              <div style={{fontWeight:700,color:ok?"#10b981":"#ef4444"}}>
                                {gap>=0?"+":""}{gap.toLocaleString()}/hr
                              </div>
                            </div>
                          </div>
                          {!ok&&(
                            <div style={{fontSize:10,color:"#ef4444",fontWeight:600,marginTop:6}}>
                              💡 Fix: {lidM[lt]} lid se max {Math.floor(sup/ITEMS.find(i=>i.lid===lt)?.bph||1)} box machines support hongi.
                              Ya ek aur lid machine lagao.
                            </div>
                          )}
                        </div>
                      );
                    }).filter(Boolean)}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      </div>
    );
  };


  // ══════════════════════════════════════════════
  // CALENDAR VIEW COMPONENT
  // ══════════════════════════════════════════════
  const CalendarView = ({tasks}) => {
    const [calMonth, setCalMonth] = useState(new Date().getMonth());
    const [calYear, setCalYear] = useState(new Date().getFullYear());
    const [selDate, setSelDate] = useState(null);
    const months=["January","February","March","April","May","June","July","August","September","October","November","December"];
    const days=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const firstDay=new Date(calYear,calMonth,1).getDay();
    const daysInMonth=new Date(calYear,calMonth+1,0).getDate();
    const todayStr=new Date().toISOString().slice(0,10);
    const tasksByDate={};
    tasks.forEach(t=>{if(t.due_date){if(!tasksByDate[t.due_date])tasksByDate[t.due_date]=[];tasksByDate[t.due_date].push(t);}});
    const cells=[];
    for(let i=0;i<firstDay;i++) cells.push(null);
    for(let d=1;d<=daysInMonth;d++) cells.push(d);

    const PRIORITY_C = {high:"#ef4444",medium:"#f59e0b",low:"#10b981"};

    return (
      <div className="card">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <button className="btn btn-o btn-sm" onClick={()=>{if(calMonth===0){setCalMonth(11);setCalYear(y=>y-1);}else setCalMonth(m=>m-1);}}>◀</button>
          <div style={{fontWeight:800,fontSize:15}}>{months[calMonth]} {calYear}</div>
          <button className="btn btn-o btn-sm" onClick={()=>{if(calMonth===11){setCalMonth(0);setCalYear(y=>y+1);}else setCalMonth(m=>m+1);}}>▶</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:6}}>
          {days.map(d=><div key={d} style={{textAlign:"center",fontSize:10,fontWeight:700,color:"var(--mut)",padding:"4px 0"}}>{d}</div>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
          {cells.map((day,idx)=>{
            if(!day) return <div key={"e"+idx} style={{minHeight:64}}/>;
            const dateStr=calYear+"-"+String(calMonth+1).padStart(2,"0")+"-"+String(day).padStart(2,"0");
            const dayTasks=tasksByDate[dateStr]||[];
            const isToday=dateStr===todayStr;
            const isPast=dateStr<todayStr;
            const isSel=selDate===dateStr;
            return (
              <div key={day} onClick={()=>setSelDate(isSel?null:dateStr)}
                style={{minHeight:64,padding:4,borderRadius:8,cursor:"pointer",
                  background:isSel?"rgba(59,130,246,.15)":isToday?"rgba(245,158,11,.12)":dayTasks.length>0?"var(--card2)":"transparent",
                  border:isSel?"2px solid #3b82f6":isToday?"2px solid #f59e0b":"1px solid var(--bdr)",
                  transition:"all .15s"}}>
                <div style={{fontWeight:isToday||isSel?800:400,fontSize:12,marginBottom:3,
                  color:isSel?"#3b82f6":isToday?"#f59e0b":isPast&&dayTasks.length>0?"#ef4444":"var(--txt)"}}>{day}</div>
                {dayTasks.slice(0,2).map((t,ti)=>(
                  <div key={ti} title={t.title+(t.assigned_to?" — "+t.assigned_to:"")}
                    style={{fontSize:9,padding:"1px 4px",borderRadius:3,marginBottom:2,
                      background:(PRIORITY_C[t.priority]||"#10b981")+"22",
                      color:PRIORITY_C[t.priority]||"#10b981",
                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontWeight:600}}>
                    {t.due_time&&t.due_time!=="10:00"?t.due_time.slice(0,5)+" ":""}{t.title}
                  </div>
                ))}
                {dayTasks.length>2&&<div style={{fontSize:9,color:"var(--mut)",fontWeight:700}}>+{dayTasks.length-2} more</div>}
              </div>
            );
          })}
        </div>

        {/* Selected date popup */}
        {selDate&&tasksByDate[selDate]&&(
          <div style={{marginTop:14,background:"var(--card2)",borderRadius:10,padding:14,border:"1px solid #3b82f6"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontWeight:700,fontSize:13,color:"#3b82f6"}}>
                📅 {new Date(selDate+"T00:00:00").toLocaleDateString("en-IN",{weekday:"long",day:"2-digit",month:"long"})}
                <span style={{fontWeight:400,fontSize:11,color:"var(--mut)",marginLeft:8}}>{tasksByDate[selDate].length} tasks</span>
              </div>
              <button onClick={()=>setSelDate(null)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--mut)",fontSize:16}}>✕</button>
            </div>
            {tasksByDate[selDate].map((t,i)=>(
              <div key={i} style={{padding:"10px 12px",background:"var(--card)",borderRadius:8,marginBottom:8,
                borderLeft:"3px solid "+(PRIORITY_C[t.priority]||"#10b981")}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:12,marginBottom:2}}>{t.title}</div>
                    {t.customer_name&&<div style={{fontSize:11,color:"var(--mut)"}}>👤 {t.customer_name}</div>}
                    {t.description&&<div style={{fontSize:11,color:"var(--mut)",marginTop:2}}>{t.description}</div>}
                    <div style={{display:"flex",gap:8,marginTop:4,flexWrap:"wrap"}}>
                      {t.due_time&&<span style={{fontSize:10,color:"var(--acc)"}}>⏰ {t.due_time.slice(0,5)}</span>}
                      {isAdmin&&t.assigned_to&&<span style={{fontSize:10,background:"rgba(59,130,246,.1)",color:"#3b82f6",padding:"1px 6px",borderRadius:4,fontWeight:600}}>👤 {t.assigned_to}</span>}
                      {isAdmin&&t.created_by&&t.created_by!==t.assigned_to&&<span style={{fontSize:10,color:"var(--mut)"}}>by {t.created_by}</span>}
                      <span style={{fontSize:10,padding:"1px 6px",borderRadius:4,fontWeight:600,
                        background:(PRIORITY_C[t.priority]||"#10b981")+"22",
                        color:PRIORITY_C[t.priority]||"#10b981"}}>{t.priority}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{display:"flex",gap:12,marginTop:10,flexWrap:"wrap"}}>
          {[["#ef4444","High"],["#f59e0b","Medium"],["#10b981","Low"]].map(([c,l])=>(
            <div key={l} style={{display:"flex",gap:4,alignItems:"center",fontSize:10,color:"var(--mut)"}}>
              <div style={{width:10,height:10,borderRadius:2,background:c+"33",border:"1px solid "+c}}/>
              {l}
            </div>
          ))}
          <span style={{fontSize:10,color:"var(--mut)"}}>· Date click karo tasks dekhne ke liye</span>
        </div>
      </div>
    );
  };

  // ══════════════════════════════════════════════
  // PLANNER + REMINDERS
  // ══════════════════════════════════════════════
  const Planner = () => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState("today"); // today | upcoming | all
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState({
      title:"", description:"", due_date: new Date().toISOString().slice(0,10),
      due_time:"09:00", type:"call", priority:"medium", customer_name:""
    });

    const loadTasks = async() => {
      setLoading(true);
      try {
        const today = new Date().toISOString().slice(0,10);
        // Admin sees all tasks, sales sees own + unassigned tasks
        let url = "crm_tasks?order=due_date.asc,due_time.asc&status=neq.done";
        if(view==="today") url += "&due_date=eq."+today;
        else if(view==="upcoming") url += "&due_date=gte."+today;
        const data = await sbFetch(url);
        // Filter in JS — show tasks assigned to me OR unassigned (created_by me)
        const filtered = isAdmin ? (data||[]) : (data||[]).filter(t=>
          t.assigned_to===myName ||
          (!t.assigned_to && t.created_by===myName) ||
          (!t.assigned_to && !t.created_by)
        );
        setTasks(filtered);
      } catch(e){}
      setLoading(false);
    };

    useEffect(()=>{ loadTasks(); },[view]);

    // Browser notification permission
    const requestNotifPermission = async() => {
      if("Notification" in window) {
        const perm = await Notification.requestPermission();
        if(perm==="granted") toast$("Notifications enabled!");
        else toast$("Notifications blocked by browser",true);
      }
    };

    // Check for due tasks and notify
    useEffect(()=>{
      const check = () => {
        const now = new Date();
        tasks.forEach(t=>{
          if(t.remind_at && !t.reminded) {
            const remindAt = new Date(t.remind_at);
            if(now >= remindAt && now < new Date(remindAt.getTime()+60000)) {
              if(Notification.permission==="granted") {
                new Notification("Mayur CRM Reminder", {
                  body: `${t.title}${t.customer_name?" — "+t.customer_name:""}`,
                  icon: "/favicon.ico"
                });
              }
              sbFetch("crm_tasks?id=eq."+t.id, {method:"PATCH", body:{reminded:true}});
            }
          }
        });
      };
      const interval = setInterval(check, 30000);
      return ()=>clearInterval(interval);
    },[tasks]);

    const addTask = async() => {
      if(!form.title) return;
      try {
        const remind_at = form.due_date && form.due_time
          ? new Date(form.due_date+"T"+form.due_time+":00").toISOString()
          : null;
        await sbFetch("crm_tasks", {method:"POST", body:{
          ...form, remind_at, created_by: myName, assigned_to: form.assigned_to||myName
        }});
        setShowAdd(false);
        setForm({title:"",description:"",due_date:new Date().toISOString().slice(0,10),due_time:"09:00",type:"call",priority:"medium",customer_name:""});
        loadTasks();
        toast$("Task added!");
      } catch(e){ toast$("Error adding task",true); }
    };

    const markDone = async(id) => {
      await sbFetch("crm_tasks?id=eq."+id, {method:"PATCH", body:{status:"done"}});
      setTasks(tasks.filter(t=>t.id!==id));
      toast$("Task done!");
    };

    const snooze = async(id, mins=60) => {
      const remind_at = new Date(Date.now()+mins*60000).toISOString();
      await sbFetch("crm_tasks?id=eq."+id, {method:"PATCH", body:{remind_at, reminded:false}});
      toast$(`Snoozed ${mins} min`);
    };

    const today = new Date().toISOString().slice(0,10);
    const todayTasks = tasks.filter(t=>t.due_date===today);
    const overdue = tasks.filter(t=>t.due_date<today);
    const upcoming = tasks.filter(t=>t.due_date>today);

    const TYPES = {call:"📞",meeting:"🤝",follow_up:"🔄",general:"📌",order:"🧾"};
    const PRIORITY = {high:{c:"#ef4444",bg:"rgba(239,68,68,.1)"},medium:{c:"#f59e0b",bg:"rgba(245,158,11,.1)"},low:{c:"#10b981",bg:"rgba(16,185,129,.1)"}};

    const TaskCard = ({task}) => (
      <div style={{padding:12,borderRadius:10,border:"1px solid var(--bdr)",
        background:task.priority==="high"?"rgba(239,68,68,.03)":"var(--card)",
        marginBottom:8,display:"flex",gap:10,alignItems:"flex-start"}}>
        <button onClick={()=>markDone(task.id)} style={{
          width:22,height:22,borderRadius:"50%",border:"2px solid var(--bdr)",
          background:"transparent",cursor:"pointer",flexShrink:0,marginTop:2,
          display:"flex",alignItems:"center",justifyContent:"center",fontSize:12
        }}>✓</button>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",marginBottom:4}}>
            <span style={{fontSize:14}}>{TYPES[task.type]||"📌"}</span>
            <span style={{fontWeight:700,fontSize:13}}>{task.title}</span>
            <span style={{padding:"1px 7px",borderRadius:8,fontSize:10,fontWeight:700,
              background:PRIORITY[task.priority]?.bg,color:PRIORITY[task.priority]?.c}}>
              {task.priority}
            </span>
          </div>
          {task.customer_name&&<div style={{fontSize:11,color:"var(--mut)",marginBottom:2}}>👤 {task.customer_name}</div>}
          {isAdmin&&task.assigned_to&&<div style={{fontSize:10,color:"#3b82f6",marginBottom:2}}>🎯 Assigned: <b>{task.assigned_to}</b> {task.created_by&&task.created_by!==task.assigned_to?"· by "+task.created_by:""}</div>}
          {task.description&&<div style={{fontSize:11,color:"var(--mut)",marginBottom:4}}>{task.description}</div>}
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            <span style={{fontSize:10,color:task.due_date<today?"#ef4444":"var(--mut)"}}>
              📅 {task.due_date} {task.due_time&&task.due_time!=="10:00"?task.due_time.slice(0,5):""}
            </span>
            <button onClick={()=>snooze(task.id,60)} style={{fontSize:10,padding:"1px 8px",borderRadius:6,
              border:"1px solid var(--bdr)",background:"transparent",cursor:"pointer",color:"var(--mut)"}}>
              ⏰ +1h
            </button>
            <button onClick={()=>snooze(task.id,1440)} style={{fontSize:10,padding:"1px 8px",borderRadius:6,
              border:"1px solid var(--bdr)",background:"transparent",cursor:"pointer",color:"var(--mut)"}}>
              📅 Kal
            </button>
          </div>
        </div>
      </div>
    );

    return (
      <div>
        <div className="sh">
          <div>
            <div className="sh-t">📅 Planner & Reminders</div>
            <div className="sh-s">Aaj ke tasks · Follow-ups · Customer calls</div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button className="btn btn-o btn-sm" onClick={requestNotifPermission}>🔔 Enable Alerts</button>
            <button className="btn btn-p" onClick={()=>setShowAdd(true)}>+ Add Task</button>
          </div>
        </div>

        {/* Summary badges */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}>
          {[
            ["🔴 Overdue",overdue.length,"#ef4444","rgba(239,68,68,.08)"],
            ["📅 Today",todayTasks.length,"#f59e0b","rgba(245,158,11,.08)"],
            ["📆 Upcoming",upcoming.length,"#10b981","rgba(16,185,129,.08)"],
          ].map(([lbl,cnt,c,bg])=>(
            <div key={lbl} style={{background:bg,border:`1px solid ${c}33`,borderRadius:10,
              padding:14,textAlign:"center",cursor:"pointer"}}
              onClick={()=>setView(lbl.includes("Today")?"today":lbl.includes("Over")?"all":"upcoming")}>
              <div style={{fontSize:24,fontWeight:800,color:c}}>{cnt}</div>
              <div style={{fontSize:11,color:c,fontWeight:600}}>{lbl}</div>
            </div>
          ))}
        </div>

        {/* Add Task Modal */}
        {showAdd&&(
          <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,.5)",
            zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
            <div style={{background:"var(--card)",borderRadius:16,padding:20,width:"100%",maxWidth:440}}>
              <div style={{fontWeight:700,fontSize:16,marginBottom:16}}>+ New Task</div>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <input className="inp" placeholder="Task title (e.g. Call Dominos buyer)" 
                  value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/>
                <input className="inp" placeholder="Customer/Party name (optional)"
                  value={form.customer_name} onChange={e=>setForm({...form,customer_name:e.target.value})}/>
                <textarea className="inp" placeholder="Notes / description" rows={2}
                  value={form.description} onChange={e=>setForm({...form,description:e.target.value})}
                  style={{resize:"none"}}/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <div>
                    <div style={{fontSize:10,color:"var(--mut)",marginBottom:4}}>Due Date</div>
                    <input type="date" className="inp" value={form.due_date}
                      onChange={e=>setForm({...form,due_date:e.target.value})}/>
                  </div>
                  <div>
                    <div style={{fontSize:10,color:"var(--mut)",marginBottom:4}}>Time (Reminder)</div>
                    <input type="time" className="inp" value={form.due_time}
                      onChange={e=>setForm({...form,due_time:e.target.value})}/>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <div>
                    <div style={{fontSize:10,color:"var(--mut)",marginBottom:4}}>Type</div>
                    <select className="inp" value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>
                      <option value="call">📞 Call</option>
                      <option value="meeting">🤝 Meeting</option>
                      <option value="follow_up">🔄 Follow-up</option>
                      <option value="order">🧾 Order</option>
                      <option value="general">📌 General</option>
                    </select>
                  </div>
                  <div>
                    <div style={{fontSize:10,color:"var(--mut)",marginBottom:4}}>Priority</div>
                    <select className="inp" value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}>
                      <option value="high">🔴 High</option>
                      <option value="medium">🟡 Medium</option>
                      <option value="low">🟢 Low</option>
                    </select>
                  </div>
                </div>
                <div style={{display:"flex",gap:8,marginTop:4}}>
                  <button className="btn btn-p" style={{flex:1,justifyContent:"center"}} onClick={addTask}>
                    Save Task
                  </button>
                  <button className="btn btn-o" onClick={()=>setShowAdd(false)}>Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View toggle */}
        <div style={{display:"flex",gap:6,marginBottom:12}}>
          {[["today","📅 Aaj"],["upcoming","📆 Upcoming"],["all","📋 Sab"],["calendar","🗓️ Calendar"]].map(([v,l])=>(
            <button key={v} className={`btn btn-sm ${view===v?"btn-p":"btn-o"}`}
              onClick={()=>setView(v)}>{l}</button>
          ))}
          <button className="btn btn-o btn-sm" onClick={loadTasks}>🔄</button>
        </div>

        {loading&&<div className="card empty"><p>Loading...</p></div>}

        {!loading&&(
          <div>
            {/* Overdue */}
            {overdue.length>0&&(
              <div style={{marginBottom:16}}>
                <div style={{fontSize:11,fontWeight:700,color:"#ef4444",marginBottom:8,
                  textTransform:"uppercase",letterSpacing:.5}}>🔴 Overdue ({overdue.length})</div>
                {overdue.map(t=><TaskCard key={t.id} task={t}/>)}
              </div>
            )}
            {/* Today */}
            {(view==="today"||view==="all")&&(
              <div style={{marginBottom:16}}>
                <div style={{fontSize:11,fontWeight:700,color:"#f59e0b",marginBottom:8,
                  textTransform:"uppercase",letterSpacing:.5}}>📅 Aaj — {today} ({todayTasks.length})</div>
                {todayTasks.length===0?<div style={{color:"var(--mut)",fontSize:12,padding:12}}>Aaj koi task nahi — add karo!</div>:
                  todayTasks.map(t=><TaskCard key={t.id} task={t}/>)}
              </div>
            )}
            {/* Upcoming */}
            {(view==="upcoming"||view==="all")&&upcoming.length>0&&(
              <div>
                <div style={{fontSize:11,fontWeight:700,color:"#10b981",marginBottom:8,
                  textTransform:"uppercase",letterSpacing:.5}}>📆 Upcoming ({upcoming.length})</div>
                {upcoming.map(t=><TaskCard key={t.id} task={t}/>)}
              </div>
            )}
            {tasks.length===0&&!loading&&view!=="calendar"&&(
              <div className="card empty"><p>Koi task nahi — "Add Task" dabao!</p></div>
            )}
          </div>
        )}

        {/* ── CALENDAR VIEW ── */}
        {view==="calendar"&&(
          <CalendarView tasks={tasks}/>
        )}
      </div>
    );
  };



  // ══════════════════════════════════════════════
  // PIPELINE — Deal Stages
  // ══════════════════════════════════════════════
  const Pipeline = () => {
    const [deals, setDeals] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showAdd, setShowAdd] = useState(false);
    const [selDeal, setSelDeal] = useState(null);
    const [viewDeal, setViewDeal] = useState(null);
    const [dForm, setDForm] = useState({
      title:"", customer_name:"", company:"", stage:"lead",
      value_per_month:"", probability:10, expected_close:"",
      product_mix:"", notes:"", assigned_to:""
    });
    const [actNote, setActNote] = useState("");
    const [filter, setFilter] = useState("active"); // active | won | lost | all

    const STAGES = [
      {id:"lead",      label:"🌱 Lead",        color:"#6b7280", prob:10},
      {id:"qualified", label:"✅ Qualified",    color:"#3b82f6", prob:25},
      {id:"proposal",  label:"📄 Proposal",     color:"#f59e0b", prob:50},
      {id:"negotiation",label:"🤝 Negotiation", color:"#f97316", prob:75},
      {id:"won",       label:"🏆 Won",          color:"#10b981", prob:100},
      {id:"lost",      label:"❌ Lost",         color:"#ef4444", prob:0},
    ];

    const loadDeals = async() => {
      setLoading(true);
      try {
        // Supabase: fetch all then filter in JS (avoids complex query issues)
        let url = "crm_deals?order=updated_at.desc&select=*";
        const allDeals = await sbFetch(url);
        let filtered = allDeals||[];
        if(filter==="active") filtered = filtered.filter(d=>d.stage!=="won"&&d.stage!=="lost");
        else if(filter==="won") filtered = filtered.filter(d=>d.stage==="won");
        else if(filter==="lost") filtered = filtered.filter(d=>d.stage==="lost");
        setDeals(filtered);
        setLoading(false);
        return;
        // fallback (shouldn't reach here)
        setDeals([]);
      } catch(e){}
      setLoading(false);
    };

    useEffect(()=>{ loadDeals(); },[filter]);

    const saveDeal = async() => {
      if(!dForm.title||!dForm.customer_name) return toast$("Title aur Customer required!",true);
      try {
        if(selDeal) {
          const patchBody = {
            title: dForm.title, customer_name: dForm.customer_name,
            company: dForm.company||"", stage: dForm.stage||"lead",
            probability: Number(dForm.probability)||10,
            product_mix: dForm.product_mix||"", notes: dForm.notes||"",
            assigned_to: dForm.assigned_to||"",
            updated_at: new Date().toISOString()
          };
          if(dForm.value_per_month) patchBody.value_per_month = Number(dForm.value_per_month);
          if(dForm.expected_close) patchBody.expected_close = dForm.expected_close;
          await sbFetch("crm_deals?id=eq."+selDeal.id, {method:"PATCH", body: patchBody});
          toast$("Deal updated!");
        } else {
          const postBody = {
            title: dForm.title,
            customer_name: dForm.customer_name,
            company: dForm.company||"",
            stage: dForm.stage||"lead",
            probability: Number(dForm.probability)||10,
            product_mix: dForm.product_mix||"",
            notes: dForm.notes||"",
            assigned_to: dForm.assigned_to||""
          };
          if(dForm.value_per_month) postBody.value_per_month = Number(dForm.value_per_month);
          if(dForm.expected_close) postBody.expected_close = dForm.expected_close;
          await sbFetch("crm_deals", {method:"POST", body: postBody});
          toast$("Deal added!");
        }
        setShowAdd(false); setSelDeal(null);
        setDForm({title:"",customer_name:"",company:"",stage:"lead",value_per_month:"",probability:10,expected_close:"",product_mix:"",notes:"",assigned_to:""});
        loadDeals();
      } catch(e){ toast$("Error: "+e.message,true); }
    };

    const moveStage = async(deal, newStage) => {
      const extra = newStage==="won" ? {won_at:new Date().toISOString()} : newStage==="lost" ? {lost_at:new Date().toISOString()} : {};
      const stg = STAGES.find(s=>s.id===newStage);
      await sbFetch("crm_deals?id=eq."+deal.id, {method:"PATCH", body:{
        stage:newStage, probability:stg?.prob||deal.probability,
        updated_at:new Date().toISOString(), ...extra
      }});
      // Log activity
      await sbFetch("crm_deal_activities", {method:"POST", body:{
        deal_id:deal.id, type:"stage_change",
        from_stage:deal.stage, to_stage:newStage,
        note:"Stage moved: "+deal.stage+" → "+newStage,
        created_by:userRole
      }});
      loadDeals();
      toast$("Stage updated!");
    };

    const addActivity = async(dealId) => {
      if(!actNote) return;
      await sbFetch("crm_deal_activities", {method:"POST", body:{
        deal_id:dealId, type:"note", note:actNote, created_by:userRole
      }});
      setActNote("");
      toast$("Note added!");
    };

    // Pipeline summary
    const activeDe = deals.filter(d=>!["won","lost"].includes(d.stage));
    const totalPipe = activeDe.reduce((s,d)=>s+(Number(d.value_per_month)||0),0);
    const weightedPipe = activeDe.reduce((s,d)=>s+(Number(d.value_per_month)||0)*(d.probability||0)/100,0);
    const wonThis = deals.filter(d=>d.stage==="won"&&d.won_at?.startsWith(new Date().toISOString().slice(0,7)));

    const deleteDeal = async(id) => {
      if(!window.confirm("Delete this deal?")) return;
      await sbFetch("crm_deal_activities?deal_id=eq."+id, {method:"DELETE"});
      await sbFetch("crm_deals?id=eq."+id, {method:"DELETE"});
      toast$("Deal deleted!");
      loadDeals();
    };

    const DealCard = ({deal}) => {
      const stg = STAGES.find(s=>s.id===deal.stage);
      return (
        <div style={{background:"var(--card)",border:"1px solid var(--bdr)",borderRadius:10,
          padding:12,marginBottom:8,borderLeft:"3px solid "+stg?.color}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
            <div style={{flex:1,cursor:"pointer"}} onClick={()=>setViewDeal(deal)}>
              <div style={{fontWeight:700,fontSize:13,marginBottom:2}}>{deal.title}</div>
              <div style={{fontSize:11,color:"var(--mut)"}}>🏢 {deal.customer_name} {deal.company?"· "+deal.company:""}</div>
              {deal.product_mix&&<div style={{fontSize:10,color:"var(--mut)",marginTop:2}}>📦 {deal.product_mix}</div>}
              {deal.assigned_to&&<div style={{fontSize:10,color:"#3b82f6",marginTop:2}}>👤 Rep: <b>{deal.assigned_to}</b></div>}
            </div>
            <div style={{textAlign:"right",flexShrink:0}}>
              {deal.value_per_month&&<div style={{fontWeight:800,color:"#10b981",fontSize:13}}>₹{Number(deal.value_per_month).toLocaleString("en-IN")}/mo</div>}
              <div style={{fontSize:10,color:stg?.color,fontWeight:700}}>{deal.probability}% chance</div>
            </div>
          </div>
          {deal.expected_close&&(
            <div style={{fontSize:10,color:"var(--mut)",marginTop:4}}>
              🗓️ Close by: {deal.expected_close}
              {new Date(deal.expected_close)<new Date()&&deal.stage!=="won"&&<span style={{color:"#ef4444",marginLeft:4}}>OVERDUE</span>}
            </div>
          )}
          <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}>
            <span style={{padding:"2px 8px",borderRadius:6,fontSize:10,fontWeight:700,
              background:stg?.color+"22",color:stg?.color}}>{stg?.label}</span>
            {deal.stage!=="won"&&deal.stage!=="lost"&&STAGES.filter(s=>!["won","lost"].includes(s.id)&&s.id!==deal.stage).map(s=>(
              <button key={s.id} onClick={()=>moveStage(deal,s.id)} style={{
                padding:"2px 8px",borderRadius:6,fontSize:10,border:"1px solid "+s.color,
                background:"transparent",color:s.color,cursor:"pointer"}}>→ {s.label.split(" ")[1]}</button>
            ))}
            {deal.stage!=="won"&&<button onClick={()=>moveStage(deal,"won")} style={{padding:"2px 8px",borderRadius:6,fontSize:10,border:"1px solid #10b981",background:"#10b981",color:"#fff",cursor:"pointer",fontWeight:700}}>🏆 Won!</button>}
            {deal.stage!=="lost"&&deal.stage!=="won"&&<button onClick={()=>moveStage(deal,"lost")} style={{padding:"2px 8px",borderRadius:6,fontSize:10,border:"1px solid #ef4444",background:"transparent",color:"#ef4444",cursor:"pointer"}}>✕ Lost</button>}
            <button onClick={()=>setViewDeal(deal)} style={{padding:"2px 8px",borderRadius:6,fontSize:10,border:"1px solid var(--bdr)",background:"transparent",color:"var(--mut)",cursor:"pointer"}}>👁 View</button>
            <button onClick={()=>{setSelDeal(deal);setDForm({...deal});setShowAdd(true);}} style={{padding:"2px 8px",borderRadius:6,fontSize:10,border:"1px solid var(--bdr)",background:"transparent",color:"var(--mut)",cursor:"pointer"}}>✏️ Edit</button>
            {isAdmin&&<button onClick={()=>deleteDeal(deal.id)} style={{padding:"2px 8px",borderRadius:6,fontSize:10,border:"1px solid #ef4444",background:"transparent",color:"#ef4444",cursor:"pointer"}}>🗑 Del</button>}
            <select
              value={deal.assigned_to||""}
              onChange={async(e)=>{
                const newRep = e.target.value;
                if(!newRep) return;
                await sbFetch("crm_deals?id=eq."+deal.id, {method:"PATCH", body:{
                  assigned_to:newRep, updated_at:new Date().toISOString()
                }});
                await sbFetch("crm_deal_activities", {method:"POST", body:{
                  deal_id:deal.id, type:"reassign",
                  note:"Reassigned from "+(deal.assigned_to||"unassigned")+" to "+newRep,
                  created_by:userRole
                }});
                toast$("Deal reassigned to "+newRep+"!");
                loadDeals();
              }}
              style={{padding:"2px 6px",borderRadius:6,fontSize:10,border:"1px solid #3b82f6",
                background:"transparent",color:"#3b82f6",cursor:"pointer"}}
              onClick={e=>e.stopPropagation()}>
              <option value="">🔄 Reassign</option>
              {(USERS.length>0?USERS.map(u=>u.name):[]).map(name=>(
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        </div>
      );
    };

    return (
      <div>
        <div className="sh">
          <div>
            <div className="sh-t">🎯 Sales Pipeline</div>
            <div className="sh-s">Lead se Order tak — track karo</div>
          </div>
          <button className="btn btn-p" onClick={()=>{setSelDeal(null);setDForm({title:"",customer_name:"",company:"",stage:"lead",value_per_month:"",probability:10,expected_close:"",product_mix:"",notes:"",assigned_to:""});setShowAdd(true);}}>+ New Deal</button>
        </div>

        {/* Summary cards */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
          {[
            ["Total Pipeline",activeDe.length+" deals","₹"+Math.round(totalPipe/1000)+"K/mo","#3b82f6"],
            ["Weighted Value","Probability based","₹"+Math.round(weightedPipe/1000)+"K/mo","#f59e0b"],
            ["Won This Month",wonThis.length+" deals","₹"+Math.round(wonThis.reduce((s,d)=>s+(Number(d.value_per_month)||0),0)/1000)+"K/mo","#10b981"],
            ["Avg Deal Size",activeDe.length?"₹"+Math.round(totalPipe/activeDe.length/1000)+"K/mo":"—","per deal","#6b7280"],
          ].map(([lbl,sub,val,c])=>(
            <div key={lbl} style={{background:c+"11",border:"1px solid "+c+"33",borderRadius:10,padding:12}}>
              <div style={{fontSize:10,color:"var(--mut)",marginBottom:4}}>{lbl}</div>
              <div style={{fontSize:18,fontWeight:800,color:c}}>{val}</div>
              <div style={{fontSize:10,color:"var(--mut)"}}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Stage funnel bar */}
        <div className="card" style={{marginBottom:14,padding:12}}>
          <div style={{fontWeight:700,fontSize:12,marginBottom:10}}>Stage Funnel</div>
          <div style={{display:"flex",gap:4}}>
            {STAGES.filter(s=>s.id!=="lost").map(s=>{
              const cnt = deals.filter(d=>d.stage===s.id).length;
              const val = deals.filter(d=>d.stage===s.id).reduce((a,d)=>a+(Number(d.value_per_month)||0),0);
              return (
                <div key={s.id} style={{flex:1,textAlign:"center",cursor:"pointer"}} onClick={()=>setFilter(s.id==="won"?"won":"active")}>
                  <div style={{background:s.color+"22",border:"1px solid "+s.color+"44",borderRadius:6,padding:"6px 4px"}}>
                    <div style={{fontWeight:800,color:s.color,fontSize:16}}>{cnt}</div>
                    <div style={{fontSize:9,color:"var(--mut)"}}>{s.label}</div>
                    {val>0&&<div style={{fontSize:9,color:s.color}}>₹{Math.round(val/1000)}K</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Deal Detail Modal */}
        {viewDeal&&(
          <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,.5)",
            zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
            onClick={()=>setViewDeal(null)}>
            <div style={{background:"var(--card)",borderRadius:16,padding:20,width:"100%",maxWidth:480,
              maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
              {(()=>{
                const stg = STAGES.find(s=>s.id===viewDeal.stage);
                return (<>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                    <div style={{fontWeight:800,fontSize:16}}>Deal Detail</div>
                    <div style={{display:"flex",gap:8}}>
                      {isAdmin&&<button onClick={()=>{setViewDeal(null);deleteDeal(viewDeal.id);}}
                        style={{padding:"4px 10px",borderRadius:6,fontSize:11,border:"1px solid #ef4444",
                          background:"transparent",color:"#ef4444",cursor:"pointer"}}>🗑 Delete</button>}
                      <button onClick={()=>setViewDeal(null)} style={{padding:"4px 10px",borderRadius:6,
                        fontSize:11,border:"1px solid var(--bdr)",background:"transparent",cursor:"pointer"}}>✕ Close</button>
                    </div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:12}}>
                    {[
                      ["Title", viewDeal.title],
                      ["Customer", viewDeal.customer_name],
                      ["Company", viewDeal.company],
                      ["Stage", stg?.label],
                      ["Probability", (viewDeal.probability||0)+"%"],
                      ["Value/Month", viewDeal.value_per_month?"₹"+Number(viewDeal.value_per_month).toLocaleString("en-IN")+"/mo":"—"],
                      ["Expected Close", viewDeal.expected_close||"—"],
                      ["Product Mix", viewDeal.product_mix||"—"],
                      ["Assigned To", viewDeal.assigned_to||"—"],
                      ["Notes", viewDeal.notes||"—"],
                      ["Created", viewDeal.created_at?new Date(viewDeal.created_at).toLocaleDateString("en-IN"):"—"],
                      ["Last Updated", viewDeal.updated_at?new Date(viewDeal.updated_at).toLocaleDateString("en-IN"):"—"],
                      ...(viewDeal.won_at?[["Won On", new Date(viewDeal.won_at).toLocaleDateString("en-IN")]]:[] ),
                      ...(viewDeal.lost_at?[["Lost On", new Date(viewDeal.lost_at).toLocaleDateString("en-IN")]]:[] ),
                      ...(viewDeal.lost_reason?[["Lost Reason", viewDeal.lost_reason]]:[] ),
                    ].map(([lbl,val])=>val&&val!=="—"?(
                      <div key={lbl} style={{display:"flex",gap:10,padding:"8px 0",borderBottom:"1px solid var(--bdr)"}}>
                        <div style={{fontSize:11,color:"var(--mut)",width:120,flexShrink:0}}>{lbl}</div>
                        <div style={{fontSize:12,fontWeight:600}}>{val}</div>
                      </div>
                    ):null)}
                    <div style={{display:"flex",gap:8,marginTop:8}}>
                      <button className="btn btn-p" style={{flex:1,justifyContent:"center"}}
                        onClick={()=>{setViewDeal(null);setSelDeal(viewDeal);setDForm({...viewDeal});setShowAdd(true);}}>
                        ✏️ Edit Deal
                      </button>
                    </div>
                  </div>
                </>);
              })()}
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div style={{display:"flex",gap:6,marginBottom:12}}>
          {[["active","🎯 Active"],["won","🏆 Won"],["lost","❌ Lost"],["all","📋 All"]].map(([v,l])=>(
            <button key={v} className={"btn btn-sm "+(filter===v?"btn-p":"btn-o")} onClick={()=>setFilter(v)}>{l}</button>
          ))}
          <button className="btn btn-o btn-sm" onClick={loadDeals}>🔄</button>
        </div>

        {loading&&<div className="card empty"><p>Loading...</p></div>}

        {/* Stage-wise deals */}
        {!loading&&filter==="active"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            {STAGES.filter(s=>!["won","lost"].includes(s.id)).map(stg=>{
              const stgDeals = deals.filter(d=>d.stage===stg.id);
              return (
                <div key={stg.id}>
                  <div style={{fontWeight:700,fontSize:11,color:stg.color,marginBottom:8,
                    textTransform:"uppercase",letterSpacing:.5,display:"flex",justifyContent:"space-between"}}>
                    <span>{stg.label} ({stgDeals.length})</span>
                    {stgDeals.length>0&&<span style={{fontWeight:400,fontSize:10}}>₹{Math.round(stgDeals.reduce((a,d)=>a+(Number(d.value_per_month)||0),0)/1000)}K/mo</span>}
                  </div>
                  {stgDeals.length===0?<div style={{color:"var(--mut)",fontSize:12,padding:8,border:"1px dashed var(--bdr)",borderRadius:8,textAlign:"center"}}>Koi deal nahi</div>:
                    stgDeals.map(d=><DealCard key={d.id} deal={d}/>)}
                </div>
              );
            })}
          </div>
        )}

        {!loading&&filter!=="active"&&(
          <div>{deals.map(d=><DealCard key={d.id} deal={d}/>)}</div>
        )}

        {/* Add/Edit Modal */}
        {showAdd&&(
          <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,.5)",
            zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16,overflowY:"auto"}}>
            <div style={{background:"var(--card)",borderRadius:16,padding:20,width:"100%",maxWidth:480,margin:"auto"}}>
              <div style={{fontWeight:700,fontSize:16,marginBottom:16}}>{selDeal?"✏️ Edit Deal":"+ New Deal"}</div>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <input className="inp" placeholder="Deal title (e.g. 500ml Milky — 50K pcs/mo)" value={dForm.title} onChange={e=>setDForm({...dForm,title:e.target.value})}/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <input className="inp" placeholder="Customer name" value={dForm.customer_name} onChange={e=>setDForm({...dForm,customer_name:e.target.value})}/>
                  <input className="inp" placeholder="Company" value={dForm.company} onChange={e=>setDForm({...dForm,company:e.target.value})}/>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <div>
                    <div style={{fontSize:10,color:"var(--mut)",marginBottom:4}}>Stage</div>
                    <select className="inp" value={dForm.stage} onChange={e=>{ const s=STAGES.find(x=>x.id===e.target.value); setDForm({...dForm,stage:e.target.value,probability:s?.prob||dForm.probability}); }}>
                      {STAGES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{fontSize:10,color:"var(--mut)",marginBottom:4}}>Probability %</div>
                    <input type="number" className="inp" value={dForm.probability} onChange={e=>setDForm({...dForm,probability:Number(e.target.value)})}/>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <div>
                    <div style={{fontSize:10,color:"var(--mut)",marginBottom:4}}>Value/Month (₹)</div>
                    <input type="number" className="inp" placeholder="Expected monthly value" value={dForm.value_per_month} onChange={e=>setDForm({...dForm,value_per_month:e.target.value})}/>
                  </div>
                  <div>
                    <div style={{fontSize:10,color:"var(--mut)",marginBottom:4}}>Expected Close Date</div>
                    <input type="date" className="inp" value={dForm.expected_close} onChange={e=>setDForm({...dForm,expected_close:e.target.value})}/>
                  </div>
                </div>
                <input className="inp" placeholder="Product mix (e.g. 500ml Milky, 300ml Black)" value={dForm.product_mix} onChange={e=>setDForm({...dForm,product_mix:e.target.value})}/>
                <div>
                  <div style={{fontSize:10,color:"var(--mut)",marginBottom:4}}>Assigned To (Sales Rep)</div>
                  <select className="inp" value={dForm.assigned_to} onChange={e=>setDForm({...dForm,assigned_to:e.target.value})}>
                    <option value="">-- Select Rep --</option>
                    {(USERS.length>0?USERS.map(u=>u.name):[]).map(name=>(
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
                <textarea className="inp" placeholder="Notes" rows={2} value={dForm.notes} onChange={e=>setDForm({...dForm,notes:e.target.value})} style={{resize:"none"}}/>
                <div style={{display:"flex",gap:8}}>
                  <button className="btn btn-p" style={{flex:1,justifyContent:"center"}} onClick={saveDeal}>Save Deal</button>
                  <button className="btn btn-o" onClick={()=>{setShowAdd(false);setSelDeal(null);}}>Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };



  // ══════════════════════════════════════════════
  // SALES FORECASTING
  // ══════════════════════════════════════════════
  const Forecast = () => {
    const [fMonth, setFMonth] = useState(new Date().getMonth()+1);
    const [fYear, setFYear] = useState(new Date().getFullYear());
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

    // Pipeline deals → forecast
    const [deals, setDeals] = useState([]);
    const [loading, setLoading] = useState(false);

    React.useEffect(()=>{
      setLoading(true);
      sbFetch("crm_deals?order=updated_at.desc&select=*")
        .then(d=>setDeals(d||[]))
        .finally(()=>setLoading(false));
    },[]);

    const activeDe = deals.filter(d=>!["lost"].includes(d.stage));
    
    // Monthly forecast from pipeline
    const pipelineByRep = USERS.reduce((acc,u)=>{
      const myDeals = activeDe.filter(d=>d.assigned_to===u.name);
      const weighted = myDeals.reduce((s,d)=>s+(Number(d.value_per_month)||0)*(d.probability||0)/100,0);
      const bestCase = myDeals.reduce((s,d)=>s+(Number(d.value_per_month)||0),0);
      const wonDeals = deals.filter(d=>d.stage==="won"&&d.assigned_to===u.name);
      const wonVal = wonDeals.reduce((s,d)=>s+(Number(d.value_per_month)||0),0);
      acc[u.name] = {weighted, bestCase, wonVal, deals:myDeals.length, wonDeals:wonDeals.length};
      return acc;
    },{});

    // Orders this month
    const inMonth = (dateStr) => {
      if(!dateStr) return false;
      const d = new Date(dateStr);
      return d.getFullYear()===fYear && d.getMonth()===fMonth-1;
    };
    const monthOrders = ORDERS.filter(o=>inMonth(o.order_date));
    const monthRev = monthOrders.reduce((s,o)=>s+(Number(o.total_amount)||0),0);

    // Target this month
    const curMonthStr = String(fMonth).padStart(2,"0");
    const monthTarget = TARGETS.filter(t=>t.month===curMonthStr&&t.year===fYear)
      .reduce((s,t)=>s+(Number(t.target_amount)||0),0);

    // Total pipeline weighted
    const totalWeighted = activeDe.reduce((s,d)=>s+(Number(d.value_per_month)||0)*(d.probability||0)/100,0);
    const totalBest = activeDe.reduce((s,d)=>s+(Number(d.value_per_month)||0),0);

    return (
      <div>
        <div className="sh">
          <div>
            <div className="sh-t">📈 Sales Forecasting</div>
            <div className="sh-s">Pipeline se monthly forecast · Target vs Actual</div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <select className="inp" style={{width:"auto",padding:"5px 10px",fontSize:11}}
              value={fMonth} onChange={e=>setFMonth(Number(e.target.value))}>
              {months.map((m,i)=><option key={i} value={i+1}>{m}</option>)}
            </select>
            <select className="inp" style={{width:"auto",padding:"5px 10px",fontSize:11}}
              value={fYear} onChange={e=>setFYear(Number(e.target.value))}>
              {[2025,2026,2027].map(y=><option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* Summary cards */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
          {[
            ["🎯 Monthly Target", monthTarget>0?"₹"+Math.round(monthTarget/1000)+"K":"Not set", "From Targets tab", "#3b82f6"],
            ["✅ Achieved", "₹"+Math.round(monthRev/1000)+"K", monthOrders.length+" orders", "#10b981"],
            ["📊 Weighted Forecast", "₹"+Math.round(totalWeighted/1000)+"K/mo", "Probability adjusted", "#f59e0b"],
            ["🚀 Best Case", "₹"+Math.round(totalBest/1000)+"K/mo", "If all deals close", "#a78bfa"],
          ].map(([lbl,val,sub,c])=>(
            <div key={lbl} style={{background:c+"11",border:"1px solid "+c+"33",borderRadius:10,padding:12}}>
              <div style={{fontSize:10,color:"var(--mut)",marginBottom:4}}>{lbl}</div>
              <div style={{fontSize:18,fontWeight:800,color:c}}>{val}</div>
              <div style={{fontSize:10,color:"var(--mut)"}}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Target vs Achieved bar */}
        {monthTarget>0&&(
          <div className="card" style={{marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
              <span style={{fontWeight:700,fontSize:13}}>{months[fMonth-1]} {fYear} — Target vs Achieved</span>
              <span style={{fontSize:12,color:"var(--mut)"}}>{monthTarget>0?Math.round(monthRev/monthTarget*100):0}% achieved</span>
            </div>
            <div style={{background:"var(--card2)",borderRadius:8,height:24,overflow:"hidden",position:"relative"}}>
              <div style={{height:"100%",width:Math.min(monthRev/monthTarget*100,100)+"%",
                background:monthRev>=monthTarget?"#10b981":"#f59e0b",borderRadius:8,transition:"width .5s"}}/>
              <span style={{position:"absolute",right:8,top:0,fontSize:11,lineHeight:"24px",fontWeight:700}}>
                ₹{Math.round(monthRev/1000)}K / ₹{Math.round(monthTarget/1000)}K
              </span>
            </div>
            <div style={{fontSize:11,color:monthRev>=monthTarget?"#10b981":"#ef4444",marginTop:6,fontWeight:700}}>
              {monthRev>=monthTarget?"🎉 Target achieved!":"Gap: ₹"+Math.round((monthTarget-monthRev)/1000)+"K remaining"}
            </div>
          </div>
        )}

        {/* Rep-wise forecast */}
        <div className="card" style={{marginBottom:14,padding:0}}>
          <div style={{padding:"12px 16px",fontWeight:700,fontSize:13,borderBottom:"1px solid var(--bdr)"}}>
            👤 Rep-wise Pipeline Forecast
          </div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead>
              <tr style={{background:"var(--card2)"}}>
                {["Rep","Active Deals","Won Deals","Won Value","Weighted Forecast","Best Case","Achievement %"].map(h=>(
                  <th key={h} style={{padding:"8px 12px",fontSize:10,color:"var(--mut)",textAlign:h==="Rep"?"left":"center"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {USERS.map(u=>{
                const d = pipelineByRep[u.name]||{weighted:0,bestCase:0,wonVal:0,deals:0,wonDeals:0};
                const tgt = TARGETS.find(t=>t.user_name===u.name&&t.month===curMonthStr&&t.year===fYear);
                const tgtAmt = Number(tgt?.target_amount||0);
                const ach = monthOrders.filter(o=>o.created_by===u.name).reduce((s,o)=>s+(Number(o.total_amount)||0),0);
                const achPct = tgtAmt>0?Math.round(ach/tgtAmt*100):null;
                return (
                  <tr key={u.name} style={{borderBottom:"1px solid var(--bdr)"}}>
                    <td style={{padding:"10px 12px",fontWeight:700}}>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <Av name={u.name} size={28}/>{u.name}
                      </div>
                    </td>
                    <td style={{padding:"10px",textAlign:"center",fontWeight:700,color:"#3b82f6"}}>{d.deals}</td>
                    <td style={{padding:"10px",textAlign:"center",fontWeight:700,color:"#10b981"}}>{d.wonDeals}</td>
                    <td style={{padding:"10px",textAlign:"center",fontWeight:700,color:"#10b981"}}>
                      {d.wonVal>0?"₹"+Math.round(d.wonVal/1000)+"K/mo":"—"}
                    </td>
                    <td style={{padding:"10px",textAlign:"center",fontWeight:700,color:"#f59e0b"}}>
                      {d.weighted>0?"₹"+Math.round(d.weighted/1000)+"K/mo":"—"}
                    </td>
                    <td style={{padding:"10px",textAlign:"center",color:"#a78bfa"}}>
                      {d.bestCase>0?"₹"+Math.round(d.bestCase/1000)+"K/mo":"—"}
                    </td>
                    <td style={{padding:"10px",textAlign:"center"}}>
                      {achPct!==null?(
                        <div>
                          <div style={{fontWeight:800,color:achPct>=100?"#10b981":achPct>=70?"#f59e0b":"#ef4444"}}>{achPct}%</div>
                          <div style={{fontSize:9,color:"var(--mut)"}}>₹{Math.round(ach/1000)}K / ₹{Math.round(tgtAmt/1000)}K</div>
                        </div>
                      ):<span style={{color:"var(--mut)",fontSize:10}}>No target</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Stage-wise pipeline value */}
        <div className="card" style={{marginBottom:14}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>🎯 Pipeline Stage Analysis</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {[
              {id:"lead",label:"🌱 Lead",color:"#6b7280",prob:10},
              {id:"qualified",label:"✅ Qualified",color:"#3b82f6",prob:25},
              {id:"proposal",label:"📄 Proposal",color:"#f59e0b",prob:50},
              {id:"negotiation",label:"🤝 Negotiation",color:"#f97316",prob:75},
              {id:"won",label:"🏆 Won",color:"#10b981",prob:100},
            ].map(stg=>{
              const stgDeals = deals.filter(d=>d.stage===stg.id);
              const val = stgDeals.reduce((s,d)=>s+(Number(d.value_per_month)||0),0);
              const weighted = val * stg.prob/100;
              return (
                <div key={stg.id} style={{flex:1,minWidth:120,background:stg.color+"11",
                  border:"1px solid "+stg.color+"33",borderRadius:10,padding:12,textAlign:"center"}}>
                  <div style={{fontSize:11,fontWeight:700,color:stg.color,marginBottom:6}}>{stg.label}</div>
                  <div style={{fontSize:18,fontWeight:800,color:stg.color}}>{stgDeals.length}</div>
                  <div style={{fontSize:10,color:"var(--mut)"}}>deals</div>
                  {val>0&&<div style={{fontSize:11,fontWeight:700,marginTop:4}}>₹{Math.round(val/1000)}K/mo</div>}
                  {val>0&&<div style={{fontSize:9,color:"var(--mut)"}}>Weighted: ₹{Math.round(weighted/1000)}K</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Deal list with expected close */}
        <div className="card" style={{padding:0}}>
          <div style={{padding:"12px 16px",fontWeight:700,fontSize:13,borderBottom:"1px solid var(--bdr)"}}>
            📋 Deals Closing Soon
          </div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead>
              <tr style={{background:"var(--card2)"}}>
                {["Deal","Customer","Rep","Stage","Value/mo","Probability","Expected Close","Weighted"].map(h=>(
                  <th key={h} style={{padding:"8px",fontSize:10,color:"var(--mut)",textAlign:h==="Deal"||h==="Customer"?"left":"center"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeDe
                .filter(d=>d.expected_close)
                .sort((a,b)=>new Date(a.expected_close)-new Date(b.expected_close))
                .map((d,i)=>{
                  const weighted = (Number(d.value_per_month)||0)*(d.probability||0)/100;
                  const overdue = new Date(d.expected_close)<new Date() && d.stage!=="won";
                  return (
                    <tr key={i} style={{borderBottom:"1px solid var(--bdr)",
                      background:overdue?"rgba(239,68,68,.04)":"transparent"}}>
                      <td style={{padding:"8px 10px",fontWeight:600,fontSize:11}}>{d.title}</td>
                      <td style={{padding:"8px",color:"var(--mut)",fontSize:11}}>{d.customer_name}</td>
                      <td style={{padding:"8px",textAlign:"center",fontSize:11}}>{d.assigned_to||"—"}</td>
                      <td style={{padding:"8px",textAlign:"center"}}>
                        <span style={{fontSize:10,padding:"2px 6px",borderRadius:6,
                          background:"var(--card2)",fontWeight:700}}>{d.stage}</span>
                      </td>
                      <td style={{padding:"8px",textAlign:"center",fontWeight:700,color:"#10b981"}}>
                        {d.value_per_month?"₹"+Number(d.value_per_month).toLocaleString("en-IN"):"—"}
                      </td>
                      <td style={{padding:"8px",textAlign:"center",fontWeight:700}}>{d.probability||0}%</td>
                      <td style={{padding:"8px",textAlign:"center",
                        color:overdue?"#ef4444":"var(--txt)",fontWeight:overdue?700:400}}>
                        {d.expected_close} {overdue&&"⚠️"}
                      </td>
                      <td style={{padding:"8px",textAlign:"center",fontWeight:700,color:"#f59e0b"}}>
                        {weighted>0?"₹"+Math.round(weighted/1000)+"K":"—"}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };



  // ══════════════════════════════════════════════
  // SOP — Standard Operating Procedure
  // ══════════════════════════════════════════════
  const SOP = () => {
    const isFieldSales = ["Akhilesh"].includes(currentUser?.name);
    const isInsideSales = ["Karan"].includes(currentUser?.name);
    const isPooja = currentUser?.name==="Pooja";
    const [sopTab, setSopTab] = useState(isFieldSales?"field":isInsideSales?"inside":isPooja?"aashi":"field");

    const FieldSOP = () => (
      <div style={{fontSize:13,lineHeight:1.9}}>
        <div style={{background:"rgba(59,130,246,.08)",border:"1px solid rgba(59,130,246,.2)",
          borderRadius:10,padding:14,marginBottom:16}}>
          <div style={{fontWeight:800,fontSize:15,marginBottom:4}}>🎯 Aapka Kaam Kya Hai?</div>
          <div>Aap <b>field sales</b> mein ho — seedha customer ke paas jaana, malna, order lana.</div>
          <div style={{marginTop:6}}>CRM aapka <b>digital diary</b> hai — visit log karo, note karo, reminder lagao, order enter karo.</div>
        </div>

        {[
          {
            time:"🌅 SUBAH (9 AM)", color:"#3b82f6",
            steps:[
              {icon:"📅",title:"Planner check karo",desc:'CRM → Planner tab → 🔴 Overdue tasks pehle karo → 🟡 Aaj ki calls plan karo'},
              {icon:"👥",title:"Apni parties dekho",desc:'CRM → Customers → Akhilesh filter lagao → Follow-up 🔴🟡 wali parties pehle visit karo'},
            ]
          },
          {
            time:"🚗 FIELD MEIN — Har Visit Ke Baad", color:"#f59e0b",
            steps:[
               {icon:"🔍",title:"Party dhundho — Step 1",desc:'CRM kholo → Customers tab → Search bar mein party ka naam type karo → Party ke naam pe click karo'},
               {icon:"📝",title:"Log Interaction — Step 2",desc:"Party ke page pe 'Log Interaction' button dabao (upar right corner mein) → Form khulega"},
               {icon:"📋",title:"Form bharo — Step 3",desc:"Type = Visit select karo → Note mein kya baat hui likho (2-3 lines) → Follow-up date daalo → Save dabao"},
               {icon:"💡",title:"Note kaise likhein",desc:'"500ml Milky sample diya. Price ₹2050 discuss ki. 15 Aug tak order confirm hoga."'},
            ]
          },
          {
            time:"🧾 ORDER MILA — Turant Enter Karo", color:"#10b981",
            steps:[
              {icon:"➕",title:"Order enter karo",desc:'CRM → New Order (top button) → Party select → Items bharo → Price daalo → Save'},
              {icon:"💬",title:"WhatsApp bhejo",desc:'Order detail mein → WA Message button dabao → Copy hoga → WhatsApp kholo → Paste karo → Send!'},
            ]
          },
          {
            time:"🌆 SHAM (6 PM)", color:"#a78bfa",
            steps:[
              {icon:"✓",title:"Done tasks tick karo",desc:'Planner → Completed tasks pe ✓ dabao → Kal ke tasks check karo'},
              {icon:"🎯",title:"Pipeline update karo",desc:'Pipeline → Deals mein stage move karo agar progress hui → Weekly ek baar zaroori'},
            ]
          },
        ].map((section,si)=>(
          <div key={si} style={{marginBottom:20}}>
            <div style={{fontWeight:800,fontSize:13,color:section.color,
              background:section.color+"11",padding:"8px 14px",borderRadius:8,marginBottom:10}}>
              {section.time}
            </div>
            {section.steps.map((step,i)=>(
              <div key={i} style={{display:"flex",gap:12,marginBottom:10,
                background:"var(--card2)",borderRadius:8,padding:"10px 14px"}}>
                <div style={{fontSize:20,flexShrink:0}}>{step.icon}</div>
                <div>
                  <div style={{fontWeight:700,marginBottom:2}}>{step.title}</div>
                  <div style={{fontSize:12,color:"var(--mut)"}}>{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        ))}

        <div style={{background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",
          borderRadius:10,padding:14}}>
          <div style={{fontWeight:800,marginBottom:8}}>⚠️ 5 Zaroori Rules</div>
          {[
            "Har visit ke baad note karo — chahe 2 line hi sahi",
            "Follow-up date zaroori — bina date ke note mat karo",
            "Order same din enter karo — kal pe mat chhodo",
            "Pipeline weekly update karo — har Friday",
            "Planner roz subah check karo — ye aapka to-do list hai",
          ].map((r,i)=>(
            <div key={i} style={{display:"flex",gap:8,marginBottom:6,fontSize:12}}>
              <span style={{color:"#ef4444",fontWeight:700,flexShrink:0}}>{i+1}.</span>
              <span>{r}</span>
            </div>
          ))}
        </div>
      </div>
    );

    const InsideSOP = () => (
      <div style={{fontSize:13,lineHeight:1.9}}>
        <div style={{background:"rgba(16,185,129,.08)",border:"1px solid rgba(16,185,129,.2)",
          borderRadius:10,padding:14,marginBottom:16}}>
          <div style={{fontWeight:800,fontSize:15,marginBottom:4}}>🎯 Aapka Kaam Kya Hai?</div>
          <div>Aap <b>inside sales</b> mein ho — phone/WhatsApp/email se customers handle, quotes bhejo, orders process karo.</div>
          <div style={{marginTop:6}}>CRM aapka <b>command center</b> hai — enquiries track, quotes manage, pipeline update.</div>
        </div>

        {[
          {
            time:"🌅 SUBAH (9:30 AM)", color:"#3b82f6",
            steps:[
              {icon:"📅",title:"Planner check karo",desc:'CRM → Planner → 🔴 Overdue calls pehle karo → Aaj ke follow-ups list banao'},
              {icon:"📋",title:"Pending enquiries dekho",desc:'CRM → Enquiries → Pending filter → 24 ghante se zyada old = turant call karo'},
            ]
          },
          {
            time:"📞 DIN MEIN — Har Call/WA Ke Baad", color:"#f59e0b",
            steps:[
               {icon:"🔍",title:"Party dhundho — Step 1",desc:'CRM kholo → Customers tab → Search bar mein party ka naam type karo → Party pe click karo'},
               {icon:"📝",title:"Log Interaction — Step 2",desc:"Party detail page pe 'Log Interaction' button dabao (upar right side) → Ek popup form khulega"},
               {icon:"📋",title:"Form bharo — Step 3",desc:"Type select karo: Call ya WhatsApp → Note mein kya baat hui likho → Follow-up date zaroori daalo → Save dabao"},
               {icon:"💡",title:"Note kaise likhein",desc:'"300ml Milky 10,000 pcs enquiry. ₹1750 quote kiya. 12 Aug tak confirm karenge."'},
            ]
          },
          {
            time:"📄 QUOTE BHEJNI HO", color:"#a78bfa",
            steps:[
              {icon:"🧾",title:"Proforma banao",desc:'CRM → New Order → Items bharo → Print PI → Customer ko PDF bhejo'},
              {icon:"💬",title:"WhatsApp message bhejo",desc:'Order mein → WA Message button → Copy hoga → WhatsApp pe paste karo → Send!'},
            ]
          },
          {
            time:"✅ ORDER CONFIRM HUA", color:"#10b981",
            steps:[
              {icon:"🎉",title:"Order confirm karo",desc:'CRM → Orders → Draft → Status: Confirmed → Customer ko confirmation bhejo'},
              {icon:"📦",title:"Production inform karo",desc:'Nitin bhai ko batao → Dispatch date confirm karo → Customer ko ETA do'},
            ]
          },
          {
            time:"🌆 SHAM (5:30 PM) — Pipeline Review", color:"#f97316",
            steps:[
              {icon:"🎯",title:"Pipeline update karo",desc:'Pipeline → Active deals → Stage move karo → Note add karo → Kal ke follow-ups plan karo'},
            ]
          },
        ].map((section,si)=>(
          <div key={si} style={{marginBottom:20}}>
            <div style={{fontWeight:800,fontSize:13,color:section.color,
              background:section.color+"11",padding:"8px 14px",borderRadius:8,marginBottom:10}}>
              {section.time}
            </div>
            {section.steps.map((step,i)=>(
              <div key={i} style={{display:"flex",gap:12,marginBottom:10,
                background:"var(--card2)",borderRadius:8,padding:"10px 14px"}}>
                <div style={{fontSize:20,flexShrink:0}}>{step.icon}</div>
                <div>
                  <div style={{fontWeight:700,marginBottom:2}}>{step.title}</div>
                  <div style={{fontSize:12,color:"var(--mut)"}}>{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        ))}

        {/* Enquiry to Order Flow */}
        <div className="card" style={{marginBottom:16}}>
          <div style={{fontWeight:800,marginBottom:12}}>🔄 Enquiry → Order Flow</div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {[
              ["📞","Customer call aaya"],
              ["📝","Interaction log karo (Call type)"],
              ["📋","Enquiry enter karo"],
              ["📄","Quote ready → PI banao → WhatsApp karo"],
              ["🤝","Negotiation? → Pipeline mein Negotiation stage"],
              ["✅","Order confirmed → Enter karo → Confirmed status"],
              ["📦","Dispatch → Status update → Customer ko batao"],
            ].map(([ic,txt],i)=>(
              <div key={i} style={{display:"flex",gap:10,alignItems:"center"}}>
                <div style={{fontSize:16,width:28,textAlign:"center"}}>{ic}</div>
                <div style={{flex:1,fontSize:12,padding:"6px 10px",background:"var(--card2)",borderRadius:6}}>{txt}</div>
                {i<6&&<div style={{color:"var(--mut)",fontSize:16}}>↓</div>}
              </div>
            ))}
          </div>
        </div>

        <div style={{background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",
          borderRadius:10,padding:14}}>
          <div style={{fontWeight:800,marginBottom:8}}>⚠️ 5 Zaroori Rules</div>
          {[
            "Har call ke baad note karo — chahe ek line hi sahi",
            "Follow-up date hamesha daalo — bina date ka note waste hai",
            "Enquiry 24 ghante mein respond karo — delay = lost customer",
            "Order same din enter karo — Draft mein mat chhodo",
            "Pipeline weekly update karo — har Friday review karo",
          ].map((r,i)=>(
            <div key={i} style={{display:"flex",gap:8,marginBottom:6,fontSize:12}}>
              <span style={{color:"#ef4444",fontWeight:700,flexShrink:0}}>{i+1}.</span>
              <span>{r}</span>
            </div>
          ))}
        </div>
      </div>
    );


    const PoojaSOP = () => (
      <div style={{fontSize:13,lineHeight:1.9}}>
        <div style={{background:"rgba(168,85,247,.08)",border:"1px solid rgba(168,85,247,.2)",borderRadius:10,padding:14,marginBottom:16}}>
          <div style={{fontWeight:800,fontSize:15,marginBottom:4}}>🌟 Pooja — CRM + NBD</div>
          <div>Aap <b>existing customers (CRM)</b> maintain karogi aur <b>new parties (NBD)</b> develop karogi.</div>
        </div>
        {[
          {time:"🌅 SUBAH (9:30 AM)", color:"#a855f7", steps:[
            {icon:"📅",title:"Planner check karo",desc:"Step 1: CRM → Planner tab → 🔴 Overdue → Aaj ki visits + calls plan karo"},
            {icon:"👥",title:"CRM parties dekho",desc:"Step 2: Customers → CRM tab → Pooja filter → Follow-up pending list banao"},
          ]},
          {time:"🏢 CRM — Existing Customers", color:"#10b981", steps:[
            {icon:"🔍",title:"Party dhundho — Step 1",desc:"Customers → Search → Party click → Detail page"},
            {icon:"📝",title:"Log Interaction — Step 2",desc:"Log Interaction → Type: Visit/Call/WA → Note → Follow-up date → Save"},
            {icon:"💡",title:"Note example",desc:'"500ml Milky 500 pcs confirm. Delivery 15 Aug. Next visit 1 Sep."'},
            {icon:"🧾",title:"Order — Step 3",desc:"New Order → Party → Items + price → WA Message → Save"},
          ]},
          {time:"🌱 NBD — New Parties", color:"#3b82f6", steps:[
            {icon:"➕",title:"New party add — Step 1",desc:"Customers → Add Customer → Name, Company, Phone → Type: NBD → Sales Rep: Pooja → Save"},
            {icon:"📝",title:"Pehli visit — Step 2",desc:"Party → Log Interaction → Visit → Kya interest hai → Follow-up date"},
            {icon:"🎯",title:"Pipeline — Step 3",desc:"Pipeline → New Deal → Title, Value, Stage: Lead → Close date → Save"},
          ]},
          {time:"🌆 SHAM (6 PM)", color:"#f59e0b", steps:[
            {icon:"✓",title:"Tasks done",desc:"Planner → ✓ → Kal check karo"},
            {icon:"🎯",title:"Pipeline update",desc:"Deals → Stage move → Nitin bhai ko update do"},
          ]},
        ].map((section,si)=>(
          <div key={si} style={{marginBottom:20}}>
            <div style={{fontWeight:800,fontSize:13,color:section.color,background:section.color+"11",padding:"8px 14px",borderRadius:8,marginBottom:10}}>{section.time}</div>
            {section.steps.map((step,i)=>(
              <div key={i} style={{display:"flex",gap:12,marginBottom:10,background:"var(--card2)",borderRadius:8,padding:"10px 14px"}}>
                <div style={{fontSize:20,flexShrink:0}}>{step.icon}</div>
                <div><div style={{fontWeight:700,marginBottom:2}}>{step.title}</div><div style={{fontSize:12,color:"var(--mut)"}}>{step.desc}</div></div>
              </div>
            ))}
          </div>
        ))}
        <div style={{background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",borderRadius:10,padding:14}}>
          <div style={{fontWeight:800,marginBottom:8}}>⚠️ 5 Rules</div>
          {["Har visit note karo","Follow-up date hamesha","NBD add: Type=NBD + Rep=Pooja","Order same din enter karo","Pipeline weekly update"].map((r,i)=>(
            <div key={i} style={{display:"flex",gap:8,marginBottom:6,fontSize:12}}>
              <span style={{color:"#ef4444",fontWeight:700}}>{i+1}.</span><span>{r}</span>
            </div>
          ))}
        </div>
      </div>
    );

    return (
      <div>
        <div className="sh">
          <div>
            <div className="sh-t">📋 SOP — Kaise Use Karein CRM</div>
            <div className="sh-s">Step-by-step guide · Roz ka routine · Rules</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs" style={{marginBottom:16}}>
          <div className={"tab "+(sopTab==="field"?"a":"")} onClick={()=>setSopTab("field")}>
            🚗 Field Sales (Akhilesh)
          </div>
          <div className={"tab "+(sopTab==="inside"?"a":"")} onClick={()=>setSopTab("inside")}>
            📞 Inside Sales (Karan)
          </div>
          <div className={"tab "+(sopTab==="aashi"?"a":"")} onClick={()=>setSopTab("aashi")}>
            🌟 CRM+NBD (Pooja)
          </div>
        </div>

        {sopTab==="field"&&<FieldSOP/>}
        {sopTab==="inside"&&<InsideSOP/>}
        {sopTab==="aashi"&&<PoojaSOP/>}
      </div>
    );
  };



  // ══════════════════════════════════════════════
  // DAILY REPORT + SPEED METER DASHBOARD
  // ══════════════════════════════════════════════
  const DailyReport = () => {
    const today = new Date().toISOString().slice(0,10);
    const [selDate, setSelDate] = useState(today);
    const [selRep, setSelRep] = useState("all");
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const curMonth = String(new Date().getMonth()+1).padStart(2,"0");
    const curYear = new Date().getFullYear();

    // Today's data
    const dayInter = I.filter(i=>i.created_at?.startsWith(selDate)&&(selRep==="all"||i.done_by===selRep));
    const dayOrders = ORDERS.filter(o=>o.order_date===selDate&&(selRep==="all"||o.created_by===selRep));
    const dayTasks = []; // from crm_tasks — would need separate load

    // Monthly data per rep
    const monthData = (rep) => {
      const mInter = I.filter(i=>i.created_at?.startsWith(curYear+"-"+curMonth)&&(rep==="all"||i.done_by===rep));
      const mOrders = ORDERS.filter(o=>o.order_date?.startsWith(curYear+"-"+curMonth)&&(rep==="all"||o.created_by===rep));
      const mRev = mOrders.reduce((s,o)=>s+(Number(o.total_amount)||0),0);
      const tgt = TARGETS.find(t=>t.user_name===rep&&t.month===curMonth&&t.year===curYear);
      const tgtAmt = Number(tgt?.target_amount||0);
      return {interactions:mInter.length, orders:mOrders.length, revenue:mRev, target:tgtAmt};
    };

    // Speedometer SVG component
    const Speedometer = ({value, max, label, unit="", color="#10b981", size=120}) => {
      const pct = Math.min(value/Math.max(max,1), 1);
      const angle = -135 + pct * 270; // -135 to +135 degrees
      const r = size*0.38;
      const cx = size/2, cy = size/2;
      // Arc path
      const polarToCart = (angle, r) => ({
        x: cx + r * Math.cos((angle-90) * Math.PI/180),
        y: cy + r * Math.sin((angle-90) * Math.PI/180)
      });
      const start = polarToCart(-135, r);
      const end = polarToCart(135, r);
      const active = polarToCart(angle, r);
      const largeArc = pct > 0.5 ? 1 : 0;
      const needle = polarToCart(angle, r*0.7);
      const zone = pct >= 0.9 ? "#10b981" : pct >= 0.7 ? "#f59e0b" : pct >= 0.4 ? "#f97316" : "#ef4444";
      return (
        <svg width={size} height={size*0.75} viewBox={"0 0 "+size+" "+(size*0.75)}>
          {/* Background arc */}
          <path d={"M "+start.x+" "+start.y+" A "+r+" "+r+" 0 1 1 "+end.x+" "+end.y}
            fill="none" stroke="var(--bdr)" strokeWidth={size*0.06} strokeLinecap="round"/>
          {/* Value arc */}
          {pct > 0 && <path d={"M "+start.x+" "+start.y+" A "+r+" "+r+" 0 "+largeArc+" 1 "+active.x+" "+active.y}
            fill="none" stroke={zone} strokeWidth={size*0.06} strokeLinecap="round"/>}
          {/* Needle */}
          <line x1={cx} y1={cy} x2={needle.x} y2={needle.y}
            stroke={zone} strokeWidth={size*0.025} strokeLinecap="round"/>
          <circle cx={cx} cy={cy} r={size*0.04} fill={zone}/>
          {/* Value text */}
          <text x={cx} y={cy*1.15} textAnchor="middle" fontSize={size*0.14} fontWeight="800" fill={zone}>
            {typeof value === "number" ? (value >= 1000 ? "₹"+Math.round(value/1000)+"K" : value) : value}{unit}
          </text>
          <text x={cx} y={cy*1.35} textAnchor="middle" fontSize={size*0.09} fill="var(--mut)">{label}</text>
        </svg>
      );
    };

    return (
      <div>
        <div className="sh">
          <div>
            <div className="sh-t">📊 Daily Report & Dashboard</div>
            <div className="sh-s">Aaj ka performance · Speed meter · Full activity log</div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <input type="date" className="inp" style={{width:"auto",padding:"5px 10px",fontSize:11}}
              value={selDate} onChange={e=>setSelDate(e.target.value)}/>
            <select className="inp" style={{width:"auto",padding:"5px 10px",fontSize:11}}
              value={selRep} onChange={e=>setSelRep(e.target.value)}>
              <option value="all">👥 All Reps</option>
              {USERS.map(u=><option key={u.name} value={u.name}>{u.name}</option>)}
            </select>
          </div>
        </div>

        {/* ── SPEED METERS ── */}
        <div className="card" style={{marginBottom:14}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:14}}>
            ⚡ Performance Dashboard — {months[new Date().getMonth()]} {curYear}
            {selRep!=="all"&&<span style={{fontSize:11,color:"var(--mut)",fontWeight:400,marginLeft:8}}>({selRep})</span>}
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"space-around",flexWrap:"wrap"}}>
            {(selRep==="all"?["all"]:USERS.filter(u=>u.name===selRep).map(u=>u.name)).map(rep=>{
              const d = monthData(rep);
              const achPct = d.target>0?Math.round(d.revenue/d.target*100):0;
              return (
                <div key={rep} style={{textAlign:"center",minWidth:130}}>
                  {selRep==="all"&&<div style={{fontWeight:700,fontSize:12,marginBottom:8}}><Av name={rep==="all"?"Team":rep} size={24}/> {rep==="all"?"Team":rep}</div>}
                  <div style={{display:"flex",gap:4,flexWrap:"wrap",justifyContent:"center"}}>
                    <div style={{textAlign:"center"}}>
                      <Speedometer value={d.interactions} max={50} label="Interactions" size={110}/>
                    </div>
                    <div style={{textAlign:"center"}}>
                      <Speedometer value={d.orders} max={20} label="Orders" color="#3b82f6" size={110}/>
                    </div>
                    <div style={{textAlign:"center"}}>
                      <Speedometer value={d.revenue} max={d.target||500000} label="Revenue" color="#f59e0b" size={110}/>
                    </div>
                    {d.target>0&&<div style={{textAlign:"center"}}>
                      <Speedometer value={achPct} max={100} label="Target %" unit="%" color={achPct>=90?"#10b981":achPct>=70?"#f59e0b":"#ef4444"} size={110}/>
                    </div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── DAILY ACTIVITY SUMMARY ── */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}>
          {[
            ["💬 Interactions", dayInter.length, "Aaj", "#a78bfa"],
            ["🧾 Orders", dayOrders.length, "₹"+Math.round(dayOrders.reduce((s,o)=>s+(Number(o.total_amount)||0),0)/1000)+"K", "#10b981"],
            ["📞 Calls", dayInter.filter(i=>i.type==="call").length, "Phone calls", "#3b82f6"],
          ].map(([lbl,val,sub,c])=>(
            <div key={lbl} style={{background:c+"11",border:"1px solid "+c+"33",borderRadius:10,padding:12,textAlign:"center"}}>
              <div style={{fontSize:11,color:"var(--mut)",marginBottom:4}}>{lbl}</div>
              <div style={{fontSize:22,fontWeight:800,color:c}}>{val}</div>
              <div style={{fontSize:10,color:"var(--mut)"}}>{sub}</div>
            </div>
          ))}
        </div>

        {/* ── REP-WISE DAILY SUMMARY ── */}
        <div className="card" style={{marginBottom:14,padding:0}}>
          <div style={{padding:"12px 16px",fontWeight:700,fontSize:13,borderBottom:"1px solid var(--bdr)"}}>
            👥 Rep-wise Activity — {selDate}
          </div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead>
              <tr style={{background:"var(--card2)"}}>
                {["Rep","Calls","Visits","WhatsApp","Total Interactions","Orders","Revenue","Notes"].map(h=>(
                  <th key={h} style={{padding:"8px 10px",fontSize:10,color:"var(--mut)",textAlign:h==="Rep"||h==="Notes"?"left":"center"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {USERS.map(u=>{
                const rInter = I.filter(i=>i.created_at?.startsWith(selDate)&&i.done_by===u.name);
                const rOrders = ORDERS.filter(o=>o.order_date===selDate&&o.created_by===u.name);
                const rRev = rOrders.reduce((s,o)=>s+(Number(o.total_amount)||0),0);
                const calls = rInter.filter(i=>i.type==="call").length;
                const visits = rInter.filter(i=>i.type==="visit").length;
                const wa = rInter.filter(i=>i.type==="whatsapp").length;
                if(rInter.length===0&&rOrders.length===0) return null;
                return (
                  <tr key={u.name} style={{borderBottom:"1px solid var(--bdr)"}}>
                    <td style={{padding:"10px",fontWeight:700}}>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}><Av name={u.name} size={26}/>{u.name}</div>
                    </td>
                    <td style={{padding:"10px",textAlign:"center",color:"#3b82f6",fontWeight:700}}>{calls||"—"}</td>
                    <td style={{padding:"10px",textAlign:"center",color:"#10b981",fontWeight:700}}>{visits||"—"}</td>
                    <td style={{padding:"10px",textAlign:"center",color:"#25D366",fontWeight:700}}>{wa||"—"}</td>
                    <td style={{padding:"10px",textAlign:"center",fontWeight:800,fontSize:13}}>{rInter.length}</td>
                    <td style={{padding:"10px",textAlign:"center",color:"#f59e0b",fontWeight:700}}>{rOrders.length||"—"}</td>
                    <td style={{padding:"10px",textAlign:"center",color:"#10b981",fontWeight:700}}>{rRev>0?"₹"+Math.round(rRev/1000)+"K":"—"}</td>
                    <td style={{padding:"10px",fontSize:10,color:"var(--mut)",maxWidth:180}}>
                      {rInter.slice(0,2).map((i,idx)=>(
                        <div key={idx} style={{marginBottom:2}}>
                          <span style={{color:TC[i.type]}}>{TI[i.type]}</span> {i.customer_name} — {i.note?.slice(0,30)}{i.note?.length>30?"...":""}
                        </div>
                      ))}
                      {rInter.length>2&&<div style={{color:"var(--mut)"}}>+{rInter.length-2} more</div>}
                    </td>
                  </tr>
                );
              }).filter(Boolean)}
              {USERS.every(u=>I.filter(i=>i.created_at?.startsWith(selDate)&&i.done_by===u.name).length===0&&ORDERS.filter(o=>o.order_date===selDate&&o.created_by===u.name).length===0)&&(
                <tr><td colSpan={8} style={{padding:20,textAlign:"center",color:"var(--mut)"}}>Is din koi activity nahi mili</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── AI SUMMARY + PRINT ── */}
        {(()=>{
          const [aiSummary, setAiSummary] = React.useState("");
          const [aiLoading, setAiLoading] = React.useState(false);

          const generateSummary = async() => {
            setAiLoading(true);
            try {
              // Build context for AI
              const repData = USERS.filter(u=>u.role==="sales"||u.role==="admin").map(u=>{
                const rInter = I.filter(i=>i.created_at?.startsWith(selDate)&&i.done_by===u.name);
                const rOrders = ORDERS.filter(o=>o.order_date===selDate&&o.created_by===u.name);
                const rRev = rOrders.reduce((s,o)=>s+(Number(o.total_amount)||0),0);
                const myAssigned = C.filter(c=>c.assigned_to===u.name||c.sales_rep===u.name).length;
                return {
                  name: u.name,
                  interactions: rInter.length,
                  calls: rInter.filter(i=>i.type==="call").length,
                  visits: rInter.filter(i=>i.type==="visit").length,
                  whatsapp: rInter.filter(i=>i.type==="whatsapp").length,
                  orders: rOrders.length,
                  revenue: rRev,
                  assigned: myAssigned,
                  notes: rInter.slice(0,3).map(i=>i.customer_name+": "+i.note?.slice(0,60)).join(" | ")
                };
              }).filter(r=>r.interactions>0||r.orders>0);

              const pendingFU = I.filter(i=>i.next_follow_up===selDate&&i.next_follow_up).length;
              const totalParties = C.length;

              const context = "Sales Team Daily Report for "+selDate+" - "+repData.map(r=>"Rep: "+r.name+", Interactions: "+r.interactions+" ("+r.calls+" calls, "+r.visits+" visits, "+r.whatsapp+" WA), Orders: "+r.orders+", Revenue: Rs."+Math.round(r.revenue/1000)+"K, Parties assigned: "+r.assigned+(r.notes?" | Notes: "+r.notes:"")).join(". ")+" Total parties in CRM: "+totalParties+". Pending follow-ups today: "+pendingFU+"."

              const res = await fetch("/api/ai-polish",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:context,type:"daily_summary"})});
              const d = await res.json();
              setAiSummary(d.polished||d.error||"Could not generate summary");
            } catch(e){ setAiSummary("Error: "+e.message); }
            setAiLoading(false);
          };

          const printReport = () => {
            const win = window.open("","_blank");
            if(!win) return toast$("Popup blocked!",true);
            const repRows = USERS.filter(u=>u.role==="sales"||u.role==="admin").map(u=>{
              const rInter = I.filter(i=>i.created_at?.startsWith(selDate)&&i.done_by===u.name);
              const rOrders = ORDERS.filter(o=>o.order_date===selDate&&o.created_by===u.name);
              const rRev = rOrders.reduce((s,o)=>s+(Number(o.total_amount)||0),0);
              return {name:u.name, inter:rInter, orders:rOrders, rev:rRev};
            }).filter(r=>r.inter.length>0||r.orders.length>0);

            win.document.write(`
              <html><head><title>Daily Report - ${selDate}</title>
              <style>
                body{font-family:Arial,sans-serif;padding:24px;color:#000;font-size:13px;}
                h1{font-size:18px;margin-bottom:4px;}
                .sub{color:#666;font-size:12px;margin-bottom:20px;}
                table{width:100%;border-collapse:collapse;margin-bottom:16px;}
                th{background:#f59e0b;padding:8px;text-align:left;border:1px solid #ddd;font-size:12px;}
                td{padding:7px 8px;border:1px solid #ddd;font-size:12px;vertical-align:top;}
                .summary{background:#f8f9fa;border:1px solid #dee2e6;padding:14px;border-radius:6px;margin-bottom:16px;font-size:12px;line-height:1.7;}
                .rep-section{margin-bottom:20px;}
                .rep-name{font-size:14px;font-weight:bold;margin-bottom:8px;color:#1a1a2a;border-bottom:2px solid #f59e0b;padding-bottom:4px;}
                .stat-row{display:flex;gap:20px;margin-bottom:8px;font-size:12px;}
                .stat{background:#f0f0f0;padding:4px 10px;border-radius:4px;}
                @media print{body{padding:12px;}}
              </style></head><body>
              <h1>Mayur Food Packaging — Daily Sales Report</h1>
              <div class="sub">Date: ${selDate} | Generated: ${new Date().toLocaleString("en-IN")}</div>
              
              ${aiSummary?`<div class="summary"><b>AI Summary:</b><br/>${aiSummary.replace(/\n/g,"<br/>")}</div>`:""}

              
              <table>
                <thead><tr><th>Rep</th><th>Calls</th><th>Visits</th><th>WA</th><th>Total</th><th>Orders</th><th>Revenue</th></tr></thead>
                <tbody>
                  ${USERS.filter(u=>u.role==="sales"||u.role==="admin").map(u=>{
                    const rI=I.filter(i=>i.created_at?.startsWith(selDate)&&i.done_by===u.name);
                    const rO=ORDERS.filter(o=>o.order_date===selDate&&o.created_by===u.name);
                    const rev=rO.reduce((s,o)=>s+(Number(o.total_amount)||0),0);
                    return "<tr><td><b>"+u.name+"</b></td><td>"+rI.filter(i=>i.type==="call").length+"</td><td>"+rI.filter(i=>i.type==="visit").length+"</td><td>"+rI.filter(i=>i.type==="whatsapp").length+"</td><td><b>"+rI.length+"</b></td><td>"+rO.length+"</td><td>Rs."+Math.round(rev/1000)+"K</td></tr>";
                  }).join("")}
                </tbody>
              </table>

              ${repRows.map(r=>`
                <div class="rep-section">
                  <div class="rep-name">${r.name} — Activity Log</div>
                  ${r.inter.map((i,idx)=>`
                    <div style="margin-bottom:8px;padding:6px 10px;border-left:3px solid #f59e0b;background:#fffbf0;">
                      <b>${idx+1}. ${i.customer_name||""}</b> · ${i.type} · ${i.created_at?.slice(0,10)||""}<br/>
                      ${i.note?`<span style="color:#555;">${i.note}</span>`:""}
                      ${i.next_follow_up?`<br/><span style="color:#10b981;">📌 Follow-up: ${i.next_follow_up}</span>`:""}
                    </div>
                  `).join("")}
                  ${r.orders.map(o=>`
                    <div style="margin-bottom:8px;padding:6px 10px;border-left:3px solid #10b981;background:#f0fff4;">
                      <b>🧾 Order: ${o.company}</b> · Rs.${Math.round(Number(o.total_amount)/1000)}K
                    </div>
                  `).join("")}
                </div>
              `).join("")}

              <div style="margin-top:20px;font-size:11px;color:#888;border-top:1px solid #ddd;padding-top:10px;">
                Mayur Food Packaging Products | Shreeja Packaging Industries Pvt. Ltd. | Confidential
              </div>
              </body></html>
            `);
            win.document.close();
            win.print();
          };

          return (
            <div className="card" style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div style={{fontWeight:700,fontSize:13}}>🤖 AI Summary + Print Report</div>
                <div style={{display:"flex",gap:8}}>
                  <button className="btn btn-o btn-sm" onClick={generateSummary} disabled={aiLoading}>
                    {aiLoading?"⏳ Generating...":"✨ Generate AI Summary"}
                  </button>
                  <button className="btn btn-p btn-sm" onClick={printReport}>
                    🖨️ Print Report
                  </button>
                </div>
              </div>
              {aiSummary&&(
                <div style={{background:"var(--card2)",borderRadius:8,padding:12,fontSize:12,lineHeight:1.8,whiteSpace:"pre-wrap"}}>
                  {aiSummary}
                </div>
              )}
              {!aiSummary&&!aiLoading&&(
                <div style={{fontSize:11,color:"var(--mut)",textAlign:"center",padding:8}}>
                  "✨ Generate AI Summary" dabao — AI aaj ka poora report summarize karega
                </div>
              )}
            </div>
          );
        })()}

        {/* ── FULL INTERACTION LOG ── */}
        <div className="card" style={{padding:0}}>
          <div style={{padding:"12px 16px",fontWeight:700,fontSize:13,borderBottom:"1px solid var(--bdr)",display:"flex",justifyContent:"space-between"}}>
            <span>📋 Full Activity Log — {selDate}</span>
            <span style={{fontSize:11,color:"var(--mut)",fontWeight:400}}>{dayInter.length} interactions · {dayOrders.length} orders</span>
          </div>
          {dayInter.length===0&&dayOrders.length===0?(
            <div style={{padding:20,textAlign:"center",color:"var(--mut)"}}>Koi activity nahi</div>
          ):(
            <div>
              {/* Interactions */}
              {dayInter.map((i,idx)=>(
                <div key={idx} style={{padding:"10px 16px",borderBottom:"1px solid var(--bdr)",
                  display:"flex",gap:12,alignItems:"flex-start"}}>
                  <span style={{fontSize:18,flexShrink:0}}>{TI[i.type]||"💬"}</span>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                      <div>
                        <span style={{fontWeight:700,fontSize:12}}>{i.customer_name}</span>
                        <span style={{fontSize:10,color:"var(--mut)",marginLeft:8}}>{i.company}</span>
                      </div>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <span style={{fontSize:10,color:TC[i.type],fontWeight:700}}>{i.type}</span>
                        <span style={{fontSize:10,color:"var(--mut)"}}>{i.done_by}</span>
                        {isAdmin&&<>
                          <button onClick={()=>{setForm({...i,customer_id:i.customer_id});setModal("ainter");}} style={{padding:"1px 6px",borderRadius:4,fontSize:9,border:"1px solid var(--bdr)",background:"transparent",cursor:"pointer"}}>✏️</button>
                          <button onClick={async()=>{if(!window.confirm("Delete?"))return;await sbFetch("crm_interactions?id=eq."+i.id,{method:"DELETE"});setI(p=>p.filter(x=>x.id!==i.id));toast$("Deleted!");}} style={{padding:"1px 6px",borderRadius:4,fontSize:9,border:"1px solid #ef4444",background:"transparent",color:"#ef4444",cursor:"pointer"}}>🗑</button>
                        </>}
                      </div>
                    </div>
                    {i.note&&<div style={{fontSize:11,color:"var(--txt)",fontStyle:"italic"}}>"{i.note}"</div>}
                    {i.next_follow_up&&<div style={{fontSize:10,color:"var(--acc)",marginTop:2}}>📌 Follow-up: {fd(i.next_follow_up)}</div>}
                  </div>
                </div>
              ))}
              {/* Orders */}
              {dayOrders.map((o,idx)=>(
                <div key={idx} style={{padding:"10px 16px",borderBottom:"1px solid var(--bdr)",
                  display:"flex",gap:12,alignItems:"center",background:"rgba(16,185,129,.03)"}}>
                  <span style={{fontSize:18}}>🧾</span>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",justifyContent:"space-between"}}>
                      <div>
                        <span style={{fontWeight:700,fontSize:12}}>{o.company}</span>
                        <span style={{fontSize:10,color:"var(--mut)",marginLeft:8}}>Order by {o.created_by}</span>
                      </div>
                      <span style={{fontWeight:800,color:"#10b981"}}>₹{Math.round(Number(o.total_amount)/1000)}K</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };



  // ══════════════════════════════════════════════
  // AASHI CALLING DASHBOARD + DISCOUNT APPROVAL
  // ══════════════════════════════════════════════
  const CallingDashboard = () => {
    const [discReqs, setDiscReqs] = useState([]);
    const [loadingReqs, setLoadingReqs] = useState(false);
    const [showDiscReq, setShowDiscReq] = useState(null); // party for discount request
    const [reqDiscount, setReqDiscount] = useState("");
    const [reqReason, setReqReason] = useState("");
    const [adminNote, setAdminNote] = useState("");

    const myParties = myC.filter(c=>c.sales_rep===myName||c.assigned_to===myName);

    const loadReqs = async() => {
      setLoadingReqs(true);
      try {
        const url = isAdmin
          ? "crm_discount_requests?order=created_at.desc"
          : "crm_discount_requests?requested_by=eq."+myName+"&order=created_at.desc";
        const d = await sbFetch(url);
        setDiscReqs(d||[]);
      } catch(e){}
      setLoadingReqs(false);
    };

    useEffect(()=>{ loadReqs(); },[]);

    const pendingReqs = discReqs.filter(r=>r.status==="pending");

    const submitDiscountReq = async() => {
      if(!showDiscReq||!reqDiscount) return toast$("Discount amount daalo",true);
      try {
        await sbFetch("crm_discount_requests", {method:"POST", body:{
          customer_id: showDiscReq.id,
          customer_name: showDiscReq.name,
          company: showDiscReq.company,
          requested_by: myName,
          requested_discount: Number(reqDiscount),
          current_discount: Number(showDiscReq.discount_per_ctn)||0,
          reason: reqReason,
          status: "pending"
        }});
        toast$("Discount request bhej di! Nitin bhai approve karenge.");
        setShowDiscReq(null); setReqDiscount(""); setReqReason("");
        loadReqs();
      } catch(e){ toast$("Error: "+e.message,true); }
    };

    const approveReq = async(req, approved, disc) => {
      try {
        await sbFetch("crm_discount_requests?id=eq."+req.id, {method:"PATCH", body:{
          status: approved?"approved":"rejected",
          approved_by: myName,
          approved_discount: approved?Number(disc):0,
          admin_note: adminNote,
          updated_at: new Date().toISOString()
        }});
        if(approved) {
          // Update customer discount
          await sbFetch("crm_customers?id=eq."+req.customer_id, {method:"PATCH", body:{
            discount_per_ctn: Number(disc)
          }});
          // Update local C array
          setC(prev=>prev.map(c=>c.id===req.customer_id?{...c,discount_per_ctn:Number(disc)}:c));
        }
        toast$(approved?"✅ Discount approved!":"❌ Rejected");
        setAdminNote("");
        loadReqs();
      } catch(e){ toast$("Error: "+e.message,true); }
    };

    const today = new Date().toISOString().slice(0,10);
    const todayInter = I.filter(i=>i.created_at?.startsWith(today)&&i.done_by===myName);
    const calledToday = new Set(todayInter.map(i=>i.customer_id));

    return (
      <div>
        <div className="sh">
          <div>
            <div className="sh-t">📞 Calling Dashboard</div>
            <div className="sh-s">Aaj ki calling list · Discount requests · Performance</div>
          </div>
        </div>

        {/* ── ADMIN: Pending Discount Approvals ── */}
        {isAdmin&&pendingReqs.length>0&&(
          <div style={{marginBottom:14,background:"rgba(245,158,11,.08)",border:"2px solid #f59e0b",borderRadius:12,padding:14}}>
            <div style={{fontWeight:800,fontSize:14,color:"#f59e0b",marginBottom:12}}>
              🔔 Discount Approvals Pending ({pendingReqs.length})
            </div>
            {pendingReqs.map((req,i)=>(
              <div key={i} style={{background:"var(--card)",borderRadius:10,padding:12,marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:8}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:13}}>{req.company||req.customer_name}</div>
                    <div style={{fontSize:11,color:"var(--mut)"}}>Requested by: {req.requested_by} · {new Date(req.created_at).toLocaleDateString("en-IN")}</div>
                    <div style={{fontSize:12,marginTop:4}}>
                      Current: <b>₹{req.current_discount}/ctn</b> → Requested: <b style={{color:"#f59e0b"}}>₹{req.requested_discount}/ctn</b>
                    </div>
                    {req.reason&&<div style={{fontSize:11,color:"var(--mut)",marginTop:2,fontStyle:"italic"}}>Reason: {req.reason}</div>}
                  </div>
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                  <input className="inp" type="number" placeholder="Approved discount ₹/ctn"
                    style={{width:180,fontSize:11}} defaultValue={req.requested_discount}
                    id={"disc_"+req.id}/>
                  <input className="inp" placeholder="Note (optional)" style={{flex:1,fontSize:11}}
                    value={adminNote} onChange={e=>setAdminNote(e.target.value)}/>
                  <button className="btn btn-p btn-sm" onClick={()=>{
                    const val = document.getElementById("disc_"+req.id)?.value||req.requested_discount;
                    approveReq(req, true, val);
                  }}>✅ Approve</button>
                  <button className="btn btn-sm" style={{background:"#ef4444",color:"#fff",border:"none"}}
                    onClick={()=>approveReq(req, false, 0)}>❌ Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── TODAY STATS ── */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
          {[
            ["📋 Assigned Parties", myParties.length, "Total", "#3b82f6"],
            ["✅ Called Today", calledToday.size, "Interactions logged", "#10b981"],
            ["⏳ Remaining", Math.max(0,myParties.length-calledToday.size), "Call karni hain", "#f59e0b"],
          ].map(([lbl,val,sub,c])=>(
            <div key={lbl} style={{background:c+"11",border:"1px solid "+c+"33",borderRadius:10,padding:12,textAlign:"center"}}>
              <div style={{fontSize:10,color:"var(--mut)",marginBottom:4}}>{lbl}</div>
              <div style={{fontSize:22,fontWeight:800,color:c}}>{val}</div>
              <div style={{fontSize:10,color:"var(--mut)"}}>{sub}</div>
            </div>
          ))}
        </div>

        {/* ── NAI LEADS TODAY ── */}
        {(()=>{
          const todayStr = new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Kolkata"}); // YYYY-MM-DD IST
          const newLeads = myParties.filter(c=>{
            if(!c.created_at) return false;
            const created = new Date(c.created_at).toLocaleDateString("en-CA",{timeZone:"Asia/Kolkata"});
            return created===todayStr;
          });
          if(newLeads.length===0) return null;
          return (
            <div style={{marginBottom:14,background:"rgba(245,158,11,.08)",border:"2px solid #f59e0b",borderRadius:12,padding:14}}>
              <div style={{fontWeight:800,fontSize:14,color:"#f59e0b",marginBottom:10}}>
                🌟 Aaj Ki Nai Leads ({newLeads.length})
                <span style={{fontSize:11,fontWeight:400,color:"var(--mut)",marginLeft:8}}>Nitin bhai ne aaj assign ki hain</span>
              </div>
              {newLeads.map((c,i)=>(
                <div key={i} style={{background:"var(--card)",borderRadius:10,padding:"10px 14px",
                  marginBottom:8,display:"flex",gap:10,alignItems:"center",
                  border:"1px solid rgba(245,158,11,.3)"}}>
                  <div style={{width:32,height:32,borderRadius:"50%",background:"#f59e0b",
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontWeight:800,fontSize:12,color:"#fff",flexShrink:0}}>🆕</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:13}}>{c.company||c.name}</div>
                    <div style={{fontSize:11,color:"var(--mut)",marginTop:2}}>
                      {c.city&&c.city+" · "}{c.phone||"No phone"} · {c.type?.toUpperCase()}
                      {c.discount_per_ctn>0&&<span style={{marginLeft:8,color:"#f59e0b",fontWeight:700}}>🏷️ ₹{c.discount_per_ctn}/ctn</span>}
                    </div>
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    <button className="btn btn-o btn-sm" onClick={()=>openC(c.id)}>👁 View</button>
                    <button className="btn btn-p btn-sm" onClick={()=>{setForm({customer_id:c.id,done_by:myName});setModal("ainter");}}>📝 Log Call</button>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}

        {/* ── AI CALLING SUGGESTIONS ── */}
        {(()=>{
          const today = new Date().toISOString().slice(0,10);
          
          const scored = myParties.map(c=>{
            const interactions = I.filter(i=>i.customer_id===c.id);
            const lastI = interactions.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0];
            const daysSince = lastI ? Math.floor((new Date()-new Date(lastI.created_at))/(1000*60*60*24)) : 999;
            const hasOverdueFU = interactions.some(i=>i.next_follow_up&&i.next_follow_up<today);
            const hasTodayFU = interactions.some(i=>i.next_follow_up===today);
            const calledToday2 = interactions.some(i=>i.created_at?.startsWith(today));
            const custOrders = ORDERS.filter(o=>o.customer_id===c.id);
            const hasRecentOrder = custOrders.some(o=>o.order_date>=new Date(Date.now()-30*86400000).toISOString().slice(0,10));
            
            // Scoring
            let score = 0;
            let reason = "";
            if(calledToday2) return null; // already called
            if(hasOverdueFU){ score+=100; reason="🔴 Follow-up overdue"; }
            else if(hasTodayFU){ score+=80; reason="🟡 Follow-up aaj"; }
            else if(daysSince>30){ score+=60; reason="⏰ "+daysSince+" din se koi contact nahi"; }
            else if(daysSince>14){ score+=40; reason="📅 "+daysSince+" din ho gaye"; }
            else if(daysSince>7){ score+=20; reason="💬 "+daysSince+" din pehle call hua tha"; }
            else { score+=5; reason="✅ Haal mein contact hua"; }
            
            if(c.type==="crm") score+=30;
            else if(c.type==="retail"||c.type==="direct") score+=20;
            if(hasRecentOrder) score+=10;
            if(!c.phone) score-=20;
            
            return {...c, score, reason, daysSince, lastI, hasOverdueFU, hasTodayFU};
          }).filter(Boolean).sort((a,b)=>b.score-a.score).slice(0,20);

          const [aiLoad, setAiLoad] = React.useState(false);
          const [aiSugg, setAiSugg] = React.useState("");

          const getAiSugg = async() => {
            setAiLoad(true);
            const context = "Aaj calling ke liye top parties: "+scored.slice(0,10).map((c,i)=>(i+1)+". "+c.company+" ("+c.type.toUpperCase()+", "+c.reason+", last contact: "+(c.daysSince<999?c.daysSince+" din pehle":"kabhi nahi")+")").join(". ");
            try {
              const res = await fetch("/api/ai-polish",{method:"POST",headers:{"Content-Type":"application/json"},
                body:JSON.stringify({text:context, type:"daily_summary"})});
              const d = await res.json();
              setAiSugg(d.polished||"");
            } catch(e){}
            setAiLoad(false);
          };

          return (
            <div className="card" style={{marginBottom:14,background:"rgba(59,130,246,.03)",border:"1px solid rgba(59,130,246,.2)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div>
                  <div style={{fontWeight:800,fontSize:14,color:"#3b82f6"}}>🤖 AI Calling Suggestions — Aaj Kise Call Karo</div>
                  <div style={{fontSize:11,color:"var(--mut)"}}>Score based on follow-up, last contact, party type</div>
                </div>
                <button className="btn btn-o btn-sm" onClick={getAiSugg} disabled={aiLoad}>
                  {aiLoad?"⏳ Soch raha hoon...":"✨ AI Digest"}
                </button>
              </div>

              {aiSugg&&(
                <div style={{background:"#0e1a24",color:"#e2e8f0",borderRadius:8,padding:12,fontSize:12,
                  lineHeight:1.8,marginBottom:12,whiteSpace:"pre-wrap"}}>{aiSugg}</div>
              )}

              {scored.map((c,i)=>{
                const priorityColor = c.hasOverdueFU?"#ef4444":c.hasTodayFU?"#f59e0b":c.daysSince>30?"#f97316":c.daysSince>14?"#3b82f6":"#10b981";
                const li = c.lastI;
                return (
                  <div key={c.id} style={{display:"flex",gap:10,alignItems:"center",
                    padding:"10px 0",borderBottom:"1px solid var(--bdr)"}}>
                    <div style={{width:28,height:28,borderRadius:"50%",flexShrink:0,
                      background:priorityColor+"22",border:"2px solid "+priorityColor,
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontWeight:800,fontSize:12,color:priorityColor}}>{i+1}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                        <span style={{fontWeight:700,fontSize:13}}>{c.company||c.name}</span>
                        <span style={{fontSize:10,background:priorityColor+"15",color:priorityColor,
                          padding:"1px 7px",borderRadius:6,fontWeight:700}}>{c.reason}</span>
                        {c.type==="crm"&&<span style={{fontSize:9,background:"rgba(16,185,129,.1)",color:"#10b981",padding:"1px 6px",borderRadius:4,fontWeight:700}}>CRM</span>}
                      </div>
                      <div style={{fontSize:11,color:"var(--mut)",marginTop:2}}>
                        {c.phone||"No phone"} · {c.city||""}
                        {li&&<span style={{marginLeft:6}}>{TI[li.type]} {fd(li.created_at)}: {li.note?.slice(0,40)}...</span>}
                      </div>
                    </div>
                    <div style={{display:"flex",gap:6,flexShrink:0}}>
                      {c.phone&&<a href={"tel:"+c.phone} style={{padding:"5px 10px",borderRadius:6,fontSize:11,
                        background:"rgba(16,185,129,.1)",color:"#10b981",border:"1px solid #10b981",
                        textDecoration:"none",fontWeight:700}}>📞 Call</a>}
                      <button className="btn btn-p btn-sm" onClick={()=>{setForm({customer_id:c.id,done_by:myName});setModal("ainter");}}>📝 Log</button>
                      <button className="btn btn-o btn-sm" onClick={()=>openC(c.id)}>👁</button>
                    </div>
                  </div>
                );
              })}
              {scored.length===0&&<div style={{textAlign:"center",padding:16,color:"var(--mut)"}}>
                🎉 Sab parties aaj call ho gayi!
              </div>}
            </div>
          );
        })()}

        {/* ── CALLING LIST ── */}
        <div className="card" style={{padding:0}}>
          <div style={{padding:"12px 16px",fontWeight:700,fontSize:13,borderBottom:"1px solid var(--bdr)",display:"flex",justifyContent:"space-between"}}>
            <span>📋 Calling List — {myParties.length} Parties</span>
            <span style={{fontSize:11,color:"var(--mut)",fontWeight:400}}>{calledToday.size} called today</span>
          </div>
          {myParties.length===0?(
            <div style={{padding:24,textAlign:"center",color:"var(--mut)"}}>
              <div style={{fontSize:32,marginBottom:8}}>📭</div>
              <div>Abhi koi party assign nahi hui</div>
              <div style={{fontSize:11,marginTop:4}}>Nitin bhai aapko parties assign karenge</div>
            </div>
          ):(
            <div>
              {myParties.map((c,i)=>{
                const called = calledToday.has(c.id);
                const li = gli(c.id);
                const hasDiscount = Number(c.discount_per_ctn)>0;
                return (
                  <div key={c.id} style={{padding:"12px 16px",borderBottom:"1px solid var(--bdr)",
                    background:called?"rgba(16,185,129,.03)":"transparent",
                    display:"flex",gap:10,alignItems:"center"}}>
                    {/* Status indicator */}
                    <div style={{width:32,height:32,borderRadius:"50%",flexShrink:0,
                      background:called?"#10b981":"var(--card2)",
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:16,fontWeight:800,color:called?"#fff":"var(--mut)"}}>
                      {called?"✓":i+1}
                    </div>
                    {/* Party info */}
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                        <span style={{fontWeight:700,fontSize:13}}>{c.company||c.name}</span>
                        {hasDiscount&&<span style={{fontSize:10,background:"rgba(245,158,11,.15)",color:"#f59e0b",padding:"1px 7px",borderRadius:6,fontWeight:700}}>🏷️ ₹{c.discount_per_ctn}/ctn</span>}
                        {called&&<span style={{fontSize:10,background:"rgba(16,185,129,.1)",color:"#10b981",padding:"1px 7px",borderRadius:6,fontWeight:700}}>✅ Called</span>}
                      </div>
                      <div style={{fontSize:11,color:"var(--mut)",marginTop:2}}>
                        {c.city&&c.city+" · "}{c.phone||"No phone"}
                        {li&&<span style={{marginLeft:8}}>Last: {li.type} {fd(li.created_at)}</span>}
                      </div>
                      {li?.next_follow_up&&(
                        <div style={{fontSize:10,color:isOD(li.next_follow_up)?"#ef4444":"#10b981",fontWeight:700,marginTop:2}}>
                          📌 Follow-up: {fd(li.next_follow_up)}
                        </div>
                      )}
                    </div>
                    {/* Actions */}
                    <div style={{display:"flex",gap:6,flexShrink:0,flexWrap:"wrap",justifyContent:"flex-end"}}>
                      <button className="btn btn-o btn-sm" onClick={()=>openC(c.id)}>👁 View</button>
                      <button className="btn btn-o btn-sm" onClick={()=>{setForm({customer_id:c.id,done_by:myName});setModal("ainter");}}>📝 Log</button>
                      {!hasDiscount&&<button onClick={()=>setShowDiscReq(c)}
                        style={{padding:"4px 10px",borderRadius:6,fontSize:11,border:"1px solid #f59e0b",
                          background:"rgba(245,158,11,.1)",color:"#f59e0b",cursor:"pointer",fontWeight:600}}>
                        🏷️ Discount Maango
                      </button>}
                      {hasDiscount&&<button onClick={()=>setShowDiscReq(c)}
                        style={{padding:"4px 10px",borderRadius:6,fontSize:11,border:"1px solid #f59e0b",
                          background:"rgba(245,158,11,.1)",color:"#f59e0b",cursor:"pointer",fontWeight:600}}>
                        🏷️ ₹{c.discount_per_ctn} · Change?
                      </button>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── MY DISCOUNT REQUESTS ── */}
        {!isAdmin&&discReqs.length>0&&(
          <div className="card" style={{marginTop:14,padding:0}}>
            <div style={{padding:"12px 16px",fontWeight:700,fontSize:13,borderBottom:"1px solid var(--bdr)"}}>
              🏷️ Meri Discount Requests
            </div>
            {discReqs.map((req,i)=>(
              <div key={i} style={{padding:"10px 16px",borderBottom:"1px solid var(--bdr)",
                display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontWeight:600,fontSize:12}}>{req.company}</div>
                  <div style={{fontSize:11,color:"var(--mut)"}}>₹{req.current_discount} → ₹{req.requested_discount}/ctn</div>
                  {req.reason&&<div style={{fontSize:10,color:"var(--mut)",fontStyle:"italic"}}>{req.reason}</div>}
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <span style={{padding:"3px 10px",borderRadius:8,fontSize:11,fontWeight:700,
                    background:req.status==="approved"?"rgba(16,185,129,.1)":req.status==="rejected"?"rgba(239,68,68,.1)":"rgba(245,158,11,.1)",
                    color:req.status==="approved"?"#10b981":req.status==="rejected"?"#ef4444":"#f59e0b"}}>
                    {req.status==="approved"?"✅ Approved":req.status==="rejected"?"❌ Rejected":"⏳ Pending"}
                  </span>
                  {req.status==="approved"&&<span style={{fontSize:11,fontWeight:700,color:"#10b981"}}>₹{req.approved_discount}/ctn</span>}
                  {req.admin_note&&<span style={{fontSize:10,color:"var(--mut)"}}>Note: {req.admin_note}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── DISCOUNT REQUEST MODAL ── */}
        {showDiscReq&&(
          <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,.5)",
            zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
            <div style={{background:"var(--card)",borderRadius:16,padding:20,width:"100%",maxWidth:420}}>
              <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>🏷️ Discount Request</div>
              <div style={{fontSize:12,color:"var(--mut)",marginBottom:16}}>{showDiscReq.company}</div>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <div>
                  <div style={{fontSize:11,color:"var(--mut)",marginBottom:4}}>Current Discount</div>
                  <div style={{fontWeight:700,fontSize:16}}>₹{showDiscReq.discount_per_ctn||0}/ctn</div>
                </div>
                <div>
                  <label className="lbl">Requested Discount (₹/ctn)</label>
                  <input type="number" className="inp" placeholder="e.g. 100"
                    value={reqDiscount} onChange={e=>setReqDiscount(e.target.value)}/>
                </div>
                <div>
                  <label className="lbl">Reason (optional)</label>
                  <input className="inp" placeholder="e.g. Party competitor se compare kar rahi hai"
                    value={reqReason} onChange={e=>setReqReason(e.target.value)}/>
                </div>
                <div style={{display:"flex",gap:8,marginTop:4}}>
                  <button className="btn btn-p" style={{flex:1,justifyContent:"center"}} onClick={submitDiscountReq}>
                    📤 Request Bhejo
                  </button>
                  <button className="btn btn-o" onClick={()=>setShowDiscReq(null)}>Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };



  // ══════════════════════════════════════════════
  // STOCK MANAGEMENT
  // ══════════════════════════════════════════════
  const StockMgmt = () => {
    const [stockEdit, setStockEdit] = useState({}); // {product_id: {packed, unpacked}}
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState({});
    const [stockQ, setStockQ] = useState("");

    // Init editable values from STOCK
    React.useEffect(()=>{
      const init={};
      STOCK.forEach(s=>{init[s.product_id]={packed:s.packed_qty||0,unpacked:s.unpacked_qty||0,id:s.id};});
      setStockEdit(init);
    },[STOCK]);

    const saveRow = async(prod) => {
      const val = stockEdit[prod.id]||{packed:0,unpacked:0};
      setSaving(prod.id);
      try {
        const existing = STOCK.find(s=>s.product_id===prod.id);
        if(existing) {
          await sbFetch("crm_stock?id=eq."+existing.id, {method:"PATCH", body:{
            packed_qty:Number(val.packed)||0, unpacked_qty:Number(val.unpacked)||0,
            updated_at:new Date().toISOString(), updated_by:myName
          }});
          setSTOCK(p=>p.map(s=>s.id===existing.id?{...s,packed_qty:Number(val.packed)||0,unpacked_qty:Number(val.unpacked)||0,updated_by:myName,updated_at:new Date().toISOString()}:s));
        } else {
          const r = await sbFetch("crm_stock", {method:"POST", body:{
            product_id:prod.id, product_name:prod.name, sku_code:prod.sku_code||"",
            packed_qty:Number(val.packed)||0, unpacked_qty:Number(val.unpacked)||0, updated_by:myName
          }});
          if(r&&r[0]) setSTOCK(p=>[r[0],...p]);
        }
        setSaved(p=>({...p,[prod.id]:true}));
        setTimeout(()=>setSaved(p=>({...p,[prod.id]:false})),2000);
        toast$("✓ "+prod.name);
      } catch(e){ toast$("Error",true); }
      setSaving(null);
    };

    const saveAll = async() => {
      setSaving("all");
      let count=0;
      for(const prod of PRODS) {
        const val = stockEdit[prod.id];
        if(!val) continue;
        try {
          const existing = STOCK.find(s=>s.product_id===prod.id);
          if(existing) {
            await sbFetch("crm_stock?id=eq."+existing.id, {method:"PATCH", body:{
              packed_qty:Number(val.packed)||0, unpacked_qty:Number(val.unpacked)||0,
              updated_at:new Date().toISOString(), updated_by:myName
            }});
          } else if(Number(val.packed)>0||Number(val.unpacked)>0) {
            await sbFetch("crm_stock", {method:"POST", body:{
              product_id:prod.id, product_name:prod.name, sku_code:prod.sku_code||"",
              packed_qty:Number(val.packed)||0, unpacked_qty:Number(val.unpacked)||0, updated_by:myName
            }});
          }
          count++;
        } catch(e){}
      }
      const stk = await sbFetch("crm_stock?order=product_name.asc");
      setSTOCK(stk||[]);
      toast$("✅ "+count+" items saved!");
      setSaving(null);
    };

    const totalPacked = Object.values(stockEdit).reduce((s,v)=>s+(Number(v.packed)||0),0);
    const totalUnpacked = Object.values(stockEdit).reduce((s,v)=>s+(Number(v.unpacked)||0),0);
    const filtPRODS = PRODS.filter(p=>!stockQ||p.name.toLowerCase().includes(stockQ.toLowerCase())||p.sku_code?.toLowerCase().includes(stockQ.toLowerCase()));

    return (
      <div>
        <div className="sh">
          <div>
            <div className="sh-t">📦 Stock Management</div>
            <div className="sh-s">Saare products ki stock ek saath update karo</div>
          </div>
          {isAdmin&&<button className="btn btn-p" disabled={saving==="all"} onClick={saveAll}>
            {saving==="all"?"Saving...":"💾 Save All"}
          </button>}
        </div>

        {/* Summary */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
          {[
            ["📦 Total Packed", totalPacked.toLocaleString()+" pcs", "#10b981"],
            ["🔧 Total Unpacked", totalUnpacked.toLocaleString()+" pcs", "#f59e0b"],
            ["⚠️ Low Stock", Object.values(stockEdit).filter(v=>Number(v.packed)<500).length+" items", "#ef4444"],
          ].map(([lbl,val,c])=>(
            <div key={lbl} style={{background:c+"11",border:"1px solid "+c+"33",borderRadius:10,padding:12,textAlign:"center"}}>
              <div style={{fontSize:10,color:"var(--mut)",marginBottom:4}}>{lbl}</div>
              <div style={{fontSize:20,fontWeight:800,color:c}}>{val}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="sr" style={{marginBottom:10}}>
          <Search size={13} className="sr-ic"/>
          <input className="inp" placeholder="Product search..." value={stockQ} onChange={e=>setStockQ(e.target.value)}/>
        </div>

        {/* All products table with inline edit */}
        <div className="card" style={{padding:0}}>
          <div style={{padding:"10px 16px",background:"var(--card2)",borderBottom:"1px solid var(--bdr)",
            display:"flex",gap:8,alignItems:"center",fontSize:11,color:"var(--mut)"}}>
            <span style={{fontWeight:700,color:"var(--txt)"}}>💡 Tip:</span> Numbers type karo → Row ke save button dabao → Ya upar "Save All" dabao
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead>
                <tr style={{background:"var(--card2)"}}>
                  {["#","Product","SKU","📦 Packed (pcs)","🔧 Unpacked (pcs)","Total","Status","Save"].map(h=>(
                    <th key={h} style={{padding:"8px 10px",fontSize:10,color:"var(--mut)",
                      textAlign:h==="Product"||h==="#"?"left":"center",whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtPRODS.map((prod,idx)=>{
                  const val = stockEdit[prod.id]||{packed:0,unpacked:0};
                  const total = (Number(val.packed)||0)+(Number(val.unpacked)||0);
                  const isLow = (Number(val.packed)||0)<500;
                  const isSavedNow = saved[prod.id];
                  return (
                    <tr key={prod.id} style={{borderBottom:"1px solid var(--bdr)",
                      background:isSavedNow?"rgba(16,185,129,.06)":isLow&&total>0?"rgba(239,68,68,.03)":"transparent"}}>
                      <td style={{padding:"6px 10px",color:"var(--mut)",fontSize:10}}>{idx+1}</td>
                      <td style={{padding:"6px 10px",fontWeight:600,fontSize:11}}>{prod.name}</td>
                      <td style={{padding:"6px 10px",color:"var(--mut)",fontSize:10}}>{prod.sku_code}</td>
                      <td style={{padding:"6px 8px",textAlign:"center"}}>
                        {isAdmin?(
                          <input type="number" min="0"
                            value={val.packed||""}
                            placeholder="0"
                            onChange={e=>setStockEdit(p=>({...p,[prod.id]:{...val,packed:e.target.value}}))}
                            style={{width:90,padding:"4px 8px",borderRadius:6,border:"1px solid var(--bdr)",
                              textAlign:"center",fontSize:12,background:"var(--bg)",color:"inherit",
                              borderColor:(Number(val.packed)||0)>0?"#10b981":"var(--bdr)"}}/>
                        ):<span style={{fontWeight:700,color:(Number(val.packed)||0)>0?"#10b981":"#ef4444"}}>{(Number(val.packed)||0).toLocaleString()}</span>}
                      </td>
                      <td style={{padding:"6px 8px",textAlign:"center"}}>
                        {isAdmin?(
                          <input type="number" min="0"
                            value={val.unpacked||""}
                            placeholder="0"
                            onChange={e=>setStockEdit(p=>({...p,[prod.id]:{...val,unpacked:e.target.value}}))}
                            style={{width:90,padding:"4px 8px",borderRadius:6,border:"1px solid var(--bdr)",
                              textAlign:"center",fontSize:12,background:"var(--bg)",color:"inherit",
                              borderColor:(Number(val.unpacked)||0)>0?"#f59e0b":"var(--bdr)"}}/>
                        ):<span style={{fontWeight:700,color:"#f59e0b"}}>{(Number(val.unpacked)||0).toLocaleString()}</span>}
                      </td>
                      <td style={{padding:"6px 10px",textAlign:"center",fontWeight:600}}>{total>0?total.toLocaleString():"—"}</td>
                      <td style={{padding:"6px 10px",textAlign:"center"}}>
                        {total>0?(isLow
                          ?<span style={{fontSize:10,background:"rgba(239,68,68,.1)",color:"#ef4444",padding:"2px 6px",borderRadius:6,fontWeight:700}}>⚠️ Low</span>
                          :<span style={{fontSize:10,background:"rgba(16,185,129,.1)",color:"#10b981",padding:"2px 6px",borderRadius:6,fontWeight:700}}>✅ OK</span>
                        ):<span style={{color:"var(--mut)",fontSize:10}}>—</span>}
                      </td>
                      <td style={{padding:"6px 8px",textAlign:"center"}}>
                        {isAdmin&&(
                          isSavedNow
                            ?<span style={{color:"#10b981",fontWeight:700,fontSize:11}}>✓</span>
                            :<button className="btn btn-o btn-sm" disabled={saving===prod.id}
                              onClick={()=>saveRow(prod)}>
                              {saving===prod.id?"...":"Save"}
                            </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };



  // ══════════════════════════════════════════════
  // EXECUTIVE DASHBOARD
  // ══════════════════════════════════════════════
  const ExecDash = () => {
    const [aiDigest, setAiDigest] = useState("");
    const [aiLoad, setAiLoad] = useState(false);
    const [lastRefresh, setLastRefresh] = useState(new Date());
    const today = new Date().toISOString().slice(0,10);
    const curMonth = String(new Date().getMonth()+1).padStart(2,"0");
    const curYear = new Date().getFullYear();
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

    // Auto refresh every 5 minutes
    useEffect(()=>{
      const timer = setInterval(()=>setLastRefresh(new Date()), 5*60*1000);
      return ()=>clearInterval(timer);
    },[]);

    // Today's data per rep
    const repStats = USERS.filter(u=>u.role==="sales"||u.role==="admin").map(u=>{
      const todayI = I.filter(i=>i.created_at?.startsWith(today)&&i.done_by===u.name);
      const todayO = ORDERS.filter(o=>o.order_date===today&&o.created_by===u.name);
      const monthI = I.filter(i=>i.created_at?.startsWith(curYear+"-"+curMonth)&&i.done_by===u.name);
      const monthO = ORDERS.filter(o=>o.order_date?.startsWith(curYear+"-"+curMonth)&&o.created_by===u.name);
      const monthRev = monthO.reduce((s,o)=>s+(Number(o.total_amount)||0),0);
      const tgt = TARGETS.find(t=>t.user_name===u.name&&t.month===curMonth&&t.year===curYear);
      const tgtAmt = Number(tgt?.target_amount||0);
      const assigned = myC.filter(c=>c.assigned_to===u.name||c.sales_rep===u.name).length;
      const calledToday = new Set(todayI.map(i=>i.customer_id)).size;
      const convRate = calledToday>0?Math.round((todayO.length/calledToday)*100):0;
      const achPct = tgtAmt>0?Math.round(monthRev/tgtAmt*100):null;

      // KPI Score (0-100)
      let kpiScore = 0;
      if(todayI.length>=10) kpiScore+=25; else kpiScore+=Math.round(todayI.length/10*25);
      if(todayO.length>=2) kpiScore+=25; else kpiScore+=Math.round(todayO.length/2*25);
      if(achPct!==null){ if(achPct>=100) kpiScore+=50; else kpiScore+=Math.round(achPct/100*50); }
      else if(monthI.length>=50) kpiScore+=25;

      return {name:u.name, todayI, todayO, monthI, monthO, monthRev, tgtAmt, achPct, assigned, calledToday, convRate, kpiScore,
        calls:todayI.filter(i=>i.type==="call").length,
        visits:todayI.filter(i=>i.type==="visit").length,
        wa:todayI.filter(i=>i.type==="whatsapp").length,
        notes:todayI.slice(0,3).map(i=>i.customer_name+": "+i.note?.slice(0,50)).join(" | ")
      };
    });

    // Overall today
    const totalCalls = repStats.reduce((s,r)=>s+r.calls,0);
    const totalVisits = repStats.reduce((s,r)=>s+r.visits,0);
    const totalOrders = repStats.reduce((s,r)=>s+r.todayO.length,0);
    const totalContacted = repStats.reduce((s,r)=>s+r.calledToday,0);
    const overallConv = totalContacted>0?Math.round(totalOrders/totalContacted*100):0;

    // Party-wise today digest
    const todayAllI = I.filter(i=>i.created_at?.startsWith(today));
    const partyDigest = Object.values(
      todayAllI.reduce((acc,i)=>{
        if(!acc[i.customer_id]) acc[i.customer_id]={name:i.customer_name,company:i.company,interactions:[],hasOrder:false};
        acc[i.customer_id].interactions.push(i);
        return acc;
      },{})
    ).slice(0,15);

    // Add order flag
    partyDigest.forEach(p=>{
      p.hasOrder = ORDERS.some(o=>o.order_date===today&&(o.customer_id===p.interactions[0]?.customer_id||o.company===p.company));
    });

    const generateDigest = async()=>{
      setAiLoad(true);
      try {
        const context = "Today "+today+" summary: "+repStats.filter(r=>r.todayI.length>0||r.todayO.length>0).map(r=>r.name+": "+r.todayI.length+" interactions ("+r.calls+" calls, "+r.visits+" visits, "+r.wa+" WA), "+r.todayO.length+" orders, KPI: "+r.kpiScore+"/100. Notes: "+r.notes).join(". ")+" Party-wise: "+partyDigest.map(p=>p.name+" ("+p.company+"): "+p.interactions.map(i=>i.type+": "+(i.note||"").slice(0,50)).join("; ")+(p.hasOrder?" [ORDER PLACED]":"")).join(" | ");

        const res = await fetch("/api/ai-polish",{method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({text:context,type:"exec_digest"})});
        const d = await res.json();
        setAiDigest(d.polished||"");
      } catch(e){}
      setAiLoad(false);
    };

    const KPIBar = ({score}) => {
      const c = score>=80?"#10b981":score>=60?"#f59e0b":score>=40?"#f97316":"#ef4444";
      const lbl = score>=80?"🔥 Excellent":score>=60?"✅ Good":score>=40?"⚡ Average":"📉 Low";
      return (
        <div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:3}}>
            <span style={{color:c,fontWeight:700}}>{lbl}</span>
            <span style={{fontWeight:800,color:c}}>{score}/100</span>
          </div>
          <div style={{height:6,background:"var(--card2)",borderRadius:3,overflow:"hidden"}}>
            <div style={{height:"100%",width:score+"%",background:c,borderRadius:3,transition:"width .5s"}}/>
          </div>
        </div>
      );
    };

    return (
      <div>
        <div className="sh">
          <div>
            <div className="sh-t">📊 Executive Dashboard</div>
            <div style={{fontSize:10,color:"var(--mut)"}}>
              Last updated: {lastRefresh.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",timeZone:"Asia/Kolkata"})} IST
              · Auto-refreshes every 5 min
            </div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button className="btn btn-o btn-sm" onClick={()=>setLastRefresh(new Date())}>🔄 Refresh</button>
            <button className="btn btn-p btn-sm" onClick={generateDigest} disabled={aiLoad}>
              {aiLoad?"⏳ Generating...":"✨ AI Digest"}
            </button>
          </div>
        </div>

        {/* Today Overview */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:14}}>
          {[
            ["📞 Calls Today", totalCalls, "#3b82f6"],
            ["🏠 Visits", totalVisits, "#a78bfa"],
            ["💬 WA/Email", repStats.reduce((s,r)=>s+r.wa,0), "#25D366"],
            ["🧾 Orders", totalOrders, "#10b981"],
            ["📈 Conversion", overallConv+"%", overallConv>=10?"#10b981":overallConv>=5?"#f59e0b":"#ef4444"],
          ].map(([lbl,val,c])=>(
            <div key={lbl} style={{background:c+"11",border:"1px solid "+c+"33",borderRadius:10,padding:12,textAlign:"center"}}>
              <div style={{fontSize:9,color:"var(--mut)",marginBottom:2}}>{lbl}</div>
              <div style={{fontSize:22,fontWeight:800,color:c}}>{val}</div>
            </div>
          ))}
        </div>

        {/* AI Digest */}
        {aiDigest&&(
          <div className="card" style={{marginBottom:14,background:"#0e1a24",color:"#e2e8f0"}}>
            <div style={{fontWeight:700,fontSize:13,marginBottom:10,color:"#f59e0b"}}>✨ AI Executive Digest</div>
            <div style={{fontSize:12,lineHeight:1.9,whiteSpace:"pre-wrap"}}>{aiDigest}</div>
          </div>
        )}

        {/* KPI Scorecard */}
        <div className="card" style={{marginBottom:14,padding:0}}>
          <div style={{padding:"12px 16px",fontWeight:700,fontSize:13,borderBottom:"1px solid var(--bdr)"}}>
            🏆 KPI Scorecard — Aaj ka Performance
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:0}}>
            {repStats.map((r,i)=>(
              <div key={r.name} style={{padding:16,borderRight:"1px solid var(--bdr)",borderBottom:"1px solid var(--bdr)"}}>
                <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:12}}>
                  <Av name={r.name} size={36}/>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:13}}>{r.name}</div>
                    <div style={{fontSize:10,color:"var(--mut)"}}>{r.assigned} parties assigned</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:10,color:"var(--mut)"}}>Month Rev</div>
                    <div style={{fontWeight:800,color:"#10b981",fontSize:13}}>₹{Math.round(r.monthRev/1000)}K</div>
                  </div>
                </div>

                {/* Today stats */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6,marginBottom:10}}>
                  {[
                    ["📞",r.calls,"Calls"],["🏠",r.visits,"Visits"],
                    ["🧾",r.todayO.length,"Orders"],["📈",r.convRate+"%","Conv."]
                  ].map(([ic,val,lbl])=>(
                    <div key={lbl} style={{textAlign:"center",background:"var(--card2)",borderRadius:6,padding:"6px 4px"}}>
                      <div style={{fontSize:14}}>{ic}</div>
                      <div style={{fontWeight:800,fontSize:13}}>{val}</div>
                      <div style={{fontSize:9,color:"var(--mut)"}}>{lbl}</div>
                    </div>
                  ))}
                </div>

                {/* Target progress */}
                {r.tgtAmt>0&&(
                  <div style={{marginBottom:8}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:3}}>
                      <span style={{color:"var(--mut)"}}>Monthly Target</span>
                      <span style={{fontWeight:700,color:r.achPct>=100?"#10b981":r.achPct>=70?"#f59e0b":"#ef4444"}}>
                        {r.achPct}%
                      </span>
                    </div>
                    <div style={{height:6,background:"var(--card2)",borderRadius:3,overflow:"hidden"}}>
                      <div style={{height:"100%",width:Math.min(r.achPct,100)+"%",
                        background:r.achPct>=100?"#10b981":r.achPct>=70?"#f59e0b":"#ef4444",borderRadius:3}}/>
                    </div>
                    <div style={{fontSize:9,color:"var(--mut)",marginTop:2}}>
                      ₹{Math.round(r.monthRev/1000)}K / ₹{Math.round(r.tgtAmt/1000)}K
                    </div>
                  </div>
                )}

                {/* KPI Score */}
                <KPIBar score={r.kpiScore}/>
              </div>
            ))}
          </div>
        </div>

        {/* Party-wise digest */}
        <div className="card" style={{padding:0}}>
          <div style={{padding:"12px 16px",fontWeight:700,fontSize:13,borderBottom:"1px solid var(--bdr)",
            display:"flex",justifyContent:"space-between"}}>
            <span>👥 Aaj Ki Party Activity</span>
            <span style={{fontSize:11,color:"var(--mut)",fontWeight:400}}>{todayAllI.length} interactions · {partyDigest.length} parties</span>
          </div>
          {partyDigest.length===0?(
            <div style={{padding:20,textAlign:"center",color:"var(--mut)"}}>Aaj koi activity nahi hui abhi tak</div>
          ):(
            <div>
              {partyDigest.map((p,i)=>{
                const lastI = p.interactions[p.interactions.length-1];
                const typeColors = {call:"#3b82f6",visit:"#10b981",whatsapp:"#25D366",email:"#a78bfa",meeting:"#f59e0b"};
                return (
                  <div key={i} style={{padding:"10px 16px",borderBottom:"1px solid var(--bdr)",
                    display:"flex",gap:10,alignItems:"flex-start",
                    background:p.hasOrder?"rgba(16,185,129,.04)":"transparent"}}>
                    <div style={{width:8,height:8,borderRadius:"50%",marginTop:5,flexShrink:0,
                      background:typeColors[lastI?.type]||"#666"}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:3}}>
                        <span style={{fontWeight:700,fontSize:12}}>{p.name}</span>
                        <span style={{fontSize:10,color:"var(--mut)"}}>{p.company}</span>
                        {p.hasOrder&&<span style={{fontSize:10,background:"rgba(16,185,129,.1)",color:"#10b981",
                          padding:"1px 6px",borderRadius:4,fontWeight:700}}>🧾 Order!</span>}
                        <span style={{fontSize:10,color:"var(--mut)",marginLeft:"auto"}}>{p.interactions.length} interactions</span>
                      </div>
                      {p.interactions.slice(0,2).map((inter,ii)=>(
                        <div key={ii} style={{fontSize:11,color:"var(--txt)",marginBottom:2}}>
                          <span style={{color:typeColors[inter.type]||"#666",fontWeight:600,marginRight:6}}>
                            {TI[inter.type]}{inter.type}
                          </span>
                          <span style={{color:"var(--mut)",fontSize:10,marginRight:6}}>{inter.done_by}</span>
                          {inter.note?.slice(0,80)}{inter.note?.length>80?"...":""}
                        </div>
                      ))}
                      {p.interactions.length>2&&<div style={{fontSize:10,color:"var(--mut)"}}>+{p.interactions.length-2} more interactions</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };



  // ══════════════════════════════════════════════
  // ══════════════════════════════════════════════
  // COST SHEET — Simple Floor Price Calculator
  // ══════════════════════════════════════════════
  const CostSheet = () => {
    const [homoPrice, setHomoPrice] = useState(()=>Number(localStorage.getItem("daana_homo")||147));
    const [cpPrice, setCpPrice] = useState(()=>Number(localStorage.getItem("daana_cp")||150));
    const [randomPrice, setRandomPrice] = useState(()=>Number(localStorage.getItem("daana_random")||158));
    const [selItem, setSelItem] = useState(null); // selected item for detail popup
    const [detailType, setDetailType] = useState(null); // "daana" | "fixed"
    const [csView, setCsView] = useState("all");
    const [partyDisc, setPartyDisc] = useState(0);
    const [partyName, setPartyName] = useState("");
    const [pItems, setPItems] = useState([]);
    const [csQ, setCsQ] = useState("");
    const [editPrice, setEditPrice] = useState({}); // {item_name: new_price}
    const [savingPrice, setSavingPrice] = useState(null);

    const saveListPrice = async(item_name, newPrice) => {
      if(!newPrice||newPrice<=0) return;
      setSavingPrice(item_name);
      try {
        await sbFetch("price_items?item_name=eq."+encodeURIComponent(item_name), {
          method:"PATCH", body:{list_price: Number(newPrice)}
        });
        setPItems(p=>p.map(x=>x.item_name===item_name?{...x,list_price:Number(newPrice)}:x));
        toast$("✅ List price updated!");
      } catch(e){ toast$("Error: "+e.message,true); }
      setSavingPrice(null);
      setEditPrice(p=>({...p,[item_name]:null}));
    };

    const [fixedPerHrInput, setFixedPerHrInput] = useState(()=>Number(localStorage.getItem("fixed_per_hr")||1083));
    const [fixedMonthlyCs, setFixedMonthlyCs] = useState(()=>Number(localStorage.getItem("fixed_monthly_cs")||11160770));
    const [csHrsMonth, setCsHrsMonth] = useState(()=>Number(localStorage.getItem("cs_hrs_month")||8297));
    const setHomo = v=>{ setHomoPrice(v); localStorage.setItem("daana_homo",v); };
    const setCP   = v=>{ setCpPrice(v);  localStorage.setItem("daana_cp",v); };
    const setRand = v=>{ setRandomPrice(v); localStorage.setItem("daana_random",v); };

    // MOS data (mh_per_carton + base daana + base floor/happy)
    const MOS = {
      "100 ML (MILKY)/1000PC":{dc:1019,mh:0.419,fp:1478,hp:1695},
      "100 ML NATURAL WITHOUT LID":{dc:1262,mh:0.5556,fp:1871,hp:2159},
      "1000 ML  (BLACK)":{dc:1902,mh:0.6319,fp:2596,hp:2923},
      "1000 ML OVAL":{dc:1691,mh:0.6597,fp:2415,hp:2756},
      "1000 ML RCT (BLACK)/500":{dc:2241,mh:1.1111,fp:3460,hp:4035},
      "1000ML (MILKY)":{dc:1902,mh:0.6042,fp:2565,hp:2878},
      "100ML  NATURAL/1000PC":{dc:1056,mh:0.419,fp:1516,hp:1733},
      "100ML /BLACK/1000PCS":{dc:1019,mh:0.419,fp:1478,hp:1695},
      "1200 ML BLACK":{dc:1602,mh:0.6417,fp:2306,hp:2638},
      "1200 ML MILKY":{dc:1602,mh:0.5958,fp:2256,hp:2564},
      "1500 ML BLACK":{dc:1821,mh:0.6667,fp:2553,hp:2898},
      "1500 ML MILKY":{dc:1821,mh:0.6667,fp:2553,hp:2898},
      "175 ML BLACK 1000 PCS":{dc:1392,mh:0.7014,fp:2162,hp:2525},
      "175 ML MILKY 1000 PCS":{dc:1392,mh:0.6944,fp:2154,hp:2514},
      "2000 ML BLACK":{dc:1554,mh:0.6325,fp:2248,hp:2576},
      "2000 ML MILKY":{dc:1554,mh:0.6325,fp:2248,hp:2576},
      "2000 ML TRANSPARENT":{dc:1614,mh:0.5575,fp:2226,hp:2515},
      "250 ML (MILKY) 500 PCS":{dc:820,mh:0.419,fp:1280,hp:1497},
      "2500 ML BLACK":{dc:1767,mh:0.6735,fp:2506,hp:2855},
      "2500 ML MILKY":{dc:1767,mh:0.6575,fp:2488,hp:2829},
      "2500 ML TRANSPARENT":{dc:1836,mh:0.6575,fp:2557,hp:2898},
      "250ML (BLACK)1000PCS":{dc:1641,mh:0.7917,fp:2509,hp:2919},
      "250ML (MILKY)1000PCS":{dc:1641,mh:0.7917,fp:2509,hp:2919},
      "300 SIPPER XL":{dc:1345,mh:0.4271,fp:1814,hp:2035},
      "300ML (BLACK)":{dc:1085,mh:0.5035,fp:1637,hp:1898},
      "300ML (MILKY)":{dc:1085,mh:0.5035,fp:1637,hp:1898},
      "350 ML RED SIPPER":{dc:1345,mh:0.6493,fp:2058,hp:2394},
      "350 ML SIPPER":{dc:1345,mh:0.6493,fp:2058,hp:2394},
      "350 SIPPER XL":{dc:1406,mh:0.4271,fp:1875,hp:2096},
      "400 ML (BLACK)":{dc:1216,mh:0.5347,fp:1803,hp:2080},
      "400 ML MILKY":{dc:1216,mh:0.5417,fp:1810,hp:2091},
      "50 ML CONTAINER /2000/NATURAL":{dc:1344,mh:0.6875,fp:2098,hp:2454},
      "50 ML CONTAINER /2000PCS/BLACK":{dc:1296,mh:0.6458,fp:2004,hp:2339},
      "500 ML BLUE SIPPER":{dc:1687,mh:1.0799,fp:2872,hp:3431},
      "500 ML OVAL":{dc:1395,mh:0.4132,fp:1848,hp:2062},
      "500 ML RCT (BLACK)/500":{dc:1803,mh:1.0764,fp:2984,hp:3541},
      "500 SIPPER XL":{dc:1687,mh:0.6424,fp:2392,hp:2725},
      "500ML  (BLACK)":{dc:1347,mh:0.3247,fp:1704,hp:1872},
      "500ML (MILKY)":{dc:1347,mh:0.2784,fp:1653,hp:1797},
      "500ML SIPPER":{dc:1597,mh:1.0799,fp:2782,hp:3341},
      "650 ML HALF ROUND":{dc:989,mh:0.6167,fp:1666,hp:1985},
      "650 ML RCT  (BLACK)/500":{dc:1949,mh:1.1111,fp:3168,hp:3743},
      "750 ML OVAL":{dc:1558,mh:0.6806,fp:2305,hp:2657},
      "750 ML RCT (BLACK)/500":{dc:2095,mh:1.0833,fp:3284,hp:3844},
      "750ML (BLACK)":{dc:1632,mh:0.5625,fp:2249,hp:2541},
      "750ML (MILKY)":{dc:1632,mh:0.559,fp:2246,hp:2535},
      "RE 16":{dc:1147,mh:0.5375,fp:1737,hp:2015},
      "RE 24":{dc:1274,mh:0.5375,fp:1864,hp:2142},
      "RE 28":{dc:1130,mh:0.5417,fp:1724,hp:2005},
      "RE 38 BLACK":{dc:2199,mh:0.5417,fp:2794,hp:3074},
      "RO 16":{dc:1267,mh:0.4167,fp:1724,hp:1940},
      "RO 24":{dc:1632,mh:0.4208,fp:2094,hp:2312},
      "RO 32":{dc:1729,mh:0.4542,fp:2227,hp:2462},
      "SSRE 1000 BLACK":{dc:2628,mh:0.6771,fp:3371,hp:3721},
      "SSRE 500 BLACK":{dc:2022,mh:0.6771,fp:2765,hp:3115},
      "SSRE 650 BLACK":{dc:2102,mh:0.6771,fp:2845,hp:3196},
      "SSRE 750 BLACK":{dc:2204,mh:0.6771,fp:2947,hp:3298},
    };

    useEffect(()=>{
      sbFetch("price_items?is_active=eq.true&order=item_name.asc&select=item_name,crm_product_name,pcs_per_carton,box_wt,lid_wt,box_homo,box_cp,box_random,lid_homo,lid_cp,lid_random,carton_cost,list_price,poly_gm,colour")
        .then(d=>setPItems(d||[]));
    },[]);

    const calc = (p) => {
      const mos = MOS[p.item_name]||{};
      const pcs=Number(p.pcs_per_carton||1);
      // Box weights (g/pc)
      const bh=Number(p.box_homo||0),bc=Number(p.box_cp||0),br=Number(p.box_random||0);
      // Lid weights (g/pc)
      const lh=Number(p.lid_homo||0),lc=Number(p.lid_cp||0),lr=Number(p.lid_random||0);
      // Box wt and lid wt total per pc
      const boxWt=Number(p.box_wt||0), lidWt=Number(p.lid_wt||0);
      const totalWtPerPc=boxWt+lidWt;
      // Combined weights (g/pc) for daana
      const th=(bh+lh)/1000, tc=(bc+lc)/1000, tr=(br+lr)/1000;
      // Daana breakdown per CTN
      const homoCost = Math.round(th*pcs*homoPrice);
      const cpCost   = Math.round(tc*pcs*cpPrice);
      const randCost = Math.round(tr*pcs*randomPrice);
      const newDaana = homoCost+cpCost+randCost;
      const baseDaana= mos.dc||newDaana;
      const carton   = Number(p.carton_cost||0);
      const listPrice= Number(p.list_price||0);
      const mh       = mos.mh||0;
      // MB Cost = 2% of daana (masterbatch loading)
      const mbCost = Math.round(newDaana*0.02);
      // Poly Cost = poly_gm/1000 * poly_rate (₹120/kg default)
      const polyGm = Number(p.poly_gm||0);
      const polyRate = 210; // ₹/kg
      const polyCost = Math.round(polyGm/1000*polyRate);
      // Total variable cost
      const totalVariable = newDaana + mbCost + polyCost + carton;
      // N1/N3 zone thresholds (derived from MOS)
      const fixedPerHr = fixedPerHrInput||1083;
      // N1 = Floor (break-even — sirf fixed cost cover ho)
      // N2 = Standard (50L profit target)
      // N3 = Happy (60L profit target)
      // N2/N3 derived from MOS happy_price ratio
      const n1Zone = mh>0 ? fixedPerHr : 1097;
      const n3ZoneMOS = mh>0 ? Math.round((mos.hp-baseDaana-carton)/mh) : 1938;
      const n2Zone = mh>0 ? Math.round((n1Zone + n3ZoneMOS)/2) : 1615;
      const newFloor = Math.round(newDaana+mbCost+polyCost+carton+n1Zone*mh);
      const newN2    = Math.round(newDaana+mbCost+polyCost+carton+n2Zone*mh);
      const newHappy = Math.round(newDaana+mbCost+polyCost+carton+n3ZoneMOS*mh);
      const fixedCost= Math.round(n1Zone*mh);
      const partyPrice = Math.max(0,listPrice-partyDisc);
      const margin = listPrice>0?Math.round((listPrice-totalVariable-fixedCost)/listPrice*100):0;
      const zone = listPrice<totalVariable?"🔴 Loss":listPrice>=newHappy?"🔵 N3 Happy":listPrice>=newN2?"🟢 N2 Standard":listPrice>=newFloor?"🟡 N1 Floor":"🔴 Below N1";
      const pPrice = Math.max(0, listPrice - partyDisc);
      const partyZone = pPrice<totalVariable?"🔴 Loss":pPrice>=newHappy?"🔵 N3 Happy":pPrice>=newN2?"🟢 N2 Standard":pPrice>=newFloor?"🟡 N1 Floor":"🔴 Below N1";
      return {homoCost,cpCost,randCost,newDaana,baseDaana,mbCost,polyCost,carton,listPrice,
              newFloor,newN2,newHappy,fixedCost,totalVariable,
              mh,n1Zone,n2Zone,n3ZoneMOS,zone,partyZone,margin,partyPrice,
              polyGm,polyRate,pcs,th,tc,tr,
              boxWt,lidWt,totalWtPerPc,
              bh,bc,br,lh,lc,lr};
    };

    const filtItems = pItems.filter(p=>!csQ||p.item_name.toLowerCase().includes(csQ.toLowerCase()));
    const zoneColor = z=>z.includes("N3")?"#006600":z.includes("N1 Zone")?"#806000":"#cc0000";

    // Detail Popup
    const DetailPopup = ()=>{
      if(!selItem||!detailType) return null;
      const p=selItem; const c=calc(p);
      return (
        <div className="ov" onClick={()=>setSelItem(null)}>
          <div className="mod mod-sm" onClick={e=>e.stopPropagation()} style={{maxWidth:380}}>
            <div className="mod-ttl">
              {detailType==="daana"?"🌾 Daana Cost Breakdown":"⚙️ Fixed Cost Breakdown"}
              <button className="cls" onClick={()=>setSelItem(null)}>✕</button>
            </div>
            <div style={{padding:"4px 0",fontSize:13,fontWeight:700,marginBottom:12}}>{p.item_name}</div>

            {detailType==="daana"&&(
              <div>
                {/* Weight summary */}
                <div style={{background:"rgba(30,58,95,.06)",borderRadius:8,padding:10,marginBottom:10,fontSize:11}}>
                  <div style={{fontWeight:700,marginBottom:6,color:"var(--acc)"}}>📦 Weight per Piece</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,textAlign:"center"}}>
                    {[["Box",c.boxWt,"#2E6DA4"],["Lid",c.lidWt,"#7A5C1E"],["Total",c.totalWtPerPc,"#1E3A5F"]].map(([lbl,wt,clr])=>(
                      <div key={lbl} style={{background:"var(--card)",borderRadius:6,padding:6}}>
                        <div style={{fontSize:9,color:"var(--mut)"}}>{lbl}</div>
                        <div style={{fontWeight:800,color:clr,fontSize:14}}>{wt.toFixed(1)}g</div>
                        <div style={{fontSize:9,color:"var(--mut)"}}>{(wt*c.pcs/1000).toFixed(3)}kg/CTN</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Daana breakdown */}
                <div style={{background:"var(--card2)",borderRadius:8,padding:12,marginBottom:10}}>
                  <div style={{fontSize:11,color:"var(--mut)",marginBottom:8,fontWeight:600}}>🌾 Daana Cost Breakdown</div>
                  {[
                    ["Homo","Box:"+c.bh.toFixed(2)+"g + Lid:"+c.lh.toFixed(2)+"g = "+((c.bh+c.lh)).toFixed(2)+"g/pc",c.th*1000,homoPrice,c.homoCost,"#3b82f6"],
                    ["CP","Box:"+c.bc.toFixed(2)+"g + Lid:"+c.lc.toFixed(2)+"g = "+((c.bc+c.lc)).toFixed(2)+"g/pc",c.tc*1000,cpPrice,c.cpCost,"#8b5cf6"],
                    ["Random","Box:"+c.br.toFixed(2)+"g + Lid:"+c.lr.toFixed(2)+"g = "+((c.br+c.lr)).toFixed(2)+"g/pc",c.tr*1000,randomPrice,c.randCost,"#f59e0b"],
                  ].map(([lbl,detail,wt,price,cost,clr])=>(
                    <div key={lbl} style={{padding:"8px 0",borderBottom:"1px solid var(--bdr)"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div style={{fontWeight:600,color:clr}}>{lbl} Daana</div>
                        <div style={{fontWeight:800,fontSize:13}}>₹{cost.toLocaleString("en-IN")}</div>
                      </div>
                      <div style={{fontSize:10,color:"var(--mut)",marginTop:2}}>{detail}</div>
                      <div style={{fontSize:10,color:"var(--mut)"}}>
                        {(wt*c.pcs/1000).toFixed(3)}kg/CTN × ₹{price}/kg
                      </div>
                    </div>
                  ))}
                </div>

                {/* MB + Poly */}
                <div style={{background:"var(--card2)",borderRadius:8,padding:12,marginBottom:10}}>
                  <div style={{fontSize:11,color:"var(--mut)",marginBottom:8,fontWeight:600}}>📦 MB + Poly</div>
                  <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid var(--bdr)"}}>
                    <div>
                      <div style={{fontSize:11,fontWeight:600}}>Masterbatch (MB)</div>
                      <div style={{fontSize:10,color:"var(--mut)"}}>2% of Daana = 2% × ₹{c.newDaana}</div>
                    </div>
                    <div style={{fontWeight:700}}>₹{c.mbCost}</div>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0"}}>
                    <div>
                      <div style={{fontSize:11,fontWeight:600}}>Polythene</div>
                      <div style={{fontSize:10,color:"var(--mut)"}}>{c.polyGm}g/CTN × ₹{c.polyRate}/kg = {(c.polyGm/1000).toFixed(3)}kg</div>
                    </div>
                    <div style={{fontWeight:700}}>₹{c.polyCost}</div>
                  </div>
                </div>

                {/* Total */}
                <div style={{borderRadius:8,padding:"10px 12px",background:"rgba(239,68,68,.08)"}}>
                  {[["Daana",c.newDaana,"#8B4513"],["MB",c.mbCost,"#7d6608"],["Poly",c.polyCost,"#7d6608"],["Carton",c.carton,"#555"]].map(([lbl,val,clr])=>(
                    <div key={lbl} style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}>
                      <span style={{color:clr}}>{lbl}</span><span>₹{val}</span>
                    </div>
                  ))}
                  <div style={{display:"flex",justifyContent:"space-between",fontWeight:800,fontSize:15,
                    borderTop:"1px solid var(--bdr)",paddingTop:6,marginTop:4}}>
                    <span>Total Variable/CTN</span>
                    <span style={{color:"#cc0000"}}>₹{c.totalVariable.toLocaleString("en-IN")}</span>
                  </div>
                  <div style={{fontSize:10,color:"var(--mut)",marginTop:6,textAlign:"center"}}>
                    Base daana (MOS): ₹{c.baseDaana} | Change: {c.newDaana>c.baseDaana?"▲ +":"▼ "}₹{Math.abs(c.newDaana-c.baseDaana)}
                  </div>
                </div>
              </div>
            )}

            {detailType==="fixed"&&(
              <div>
                <div style={{background:"var(--card2)",borderRadius:8,padding:12,marginBottom:10}}>
                  <div style={{fontSize:11,color:"var(--mut)",marginBottom:8}}>Fixed Cost = N1 Zone × MH per CTN</div>
                  {[
                    ["MH/CTN (Machine Hours per Carton)",c.mh.toFixed(4)+" hrs",""],
                    ["N1 Floor ₹/hr (fixed cost/hr)","₹"+c.n1Zone+"/hr","🔴 Break-even"],
                    ["N2 Standard ₹/hr","₹"+c.n2Zone+"/hr","🟢 ~50L profit"],
                    ["N3 Happy ₹/hr","₹"+c.n3ZoneMOS+"/hr","🔵 ~60L profit"],
                    ["Fixed Cost @ N1","₹"+c.fixedCost+"/ctn","per CTN"],
                    ["Carton Cost","₹"+c.carton+"/ctn",""],
                  ].map(([lbl,val,badge])=>(
                    <div key={lbl} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                      padding:"7px 0",borderBottom:"1px solid var(--bdr)"}}>
                      <div style={{fontSize:11}}>{lbl}</div>
                      <div style={{display:"flex",gap:6,alignItems:"center"}}>
                        {badge&&<span style={{fontSize:9,padding:"1px 6px",borderRadius:4,
                          background:"rgba(245,158,11,.15)",color:"#f59e0b",fontWeight:700}}>{badge}</span>}
                        <span style={{fontWeight:700}}>{val}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{padding:"8px 12px",background:"rgba(30,58,95,.06)",borderRadius:8,fontSize:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span>Daana + Carton + Fixed (N1)</span>
                    <span style={{fontWeight:800,color:"#cc0000"}}>₹{c.newFloor.toLocaleString("en-IN")}</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between"}}>
                    <span>Daana + Carton + Fixed (N3)</span>
                    <span style={{fontWeight:800,color:"#006600"}}>₹{c.newHappy.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    };

    return (
      <div>
        <div className="sh">
          <div>
            <div className="sh-t">💰 Cost Sheet</div>
            <div className="sh-s">Click on any value to see breakdown</div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button className="btn btn-o btn-sm" onClick={async()=>{
              toast$("Excel ban raha hai...");
              try {
                const payload = {
                  homo: homoPrice, cp: cpPrice, random: randomPrice,
                  items: filtItems.map(p=>{
                    const c=calc(p);
                    return {
                      item_name: p.item_name,
                      crm_name: p.crm_product_name||"",
                      colour: p.colour||"",
                      pcs: p.pcs_per_carton,
                      homo_g: (Number(p.box_homo||0)+Number(p.lid_homo||0)),
                      cp_g: (Number(p.box_cp||0)+Number(p.lid_cp||0)),
                      rand_g: (Number(p.box_random||0)+Number(p.lid_random||0)),
                      homo_cost: c.homoCost,
                      cp_cost: c.cpCost,
                      rand_cost: c.randCost,
                      daana: c.newDaana,
                      base_daana: c.baseDaana,
                      carton: c.carton,
                      fixed: c.fixedCost,
                      mh: c.mh,
                      n1_zone: c.n1Zone,
                      n3_zone: c.n3Zone,
                      total_cost: c.newDaana+c.carton+c.fixedCost,
                      list_price: c.listPrice,
                      floor_n1: c.newFloor,
                      happy_n3: c.newHappy,
                      zone: c.zone.replace(/[🔴🟡🔵]/g,"").trim(),
                      margin: c.margin,
                    };
                  })
                };
                const res = await fetch("/api/cost-sheet-excel", {
                  method:"POST",
                  headers:{"Content-Type":"application/json"},
                  body: JSON.stringify(payload)
                });
                if(!res.ok){ toast$("Excel error",true); return; }
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href=url; a.download=`Mayur_Cost_Sheet_${new Date().toISOString().slice(0,10)}.xlsx`;
                a.click(); URL.revokeObjectURL(url);
                toast$("✅ Excel downloaded!");
              } catch(e){ toast$("Error: "+e.message,true); }
            }}>📊 Excel</button>
            <button className="btn btn-p btn-sm" onClick={()=>{
              const win=window.open("","_blank");
              if(!win) return;
              const rows = filtItems.map(p=>{
                const c=calc(p);
                const zc=c.zone.includes("N3")?"n3":c.zone.includes("N1 Zone")?"n1":"loss";
                return "<tr><td>"+p.item_name+"</td><td>"+p.pcs_per_carton+"</td><td>₹"+c.newDaana.toLocaleString("en-IN")+"</td><td>₹"+c.carton+"</td><td>₹"+c.fixedCost+"</td><td>₹"+(c.newDaana+c.carton+c.fixedCost).toLocaleString("en-IN")+"</td><td>₹"+c.listPrice.toLocaleString("en-IN")+"</td><td class=\""+zc+"\">₹"+c.newFloor.toLocaleString("en-IN")+"</td><td class=\""+zc+"\">₹"+c.newHappy.toLocaleString("en-IN")+"</td><td class=\""+zc+"\">"+c.zone.replace(/[🔴🟡🔵]/g,"")+"</td><td>"+c.margin+"%</td></tr>";
              }).join("");
              win.document.write("<!DOCTYPE html><html><head><title>Cost Sheet</title><style>body{font-family:Arial;padding:20px;font-size:12px}table{width:100%;border-collapse:collapse}th{background:#1E3A5F;color:#fff;padding:8px;font-size:11px}td{padding:6px 8px;border:1px solid #ddd;font-size:11px}.n3{background:#d5f5e3;color:#006600;font-weight:700}.n1{background:#fff2cc;color:#806000;font-weight:700}.loss{background:#ffd7d7;color:#cc0000;font-weight:700}@media print{body{padding:10px}}</style></head><body><h2 style=\"color:#1E3A5F\">Mayur Food Packaging — Cost Sheet</h2><p style=\"font-size:11px;color:#888\">Daana: Homo ₹"+homoPrice+" | CP ₹"+cpPrice+" | Random ₹"+randomPrice+" | "+new Date().toLocaleDateString("en-IN")+"</p><table><thead><tr><th>Item</th><th>Pcs</th><th>Daana ₹</th><th>Carton ₹</th><th>Fixed ₹</th><th>Total Cost</th><th>List ₹</th><th>Floor N1</th><th>Happy N3</th><th>Zone</th><th>Margin%</th></tr></thead><tbody>"+rows+"</tbody></table><script>window.onload=()=>window.print();<\/script></body></html>");
              win.document.close();
            }}>🖨️ PDF</button>
          </div>
        </div>

        {/* Daana Prices */}
        <div className="card" style={{marginBottom:12,background:"rgba(245,158,11,.05)",border:"1px solid #f59e0b"}}>
          <div style={{fontWeight:700,fontSize:12,color:"#f59e0b",marginBottom:10}}>⚡ Daana & Fixed Cost — Change karo, auto-save hoga</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10}}>
            {[["🌾 Homo",homoPrice,setHomo,"#0000ff"],["🌾 CP",cpPrice,setCP,"#0000ff"],["🌾 Random",randomPrice,setRand,"#0000ff"]].map(([lbl,val,set,clr])=>(
              <div key={lbl} style={{textAlign:"center"}}>
                <div style={{fontSize:10,color:"var(--mut)",marginBottom:4}}>{lbl} (₹/kg)</div>
                <input type="number" value={val} onChange={e=>set(Number(e.target.value))}
                  style={{width:"100%",padding:"6px 8px",borderRadius:8,border:"2px solid #f59e0b",
                    fontSize:20,fontWeight:800,color:clr,textAlign:"center",background:"var(--bg)"}}/>
              </div>
            ))}
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:10,color:"var(--mut)",marginBottom:4}}>⚙️ Fixed Cost N1 (₹/hr)</div>
              <input type="number" value={fixedPerHrInput}
                onChange={e=>{const v=Number(e.target.value);setFixedPerHrInput(v);localStorage.setItem("fixed_per_hr",v);}}
                style={{width:"100%",padding:"6px 8px",borderRadius:8,border:"2px solid #cc0000",
                  fontSize:20,fontWeight:800,color:"#cc0000",textAlign:"center",background:"var(--bg)"}}/>
              <div style={{fontSize:9,color:"var(--mut)",marginTop:2}}>MOS Model 1=₹1,083 | Model 2=₹850 | Actual=₹1,344</div>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginTop:10}}>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:10,color:"var(--mut)",marginBottom:4}}>💰 Fixed Cost/Month (₹)</div>
              <input type="number" value={fixedMonthlyCs}
                onChange={e=>{const v=Number(e.target.value);setFixedMonthlyCs(v);localStorage.setItem("fixed_monthly_cs",v);
                  if(csHrsMonth>0) setFixedPerHrInput(Math.round(v/csHrsMonth));}}
                style={{width:"100%",padding:"4px 8px",borderRadius:8,border:"1px solid var(--bdr)",
                  fontSize:13,fontWeight:700,textAlign:"center",background:"var(--bg)",color:"var(--txt)"}}/>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:10,color:"var(--mut)",marginBottom:4}}>⏱️ Machine Hours/Month</div>
              <input type="number" value={csHrsMonth}
                onChange={e=>{const v=Number(e.target.value);setCsHrsMonth(v);localStorage.setItem("cs_hrs_month",v);
                  if(v>0) setFixedPerHrInput(Math.round(fixedMonthlyCs/v));}}
                style={{width:"100%",padding:"4px 8px",borderRadius:8,border:"1px solid var(--bdr)",
                  fontSize:13,fontWeight:700,textAlign:"center",background:"var(--bg)",color:"var(--txt)"}}/>
            </div>
            <div style={{background:"rgba(204,0,0,.06)",borderRadius:8,padding:"8px",textAlign:"center"}}>
              <div style={{fontSize:9,color:"var(--mut)"}}>Fixed Cost/hr (auto)</div>
              <div style={{fontWeight:800,fontSize:18,color:"#cc0000"}}>₹{fixedPerHrInput.toLocaleString()}/hr</div>
              <div style={{fontSize:9,color:"var(--mut)"}}>= ₹{(fixedMonthlyCs/1e5).toFixed(1)}L ÷ {csHrsMonth}h</div>
            </div>
          </div>
        </div>

        {/* Zone Legend */}
        <div style={{display:"flex",gap:10,marginBottom:10,flexWrap:"wrap",fontSize:10}}>
          {[
            ["🔴 Below N1","Below floor — loss hoga","#cc0000","rgba(239,68,68,.08)"],
            ["🟡 N1 Floor","Break-even — fixed cost cover ho rahi hai","#806000","rgba(245,158,11,.08)"],
            ["🟢 N2 Standard","Standard profit — ~50L target","#006600","rgba(16,185,129,.08)"],
            ["🔵 N3 Happy","Happy price — ~60L target","#0066cc","rgba(59,130,246,.08)"],
          ].map(([zone,desc,clr,bg])=>(
            <div key={zone} style={{padding:"4px 10px",borderRadius:20,background:bg,color:clr,fontWeight:700,display:"flex",gap:6,alignItems:"center"}}>
              <span>{zone}</span>
              <span style={{fontWeight:400,color:"var(--mut)"}}>{desc}</span>
            </div>
          ))}
        </div>

        {/* View toggle */}
        <div style={{display:"flex",gap:8,marginBottom:10,alignItems:"center"}}>
          <button className={"btn btn-sm "+(csView==="all"?"btn-p":"btn-o")} onClick={()=>setCsView("all")}>📊 Sab Products</button>
          <button className={"btn btn-sm "+(csView==="party"?"btn-p":"btn-o")} onClick={()=>setCsView("party")}>👤 Party Price</button>
          <div className="sr" style={{flex:1,marginBottom:0}}>
            <Search size={12} className="sr-ic"/>
            <input className="inp" placeholder="Search..." value={csQ} onChange={e=>setCsQ(e.target.value)}/>
          </div>
        </div>

        {csView==="party"&&(
          <div className="card" style={{marginBottom:10}}>
            <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:10,marginBottom:8}}>
              <div>
                <label className="lbl">Party Select karo (ya naam type karo)</label>
                <select className="inp" onChange={e=>{
                  const cust = myC.find(c=>c.id===e.target.value);
                  if(cust){
                    setPartyName(cust.company||cust.name);
                    setPartyDisc(Number(cust.discount_per_ctn)||0);
                  }
                }}>
                  <option value="">-- Category → Party Select Karo --</option>
                  {["crm","retail","direct","enduser","nbd"].map(cat=>{
                    const catParties=[...myC].filter(c=>c.type===cat).sort((a,b)=>(a.company||a.name).localeCompare(b.company||b.name));
                    if(catParties.length===0) return null;
                    const catLabel=cat==="crm"?"🏢 CRM":cat==="retail"?"🏪 Retail":cat==="direct"?"🚚 Direct":cat==="enduser"?"👤 End User":"🎯 NBD";
                    return [
                      <option key={"cat-"+cat} disabled style={{fontWeight:700,background:"var(--card2)"}}>── {catLabel} ({catParties.length}) ──</option>,
                      ...catParties.map(c=>(
                        <option key={c.id} value={c.id}>&nbsp;&nbsp;{c.company||c.name}{c.discount_per_ctn>0?" · ₹"+c.discount_per_ctn+"/ctn":""}</option>
                      ))
                    ];
                  })}
                </select>
              </div>
              <div>
                <label className="lbl">Discount (₹/ctn)</label>
                <input type="number" className="inp" placeholder="0"
                  value={partyDisc||""}
                  onChange={e=>setPartyDisc(Number(e.target.value)||0)}
                  style={{color:"#cc0000",fontWeight:800,textAlign:"center"}}/>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:10}}>
              <div>
                <label className="lbl">Ya manually naam daalo</label>
                <input className="inp" placeholder="Custom party name..."
                  value={partyName}
                  onChange={e=>setPartyName(e.target.value)}/>
              </div>
              <div style={{display:"flex",alignItems:"flex-end"}}>
                {partyName&&<div style={{fontSize:11,color:"var(--mut)",padding:"8px 0"}}>
                  <b style={{color:"var(--txt)"}}>{partyName}</b> · ₹{partyDisc}/ctn discount
                </div>}
              </div>
            </div>
          </div>
        )}

        {/* Simple Clean Table */}
        {pItems.length===0&&<div className="card" style={{padding:20,textAlign:"center",color:"var(--mut)"}}>⏳ Loading products...</div>}
        {pItems.length>0&&<div className="card" style={{padding:0}}>
          <div style={{overflowX:"auto",maxHeight:"60vh",overflowY:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead style={{position:"sticky",top:0,zIndex:10}}>
                <tr style={{background:"#1E3A5F"}}>
                  {(csView==="all"
                    ?["Item","Pcs","Daana ₹","MB ₹","Poly ₹","Carton ₹","Fixed ₹","Total Cost","List ₹","🔴 Floor N1","🟢 N2 Std","🔵 N3 Happy","Zone","Margin"]
                    :["Item","Pcs","List ₹","🔴 Floor N1","🟢 N2 Std","🔵 N3 Happy","Disc ₹",partyName||"Party ₹","Zone","Margin"]
                  ).map(h=>(
                    <th key={h} style={{padding:"8px 6px",color:"#fff",fontSize:10,fontWeight:700,textAlign:"center",
                      background:"#1E3A5F",whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtItems.map((p,idx)=>{
                  const c=calc(p);
                  const bg=idx%2===0?"var(--card2)":"var(--card)";
                  const zc=c.zone.includes("N3")?"#006600":c.zone.includes("N1 Zone")?"#806000":"#cc0000";
                  const totalCost=c.newDaana+c.carton+c.fixedCost;
                  if(csView==="party") return (
                    <tr key={idx} style={{borderBottom:"1px solid var(--bdr)",background:bg}}>
                      <td style={{padding:"8px",fontWeight:600}}>{p.item_name}</td>
                      <td style={{textAlign:"center",padding:"8px 4px"}}>{p.pcs_per_carton}</td>
                      <td style={{textAlign:"center",padding:"8px 4px",color:"#0000ff",fontWeight:700}}>₹{c.listPrice.toLocaleString("en-IN")}</td>
                      <td style={{textAlign:"center",padding:"8px 4px",background:"rgba(239,68,68,.08)",color:"#cc0000",fontWeight:700,cursor:"pointer"}}
                        onClick={()=>{setSelItem(p);setDetailType("fixed");}}>₹{c.newFloor.toLocaleString("en-IN")}</td>
                      <td style={{textAlign:"center",padding:"8px 4px",background:"rgba(245,158,11,.08)",color:"#806000",fontWeight:700,cursor:"pointer"}}
                        onClick={()=>{setSelItem(p);setDetailType("fixed");}}>₹{c.newN2.toLocaleString("en-IN")}</td>
                      <td style={{textAlign:"center",padding:"8px 4px",background:"rgba(16,185,129,.08)",color:"#006600",fontWeight:700,cursor:"pointer"}}
                        onClick={()=>{setSelItem(p);setDetailType("fixed");}}>₹{c.newHappy.toLocaleString("en-IN")}</td>
                      <td style={{textAlign:"center",padding:"8px 4px",color:"#cc0000"}}>₹{partyDisc}</td>
                      {(()=>{
                        const pzBg = c.partyZone.includes("N3")?"rgba(16,185,129,.25)":c.partyZone.includes("N2")?"rgba(253,230,138,.5)":c.partyZone.includes("N1 Floor")?"rgba(239,68,68,.15)":"rgba(239,68,68,.3)";
                        const pzClr = c.partyZone.includes("N3")?"#005500":c.partyZone.includes("N2")?"#7c5800":c.partyZone.includes("N1 Floor")?"#aa0000":"#aa0000";
                        const pzBorder = c.partyZone.includes("N3")?"2px solid #006600":c.partyZone.includes("N2")?"2px solid #d97706":c.partyZone.includes("N1 Floor")?"2px solid #cc0000":"2px solid #cc0000";
                        return <>
                          <td style={{textAlign:"center",padding:"6px 8px",fontWeight:900,fontSize:15,
                            background:pzBg,color:pzClr,border:pzBorder}}>₹{c.partyPrice.toLocaleString("en-IN")}</td>
                          <td style={{textAlign:"center",padding:"6px 8px",fontWeight:700,background:pzBg,color:pzClr,border:pzBorder}}>{c.partyZone}</td>
                        </>;
                      })()}
                      <td style={{textAlign:"center",padding:"8px 4px",fontWeight:700,color:c.margin<0?"#cc0000":"#006600"}}>{c.margin}%</td>
                    </tr>
                  );
                  return (
                    <tr key={idx} style={{borderBottom:"1px solid var(--bdr)",background:bg}}>
                      <td style={{padding:"8px",fontWeight:600}}>{p.item_name}</td>
                      <td style={{textAlign:"center",padding:"8px 4px"}}>{p.pcs_per_carton}</td>
                      {/* Clickable daana */}
                      <td style={{textAlign:"center",padding:"8px 4px",color:"#8B4513",fontWeight:700,cursor:"pointer",
                        textDecoration:"underline dotted"}} title="Click for breakdown"
                        onClick={()=>{setSelItem(p);setDetailType("daana");}}>₹{c.newDaana.toLocaleString("en-IN")}</td>
                      <td style={{textAlign:"center",padding:"8px 4px",color:"#7d6608",cursor:"pointer",
                        textDecoration:"underline dotted"}} title="MB = 2% of daana"
                        onClick={()=>{setSelItem(p);setDetailType("daana");}}>₹{c.mbCost}</td>
                      <td style={{textAlign:"center",padding:"8px 4px",color:"#7d6608",cursor:"pointer",
                        textDecoration:"underline dotted"}} title="Poly cost"
                        onClick={()=>{setSelItem(p);setDetailType("daana");}}>₹{c.polyCost}</td>
                      <td style={{textAlign:"center",padding:"8px 4px",color:"#555"}}>₹{c.carton}</td>
                      {/* Clickable fixed */}
                      <td style={{textAlign:"center",padding:"8px 4px",color:"#7d6608",fontWeight:700,cursor:"pointer",
                        textDecoration:"underline dotted"}} title="Click for breakdown"
                        onClick={()=>{setSelItem(p);setDetailType("fixed");}}>₹{c.fixedCost}</td>
                      <td style={{textAlign:"center",padding:"8px 4px",fontWeight:800}}>₹{(c.totalVariable+c.fixedCost).toLocaleString("en-IN")}</td>
                      <td style={{textAlign:"center",padding:"4px",color:"#0000ff",fontWeight:700,minWidth:90}}>
                        {editPrice[p.item_name]!==undefined && editPrice[p.item_name]!==null ? (
                          <div style={{display:"flex",gap:4,alignItems:"center"}}>
                            <input type="number" autoFocus
                              value={editPrice[p.item_name]}
                              onChange={e=>setEditPrice(prev=>({...prev,[p.item_name]:e.target.value}))}
                              onKeyDown={e=>{if(e.key==="Enter")saveListPrice(p.item_name,editPrice[p.item_name]);if(e.key==="Escape")setEditPrice(prev=>({...prev,[p.item_name]:null}));}}
                              style={{width:70,padding:"2px 4px",borderRadius:4,border:"2px solid #3b82f6",fontSize:11,textAlign:"center"}}/>
                            <button onClick={()=>saveListPrice(p.item_name,editPrice[p.item_name])}
                              style={{padding:"2px 6px",borderRadius:4,background:"#3b82f6",color:"#fff",border:"none",cursor:"pointer",fontSize:10}}>
                              {savingPrice===p.item_name?"...":"✓"}
                            </button>
                            <button onClick={()=>setEditPrice(prev=>({...prev,[p.item_name]:null}))}
                              style={{padding:"2px 4px",borderRadius:4,background:"#ddd",border:"none",cursor:"pointer",fontSize:10}}>✕</button>
                          </div>
                        ):(
                          <span onClick={()=>setEditPrice(prev=>({...prev,[p.item_name]:c.listPrice}))}
                            style={{cursor:"pointer",textDecoration:"underline dotted",padding:"4px 8px",borderRadius:4}}
                            title="Click to edit list price">
                            ₹{c.listPrice.toLocaleString("en-IN")} ✏️
                          </span>
                        )}
                      </td>
                      <td style={{textAlign:"center",padding:"8px 4px",background:"rgba(239,68,68,.08)",color:"#cc0000",fontWeight:700,cursor:"pointer"}}
                        title="N1 = Floor Price (sirf fixed cost cover hoti hai)"
                        onClick={()=>{setSelItem(p);setDetailType("fixed");}}>₹{c.newFloor.toLocaleString("en-IN")}</td>
                      <td style={{textAlign:"center",padding:"8px 4px",background:"rgba(245,158,11,.08)",color:"#806000",fontWeight:700,cursor:"pointer"}}
                        title="N2 = Standard (50L profit target)"
                        onClick={()=>{setSelItem(p);setDetailType("fixed");}}>₹{c.newN2.toLocaleString("en-IN")}</td>
                      <td style={{textAlign:"center",padding:"8px 4px",background:"rgba(16,185,129,.08)",color:"#006600",fontWeight:700,cursor:"pointer"}}
                        title="N3 = Happy (60L profit target)"
                        onClick={()=>{setSelItem(p);setDetailType("fixed");}}>₹{c.newHappy.toLocaleString("en-IN")}</td>
                      <td style={{textAlign:"center",padding:"8px 4px",fontWeight:700,color:zc}}>{c.zone}</td>
                      <td style={{textAlign:"center",padding:"8px 4px",fontWeight:700,color:c.margin<0?"#cc0000":"#006600"}}>{c.margin}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>}

        {selItem&&<DetailPopup/>}
      </div>
    );
  };

  /* ── NAV ── */
  const navs = [
    {id:"dashboard",lbl:"Dashboard",ic:"🏠",roles:["admin","sales","dataentry"]},
    {id:"exec",lbl:"Executive",ic:"📊",roles:["admin"]},
    {id:"customers",lbl:"Customers",ic:"👥",roles:["admin","sales","dataentry"]},
    {id:"enquiries",lbl:"Enquiries",ic:"📋",roles:["admin","sales"]},
    {id:"followups",lbl:"Follow-ups",ic:"⚡",badge:urgN>0?urgN:null,roles:["admin","sales","dataentry"]},
    {id:"samples",lbl:"Samples",ic:"🧪",badge:S.filter(s=>s.status==="pending").length||null,bc:"info",roles:["admin","sales"]},
    {id:"payments",lbl:"Payments",ic:"💳",badge:P.filter(p=>p.overdue>0).length||null,roles:["admin"]},
    {id:"products",lbl:"Products",ic:"📦",roles:["admin","dataentry"]},
    {id:"orders",lbl:"Orders",ic:"🧾",badge:myORDERS.filter(o=>o.status==="draft").length||null,bc:"info",roles:["admin","sales","dataentry"]},
    {id:"reports",lbl:"Reports",ic:"📊",roles:["admin"]},
    {id:"targets",lbl:"Targets",ic:"🎯",roles:["admin"]},
    {id:"pricing",lbl:"Pricing",ic:"💰",roles:["admin"]},
    {id:"production",lbl:"Production",ic:"🏭",roles:["admin"]},
    {id:"planner",lbl:`Planner${todayTaskCount>0?" ("+todayTaskCount+")":""}`,ic:"📅",roles:["admin","sales"]},
    {id:"pipeline",lbl:"Pipeline",ic:"🎯",roles:["admin","sales"]},
    {id:"forecast",lbl:"Forecast",ic:"📈",roles:["admin","sales"]},
    {id:"sop",lbl:"SOP",ic:"📋",roles:["admin","sales","dataentry"]},
    {id:"daily",lbl:"Daily Report",ic:"📊",roles:["admin"]},
    {id:"calling",lbl:"Calling",ic:"📞",roles:["admin","sales"]},
    {id:"stock",lbl:"Stock",ic:"📦",roles:["admin","sales"]},
    {id:"costsheet",lbl:"Cost Sheet",ic:"💰",roles:["admin"]},
    {id:"analytics",lbl:"Analytics",ic:"📊",roles:["admin"]},
  ].filter(n=>n.roles?.includes(userRole)||userRole==="viewer");

  return (
    <div className="crm">
      <div className="sb">
        <div className="sb-brand"><h2>Mayur CRM</h2><p>Packaging · Sales Ops</p></div>
        <div className="sb-nav">
          {navs.map(n=>(
            <div key={n.id} className={`ni ${view===n.id?"active":""}`} onClick={async()=>{
              setView(n.id); setQ("");
              if(["orders","reports","targets"].includes(n.id)&&!allOrdersLoaded){
                await loadAllOrders();
              }
              if(n.id==="pricing") await loadPricing();
              if(n.id==="production") await loadProduction();
            }}>
              <span style={{fontSize:15}}>{n.ic}</span><span>{n.lbl}</span>
              {n.badge?<span className={`nb ${n.bc||""}`}>{n.badge}</span>:null}
            </div>
          ))}
        </div>
        <div style={{padding:"10px 6px",borderTop:"1px solid var(--bdr)"}}>
          <div className="ni" onClick={load}><span style={{fontSize:14}}>🔄</span><span>Refresh</span></div>
          <div className="ni" onClick={onLogout}><span style={{fontSize:14}}>🚪</span><span>Logout</span></div>
        </div>
      </div>
      <div className="mn">
        <div className="tb">
          <div style={{flex:1}}>
            <div className="tb-title">{navs.find(n=>n.id===view)?.lbl||"Dashboard"}</div>
            <div className="tb-sub">👤 {currentUser?.name} · {isAdmin?"Admin":""}
              {isSales?" Sales":""}
              {isDataEntry?" Data Entry":""} · Mayur Food Packaging</div>
          </div>
          {urgN>0&&<div style={{display:"flex",alignItems:"center",gap:5,padding:"5px 12px",background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.2)",borderRadius:8,cursor:"pointer"}} onClick={()=>setView("followups")}><span style={{fontSize:11}}>⚡</span><span style={{fontSize:11.5,color:"#ef4444",fontWeight:800}}>{urgN} Urgent</span></div>}
          <button className="btn btn-o btn-sm" onClick={()=>{setForm({order_date:new Date().toISOString().split("T")[0],epr:false});setOrderItems([]);if(pxRows.length===0)loadPricing();setModal("aorder");}}>🧾 New Order</button>
          <button className="btn btn-p btn-sm" onClick={()=>{setForm({});setModal("ainter");}}><Plus size={13}/> Log Interaction</button>
        </div>
        <div className="content">
          {view==="dashboard"&&<Dash/>}
          {view==="exec"&&<ExecDash/>}
          {view==="customers"&&<Customers/>}
          {view==="enquiries"&&<Enquiries/>}
          {view==="followups"&&<Followups/>}
          {view==="samples"&&<Samples/>}
          {view==="payments"&&<Payments/>}
          {view==="products"&&<Products/>}
          {view==="orders"&&<Orders/>}
          {view==="reports"&&<Reports/>}
          {view==="targets"&&<Targets/>}
          {view==="pricing"&&<Pricing/>}
          {view==="production"&&isAdmin&&<Production/>}
          {view==="analytics"&&isAdmin&&<Analytics/>}
          {view==="planner"&&<Planner/>}
          {view==="pipeline"&&<Pipeline/>}
          {view==="forecast"&&<Forecast/>}
          {view==="sop"&&<SOP/>}
          {view==="daily"&&<DailyReport/>}
          {view==="calling"&&<CallingDashboard/>}
          {view==="stock"&&<StockMgmt/>}
          {view==="costsheet"&&<CostSheet/>}
        </div>
      </div>
      {renderModal()}
      {toast&&<div className={`toast ${toast.err?"err":""}`}>{toast.msg}</div>}

      {/* ── MOBILE BOTTOM NAV ── */}
      <div className="mobile-nav">
        {[
          {id:"dashboard",ic:"🏠",lbl:"Home",roles:["admin","sales","dataentry"]},
          {id:"orders",ic:"🧾",lbl:"Orders",badge:myORDERS.filter(o=>o.status==="draft").length||null,roles:["admin","sales","dataentry"]},
          {id:"customers",ic:"👥",lbl:"Parties",roles:["admin","sales","dataentry"]},
          {id:"followups",ic:"⚡",lbl:"Follow",badge:urgN||null,roles:["admin","sales","dataentry"]},
          isAdmin?{id:"pricing",ic:"💰",lbl:"Pricing",roles:["admin"]}:{id:"enquiries",ic:"📋",lbl:"Enquiry",roles:["admin","sales"]},
        ].filter(n=>n?.roles?.includes(userRole)).map(n=>(
          <div key={n.id} className={`mobile-nav-item ${view===n.id?"active":""}`}
            onClick={()=>{setView(n.id);setQ("");if(n.id==="orders"&&!allOrdersLoaded)loadAllOrders();if(n.id==="pricing")loadPricing();}}>
            <span>{n.ic}</span>
            <span>{n.lbl}</span>
            {n.badge?<span className="mobile-nav-badge">{n.badge}</span>:null}
          </div>
        ))}
      </div>
    </div>
  );
}
