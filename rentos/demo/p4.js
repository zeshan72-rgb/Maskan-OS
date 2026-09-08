V.finance=()=>`
${head("Finance","Rent, costs and what's payable to owners this month.")}
<div class="sechead">This month</div>
<div class="grid g4 stagger">
 ${stat("Expected rent",QAR(361000),{icon:I.wallet})}${stat("Received",QAR(284000),{tone:"success",pct:79,sub:"79% collected",icon:I.chart})}
 ${stat("Outstanding",QAR(77000),{tone:"warn"})}${stat("Total arrears",QAR(100300),{tone:"danger",sub:"All past periods"})}</div>
<div class="sechead">Costs and payouts</div>
<div class="grid g3 stagger">
 ${stat("Expenses",QAR(12800),{sub:"Approved only"})}${stat("Management fees",QAR(28880),{})}
 ${stat("Owner payable",QAR(242320),{tone:"success",sub:"Received less costs",icon:I.wallet})}</div>
<div class="grid g3" style="margin-top:20px">
${[["Payments","Record, verify and allocate money received.","payments",I.receipt],
   ["Outstanding rent","Arrears ageing across every lease.","outstanding",I.chart],
   ["Expenses","Property costs, approvals and invoices.","expenses",I.wallet],
   ["Owner statements","Generate and finalise monthly statements.","statements",I.file],
   ["Cheques","Post-dated cheque lifecycle and banking.","cheques",I.bank],
   ["Reports","Portfolio, collection and performance.","reports",I.chart]].map(([t,d,r,ic])=>
`<div class="card" style="cursor:pointer;transition:transform .18s,box-shadow .18s" onclick="go('${r}')"
 onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 18px rgba(0,0,0,.055)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
 <div class="card-t" style="display:flex;align-items:center;gap:8px"><span style="width:16px;height:16px;color:#a1a1a1">${ic}</span>${t}</div>
 <div class="card-d" style="margin-top:4px">${d}</div>
 <div style="font-size:12px;color:var(--text-3);margin-top:12px;display:flex;align-items:center;gap:4px">Open <span style="width:12px;height:12px">${I.arrow}</span></div></div>`).join("")}</div>`;

V.payments=()=>{
  const q=(S.f.payQ||"").toLowerCase(),st=S.f.payStatus||"",me=S.f.payMethod||"";
  const rows=PAYMENTS.filter(p=>(!q||(p.ref+p.tenant+p.lease).toLowerCase().includes(q))&&(!st||p.status===st)&&(!me||p.method===me));
  const pend=PAYMENTS.filter(p=>p.status==="Pending Verification").length;
  return `${head("Payments","Every payment received, and what it was allocated to.",
   `<button class="btn out" onclick="toast('CSV export queued.')">${I.up} Export</button><button class="btn" onclick="modalPayment()">${I.receipt} Record payment</button>`,
   `<span class="link" onclick="go('finance')">Finance</span><span>Payments</span>`)}
${pend?`<div class="alert a-warn anim-down" style="margin-bottom:14px" onclick="setF('payStatus','Pending Verification')">
 <span style="display:flex;align-items:center;gap:8px"><span style="width:15px;height:15px">${I.warn}</span>${pend} payment awaiting verification.</span><b>${I.arrow.replace("<svg",'<svg style="width:15px;height:15px"')}</b></div>`:""}
<div class="toolbar"><input class="inp" style="width:230px" placeholder="Search reference or tenant…" value="${esc(S.f.payQ||"")}" oninput="setF('payQ',this.value)">
<select class="inp" onchange="setF('payStatus',this.value)">${["","Pending Verification","Confirmed","Rejected"].map(o=>`<option value="${o}"${st===o?" selected":""}>${o||"Status: All"}</option>`).join("")}</select>
<select class="inp" onchange="setF('payMethod',this.value)">${["","Bank transfer","Post-dated cheque","Cash"].map(o=>`<option value="${o}"${me===o?" selected":""}>${o||"Method: All"}</option>`).join("")}</select>
${(q||st||me)?`<button class="btn ghost sm" onclick="clearF()">${I.x} Clear</button>`:""}
<span style="margin-left:auto;font-size:12px;color:var(--text-3)">${rows.length} of ${PAYMENTS.length}</span></div>
${rows.length?tbl([{t:"Date"},{t:"Tenant"},{t:"Lease"},{t:"Method"},{t:"Reference"},{t:"Amount",r:1},{t:"Allocated",r:1},{t:"Status"},{t:"Actions",r:1}],
 rows.map(p=>`<tr><td>${D(p.date)}</td><td class="muted">${p.tenant}</td>
 <td class="muted"><span class="link" onclick="go('lease')">${p.lease}</span></td><td class="muted">${p.method}</td>
 <td class="muted">${p.ref}${p.receipt?`<div class="mini" style="color:var(--success)">${p.receipt}</div>`:""}${p.reason?`<div class="mini" style="color:var(--danger);max-width:210px;white-space:normal">${p.reason}</div>`:""}</td>
 <td class="num"><b>${QAR(p.amt)}</b></td><td class="num">${QAR(p.alloc)}</td><td>${pill(p.status)}</td>
 <td class="num">${p.status==="Pending Verification"?`<button class="btn out sm" onclick="modalVerify()">${I.check} Confirm</button> <button class="btn ghost sm" onclick="modalReject()">Reject</button>`:'<span style="color:#e5e5e5">—</span>'}</td></tr>`).join(""))
 :empty(I.receipt,"No payments match your filters","Try a different filter or clear them all.",`<button class="btn sm" onclick="clearF()">Clear filters</button>`)}`;
};

