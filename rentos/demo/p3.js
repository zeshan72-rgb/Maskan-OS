/* ===================== ui helpers ===================== */
const TONES={Paid:"success",Confirmed:"success",Active:"success",Cleared:"success",Occupied:"success",Completed:"success",Finalised:"success",approved:"success",Approved:"success",
Partial:"warn",Expiring:"warn","Pending Verification":"warn","Due Soon":"warn","In Progress":"warn",Waiting:"warn",Maintenance:"warn",Trial:"info",pending:"warn",Pending:"warn",High:"warn",
Overdue:"danger",Bounced:"danger",Rejected:"danger",rejected:"danger",Terminated:"danger",Expired:"danger",Emergency:"danger",Suspended:"danger",
"Renewal Offered":"info",Assigned:"info",Submitted:"info",Scheduled:"info",
Draft:"neutral",Upcoming:"neutral",Vacant:"neutral",Received:"neutral",Stored:"neutral",Normal:"neutral",Reserved:"info",
Closed:"outline",Cancelled:"outline",Low:"outline","No lease":"outline",Individual:"outline",Company:"outline"};
const pill=s=>`<span class="pill p-${TONES[s]||"neutral"}">${esc(s)}</span>`;
const pillTxt=(s,label)=>`<span class="pill p-${TONES[s]||"neutral"}">${esc(label)}</span>`;

function stat(label,value,o={}){
  const col={success:"var(--success)",warn:"var(--warn)",danger:"var(--danger)"}[o.tone]||"var(--text)";
  const bar={success:"#10b981",warn:"#f59e0b",danger:"#ef4444"}[o.tone]||"#141414";
  return `<div class="stat"><div class="stat-l"><span>${label}</span>${o.icon?`<span style="width:14px;height:14px;color:#d4d4d4">${o.icon}</span>`:""}</div>
  <div class="stat-v" style="color:${col}">${value}</div>${o.sub?`<div class="stat-s">${o.sub}</div>`:""}
  ${o.pct!=null?`<div class="bar"><i style="width:${Math.min(100,Math.max(0,o.pct))}%;background:${bar}"></i></div>`:""}</div>`;
}
const tbl=(cols,rows)=>rows.trim()?`<div class="tablewrap"><table><thead><tr>${cols.map(c=>`<th${c.r?' class="num"':""}>${c.t}</th>`).join("")}</tr></thead><tbody class="stagger">${rows}</tbody></table></div>`:"";
const empty=(icon,title,desc,cta)=>`<div class="empty"><div class="ic">${icon}</div><div style="font-weight:550">${title}</div><div class="sub" style="max-width:390px;margin:4px auto 0">${desc}</div>${cta?`<div style="margin-top:14px">${cta}</div>`:""}</div>`;
const head=(title,sub,actions,crumbs)=>`${crumbs?`<div class="crumbs anim-down">${crumbs}</div>`:""}
<div class="head anim-down"><div><h1>${title}</h1>${sub?`<div class="sub">${sub}</div>`:""}</div>${actions?`<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">${actions}</div>`:""}</div>`;
const tabsBar=(items,active,key)=>`<div class="tabs">${items.map(t=>`<span class="tab ${t===active?"on":""}" onclick="setTab('${key}','${t}')">${t}</span>`).join("")}</div>`;
const bump=(v,d)=>`<span style="color:${v>=0?"var(--success)":"var(--danger)"};font-size:11.5px">${v>=0?"▲":"▼"} ${Math.abs(v)}% ${d}</span>`;

