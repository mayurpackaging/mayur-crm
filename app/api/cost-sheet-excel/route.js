// src/app/api/cost-sheet-excel/route.js
export async function POST(request) {
  try {
    const { homo, cp, random, items } = await request.json();

    // Build proper HTML table that Excel can open directly
    const date = new Date().toLocaleDateString('en-IN');
    
    const rows = items.map((item, i) => {
      const zoneColor = item.zone.includes("N3") ? "#d5f5e3" 
                      : item.zone.includes("N1 Zone") ? "#fff2cc" 
                      : "#ffd7d7";
      const zoneText = item.zone.includes("N3") ? "#006600" 
                     : item.zone.includes("N1") ? "#806000" 
                     : "#cc0000";
      return `<tr>
        <td>${i+1}</td>
        <td>${item.item_name}</td>
        <td>${item.crm_name}</td>
        <td>${item.colour}</td>
        <td style="text-align:center">${item.pcs}</td>
        <td style="text-align:center">${item.homo_g.toFixed(3)}</td>
        <td style="text-align:center">${item.cp_g.toFixed(3)}</td>
        <td style="text-align:center">${item.rand_g.toFixed(3)}</td>
        <td style="text-align:right">${item.homo_cost}</td>
        <td style="text-align:right">${item.cp_cost}</td>
        <td style="text-align:right">${item.rand_cost}</td>
        <td style="text-align:right;font-weight:bold;background:#FDEDEC">${item.daana}</td>
        <td style="text-align:right;color:#888">${item.base_daana}</td>
        <td style="text-align:right;color:${item.daana > item.base_daana ? '#cc0000' : '#006600'}">${item.daana - item.base_daana > 0 ? '+' : ''}${item.daana - item.base_daana}</td>
        <td style="text-align:right">${item.carton}</td>
        <td style="text-align:right;background:#FEF9E7">${item.fixed}</td>
        <td style="text-align:center">${item.mh.toFixed(4)}</td>
        <td style="text-align:center">${item.n1_zone}</td>
        <td style="text-align:center">${item.n3_zone}</td>
        <td style="text-align:right;font-weight:bold;background:#D6EAF8">${item.total_cost}</td>
        <td style="text-align:right;color:#0000ff;font-weight:bold">${item.list_price}</td>
        <td style="text-align:right;font-weight:bold;background:#FFD7D7;color:#cc0000">${item.floor_n1}</td>
        <td style="text-align:right;font-weight:bold;background:#E2EFDA;color:#006600">${item.happy_n3}</td>
        <td style="text-align:center;background:${zoneColor};color:${zoneText};font-weight:bold">${item.zone}</td>
        <td style="text-align:center;font-weight:bold;color:${item.margin < 0 ? '#cc0000' : '#006600'}">${item.margin}%</td>
      </tr>`;
    }).join('\n');

    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" 
xmlns:x="urn:schemas-microsoft-com:office:excel" 
xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="UTF-8">
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>Cost Sheet</x:Name>
<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
<style>
  body { font-family: Arial; font-size: 10pt; }
  table { border-collapse: collapse; width: 100%; }
  th { background: #1E3A5F; color: white; padding: 6px 8px; font-size: 9pt; border: 1px solid #ccc; text-align: center; }
  td { padding: 4px 6px; border: 1px solid #ddd; font-size: 9pt; }
  .title { font-size: 14pt; font-weight: bold; color: #1E3A5F; }
  .info { font-size: 9pt; color: #888; }
</style>
</head>
<body>
<p class="title">MAYUR FOOD PACKAGING — DETAILED COST SHEET</p>
<p class="info">Daana: Homo ₹${homo}/kg | CP ₹${cp}/kg | Random ₹${random}/kg | Generated: ${date}</p>
<p class="info">Formula: Floor N1 = New Daana + Carton + (N1_Zone × MH/CTN)</p>
<br/>
<table>
<thead>
<tr>
  <th>#</th><th>Item Name</th><th>CRM Name</th><th>Colour</th><th>Pcs/CTN</th>
  <th>Homo g/pc</th><th>CP g/pc</th><th>Rand g/pc</th>
  <th>Homo Cost ₹</th><th>CP Cost ₹</th><th>Rand Cost ₹</th>
  <th>Total Daana ₹</th><th>Base Daana ₹</th><th>Daana Change ₹</th>
  <th>Carton ₹</th><th>Fixed Cost ₹</th><th>MH/CTN</th><th>N1 Zone ₹/hr</th><th>N3 Zone ₹/hr</th>
  <th>Total Cost ₹</th><th>List Price ₹</th>
  <th>Floor N1 ₹</th><th>Happy N3 ₹</th><th>Zone</th><th>Margin %</th>
</tr>
</thead>
<tbody>
${rows}
</tbody>
</table>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
        'Content-Disposition': 'attachment; filename="Mayur_Cost_Sheet.xls"',
      }
    });

  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