V.outstanding=()=>{
  const total=Object.values(BUCKETS).reduce((a,b)=>a+b,0);
  const tones={"Current":"","1-30":"warn","31-60":"warn","61-90":"danger","90+":"danger"};
  return `${head("Outstanding rent","Arrears ageing across every active lease, oldest debt first.",
  `<button class="btn out" onclick="toast('Arrears report exported.')">${I.up} Export CSV</button>`,
  `<span class="link" onclick="go('finance')">Finance</span><span>Outstanding</span>`)}
<div class="grid g5 stagger" style="margin-bottom:20px">
 ${Object.entries(BUCKETS).map(([k,v])=>stat(k==="Current"?"Current":k+" days",QAR(v),{tone:tones[k]||undefined,pct:total?v/total*100:0})).join("")}</div>
${tbl([{t:"Tenant"},{t:"Property"},{t:"Unit"},{t:"Oldest due date"},{t:"Ageing"},{t:"Amount owed",r:1},{t:"",r:1}],
 ARREARS.map(a=>`<tr><td><span class="link" onclick="go('lease')">${a.tenant}</span><div class="mini">${a.lease}</div></td>
 <td class="muted">${a.prop}</td><td class="muted">${a.unit}</td><td class="muted">${D(a.oldest)}</td>
 <td>${pillTxt(a.bucket==="90+"||a.bucket==="61-90"?"Overdue":"Partial",a.bucket+" days")}</td>
 <td class="num" style="color:var(--danger);font-weight:550">${QAR(a.amt)}</td>
 <td class="num"><button class="btn ghost sm" onclick="toast('Reminder sent to '+'${a.tenant}'+'.','ok')">Send reminder</button></td></tr>`).join(""))}`;
};

V.expenses=()=>{
  const q=(S.f.expQ||"").toLowerCase(),st=S.f.expStatus||"";
  const rows=EXPENSES.filter(e=>(!q||(e.desc+e.prop).toLowerCase().includes(q))&&(!st||e.status===st));
  return `${head("Expenses","Property costs. Only approved expenses reach owner statements.",
  `<button class="btn" onclick="modalExpense()">${I.plus} Record expense</button>`,
  `<span class="link" onclick="go('finance')">Finance</span><span>Expenses</span>`)}
<div class="toolbar"><input class="inp" style="width:230px" placeholder="Search description…" value="${esc(S.f.expQ||"")}" oninput="setF('expQ',this.value)">
<select class="inp" onchange="setF('expStatus',this.value)">${[["","Approval: All"],["pending","Pending"],["approved","Approved"],["rejected","Rejected"]].map(([v,l])=>`<option value="${v}"${st===v?" selected":""}>${l}</option>`).join("")}</select>
${(q||st)?`<button class="btn ghost sm" onclick="clearF()">${I.x} Clear</button>`:""}
<span style="margin-left:auto;font-size:12px;color:var(--text-3)">${rows.length} of ${EXPENSES.length}</span></div>
${rows.length?tbl([{t:"Date"},{t:"Description"},{t:"Property"},{t:"Category"},{t:"Vendor"},{t:"Amount",r:1},{t:"Approval"},{t:"Actions",r:1}],
 rows.map(e=>`<tr><td>${D(e.date)}</td><td>${e.desc}</td><td class="muted">${e.prop}<div class="mini">${e.owner}</div></td>
 <td class="muted">${e.cat}</td><td class="muted">${e.vendor}</td><td class="num"><b>${QAR(e.amt)}</b></td><td>${pill(e.status)}</td>
 <td class="num">${e.status==="pending"?`<button class="btn out sm" onclick="toast('Expense approved — it will appear on the owner statement.','ok')">${I.check} Approve</button>`:'<span style="color:#e5e5e5">—</span>'}</td></tr>`).join(""))
 :empty(I.wallet,"No expenses match your filters","Try a different filter.",`<button class="btn sm" onclick="clearF()">Clear filters</button>`)}`;
};

V.statements=()=>`
${head("Owner statements","Monthly statements become immutable once finalised. Changes are issued as a new version.",
 `<button class="btn" onclick="modalStatement()">${I.file} Generate statement</button>`,
 `<span class="link" onclick="go('finance')">Finance</span><span>Owner statements</span>`)}
${tbl([{t:"Owner"},{t:"Period"},{t:"Rent received",r:1},{t:"Costs",r:1},{t:"Payout",r:1},{t:"Closing",r:1},{t:"Status"},{t:"Actions",r:1}],
 STATEMENTS.map(s=>`<tr><td><span class="link" onclick="go('owner-detail')">${s.owner}</span></td>
 <td class="muted">${D(s.from)} – ${D(s.to)}${s.v>1?` <span class="pill p-info">v${s.v}</span>`:""}</td>
 <td class="num">${QAR(s.rent)}</td><td class="num">${QAR(s.exp+s.maint+s.fee)}</td>
 <td class="num" style="color:var(--success);font-weight:550">${QAR(s.payout)}</td><td class="num">${QAR(s.close)}</td>
 <td>${pill(s.status)}</td><td class="num">${s.status==="Draft"?`<button class="btn out sm" onclick="toast('Statement finalised — it is now an immutable record.','ok')">Finalise</button>`:`<button class="btn ghost sm" onclick="toast('PDF generated.')">${I.down} PDF</button>`}</td></tr>`).join(""))}
<div class="card" style="margin-top:12px;background:#fafafa"><div style="font-size:12.5px;color:var(--text-2);line-height:1.6">
<b>How the payout is computed:</b> rent received + other income − expenses − maintenance − management fees + adjustments.
The closing balance chains from the previous period's opening balance, so consecutive statements link correctly. Regenerating a finalised period creates <b>v2</b> rather than overwriting it.</div></div>`;

