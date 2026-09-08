/* ===================== tenant portal ===================== */
V.tenant=()=>`
<div class="anim-down" style="margin-bottom:16px"><div class="mini">Welcome back</div><h1>John</h1></div>
<div class="alert a-danger anim-down" style="margin-bottom:12px;cursor:default">
 <span style="display:flex;gap:8px;align-items:flex-start"><span style="width:15px;height:15px;flex-shrink:0;margin-top:2px">${I.warn}</span>
 <span>${QAR(9500)} is past its due date. If you've already paid, submit your transfer details below and we'll match it up.</span></span></div>
<div class="card flat anim-up" style="margin-bottom:12px"><div class="card-h"><div class="card-t">My home</div>
 <div class="card-d">The Pearl Residences · Unit 101</div></div><div class="card-b">
 <p class="muted" style="font-size:13.5px;margin-bottom:12px">Porto Arabia, The Pearl, Doha</p>
 <div class="grid g4">${[["Monthly rent",QAR(9500)],["Lease ends","31 Jan 2027"],["Paid to date",QAR(100700)],["Outstanding",QAR(13300)]]
 .map(([l,v])=>`<div style="border:1px solid var(--border);border-radius:9px;padding:11px"><div style="font-size:11.5px;color:var(--text-3)">${l}</div>
 <div style="font-size:13.5px;font-weight:550;margin-top:2px;font-variant-numeric:tabular-nums">${v}</div></div>`).join("")}</div></div></div>
<div class="card flat anim-up" style="margin-bottom:12px"><div class="card-h"><div class="card-t">Next payment</div>
 <div class="card-d">${QAR(3800)} due 01 Jul 2026 · 48 days overdue</div></div><div class="card-b">
 <div style="display:flex;gap:8px;align-items:center;margin-bottom:14px">${pill("Partial")}<span style="font-size:11.5px;color:var(--danger);font-weight:550">48 days overdue</span></div>
 <div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--text-3);margin-bottom:8px">Transfer to</div>
 <div class="grid g2" style="margin-bottom:14px">${[["Bank","Qatar National Bank"],["Account name","Pearl Property Management W.L.L."],
  ["IBAN","QA58QNBA000000000123456789012"],["Payment reference","LEASE-0001"]].map(([l,v])=>
 `<button style="border:1px solid var(--border);border-radius:9px;padding:9px 11px;display:flex;justify-content:space-between;align-items:center;gap:8px;text-align:left;background:#fff;width:100%" onclick="copyIt('${v}','${l}')">
  <span style="min-width:0"><span style="display:block;font-size:11.5px;color:var(--text-3)">${l}</span>
  <span style="display:block;font-size:13px;font-weight:550;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${v}</span></span>
  <span style="width:14px;height:14px;flex-shrink:0;color:#a1a1a1">${I.copy}</span></button>`).join("")}</div>
 <button class="btn" style="width:100%" onclick="modalProof()">${I.upload} I've paid — submit proof</button>
 <div style="margin-top:10px;background:#fffbeb;color:#92400e;padding:9px 11px;border-radius:9px;font-size:12px">You have 1 payment awaiting verification.</div></div></div>
<div class="card anim-up"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
 <div style="display:flex;gap:11px;align-items:center">
  <div style="width:36px;height:36px;border-radius:50%;background:#fffbeb;display:grid;place-items:center"><span style="width:16px;height:16px;color:var(--warn)">${I.wrench}</span></div>
  <div><div style="font-weight:550;font-size:13.5px">1 open repair</div><div class="mini">Report an issue or track progress</div></div></div>
 <button class="btn out sm" onclick="go('tenant-maint')">View</button></div></div>`;

V["tenant-pay"]=()=>`
<div class="anim-down" style="margin-bottom:16px"><h1>Payments</h1><div class="sub">Your rent schedule and everything you've paid.</div></div>
<button class="btn" style="width:100%;margin-bottom:14px" onclick="modalProof()">${I.upload} Submit payment proof</button>
<div class="card flat anim-up" style="margin-bottom:12px"><div class="card-h"><div class="card-t">Rent schedule</div>
 <div class="card-d">${QAR(13300)} outstanding across 12 instalments.</div></div><div class="card-b"><div class="stagger">
 ${SCHEDULE.map(s=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-top:1px solid var(--border-soft)">
  <div><div style="font-weight:550;font-size:13.5px">${D(s.due)}</div><div class="mini">Instalment ${s.n} · ${QAR(s.amt)}</div></div>
  <div style="text-align:right"><div style="font-size:13.5px;font-weight:550;font-variant-numeric:tabular-nums;color:${s.out?"var(--text)":"var(--text-3)"}">${s.out?QAR(s.out):"Paid"}</div>
  <div style="margin-top:3px">${pill(s.status)}</div></div></div>`).join("")}</div></div></div>
