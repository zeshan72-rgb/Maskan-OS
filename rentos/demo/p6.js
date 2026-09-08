/* ===================== state ===================== */
const S={f:{},tab:{},wizard:{step:0,prop:"",unit:"",tenant:"",start:"2026-09-01",end:"2027-08-31",rent:"9500",freq:"Monthly"},
  imp:{step:0,type:"Properties"},notifOpen:false,cmdOpen:false,cmdQ:"",cmdIdx:0};

function setF(k,v){S.f[k]=v;const a=document.activeElement,id=a&&a.getAttribute&&a.getAttribute("oninput")?k:null;render();
  if(id){const el=document.querySelector(`[oninput*="'${k}'"]`);if(el){el.focus();el.setSelectionRange(el.value.length,el.value.length)}}}
function clearF(){S.f={};render()}
function setTab(k,v){S.tab[k]=v;render()}
function setW(k,v){S.wizard[k]=v;render()}
function wizStep(d){S.wizard.step=Math.max(0,Math.min(5,S.wizard.step+d));render()}
function setImp(k,v){S.imp[k]=v;render()}
function impStep(d){S.imp.step=Math.max(0,Math.min(3,S.imp.step+d));render()}

/* ===================== toast ===================== */
function toast(msg,kind){
  const t=document.createElement("div");
  t.className="toast"+(kind==="ok"?" ok":kind==="err"?" err":"");
  t.innerHTML=(kind==="ok"?I.check:kind==="err"?I.x:"")+"<span>"+esc(msg)+"</span>";
  document.getElementById("toasts").appendChild(t);
  setTimeout(()=>{t.style.transition="opacity .3s,transform .3s";t.style.opacity="0";t.style.transform="translateX(20px)";
    setTimeout(()=>t.remove(),320)},2900);
}
function copyIt(v,l){navigator.clipboard?.writeText(v).then(()=>toast(l+" copied","ok")).catch(()=>toast(l+" copied","ok"))}

/* ===================== modal ===================== */
function closeModal(){document.getElementById("layer").innerHTML=""}
function openModal(html,wide){
  document.getElementById("layer").innerHTML=`<div class="ovl" onclick="if(event.target===this)closeModal()">
   <div class="modal ${wide?"wide":""}" style="position:relative">
   <button class="xclose" onclick="closeModal()">${I.x}</button>${html}</div></div>`;
}
const mhead=(t,d)=>`<div class="modal-h"><div class="modal-t">${t}</div>${d?`<div class="modal-d">${d}</div>`:""}</div>`;
const mfoot=(primary,label="Cancel")=>`<div class="modal-f"><button class="btn out" onclick="closeModal()">${label}</button>${primary}</div>`;
const done=(msg)=>{closeModal();toast(msg,"ok")};

function modalPayment(){
  const inst=SCHEDULE.filter(s=>s.out>0);
  openModal(`${mhead("Record a payment","Payments are stored separately from rent obligations and linked by allocations, so partial payments reduce the balance without marking an instalment paid.")}
  <div class="modal-b"><div class="grid g2" style="margin-bottom:12px">
   <label class="fld"><span>Amount (QAR) *</span><input class="inp" id="payAmt" type="number" value="5000" oninput="allocPreview()"></label>
   <label class="fld"><span>Method *</span><select class="inp">${["Bank transfer","Post-dated cheque","Cash / manual","Online payment","Other"].map(o=>`<option>${o}</option>`).join("")}</select></label>
   <label class="fld"><span>Date received *</span><input class="inp" type="date" value="2026-08-18"></label>
   <label class="fld"><span>Reference</span><input class="inp" placeholder="Transfer reference"></label></div>
  <div style="border:1px solid var(--border);border-radius:10px;overflow:hidden;margin-bottom:12px">
   <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 12px;background:#fafafa;border-bottom:1px solid var(--border);font-size:12px">
    <b>Allocation · ${QAR(inst.reduce((s,i)=>s+i.out,0))} outstanding</b><span class="muted">Oldest first</span></div>
   <div id="allocList"></div></div>
  <label class="fld"><span>Internal note</span><textarea class="inp" placeholder="Context for the finance team…"></textarea></label></div>
  ${mfoot(`<button class="btn" onclick="done('Payment recorded and allocated. Receipt RCP-2026-00052.')">Record payment</button>`)}`,1);
  allocPreview();
}
function allocPreview(){
  const amt=+(document.getElementById("payAmt")?.value||0);
  let rem=amt;const rows=[];
  for(const s of SCHEDULE.filter(x=>x.out>0)){
    if(rem<=0)break;const ap=Math.min(rem,s.out);rem-=ap;
    rows.push(`<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 12px;border-top:1px solid var(--border-soft);font-size:13px">
     <span class="muted">#${s.n} · ${D(s.due)}</span>
     <span style="display:flex;gap:9px;align-items:center"><span style="font-variant-numeric:tabular-nums">${QAR(ap)}</span>
     <span style="font-size:11.5px;color:${ap>=s.out?"var(--success)":"var(--warn)"}">${ap>=s.out?"settles":"partial"}</span></span></div>`);
  }
  const box=document.getElementById("allocList");if(!box)return;
  box.innerHTML=rows.length?rows.join("")+(rem>0?`<div style="padding:9px 12px;background:#fffbeb;color:#92400e;font-size:11.5px;border-top:1px solid #fde68a">${QAR(rem)} of this payment won't be allocated to any instalment.</div>`:"")
   :`<div style="padding:14px 12px;font-size:13px;color:var(--text-3)">Enter an amount to preview the allocation.</div>`;
}
function modalVerify(){openModal(`${mhead("Confirm this payment?","The amount will be allocated to outstanding rent, oldest first, and a receipt will be issued.")}
 <div class="modal-b"><div class="grid g2">
  <label class="fld"><span>Confirmed amount (QAR)</span><input class="inp" type="number" value="9500"><div class="hint">Adjust if the receipt shows a different figure.</div></label>
  <label class="fld"><span>Bank reference</span><input class="inp" placeholder="QNB-…"></label></div></div>
 ${mfoot(`<button class="btn" onclick="done('Payment confirmed. Receipt RCP-2026-00052.')">Confirm payment</button>`)}`)}