V.cheques=()=>{
  const q=(S.f.chqQ||"").toLowerCase(),st=S.f.chqStatus||"";
  const rows=CHEQUES.filter(c=>(!q||(c.no+c.bank+c.payer).toLowerCase().includes(q))&&(!st||c.status===st));
  const due=CHEQUES.filter(c=>["Received","Stored"].includes(c.status)&&daysTo(c.date)<=30&&daysTo(c.date)>=-30).length;
  return `${head("Cheques","Post-dated cheques held against leases, with full banking history.",
  `<button class="btn" onclick="modalCheque()">${I.plus} Record cheque</button>`,
  `<span>Payments</span><span>Cheques</span>`)}
${due?`<div class="alert a-warn anim-down" style="margin-bottom:14px"><span style="display:flex;align-items:center;gap:8px"><span style="width:15px;height:15px">${I.warn}</span>${due} cheques are dated within the next 30 days and not yet submitted to the bank.</span></div>`:""}
<div class="toolbar"><input class="inp" style="width:280px" placeholder="Search cheque number, bank or payer…" value="${esc(S.f.chqQ||"")}" oninput="setF('chqQ',this.value)">
<select class="inp" onchange="setF('chqStatus',this.value)">${["","Received","Stored","Submitted","Cleared","Bounced","Cancelled"].map(o=>`<option value="${o}"${st===o?" selected":""}>${o||"Status: All"}</option>`).join("")}</select>
${(q||st)?`<button class="btn ghost sm" onclick="clearF()">${I.x} Clear</button>`:""}
<span style="margin-left:auto;font-size:12px;color:var(--text-3)">${rows.length} of ${CHEQUES.length}</span></div>
${rows.length?tbl([{t:"Cheque"},{t:"Bank"},{t:"Payer"},{t:"Lease"},{t:"Cheque date"},{t:"Amount",r:1},{t:"Status"}],
 rows.map(c=>{const n=daysTo(c.date);const soon=["Received","Stored"].includes(c.status)&&n<=30;
 return `<tr><td><span class="link" onclick="go('cheque')">${c.no}</span></td><td class="muted">${c.bank}</td>
 <td class="muted">${c.payer}</td><td class="muted"><span class="link" onclick="go('lease')">${c.lease}</span></td>
 <td>${D(c.date)}${soon?` <span class="pill p-warn">${n<0?"Past due":n+"d"}</span>`:""}</td>
 <td class="num">${QAR(c.amt)}</td><td>${pill(c.status)}</td></tr>`}).join(""))
 :empty(I.bank,"No cheques match your filters","Try a different search or clear the filters.",`<button class="btn sm" onclick="clearF()">Clear filters</button>`)}`;
};

V.cheque=()=>`
${head("Cheque CHQ773455","Doha Bank · Elena Petrova · "+QAR(54000),pill("Bounced"),
 `<span>Payments</span><span class="link" onclick="go('cheques')">Cheques</span><span>CHQ773455</span>`)}
<div class="respcols">
<div style="display:flex;flex-direction:column;gap:14px">
 <div class="card flat"><div class="card-h"><div class="card-t">Cheque lifecycle</div><div class="card-d">Every status change is recorded automatically, including who made it and when.</div></div>
 <div class="card-b"><ul class="timeline">${CHEQUE_TL.map(t=>`<li class="anim-in">
  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">${pill(t.to)}${t.from?`<span class="mini">from ${t.from.toLowerCase()}</span>`:""}</div>
  <div class="t-d" style="margin-top:2px">${DT(t.at)}</div>
  <div style="font-size:13px;color:var(--text-2);margin-top:3px">${t.note}</div></li>`).join("")}</ul></div></div>
 <div class="card flat"><div class="card-h"><div class="card-t">Next steps</div><div class="card-d">Only transitions valid from the current status are offered — the database rejects anything else.</div></div>
 <div class="card-b" style="display:flex;gap:8px;flex-wrap:wrap">
  <button class="btn out sm" onclick="modalCheque(1)">Record replacement cheque</button>
  <button class="btn ghost sm" onclick="toast('Cheque cancelled.')">Cancel cheque</button></div></div>
</div>
<aside style="display:flex;flex-direction:column;gap:12px">
 <div class="card"><div class="card-t" style="margin-bottom:8px">Details</div><dl class="dl">
  <div><dt>Amount</dt><dd>${QAR(54000)}</dd></div><div><dt>Cheque date</dt><dd>04 Aug 2026</dd></div>
  <div><dt>Received</dt><dd>15 Jun 2026</dd></div><div><dt>Bank</dt><dd>Doha Bank</dd></div>
  <div><dt>Payer</dt><dd>Elena Petrova</dd></div>
  <div><dt>Lease</dt><dd><span class="link" onclick="go('lease')">LEASE-0007</span></dd></div></dl></div>
 <div class="card"><div class="card-t" style="margin-bottom:8px">Linked instalment</div>
  <div style="font-size:13.5px"><div>Instalment #2</div><div class="muted">Due 01 Aug 2026</div>
  <div style="font-variant-numeric:tabular-nums;margin-top:2px">${QAR(54000)} outstanding</div>
  <div style="margin-top:10px;background:#fef2f2;color:#b91c1c;padding:9px 11px;border-radius:8px;font-size:12px">Bounced — the rent remains outstanding and the tenant has been notified.</div></div></div>
</aside></div>`;

