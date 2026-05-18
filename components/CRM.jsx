"use client";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Plus, Search, X, Eye, CheckCircle, Loader, Printer, Trash2, Edit } from "lucide-react";
import { sbGet, sbGetPay, sbGetProducts, sbGetOrders, sbGetOrderItems, sbInsert, sbPatch, sbDelete } from "../lib/supabase";

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

/* ─── MAIN ─────────────────────────────────────────── */
export default function CRM({ currentUser, onLogout }) {
  const [view,setView]   = useState("dashboard");
  const [C,setC]         = useState([]);
  const [E,setE]         = useState([]);
  const [I,setI]         = useState([]);
  const [S,setS]         = useState([]);
  const [P,setP]         = useState([]);
  const [PRODS,setPRODS] = useState([]);
  const [ORDERS,setORDERS] = useState([]);
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

  const toast$ = (msg,err=false) => { setToast({msg,err}); setTimeout(()=>setToast(null),2500); };
  const sf = (k,v) => setForm(p=>({...p,[k]:v}));
  const gc = id => C.find(c=>c.id===id);
  const gli= cid => I.filter(i=>i.customer_id===cid).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0];
  const gci= cid => I.filter(i=>i.customer_id===cid).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  const gcp= cid => P.find(p=>p.customer_id===cid);
  const gcs= cid => S.filter(s=>s.customer_id===cid);

  const odFU = useMemo(()=>I.filter(i=>i.next_follow_up&&isOD(i.next_follow_up)),[I]);
  const tdFU = useMemo(()=>I.filter(i=>i.next_follow_up&&isTD(i.next_follow_up)),[I]);
  const urgN = odFU.length+tdFU.length;
  const prodCats = useMemo(()=>["all",...[...new Set(PRODS.map(p=>p.category).filter(Boolean))]], [PRODS]);

  const load = useCallback(async()=>{
    setLd(true);
    try {
      const [c,e,i,s,p,pr,o] = await Promise.all([
        sbGet("crm_customers"), sbGet("crm_enquiries"), sbGet("crm_interactions"),
        sbGet("crm_samples"), sbGetPay(), sbGetProducts(), sbGetOrders()
      ]);
      setC(c||[]); setE(e||[]); setI(i||[]); setS(s||[]); setP(p||[]); setPRODS(pr||[]); setORDERS(o||[]);
    } catch(err){ toast$("Load failed: "+err.message,true); }
    setLd(false);
  },[]);

  useEffect(()=>{ load(); },[load]);

  const closeM = () => { setModal(null); setForm({}); setOrderItems([]); setEditProd(null); };
  const openC  = id => { setSelId(id); setModal("detail"); };

  /* ── CUSTOMER SAVES ── */
  const saveCust = async() => {
    if(!form.name||!form.company) return toast$("Name aur Company required!",true);
    setSv(true);
    try { const r=await sbInsert("crm_customers",{...form,type:form.type||"nbd",status:form.status||"prospect"}); setC(p=>[r[0],...p]); toast$("Customer add ✓"); closeM(); }
    catch(e){ toast$(e.message,true); }
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

  /* ── PRODUCT SAVE ── */
  const saveProd = async() => {
    if(!form.name||!form.category) return toast$("Name aur Category required!",true);
    setSv(true);
    try {
      if(editProd) {
        await sbPatch("crm_products",editProd.id,form);
        setPRODS(p=>p.map(x=>x.id===editProd.id?{...x,...form}:x));
        toast$("Product updated ✓");
      } else {
        const r=await sbInsert("crm_products",form);
        setPRODS(p=>[...p,r[0]]);
        toast$("Product add ✓");
      }
      closeM();
    } catch(e){ toast$(e.message,true); }
    setSv(false);
  };

  /* ── ORDER / PROFORMA ── */
  const addOrderItem = (prod) => {
    const exists = orderItems.find(i=>i.product_id===prod.id);
    if(exists) return toast$("Yeh item already add hai",true);
    setOrderItems(p=>[...p, {
      product_id: prod.id,
      sku_code: prod.sku_code,
      product_name: prod.name,
      packing: prod.packing,
      qty_cases: 1,
      price_per_pcs: prod.price_per_pcs||0,
      ctn_price: prod.ctn_price||0,
      discount: 0,
      amount: prod.ctn_price||0,
    }]);
  };
  const updOrderItem = (pid, k, v) => {
    setOrderItems(p=>p.map(i=>{
      if(i.product_id!==pid) return i;
      const updated = {...i,[k]:v};
      const base = (Number(updated.qty_cases)||0) * (Number(updated.ctn_price)||0);
      const disc = Number(updated.discount)||0;
      updated.amount = base - disc;
      return updated;
    }));
  };
  const removeOrderItem = (pid) => setOrderItems(p=>p.filter(i=>i.product_id!==pid));

  const orderTotal = useMemo(()=>orderItems.reduce((s,i)=>s+(Number(i.amount)||0),0),[orderItems]);
  const eprAmount  = useMemo(()=>form.epr ? Math.round(orderTotal*0.01) : 0,[orderTotal, form.epr]);
  const gstAmount  = useMemo(()=>form.gst==="including" ? 0 : Math.round(orderTotal*0.18),[orderTotal, form.gst]);

  const saveOrder = async() => {
    if(!form.customer_id) return toast$("Customer select karo",true);
    if(orderItems.length===0) return toast$("Koi item add nahi hai",true);
    const c=gc(form.customer_id);
    setSv(true);
    try {
      const orderData = {
        customer_id: form.customer_id,
        customer_name: c?.name,
        company: c?.company,
        order_date: form.order_date || new Date().toISOString().split("T")[0],
        status: "draft",
        total_amount: orderTotal + eprAmount + (form.gst==="including" ? 0 : gstAmount),
        payment_mode: form.payment_mode||"cash",
        epr_applied: !!form.epr,
        gst_type: form.gst||"excluding",
        notes: form.notes||"",
        created_by: currentUser?.name||"",
      };
      const orderRes = await sbInsert("crm_orders", orderData);
      const orderId = orderRes[0].id;
      const items = orderItems.map(i=>({...i, order_id: orderId}));
      await sbInsert("crm_order_items", items);
      setORDERS(p=>[{...orderData, id:orderId},...p]);
      toast$("Order/Proforma save ho gaya ✓");
      setSelOrder({...orderData, id:orderId, items});
      setModal("proforma");
    } catch(e){ toast$(e.message,true); }
    setSv(false);
  };

  const openOrder = async(order) => {
    try {
      const items = await sbGetOrderItems(order.id);
      setSelOrder({...order, items: items||[]});
      setModal("proforma");
    } catch(e){ toast$(e.message,true); }
  };

  const advanceOrder = async(order, nextStatus) => {
    const now = new Date().toISOString();
    const patch = { status: nextStatus };
    if(nextStatus==="confirmed")  { patch.confirmed_at  = now; patch.confirmed_by  = currentUser?.name||""; }
    if(nextStatus==="dispatched") { patch.dispatched_at = now; patch.dispatched_by = currentUser?.name||""; }
    if(nextStatus==="delivered")  { patch.delivered_at  = now; patch.delivered_by  = currentUser?.name||""; }
    try {
      await sbPatch("crm_orders", order.id, patch);
      setORDERS(p=>p.map(x=>x.id===order.id?{...x,...patch}:x));
      const msgs = {confirmed:"✅ Order Confirmed!",dispatched:"🚚 Dispatched!",delivered:"🎉 Delivered!"};
      toast$(msgs[nextStatus]||"Updated ✓");
    } catch(e){ toast$(e.message,true); }
  };

  const updOrderStatus = async(id,st) => {
    try {
      const patch = {status:st};
      await sbPatch("crm_orders",id,patch);
      setORDERS(p=>p.map(x=>x.id===id?{...x,...patch}:x));
      toast$("Status updated ✓");
    }
    catch(e){ toast$(e.message,true); }
  };

  const printProforma = () => {
    const win = window.open("","_blank");
    win.document.write(`
      <html><head><title>Proforma - ${selOrder?.company}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:24px;color:#000;}
        h2{text-align:center;margin-bottom:4px;}
        .sub{text-align:center;font-size:12px;margin-bottom:20px;color:#555;}
        .info{display:flex;justify-content:space-between;margin-bottom:16px;font-size:13px;}
        table{width:100%;border-collapse:collapse;font-size:12px;}
        th{background:#f59e0b;padding:8px;text-align:left;border:1px solid #ddd;}
        td{padding:7px 8px;border:1px solid #ddd;}
        .total{text-align:right;margin-top:12px;font-size:14px;}
        .total b{font-size:16px;}
        .footer{margin-top:30px;font-size:11px;color:#888;border-top:1px solid #ddd;padding-top:10px;}
      </style></head><body>
      <h2>Shreeja Packaging Industries Pvt. Ltd.</h2>
      <div class="sub">Mayur Food Packaging Products | Delhi<br/>PROFORMA INVOICE</div>
      <div class="info">
        <div><b>To:</b> ${selOrder?.company||""}<br/>${selOrder?.customer_name||""}</div>
        <div style="text-align:right"><b>Date:</b> ${fd(selOrder?.order_date)}<br/><b>Status:</b> ${selOrder?.status||"draft"}</div>
      </div>
      <table>
        <thead><tr><th>#</th><th>SKU</th><th>Product</th><th>Packing</th><th>Cases</th><th>Price/Pcs (₹)</th><th>CTN Price (₹)</th><th>Amount (₹)</th></tr></thead>
        <tbody>
          ${(selOrder?.items||[]).map((item,idx)=>`
            <tr>
              <td>${idx+1}</td>
              <td>${item.sku_code||""}</td>
              <td>${item.product_name||""}</td>
              <td>${item.packing||""}</td>
              <td>${item.qty_cases||""}</td>
              <td>${item.price_per_pcs||""}</td>
              <td>${item.ctn_price||""}</td>
              <td><b>₹${Number(item.amount||0).toLocaleString("en-IN")}</b></td>
            </tr>`).join("")}
        </tbody>
      </table>
      <div class="total">
        Subtotal: ₹${Number(selOrder?.items?.reduce((s,i)=>s+(Number(i.amount)||0),0)||0).toLocaleString("en-IN")}<br/>
        EPR @1%: ₹${Math.round((selOrder?.items?.reduce((s,i)=>s+(Number(i.amount)||0),0)||0)*0.01).toLocaleString("en-IN")}<br/>
        <b>Total: ₹${Number(selOrder?.total_amount||0).toLocaleString("en-IN")}</b>
      </div>
      ${selOrder?.notes?`<div style="margin-top:12px;font-size:12px;"><b>Notes:</b> ${selOrder.notes}</div>`:""}
      <div class="footer">Payment Terms: As agreed | This is a computer generated proforma invoice.</div>
      </body></html>`);
    win.document.close();
    win.print();
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
          {lbl:"CRM Customers",val:C.filter(c=>c.type==="crm").length,sub:"Active accounts",col:"#10b981",ic:"👥",fn:()=>{setCTab("crm");setView("customers");}},
          {lbl:"NBD Prospects",val:C.filter(c=>c.type==="nbd").length,sub:"In pipeline",col:"#60a5fa",ic:"🎯",fn:()=>{setCTab("nbd");setView("customers");}},
          {lbl:"Open Enquiries",val:E.filter(e=>!["won","lost"].includes(e.status)).length,sub:"Active leads",col:"#f59e0b",ic:"📋",fn:()=>setView("enquiries")},
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
            ? <div className="empty"><CheckCircle size={28} color="var(--ok)"/><p>Koi urgent nahi!</p></div>
            : [...odFU,...tdFU].slice(0,4).map(i=>(
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
          <div className="sh"><div><div className="sh-t">📋 Recent Orders</div></div><button className="btn btn-o btn-sm" onClick={()=>setView("orders")}>All →</button></div>
          {ORDERS.length===0?<div className="empty"><p>Koi order nahi</p></div>
            :[...ORDERS].sort((a,b)=>new Date(b.order_date)-new Date(a.order_date)).slice(0,5).map(o=>(
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
              const cfg=ST[st]; const cnt=S.filter(s=>s.status===st).length;
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

  /* ── PRODUCTS MODULE ── */
  const Products = () => {
    const list = PRODS.filter(p=>pCat==="all"||p.category===pCat).filter(p=>!q||[p.name,p.sku_code,p.category].some(v=>v?.toLowerCase().includes(q.toLowerCase())));
    return (
      <div>
        <div className="sh">
          <div><div className="sh-t">Product / SKU List</div><div className="sh-s">{PRODS.length} total SKUs</div></div>
          <button className="btn btn-p" onClick={()=>{setForm({});setEditProd(null);setModal("aprod");}}><Plus size={13}/> Add SKU</button>
        </div>
        <div className="tabs" style={{flexWrap:"wrap"}}>
          {prodCats.map(t=>(
            <div key={t} className={`tab ${pCat===t?"a":""}`} onClick={()=>setPCat(t)} style={{textTransform:"capitalize",fontSize:10.5}}>
              {t} ({t==="all"?PRODS.length:PRODS.filter(p=>p.category===t).length})
            </div>
          ))}
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
                <td>
                  <button className="btn btn-o btn-sm" onClick={()=>{setEditProd(p);setForm({...p});setModal("aprod");}}>
                    <Edit size={11}/>
                  </button>
                </td>
              </tr>
            ))}</tbody>
          </table></div></div>}
      </div>
    );
  };

  /* ── ORDERS / PROFORMA ── */
  const Orders = () => {
    const list = ORDERS.filter(o=>!q||[o.customer_name,o.company].some(v=>v?.toLowerCase().includes(q.toLowerCase())));
    const ts = (dt) => dt ? new Date(dt).toLocaleString("en-IN",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}) : null;

    const PipelineStep = ({done, label, by, at, col}) => (
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,minWidth:70}}>
        <div style={{width:22,height:22,borderRadius:"50%",background:done?col:"var(--bdr)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:done?"#fff":"var(--mut)",fontWeight:700,flexShrink:0}}>
          {done?"✓":""}
        </div>
        <div style={{fontSize:9,fontWeight:700,color:done?col:"var(--mut)",textTransform:"uppercase",letterSpacing:".05em"}}>{label}</div>
        {done && by && <div style={{fontSize:8.5,color:"var(--mut)",textAlign:"center"}}>{by}</div>}
        {done && at && <div style={{fontSize:8,color:"var(--mut)",textAlign:"center"}}>{ts(at)}</div>}
      </div>
    );

    const nextStep = (status) => {
      if(status==="draft") return {label:"Confirm",next:"confirmed",col:"#10b981"};
      if(status==="confirmed") return {label:"Dispatch",next:"dispatched",col:"#f59e0b"};
      if(status==="dispatched") return {label:"Delivered",next:"delivered",col:"#3b82f6"};
      return null;
    };

    return (
      <div>
        <div className="sh">
          <div><div className="sh-t">Orders & Proforma</div><div className="sh-s">{ORDERS.length} total</div></div>
          <button className="btn btn-p" onClick={()=>{setForm({order_date:new Date().toISOString().split("T")[0]});setOrderItems([]);setModal("aorder");}}><Plus size={13}/> New Order</button>
        </div>
        <div className="sr"><Search size={13} className="sr-ic"/><input className="inp" placeholder="Search customer..." value={q} onChange={e=>setQ(e.target.value)}/></div>
        {list.length===0
          ?<div className="card empty"><p>Koi order nahi</p></div>
          :<div style={{display:"flex",flexDirection:"column",gap:10}}>
            {list.map(o=>{
              const ns = nextStep(o.status);
              return (
                <div key={o.id} className="card" style={{padding:"14px 16px",borderLeft:`3px solid ${o.status==="delivered"?"#10b981":o.status==="dispatched"?"#f59e0b":o.status==="confirmed"?"#a78bfa":"var(--bdr)"}`}}>
                  {/* Header */}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:13.5}}>{o.company}</div>
                      <div style={{fontSize:10.5,color:"var(--mut)",marginTop:2}}>{fd(o.order_date)} · {o.created_by} · {o.payment_mode?.replace("_"," ")}</div>
                    {o.items_summary && <div style={{fontSize:11,color:"var(--txt)",marginTop:4,padding:"4px 8px",background:"var(--card2)",borderRadius:6,display:"inline-block"}}>{o.items_summary}</div>}
                    </div>
                    <div style={{display:"flex",gap:6,alignItems:"center"}}>
                      <div style={{fontSize:15,fontWeight:800,color:"#10b981"}}>{fr(o.total_amount)}</div>
                      <button className="btn btn-o btn-sm" onClick={()=>{setForm({...o});setOrderItems([]);setModal("editorder");}}>✏️</button>
                      <button className="btn btn-o btn-sm" onClick={()=>openOrder(o)}><Printer size={11}/></button>
                    </div>
                  </div>

                  {/* Pipeline */}
                  <div style={{display:"flex",alignItems:"flex-start",gap:0,marginBottom:12}}>
                    <PipelineStep done={true} label="Draft" by={o.created_by} at={o.order_date} col="#60a5fa"/>
                    <div style={{flex:1,height:2,background:["confirmed","dispatched","delivered"].includes(o.status)?"#a78bfa":"var(--bdr)",marginTop:10,alignSelf:"flex-start"}}/>
                    <PipelineStep done={!!o.confirmed_at||["confirmed","dispatched","delivered"].includes(o.status)} label="Confirmed" by={o.confirmed_by||""} at={o.confirmed_at} col="#a78bfa"/>
                    <div style={{flex:1,height:2,background:["dispatched","delivered"].includes(o.status)?"#f59e0b":"var(--bdr)",marginTop:10,alignSelf:"flex-start"}}/>
                    <PipelineStep done={!!o.dispatched_at||["dispatched","delivered"].includes(o.status)} label="Dispatched" by={o.dispatched_by||""} at={o.dispatched_at} col="#f59e0b"/>
                    <div style={{flex:1,height:2,background:o.status==="delivered"?"#10b981":"var(--bdr)",marginTop:10,alignSelf:"flex-start"}}/>
                    <PipelineStep done={o.status==="delivered"} label="Delivered" by={o.delivered_by||""} at={o.delivered_at} col="#10b981"/>
                  </div>

                  {/* Next action button */}
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    {ns && o.status!=="cancelled" && (
                      <button className="btn btn-sm" style={{background:`${ns.col}20`,border:`1px solid ${ns.col}40`,color:ns.col,fontWeight:700}} onClick={()=>advanceOrder(o,ns.next)}>
                        → {ns.label}
                      </button>
                    )}
                    {o.status==="delivered" && <span style={{fontSize:11,color:"var(--ok)",fontWeight:700}}>🎉 Order Complete</span>}
                    {o.status!=="cancelled"&&o.status!=="delivered" && (
                      <button className="btn btn-sm" style={{background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",color:"var(--err)",fontSize:10}} onClick={()=>updOrderStatus(o.id,"cancelled")}>✕ Cancel</button>
                    )}
                    {o.notes && <span style={{fontSize:10.5,color:"var(--mut)",marginLeft:"auto",maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"inline-block"}} title={o.notes}>📝 {o.notes.slice(0,40)}{o.notes.length>40?"...":""}</span>}
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
    const list = C.filter(c=>cTab==="all"||c.type===cTab).filter(c=>!q||[c.name,c.company,c.city].some(v=>v?.toLowerCase().includes(q.toLowerCase())));
    return (
      <div>
        <div className="sh">
          <div><div className="sh-t">Customer Management</div><div className="sh-s">{C.length} total</div></div>
          <div style={{display:"flex",gap:8}}>
            <button className="btn btn-o btn-sm" onClick={()=>{setForm({});setModal("ainter");}}>+ Log Interaction</button>
            <button className="btn btn-p" onClick={()=>{setForm({});setModal("acust");}}><Plus size={13}/> Add Customer</button>
          </div>
        </div>
        <div className="tabs">{[["all","All"],["crm","CRM"],["nbd","NBD"]].map(([id,l])=><div key={id} className={`tab ${cTab===id?"a":""}`} onClick={()=>setCTab(id)}>{l}</div>)}</div>
        <div className="sr"><Search size={13} className="sr-ic"/><input className="inp" placeholder="Search..." value={q} onChange={e=>setQ(e.target.value)}/></div>
        {list.length===0
          ?<div className="card empty"><p>Koi customer nahi</p></div>
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
    const list = E.filter(e=>eTab==="all"||e.status===eTab).filter(e=>!q||[e.customer_name,e.product].some(v=>v?.toLowerCase().includes(q.toLowerCase())));
    return (
      <div>
        <div className="sh"><div><div className="sh-t">Enquiry Pipeline</div><div className="sh-s">{E.filter(e=>!["won","lost"].includes(e.status)).length} active</div></div><button className="btn btn-p" onClick={()=>{setForm({});setModal("aenq");}}><Plus size={13}/> New</button></div>
        <div className="tabs">{["all","new","quoted","negotiating","won","lost"].map(t=><div key={t} className={`tab ${eTab===t?"a":""}`} onClick={()=>setETab(t)} style={{textTransform:"capitalize"}}>{t} ({E.filter(e=>t==="all"||e.status===t).length})</div>)}</div>
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
      const od=isOD(i.next_follow_up), td=isTD(i.next_follow_up);
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
    const all = I.filter(i=>i.next_follow_up).sort((a,b)=>new Date(a.next_follow_up)-new Date(b.next_follow_up));
    const flt = fn => all.filter(i=>fn(i.next_follow_up)&&(!q||i.customer_name?.toLowerCase().includes(q.toLowerCase())));
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
    const list = S.filter(s=>sTab==="all"||s.status===sTab).filter(s=>!q||[s.customer_name,s.company,s.product].some(v=>v?.toLowerCase().includes(q.toLowerCase())));
    return (
      <div>
        <div className="sh"><div><div className="sh-t">Sample Tracker</div><div className="sh-s">{S.filter(s=>["pending","sent"].includes(s.status)).length} pending</div></div><button className="btn btn-p" onClick={()=>{setForm({});setModal("asamp");}}><Plus size={13}/> Add</button></div>
        <div className="tabs">{["all","pending","sent","approved","revision","rejected"].map(t=><div key={t} className={`tab ${sTab===t?"a":""}`} onClick={()=>setSTb(t)} style={{textTransform:"capitalize"}}>{t} ({S.filter(s=>t==="all"||s.status===t).length})</div>)}</div>
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
    const list = P.filter(p=>!q||[p.customer_name,p.company].some(v=>v?.toLowerCase().includes(q.toLowerCase())));
    const totO = P.reduce((s,p)=>s+(Number(p.outstanding)||0),0);
    const totOD= P.reduce((s,p)=>s+(Number(p.overdue)||0),0);
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
                <button className="btn btn-o btn-sm" onClick={closeM}><X size={13}/></button>
              </div>
            </div>
          </div>
          <div className="g3" style={{marginBottom:14}}>
            {[{l:"📞 Phone",v:c.phone||"—"},{l:"📧 Email",v:c.email||"—"},{l:"📅 Since",v:fd(c.created_at)}].map(x=>(
              <div key={x.l} className="card2"><div style={{fontSize:9.5,color:"var(--mut)",marginBottom:3}}>{x.l}</div><div style={{fontSize:12.5,fontWeight:500}}>{x.v}</div></div>
            ))}
          </div>
          {li&&(
            <div className="lw">
              <div className="lw-lbl">💬 Last Word · {TI[li.type]} {li.type} · {fd(li.created_at)} · {li.done_by}</div>
              <div className="lw-note">"{li.note}"</div>
              {li.next_follow_up&&<div style={{marginTop:8,fontSize:11,color:isOD(li.next_follow_up)?"#ef4444":isTD(li.next_follow_up)?"#f59e0b":"#10b981",fontWeight:700}}>📌 {li.follow_up_note} · {fd(li.next_follow_up)}</div>}
            </div>
          )}
          {pay&&(
            <div className="card2" style={{marginBottom:14}}>
              <div style={{fontSize:10,fontWeight:800,color:"var(--mut)",textTransform:"uppercase",letterSpacing:".08em",marginBottom:10}}>💳 Payment</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
                {[{l:"Mode",v:pay.payment_mode?.replace("_"," ")},{l:"Credit Days",v:`${pay.credit_days||"—"} days`},{l:"Outstanding",v:fr(pay.outstanding)},{l:"Overdue",v:fr(pay.overdue),col:pay.overdue>0?"#ef4444":undefined}].map(p=>(
                  <div key={p.l} style={{textAlign:"center"}}><div style={{fontSize:9.5,color:"var(--mut)"}}>{p.l}</div><div style={{fontSize:13,fontWeight:700,color:p.col||"var(--txt)",marginTop:2,textTransform:"capitalize"}}>{p.v}</div></div>
                ))}
              </div>
            </div>
          )}
          {smpl.length>0&&(
            <div style={{marginBottom:14}}>
              <div style={{fontSize:10,fontWeight:800,color:"var(--mut)",textTransform:"uppercase",letterSpacing:".08em",marginBottom:8}}>🧪 Samples</div>
              {smpl.map(s=>(
                <div key={s.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:"var(--card2)",borderRadius:8,marginBottom:6,border:"1px solid var(--bdr)"}}>
                  <div><div style={{fontSize:12,fontWeight:600}}>{s.product}</div><div style={{fontSize:10,color:"var(--mut)"}}>{s.qty} · {fd(s.sent_date)}</div></div>
                  <Bdg s={s.status}/>
                </div>
              ))}
            </div>
          )}
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

  /* ── NUM INPUT — types freely, updates on blur ── */
  const NumInput = ({ value, onChange, style }) => {
    const [local, setLocal] = useState(String(value ?? ""));
    useEffect(() => { setLocal(String(value ?? "")); }, [value]);
    return (
      <input
        type="text"
        inputMode="numeric"
        className="inp"
        style={style}
        value={local}
        onClick={e => e.target.select()}
        onChange={e => setLocal(e.target.value)}
        onBlur={() => {
          const n = parseFloat(local.replace(/[^0-9.]/g, ""));
          onChange(isNaN(n) ? 0 : n);
        }}
      />
    );
  };

  /* ── ORDER CREATE MODAL ── */
  const OrderModal = () => {
    const [prodQ,setProdQ] = useState("");
    const filtProd = PRODS.filter(p=>!prodQ||[p.name,p.sku_code,p.category].some(v=>v?.toLowerCase().includes(prodQ.toLowerCase())));
    return (
      <div className="ov" onClick={closeM}>
        <div className="mod" style={{width:860,maxWidth:"96vw"}} onClick={e=>e.stopPropagation()}>
          <div className="mod-ttl">New Order / Proforma <button className="btn btn-o btn-sm" onClick={closeM}><X size={13}/></button></div>
          <div className="fr fr2" style={{marginBottom:16}}>
            <div><label className="lbl">Customer *</label>
              <select className="inp" value={form.customer_id||""} onChange={e=>sf("customer_id",e.target.value)}>
                <option value="">-- Select Customer --</option>
                {C.map(c=><option key={c.id} value={c.id}>{c.name} / {c.company}</option>)}
              </select>
            </div>
            <div><label className="lbl">Order Date</label>
              <input type="date" className="inp" value={form.order_date||""} onChange={e=>sf("order_date",e.target.value)}/>
            </div>
          </div>

          <div className="g2" style={{gap:14}}>
            {/* LEFT: product picker */}
            <div>
              <label className="lbl">Products Add Karo</label>
              <input className="inp" placeholder="SKU ya product search karo..." value={prodQ} onChange={e=>setProdQ(e.target.value)} style={{marginBottom:8}}/>
              <div style={{maxHeight:260,overflowY:"auto",border:"1px solid var(--bdr)",borderRadius:8}}>
                {filtProd.map(p=>(
                  <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",borderBottom:"1px solid var(--bdr)",fontSize:11.5}}>
                    <div>
                      <div style={{fontWeight:600}}>{p.name}</div>
                      <div style={{fontSize:10,color:"var(--mut)"}}>{p.sku_code} · ₹{p.ctn_price}/ctn</div>
                    </div>
                    <button className="btn btn-g btn-sm" onClick={()=>addOrderItem(p)}>+ Add</button>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT: order items */}
            <div>
              <label className="lbl">Order Items ({orderItems.length})</label>
              {orderItems.length===0
                ?<div className="empty" style={{padding:20,border:"1px solid var(--bdr)",borderRadius:8}}><p>Koi item nahi</p></div>
                :<div style={{border:"1px solid var(--bdr)",borderRadius:8,overflow:"hidden"}}>
                  {orderItems.map(item=>(
                    <div key={item.product_id} style={{padding:"8px 10px",borderBottom:"1px solid var(--bdr)",fontSize:11.5}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                        <div style={{fontWeight:600,fontSize:12}}>{item.product_name}</div>
                        <button style={{background:"none",border:"none",color:"var(--err)",cursor:"pointer"}} onClick={()=>removeOrderItem(item.product_id)}><Trash2 size={12}/></button>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6}}>
                        <div><div style={{fontSize:9,color:"var(--mut)",marginBottom:2}}>CASES</div>
                          <NumInput style={{padding:"4px 8px",fontSize:12}} value={item.qty_cases} onChange={v=>updOrderItem(item.product_id,"qty_cases",v)}/>
                        </div>
                        <div><div style={{fontSize:9,color:"var(--mut)",marginBottom:2}}>CTN PRICE (₹)</div>
                          <NumInput style={{padding:"4px 8px",fontSize:12}} value={item.ctn_price} onChange={v=>updOrderItem(item.product_id,"ctn_price",v)}/>
                        </div>
                        <div><div style={{fontSize:9,color:"var(--mut)",marginBottom:2}}>DISCOUNT (₹)</div>
                          <NumInput style={{padding:"4px 8px",fontSize:12}} value={item.discount||0} onChange={v=>updOrderItem(item.product_id,"discount",v)}/>
                        </div>
                        <div><div style={{fontSize:9,color:"var(--mut)",marginBottom:2}}>AMOUNT</div>
                          <div style={{fontSize:13,fontWeight:800,color:"#10b981",paddingTop:6}}>₹{Number(item.amount||0).toLocaleString("en-IN")}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {/* Totals */}
                  <div style={{padding:"10px 12px",background:"var(--card2)"}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}><span style={{color:"var(--mut)"}}>Subtotal</span><span style={{fontWeight:600}}>₹{orderTotal.toLocaleString("en-IN")}</span></div>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:12,marginBottom:6,gap:12}}>
                      <label style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer",color:"var(--mut)"}}>
                        <input type="checkbox" checked={!!form.epr} onChange={e=>sf("epr",e.target.checked)} style={{accentColor:"var(--acc)",width:14,height:14}}/>
                        EPR @1%
                      </label>
                      <span style={{fontWeight:600,color:form.epr?"var(--txt)":"var(--mut)"}}>₹{eprAmount.toLocaleString("en-IN")}</span>
                    </div>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:12,marginBottom:6}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{color:"var(--mut)"}}>GST @18%:</span>
                        <label style={{display:"flex",alignItems:"center",gap:4,cursor:"pointer"}}>
                          <input type="radio" name="gst" value="excluding" checked={form.gst!=="including"} onChange={()=>sf("gst","excluding")} style={{accentColor:"var(--acc)",width:14,height:14}}/>
                          <span style={{fontSize:11}}>Excluding</span>
                        </label>
                        <label style={{display:"flex",alignItems:"center",gap:4,cursor:"pointer"}}>
                          <input type="radio" name="gst" value="including" checked={form.gst==="including"} onChange={()=>sf("gst","including")} style={{accentColor:"var(--acc)",width:14,height:14}}/>
                          <span style={{fontSize:11}}>Including</span>
                        </label>
                      </div>
                      <span style={{fontWeight:600,color:form.gst!=="including"?"var(--txt)":"var(--mut)"}}>
                        {form.gst==="including"?"(included)":"₹"+gstAmount.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:14,borderTop:"1px solid var(--bdr)",paddingTop:6}}><span style={{fontWeight:700}}>Total</span><span style={{fontWeight:800,color:"#10b981"}}>₹{(orderTotal+eprAmount+(form.gst==="including"?0:gstAmount)).toLocaleString("en-IN")}</span></div>
                  </div>
                </div>}
            </div>
          </div>

          <div className="fr fr2" style={{marginTop:12}}>
            <div>
              <label className="lbl">Payment Mode</label>
              <select className="inp" value={form.payment_mode||"cash"} onChange={e=>sf("payment_mode",e.target.value)}>
                <option value="cash">💵 Cash</option>
                <option value="credit">🏦 Credit</option>
                <option value="bank_transfer">↗ Bank Transfer</option>
                <option value="cheque">📝 Cheque</option>
              </select>
            </div>
            <div>
              <label className="lbl">Notes</label>
              <textarea className="inp" placeholder="Delivery notes..." defaultValue={form.notes||""} onBlur={e=>sf("notes",e.target.value)} style={{minHeight:38,resize:"none"}}/>
            </div>
          </div>

          <button className="btn btn-p" style={{width:"100%",justifyContent:"center",marginTop:8,fontSize:13}} disabled={saving} onClick={saveOrder}>
            {saving?<Spin/>:"💾 Save & View Proforma"}
          </button>
        </div>
      </div>
    );
  };

  /* ── PROFORMA VIEW ── */
  const ProformaModal = () => {
    if(!selOrder) return null;
    const subtotal = selOrder.items?.reduce((s,i)=>s+(Number(i.amount)||0),0)||0;
    const epr = selOrder.epr_applied ? Math.round(subtotal*0.01) : 0;
    const gst = selOrder.gst_type==="including" ? 0 : Math.round(subtotal*0.18);
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

          {/* Header */}
          <div style={{textAlign:"center",marginBottom:18,paddingBottom:14,borderBottom:"1px solid var(--bdr)"}}>
            <div style={{fontFamily:"'Sora',sans-serif",fontSize:18,fontWeight:700,color:"var(--acc)"}}>Shreeja Packaging Industries Pvt. Ltd.</div>
            <div style={{fontSize:11,color:"var(--mut)",marginTop:4}}>Mayur Food Packaging Products | Delhi</div>
          </div>

          {/* Party + Date */}
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}>
            <div className="card2" style={{flex:1,marginRight:12}}>
              <div style={{fontSize:9.5,color:"var(--mut)",marginBottom:4}}>BILL TO</div>
              <div style={{fontSize:14,fontWeight:700}}>{selOrder.company}</div>
              <div style={{fontSize:12,color:"var(--mut)"}}>{selOrder.customer_name}</div>
            </div>
            <div className="card2" style={{minWidth:200}}>
              <div style={{fontSize:9.5,color:"var(--mut)",marginBottom:4}}>ORDER DATE</div>
              <div style={{fontSize:14,fontWeight:700,marginBottom:6}}>{fd(selOrder.order_date)}</div>
              <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                <Bdg s={selOrder.status}/>
                {selOrder.payment_mode && <span style={{fontSize:9.5,fontWeight:700,padding:"2px 8px",borderRadius:12,background:"rgba(59,130,246,.1)",color:"#60a5fa",textTransform:"capitalize"}}>{selOrder.payment_mode?.replace("_"," ")}</span>}
              </div>
              {selOrder.status==="delivered"&&selOrder.delivered_at&&(
                <div style={{fontSize:10,color:"var(--ok)",marginTop:6,fontWeight:600}}>
                  ✅ Delivered: {new Date(selOrder.delivered_at).toLocaleString("en-IN",{day:"2-digit",month:"short",year:"2-digit",hour:"2-digit",minute:"2-digit"})}
                </div>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="tw" style={{marginBottom:14}}>
            <table>
              <thead><tr><th>#</th><th>SKU</th><th>Product</th><th>Packing</th><th>Cases</th><th>Price/Pcs</th><th>CTN Price</th><th>Disc%</th><th>Amount</th></tr></thead>
              <tbody>
                {(selOrder.items||[]).map((item,idx)=>(
                  <tr key={idx}>
                    <td style={{fontSize:11}}>{idx+1}</td>
                    <td><span style={{fontSize:9.5,background:"rgba(245,158,11,.1)",color:"var(--acc)",padding:"2px 6px",borderRadius:4,fontWeight:700}}>{item.sku_code}</span></td>
                    <td style={{fontWeight:600,fontSize:12}}>{item.product_name}</td>
                    <td style={{textAlign:"center",fontSize:11}}>{item.packing}</td>
                    <td style={{textAlign:"center",fontWeight:700}}>{item.qty_cases}</td>
                    <td style={{fontSize:11}}>₹{item.price_per_pcs}</td>
                    <td style={{fontSize:11}}>₹{item.ctn_price}</td>
                    <td style={{fontSize:11,textAlign:"center"}}>{item.discount||0}%</td>
                    <td style={{fontWeight:800,color:"#10b981"}}>₹{Number(item.amount||0).toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div style={{display:"flex",justifyContent:"flex-end"}}>
            <div style={{width:240}}>
              <div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",fontSize:12,borderBottom:"1px solid var(--bdr)"}}><span style={{color:"var(--mut)"}}>Subtotal</span><span style={{fontWeight:600}}>₹{subtotal.toLocaleString("en-IN")}</span></div>
              {selOrder.epr_applied && <div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",fontSize:12,borderBottom:"1px solid var(--bdr)"}}><span style={{color:"var(--mut)"}}>EPR @1%</span><span style={{fontWeight:600}}>₹{epr.toLocaleString("en-IN")}</span></div>}
              <div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",fontSize:12,borderBottom:"1px solid var(--bdr)"}}><span style={{color:"var(--mut)"}}>GST @18% ({selOrder.gst_type==="including"?"Incl.":"Excl."})</span><span style={{fontWeight:600}}>{selOrder.gst_type==="including"?"Included":"₹"+gst.toLocaleString("en-IN")}</span></div>
              <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0",fontSize:15}}><span style={{fontWeight:700}}>Total</span><span style={{fontWeight:800,color:"#10b981",fontFamily:"'Sora',sans-serif"}}>₹{(subtotal+epr+gst).toLocaleString("en-IN")}</span></div>
              {selOrder.payment_mode && <div style={{fontSize:11,color:"var(--mut)",marginTop:4}}>Payment: <span style={{color:"var(--txt)",fontWeight:600,textTransform:"capitalize"}}>{selOrder.payment_mode?.replace("_"," ")}</span></div>}
              <div style={{fontSize:11,color:"var(--mut)",marginTop:2}}>GST: <span style={{color:"var(--txt)",fontWeight:600,textTransform:"capitalize"}}>{selOrder.gst_type||"Excluding"}</span></div>
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
    if(modal==="detail")   return <Detail/>;
    if(modal==="aorder")   return <OrderModal/>;
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
            <div><label className="lbl">Category *</label><input className="inp" placeholder="Round Container..." value={form.category||""} onChange={e=>sf("category",e.target.value)}/></div>
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

    if(modal==="editorder") return (
      <div className="ov" onClick={closeM}>
        <div className="mod mod-sm" onClick={e=>e.stopPropagation()}>
          <div className="mod-ttl">Edit Order <button className="btn btn-o btn-sm" onClick={closeM}><X size={13}/></button></div>
          <div className="fr"><label className="lbl">Customer</label><input className="inp" value={form.company||""} disabled style={{opacity:.6}}/></div>
          <div className="fr fr2">
            <div><label className="lbl">Order Date</label><input type="date" className="inp" value={form.order_date||""} onChange={e=>sf("order_date",e.target.value)}/></div>
            <div><label className="lbl">Payment Mode</label>
              <select className="inp" value={form.payment_mode||"cash"} onChange={e=>sf("payment_mode",e.target.value)}>
                <option value="cash">💵 Cash</option>
                <option value="credit">🏦 Credit</option>
                <option value="bank_transfer">↗ Bank Transfer</option>
                <option value="cheque">📝 Cheque</option>
              </select>
            </div>
          </div>
          <div className="fr fr2">
            <div><label className="lbl">Total Amount (₹)</label><input type="number" className="inp" value={form.total_amount||""} onChange={e=>sf("total_amount",Number(e.target.value))}/></div>
            <div><label className="lbl">Status</label>
              <select className="inp" value={form.status||"draft"} onChange={e=>sf("status",e.target.value)}>
                {["draft","confirmed","dispatched","delivered","cancelled"].map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="fr"><label className="lbl">Notes</label><textarea className="inp" defaultValue={form.notes||""} onBlur={e=>sf("notes",e.target.value)} style={{minHeight:50,resize:"none"}}/></div>
          <button className="btn btn-p" style={{width:"100%",justifyContent:"center",marginTop:6}} disabled={saving} onClick={async()=>{
            setSv(true);
            try {
              await sbPatch("crm_orders",form.id,{order_date:form.order_date,payment_mode:form.payment_mode,total_amount:form.total_amount,status:form.status,notes:form.notes});
              setORDERS(p=>p.map(x=>x.id===form.id?{...x,...form}:x));
              toast$("Order updated ✓"); closeM();
            } catch(e){ toast$(e.message,true); }
            setSv(false);
          }}>{saving?<Spin/>:"Save"}</button>
        </div>
      </div>
    );

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
      </>},
      aenq:{t:"New Enquiry",fn:saveEnq,f:<>
        <div className="fr"><label className="lbl">Customer *</label><select className="inp" value={form.customer_id||""} onChange={e=>sf("customer_id",e.target.value)}><option value="">-- Select --</option>{C.map(c=><option key={c.id} value={c.id}>{c.name} / {c.company}</option>)}</select></div>
        <div className="fr fr2"><div><label className="lbl">Product *</label><input className="inp" value={form.product||""} onChange={e=>sf("product",e.target.value)}/></div><div><label className="lbl">Quantity</label><input className="inp" value={form.qty||""} onChange={e=>sf("qty",e.target.value)}/></div></div>
        <div className="fr fr3">
          <div><label className="lbl">Priority</label><select className="inp" value={form.priority||"medium"} onChange={e=>sf("priority",e.target.value)}><option value="high">🔥 High</option><option value="medium">⚡ Medium</option><option value="low">• Low</option></select></div>
          <div><label className="lbl">Status</label><select className="inp" value={form.status||"new"} onChange={e=>sf("status",e.target.value)}>{["new","quoted","negotiating","won","lost"].map(s=><option key={s} value={s}>{s}</option>)}</select></div>
          <div><label className="lbl">Assigned To</label><input className="inp" value={form.assigned_to||""} onChange={e=>sf("assigned_to",e.target.value)}/></div>
        </div>
      </>},
      ainter:{t:"Log Interaction",fn:()=>saveInter(false),f:<>
        <div className="fr"><label className="lbl">Customer *</label><select className="inp" value={form.customer_id||""} onChange={e=>sf("customer_id",e.target.value)}><option value="">-- Select --</option>{C.map(c=><option key={c.id} value={c.id}>{c.name} / {c.company}</option>)}</select></div>
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
        <div className="fr"><label className="lbl">Customer *</label><select className="inp" value={form.customer_id||""} onChange={e=>sf("customer_id",e.target.value)}><option value="">-- Select --</option>{C.map(c=><option key={c.id} value={c.id}>{c.name} / {c.company}</option>)}</select></div>
        <div className="fr fr2"><div><label className="lbl">Product *</label><input className="inp" value={form.product||""} onChange={e=>sf("product",e.target.value)}/></div><div><label className="lbl">Qty</label><input className="inp" value={form.qty||""} onChange={e=>sf("qty",e.target.value)}/></div></div>
        <div className="fr fr3">
          <div><label className="lbl">Sent Date</label><input type="date" className="inp" value={form.sent_date||""} onChange={e=>sf("sent_date",e.target.value)}/></div>
          <div><label className="lbl">Status</label><select className="inp" value={form.status||"pending"} onChange={e=>sf("status",e.target.value)}>{["pending","sent","approved","revision","rejected"].map(s=><option key={s} value={s}>{s}</option>)}</select></div>
          <div><label className="lbl">Remarks</label><input className="inp" value={form.remarks||""} onChange={e=>sf("remarks",e.target.value)}/></div>
        </div>
      </>},
      apay:{t:"Payment Structure",fn:savePay,f:<>
        <div className="fr"><label className="lbl">Customer *</label><select className="inp" value={form.customer_id||""} onChange={e=>{sf("customer_id",e.target.value);const p=gcp(e.target.value);if(p)setForm({...p,customer_id:e.target.value});}}><option value="">-- Select --</option>{C.map(c=><option key={c.id} value={c.id}>{c.name} / {c.company}</option>)}</select></div>
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

  /* ── NAV ── */
  const navs = [
    {id:"dashboard",lbl:"Dashboard",ic:"🏠"},
    {id:"customers",lbl:"Customers",ic:"👥"},
    {id:"enquiries",lbl:"Enquiries",ic:"📋"},
    {id:"followups",lbl:"Follow-ups",ic:"⚡",badge:urgN>0?urgN:null},
    {id:"samples",lbl:"Samples",ic:"🧪",badge:S.filter(s=>s.status==="pending").length||null,bc:"info"},
    {id:"payments",lbl:"Payments",ic:"💳",badge:P.filter(p=>p.overdue>0).length||null},
    {id:"products",lbl:"Products",ic:"📦"},
    {id:"orders",lbl:"Orders",ic:"🧾",badge:ORDERS.filter(o=>o.status==="draft").length||null,bc:"info"},
  ];

  return (
    <div className="crm">
      <div className="sb">
        <div className="sb-brand"><h2>Mayur CRM</h2><p>Packaging · Sales Ops</p></div>
        <div className="sb-nav">
          {navs.map(n=>(
            <div key={n.id} className={`ni ${view===n.id?"active":""}`} onClick={()=>{setView(n.id);setQ("");}}>
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
            <div className="tb-sub">👤 {currentUser?.name} · Mayur Food Packaging</div>
          </div>
          {urgN>0&&<div style={{display:"flex",alignItems:"center",gap:5,padding:"5px 12px",background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.2)",borderRadius:8,cursor:"pointer"}} onClick={()=>setView("followups")}><span style={{fontSize:11}}>⚡</span><span style={{fontSize:11.5,color:"#ef4444",fontWeight:800}}>{urgN} Urgent</span></div>}
          <button className="btn btn-o btn-sm" onClick={()=>{setForm({order_date:new Date().toISOString().split("T")[0]});setOrderItems([]);setModal("aorder");}}>🧾 New Order</button>
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
        </div>
      </div>
      {renderModal()}
      {toast&&<div className={`toast ${toast.err?"err":""}`}>{toast.msg}</div>}
    </div>
  );
}