<div class="card flat anim-up"><div class="card-h"><div class="card-t">Payment history</div><div class="card-d">Including anything still being verified.</div></div>
 <div class="card-b"><div class="stagger">${PAYMENTS.slice(0,6).map(p=>
 `<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:10px 0;border-top:1px solid var(--border-soft)">
  <div><div style="font-weight:550;font-variant-numeric:tabular-nums">${QAR(p.amt)}</div>
  <div class="mini">${D(p.date)} · ${p.method}${p.ref!=="—"?" · "+p.ref:""}</div>
  ${p.receipt?`<div class="mini" style="color:var(--success)">Receipt ${p.receipt} <button class="link" style="font-size:11.5px" onclick="toast('Receipt downloaded.')">Download</button></div>`:""}
  ${p.reason?`<div style="margin-top:5px;background:#fef2f2;color:#b91c1c;padding:6px 9px;border-radius:7px;font-size:11.5px;max-width:340px">${p.reason}</div>`:""}</div>
  ${pill(p.status)}</div>`).join("")}</div></div></div>`;

V["tenant-lease"]=()=>`
<div class="anim-down" style="margin-bottom:16px"><h1>Your lease</h1><div class="sub">LEASE-0001</div></div>
<div class="card anim-up" style="margin-bottom:12px;border-color:#bae6fd;background:#f7fcff">
 <div class="card-t">Renewal offer</div><div class="card-d" style="margin-bottom:12px">Your landlord would like to renew your tenancy.</div>
 <div class="grid g3" style="margin-bottom:12px">${[["New term","01 Feb 2027 → 31 Jan 2028"],["New monthly rent",QAR(9900)],["New deposit","Unchanged"]]
 .map(([l,v])=>`<div style="border:1px solid #bae6fd;background:#fff;border-radius:9px;padding:11px"><div style="font-size:11.5px;color:var(--text-3)">${l}</div>
 <div style="font-size:13px;font-weight:550;margin-top:2px">${v}</div></div>`).join("")}</div>
 <p style="background:#fff;padding:11px;border-radius:9px;font-size:13.5px;color:var(--text-2);margin-bottom:12px">We'd be glad to renew your tenancy. The small increase reflects the building's new gym and pool access.</p>
 <textarea class="inp" style="width:100%;margin-bottom:10px" placeholder="Add a message (optional)"></textarea>
 <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" onclick="toast('Renewal accepted — LEASE-0015 has been created and activated.','ok')">Accept renewal</button>
 <button class="btn out" onclick="toast('Discussion requested — your manager has been notified.','ok')">Request a discussion</button>
 <button class="btn ghost" onclick="toast('Renewal declined.')">Decline</button></div></div>
<div class="card flat anim-up" style="margin-bottom:12px"><div class="card-h"><div class="card-t">Tenancy details</div><div class="card-d">The Pearl Residences · Unit 101</div></div>
 <div class="card-b"><dl class="dl"><div><dt>Status</dt><dd>${pill("Active")}</dd></div>
 ${[["Start date","01 Feb 2026"],["End date","31 Jan 2027"],["Monthly rent",QAR(9500)],["Security deposit",QAR(9500)],
   ["Payment frequency","Monthly"],["Payment method","Bank transfer"],["Grace period","5 days"]]
 .map(([l,v])=>`<div><dt>${l}</dt><dd>${v}</dd></div>`).join("")}</dl></div></div>
<div class="card flat anim-up"><div class="card-h"><div class="card-t">Documents</div><div class="card-d">Your lease paperwork and anything shared with you.</div></div>
 <div class="card-b">${[["Signed tenancy agreement.pdf","28 Jan 2026"],["Deposit receipt.pdf","28 Jan 2026"],["Building rules.pdf","01 Feb 2026"]].map(([n,d])=>
 `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-top:1px solid var(--border-soft)">
  <span style="display:flex;gap:9px;align-items:center"><span style="width:15px;height:15px;color:var(--text-3)">${I.file}</span>
  <span><span style="display:block;font-size:13.5px">${n}</span><span class="mini">${d}</span></span></span>
  <button class="btn ghost sm" onclick="toast('Download starting.')">${I.down}</button></div>`).join("")}</div></div>`;

V["tenant-maint"]=()=>`
<div class="anim-down" style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:16px;flex-wrap:wrap">
 <div><h1>Repairs</h1><div class="sub">Report an issue and follow its progress.</div></div>
 <button class="btn" onclick="modalReport()">${I.plus} Report an issue</button></div>