V.maintenance=()=>{
  const q=(S.f.mQ||"").toLowerCase(),st=S.f.mStatus||"",pr=S.f.mPri||"";
  const rows=MAINT.filter(m=>(!q||(m.code+m.desc+m.prop).toLowerCase().includes(q))&&(!st||m.status===st)&&(!pr||m.pri===pr));
  return `${head("Maintenance","Requests raised by tenants and staff, and the work orders resolving them.",
  `<button class="btn" onclick="modalMaint()">${I.plus} Raise request</button>`)}
<div class="grid g4 stagger" style="margin-bottom:18px">
 ${stat("New","1",{})}${stat("In progress","3",{tone:"warn"})}${stat("Urgent","1",{tone:"danger"})}${stat("Ageing > 7d","2",{tone:"danger"})}</div>
<div class="toolbar"><input class="inp" style="width:260px" placeholder="Search code or description…" value="${esc(S.f.mQ||"")}" oninput="setF('mQ',this.value)">
<select class="inp" onchange="setF('mStatus',this.value)">${["","Submitted","Assigned","Scheduled","In Progress","Waiting","Completed","Closed"].map(o=>`<option value="${o}"${st===o?" selected":""}>${o||"Status: All"}</option>`).join("")}</select>
<select class="inp" onchange="setF('mPri',this.value)">${["","Emergency","High","Normal","Low"].map(o=>`<option value="${o}"${pr===o?" selected":""}>${o||"Priority: All"}</option>`).join("")}</select>
${(q||st||pr)?`<button class="btn ghost sm" onclick="clearF()">${I.x} Clear</button>`:""}
<span style="margin-left:auto;font-size:12px;color:var(--text-3)">${rows.length} of ${MAINT.length}</span></div>
${rows.length?tbl([{t:"Request"},{t:"Location"},{t:"Category"},{t:"Priority"},{t:"Assigned to"},{t:"Age"},{t:"Status"}],
 rows.map(m=>`<tr><td><span class="link" onclick="go('maint-detail')">${m.code}</span><div class="mini" style="max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${m.desc}</div></td>
 <td class="muted">${m.prop}<span style="color:#d9d9d9"> · ${m.unit}</span><div class="mini">${m.tenant}</div></td>
 <td class="muted">${m.cat}</td><td>${pill(m.pri)}</td><td class="muted">${m.vendor||"Unassigned"}</td>
 <td><span style="color:${m.age>7?"var(--danger)":"var(--text-2)"};font-variant-numeric:tabular-nums">${m.age}d</span></td>
 <td>${pill(m.status)}</td></tr>`).join(""))
 :empty(I.wrench,"No requests match your filters","Try a different filter or clear them all.",`<button class="btn sm" onclick="clearF()">Clear filters</button>`)}`;
};

V["maint-detail"]=()=>`
${head("MR-0001","The Pearl Residences · Unit 101 · HVAC / AC",
 `${pill("High")}<select class="inp" style="width:145px" onchange="toast('Status updated to '+this.value+'.','ok')">${["Assigned","Reviewing","Scheduled","In Progress","Waiting","Completed","Closed"].map(o=>`<option>${o}</option>`).join("")}</select>
  <button class="btn out" onclick="modalAssign()">Reassign</button>`,
 `<span class="link" onclick="go('maintenance')">Maintenance</span><span>MR-0001</span>`)}
<div class="respcols"><div style="display:flex;flex-direction:column;gap:14px">
 <div class="card"><div class="card-t">Reported issue</div><div class="card-d" style="margin-bottom:10px">Raised 15 Aug 2026, 09:24 by John Smith</div>
  <p style="font-size:13.5px;line-height:1.65">AC unit in the living room is running but blowing warm air. Started two days ago and gets worse in the afternoon.</p>
  <div style="margin-top:10px;background:#fafafa;padding:11px;border-radius:9px;font-size:13px;color:var(--text-2)"><b style="color:var(--text)">Access:</b> Please call before arriving. Tenant is home after 4pm on weekdays.</div>
  <div style="margin-top:8px;background:#fafafa;padding:11px;border-radius:9px;font-size:13px;color:var(--text-2)"><b style="color:var(--text)">Preferred time:</b> Weekday afternoons.</div></div>
 <div class="card flat"><div class="card-h"><div class="card-t">Work order</div><div class="card-d">Assigned to Rashid Cooling Services</div></div>
 <div class="card-b"><div class="grid g4" style="margin-bottom:14px">
  ${[["Scheduled","19 Aug, 16:00"],["Estimated cost",QAR(350)],["Approved cap",QAR(500)],["Actual cost","—"]].map(([l,v])=>
  `<div style="border:1px solid var(--border);border-radius:9px;padding:10px"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--text-3)">${l}</div><div style="font-size:13px;font-weight:550;margin-top:3px">${v}</div></div>`).join("")}</div>
  <ul class="timeline">${[["Assigned","15 Aug 2026, 11:02","Assigned to Rashid Cooling Services with a QAR 500 approved cap."],
   ["Accepted","15 Aug 2026, 13:40","Vendor accepted the job."],["Scheduled","16 Aug 2026, 08:15","Visit booked for 19 Aug at 4pm."]]
   .map(([t,d,n])=>`<li class="anim-in"><div class="t-t">${t}</div><div class="t-d">${d}</div><div style="font-size:13px;color:var(--text-2);margin-top:2px">${n}</div></li>`).join("")}</ul></div></div>
 <div class="card flat"><div class="card-h"><div class="card-t">Comments</div><div class="card-d">Internal notes are never shown to the tenant.</div></div>
 <div class="card-b">
  <div style="background:#fafafa;border-radius:9px;padding:11px;margin-bottom:8px">
   <div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:3px"><b>Ahmed Khalil</b><span class="muted">15 Aug 2026</span></div>
   <div style="font-size:13.5px">Technician booked for Wednesday afternoon. Tenant confirmed they'll be home.</div></div>
  <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:9px;padding:11px;margin-bottom:12px">
   <div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:3px"><b>Ahmed Khalil</b><span style="display:flex;gap:6px;align-items:center"><span class="pill p-warn">Internal</span><span class="muted">16 Aug</span></span></div>
   <div style="font-size:13.5px">Third AC callout in this building this quarter — worth reviewing the service contract.</div></div>
  <textarea class="inp" style="width:100%" placeholder="Update the tenant or leave a note for the team…"></textarea>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-top:9px">
   <label class="chk"><input type="checkbox"> Internal note (hidden from the tenant)</label>
   <button class="btn sm" onclick="toast('Comment posted.','ok')">Post</button></div></div></div>