function modalReject(){openModal(`${mhead("Reject this payment?","The tenant will be notified with your reason and no rent balance will change.")}
 <div class="modal-b"><label class="fld"><span>Reason</span><textarea class="inp" placeholder="No matching transfer found on the bank statement…"></textarea><div class="hint">Shown to the tenant.</div></label></div>
 ${mfoot(`<button class="btn danger" onclick="done('Payment rejected and the tenant notified.')">Reject payment</button>`)}`)}
function modalRenewal(){openModal(`${mhead("Offer a renewal","The tenant is notified and can accept, decline, or ask to discuss. Accepting creates the successor lease automatically, keeping this lease's history intact.")}
 <div class="modal-b"><div class="grid g2">
  <label class="fld"><span>New start date *</span><input class="inp" type="date" value="2027-02-01"></label>
  <label class="fld"><span>New end date *</span><input class="inp" type="date" value="2028-01-31"></label>
  <label class="fld"><span>New monthly rent (QAR) *</span><input class="inp" type="number" value="9900"></label>
  <label class="fld"><span>New deposit (QAR)</span><input class="inp" type="number" placeholder="Unchanged"></label>
  <label class="fld" style="grid-column:1/-1"><span>Message to tenant</span><textarea class="inp" placeholder="We'd be glad to renew your tenancy…"></textarea></label></div></div>
 ${mfoot(`<button class="btn" onclick="done('Renewal offer sent to John Smith.')">Send offer</button>`)}`)}
function modalTerminate(){openModal(`${mhead("Terminate this lease?","The unit will be marked vacant. Any outstanding rent stays on record — terminating a lease doesn't clear what's owed.")}
 <div class="modal-b"><label class="fld"><span>Reason</span><textarea class="inp" placeholder="Mutual agreement, tenant relocation, breach of terms…"></textarea></label></div>
 ${mfoot(`<button class="btn danger" onclick="done('Lease terminated. Outstanding balances kept.')">Terminate lease</button>`)}`)}
function modalProperty(edit){openModal(`${mhead(edit?"Edit property":"Add property","Create a property, then add its units.")}
 <div class="modal-b"><div class="grid g2">
  <label class="fld"><span>Property name *</span><input class="inp" value="${edit?"The Pearl Residences":""}" placeholder="The Pearl Residences"></label>
  <label class="fld"><span>Property code *</span><input class="inp" value="${edit?"PROP-001":""}" placeholder="PROP-006"><div class="hint">Unique within your organisation.</div></label>
  <label class="fld"><span>Type *</span><select class="inp">${["Residential","Commercial","Mixed Use","Villa Compound","Building","Other"].map(o=>`<option>${o}</option>`).join("")}</select></label>
  <label class="fld"><span>Owner</span><select class="inp">${["No owner selected",...OWNERS.map(o=>o.name)].map(o=>`<option>${o}</option>`).join("")}</select></label>
  <label class="fld" style="grid-column:1/-1"><span>Address</span><input class="inp" value="${edit?"Porto Arabia, The Pearl, Doha":""}" placeholder="Porto Arabia, The Pearl, Doha"></label>
  <label class="fld"><span>Management fee type</span><select class="inp">${["Percentage of rent","Flat monthly amount","Custom"].map(o=>`<option>${o}</option>`).join("")}</select></label>
  <label class="fld"><span>Fee value</span><input class="inp" type="number" value="8"></label></div></div>
 ${mfoot(`<button class="btn" onclick="done('${edit?"Property updated.":"Property created."}')">${edit?"Save changes":"Create property"}</button>`)}`,1)}
