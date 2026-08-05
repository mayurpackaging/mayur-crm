"use client";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Plus, Search, X, Eye, CheckCircle, Loader, Printer, Trash2, Edit } from "lucide-react";
import { sbFetch, sbGet, sbGetPay, sbGetProducts, sbGetOrders, sbGetAllOrders, sbGetOrderItems, sbGetTargets, sbInsert, sbPatch, sbDelete } from "../lib/supabase";

/* ─── HELPERS ─────────────────────────────────────── */
const fd  = s => s ? new Date(s).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"2-digit"}) : "—";
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
  const [pxSave,setPxSave] = useState(false);
  const [pxQ,setPxQ] = useState("");
  const [partyDiscount,setPartyDiscount] = useState(50); // default ₹50/ctn

  const toast$ = (msg,err=false) => { setToast({msg,err}); setTimeout(()=>setToast(null),2500); };
  const sf = (k,v) => setForm(p=>({...p,[k]:v}));
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
  const myC = isSales ? C.filter(c=>c.assigned_to===myName) : C;
  const myI = isSales ? I.filter(i=>i.done_by===myName||(i.customer_id&&myC.find(c=>c.id===i.customer_id))) : I;
  const myE = isSales ? E.filter(e=>e.assigned_to===myName) : E;
  const myS = isSales ? S.filter(s=>myC.find(c=>c.id===s.customer_id||c.company===s.company)) : S;
  // Follow-up filters — AFTER myI is defined
  const odFU = useMemo(()=>myI.filter(i=>i.next_follow_up&&isOD(i.next_follow_up)),[myI]);
  const tdFU = useMemo(()=>myI.filter(i=>i.next_follow_up&&isTD(i.next_follow_up)),[myI]);
  const urgN = odFU.length+tdFU.length;
  const prodCats = useMemo(()=>["all",...[...new Set(PRODS.map(p=>p.category).filter(Boolean))]], [PRODS]);

  const load = useCallback(async()=>{
    setLd(true);
    try {
      const [c,e,i,s,p,pr,o,t] = await Promise.all([
        sbGet("crm_customers"), sbGet("crm_enquiries"), sbGet("crm_interactions"),
        sbGet("crm_samples"), sbGetPay(), sbGetProducts(), sbGetOrders(), sbGetTargets()
      ]);
      setC(c||[]); setE(e||[]); setI(i||[]); setS(s||[]); setP(p||[]);
      setPRODS(pr||[]); setORDERS(o||[]); setTARGETS(t||[]);
      // Load sales users from crm_users
      try {
        const users = await sbFetch("crm_users?role=eq.sales&select=name&order=name.asc");
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
    try { const r=await sbInsert("crm_enquiries",{...form,customer_name:`${c?.name} / ${c?.company}`,status:form.status||"new",priority:form.priority||"medium"}); setE(p=>[r[0],...p]); toast$("Enquiry add ✓"); closeM(); }
    catch(e){ toast$(e.message,true); }
    setSv(false);
  };
  const saveInter = async(back=false) => {
    const cid=form.customer_id||selId;
    if(!cid||!form.note) return toast$("Customer aur Note required!",true);
    const c=gc(cid);
    setSv(true);
    try { const r=await sbInsert("crm_interactions",{...form,customer_id:cid,customer_name:c?.name,company:c?.company,type:form.type||"call"}); setI(p=>[r[0],...p]); toast$("Interaction save ✓"); if(back){setForm({});setModal("detail");}else closeM(); }
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
  const eprAmount  = useMemo(()=>form.epr?Math.round(orderTotal*0.01):0,[orderTotal,form.epr]);
  const gstAmount  = useMemo(()=>form.gst==="including"?0:Math.round(orderTotal*0.18),[orderTotal,form.gst]);

  const saveOrder = async() => {
    if(!form.customer_id) return toast$("Customer select karo",true);
    if(orderItems.length===0) return toast$("Koi item add nahi hai",true);
    const c=gc(form.customer_id);
    setSv(true);
    try {
      const totalCases=orderItems.reduce((s,i)=>s+(Number(i.qty_cases)||0),0);
      const orderData={customer_id:form.customer_id,customer_name:c?.name,company:c?.company,order_date:form.order_date||new Date().toISOString().split("T")[0],status:"draft",total_amount:orderTotal+eprAmount+(form.gst==="including"?0:gstAmount),total_cases:totalCases,payment_mode:form.payment_mode||"cash",epr_applied:!!form.epr,gst_type:form.gst||"excluding",notes:form.notes||"",created_by:currentUser?.name||""};
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
      setModal("proforma");
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

  const printProforma = () => {
    const win=window.open("","_blank");
    const subtotal=selOrder?.items?.reduce((s,i)=>s+(Number(i.amount)||0),0)||0;
    const epr=selOrder?.epr_applied?Math.round(subtotal*0.01):0;
    const gst=selOrder?.gst_type==="including"?0:Math.round(subtotal*0.18);
    win.document.write(`<html><head><title>Proforma - ${selOrder?.company}</title>
    <style>body{font-family:Arial,sans-serif;padding:24px;color:#000;}h2{text-align:center;margin-bottom:4px;}.sub{text-align:center;font-size:12px;margin-bottom:20px;color:#555;}.info{display:flex;justify-content:space-between;margin-bottom:16px;font-size:13px;}table{width:100%;border-collapse:collapse;font-size:12px;}th{background:#f59e0b;padding:8px;text-align:left;border:1px solid #ddd;}td{padding:7px 8px;border:1px solid #ddd;}.total{text-align:right;margin-top:12px;font-size:14px;}.footer{margin-top:30px;font-size:11px;color:#888;border-top:1px solid #ddd;padding-top:10px;}</style></head><body>
    <h2>Shreeja Packaging Industries Pvt. Ltd.</h2>
    <div class="sub">Mayur Food Packaging Products | Delhi<br/>PROFORMA INVOICE</div>
    <div class="info">
      <div><b>To:</b> ${selOrder?.company||""}<br/>${selOrder?.customer_name||""}${selOrder?.customerData?.phone?`<br/>📞 ${selOrder.customerData.phone}`:""}${selOrder?.customerData?.address?`<br/>📍 ${selOrder.customerData.address}`:""}${selOrder?.customerData?.gst_no?`<br/>GST: <b>${selOrder.customerData.gst_no}</b>`:""}</div>
      <div style="text-align:right"><b>Date:</b> ${fd(selOrder?.order_date)}<br/><b>Payment:</b> ${selOrder?.payment_mode?.replace("_"," ")||""}</div>
    </div>
    <table><thead><tr><th>#</th><th>SKU</th><th>Product</th><th>Packing</th><th>Cases</th><th>Price/Pcs (₹)</th><th>CTN Price (₹)</th><th>Amount (₹)</th></tr></thead>
    <tbody>${(selOrder?.items||[]).map((item,idx)=>`<tr><td>${idx+1}</td><td>${item.sku_code||""}</td><td>${item.product_name||""}</td><td>${item.packing||""}</td><td>${item.qty_cases||""}</td><td>${item.price_per_pcs||""}</td><td>${item.ctn_price||""}</td><td><b>₹${Number(item.amount||0).toLocaleString("en-IN")}</b></td></tr>`).join("")}</tbody></table>
    <div class="total">Subtotal: ₹${subtotal.toLocaleString("en-IN")}<br/>${epr>0?`EPR @1%: ₹${epr.toLocaleString("en-IN")}<br/>`:""}${gst>0?`GST @18%: ₹${gst.toLocaleString("en-IN")}<br/>`:""}
    <b>Total: ₹${(subtotal+epr+gst).toLocaleString("en-IN")}</b></div>
    ${selOrder?.notes?`<div style="margin-top:12px;font-size:12px;"><b>Notes:</b> ${selOrder.notes}</div>`:""}
    <div class="footer">Payment Terms: As agreed | Computer generated proforma invoice.</div>
    </body></html>`);
    win.document.close(); win.print();
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
        <div className="sr"><Search size={13} className="sr-ic"/><input className="inp" placeholder="Search customer..." value={q} onChange={e=>setQ(e.target.value)}/></div>
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
                      <button className="btn btn-o btn-sm" onClick={()=>openOrder(o)}><Printer size={11}/></button>
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
    const list = myC.filter(c=>cTab==="all"||c.type===cTab).filter(c=>!q||[c.name,c.company,c.city].some(v=>v?.toLowerCase().includes(q.toLowerCase())));
    return (
      <div>
        <div className="sh">
          <div><div className="sh-t">Customer Management</div><div className="sh-s">{myC.length} total</div></div>
          <div style={{display:"flex",gap:8}}>
            <button className="btn btn-o btn-sm" onClick={()=>{setForm({});setModal("ainter");}}>+ Log Interaction</button>
            <button className="btn btn-p" onClick={()=>{setForm({});setModal("acust");}}><Plus size={13}/> Add Customer</button>
          </div>
        </div>
        <div className="tabs">{[["all","All"],["enduser","End Users"],["nbd","NBD"]].map(([id,l])=><div key={id} className={`tab ${cTab===id?"a":""}`} onClick={()=>setCTab(id)}>{l}</div>)}</div>
        <div className="sr"><Search size={13} className="sr-ic"/><input className="inp" placeholder="Search..." value={q} onChange={e=>setQ(e.target.value)}/></div>
        {list.length===0?<div className="card empty"><p>Koi customer nahi</p></div>
          :<div className="card" style={{padding:0}}><div className="tw"><table>
            <thead><tr><th>Customer</th><th>Type</th><th>Segment</th><th>Assigned</th><th>Last Interaction</th><th>Last Word</th><th>Follow-up</th><th>Status</th><th></th></tr></thead>
            <tbody>{list.map(c=>{
              const li=gli(c.id);
              return <tr key={c.id} onClick={()=>openC(c.id)} style={{cursor:"pointer"}}>
                <td><div style={{display:"flex",gap:9,alignItems:"center"}}><Av name={c.name} size={30}/><div><div style={{fontWeight:700,fontSize:12.5}}>{c.name}</div><div style={{fontSize:10.5,color:"var(--mut)"}}>{c.company} · {c.city}</div></div></div></td>
                <td><span style={{fontSize:9.5,fontWeight:800,padding:"2px 8px",borderRadius:12,background:c.type==="crm"?"rgba(16,185,129,.1)":"rgba(59,130,246,.1)",color:c.type==="crm"?"#10b981":"#60a5fa"}}>{c.type?.toUpperCase()}</span></td>
                <td style={{fontSize:11,color:"var(--mut)"}}>{c.segment||"—"}</td>
                <td style={{fontSize:11.5}}>{c.assigned_to||"—"}</td>
                <td>{li?<div><span style={{color:TC[li.type],fontSize:11}}>{TI[li.type]} {li.type}</span><div style={{color:"var(--mut)",fontSize:9.5}}>{fd(li.created_at)}</div></div>:<span style={{color:"var(--mut)"}}>—</span>}</td>
                <td style={{maxWidth:150}}>{li?.note?<div style={{fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontStyle:"italic"}} title={li.note}>"{li.note}"</div>:<span style={{color:"var(--mut)"}}>—</span>}</td>
                <td>{li?.next_follow_up?<span style={{fontSize:10,fontWeight:800,color:isOD(li.next_follow_up)?"#ef4444":isTD(li.next_follow_up)?"#f59e0b":"#10b981"}}>{isOD(li.next_follow_up)?"🔴":isTD(li.next_follow_up)?"🟡":"🟢"} {fd(li.next_follow_up)}</span>:<span style={{color:"var(--mut)"}}>—</span>}</td>
                <td><Bdg s={c.status}/></td>
                <td><button className="btn btn-o btn-sm" onClick={ev=>{ev.stopPropagation();openC(c.id);}}><Eye size={11}/></button></td>
              </tr>;
            })}</tbody>
          </table></div></div>}
      </div>
    );
  };

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
        <div className="tabs">
          {[["sales","📈 Sales"],["party","🏢 Party-wise"],["top","🏆 Top 10"],["nbd","🎯 NBD"],["sp","👤 Salesperson"],["visit","📍 Visit Freq"]].map(([id,lbl])=>(
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
                <td><span style={{fontSize:9.5,fontWeight:800,padding:"2px 8px",borderRadius:12,background:c.type==="crm"?"rgba(16,185,129,.1)":"rgba(59,130,246,.1)",color:c.type==="crm"?"#10b981":"#60a5fa"}}>{c.type?.toUpperCase()}</span></td>
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
                    <span style={{fontSize:9.5,fontWeight:800,padding:"2px 8px",borderRadius:12,background:c.type==="crm"?"rgba(16,185,129,.1)":"rgba(59,130,246,.1)",color:c.type==="crm"?"#10b981":"#60a5fa"}}>{c.type?.toUpperCase()}</span>
                    {c.segment&&<span style={{fontSize:9.5,padding:"2px 8px",borderRadius:12,background:"var(--card2)",color:"var(--mut)",border:"1px solid var(--bdr)"}}>{c.segment}</span>}
                    {c.assigned_to&&<span style={{fontSize:9.5,padding:"2px 8px",borderRadius:12,background:"var(--card2)",color:"var(--mut)",border:"1px solid var(--bdr)"}}>👤 {c.assigned_to}</span>}
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
                      <div style={{display:"flex",justifyContent:"space-between"}}>
                        <span style={{fontSize:11,color:TC[i.type],fontWeight:700,textTransform:"capitalize"}}>{i.type}</span>
                        <span style={{fontSize:10,color:"var(--mut)"}}>{fd(i.created_at)} · {i.done_by}</span>
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
    const filtered=C.filter(c=>!sq||[c.name,c.company,c.city].some(v=>v?.toLowerCase().includes(sq.toLowerCase()))).slice(0,50);
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
    useEffect(()=>{setLocal(String(value??""));},[value]);
    return <input type="text" inputMode="numeric" className="inp" style={style} value={local} onClick={e=>e.target.select()} onChange={e=>setLocal(e.target.value)} onBlur={()=>{const n=parseFloat(local.replace(/[^0-9.]/g,""));onChange(isNaN(n)?0:n);}}/>;
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
            <input type="number" value={partyDiscount} onChange={e=>setPartyDiscount(Number(e.target.value))}
              style={{width:70,padding:"4px 8px",borderRadius:6,border:"1px solid var(--bdr)",textAlign:"center",fontWeight:700}}/>
            <span style={{fontSize:11,color:"var(--mut)"}}>₹/carton (auto-apply on add)</span>
          </div>
          <div className="g2" style={{gap:14}}>
            <div>
              <label className="lbl">Products Add Karo</label>
              <input className="inp" placeholder="SKU ya product search..." value={prodQ} onChange={e=>setProdQ(e.target.value)} style={{marginBottom:8}}/>
              <div style={{maxHeight:260,overflowY:"auto",border:"1px solid var(--bdr)",borderRadius:8}}>
                {filtProd.map(p=>(
                  <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",borderBottom:"1px solid var(--bdr)",fontSize:11.5}}>
                    <div><div style={{fontWeight:600}}>{p.name}</div><div style={{fontSize:10,color:"var(--mut)"}}>{p.sku_code} · ₹{p.ctn_price}/ctn</div></div>
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
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}><span style={{color:"var(--mut)"}}>Subtotal</span><span style={{fontWeight:600}}>₹{orderTotal.toLocaleString("en-IN")}</span></div>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:12,marginBottom:6,gap:12}}>
                      <label style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer",color:"var(--mut)"}}>
                        <input type="checkbox" checked={!!form.epr} onChange={e=>sf("epr",e.target.checked)} style={{accentColor:"var(--acc)",width:14,height:14}}/>EPR @1%
                      </label>
                      <span style={{fontWeight:600,color:form.epr?"var(--txt)":"var(--mut)"}}>₹{eprAmount.toLocaleString("en-IN")}</span>
                    </div>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:12,marginBottom:6}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{color:"var(--mut)"}}>GST @18%:</span>
                        <label style={{display:"flex",alignItems:"center",gap:4,cursor:"pointer"}}><input type="radio" name="gst" value="excluding" checked={form.gst!=="including"} onChange={()=>sf("gst","excluding")} style={{accentColor:"var(--acc)",width:14,height:14}}/><span style={{fontSize:11}}>Excluding</span></label>
                        <label style={{display:"flex",alignItems:"center",gap:4,cursor:"pointer"}}><input type="radio" name="gst" value="including" checked={form.gst==="including"} onChange={()=>sf("gst","including")} style={{accentColor:"var(--acc)",width:14,height:14}}/><span style={{fontSize:11}}>Including</span></label>
                      </div>
                      <span style={{fontWeight:600,color:form.gst!=="including"?"var(--txt)":"var(--mut)"}}>{form.gst==="including"?"(included)":"₹"+gstAmount.toLocaleString("en-IN")}</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:14,borderTop:"1px solid var(--bdr)",paddingTop:6}}><span style={{fontWeight:700}}>Total</span><span style={{fontWeight:800,color:"#10b981"}}>₹{(orderTotal+eprAmount+(form.gst==="including"?0:gstAmount)).toLocaleString("en-IN")}</span></div>
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
    const gst=selOrder.gst_type==="including"?0:Math.round(subtotal*0.18);
    return (
      <div className="ov" onClick={closeM}>
        <div className="mod mod-lg" onClick={e=>e.stopPropagation()}>
          <div className="mod-ttl">
            <span>📄 Proforma Invoice</span>
            <div style={{display:"flex",gap:8}}>
              <button className="btn btn-p btn-sm" onClick={printProforma}><Printer size={12}/> Print</button>
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
    if(modal==="aorder") return <OrderModal/>;
    if(modal==="proforma") return <ProformaModal/>;

    if(modal==="ainter-d") return (
      <div className="ov" onClick={()=>setModal("detail")}>
        <div className="mod mod-sm" onClick={e=>e.stopPropagation()}>
          <div className="mod-ttl">Add Interaction <button className="btn btn-o btn-sm" onClick={()=>setModal("detail")}><X size={13}/></button></div>
          <div className="fr"><label className="lbl">Type</label><select className="inp" value={form.type||"call"} onChange={e=>sf("type",e.target.value)}>{["call","visit","whatsapp","email","meeting"].map(t=><option key={t} value={t}>{TI[t]} {t}</option>)}</select></div>
          <div className="fr"><label className="lbl">Note *</label><textarea className="inp" value={form.note||""} onChange={e=>sf("note",e.target.value)}/></div>
          <div className="fr fr2">
            <div><label className="lbl">Follow-up Date</label><input type="date" className="inp" value={form.next_follow_up||""} onChange={e=>sf("next_follow_up",e.target.value)}/></div>
            <div><label className="lbl">Done By</label><input className="inp" value={form.done_by||""} onChange={e=>sf("done_by",e.target.value)}/></div>
          </div>
          <div className="fr"><label className="lbl">Follow-up Note</label><input className="inp" value={form.follow_up_note||""} onChange={e=>sf("follow_up_note",e.target.value)}/></div>
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
            <div><label className="lbl">Type</label><select className="inp" value={form.type||"nbd"} onChange={e=>sf("type",e.target.value)}><option value="nbd">NBD</option><option value="crm">CRM</option></select></div>
            <div><label className="lbl">Status</label><select className="inp" value={form.status||"prospect"} onChange={e=>sf("status",e.target.value)}><option value="prospect">Prospect</option><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
          </div>
          <div className="fr fr2"><div><label className="lbl">Segment</label><input className="inp" value={form.segment||""} onChange={e=>sf("segment",e.target.value)}/></div><div><label className="lbl">Assigned To</label><input className="inp" value={form.assigned_to||""} onChange={e=>sf("assigned_to",e.target.value)}/></div></div>
          <div className="fr fr2"><div><label className="lbl">GST No</label><input className="inp" placeholder="22AAAAA0000A1Z5" value={form.gst_no||""} onChange={e=>sf("gst_no",e.target.value.toUpperCase())}/></div><div><label className="lbl">Address</label><input className="inp" value={form.address||""} onChange={e=>sf("address",e.target.value)}/></div></div>
          <button className="btn btn-p" style={{width:"100%",justifyContent:"center",marginTop:8}} disabled={saving} onClick={async()=>{
            if(!form.name||!form.company) return toast$("Name aur Company required!",true);
            setSv(true);
            try {
              await sbPatch("crm_customers",form.id,{name:form.name,company:form.company,phone:form.phone,email:form.email,city:form.city,type:form.type,status:form.status,segment:form.segment,assigned_to:form.assigned_to,gst_no:form.gst_no,address:form.address});
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
            <div><label className="lbl">Type</label><select className="inp" value={form.type||"nbd"} onChange={e=>sf("type",e.target.value)}><option value="nbd">NBD (Prospect)</option><option value="crm">CRM (Existing)</option></select></div>
            <div><label className="lbl">Assigned To</label><input className="inp" value={form.assigned_to||""} onChange={e=>sf("assigned_to",e.target.value)}/></div>
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
          <div><label className="lbl">Type</label><select className="inp" value={form.type||"nbd"} onChange={e=>sf("type",e.target.value)}><option value="nbd">NBD</option><option value="crm">CRM</option></select></div>
          <div><label className="lbl">Status</label><select className="inp" value={form.status||"prospect"} onChange={e=>sf("status",e.target.value)}><option value="prospect">Prospect</option><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
        </div>
        <div className="fr fr2"><div><label className="lbl">Segment</label><input className="inp" value={form.segment||""} onChange={e=>sf("segment",e.target.value)}/></div><div><label className="lbl">Assigned To</label><input className="inp" value={form.assigned_to||""} onChange={e=>sf("assigned_to",e.target.value)}/></div></div>
        <div className="fr fr2"><div><label className="lbl">GST No</label><input className="inp" placeholder="22AAAAA0000A1Z5" value={form.gst_no||""} onChange={e=>sf("gst_no",e.target.value.toUpperCase())}/></div><div><label className="lbl">Address</label><input className="inp" value={form.address||""} onChange={e=>sf("address",e.target.value)}/></div></div>
      </>},
      aenq:{t:"New Enquiry",fn:saveEnq,f:<>
        <div className="fr"><label className="lbl">Customer *</label><CustomerSearch value={form.customer_id||""} onChange={v=>sf("customer_id",v)}/></div>
        <div className="fr fr2"><div><label className="lbl">Product *</label><input className="inp" value={form.product||""} onChange={e=>sf("product",e.target.value)}/></div><div><label className="lbl">Quantity</label><input className="inp" value={form.qty||""} onChange={e=>sf("qty",e.target.value)}/></div></div>
        <div className="fr fr3">
          <div><label className="lbl">Priority</label><select className="inp" value={form.priority||"medium"} onChange={e=>sf("priority",e.target.value)}><option value="high">🔥 High</option><option value="medium">⚡ Medium</option><option value="low">• Low</option></select></div>
          <div><label className="lbl">Status</label><select className="inp" value={form.status||"new"} onChange={e=>sf("status",e.target.value)}>{["new","quoted","negotiating","won","lost"].map(s=><option key={s} value={s}>{s}</option>)}</select></div>
          <div><label className="lbl">Assigned To</label><input className="inp" value={form.assigned_to||""} onChange={e=>sf("assigned_to",e.target.value)}/></div>
        </div>
      </>},
      ainter:{t:"Log Interaction",fn:()=>saveInter(false),f:<>
        <div className="fr"><label className="lbl">Customer *</label><CustomerSearch value={form.customer_id||""} onChange={v=>sf("customer_id",v)}/></div>
        <div className="fr"><label className="lbl">Type</label><select className="inp" value={form.type||"call"} onChange={e=>sf("type",e.target.value)}>{["call","visit","whatsapp","email","meeting"].map(t=><option key={t} value={t}>{TI[t]} {t}</option>)}</select></div>
        <div className="fr"><label className="lbl">Note *</label><textarea className="inp" value={form.note||""} onChange={e=>sf("note",e.target.value)}/></div>
        <div className="fr fr3">
          <div><label className="lbl">Follow-up Date</label><input type="date" className="inp" value={form.next_follow_up||""} onChange={e=>sf("next_follow_up",e.target.value)}/></div>
          <div><label className="lbl">Follow-up Note</label><input className="inp" value={form.follow_up_note||""} onChange={e=>sf("follow_up_note",e.target.value)}/></div>
          <div><label className="lbl">Done By</label><input className="inp" value={form.done_by||""} onChange={e=>sf("done_by",e.target.value)}/></div>
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
        <div className="mod" onClick={e=>e.stopPropagation()}>
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
    const FIXED=9800000;
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
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead>
                    <tr style={{background:"var(--card2)"}}>
                      <tr style={{background:"var(--card2)"}}>
                        <th style={{padding:"6px 8px",fontSize:10,color:"var(--mut)",textAlign:"left"}}>Product</th>
                        <th style={{padding:"6px 6px",fontSize:10,color:"var(--mut)"}}>Pcs</th>
                        <th style={{padding:"6px 6px",fontSize:10,color:"var(--mut)"}}>MH</th>
                        <th style={{padding:"6px 6px",fontSize:10,color:"var(--mut)"}}>T/hr</th>
                        <th style={{padding:"6px 6px",fontSize:10,color:"var(--mut)"}}>Eff Zone</th>
                        <th style={{padding:"6px 6px",fontSize:10,color:"#b71c1c",background:"#fff5f5"}}>M1 Floor</th>
                        <th style={{padding:"6px 6px",fontSize:10,color:"#b71c1c",background:"#fff5f5"}}>M1 Happy</th>
                        <th style={{padding:"6px 6px",fontSize:10,color:"#b71c1c",background:"#fff5f5"}}>M1 Zone</th>
                        <th style={{padding:"6px 4px",background:"#f0f0f0",width:4}}/>
                        <th style={{padding:"6px 6px",fontSize:10,color:"#1b5e20",background:"#f5fff5"}}>M2 Floor</th>
                        <th style={{padding:"6px 6px",fontSize:10,color:"#1b5e20",background:"#f5fff5"}}>M2 Happy</th>
                        <th style={{padding:"6px 6px",fontSize:10,color:"#1b5e20",background:"#f5fff5"}}>M2 Zone</th>
                        <th style={{padding:"6px 6px",fontSize:10,color:"var(--mut)"}}>Action</th>
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
                            <td style={{padding:"6px",textAlign:"center",fontSize:10,fontWeight:700,color:"#b71c1c",background:"#fff5f5"}}>₹{f1.m1floor}</td>
                            <td style={{padding:"6px",textAlign:"center",fontSize:10,color:"#b71c1c",background:"#fff5f5"}}>₹{f1.m1happy}</td>
                            <td style={{padding:"8px",textAlign:"center",background:"#fff5f5"}}>
                              <span style={{padding:"2px 8px",borderRadius:10,fontSize:10,fontWeight:700,
                                background:zc2(f1.m1zone).bg,color:zc2(f1.m1zone).c}}>
                                {zoneName(f1.m1zone)}
                              </span>
                            </td>
                            <td style={{padding:0,background:"#f0f0f0",width:6}}/>
                            <td style={{padding:"6px",textAlign:"center",fontSize:10,fontWeight:700,color:"#1b5e20",background:"#f5fff5"}}>₹{f1.m2floor}</td>
                            <td style={{padding:"6px",textAlign:"center",fontSize:10,color:"#1b5e20",background:"#f5fff5"}}>₹{f1.m2happy}</td>
                            <td style={{padding:"6px",textAlign:"center",background:"#f5fff5"}}>
                              <span style={{padding:"2px 6px",borderRadius:8,fontSize:9,fontWeight:700,
                                background:zc2(f1.m2zone).bg,color:zc2(f1.m2zone).c}}>
                                {f1.m2zone==="RED"?"LOSS":f1.m2zone==="N1"?"Floor":f1.m2zone==="N2"?"Happy":"Super"}
                              </span>
                            </td>
                          </>
                        ):(
                          <><td colSpan={7} style={{padding:"8px",textAlign:"center",color:"var(--mut)",fontSize:10}}>—</td></>
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
    const FIXED=9800000, ELEC_BILL=2452659, KG=164297, SCU=9660, HAPPY=5000000;
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
                    Floor = VarCosts + (Total Fixed ÷ 9660) × MH
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
                    Floor = VarCosts + Elec(₹/kg×kg) + (True Fixed ÷ 9660) × MH
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
                      <div style={{color:"#9fb3c0"}}>// Formula:</div>
                      <div>Throughput/ctn = List Price − Daana Cost</div>
                      <div>Total Throughput = Σ (Throughput/ctn × Cartons)</div>
                      <div>Machine Hours = Pieces ÷ (3600 ÷ Cycle × Cavities)</div>
                      <div style={{color:"#f59e0b"}}>T/hr = Total Throughput ÷ Total Machine Hours</div>
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
                    {/* Current stats */}
                    <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:14}}>
                      {[
                        ["List Price","₹"+wiItem.list_price,"#DDEEFF"],
                        ["Daana/ctn","₹"+Math.round(daana),"#E8F5E9"],
                        ["Margin/ctn","₹"+Math.round(wiItem.list_price-daana),"#FFF9C4"],
                        ["MH/ctn",curr.mh+"h","#F3E5F5"],
                        ["T/hr","₹"+curr.thr,"#FFE0E0"],
                      ].map(([l,v,bg])=>(
                        <div key={l} style={{background:bg,borderRadius:8,padding:10,textAlign:"center"}}>
                          <div style={{fontSize:9,color:"var(--mut)",marginBottom:3}}>{l}</div>
                          <div style={{fontSize:15,fontWeight:800}}>{v}</div>
                        </div>
                      ))}
                    </div>

                    {/* Current details */}
                    <div style={{background:"var(--card2)",borderRadius:8,padding:10,marginBottom:14,fontSize:11}}>
                      <b>Current:</b> Box {wiItem.box_cav} cav × {wiItem.box_cyc}s
                      {wiItem.lid_cav>0&&` | Lid ${wiItem.lid_cav} cav × ${wiItem.lid_cyc}s`}
                      {" | Zone: "}<span style={{fontWeight:700,color:({N3:"#10b981",N2:"#f59e0b",N1:"#f97316",RED:"#ef4444"})[curr.zone]}}>
                        {curr.zone==="N1"?"🟡 Floor":curr.zone==="N2"?"🟨 Happy":curr.zone==="N3"?"🟩 Super Happy":"🔴 LOSS"}
                      </span>
                    </div>

                    {/* Scenarios table */}
                    <div style={{fontWeight:600,fontSize:12,marginBottom:8}}>Agar ye change karein — T/hr kya hoga?</div>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                      <thead>
                        <tr style={{background:"var(--card2)"}}>
                          {["Scenario","Price","Box Cav","Box Cyc","Margin/ctn","T/hr","Zone","Gain vs Now"].map(h=>(
                            <th key={h} style={{padding:"8px",fontSize:10,color:"var(--mut)",textAlign:"center"}}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {scenarios.map((s,i)=>{
                          const res=calcThr(s.price,s.bcav,s.bcyc,s.lcav,s.lcyc);
                          const gain=res.thr-curr.thr;
                          const isBase=i===0;
                          return (
                            <tr key={i} style={{borderBottom:"1px solid var(--bdr)",
                              background:isBase?"var(--card2)":"transparent"}}>
                              <td style={{padding:"8px",fontWeight:isBase?700:400}}>
                                <div>{s.label}</div>
                                <div style={{fontSize:9,color:"var(--mut)"}}>{s.note}</div>
                              </td>
                              <td style={{padding:"8px",textAlign:"center",
                                color:s.price>wiItem.list_price?"#10b981":"inherit",fontWeight:s.price>wiItem.list_price?700:400}}>
                                ₹{s.price}
                              </td>
                              <td style={{padding:"8px",textAlign:"center",
                                color:s.bcav>wiItem.box_cav?"#10b981":"inherit",fontWeight:s.bcav>wiItem.box_cav?700:400}}>
                                {s.bcav}
                              </td>
                              <td style={{padding:"8px",textAlign:"center",
                                color:s.bcyc<wiItem.box_cyc?"#10b981":"inherit",fontWeight:s.bcyc<wiItem.box_cyc?700:400}}>
                                {s.bcyc}s
                              </td>
                              <td style={{padding:"8px",textAlign:"center"}}>₹{Math.round(s.price-daana)}</td>
                              <td style={{padding:"8px",textAlign:"center",fontWeight:700,fontSize:13,
                                color:({N3:"#10b981",N2:"#f59e0b",N1:"#f97316",RED:"#ef4444"})[res.zone]}}>
                                ₹{res.thr}
                              </td>
                              <td style={{padding:"8px",textAlign:"center"}}>
                                <span style={{padding:"2px 8px",borderRadius:8,fontSize:10,fontWeight:700,
                                  background:zc(res.zone).bg,color:zc(res.zone).c}}>
                                  {res.zone==="RED"?"🔴 LOSS":res.zone==="N1"?"🟡 Floor":res.zone==="N2"?"🟨 Happy":"🟩 Super Happy"}
                                </span>
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

  /* ── NAV ── */
  const navs = [
    {id:"dashboard",lbl:"Dashboard",ic:"🏠",roles:["admin","sales","dataentry"]},
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