</div>
<aside><div class="card"><div class="card-t" style="margin-bottom:8px">Details</div><dl class="dl">
 <div><dt>Status</dt><dd>${pill("Assigned")}</dd></div>
 <div><dt>Property</dt><dd><span class="link" onclick="go('property')">The Pearl Residences</span></dd></div>
 <div><dt>Unit</dt><dd>101</dd></div><div><dt>Tenant</dt><dd><span class="link" onclick="go('tenant-detail')">John Smith</span></dd></div>
 <div><dt>Contact</dt><dd>+974 5533 1122</dd></div><div><dt>Category</dt><dd>HVAC / AC</dd></div></dl></div></aside></div>`;

V.vendors=()=>`
${head("Vendors","Contractors who carry out maintenance work.",`<button class="btn" onclick="toast('Vendor form would open here.')">${I.plus} Add vendor</button>`,
 `<span class="link" onclick="go('maintenance')">Maintenance</span><span>Vendors</span>`)}
${tbl([{t:"Vendor"},{t:"Trade"},{t:"Contact"},{t:"CR"},{t:"Assigned",r:1},{t:"Completed",r:1},{t:"Total billed",r:1}],
 VENDORS.map(v=>`<tr><td><b>${v.name}</b></td><td><span class="pill p-outline">${v.trade}</span></td>
 <td class="muted">${v.email}<div class="mini">${v.phone}</div></td><td class="muted">${v.cr}</td>
 <td class="num">${v.assigned}</td><td class="num">${v.done}</td><td class="num">${QAR(v.cost)}</td></tr>`).join(""))}`;

V.reports=()=>{
  const tab=S.tab.reports||"Portfolio";
  return `${head("Reports","Portfolio, collections, expiries and operational performance.",
  `<button class="btn out" onclick="toast('Report exported to CSV.')">${I.up} Export</button>`)}
<div class="grid g4 stagger" style="margin-bottom:20px">
 ${stat("Properties","5",{icon:I.build})}${stat("Units","54",{sub:"16 vacant"})}
 ${stat("Occupancy","65%",{pct:65,tone:"warn"})}${stat("Monthly rent roll",QAR(361000),{icon:I.chart})}</div>