<div class="stagger" style="display:flex;flex-direction:column;gap:12px">
${[MAINT[0],MAINT[3]].map(m=>`<div class="card">
 <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:7px">
  <b style="font-size:13.5px">${m.code}</b><span style="display:flex;gap:6px">${pill(m.pri)}${pill(m.status)}</span></div>
 <p style="font-size:13.5px;color:var(--text-2);line-height:1.6">${m.desc}</p>
 <div class="mini" style="margin-top:6px">Reported ${m.age} days ago · ${m.cat}</div>
 ${m.status==="Assigned"?`<div style="margin-top:9px;background:#fafafa;padding:11px;border-radius:9px;font-size:13px;color:var(--text-2)">
 <b style="color:var(--text)">Latest update:</b> Technician booked for Wednesday afternoon. Rashid Cooling Services will call before arriving.</div>`:""}</div>`).join("")}</div>`;

V["tenant-docs"]=()=>`
<div class="anim-down" style="margin-bottom:16px"><h1>Documents</h1><div class="sub">Everything shared with you by your property manager.</div></div>
<div class="stagger" style="display:flex;flex-direction:column;gap:10px">
${[["Signed tenancy agreement.pdf","Lease","28 Jan 2026"],["Deposit receipt.pdf","Receipt","28 Jan 2026"],
  ["Building rules.pdf","Other","01 Feb 2026"],["Receipt RCP-2026-00051.pdf","Receipt","14 Aug 2026"],
  ["QID copy.pdf","QID","22 Jan 2026"]].map(([n,c,d])=>
`<div class="card" style="display:flex;justify-content:space-between;align-items:center;padding:13px 15px">
 <span style="display:flex;gap:10px;align-items:center"><span style="width:16px;height:16px;color:var(--text-3)">${I.file}</span>
 <span><span style="display:block;font-size:13.5px;font-weight:500">${n}</span><span class="mini">${c} · ${d}</span></span></span>
 <button class="btn ghost sm" onclick="toast('Signed URL generated — download starting.')">${I.down} Download</button></div>`).join("")}</div>`;

/* ===================== owner portal ===================== */
V.owner=()=>`
<div class="anim-down" style="margin-bottom:16px"><div class="mini">Portfolio overview</div><h1>Jassim Al-Thani</h1></div>
<div class="grid g4 stagger" style="margin-bottom:12px">
 ${stat("Properties","1",{icon:I.build})}${stat("Units","16",{sub:"3 vacant",icon:I.home})}
 ${stat("Occupancy","75%",{pct:75,tone:"warn"})}${stat("Open repairs","2",{tone:"warn"})}</div>
<div class="card flat anim-up" style="margin-bottom:12px"><div class="card-h"><div class="card-t">Money this month</div>
 <div class="card-d">August 2026 · rent settled against instalments due in the period.</div></div><div class="card-b">
 <div class="grid g2" style="margin-bottom:12px">${[["Rent received",QAR(96200),"var(--success)"],["Still outstanding",QAR(22300),"var(--warn)"],
  ["Expenses","−"+QAR(4250),""],["Management fees","−"+QAR(9480),""]].map(([l,v,c])=>
 `<div style="display:flex;justify-content:space-between;align-items:center;border:1px solid var(--border);border-radius:9px;padding:11px 13px">
  <span style="font-size:13.5px;color:var(--text-2)">${l}</span><span style="font-size:13.5px;font-weight:550;font-variant-numeric:tabular-nums;color:${c||"var(--text)"}">${v}</span></div>`).join("")}</div>
 <div style="display:flex;justify-content:space-between;align-items:center;background:#141414;color:#fff;padding:13px 16px;border-radius:10px">
  <span style="display:flex;gap:8px;align-items:center;font-weight:550;font-size:13.5px"><span style="width:16px;height:16px">${I.wallet}</span>Net to you</span>
  <b style="font-size:18px;font-variant-numeric:tabular-nums">${QAR(82470)}</b></div>
 <div class="mini" style="margin-top:9px">This is a live view. Your finalised statement for the period is the definitive record.</div></div></div>
<div class="card flat anim-up"><div class="card-h"><div class="card-t">Your properties</div></div><div class="card-b">
 <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0">
 <div><div style="font-weight:550;font-size:13.5px">The Pearl Residences</div><div class="mini">Porto Arabia, The Pearl, Doha</div></div>
 <div style="text-align:right"><div style="font-variant-numeric:tabular-nums;font-size:13.5px">12/16</div><div class="mini">occupied</div></div></div>
 <div class="bar" style="margin-top:0"><i style="width:75%;background:#f59e0b"></i></div></div></div>`;

V["owner-props"]=()=>`
<div class="anim-down" style="margin-bottom:16px"><h1>Properties</h1><div class="sub">1 property · 16 units</div></div>
<div class="card anim-up"><div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start">
 <div><div style="font-weight:550;font-size:14px">The Pearl Residences</div><div class="mini">Porto Arabia, The Pearl, Doha</div></div>
 <span style="font-size:13.5px;font-variant-numeric:tabular-nums">12/16</span></div>
 <div style="display:flex;align-items:center;gap:9px;margin-top:12px">
  <div style="flex:1;height:6px;background:#f0f0f0;border-radius:99px;overflow:hidden"><i style="display:block;height:100%;width:75%;background:#f59e0b;border-radius:99px;animation:grow .8s ease-out both"></i></div>
  <span style="font-size:12px;color:var(--text-2)">75%</span></div>
 <div class="grid g3" style="margin-top:14px">${[["Monthly rent",QAR(118500)],["Vacant units","3"],["Open repairs","2"]].map(([l,v])=>
  `<div style="border:1px solid var(--border);border-radius:9px;padding:10px"><div class="mini">${l}</div><div style="font-size:13.5px;font-weight:550;margin-top:2px">${v}</div></div>`).join("")}</div></div>`;

V["owner-fin"]=()=>`
<div class="anim-down" style="margin-bottom:16px"><h1>Financials</h1><div class="sub">Income, costs and what's owed to you.</div></div>
<div class="card flat anim-up" style="margin-bottom:12px"><div class="card-h"><div class="card-t">This month</div>
 <div class="card-d">Live figures — the finalised statement is the definitive record.</div></div>
 <div class="card-b"><dl class="dl">${[["Rent received",QAR(96200)],["Outstanding rent",QAR(22300)],["Expenses","−"+QAR(4250)],["Management fees","−"+QAR(9480)]]
 .map(([l,v])=>`<div><dt>${l}</dt><dd>${v}</dd></div>`).join("")}
 <div style="font-weight:650"><dt style="color:var(--text)">Net to you</dt><dd>${QAR(82470)}</dd></div></dl></div></div>