function modalUnit(no){openModal(`${mhead(no?"Edit unit "+no:"Add unit","Add a rentable unit to this property.")}
 <div class="modal-b"><div class="grid g2">
  <label class="fld"><span>Unit number *</span><input class="inp" value="${no||""}" placeholder="305"></label>
  <label class="fld"><span>Floor</span><input class="inp" placeholder="3"></label>
  <label class="fld"><span>Bedrooms</span><input class="inp" type="number" placeholder="2"></label>
  <label class="fld"><span>Bathrooms</span><input class="inp" type="number" placeholder="2"></label>
  <label class="fld"><span>Area (m²)</span><input class="inp" type="number" placeholder="130"></label>
  <label class="fld"><span>Furnishing</span><select class="inp">${["Unfurnished","Semi-furnished","Furnished"].map(o=>`<option>${o}</option>`).join("")}</select></label>
  <label class="fld"><span>Market rent (QAR)</span><input class="inp" type="number" placeholder="9500"></label>
  <label class="fld"><span>Status</span><select class="inp">${["Vacant","Occupied","Reserved","Maintenance","Inactive"].map(o=>`<option>${o}</option>`).join("")}</select></label></div></div>
 ${mfoot(`<button class="btn" onclick="done('${no?"Unit updated.":"Unit added."}')">${no?"Save unit":"Add unit"}</button>`)}`,1)}
function modalTenant(){openModal(`${mhead("Add tenant","Create the tenant record, then place them in a unit with a lease.")}
 <div class="modal-b"><div class="grid g2">
  <label class="fld"><span>Full name *</span><input class="inp" placeholder="John Smith"></label>
  <label class="fld"><span>QID / Passport</span><input class="inp"></label>
  <label class="fld"><span>Nationality</span><input class="inp"></label>
  <label class="fld"><span>Employer</span><input class="inp"></label>
  <label class="fld"><span>Phone</span><input class="inp" placeholder="+974 5555 1234"></label>
  <label class="fld"><span>Email</span><input class="inp" type="email"><div class="hint">Used to invite them to the tenant portal.</div></label></div></div>
 ${mfoot(`<button class="btn" onclick="done('Tenant created.')">Create tenant</button>`)}`,1)}
function modalOwner(){openModal(`${mhead("Add owner","Create the owner record before linking properties to them.")}
 <div class="modal-b"><div class="grid g2">
  <label class="fld"><span>Owner type *</span><select class="inp"><option>Individual</option><option>Company</option></select></label>
  <label class="fld"><span>Name *</span><input class="inp" placeholder="Jassim Al-Thani"></label>
  <label class="fld"><span>QID / CR number</span><input class="inp"></label>
  <label class="fld"><span>Phone</span><input class="inp"></label>
  <label class="fld" style="grid-column:1/-1"><span>Email</span><input class="inp" type="email"><div class="hint">Used to invite them to the owner portal.</div></label></div></div>
 ${mfoot(`<button class="btn" onclick="done('Owner created.')">Create owner</button>`)}`,1)}
function modalExpense(){openModal(`${mhead("Record a property expense","Expenses only reach owner statements once approved, so nothing is deducted by accident.")}
 <div class="modal-b"><div class="grid g2">
  <label class="fld"><span>Property *</span><select class="inp">${["Select…",...PROPS.map(p=>p.name)].map(o=>`<option>${o}</option>`).join("")}</select></label>
  <label class="fld"><span>Category</span><select class="inp">${["Maintenance & Repairs","Utilities","Insurance","Management Fee","Cleaning","Security","Legal & Compliance","Other"].map(o=>`<option>${o}</option>`).join("")}</select></label>
  <label class="fld"><span>Amount (QAR) *</span><input class="inp" type="number"></label>
  <label class="fld"><span>Date *</span><input class="inp" type="date" value="2026-08-18"></label>
  <label class="fld" style="grid-column:1/-1"><span>Vendor</span><select class="inp">${["No vendor",...VENDORS.map(v=>v.name)].map(o=>`<option>${o}</option>`).join("")}</select></label>
  <label class="fld" style="grid-column:1/-1"><span>Description *</span><textarea class="inp" placeholder="Common area electricity — August"></textarea></label></div></div>
 ${mfoot(`<button class="btn" onclick="done('Expense recorded and awaiting approval.')">Record expense</button>`)}`,1)}