${tabsBar(["Portfolio","Collection","Lease expiry","Arrears ageing","Cheques","Maintenance","Vendors"],tab,"reports")}
${tab==="Portfolio"?tbl([{t:"Property"},{t:"Type"},{t:"Units",r:1},{t:"Occupied",r:1},{t:"Vacant",r:1},{t:"Occupancy",r:1},{t:"Monthly rent",r:1}],
 PROPS.map(p=>{const pc=Math.round(p.occ/p.units*100);return `<tr><td><b>${p.name}</b></td><td class="muted">${p.type}</td>
 <td class="num">${p.units}</td><td class="num">${p.occ}</td><td class="num">${p.vac}</td>
 <td class="num" style="color:${pc>=75?"var(--success)":pc>=60?"var(--warn)":"var(--danger)"}">${pc}%</td><td class="num">${QAR(p.rent)}</td></tr>`}).join(""))
:tab==="Collection"?`<div class="card flat" style="margin-bottom:12px"><div class="card-b" style="padding-top:16px">${barChart(TREND)}</div></div>
 ${tbl([{t:"Month"},{t:"Expected",r:1},{t:"Collected",r:1},{t:"Outstanding",r:1},{t:"Rate",r:1}],
 TREND.map(t=>{const r=Math.round(t.col/t.exp*100);return `<tr><td>${t.m} 2026</td><td class="num">${QAR(t.exp)}</td>
 <td class="num" style="color:var(--success)">${QAR(t.col)}</td><td class="num" style="color:var(--danger)">${QAR(t.exp-t.col)}</td>
 <td class="num"><div style="display:flex;align-items:center;gap:8px;justify-content:flex-end">
 <div style="width:56px;height:5px;background:#f0f0f0;border-radius:99px;overflow:hidden"><i style="display:block;height:100%;width:${r}%;background:${r>=90?"#10b981":r>=75?"#f59e0b":"#ef4444"};border-radius:99px;animation:grow .8s ease-out both"></i></div>
 <span style="width:30px">${r}%</span></div></td></tr>`}).join(""))}`
:tab==="Lease expiry"?tbl([{t:"Lease"},{t:"Tenant"},{t:"Unit"},{t:"Ends"},{t:"Days left",r:1},{t:"Rent",r:1},{t:"Status"}],
 LEASES.filter(l=>daysTo(l.end)>=0&&daysTo(l.end)<=200).sort((a,b)=>daysTo(a.end)-daysTo(b.end)).map(l=>{const n=daysTo(l.end);
 return `<tr><td><span class="link" onclick="go('lease')">${l.id}</span></td><td class="muted">${l.tenant}</td>
 <td class="muted">${l.prop} · ${l.unit}</td><td>${D(l.end)}</td>
 <td class="num" style="color:${n<=30?"var(--danger)":n<=60?"var(--warn)":"var(--text-2)"}">${n}</td>
 <td class="num">${QAR(l.rent)}</td><td>${pill(l.status)}</td></tr>`}).join(""))
:tab==="Arrears ageing"?tbl([{t:"Bucket"},{t:"Amount",r:1},{t:"Share",r:1}],
 Object.entries(BUCKETS).map(([k,v])=>{const t=Object.values(BUCKETS).reduce((a,b)=>a+b,0);const pc=t?Math.round(v/t*100):0;
 return `<tr><td>${k==="Current"?"Current":k+" days"}</td><td class="num">${QAR(v)}</td>
 <td class="num"><div style="display:flex;align-items:center;gap:8px;justify-content:flex-end">
 <div style="width:80px;height:5px;background:#f0f0f0;border-radius:99px;overflow:hidden"><i style="display:block;height:100%;width:${pc}%;background:#141414;border-radius:99px;animation:grow .8s ease-out both"></i></div><span style="width:30px">${pc}%</span></div></td></tr>`}).join(""))
:tab==="Cheques"?tbl([{t:"Status"},{t:"Count",r:1},{t:"Value",r:1}],
 Object.entries(CHEQUES.reduce((a,c)=>{a[c.status]=a[c.status]||{n:0,v:0};a[c.status].n++;a[c.status].v+=c.amt;return a},{}))
 .sort((a,b)=>b[1].v-a[1].v).map(([s,d])=>`<tr><td>${pill(s)}</td><td class="num">${d.n}</td><td class="num">${QAR(d.v)}</td></tr>`).join(""))
:tab==="Maintenance"?tbl([{t:"Category"},{t:"Total",r:1},{t:"Open",r:1},{t:"Completed",r:1},{t:"Avg age (days)",r:1}],
 MAINT_CAT.map(c=>{const all=MAINT.filter(m=>m.cat===c.c);const open=all.filter(m=>!["Completed","Closed"].includes(m.status)).length;
 const avg=all.length?Math.round(all.reduce((s,m)=>s+m.age,0)/all.length*10)/10:0;
 return `<tr><td><b>${c.c}</b></td><td class="num">${all.length}</td>
 <td class="num" style="color:${open?"var(--warn)":"var(--text-3)"}">${open}</td>
 <td class="num" style="color:var(--success)">${all.length-open}</td><td class="num">${avg}</td></tr>`}).join(""))
:tbl([{t:"Vendor"},{t:"Assigned",r:1},{t:"Completed",r:1},{t:"Completion rate",r:1},{t:"Total cost",r:1},{t:"Avg per job",r:1}],
 VENDORS.map(v=>{const r=Math.round(v.done/v.assigned*100);return `<tr><td><b>${v.name}</b></td>
 <td class="num">${v.assigned}</td><td class="num">${v.done}</td>
 <td class="num" style="color:${r>=80?"var(--success)":"var(--warn)"}">${r}%</td>
 <td class="num">${QAR(v.cost)}</td><td class="num">${QAR(Math.round(v.cost/v.done))}</td></tr>`}).join(""))}`;
};

V.import=()=>{
  const st=S.imp.step,steps=["Upload","Map columns","Review","Done"];
  return `${head("Import data","Bring an existing portfolio in from a spreadsheet. Nothing is written until you confirm the preview.")}