function barChart(data){
  const w=560,h=196,pad=34,max=Math.max(...data.map(d=>d.exp))*1.12,bw=(w-pad)/data.length;
  return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:196px">
  ${[0,.25,.5,.75,1].map(t=>`<line x1="${pad}" x2="${w}" y1="${(h-22)-(h-42)*t}" y2="${(h-22)-(h-42)*t}" stroke="#f2f2f2"/>`).join("")}
  ${[0,.5,1].map(t=>`<text x="${pad-6}" y="${(h-22)-(h-42)*t+3}" font-size="9" fill="#a1a1a1" text-anchor="end">${Math.round(max*t/1000)}k</text>`).join("")}
  ${data.map((d,i)=>{const x=pad+i*bw+bw*.16,bwid=bw*.3,he=(d.exp/max)*(h-42),hc=(d.col/max)*(h-42);
   return `<rect x="${x}" y="${h-22-he}" width="${bwid}" height="${he}" rx="3" fill="#d9d9d9"><animate attributeName="height" from="0" to="${he}" dur=".7s" fill="freeze"/><animate attributeName="y" from="${h-22}" to="${h-22-he}" dur=".7s" fill="freeze"/></rect>
   <rect x="${x+bwid+3}" y="${h-22-hc}" width="${bwid}" height="${hc}" rx="3" fill="#141414"><animate attributeName="height" from="0" to="${hc}" dur=".9s" fill="freeze"/><animate attributeName="y" from="${h-22}" to="${h-22-hc}" dur=".9s" fill="freeze"/></rect>
   <text x="${x+bwid}" y="${h-7}" font-size="10" fill="#737373" text-anchor="middle">${d.m}</text>`}).join("")}</svg>
  <div style="display:flex;gap:16px;font-size:11.5px;color:var(--text-3);margin-top:4px">
  <span style="display:flex;align-items:center;gap:5px"><i style="width:9px;height:9px;border-radius:2px;background:#d9d9d9;display:inline-block"></i>Expected</span>
  <span style="display:flex;align-items:center;gap:5px"><i style="width:9px;height:9px;border-radius:2px;background:#141414;display:inline-block"></i>Collected</span></div>`;
}
function hBar(data){
  const max=Math.max(...data.map(d=>d.n)),sh=["#141414","#333","#4d4d4d","#737373","#a1a1a1"];
  return `<div style="display:flex;flex-direction:column;gap:9px;padding-top:4px">${data.map((d,i)=>
  `<div style="display:flex;align-items:center;gap:10px"><span style="width:118px;font-size:12px;color:var(--text-2);text-align:right;flex-shrink:0">${d.c}</span>
  <div style="flex:1;height:20px;background:#f7f7f7;border-radius:4px;overflow:hidden"><div style="height:100%;width:${(d.n/max)*100}%;background:${sh[i%5]};border-radius:4px;animation:grow .8s cubic-bezier(.22,1,.36,1) both;animation-delay:${i*60}ms"></div></div>
  <span style="width:16px;font-size:12px;font-variant-numeric:tabular-nums;color:var(--text-2)">${d.n}</span></div>`).join("")}</div>`;
}
function donut(pct,label){
  const r=42,c=2*Math.PI*r;
  return `<div style="display:flex;align-items:center;gap:16px"><svg viewBox="0 0 110 110" style="width:106px;height:106px;flex-shrink:0">
  <circle cx="55" cy="55" r="${r}" fill="none" stroke="#f0f0f0" stroke-width="11"/>
  <circle cx="55" cy="55" r="${r}" fill="none" stroke="#141414" stroke-width="11" stroke-linecap="round"
   stroke-dasharray="${c}" stroke-dashoffset="${c}" transform="rotate(-90 55 55)">
   <animate attributeName="stroke-dashoffset" from="${c}" to="${c*(1-pct/100)}" dur="1s" fill="freeze" calcMode="spline" keySplines="0.22 1 0.36 1"/></circle>
  <text x="55" y="60" text-anchor="middle" font-size="21" font-weight="650" fill="#141414">${pct}%</text></svg>
  <div style="font-size:13px;color:var(--text-2);line-height:1.6">${label}</div></div>`;
}

/* ===================== manager views ===================== */
const V={};

V.dashboard=()=>`
${head("Good day, Fatima","Portfolio overview for Pearl Property Management.",
 `<button class="btn out" onclick="toast('Export queued — CSV will download shortly.')">${I.up} Export</button>
  <button class="btn" onclick="go('lease-new')">${I.plus} New lease</button>`)}
<div class="grid g3 stagger" style="margin-bottom:20px">
 ${[["Overdue rent instalments",127,"danger","outstanding"],["Bounced cheques",1,"danger","cheque"],
    ["Cheques due in 30 days",3,"warn","cheques"],["Leases expiring in 60 days",2,"warn","leases"],
    ["Urgent maintenance",1,"danger","maintenance"],["Payments awaiting verification",1,"warn","payments"]]
   .map(([l,n,t,r])=>`<div class="alert a-${t}" onclick="go('${r}')"><span style="display:flex;align-items:center;gap:8px"><span style="width:15px;height:15px">${I.warn}</span>${l}</span><b>${n}</b></div>`).join("")}
</div>
<div class="sechead">Portfolio</div>
<div class="grid g4 stagger">
 ${stat("Properties","5",{icon:I.build})}${stat("Units","54",{sub:"16 vacant · 3 in maintenance",icon:I.home})}
 ${stat("Occupied","35",{tone:"success",sub:bump(4,"vs last month")})}${stat("Occupancy","65%",{pct:65,tone:"warn"})}</div>
<div class="sechead">Rent this month</div>
<div class="grid g5 stagger">
 ${stat("Expected",QAR(361000),{icon:I.wallet})}${stat("Collected",QAR(284000),{tone:"success",icon:I.chart})}
 ${stat("Outstanding",QAR(77000),{tone:"warn"})}${stat("Total arrears",QAR(100300),{tone:"danger",sub:"All periods"})}
 ${stat("Collection rate","79%",{pct:79,tone:"warn",sub:bump(-6,"vs Jul")})}</div>
<div class="grid g2" style="margin-top:20px">
 <div class="card flat anim-up"><div class="card-h"><div class="card-t">Rent collected vs expected</div><div class="card-d">Last six months, from instalments and payment allocations.</div></div><div class="card-b">${barChart(TREND)}</div></div>
 <div class="card flat anim-up"><div class="card-h"><div class="card-t">Open maintenance by category</div><div class="card-d">Requests not yet closed or cancelled.</div></div><div class="card-b">${hBar(MAINT_CAT)}</div></div></div>
<div class="grid g2" style="margin-top:12px">
 <div class="card flat"><div class="card-h"><div class="card-t">Leases</div><div class="card-d">Expiries ahead, so renewals can start early.</div></div>
 <div class="card-b"><div class="grid g4">${[["Active","35",""],["≤ 30 days","1","var(--danger)"],["≤ 60 days","2","var(--warn)"],["≤ 90 days","4",""]]
  .map(([l,v,c])=>`<div style="border:1px solid var(--border);border-radius:9px;padding:11px"><div style="font-size:11.5px;color:var(--text-3)">${l}</div><div style="font-size:19px;font-weight:600;margin-top:2px;color:${c||"var(--text)"};font-variant-numeric:tabular-nums">${v}</div></div>`).join("")}</div></div></div>
 <div class="card flat"><div class="card-h"><div class="card-t">Occupancy</div><div class="card-d">Across all five properties.</div></div>
 <div class="card-b">${donut(65,"<b>35 of 54 units occupied.</b><br>16 vacant, 3 under maintenance.<br><span style='color:var(--text-3)'>Lusail Marina View is the weakest at 50%.</span>")}</div></div></div>`;

V.properties=()=>{
  const q=(S.f.propQ||"").toLowerCase(), t=S.f.propType||"";
  const rows=PROPS.filter(p=>(!q||(p.name+p.code+p.addr).toLowerCase().includes(q))&&(!t||p.type===t));
  return `${head("Properties","Every building, compound and commercial asset under management.",
  `<button class="btn" onclick="modalProperty()">${I.plus} Add property</button>`)}
<div class="toolbar">
 <input class="inp" style="width:270px" placeholder="Search name, code or address…" value="${esc(S.f.propQ||"")}" oninput="setF('propQ',this.value)">
 <select class="inp" onchange="setF('propType',this.value)">${["","Residential","Commercial","Villa Compound"].map(o=>`<option value="${o}"${t===o?" selected":""}>${o||"Type: All"}</option>`).join("")}</select>
 ${(q||t)?`<button class="btn ghost sm" onclick="clearF()">${I.x} Clear</button>`:""}
 <span style="margin-left:auto;font-size:12px;color:var(--text-3)">${rows.length} of ${PROPS.length}</span></div>
${rows.length?tbl([{t:"Property"},{t:"Type"},{t:"Owner"},{t:"Units",r:1},{t:"Vacant",r:1},{t:"Occupancy",r:1},{t:"Rent roll",r:1}],
 rows.map(p=>{const pc=Math.round(p.occ/p.units*100);return `<tr>
 <td><span class="link" onclick="go('property')">${p.name}</span><div class="mini">${p.code} · ${p.addr}</div></td>
 <td><span class="pill p-outline">${p.type}</span></td><td class="muted">${p.owner}</td>
 <td class="num">${p.units}</td><td class="num">${p.vac}</td>
 <td class="num"><div style="display:flex;align-items:center;gap:8px;justify-content:flex-end">
  <div style="width:60px;height:5px;background:#f0f0f0;border-radius:99px;overflow:hidden"><i style="display:block;height:100%;width:${pc}%;background:${pc>=75?"#10b981":pc>=60?"#f59e0b":"#ef4444"};border-radius:99px;animation:grow .8s ease-out both"></i></div>
  <span style="width:32px;font-size:12px;color:var(--text-2)">${pc}%</span></div></td>
 <td class="num">${QAR(p.rent)}</td></tr>`}).join(""))
 :empty(I.build,"No properties match your filters","Try a different search term or clear the filters to see everything.",`<button class="btn sm" onclick="clearF()">Clear filters</button>`)}`;
};

V.property=()=>{
  const tab=S.tab.property||"Units";
  return `${head("The Pearl Residences","Residential · PROP-001 · Porto Arabia, The Pearl, Doha",
  `<button class="btn" onclick="modalUnit()">${I.plus} Add unit</button><button class="btn out" onclick="modalProperty(1)">Edit</button>`,
  `<span class="link" onclick="go('properties')">Properties</span><span>The Pearl Residences</span>`)}
<div class="grid g4 stagger" style="margin-bottom:20px">
 ${stat("Units","16",{sub:"3 vacant · 1 maintenance",icon:I.home})}${stat("Occupancy","75%",{pct:75,tone:"warn",sub:"12 of 16 occupied"})}
 ${stat("Active leases","12",{icon:I.wallet})}${stat("Monthly rent roll",QAR(118500),{sub:"From active leases"})}</div>
${tabsBar(["Units","Leases","Maintenance","Financials","Documents"],tab,"property")}
${tab==="Units"?`<div class="respcols"><div>
 ${tbl([{t:"Unit"},{t:"Configuration"},{t:"Tenant"},{t:"Market",r:1},{t:"Current",r:1},{t:"Status"}],
  UNITS.map(u=>`<tr><td><b>${u.no}</b> <span class="mini" style="display:inline">Fl ${u.floor}</span></td>
  <td class="muted">${u.type} · ${u.beds} bed · ${u.area} m² · ${u.furn}</td>
  <td class="muted">${u.tenant?`<span class="link" onclick="go('lease')">${u.tenant}</span>`:"—"}</td>
  <td class="num muted">${QAR(u.market)}</td><td class="num">${u.rent?QAR(u.rent):"—"}</td><td>${pill(u.status)}</td></tr>`).join(""))}</div>
 <aside style="display:flex;flex-direction:column;gap:12px">
  <div class="card"><div class="card-t" style="margin-bottom:9px">Owners</div>
   <div style="display:flex;justify-content:space-between;font-size:13.5px"><span class="link" onclick="go('owner-detail')">Jassim Al-Thani</span><span class="muted">100%</span></div></div>
  <div class="card"><div class="card-t" style="margin-bottom:9px">Details</div><dl class="dl">
   <div><dt>Management fee</dt><dd>8% of rent</dd></div><div><dt>Property code</dt><dd>PROP-001</dd></div>
   <div><dt>Type</dt><dd>Residential</dd></div><div><dt>Coordinates</dt><dd>25.3695, 51.5390</dd></div></dl></div></aside></div>`
 :tab==="Leases"?tbl([{t:"Lease"},{t:"Tenant"},{t:"Unit"},{t:"Rent",r:1},{t:"Status"}],
   LEASES.filter(l=>l.prop==="The Pearl Residences").map(l=>`<tr><td><span class="link" onclick="go('lease')">${l.id}</span></td><td class="muted">${l.tenant}</td><td class="muted">${l.unit}</td><td class="num">${QAR(l.rent)}</td><td>${pill(l.status)}</td></tr>`).join(""))
 :tab==="Maintenance"?tbl([{t:"Request"},{t:"Unit"},{t:"Category"},{t:"Priority"},{t:"Status"}],
   MAINT.filter(m=>m.prop==="The Pearl Residences").map(m=>`<tr><td><span class="link" onclick="go('maint-detail')">${m.code}</span></td><td class="muted">${m.unit}</td><td class="muted">${m.cat}</td><td>${pill(m.pri)}</td><td>${pill(m.status)}</td></tr>`).join(""))
 :tab==="Financials"?`<div class="grid g3 stagger" style="margin-bottom:14px">
   ${stat("Rent collected (Aug)",QAR(96200),{tone:"success"})}${stat("Expenses (Aug)",QAR(4250),{})}${stat("Management fee",QAR(9480),{})}</div>
   ${tbl([{t:"Date"},{t:"Description"},{t:"Category"},{t:"Amount",r:1},{t:"Approval"}],
    EXPENSES.filter(e=>e.prop==="The Pearl Residences").map(e=>`<tr><td>${D(e.date)}</td><td>${e.desc}</td><td class="muted">${e.cat}</td><td class="num">${QAR(e.amt)}</td><td>${pill(e.status)}</td></tr>`).join(""))}`
 :empty(I.file,"No documents uploaded","Title deeds, insurance certificates and inspection reports for this property will appear here.",`<button class="btn sm" onclick="toast('Upload dialog would open here.')">${I.upload} Upload document</button>`)}`;
};

V.units=()=>{
  const q=(S.f.unitQ||"").toLowerCase(),st=S.f.unitStatus||"";
  const rows=UNITS.filter(u=>(!q||u.no.toLowerCase().includes(q))&&(!st||u.status===st));
  return `${head("The Pearl Residences — Units","16 units · 12 occupied · 3 vacant",
  `<button class="btn" onclick="modalUnit()">${I.plus} Add unit</button>`,
  `<span class="link" onclick="go('properties')">Properties</span><span class="link" onclick="go('property')">The Pearl Residences</span><span>Units</span>`)}
<div class="toolbar"><input class="inp" style="width:210px" placeholder="Search unit number…" value="${esc(S.f.unitQ||"")}" oninput="setF('unitQ',this.value)">
<select class="inp" onchange="setF('unitStatus',this.value)">${["","Occupied","Vacant","Reserved","Maintenance","Inactive"].map(o=>`<option value="${o}"${st===o?" selected":""}>${o||"Status: All"}</option>`).join("")}</select>
${(q||st)?`<button class="btn ghost sm" onclick="clearF()">${I.x} Clear</button>`:""}
<span style="margin-left:auto;font-size:12px;color:var(--text-3)">${rows.length} of ${UNITS.length}</span></div>
${rows.length?tbl([{t:"Unit"},{t:"Configuration"},{t:"Tenant"},{t:"Market rent",r:1},{t:"Current rent",r:1},{t:"Status"},{t:""}],
 rows.map(u=>`<tr><td><b>${u.no}</b> <span class="mini" style="display:inline">Floor ${u.floor}</span></td>
 <td class="muted">${u.type} · ${u.beds} bed · ${u.baths} bath · ${u.area} m² · ${u.furn}</td>
 <td class="muted">${u.tenant?`<span class="link" onclick="go('lease')">${u.tenant}</span>`:"—"}</td>
 <td class="num muted">${QAR(u.market)}</td><td class="num">${u.rent?QAR(u.rent):"—"}</td><td>${pill(u.status)}</td>
 <td class="num"><button class="btn ghost sm" onclick="modalUnit('${u.no}')">Edit</button></td></tr>`).join(""))
 :empty(I.home,"No units match your filters","Try a different search or clear the filters.",`<button class="btn sm" onclick="clearF()">Clear filters</button>`)}`;
};

V.leases=()=>{
  const q=(S.f.leaseQ||"").toLowerCase(),st=S.f.leaseStatus||"",ex=S.f.leaseExp||"";
  let rows=LEASES.filter(l=>(!q||(l.id+l.tenant+l.prop).toLowerCase().includes(q))&&(!st||l.status===st));
  if(ex){const d=+ex;rows=rows.filter(l=>{const n=daysTo(l.end);return n>=0&&n<=d})}
  return `${head("Leases","Every tenancy agreement in your portfolio.",
  `<button class="btn out" onclick="toast('CSV export queued.')">${I.up} Export</button><button class="btn" onclick="go('lease-new')">${I.plus} New lease</button>`)}
<div class="toolbar"><input class="inp" style="width:230px" placeholder="Search lease, tenant or property…" value="${esc(S.f.leaseQ||"")}" oninput="setF('leaseQ',this.value)">
<select class="inp" onchange="setF('leaseStatus',this.value)">${["","Active","Expiring","Renewal Offered","Expired","Terminated"].map(o=>`<option value="${o}"${st===o?" selected":""}>${o||"Status: All"}</option>`).join("")}</select>
<select class="inp" onchange="setF('leaseExp',this.value)">${[["","Expiring: All"],["30","Within 30 days"],["60","Within 60 days"],["90","Within 90 days"],["120","Within 120 days"]].map(([v,l])=>`<option value="${v}"${ex===v?" selected":""}>${l}</option>`).join("")}</select>
${(q||st||ex)?`<button class="btn ghost sm" onclick="clearF()">${I.x} Clear</button>`:""}
<span style="margin-left:auto;font-size:12px;color:var(--text-3)">${rows.length} of ${LEASES.length}</span></div>
${rows.length?tbl([{t:"Lease"},{t:"Tenant"},{t:"Unit"},{t:"Term"},{t:"Rent",r:1},{t:"Outstanding",r:1},{t:"Status"}],
 rows.map(l=>{const n=daysTo(l.end);return `<tr>
 <td><span class="link" onclick="go('lease')">${l.id}</span><div class="mini">${l.freq} · ${l.method}</div></td>
 <td class="muted">${l.tenant}</td><td class="muted">${l.prop}<span style="color:#d9d9d9"> · ${l.unit}</span></td>
 <td class="muted">${D(l.start)} → ${D(l.end)}${n<=90&&n>=0?`<div class="mini" style="color:${n<=30?"var(--danger)":"var(--warn)"}">${n} days remaining</div>`:""}</td>
 <td class="num">${QAR(l.rent)}</td><td class="num" style="color:${l.outstanding?"var(--danger)":"#d9d9d9"}">${l.outstanding?QAR(l.outstanding):"—"}</td>
 <td>${pill(l.status)}</td></tr>`}).join(""))
 :empty(I.file,"No leases match your filters","Try a different filter, or clear them to see every lease.",`<button class="btn sm" onclick="clearF()">Clear filters</button>`)}`;
};

V.lease=()=>{
  const tab=S.tab.lease||"Rent schedule";
  return `${head("LEASE-0001","The Pearl Residences · Unit 101 · John Smith",
  `${pill("Active")}<button class="btn" onclick="modalPayment()">${I.receipt} Record payment</button>
   <button class="btn out" onclick="modalRenewal()">Offer renewal</button><button class="btn out" onclick="modalTerminate()">Terminate</button>`,
  `<span class="link" onclick="go('leases')">Leases</span><span>LEASE-0001</span>`)}
<div class="grid g4 stagger" style="margin-bottom:20px">
 ${stat("Monthly rent",QAR(9500),{icon:I.wallet})}${stat("Billed to date",QAR(114000),{sub:"12 instalments",icon:I.receipt})}
 ${stat("Collected",QAR(100700),{tone:"success",pct:88,sub:"88% of billed"})}${stat("Outstanding",QAR(13300),{tone:"danger",sub:QAR(9500)+" overdue"})}</div>
${tabsBar(["Rent schedule","Terms","Cheques","Renewals","History","Documents"],tab,"lease")}
${tab==="Rent schedule"?`
 ${tbl([{t:"#"},{t:"Due date"},{t:"Amount",r:1},{t:"Outstanding",r:1},{t:"Status"},{t:"Payments applied"}],
  SCHEDULE.map(s=>`<tr><td class="muted">${s.n}</td><td>${D(s.due)}</td><td class="num">${QAR(s.amt)}</td>
  <td class="num">${s.out?QAR(s.out):"—"}</td><td>${pill(s.status)}</td>
  <td>${s.alloc.length?s.alloc.map(a=>`<span class="pill p-outline" style="margin-right:4px">${QAR(a.amt)} · ${a.ref}</span>`).join(""):'<span class="mini">None</span>'}</td></tr>`).join(""))}
 <div class="card" style="margin-top:12px;background:#f0f9ff;border-color:#bae6fd"><div style="font-size:13px;color:#075985;line-height:1.6">
 <b>Instalment 6 shows how allocation works.</b> QAR 9,500 was due; a QAR 5,700 cash payment was allocated against it, leaving QAR 3,800 outstanding — so the status is <b>Partial</b>, not Paid. Payments and rent obligations are separate records joined by allocations, never a single "paid" flag.</div></div>`
 :tab==="Terms"?`<div class="grid g2">
  <div class="card flat"><div class="card-h"><div class="card-t">Tenancy</div></div><div class="card-b"><dl class="dl">
   <div><dt>Property</dt><dd><span class="link" onclick="go('property')">The Pearl Residences</span></dd></div>
   <div><dt>Unit</dt><dd>101</dd></div><div><dt>Tenant</dt><dd><span class="link" onclick="go('tenant-detail')">John Smith</span></dd></div>
   <div><dt>Owner</dt><dd><span class="link" onclick="go('owner-detail')">Jassim Al-Thani</span></dd></div>
   <div><dt>Start date</dt><dd>01 Feb 2026</dd></div><div><dt>End date</dt><dd>31 Jan 2027</dd></div>
   <div><dt>Grace period</dt><dd>5 days</dd></div></dl></div></div>
  <div class="card flat"><div class="card-h"><div class="card-t">Financial terms</div></div><div class="card-b"><dl class="dl">
   <div><dt>Monthly rent</dt><dd>${QAR(9500)}</dd></div><div><dt>Total contract rent</dt><dd>${QAR(114000)}</dd></div>
   <div><dt>Security deposit</dt><dd>${QAR(9500)}</dd></div><div><dt>Frequency</dt><dd>Monthly</dd></div>
   <div><dt>Method</dt><dd>Bank transfer</dd></div></dl>
   <p style="margin-top:11px;background:#fafafa;padding:11px;border-radius:9px;font-size:13px;color:var(--text-2)">Parking bay B-14 included. Chiller charges billed separately by the building.</p></div></div></div>`
 :tab==="Cheques"?tbl([{t:"Cheque"},{t:"Bank"},{t:"Amount",r:1},{t:"Cheque date"},{t:"Status"}],
   CHEQUES.filter(c=>c.lease==="LEASE-0003"||c.no==="CHQ448120").map(c=>`<tr><td><span class="link" onclick="go('cheque')">${c.no}</span></td><td class="muted">${c.bank}</td><td class="num">${QAR(c.amt)}</td><td>${D(c.date)}</td><td>${pill(c.status)}</td></tr>`).join(""))
 :tab==="Renewals"?empty(I.clock,"No renewal offers yet","When the lease nears its end date, offer a renewal here. Accepting it creates the successor lease automatically and preserves this lease's history.",`<button class="btn sm" onclick="modalRenewal()">Offer renewal</button>`)
 :tab==="History"?`<div class="card flat"><div class="card-h"><div class="card-t">Lease timeline</div><div class="card-d">Every status change, in order.</div></div>
  <div class="card-b"><ul class="timeline">${LEASE_EVENTS.map(e=>`<li class="anim-in"><div class="t-t">${e.t}</div><div class="t-d">${DT(e.at)}</div><div style="font-size:13px;color:var(--text-2);margin-top:2px">${e.n}</div></li>`).join("")}</ul></div></div>`
 :`<div style="display:flex;flex-direction:column;gap:10px">
   ${[["Signed tenancy agreement.pdf","28 Jan 2026","Lease"],["Tenant QID copy.pdf","22 Jan 2026","QID"],["Deposit receipt.pdf","28 Jan 2026","Receipt"]].map(([n,d,c])=>
   `<div class="card" style="display:flex;justify-content:space-between;align-items:center;padding:13px 15px">
    <span style="display:flex;gap:10px;align-items:center"><span style="width:16px;height:16px;color:var(--text-3)">${I.file}</span>
    <span><span style="display:block;font-size:13.5px;font-weight:500">${n}</span><span class="mini">${c} · uploaded ${d}</span></span></span>
    <button class="btn ghost sm" onclick="toast('Signed URL generated — download starting.')">${I.down} Download</button></div>`).join("")}</div>`}`;
};

V["lease-new"]=()=>{
  const st=S.wizard.step, steps=["Property & unit","Tenant","Dates","Financial terms","Schedule","Review"];
  const w=S.wizard;
  const months=(new Date(w.end)-new Date(w.start))/(1000*60*60*24*30.44);
  const step=w.freq==="Quarterly"?3:w.freq==="Semi-annual"?6:w.freq==="Annual"?12:1;
  const count=Math.max(1,Math.ceil(months/step)), per=(+w.rent||0)*step;
  const preview=Array.from({length:count},(_,i)=>{const d=new Date(w.start);d.setMonth(d.getMonth()+i*step);return{n:i+1,d:d.toISOString().slice(0,10),a:per}});
  const total=preview.reduce((s,x)=>s+x.a,0);
  const can=[()=>w.unit,()=>w.tenant,()=>w.start&&w.end&&new Date(w.end)>new Date(w.start),()=>+w.rent>0,()=>1,()=>1][st]();
  return `${head("New lease","Rent instalments are generated when the lease is activated, not while it's a draft.",null,
   `<span class="link" onclick="go('leases')">Leases</span><span>New</span>`)}
<div style="max-width:720px">
<div class="steps">${steps.map((s,i)=>`<span class="step ${i===st?"on":i<st?"done":""}">${i<st?I.check:`<span style="font-variant-numeric:tabular-nums">${i+1}</span>`}${s}</span>`).join("")}</div>
<div class="prog"><i style="width:${((st+1)/steps.length)*100}%"></i></div>
<div class="card flat anim-up"><div class="card-h"><div class="card-t">${steps[st]}</div>
<div class="card-d">${["Choose which unit this tenancy covers.","Who is signing the lease.","Tenancy period and late-payment grace.","Rent and deposit for the term.","How often rent falls due and how it will be paid.","Confirm everything before creating the lease."][st]}</div></div>
<div class="card-b">
${st===0?`<div class="grid g2">
 <label class="fld"><span>Property *</span><select class="inp" onchange="setW('prop',this.value)">${["","The Pearl Residences","West Bay Towers","Al Sadd Business Center","Lusail Marina View","Al Waab Villa Compound"].map(o=>`<option${w.prop===o?" selected":""}>${o||"Select a property…"}</option>`).join("")}</select></label>
 <label class="fld"><span>Unit *</span><select class="inp" onchange="setW('unit',this.value)">${["","104 · 2 bed · QAR 9,000","204 · Studio · QAR 5,500","303 · 1 bed · QAR 6,800"].map(o=>`<option${w.unit===o?" selected":""}>${o||"Select a unit…"}</option>`).join("")}</select><div class="hint">Only vacant and reserved units are listed.</div></label>
 <label class="fld" style="grid-column:1/-1"><span>Owner</span><select class="inp">${["Jassim Al-Thani","Doha Horizon Holdings","Noora Al-Emadi"].map(o=>`<option>${o}</option>`).join("")}</select><div class="hint">Used for owner statements and portal visibility.</div></label></div>`
:st===1?`<label class="fld"><span>Tenant *</span><select class="inp" onchange="setW('tenant',this.value)">${["",...TENANTS.map(t=>t.name+" · "+t.phone)].map(o=>`<option${w.tenant===o?" selected":""}>${o||"Select a tenant…"}</option>`).join("")}</select>
 <div class="hint">Create the tenant record first if they aren't listed.</div></label>`
:st===2?`<div class="grid g2">
 <label class="fld"><span>Start date *</span><input class="inp" type="date" value="${w.start}" onchange="setW('start',this.value)"></label>
 <label class="fld"><span>End date *</span><input class="inp" type="date" value="${w.end}" onchange="setW('end',this.value)"></label>
 <label class="fld" style="grid-column:1/-1"><span>Grace period (days)</span><input class="inp" type="number" value="5"><div class="hint">Days after the due date before rent is treated as late.</div></label></div>`
:st===3?`<div class="grid g2">
 <label class="fld"><span>Monthly rent (QAR) *</span><input class="inp" type="number" value="${w.rent}" oninput="setW('rent',this.value)"></label>
 <label class="fld"><span>Security deposit (QAR)</span><input class="inp" type="number" value="${w.rent}"></label>
 <label class="fld" style="grid-column:1/-1"><span>Notes</span><textarea class="inp" placeholder="Special conditions, included utilities, parking…"></textarea></label></div>`
:st===4?`<div class="grid g2" style="margin-bottom:14px">
 <label class="fld"><span>Payment frequency *</span><select class="inp" onchange="setW('freq',this.value)">${["Monthly","Quarterly","Semi-annual","Annual"].map(o=>`<option${w.freq===o?" selected":""}>${o}</option>`).join("")}</select></label>
 <label class="fld"><span>Payment method *</span><select class="inp">${["Bank transfer","Post-dated cheque","Cash / manual","Online payment"].map(o=>`<option>${o}</option>`).join("")}</select></label></div>
 <div style="border:1px solid var(--border);border-radius:10px;overflow:hidden">
  <div style="display:flex;justify-content:space-between;padding:9px 12px;background:#fafafa;border-bottom:1px solid var(--border);font-size:12px">
   <b>${count} instalment${count===1?"":"s"}</b><span class="muted">Total ${QAR(total)}</span></div>
  <div style="max-height:210px;overflow-y:auto">${preview.map(p=>`<div style="display:flex;justify-content:space-between;padding:8px 12px;border-top:1px solid var(--border-soft);font-size:13px">
   <span class="muted">#${p.n}</span><span>${D(p.d)}</span><span style="font-variant-numeric:tabular-nums">${QAR(p.a)}</span></div>`).join("")}</div>
  <div style="padding:8px 12px;border-top:1px solid var(--border);font-size:11.5px;color:var(--text-3)">Preview only. The definitive schedule is generated by the database when you activate the lease.</div></div>`
:`<dl class="dl">${[["Property",w.prop||"—"],["Unit",w.unit||"—"],["Tenant",w.tenant||"—"],
 ["Term",D(w.start)+" → "+D(w.end)],["Monthly rent",QAR(+w.rent)],["Total contract",QAR(total)],
 ["Security deposit",QAR(+w.rent)],["Frequency",w.freq],["Instalments",String(count)]]
 .map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>
 <p style="margin-top:12px;font-size:12.5px;color:var(--text-3);line-height:1.6">The lease will be created as a <b>draft</b>. Rent instalments are generated when you activate it, so nothing is billed until you're ready.</p>`}
</div></div>
<div style="display:flex;justify-content:space-between;margin-top:14px">
 <button class="btn out" ${st===0?"disabled":""} onclick="wizStep(-1)">${I.back} Back</button>
 ${st<5?`<button class="btn" ${can?"":"disabled"} onclick="wizStep(1)">Continue ${I.arrow}</button>`
 :`<button class="btn" onclick="toast('Lease LEASE-0015 created as a draft.','ok');go('leases')">${I.file} Create lease</button>`}</div></div>`;
};

V.tenants=()=>{
  const q=(S.f.tenQ||"").toLowerCase(),st=S.f.tenStatus||"";
  const rows=TENANTS.filter(t=>(!q||(t.name+t.email+t.phone+t.qid).toLowerCase().includes(q))&&(!st||(st==="housed"?t.lease:!t.lease)));
  return `${head("Tenants","Everyone renting a unit in your portfolio.",`<button class="btn" onclick="modalTenant()">${I.plus} Add tenant</button>`)}
<div class="toolbar"><input class="inp" style="width:280px" placeholder="Search name, phone, email or QID…" value="${esc(S.f.tenQ||"")}" oninput="setF('tenQ',this.value)">
<select class="inp" onchange="setF('tenStatus',this.value)">${[["","Tenancy: All"],["housed","Has a lease"],["none","No lease"]].map(([v,l])=>`<option value="${v}"${st===v?" selected":""}>${l}</option>`).join("")}</select>
${(q||st)?`<button class="btn ghost sm" onclick="clearF()">${I.x} Clear</button>`:""}
<span style="margin-left:auto;font-size:12px;color:var(--text-3)">${rows.length} of ${TENANTS.length}</span></div>
${rows.length?tbl([{t:"Tenant"},{t:"Contact"},{t:"QID / Passport"},{t:"Employer"},{t:"Unit"},{t:"Lease"}],
 rows.map(t=>`<tr><td><span class="link" onclick="go('tenant-detail')">${t.name}</span><div class="mini">${t.nat}</div></td>
 <td class="muted">${t.phone}<div class="mini">${t.email}</div></td><td class="muted">${t.qid}</td>
 <td class="muted">${t.emp}</td><td class="muted">${t.unit}</td><td>${pill(t.status)}</td></tr>`).join(""))
 :empty(I.users,"No tenants match your filters","Try a different search term or clear the filters.",`<button class="btn sm" onclick="clearF()">Clear filters</button>`)}`;
};

V["tenant-detail"]=()=>{
  const tab=S.tab.tenantD||"Leases";
  return `${head("John Smith","British · 28711098765 · +974 5533 1122",
  `<button class="btn out" onclick="toast('Invitation link copied to clipboard.','ok')">Invite to portal</button><button class="btn out">Edit</button>`,
  `<span class="link" onclick="go('tenants')">Tenants</span><span>John Smith</span>`)}
<div class="grid g4 stagger" style="margin-bottom:20px">
 ${stat("Current unit","101",{sub:"The Pearl Residences",icon:I.home})}${stat("Monthly rent",QAR(9500),{icon:I.wallet})}
 ${stat("Paid to date",QAR(100700),{tone:"success"})}${stat("Outstanding",QAR(13300),{tone:"danger"})}</div>
${tabsBar(["Leases","Payments","Maintenance","Occupants","Documents"],tab,"tenantD")}
${tab==="Leases"?tbl([{t:"Lease"},{t:"Unit"},{t:"Term"},{t:"Rent",r:1},{t:"Status"}],
 `<tr><td><span class="link" onclick="go('lease')">LEASE-0001</span></td><td class="muted">The Pearl Residences · 101</td>
  <td class="muted">01 Feb 2026 → 31 Jan 2027</td><td class="num">${QAR(9500)}</td><td>${pill("Active")}</td></tr>`)
:tab==="Payments"?tbl([{t:"Date"},{t:"Method"},{t:"Reference"},{t:"Amount",r:1},{t:"Status"}],
 PAYMENTS.filter(p=>p.tenant==="John Smith").map(p=>`<tr><td>${D(p.date)}</td><td class="muted">${p.method}</td><td class="muted">${p.ref}</td><td class="num">${QAR(p.amt)}</td><td>${pill(p.status)}</td></tr>`).join(""))
:tab==="Maintenance"?tbl([{t:"Request"},{t:"Category"},{t:"Priority"},{t:"Status"}],
 MAINT.filter(m=>m.tenant==="John Smith").map(m=>`<tr><td><span class="link" onclick="go('maint-detail')">${m.code}</span><div class="mini">${m.desc.slice(0,50)}…</div></td><td class="muted">${m.cat}</td><td>${pill(m.pri)}</td><td>${pill(m.status)}</td></tr>`).join(""))
:tab==="Occupants"?tbl([{t:"Name"},{t:"Relationship"},{t:"QID / Passport"}],
 `<tr><td>Sarah Smith</td><td class="muted">Spouse</td><td class="muted">28711098766</td></tr>
  <tr><td>Emily Smith</td><td class="muted">Daughter</td><td class="muted">31211098767</td></tr>`)
:empty(I.file,"No documents on file","QID copies, passport scans and signed agreements appear here.",`<button class="btn sm" onclick="toast('Upload dialog would open here.')">${I.upload} Upload document</button>`)}`;
};

V.owners=()=>{
  const q=(S.f.ownQ||"").toLowerCase(),k=S.f.ownKind||"";
  const rows=OWNERS.filter(o=>(!q||(o.name+o.email+o.idn).toLowerCase().includes(q))&&(!k||o.kind===k));
  return `${head("Owners","Landlords and investors whose properties you manage.",`<button class="btn" onclick="modalOwner()">${I.plus} Add owner</button>`)}
<div class="toolbar"><input class="inp" style="width:280px" placeholder="Search name, email, phone or QID…" value="${esc(S.f.ownQ||"")}" oninput="setF('ownQ',this.value)">
<select class="inp" onchange="setF('ownKind',this.value)">${["","Individual","Company"].map(o=>`<option value="${o}"${k===o?" selected":""}>${o||"Type: All"}</option>`).join("")}</select>
${(q||k)?`<button class="btn ghost sm" onclick="clearF()">${I.x} Clear</button>`:""}</div>
${rows.length?tbl([{t:"Owner"},{t:"Type"},{t:"Contact"},{t:"QID / CR"},{t:"Properties",r:1},{t:"Units",r:1},{t:"Rent roll",r:1}],
 rows.map(o=>`<tr><td><span class="link" onclick="go('owner-detail')">${o.name}</span></td><td>${pill(o.kind)}</td>
 <td class="muted">${o.email}<div class="mini">${o.phone}</div></td><td class="muted">${o.idn}</td>
 <td class="num">${o.props}</td><td class="num">${o.units}</td><td class="num">${QAR(o.rent)}</td></tr>`).join(""))
 :empty(I.user,"No owners match your filters","Try a different search term.",`<button class="btn sm" onclick="clearF()">Clear filters</button>`)}`;
};

V["owner-detail"]=()=>{
  const tab=S.tab.ownerD||"Properties";
  return `${head("Jassim Al-Thani","Individual · 28511012345 · jassim.althani@example.qa",
  `<button class="btn out" onclick="toast('Invitation link copied to clipboard.','ok')">Invite to portal</button>`,
  `<span class="link" onclick="go('owners')">Owners</span><span>Jassim Al-Thani</span>`)}
<div class="grid g4 stagger" style="margin-bottom:20px">
 ${stat("Properties","1",{icon:I.build})}${stat("Units","16",{sub:"12 occupied",icon:I.home})}
 ${stat("Occupancy","75%",{pct:75,tone:"warn"})}${stat("Monthly rent roll",QAR(118500),{icon:I.wallet})}</div>
${tabsBar(["Properties","Units","Income","Expenses","Statements","Bank details"],tab,"ownerD")}
${tab==="Properties"?tbl([{t:"Property"},{t:"Code"},{t:"Units",r:1},{t:"Occupancy",r:1},{t:"Ownership",r:1}],
 `<tr><td><span class="link" onclick="go('property')">The Pearl Residences</span></td><td class="muted">PROP-001</td><td class="num">16</td><td class="num">75%</td><td class="num">100%</td></tr>`)
:tab==="Units"?tbl([{t:"Unit"},{t:"Tenant"},{t:"Rent",r:1},{t:"Status"}],
 UNITS.map(u=>`<tr><td><b>${u.no}</b></td><td class="muted">${u.tenant||"—"}</td><td class="num">${u.rent?QAR(u.rent):"—"}</td><td>${pill(u.status)}</td></tr>`).join(""))
:tab==="Income"?tbl([{t:"Month"},{t:"Expected",r:1},{t:"Received",r:1},{t:"Rate",r:1}],
 TREND.map(t=>`<tr><td>${t.m} 2026</td><td class="num">${QAR(Math.round(t.exp*0.33))}</td><td class="num">${QAR(Math.round(t.col*0.33))}</td><td class="num">${Math.round(t.col/t.exp*100)}%</td></tr>`).join(""))
:tab==="Expenses"?tbl([{t:"Date"},{t:"Description"},{t:"Category"},{t:"Amount",r:1},{t:"Approval"}],
 EXPENSES.filter(e=>e.owner==="Jassim Al-Thani").map(e=>`<tr><td>${D(e.date)}</td><td>${e.desc}</td><td class="muted">${e.cat}</td><td class="num">${QAR(e.amt)}</td><td>${pill(e.status)}</td></tr>`).join(""))
:tab==="Statements"?tbl([{t:"Period"},{t:"Payout",r:1},{t:"Closing",r:1},{t:"Status"}],
 STATEMENTS.filter(s=>s.owner==="Jassim Al-Thani").map(s=>`<tr><td>${D(s.from)} – ${D(s.to)}${s.v>1?` <span class="pill p-info">v${s.v}</span>`:""}</td><td class="num">${QAR(s.payout)}</td><td class="num">${QAR(s.close)}</td><td>${pill(s.status)}</td></tr>`).join(""))
:`<div class="card" style="max-width:520px"><div class="card-t" style="margin-bottom:10px">Payout account</div>
 <dl class="dl"><div><dt>Bank</dt><dd>Qatar National Bank</dd></div><div><dt>Account holder</dt><dd>Jassim Al-Thani</dd></div>
 <div><dt>Account number</dt><dd>••••••••4821</dd></div><div><dt>IBAN</dt><dd>••••••••••••••••7719</dd></div></dl>
 <div style="margin-top:11px;background:#fffbeb;border:1px solid #fde68a;color:#92400e;padding:10px;border-radius:9px;font-size:12.5px">
 Account numbers are masked server-side for roles without the <b>finance.bank_details.view</b> permission — the full value never reaches the browser.</div></div>`}`;
};