function modalStatement(){openModal(`${mhead("Generate an owner statement","Figures are computed from rent settled, approved expenses and management fees in the period. It saves as a draft so you can review before finalising.")}
 <div class="modal-b"><label class="fld" style="margin-bottom:12px"><span>Owner *</span><select class="inp">${["Select an owner…",...OWNERS.map(o=>o.name)].map(o=>`<option>${o}</option>`).join("")}</select></label>
 <div class="grid g2"><label class="fld"><span>Period start *</span><input class="inp" type="date" value="2026-08-01"></label>
 <label class="fld"><span>Period end *</span><input class="inp" type="date" value="2026-08-31"></label></div></div>
 ${mfoot(`<button class="btn" onclick="done('Statement v1 generated — payout QAR 82,470.')">Generate draft</button>`)}`)}
function modalCheque(rep){openModal(`${mhead(rep?"Record replacement cheque":"Record a cheque",rep?"The original will be marked replaced, preserving its history.":"Link it to a lease and optionally to a specific rent instalment.")}
 <div class="modal-b"><div class="grid g2">
  <label class="fld"><span>Cheque number *</span><input class="inp" placeholder="CHQ123456"></label>
  <label class="fld"><span>Bank *</span><input class="inp" placeholder="Qatar National Bank"></label>
  <label class="fld"><span>Payer *</span><input class="inp" placeholder="Tenant name"></label>
  <label class="fld"><span>Amount (QAR) *</span><input class="inp" type="number" value="${rep?54000:""}"></label>
  <label class="fld"><span>Cheque date *</span><input class="inp" type="date"></label>
  <label class="fld"><span>Received date *</span><input class="inp" type="date" value="2026-08-18"></label>
  <label class="fld" style="grid-column:1/-1"><span>Lease *</span><select class="inp">${LEASES.slice(0,8).map(l=>`<option>${l.id} · ${l.tenant}</option>`).join("")}</select></label>
  <label class="fld" style="grid-column:1/-1"><span>Internal notes</span><textarea class="inp"></textarea></label></div></div>
 ${mfoot(`<button class="btn" onclick="done('${rep?"Replacement recorded; original marked replaced.":"Cheque recorded."}')">Record cheque</button>`)}`,1)}
function modalMaint(){openModal(`${mhead("Raise a maintenance request","Log an issue on behalf of a tenant or from an inspection.")}
 <div class="modal-b"><div class="grid g2">
  <label class="fld"><span>Property *</span><select class="inp">${PROPS.map(p=>`<option>${p.name}</option>`).join("")}</select></label>
  <label class="fld"><span>Unit *</span><select class="inp">${UNITS.map(u=>`<option>${u.no}</option>`).join("")}</select></label>
  <label class="fld"><span>Category</span><select class="inp">${["Plumbing","Electrical","HVAC / AC","Appliances","Structural","Pest Control","Cleaning","Locks & Security","Other"].map(o=>`<option>${o}</option>`).join("")}</select></label>
  <label class="fld"><span>Priority *</span><select class="inp">${["Low","Normal","High","Emergency"].map(o=>`<option${o==="Normal"?" selected":""}>${o}</option>`).join("")}</select></label>
  <label class="fld" style="grid-column:1/-1"><span>Description *</span><textarea class="inp" placeholder="Describe the issue…"></textarea></label></div></div>
 ${mfoot(`<button class="btn" onclick="done('Request MR-0008 submitted.')">Submit request</button>`)}`,1)}
function modalAssign(){openModal(`${mhead("Create a work order","The assigned vendor sees only this job — never other requests in your portfolio.")}
 <div class="modal-b"><label class="fld" style="margin-bottom:12px"><span>Vendor</span><select class="inp">${["No vendor — internal team",...VENDORS.map(v=>v.name+" · "+v.trade)].map(o=>`<option>${o}</option>`).join("")}</select></label>
 <div class="grid g2"><label class="fld"><span>Scheduled for</span><input class="inp" type="datetime-local"></label>
 <label class="fld"><span>Estimated cost (QAR)</span><input class="inp" type="number" value="350"></label>
 <label class="fld" style="grid-column:1/-1"><span>Approved spend cap (QAR)</span><input class="inp" type="number" value="500"><div class="hint">Vendor shouldn't exceed this without approval.</div></label>
 <label class="fld" style="grid-column:1/-1"><span>Instructions to vendor</span><textarea class="inp" placeholder="Access arrangements, parts to bring…"></textarea></label></div></div>
 ${mfoot(`<button class="btn" onclick="done('Work order created and assigned.')">Assign job</button>`)}`,1)}
