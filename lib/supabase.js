const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const sbFetch = async (path, opts = {}) => {
  const { method = "GET", body } = opts;
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  const t = await res.text();
  return t ? JSON.parse(t) : [];
};

export const sbGet         = (table) => sbFetch(`${table}?order=created_at.desc`);
export const sbGetPay      = ()      => sbFetch("crm_payments");
export const sbGetProducts = ()      => sbFetch("crm_products?order=category.asc,name.asc");
export const sbGetOrders   = ()      => sbFetch("crm_orders?order=order_date.desc,created_at.desc");
export const sbGetOrderItems = (oid) => sbFetch(`crm_order_items?order_id=eq.${oid}`);
export const sbInsert = (table, body)     => sbFetch(table, { method:"POST", body });
export const sbPatch  = (table, id, body) => sbFetch(`${table}?id=eq.${id}`, { method:"PATCH", body });
export const sbDelete = (table, id)       => sbFetch(`${table}?id=eq.${id}`, { method:"DELETE" });
