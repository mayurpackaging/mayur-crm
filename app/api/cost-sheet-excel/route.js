// src/app/api/cost-sheet-excel/route.js
// Generates detailed Excel cost sheet from CRM data

export async function POST(request) {
  try {
    const { homo, cp, random, items } = await request.json();

    // Build CSV with detailed breakdown (Excel-compatible)
    const lines = [];

    // Title
    lines.push(`"MAYUR FOOD PACKAGING — DETAILED COST SHEET"`);
    lines.push(`"Daana Prices: Homo ₹${homo}/kg | CP ₹${cp}/kg | Random ₹${random}/kg | Generated: ${new Date().toLocaleDateString('en-IN')}"`);
    lines.push('');

    // Headers - detailed
    lines.push([
      "#","Item Name","CRM Name","Colour","Pcs/CTN",
      "Homo g/pc","CP g/pc","Rand g/pc",
      "Homo Cost ₹","CP Cost ₹","Rand Cost ₹",
      "Total Daana ₹","Base Daana ₹","Daana Change ₹",
      "Carton ₹","Fixed Cost ₹","MH/CTN","N1 Zone ₹/hr","N3 Zone ₹/hr",
      "Total Cost ₹","List Price ₹",
      "Floor N1 ₹","Happy N3 ₹",
      "Zone","Margin %"
    ].map(h => `"${h}"`).join(','));

    // Data rows
    items.forEach((item, i) => {
      lines.push([
        i+1,
        `"${item.item_name}"`,
        `"${item.crm_name}"`,
        `"${item.colour}"`,
        item.pcs,
        item.homo_g.toFixed(3),
        item.cp_g.toFixed(3),
        item.rand_g.toFixed(3),
        item.homo_cost,
        item.cp_cost,
        item.rand_cost,
        item.daana,
        item.base_daana,
        item.daana - item.base_daana,
        item.carton,
        item.fixed,
        item.mh.toFixed(4),
        item.n1_zone,
        item.n3_zone,
        item.total_cost,
        item.list_price,
        item.floor_n1,
        item.happy_n3,
        `"${item.zone}"`,
        item.margin + "%"
      ].join(','));
    });

    // Summary
    lines.push('');
    lines.push(`"FORMULA: New Floor N1 = New Daana + Carton + (N1_Zone × MH/CTN)"`);
    lines.push(`"New Daana = (homo_g/1000 × pcs × homo_price) + (cp_g/1000 × pcs × cp_price) + (rand_g/1000 × pcs × rand_price)"`);

    const csv = lines.join('\n');

    // Return as CSV (Excel opens it directly)
    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="Mayur_Cost_Sheet.csv"`,
      }
    });

  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