function modalInvite(){openModal(`${mhead("Invite a team member","They'll set their own password on acceptance. Invitations expire after 7 days and work once.")}
 <div class="modal-b"><label class="fld" style="margin-bottom:12px"><span>Email address *</span><input class="inp" type="email" placeholder="colleague@company.qa"></label>
 <label class="fld"><span>Role *</span><select class="inp">${["Select a role…","Organisation Admin","Property Manager","Accountant","Maintenance Manager","Staff","Property Owner","Tenant","Vendor"].map(o=>`<option>${o}</option>`).join("")}</select></label>
 <div style="margin-top:12px;background:#fffbeb;border:1px solid #fde68a;color:#92400e;padding:10px;border-radius:9px;font-size:12.5px">
 No email provider is configured, so nothing will be sent — you'll get a shareable invitation link instead.</div></div>
 ${mfoot(`<button class="btn" onclick="done('Invitation created — link copied to clipboard.')">Send invitation</button>`)}`)}
function modalProof(){openModal(`${mhead("Tell us about your transfer","Your account team will check it against the bank statement and confirm it. Nothing changes on your balance until they do.")}
 <div class="modal-b"><label class="fld" style="margin-bottom:12px"><span>Amount transferred (QAR) *</span><input class="inp" type="number" value="3800"></label>
 <label class="fld" style="margin-bottom:12px"><span>Date of transfer *</span><input class="inp" type="date" value="2026-08-18"></label>
 <label class="fld" style="margin-bottom:12px"><span>Bank reference</span><input class="inp" value="LEASE-0001"><div class="hint">Please quote "LEASE-0001" on the transfer if you haven't already.</div></label>
 <div style="border:1px dashed #d8d8d8;border-radius:10px;padding:20px;text-align:center">
  <div style="width:26px;height:26px;margin:0 auto 7px;color:#d4d4d4">${I.upload}</div>
  <div style="font-size:13px;font-weight:500">Attach your receipt</div><div class="mini">PDF, JPG or PNG</div></div></div>
 ${mfoot(`<button class="btn" onclick="done('Payment proof submitted — your account team will verify it shortly.')">Submit proof</button>`)}`)}
function modalReport(){openModal(`${mhead("Report a maintenance issue","Tell us what's wrong and when it suits you for someone to visit.")}
 <div class="modal-b"><div class="grid g2">
  <label class="fld"><span>Type of issue</span><select class="inp">${["Not sure","Plumbing","Electrical","HVAC / AC","Appliances","Locks & Security","Other"].map(o=>`<option>${o}</option>`).join("")}</select></label>
  <label class="fld"><span>How urgent?</span><select class="inp">${["Low","Normal","High","Emergency"].map(o=>`<option${o==="Normal"?" selected":""}>${o}</option>`).join("")}</select></label>
  <label class="fld" style="grid-column:1/-1"><span>What's the problem? *</span><textarea class="inp" placeholder="The AC in the living room is running but blowing warm air…"></textarea></label>
  <label class="fld"><span>Best time to visit</span><input class="inp" placeholder="Weekday mornings"></label>
  <label class="fld"><span>Access notes</span><input class="inp" placeholder="Please call before arriving"></label></div></div>
 ${mfoot(`<button class="btn" onclick="done('Request MR-0008 submitted.')">Submit request</button>`)}`,1)}
function modalSchedule(){openModal(`${mhead("Schedule your visit","The tenant and property manager can see this time.")}
 <div class="modal-b"><label class="fld"><span>Date and time *</span><input class="inp" type="datetime-local" value="2026-08-19T16:00"></label></div>
 ${mfoot(`<button class="btn" onclick="done('Visit scheduled for 19 Aug, 16:00.')">Confirm time</button>`)}`)}
function modalDecline(){openModal(`${mhead("Decline this job?","The request goes back to the property manager to reassign. Please say why so they can act quickly.")}
 <div class="modal-b"><label class="fld"><span>Reason *</span><textarea class="inp" placeholder="No availability this week / outside our trade / parts unavailable…"></textarea></label></div>
 ${mfoot(`<button class="btn danger" onclick="done('Job declined — the manager has been notified.')">Decline job</button>`)}`)}