<div style="max-width:760px">
<div class="steps">${steps.map((s,i)=>`<span class="step ${i===st?"on":i<st?"done":""}">${i<st?I.check:`<span>${i+1}</span>`}${s}</span>`).join("")}</div>
<div class="prog"><i style="width:${((st+1)/4)*100}%"></i></div>
<div class="card flat anim-up"><div class="card-h"><div class="card-t">${steps[st]}</div>
<div class="card-d">${["Choose what to import and upload a CSV.","We've matched the columns we recognised — adjust anything that's wrong.","Only valid rows are imported. The rest are listed so nothing is lost silently.","Summary of what was written."][st]}</div></div>
<div class="card-b">
${st===0?`<div class="grid g4" style="margin-bottom:14px">${["Properties","Units","Owners","Tenants"].map(t=>
 `<button style="border:1px solid ${S.imp.type===t?"#141414":"var(--border)"};background:${S.imp.type===t?"#141414":"#fff"};color:${S.imp.type===t?"#fff":"var(--text-2)"};border-radius:9px;padding:10px;font-size:13px;font-weight:500;text-align:left" onclick="setImp('type','${t}')">${t}</button>`).join("")}</div>
 <div style="border:1px dashed #d8d8d8;border-radius:11px;padding:40px 20px;text-align:center">
  <div style="width:34px;height:34px;margin:0 auto 10px;color:#d4d4d4">${I.upload}</div>
  <div style="font-weight:550;font-size:13.5px">Upload a CSV file</div>
  <div class="mini" style="margin-top:3px">Columns are detected automatically. Nothing is written until you confirm.</div>
  <div style="display:flex;gap:8px;justify-content:center;margin-top:14px;flex-wrap:wrap">
   <button class="btn" onclick="impStep(1)">${I.upload} Choose file</button>
   <button class="btn out" onclick="toast('rentos-'+'${(S.imp.type||'properties').toLowerCase()}'+'-template.csv downloaded.','ok')">${I.down} Download template</button></div></div>`
:st===1?`<div style="font-size:12.5px;color:var(--text-3);margin-bottom:12px">portfolio-export.csv · 24 data rows</div>
 ${[["Property name *","name"],["Property code *","property_code"],["Type","type"],["Address","address"],["Description","description"]].map(([l,k],i)=>
 `<div style="display:grid;grid-template-columns:190px 1fr;gap:10px;align-items:center;margin-bottom:10px">
  <div><div style="font-size:13.5px">${l}</div>${k==="type"?'<div class="mini">residential, commercial, mixed_use…</div>':""}</div>
  <select class="inp">${["Name","Code","Type","Address","Notes","Not mapped"].map((o,j)=>`<option${j===i?" selected":""}>${o}</option>`).join("")}</select></div>`).join("")}`
:st===2?`<div style="margin-bottom:14px"><div style="font-size:13.5px;font-weight:550;color:var(--danger);margin-bottom:7px">3 rows can't be imported</div>
 ${tbl([{t:"Row"},{t:"Problem"}],[[4,"Property code is required"],[11,'Type must be one of: residential, commercial, mixed_use, villa_compound, building, other'],[19,"Duplicate of an earlier row in this file"]]
  .map(([r,p])=>`<tr><td class="muted">${r}</td><td style="color:var(--danger)">${p}</td></tr>`).join(""))}</div>
 <div style="font-size:13.5px;font-weight:550;margin-bottom:7px">Preview of 21 valid rows</div>
 ${tbl([{t:"Name"},{t:"Code"},{t:"Type"},{t:"Address"}],
  [["Msheireb Loft A","PROP-006","residential","Msheireb Downtown, Doha"],["Msheireb Loft B","PROP-007","residential","Msheireb Downtown, Doha"],
   ["Barwa Commercial","PROP-008","commercial","Barwa Village, Al Wakrah"],["Onaiza Villas","PROP-009","villa_compound","Onaiza, Doha"]]
  .map(r=>`<tr>${r.map(c=>`<td class="muted">${c}</td>`).join("")}</tr>`).join(""))}`
:`<div style="display:flex;gap:8px;margin-bottom:14px"><span class="pill p-success">21 imported</span><span class="pill p-danger">3 skipped</span></div>
 ${tbl([{t:"Row"},{t:"Reason"}],[[4,"Property code is required"],[11,"Invalid property type"],[19,"Duplicate of an earlier row"]]
  .map(([r,p])=>`<tr><td class="muted">${r}</td><td style="color:var(--danger)">${p}</td></tr>`).join(""))}`}
</div></div>
<div style="display:flex;justify-content:space-between;margin-top:14px">
 <button class="btn out" ${st===0?"disabled":""} onclick="impStep(-1)">${I.back} Back</button>
 ${st===0?"":st<3?`<button class="btn" onclick="impStep(1)">${st===2?"Import 21 rows":"Validate"} ${I.arrow}</button>`
 :`<button class="btn" onclick="setImp('step',0);toast('Ready for another import.')">Import something else</button>`}</div></div>`;
};