<div class="card flat anim-up"><div class="card-h"><div class="card-t">Transaction history</div><div class="card-d">Every movement recorded against your account.</div></div>
 <div class="card-b"><div class="stagger">${[["Rent income","10 Aug 2026","The Pearl Residences",96200],["Management fee","01 Aug 2026","The Pearl Residences",-9480],
 ["Maintenance","08 Aug 2026","AC compressor — Unit 101",-2400],["Expense","10 Aug 2026","Common area electricity",-1850],
 ["Payout","31 Jul 2026","Monthly payout transferred",-104770],["Rent income","10 Jul 2026","The Pearl Residences",118500]].map(([t,d,n,a])=>
 `<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 0;border-top:1px solid var(--border-soft)">
  <div><div style="font-size:13.5px">${t}</div><div class="mini">${d} · ${n}</div></div>
  <span style="font-weight:550;font-variant-numeric:tabular-nums;color:${a>=0?"var(--success)":"var(--text)"}">${a>=0?QAR(a):"−"+QAR(Math.abs(a))}</span></div>`).join("")}</div></div></div>`;

V["owner-stmt"]=()=>`
<div class="anim-down" style="margin-bottom:16px"><h1>Statements</h1><div class="sub">Monthly statements become immutable once finalised. Revisions are issued as a new version.</div></div>
<div class="stagger" style="display:flex;flex-direction:column;gap:12px">
${STATEMENTS.filter(s=>s.owner==="Jassim Al-Thani").map(s=>`<div class="card flat"><div class="card-h">
 <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
  <div class="card-t">${D(s.from)} – ${D(s.to)}</div><span style="display:flex;gap:6px">${s.v>1?`<span class="pill p-info">v${s.v}</span>`:""}${pill(s.status)}</span></div>
 <div class="card-d">Payout ${QAR(s.payout)}</div></div>
<div class="card-b"><dl class="dl">${[["Opening balance",QAR(s.open)],["Rent received",QAR(s.rent)],["Expenses","−"+QAR(s.exp)],
 ["Maintenance","−"+QAR(s.maint)],["Management fees","−"+QAR(s.fee)]].map(([l,v])=>`<div><dt>${l}</dt><dd>${v}</dd></div>`).join("")}
 <div style="font-weight:650"><dt style="color:var(--text)">Closing balance</dt><dd>${QAR(s.close)}</dd></div></dl>
 ${s.status==="Finalised"?`<button class="btn out sm" style="margin-top:11px" onclick="toast('Statement PDF downloaded.')">${I.down} Download PDF</button>`:
 `<div style="margin-top:11px;background:#fafafa;padding:9px 11px;border-radius:8px;font-size:12px;color:var(--text-3)">Draft — your manager hasn't finalised this period yet.</div>`}</div></div>`).join("")}</div>`;

V["owner-maint"]=()=>`
<div class="anim-down" style="margin-bottom:16px"><h1>Repairs</h1><div class="sub">2 open across your properties · 4 total</div></div>
<div class="stagger" style="display:flex;flex-direction:column;gap:12px">
${MAINT.filter(m=>m.prop==="The Pearl Residences").map(m=>`<div class="card">
 <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:7px">
  <b style="font-size:13.5px">${m.code}</b><span style="display:flex;gap:6px">${pill(m.pri)}${pill(m.status)}</span></div>
 <p style="font-size:13.5px;color:var(--text-2);line-height:1.6">${m.desc}</p>
 <div class="mini" style="margin-top:6px">Unit ${m.unit} · ${m.cat} · ${m.age} days ago${m.vendor?" · "+m.vendor:""}</div></div>`).join("")}</div>`;

/* ===================== vendor portal ===================== */
V.vendor=()=>`
<div class="anim-down" style="margin-bottom:16px"><h1>Your jobs</h1><div class="sub">2 open jobs.</div></div>
<div class="grid g3 stagger" style="margin-bottom:14px">${[["New",1],["Scheduled",1],["In progress",0]].map(([l,v])=>
 `<div class="card" style="text-align:center;padding:13px"><div style="font-size:20px;font-weight:650;font-variant-numeric:tabular-nums">${v}</div><div class="mini">${l}</div></div>`).join("")}</div>
<div class="stagger" style="display:flex;flex-direction:column;gap:12px">
<div class="card flat"><div class="card-h"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
 <div class="card-t">MR-0001</div><span style="display:flex;gap:6px">${pill("High")}${pill("Assigned")}</span></div>
 <div class="card-d" style="display:flex;gap:5px;align-items:center"><span style="width:13px;height:13px">${I.pin}</span>The Pearl Residences · Unit 101</div></div>
<div class="card-b"><p style="font-size:13.5px;line-height:1.65;margin-bottom:10px">AC unit in the living room is running but blowing warm air. Started two days ago and gets worse in the afternoon.</p>
 <div style="background:#fafafa;padding:10px;border-radius:9px;font-size:12.5px;color:var(--text-2);margin-bottom:8px"><b style="color:var(--text)">Access:</b> Please call before arriving. Tenant home after 4pm weekdays.</div>
 <div style="background:#fafafa;padding:10px;border-radius:9px;font-size:12.5px;color:var(--text-2);margin-bottom:12px"><b style="color:var(--text)">Instructions:</b> Check compressor and gas levels. Approved spend cap ${QAR(500)}.</div>
 <div style="display:flex;gap:20px;font-size:11.5px;margin-bottom:14px;flex-wrap:wrap">
  <div><div class="muted">Scheduled</div><b>19 Aug, 16:00</b></div><div><div class="muted">Approved cap</div><b>${QAR(500)}</b></div>
  <div><div class="muted">Tenant</div><b>John Smith</b></div></div>
 <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" style="flex:1;min-width:128px" onclick="toast('Job accepted.','ok')">${I.check} Accept job</button>
 <button class="btn out" style="flex:1;min-width:118px" onclick="modalSchedule()">Schedule</button>
 <button class="btn ghost" onclick="modalDecline()">Decline</button></div></div></div>

<div class="card flat"><div class="card-h"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
 <div class="card-t">MR-0005</div><span style="display:flex;gap:6px">${pill("Low")}${pill("Scheduled")}</span></div>
 <div class="card-d" style="display:flex;gap:5px;align-items:center"><span style="width:13px;height:13px">${I.pin}</span>Al Waab Villa Compound · Villa 2</div></div>
<div class="card-b"><p style="font-size:13.5px;line-height:1.65;margin-bottom:12px">Bathroom extractor fan is very noisy, especially first thing in the morning.</p>
 <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn out" style="flex:1;min-width:128px" onclick="toast('Arrival logged at 16:04.','ok')">${I.pin} Mark arrived</button>
 <button class="btn" style="flex:1;min-width:128px" onclick="toast('Work started.','ok')">Work started</button>
 <button class="btn out" onclick="modalComplete()">${I.check} Complete</button></div></div></div></div>`;

V["vendor-done"]=()=>`
<div class="anim-down" style="margin-bottom:16px"><h1>Completed work</h1><div class="sub">5 jobs · ${QAR(4820)} billed</div></div>
<div class="stagger" style="display:flex;flex-direction:column;gap:10px">
${[["MR-0004","Lusail Marina View · 502",680,"12 Aug 2026"],["MR-0009","West Bay Towers · 301",1250,"05 Aug 2026"],
 ["MR-0011","The Pearl Residences · 203",340,"28 Jul 2026"],["MR-0014","Al Sadd Business Center · Office 2",890,"21 Jul 2026"],
 ["MR-0017","The Pearl Residences · 102",1660,"14 Jul 2026"]].map(([c,l,a,d])=>
`<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
 <div><div style="font-weight:550;font-size:13.5px">${c}</div><div class="mini">${l}</div><div class="mini">${d}</div></div>
 <div style="text-align:right"><div style="font-weight:550;font-variant-numeric:tabular-nums">${QAR(a)}</div>
 <div style="margin-top:3px">${pill("Completed")}</div></div></div></div>`).join("")}</div>`;

/* ===================== admin ===================== */
V.admin=()=>`
${head("Platform overview","Every organisation on RentOS, aggregated.")}
<div class="sechead">Accounts</div>
<div class="grid g4 stagger">${stat("Organisations","5",{icon:I.build})}${stat("Active","3",{tone:"success"})}
 ${stat("Trials","1",{tone:"warn"})}${stat("Users","23",{sub:"1 suspended org",icon:I.users})}</div>
<div class="sechead">Under management</div>
<div class="grid g5 stagger">${stat("Properties","31",{icon:I.build})}${stat("Units","325",{sub:"71% occupied",pct:71,icon:I.home})}
 ${stat("Active leases","261",{})}${stat("Monthly rent",QAR(2184000),{sub:"All organisations",icon:I.chart})}
 ${stat("Collection rate","86%",{pct:86,tone:"success"})}</div>
<div class="respcols" style="margin-top:20px">
 <div class="card flat"><div class="card-h"><div class="card-t" style="display:flex;gap:7px;align-items:center"><span style="width:15px;height:15px;color:#a1a1a1">${I.act}</span>Recent platform activity</div>
 <div class="card-d">The most recent audited operations across all organisations.</div></div>
 <div class="card-b">${AUDIT.slice(0,8).map(a=>`<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:8px 0;border-top:1px solid var(--border-soft)">
  <div style="min-width:0"><div style="font-size:13.5px;text-transform:capitalize">${a.act.replace(/[._]/g," ")}</div><div class="mini">${a.org} · ${a.actor}</div></div>
  <span class="mini" style="flex-shrink:0">${DT(a.at)}</span></div>`).join("")}</div></div>
 <div style="display:flex;flex-direction:column;gap:12px">
  <div class="card"><div class="card-t" style="margin-bottom:10px">Operations</div>
   <div style="display:flex;justify-content:space-between;border:1px solid var(--border);border-radius:9px;padding:11px;font-size:13.5px;margin-bottom:8px"><span class="muted">Open maintenance</span><b>34</b></div>
   <div style="border:1px solid var(--border);border-radius:9px;padding:11px;font-size:13.5px;cursor:pointer" onclick="go('admin-orgs')">Manage organisations →</div>
   <div style="border:1px solid var(--border);border-radius:9px;padding:11px;font-size:13.5px;margin-top:8px;cursor:pointer" onclick="go('admin-audit')">Full audit log →</div></div>
  <div class="card"><div class="card-t" style="margin-bottom:10px">Needs attention</div>
   ${[["Lusail Living","Onboarding incomplete"],["Al Khor Property Group","Account suspended"]].map(([n,r])=>
   `<div style="padding:8px 0;border-top:1px solid var(--border-soft)"><div style="font-size:13.5px">${n}</div><span class="pill p-warn" style="margin-top:3px">${r}</span></div>`).join("")}</div></div></div>`;

V["admin-orgs"]=()=>{
  const q=(S.f.orgQ||"").toLowerCase();
  const rows=ORGS.filter(o=>!q||(o.name+o.email).toLowerCase().includes(q));
  return `${head("Organisations","Every property-management company on the platform.")}
<div class="toolbar"><input class="inp" style="width:280px" placeholder="Search name or email…" value="${esc(S.f.orgQ||"")}" oninput="setF('orgQ',this.value)">
${q?`<button class="btn ghost sm" onclick="clearF()">${I.x} Clear</button>`:""}</div>
${rows.length?tbl([{t:"Organisation"},{t:"Plan"},{t:"Members",r:1},{t:"Units",r:1},{t:"Leases",r:1},{t:"Created"},{t:"Status"}],
 rows.map(o=>`<tr><td><span class="link" onclick="go('admin-org')">${o.name}</span><div class="mini">${o.email}</div>
 ${o.onb!=="complete"?`<span class="pill p-warn" style="margin-top:4px">Onboarding: ${o.onb}</span>`:""}</td>
 <td class="muted">${o.plan}</td><td class="num">${o.members}</td><td class="num">${o.units}</td><td class="num">${o.leases}</td>
 <td class="muted">${D(o.created)}</td><td><div style="display:flex;gap:8px;align-items:center">${pill(o.status)}
 <select class="inp" style="height:29px;font-size:12px;width:104px" onchange="toast('${o.name} is now '+this.value.toLowerCase()+'.','ok')">${["Trial","Active","Suspended","Cancelled"].map(s=>`<option${s===o.status?" selected":""}>${s}</option>`).join("")}</select></div></td></tr>`).join(""))
 :empty(I.build,"No organisations match","Try a different search term.",`<button class="btn sm" onclick="clearF()">Clear</button>`)}`;
};

V["admin-org"]=()=>`
${head("Pearl Property Management","pearl-pm · info@pearlpm.qa",
 `${pill("Active")}<select class="inp" style="width:120px">${["Active","Trial","Suspended"].map(s=>`<option>${s}</option>`).join("")}</select>
  <select class="inp" style="width:140px" onchange="toast('Plan changed to '+this.value+'.','ok')">${["Trial","Starter","Growth","Professional","Enterprise"].map(s=>`<option${s==="Growth"?" selected":""}>${s}</option>`).join("")}</select>`,
 `<span class="link" onclick="go('admin-orgs')">Organisations</span><span>Pearl Property Management</span>`)}
<div class="grid g5 stagger" style="margin-bottom:20px">
 ${stat("Properties","5",{icon:I.build})}${stat("Units","54",{icon:I.home})}${stat("Active leases","35",{})}
 ${stat("Tenants","35",{sub:"5 owners",icon:I.users})}${stat("Monthly rent",QAR(361000),{icon:I.wallet})}</div>
<div class="grid g2">
 <div class="card flat"><div class="card-h"><div class="card-t">Members</div><div class="card-d">Everyone with access to this organisation.</div></div>
 <div class="card-b">${tbl([{t:"Name"},{t:"Email"},{t:"Roles"}],
  [["Fatima Al-Sulaiti","admin@pearlpm.qa","Org Admin"],["Ahmed Khalil","manager@pearlpm.qa","Property Manager"],
   ["Mariam Al-Kuwari","accountant@pearlpm.qa","Accountant"],["Jassim Al-Thani","owner@pearlpm.qa","Property Owner"]]
  .map(([n,e,r])=>`<tr><td>${n}</td><td class="muted">${e}</td><td><span class="pill p-outline">${r}</span></td></tr>`).join(""))}</div></div>
 <div class="card flat"><div class="card-h"><div class="card-t">Recent audit events</div>
 <div class="card-d">Read-only. Inspecting activity never grants access to this organisation's records.</div></div>
 <div class="card-b">${AUDIT.filter(a=>a.org==="Pearl Property Management").map(a=>
  `<div style="display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-top:1px solid var(--border-soft);font-size:13.5px">
   <span style="text-transform:capitalize">${a.act.replace(/[._]/g," ")}</span><span class="mini" style="flex-shrink:0">${DT(a.at)}</span></div>`).join("")}</div></div></div>`;

V["admin-users"]=()=>{
  const q=(S.f.userQ||"").toLowerCase();
  const rows=PLATFORM_USERS.filter(u=>!q||(u.name+u.email).toLowerCase().includes(q));
  return `${head("Users","Every account on the platform and the organisations they belong to.")}
<div class="toolbar"><input class="inp" style="width:280px" placeholder="Search name or email…" value="${esc(S.f.userQ||"")}" oninput="setF('userQ',this.value)">
${q?`<button class="btn ghost sm" onclick="clearF()">${I.x} Clear</button>`:""}</div>
${tbl([{t:"Name"},{t:"Email"},{t:"Organisations"},{t:"Joined"},{t:"Platform access"}],
 rows.map(u=>`<tr><td><b>${u.name}</b></td><td class="muted">${u.email}</td><td class="muted">${u.orgs}</td>
 <td class="muted">${D(u.created)}</td><td>${u.sa?'<span class="pill p-danger">Super admin</span>':'<span class="mini">Standard</span>'}</td></tr>`).join(""))}`;
};

V["admin-subs"]=()=>`
${head("Subscriptions","Plan assignment and usage against plan limits.")}
${tbl([{t:"Organisation"},{t:"Status"},{t:"Units used",r:1},{t:"Unit limit",r:1},{t:"Plan"}],
 ORGS.map(o=>{const lim={Trial:25,Starter:50,Growth:200,Professional:750,Enterprise:null}[o.plan];
 const over=lim&&o.units>lim;return `<tr><td><span class="link" onclick="go('admin-org')">${o.name}</span></td>
 <td>${pill(o.status)}</td><td class="num" style="${over?"color:var(--danger);font-weight:600":""}">${o.units}</td>
 <td class="num muted">${lim??"Unlimited"}</td>
 <td><select class="inp" style="height:29px;font-size:12px;width:130px" onchange="toast(this.value+' plan assigned to ${o.name}.','ok')">${["Trial","Starter","Growth","Professional","Enterprise"].map(p=>`<option${p===o.plan?" selected":""}>${p}</option>`).join("")}</select></td></tr>`}).join(""))}`;

V["admin-plans"]=()=>`
${head("Plans","Subscription tiers and the limits they impose. Assign a plan from an organisation's page.")}
<div class="grid g3 stagger">${[["Trial","Free","25","3","500 MB",[]],["Starter",QAR(499),"50","5","2 GB",["online payments"]],
 ["Growth",QAR(1499),"200","15","10 GB",["online payments","whatsapp","advanced reporting"]],
 ["Professional",QAR(3999),"750","40","50 GB",["online payments","whatsapp","advanced reporting"]],
 ["Enterprise","Custom","Unlimited","Unlimited","Unlimited",["online payments","whatsapp","advanced reporting","white label"]]].map(([n,p,u,us,st,f])=>
`<div class="card" style="transition:transform .18s,box-shadow .18s" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 18px rgba(0,0,0,.055)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
 <div class="card-t" style="display:flex;gap:7px;align-items:center"><span style="width:15px;height:15px;color:#a1a1a1">${I.card}</span>${n}</div>
 <div class="card-d" style="margin-top:3px">${p==="Free"||p==="Custom"?p:p+" / month"}</div>
 <dl class="dl" style="margin-top:10px"><div><dt>Max units</dt><dd>${u}</dd></div><div><dt>Max users</dt><dd>${us}</dd></div><div><dt>Storage</dt><dd>${st}</dd></div></dl>
 <div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:4px">${f.map(x=>`<span class="pill p-outline">${x}</span>`).join("")||'<span class="mini">Core features only</span>'}</div></div>`).join("")}</div>
<p style="margin-top:16px;font-size:12.5px;color:var(--text-3);max-width:640px;line-height:1.6">Billing provider integration is not configured, so plans are assigned manually by a platform administrator — which is the intended workflow until a billing provider is connected.</p>`;

V["admin-audit"]=()=>{
  const q=(S.f.audQ||"").toLowerCase();
  const rows=AUDIT.filter(a=>!q||(a.act+a.ent+a.org+a.actor).toLowerCase().includes(q));
  return `${head("Audit log","Critical operations across every organisation: who did what, to which record, and when.")}
<div class="toolbar"><input class="inp" style="width:280px" placeholder="Search action, entity or actor…" value="${esc(S.f.audQ||"")}" oninput="setF('audQ',this.value)">
<button class="btn out sm" onclick="toast('Audit log exported.')">${I.up} Export</button>
${q?`<button class="btn ghost sm" onclick="clearF()">${I.x} Clear</button>`:""}
<span style="margin-left:auto;font-size:12px;color:var(--text-3)">${rows.length} of ${AUDIT.length}</span></div>
${rows.length?tbl([{t:"When"},{t:"Organisation"},{t:"Actor"},{t:"Action"},{t:"Entity"}],
 rows.map(a=>`<tr><td class="muted" style="white-space:nowrap">${DT(a.at)}</td><td>${a.org}</td>
 <td class="muted">${a.actor}</td><td><b>${a.act}</b></td><td class="muted">${a.ent}</td></tr>`).join(""))
 :empty(I.act,"No audit entries match","Try a different search term.",`<button class="btn sm" onclick="clearF()">Clear</button>`)}`;
};

V["admin-int"]=()=>`
${head("Integrations","External providers and their configuration status on this deployment.")}
<div class="stagger" style="display:flex;flex-direction:column;gap:12px;max-width:820px">
${[["Payment provider","Card and wallet payments from the tenant portal, with webhook-driven reconciliation.",
 ["Provider abstraction interface","Webhook endpoint with signature verification","Idempotent event storage","Payment + allocation on confirmed events"],
 ["PAYMENT_PROVIDER","PAYMENT_PROVIDER_API_KEY","PAYMENT_PROVIDER_WEBHOOK_SECRET"]],
["Transactional email","Invitations, password resets, receipts, reminders and renewal offers.",
 ["Provider abstraction","communication_logs storage","Invitation link fallback when unconfigured"],
 ["EMAIL_PROVIDER","RESEND_API_KEY","EMAIL_FROM_ADDRESS"]],
["WhatsApp Business API","Rent reminders and maintenance updates over WhatsApp.",
 ["Channel modelled in notification_channel enum","communication_logs supports whatsapp"],
 ["WHATSAPP_PROVIDER_TOKEN","WHATSAPP_PHONE_NUMBER_ID"]]].map(([t,d,built,vars])=>
`<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
 <div class="card-t" style="display:flex;gap:7px;align-items:center"><span style="width:15px;height:15px;color:#a1a1a1">${I.plug}</span>${t}</div>
 <span class="pill p-neutral">Awaiting credentials</span></div><div class="card-d" style="margin-top:5px">${d}</div>
 <div style="margin-top:12px"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--text-3);margin-bottom:6px">Already built</div>
 ${built.map(b=>`<div style="display:flex;gap:7px;align-items:flex-start;font-size:13px;color:var(--text-2);margin-bottom:3px"><span style="width:4px;height:4px;border-radius:50%;background:#a1a1a1;margin-top:8px;flex-shrink:0"></span>${b}</div>`).join("")}</div>
 <div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:4px">${vars.map(v=>`<code style="background:#f4f4f4;border-radius:4px;padding:2px 6px;font-size:10.5px">${v}</code>`).join("")}</div></div>`).join("")}
<div class="card" style="background:#fafafa"><div style="font-size:13px;color:var(--text-2);line-height:1.6">
RentOS never simulates an external transaction. When a provider has no credentials the surrounding workflow still works — payments can be recorded manually, invitations produce a shareable link — but nothing is reported as sent or charged when it wasn't.</div></div></div>`;

V["admin-support"]=()=>`
${head("Support","Accounts showing signs of being stuck, so someone can reach out before they churn.")}
${tbl([{t:"Organisation"},{t:"Contact"},{t:"Signed up"},{t:"Signals"},{t:"Status"}],
 [["Lusail Living","hello@lusailliving.qa","2026-08-11",["Onboarding incomplete","No units added","Single user"],"Trial"],
  ["Al Khor Property Group","info@alkhorpg.qa","2026-05-27",["Account suspended"],"Suspended"]]
 .map(([n,e,d,sig,st])=>`<tr><td><span class="link" onclick="go('admin-org')">${n}</span></td><td class="muted">${e}</td>
 <td class="muted">${D(d)}</td><td>${sig.map(s=>`<span class="pill p-warn" style="margin:1px 3px 1px 0">${s}</span>`).join("")}</td><td>${pill(st)}</td></tr>`).join(""))}`;

V["admin-settings"]=()=>`
${head("Platform settings","Defaults that apply across every organisation unless overridden.")}
<div class="card" style="max-width:620px;margin-bottom:12px"><div class="card-t">Feature flags</div>
 <div class="card-d" style="margin-bottom:4px">Platform-wide defaults. An organisation's plan may still gate a feature enabled here.</div>
 ${[["online payments","Expose online card payments in tenant portals.",false],["whatsapp","Allow WhatsApp as a notification channel.",false],
  ["ai document extraction","Extract data from uploaded documents automatically.",false],["white label","Per-organisation branding on portals and emails.",false],
  ["advanced reporting","Extended report set and scheduled exports.",true]].map(([k,d,on])=>
 `<div style="display:flex;justify-content:space-between;align-items:center;gap:14px;padding:12px 0;border-top:1px solid var(--border-soft)">
  <div><div style="font-size:13.5px;font-weight:500;text-transform:capitalize">${k}</div><div class="mini">${d}</div></div>
  <button role="switch" aria-checked="${on}" style="position:relative;width:36px;height:20px;border-radius:99px;background:${on?"#10b981":"#e5e5e5"};flex-shrink:0;transition:background .2s" onclick="toast('${k} toggled.','ok')">
   <span style="position:absolute;top:2px;left:${on?"18px":"2px"};width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.2);transition:left .2s"></span></button></div>`).join("")}</div>
<div class="card" style="max-width:620px"><div class="card-t">Deployment</div><div class="card-d" style="margin-bottom:10px">Read-only view of how this instance is configured.</div>
 <dl class="dl">${[["Product name","RentOS"],["Default currency","QAR"],["Default timezone","Asia/Qatar"],["Supported locales","en, ar"],["Database","Supabase PostgreSQL 17"]]
 .map(([l,v])=>`<div><dt>${l}</dt><dd style="font-size:12px">${v}</dd></div>`).join("")}</dl></div>`;