function modalComplete(){openModal(`${mhead("Complete this job","Record what the work actually cost and describe what you did.")}
 <div class="modal-b"><label class="fld" style="margin-bottom:12px"><span>Final cost (QAR) *</span><input class="inp" type="number" placeholder="420"><div class="hint">Approved cap is QAR 500.</div></label>
 <label class="fld"><span>Work performed *</span><textarea class="inp" placeholder="Replaced the compressor capacitor, tested cooling, cleaned filters…"></textarea></label></div>
 ${mfoot(`<button class="btn" onclick="done('Job marked complete.')">Mark complete</button>`)}`)}

/* ===================== command menu ===================== */
const ACTIONS=[["Create tenant","tenants",I.users],["Create lease","lease-new",I.file],["Add property","properties",I.build],
 ["Add owner","owners",I.user],["Record payment","payments",I.receipt],["View cheques","cheques",I.bank],
 ["Maintenance requests","maintenance",I.wrench],["Outstanding rent","outstanding",I.chart],["Import data","import",I.upload],
 ["Reports","reports",I.chart],["Settings","settings",I.cog]];
function cmdResults(q){
  const t=q.trim().toLowerCase();
  const acts=ACTIONS.filter(a=>!t||a[0].toLowerCase().includes(t));
  if(t.length<2)return[{g:"Actions",items:acts.map(a=>({l:a[0],s:null,r:a[1],i:a[2]}))}];
  const G=[];
  if(acts.length)G.push({g:"Actions",items:acts.map(a=>({l:a[0],s:null,r:a[1],i:a[2]}))});
  const add=(g,arr,i)=>{if(arr.length)G.push({g,items:arr.slice(0,5).map(x=>({...x,i}))})};
  add("Tenants",TENANTS.filter(x=>(x.name+x.phone+x.qid+x.email).toLowerCase().includes(t)).map(x=>({l:x.name,s:x.phone+" · "+x.qid,r:"tenant-detail"})),I.users);
  add("Properties",PROPS.filter(x=>(x.name+x.code+x.addr).toLowerCase().includes(t)).map(x=>({l:x.name,s:x.code+" · "+x.addr,r:"property"})),I.build);
  add("Units",UNITS.filter(x=>x.no.toLowerCase().includes(t)).map(x=>({l:"Unit "+x.no,s:"The Pearl Residences · "+x.status,r:"units"})),I.home);
  add("Owners",OWNERS.filter(x=>(x.name+x.idn+x.email).toLowerCase().includes(t)).map(x=>({l:x.name,s:x.idn,r:"owner-detail"})),I.user);
  add("Leases",LEASES.filter(x=>(x.id+x.tenant).toLowerCase().includes(t)).map(x=>({l:x.id,s:x.tenant+" · "+x.status,r:"lease"})),I.file);
  add("Cheques",CHEQUES.filter(x=>(x.no+x.bank+x.payer).toLowerCase().includes(t)).map(x=>({l:x.no,s:x.bank+" · "+QAR(x.amt),r:"cheque"})),I.bank);
  add("Payments",PAYMENTS.filter(x=>(x.ref+x.tenant).toLowerCase().includes(t)).map(x=>({l:x.ref,s:QAR(x.amt)+" · "+x.tenant,r:"payments"})),I.receipt);
  add("Maintenance",MAINT.filter(x=>(x.code+x.desc).toLowerCase().includes(t)).map(x=>({l:x.code,s:x.desc.slice(0,50),r:"maint-detail"})),I.wrench);
  return G;
}
function renderCmd(){
  const G=cmdResults(S.cmdQ),flat=G.flatMap(g=>g.items);
  S.cmdIdx=Math.min(S.cmdIdx,Math.max(0,flat.length-1));
  let n=-1;
  document.getElementById("layer").innerHTML=`<div class="ovl" style="align-items:flex-start" onclick="if(event.target===this)closeCmd()">
   <div class="cmd"><div class="cmd-in"><span style="width:16px;height:16px;color:var(--text-3)">${I.search}</span>
   <input id="cmdI" placeholder="Search tenants, units, leases, cheques…" value="${esc(S.cmdQ)}" oninput="S.cmdQ=this.value;S.cmdIdx=0;renderCmd()"></div>
   <div class="cmd-list">${flat.length?G.map(g=>`<div class="cmd-grp">${g.g}</div>`+g.items.map(it=>{n++;const i=n;
    return `<div class="cmd-i ${i===S.cmdIdx?"on":""}" onclick="closeCmd();go('${it.r}')">${it.i}
    <span style="min-width:0;flex:1"><span style="display:block">${esc(it.l)}</span>${it.s?`<span style="display:block;font-size:11.5px;color:var(--text-3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(it.s)}</span>`:""}</span></div>`}).join("")).join("")
    :`<div style="padding:26px;text-align:center;font-size:13.5px;color:var(--text-3)">Nothing found for &ldquo;${esc(S.cmdQ)}&rdquo;.</div>`}</div>
   <div class="cmd-f"><span><kbd>↑↓</kbd> navigate</span><span><kbd>↵</kbd> open</span><span><kbd>esc</kbd> close</span></div></div></div>`;
  const inp=document.getElementById("cmdI");if(inp){inp.focus();inp.setSelectionRange(inp.value.length,inp.value.length)}
}
function openCmd(){S.cmdOpen=true;S.cmdQ="";S.cmdIdx=0;renderCmd()}
function closeCmd(){S.cmdOpen=false;closeModal()}