V.settings=()=>{
  const tab=S.tab.settings||"Team";
  return `${head("Settings","Configure Pearl Property Management — company details, team, payments and integrations.")}
${tabsBar(["Team","Company","Bank accounts","Roles","Integrations","Features","Branding"],tab,"settings")}
${tab==="Team"?`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:13px;gap:12px;flex-wrap:wrap">
 <div><div style="font-weight:600;font-size:13.5px">Team members</div><div class="mini">Invitations expire after 7 days and can only be used once.</div></div>
 <button class="btn sm" onclick="modalInvite()">${I.plus} Invite member</button></div>
 ${tbl([{t:"Name"},{t:"Email"},{t:"Roles"},{t:"Status"}],
 [["Fatima Al-Sulaiti","admin@pearlpm.qa","Organisation Admin"],["Ahmed Khalil","manager@pearlpm.qa","Property Manager, Maintenance Manager"],
  ["Mariam Al-Kuwari","accountant@pearlpm.qa","Accountant"],["Jassim Al-Thani","owner@pearlpm.qa","Property Owner"],
  ["John Smith","tenant@pearlpm.qa","Tenant"],["Rashid Cooling Services","vendor@pearlpm.qa","Vendor"]]
 .map(([n,e,r])=>`<tr><td><b>${n}</b></td><td class="muted">${e}</td>
 <td>${r.split(", ").map(x=>`<span class="pill p-outline" style="margin-right:4px">${x}</span>`).join("")}</td><td>${pill("Active")}</td></tr>`).join(""))}
 <div style="margin-top:18px"><div style="font-weight:600;font-size:13.5px;margin-bottom:8px">Pending invitations</div>
 ${tbl([{t:"Email"},{t:"Role"},{t:"Expires"},{t:"Status"}],
 `<tr><td>ops@pearlpm.qa</td><td class="muted">Staff</td><td class="muted">25 Aug 2026</td><td>${pill("Pending")}</td></tr>`)}</div>`
:tab==="Company"?`<div class="card" style="max-width:640px"><div class="card-t">Company details</div><div class="card-d" style="margin-bottom:14px">Shown on statements, receipts and the tenant portal.</div>
 <div class="grid g2">${[["Company name","Pearl Property Management"],["Legal name","Pearl Property Management W.L.L."],
 ["Email","info@pearlpm.qa"],["Phone","+974 4444 5566"]].map(([l,v])=>`<label class="fld"><span>${l}</span><input class="inp" value="${v}"></label>`).join("")}
 <label class="fld" style="grid-column:1/-1"><span>Address</span><input class="inp" value="Office 12, Al Fardan Tower, West Bay, Doha, Qatar"></label>
 <label class="fld"><span>Currency</span><input class="inp" value="QAR" disabled></label>
 <label class="fld"><span>Timezone</span><input class="inp" value="Asia/Qatar" disabled></label></div>
 <button class="btn" style="margin-top:14px" onclick="toast('Company details saved.','ok')">Save changes</button></div>`
:tab==="Bank accounts"?`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:13px;gap:12px;flex-wrap:wrap">
 <div><div style="font-weight:600;font-size:13.5px">Receiving accounts</div><div class="mini">Shown to tenants when they pay by transfer.</div></div>
 <button class="btn sm" onclick="toast('Bank account form would open here.')">${I.plus} Add account</button></div>
 ${tbl([{t:"Bank"},{t:"Account name"},{t:"Account number"},{t:"IBAN"},{t:"Default"}],
 `<tr><td>Qatar National Bank</td><td class="muted">Pearl Property Management W.L.L.</td><td class="muted">••••••••9012</td><td class="muted">••••••••••••9012</td><td>${pill("Confirmed").replace("Confirmed","Default")}</td></tr>`)}
 <div class="card" style="margin-top:12px;background:#fffbeb;border-color:#fde68a"><div style="font-size:12.5px;color:#92400e">
 Account numbers are masked server-side for roles without <b>finance.bank_details.view</b> — the real value never reaches the browser.</div></div>`
:tab==="Roles"?tbl([{t:"Role"},{t:"Scope"},{t:"Key permissions"}],
 [["Organisation Owner","Full access to their organisation","All permissions"],
  ["Organisation Admin","Almost full operational access","All permissions"],
  ["Property Manager","Properties, units, leases, tenants","properties.manage, tenants.manage, leases.manage, maintenance.manage"],
  ["Accountant","Payments, cheques, reconciliation, reports","payments.manage, finance.*, documents.manage"],
  ["Maintenance Manager","Maintenance and vendors","maintenance.manage, vendors.manage"],
  ["Staff","Limited, configurable access","Configured per organisation"],
  ["Property Owner","Own properties and financials only","Portal-scoped (RLS)"],
  ["Tenant","Own lease, payments, maintenance","Portal-scoped (RLS)"],
  ["Vendor","Assigned work orders only","Portal-scoped (RLS)"]]
 .map(([r,s,p])=>`<tr><td><b>${r}</b></td><td class="muted">${s}</td><td class="mini" style="margin:0">${p}</td></tr>`).join(""))
:tab==="Integrations"?`<div class="grid g3 stagger">${[
 ["Online payments","Card and wallet payments from the tenant portal.",["PAYMENT_PROVIDER","PAYMENT_PROVIDER_API_KEY","PAYMENT_PROVIDER_WEBHOOK_SECRET"]],
 ["Transactional email","Invitations, receipts, reminders and renewal offers.",["EMAIL_PROVIDER","RESEND_API_KEY","EMAIL_FROM_ADDRESS"]],
 ["WhatsApp Business","Rent reminders and maintenance updates.",["WHATSAPP_PROVIDER_TOKEN","WHATSAPP_PHONE_NUMBER_ID"]]].map(([t,d,vars])=>
 `<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
  <div class="card-t" style="display:flex;gap:7px;align-items:center"><span style="width:15px;height:15px;color:#a1a1a1">${I.plug}</span>${t}</div>
  <span class="pill p-neutral">Not configured</span></div><div class="card-d" style="margin-top:6px">${d}</div>
  <div style="font-size:12px;color:var(--text-2);margin-top:10px;line-height:1.55">Built and ready — awaiting provider credentials. Nothing is ever simulated for an unconfigured provider.</div>
  <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:9px">${vars.map(v=>`<code style="background:#f4f4f4;border-radius:4px;padding:2px 6px;font-size:10.5px">${v}</code>`).join("")}</div></div>`).join("")}</div>`
:tab==="Features"?`<div class="card" style="max-width:600px"><div class="card-t">Feature flags</div>
 <div class="card-d" style="margin-bottom:6px">Platform defaults. Your plan may also gate some of these.</div>
 ${["online payments","whatsapp","ai document extraction","white label","advanced reporting"].map((f,i)=>
 `<div style="display:flex;justify-content:space-between;align-items:center;padding:11px 0;border-top:1px solid var(--border-soft)">
  <span style="font-size:13.5px;text-transform:capitalize">${f}</span>${pill(i===4?"Confirmed":"Draft").replace("Confirmed","On").replace("Draft","Off")}</div>`).join("")}</div>`
:`<div class="card" style="max-width:600px"><div class="card-t">Branding</div><div class="card-d" style="margin-bottom:14px">Applied to the tenant portal, statements and emails.</div>
 <div class="grid g2"><label class="fld"><span>Primary colour</span><input class="inp" type="color" value="#141414" style="height:38px;padding:3px"></label>
 <label class="fld"><span>Email sender name</span><input class="inp" value="Pearl Property Management"></label></div>
 <div style="margin-top:12px;border:1px dashed #d8d8d8;border-radius:10px;padding:24px;text-align:center">
  <div class="mini">Drop a logo here — PNG or SVG, max 2 MB</div></div>
 <button class="btn" style="margin-top:14px" onclick="toast('Branding saved.','ok')">Save branding</button></div>`}`;
};