/* ===================== notifications ===================== */
function toggleNotif(e){e&&e.stopPropagation();S.notifOpen=!S.notifOpen;render()}
function readAll(){NOTIFS=NOTIFS.map(n=>({...n,read:true}));toast("All notifications marked read.","ok");render()}
function openNotif(id,r){NOTIFS=NOTIFS.map(n=>n.id===id?{...n,read:true}:n);S.notifOpen=false;go(r)}
function notifPanel(){
  const un=NOTIFS.filter(n=>!n.read).length;
  return `<div style="position:relative">
   <button style="width:32px;height:32px;display:grid;place-items:center;color:var(--text-2);position:relative;border-radius:8px" onclick="toggleNotif(event)">
    <span style="width:17px;height:17px">${I.bell}</span>
    ${un?`<span style="position:absolute;top:2px;right:2px;background:#ef4444;color:#fff;font-size:9px;font-weight:600;border-radius:99px;min-width:15px;height:15px;display:grid;place-items:center;padding:0 3px">${un}</span>`:""}</button>
   ${S.notifOpen?`<div class="notif" onclick="event.stopPropagation()">
    <div class="notif-h"><span>Notifications</span>${un?`<button class="link" style="font-size:11.5px;font-weight:400;color:var(--text-3)" onclick="readAll()">Mark all read</button>`:""}</div>
    <div class="notif-l">${NOTIFS.map(n=>`<div class="notif-i ${n.read?"":"unread"}" onclick="openNotif(${n.id},'${n.go}')">
     <span class="dot" style="background:${n.read?"#e5e5e5":n.tone}"></span>
     <span style="min-width:0"><span style="display:block;font-size:13px;${n.read?"color:var(--text-2)":"font-weight:550"}">${n.title}</span>
     <span style="display:block;font-size:11.5px;color:var(--text-3);margin-top:1px">${n.body}</span>
     <span style="display:block;font-size:11px;color:#c4c4c4;margin-top:2px">${DT(n.at)}</span></span></div>`).join("")}</div></div>`:""}</div>`;
}

/* ===================== shells & router ===================== */
const MNAV=[["dashboard","Dashboard",I.dash],["properties","Properties",I.build],["owners","Owners",I.user],
 ["tenants","Tenants",I.users],["leases","Leases",I.file],["finance","Finance",I.wallet],["cheques","Cheques",I.bank],
 ["maintenance","Maintenance",I.wrench],["vendors","Vendors",I.brief],["reports","Reports",I.chart],
 ["import","Import",I.upload],["settings","Settings",I.cog]];
const ANAV=[["admin","Overview",I.dash],["admin-orgs","Organisations",I.build],["admin-users","Users",I.users],
 ["admin-subs","Subscriptions",I.card],["admin-plans","Plans",I.card],["admin-int","Integrations",I.plug],
 ["admin-audit","Audit",I.act],["admin-support","Support",I.life],["admin-settings","Settings",I.cog]];
const TNAV=[["tenant","Home",I.home],["tenant-pay","Payments",I.receipt],["tenant-lease","Lease",I.file],
 ["tenant-maint","Repairs",I.wrench],["tenant-docs","Docs",I.clip]];
const ONAV=[["owner","Overview",I.dash],["owner-props","Properties",I.build],["owner-fin","Financials",I.wallet],
 ["owner-stmt","Statements",I.file],["owner-maint","Repairs",I.wrench]];
const VNAV=[["vendor","Jobs",I.brief],["vendor-done","Completed",I.clip]];

const GROUP=r=>r.startsWith("admin")?"admin":r.startsWith("tenant")&&r!=="tenants"&&r!=="tenant-detail"?"tenant"
 :r.startsWith("owner")&&r!=="owners"&&r!=="owner-detail"?"owner":r.startsWith("vendor")&&r!=="vendors"?"vendor":"manager";

function shellApp(route,dark){
  const nav=dark?ANAV:MNAV,who=dark?["RentOS Platform Admin","RA"]:["Fatima Al-Sulaiti","FA"];
  return `<div class="app"><aside class="sidebar${dark?" dark":""}">
   <div class="brand"><div class="logo">R</div><div><div class="brand-name">RentOS</div>${dark?'<div class="brand-sub">Platform admin</div>':""}</div></div>
   ${dark?"":`<button class="orgpick"><span>Pearl Property Management</span><svg style="width:13px;height:13px;color:#a1a1a1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M7 9l5-5 5 5M7 15l5 5 5-5"/></svg></button>`}
   <nav class="nav">${nav.map(([r,l,ic])=>`<a class="${r===route?"on":""}" onclick="go('${r}')">${ic}${l}</a>`).join("")}</nav>
   <div class="sidefoot">${who[0]}</div></aside>
  <div class="main"><header class="topbar">
   <button class="searchbtn" onclick="openCmd()"><span style="width:15px;height:15px">${I.search}</span>
    <span style="flex:1;text-align:left">Search tenants, units, leases…</span><kbd>⌘K</kbd></button>
   <div style="margin-left:auto;display:flex;gap:9px;align-items:center">
    <button class="btn out sm" onclick="go('lease-new')">${I.plus} New lease</button>
    ${notifPanel()}<div class="avatar">${who[1]}</div></div></header>
   <div class="content" onclick="if(S.notifOpen){S.notifOpen=false;render()}"><div class="wrap" id="view"></div></div></div></div>`;
}
function shellPortal(route,nav,org,ini){
  return `<div class="portal"><header class="pbar"><div class="pbar-in">
   <div class="logo">R</div><div style="min-width:0"><div style="font-weight:600;font-size:13.5px">${org}</div></div>
   <nav class="pnav">${nav.map(([r,l])=>`<a class="${r===route?"on":""}" onclick="go('${r}')">${l}</a>`).join("")}</nav>
   <div class="avatar" style="width:29px;height:29px">${ini}</div></div></header>
   <main class="pmain" id="view"></main>
   <nav class="pbottom">${nav.map(([r,l,ic])=>`<a class="${r===route?"on":""}" onclick="go('${r}')">${ic}${l}</a>`).join("")}</nav></div>`;
}
function render(){
  const route=location.hash.slice(1)||"dashboard",g=GROUP(route),root=document.getElementById("root");
  if(g==="manager")root.innerHTML=shellApp(route,false);
  else if(g==="admin")root.innerHTML=shellApp(route,true);
  else if(g==="tenant")root.innerHTML=shellPortal(route,TNAV,"Pearl Property Management","JS");
  else if(g==="owner")root.innerHTML=shellPortal(route,ONAV,"Pearl Property Management","JA");
  else root.innerHTML=shellPortal(route,VNAV,"Rashid Cooling Services","RC");
  document.getElementById("view").innerHTML=(V[route]||V.dashboard)();
  const c=document.querySelector(".content");if(c)c.scrollTop=0;
  document.getElementById("switcher").innerHTML=`<b>Switch portal — what each role sees</b>`+
   [["dashboard","Manager","manager"],["tenant","Tenant","tenant"],["owner","Owner","owner"],["vendor","Vendor","vendor"],["admin","Platform admin","admin"]]
   .map(([r,l,gg])=>`<a class="${g===gg?"on":""}" onclick="go('${r}')">${l}</a>`).join("");
}
window.go=r=>{S.notifOpen=false;closeModal();if(location.hash.slice(1)===r)render();else location.hash=r};
window.addEventListener("hashchange",render);
document.addEventListener("keydown",e=>{
  if(e.key.toLowerCase()==="k"&&(e.metaKey||e.ctrlKey)){e.preventDefault();S.cmdOpen?closeCmd():openCmd();return}
  if(e.key==="Escape"){if(S.cmdOpen)closeCmd();else closeModal();return}
  if(S.cmdOpen){
    const flat=cmdResults(S.cmdQ).flatMap(g=>g.items);
    if(e.key==="ArrowDown"){e.preventDefault();S.cmdIdx=Math.min(S.cmdIdx+1,flat.length-1);renderCmd()}
    if(e.key==="ArrowUp"){e.preventDefault();S.cmdIdx=Math.max(S.cmdIdx-1,0);renderCmd()}
    if(e.key==="Enter"){e.preventDefault();const t=flat[S.cmdIdx];if(t){closeCmd();go(t.r)}}
  }
});
render();
