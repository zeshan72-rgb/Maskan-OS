/* ===================== formatting ===================== */
const QAR=n=>n==null?"—":"QAR "+Number(n).toLocaleString("en-QA",{maximumFractionDigits:0});
const D=s=>new Date(s).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"});
const DT=s=>D(s)+", "+new Date(s).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});
const TODAY=new Date("2026-08-18");
const daysTo=s=>Math.ceil((new Date(s)-TODAY)/864e5);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

/* ===================== data ===================== */
const PROPS=[
 {id:"p1",name:"The Pearl Residences",code:"PROP-001",type:"Residential",addr:"Porto Arabia, The Pearl, Doha",units:16,occ:12,vac:3,owner:"Jassim Al-Thani",rent:118500,fee:8},
 {id:"p2",name:"West Bay Towers",code:"PROP-002",type:"Residential",addr:"Al Dafna, West Bay, Doha",units:14,occ:9,vac:4,owner:"Doha Horizon Holdings",rent:87000,fee:7.5},
 {id:"p3",name:"Al Sadd Business Center",code:"PROP-003",type:"Commercial",addr:"Al Sadd Street, Doha",units:8,occ:6,vac:2,owner:"Noora Al-Emadi",rent:66000,fee:10},
 {id:"p4",name:"Lusail Marina View",code:"PROP-004",type:"Residential",addr:"Marina District, Lusail",units:10,occ:5,vac:4,owner:"Khalid Al-Marri",rent:48500,fee:8},
 {id:"p5",name:"Al Waab Villa Compound",code:"PROP-005",type:"Villa Compound",addr:"Al Waab Street, Doha",units:6,occ:3,vac:3,owner:"Lusail Capital Real Estate",rent:41000,fee:6}];

const UNITS=[
 {id:"u1",p:"p1",no:"101",floor:"1",beds:2,baths:2,area:130,type:"2br",furn:"Furnished",market:9500,rent:9500,status:"Occupied",tenant:"John Smith",lease:"LEASE-0001"},
 {id:"u2",p:"p1",no:"102",floor:"1",beds:1,baths:1,area:95,type:"1br",furn:"Semi-furnished",market:7000,rent:7000,status:"Occupied",tenant:"Priya Sharma",lease:"LEASE-0002"},
 {id:"u3",p:"p1",no:"103",floor:"1",beds:3,baths:3,area:165,type:"3br",furn:"Furnished",market:12500,rent:12500,status:"Occupied",tenant:"Ahmed Hassan",lease:"LEASE-0003"},
 {id:"u4",p:"p1",no:"104",floor:"1",beds:2,baths:2,area:130,type:"2br",furn:"Unfurnished",market:9000,rent:null,status:"Vacant",tenant:null,lease:null},
 {id:"u5",p:"p1",no:"201",floor:"2",beds:2,baths:2,area:130,type:"2br",furn:"Furnished",market:9500,rent:9500,status:"Occupied",tenant:"Li Wei",lease:"LEASE-0004"},
 {id:"u6",p:"p1",no:"202",floor:"2",beds:1,baths:1,area:95,type:"1br",furn:"Furnished",market:7500,rent:null,status:"Maintenance",tenant:null,lease:null},
 {id:"u7",p:"p1",no:"203",floor:"2",beds:3,baths:3,area:165,type:"3br",furn:"Semi-furnished",market:12000,rent:12000,status:"Occupied",tenant:"Fatima Noor",lease:"LEASE-0005"},
 {id:"u8",p:"p1",no:"204",floor:"2",beds:0,baths:1,area:60,type:"Studio",furn:"Furnished",market:5500,rent:null,status:"Vacant",tenant:null,lease:null},
 {id:"u9",p:"p1",no:"301",floor:"3",beds:2,baths:2,area:130,type:"2br",furn:"Furnished",market:9800,rent:9800,status:"Occupied",tenant:"Omar Farouk",lease:"LEASE-0011"},
 {id:"u10",p:"p1",no:"302",floor:"3",beds:3,baths:3,area:170,type:"3br",furn:"Furnished",market:13000,rent:13000,status:"Occupied",tenant:"Sofia Rossi",lease:"LEASE-0012"},
 {id:"u11",p:"p1",no:"303",floor:"3",beds:1,baths:1,area:92,type:"1br",furn:"Unfurnished",market:6800,rent:null,status:"Reserved",tenant:null,lease:null},
 {id:"u12",p:"p1",no:"304",floor:"3",beds:2,baths:2,area:128,type:"2br",furn:"Semi-furnished",market:9200,rent:9200,status:"Occupied",tenant:"Hassan Ali",lease:"LEASE-0013"}];

const LEASES=[
 {id:"LEASE-0001",tenant:"John Smith",prop:"The Pearl Residences",unit:"101",start:"2026-02-01",end:"2027-01-31",rent:9500,freq:"Monthly",method:"Bank transfer",status:"Active",outstanding:13300,deposit:9500,owner:"Jassim Al-Thani"},
 {id:"LEASE-0002",tenant:"Priya Sharma",prop:"The Pearl Residences",unit:"102",start:"2025-11-15",end:"2026-11-14",rent:7000,freq:"Quarterly",method:"Post-dated cheque",status:"Expiring",outstanding:0,deposit:7000,owner:"Jassim Al-Thani"},
 {id:"LEASE-0003",tenant:"Ahmed Hassan",prop:"The Pearl Residences",unit:"103",start:"2025-09-01",end:"2026-08-31",rent:12500,freq:"Monthly",method:"Post-dated cheque",status:"Renewal Offered",outstanding:5000,deposit:12500,owner:"Jassim Al-Thani"},
 {id:"LEASE-0004",tenant:"Li Wei",prop:"The Pearl Residences",unit:"201",start:"2026-01-01",end:"2026-12-31",rent:9500,freq:"Monthly",method:"Bank transfer",status:"Active",outstanding:0,deposit:9500,owner:"Jassim Al-Thani"},
 {id:"LEASE-0005",tenant:"Fatima Noor",prop:"The Pearl Residences",unit:"203",start:"2025-12-01",end:"2026-11-30",rent:12000,freq:"Monthly",method:"Cash",status:"Active",outstanding:24000,deposit:12000,owner:"Jassim Al-Thani"},
 {id:"LEASE-0006",tenant:"Carlos Silva",prop:"West Bay Towers",unit:"301",start:"2026-03-01",end:"2027-02-28",rent:8500,freq:"Monthly",method:"Bank transfer",status:"Active",outstanding:0,deposit:8500,owner:"Doha Horizon Holdings"},
 {id:"LEASE-0007",tenant:"Elena Petrova",prop:"West Bay Towers",unit:"302",start:"2025-10-01",end:"2026-09-30",rent:9000,freq:"Semi-annual",method:"Post-dated cheque",status:"Active",outstanding:9000,deposit:9000,owner:"Doha Horizon Holdings"},
 {id:"LEASE-0008",tenant:"Youssef Amin",prop:"Al Sadd Business Center",unit:"Office 4",start:"2025-07-01",end:"2026-06-30",rent:11000,freq:"Quarterly",method:"Bank transfer",status:"Expiring",outstanding:33000,deposit:22000,owner:"Noora Al-Emadi"},
 {id:"LEASE-0009",tenant:"Grace Kim",prop:"Lusail Marina View",unit:"502",start:"2026-04-01",end:"2027-03-31",rent:9500,freq:"Monthly",method:"Bank transfer",status:"Active",outstanding:0,deposit:9500,owner:"Khalid Al-Marri"},
 {id:"LEASE-0010",tenant:"David Cohen",prop:"Al Waab Villa Compound",unit:"Villa 2",start:"2025-08-15",end:"2026-08-14",rent:16000,freq:"Monthly",method:"Post-dated cheque",status:"Active",outstanding:16000,deposit:32000,owner:"Lusail Capital Real Estate"},
 {id:"LEASE-0011",tenant:"Omar Farouk",prop:"The Pearl Residences",unit:"301",start:"2026-05-01",end:"2027-04-30",rent:9800,freq:"Monthly",method:"Bank transfer",status:"Active",outstanding:0,deposit:9800,owner:"Jassim Al-Thani"},
 {id:"LEASE-0012",tenant:"Sofia Rossi",prop:"The Pearl Residences",unit:"302",start:"2026-06-01",end:"2027-05-31",rent:13000,freq:"Quarterly",method:"Bank transfer",status:"Active",outstanding:0,deposit:13000,owner:"Jassim Al-Thani"},
 {id:"LEASE-0013",tenant:"Hassan Ali",prop:"The Pearl Residences",unit:"304",start:"2024-09-01",end:"2025-08-31",rent:9200,freq:"Monthly",method:"Cash",status:"Expired",outstanding:0,deposit:9200,owner:"Jassim Al-Thani"},
 {id:"LEASE-0014",tenant:"Maria Santos",prop:"Lusail Marina View",unit:"503",start:"2025-06-01",end:"2026-05-31",rent:8800,freq:"Monthly",method:"Bank transfer",status:"Terminated",outstanding:0,deposit:8800,owner:"Khalid Al-Marri"}];

const SCHEDULE=[
 {n:1,due:"2026-02-01",amt:9500,out:0,status:"Paid",alloc:[{amt:9500,ref:"TRF-1-1"}]},
 {n:2,due:"2026-03-01",amt:9500,out:0,status:"Paid",alloc:[{amt:9500,ref:"TRF-1-2"}]},
 {n:3,due:"2026-04-01",amt:9500,out:0,status:"Paid",alloc:[{amt:9500,ref:"TRF-1-3"}]},
 {n:4,due:"2026-05-01",amt:9500,out:0,status:"Paid",alloc:[{amt:5700,ref:"CASH-1-4"},{amt:3800,ref:"TRF-1-4b"}]},
 {n:5,due:"2026-06-01",amt:9500,out:0,status:"Paid",alloc:[{amt:9500,ref:"CHQ448120"}]},
 {n:6,due:"2026-07-01",amt:9500,out:3800,status:"Partial",alloc:[{amt:5700,ref:"CASH-1-6"}]},
 {n:7,due:"2026-08-01",amt:9500,out:9500,status:"Overdue",alloc:[]},
 {n:8,due:"2026-09-01",amt:9500,out:9500,status:"Upcoming",alloc:[]},
 {n:9,due:"2026-10-01",amt:9500,out:9500,status:"Upcoming",alloc:[]},
 {n:10,due:"2026-11-01",amt:9500,out:9500,status:"Upcoming",alloc:[]},
 {n:11,due:"2026-12-01",amt:9500,out:9500,status:"Upcoming",alloc:[]},
 {n:12,due:"2027-01-01",amt:9500,out:9500,status:"Upcoming",alloc:[]}];

const LEASE_EVENTS=[
 {t:"created",at:"2026-01-22T10:14:00",n:"Lease drafted by Ahmed Khalil."},
 {t:"activated",at:"2026-01-28T09:02:00",n:"Activated — 12 monthly instalments generated automatically."},
 {t:"payment recorded",at:"2026-02-01T11:30:00",n:"QAR 9,500 bank transfer allocated to instalment 1."},
 {t:"partial payment",at:"2026-07-03T14:22:00",n:"QAR 5,700 cash allocated to instalment 6 — QAR 3,800 still outstanding."}];

const PAYMENTS=[
 {id:"pay1",date:"2026-08-16",tenant:"John Smith",lease:"LEASE-0001",method:"Bank transfer",ref:"TRF-PENDING-001",amt:9500,alloc:0,status:"Pending Verification",receipt:null},
 {id:"pay2",date:"2026-08-14",tenant:"Li Wei",lease:"LEASE-0004",method:"Bank transfer",ref:"QNB-88231",amt:9500,alloc:9500,status:"Confirmed",receipt:"RCP-2026-00051"},
 {id:"pay3",date:"2026-08-12",tenant:"Ahmed Hassan",lease:"LEASE-0003",method:"Post-dated cheque",ref:"CHQ448120",amt:12500,alloc:12500,status:"Confirmed",receipt:"RCP-2026-00050"},
 {id:"pay4",date:"2026-08-09",tenant:"Fatima Noor",lease:"LEASE-0005",method:"Cash",ref:"CASH-1-6",amt:5700,alloc:5700,status:"Confirmed",receipt:"RCP-2026-00049"},
 {id:"pay5",date:"2026-08-05",tenant:"Carlos Silva",lease:"LEASE-0006",method:"Bank transfer",ref:"QIB-77412",amt:8500,alloc:8500,status:"Confirmed",receipt:"RCP-2026-00048"},
 {id:"pay6",date:"2026-08-02",tenant:"Grace Kim",lease:"LEASE-0009",method:"Bank transfer",ref:"CBQ-11209",amt:9500,alloc:9500,status:"Confirmed",receipt:"RCP-2026-00047"},
 {id:"pay7",date:"2026-07-29",tenant:"Elena Petrova",lease:"LEASE-0007",method:"Bank transfer",ref:"—",amt:4500,alloc:0,status:"Rejected",receipt:null,reason:"No matching transfer on the bank statement for this date."},
 {id:"pay8",date:"2026-07-26",tenant:"Omar Farouk",lease:"LEASE-0011",method:"Bank transfer",ref:"QNB-55901",amt:9800,alloc:9800,status:"Confirmed",receipt:"RCP-2026-00046"},
 {id:"pay9",date:"2026-07-22",tenant:"Sofia Rossi",lease:"LEASE-0012",method:"Bank transfer",ref:"DB-30122",amt:39000,alloc:39000,status:"Confirmed",receipt:"RCP-2026-00045"}];

const CHEQUES=[
 {id:"c1",no:"CHQ448120",bank:"Qatar Islamic Bank",payer:"Ahmed Hassan",lease:"LEASE-0003",amt:12500,date:"2026-08-12",received:"2026-06-20",status:"Cleared"},
 {id:"c2",no:"CHQ551204",bank:"Qatar National Bank",payer:"Priya Sharma",lease:"LEASE-0002",amt:21000,date:"2026-08-25",received:"2026-06-20",status:"Received"},
 {id:"c3",no:"CHQ662310",bank:"Commercial Bank of Qatar",payer:"David Cohen",lease:"LEASE-0010",amt:16000,date:"2026-08-28",received:"2026-07-01",status:"Submitted"},
 {id:"c4",no:"CHQ773455",bank:"Doha Bank",payer:"Elena Petrova",lease:"LEASE-0007",amt:54000,date:"2026-08-04",received:"2026-06-15",status:"Bounced"},
 {id:"c5",no:"CHQ884521",bank:"Qatar Islamic Bank",payer:"Ahmed Hassan",lease:"LEASE-0003",amt:12500,date:"2026-09-12",received:"2026-06-20",status:"Stored"},
 {id:"c6",no:"CHQ990017",bank:"Qatar National Bank",payer:"Youssef Amin",lease:"LEASE-0008",amt:33000,date:"2026-09-30",received:"2026-07-10",status:"Received"},
 {id:"c7",no:"CHQ221088",bank:"Doha Bank",payer:"Elena Petrova",lease:"LEASE-0007",amt:54000,date:"2026-09-04",received:"2026-08-06",status:"Received"},
 {id:"c8",no:"CHQ334019",bank:"Commercial Bank of Qatar",payer:"Hassan Ali",lease:"LEASE-0013",amt:9200,date:"2026-05-01",received:"2025-09-01",status:"Cancelled"}];

const CHEQUE_TL=[
 {to:"Received",from:null,at:"2026-06-15T09:12:00",note:"Six post-dated cheques received at handover."},
 {to:"Stored",from:"Received",at:"2026-06-15T09:40:00",note:"Filed in the safe, drawer B."},
 {to:"Submitted",from:"Stored",at:"2026-08-03T08:05:00",note:"Deposited at Doha Bank, West Bay branch."},
 {to:"Bounced",from:"Submitted",at:"2026-08-04T14:22:00",note:"Returned by the bank — insufficient funds. Tenant notified automatically."}];

const MAINT=[
 {id:"m1",code:"MR-0001",desc:"AC unit in the living room is running but blowing warm air. Started two days ago and gets worse in the afternoon.",prop:"The Pearl Residences",unit:"101",tenant:"John Smith",cat:"HVAC / AC",pri:"High",status:"Assigned",age:3,vendor:"Rashid Cooling Services"},
 {id:"m2",code:"MR-0002",desc:"Kitchen sink is leaking under the cabinet. There is a small puddle each morning.",prop:"West Bay Towers",unit:"301",tenant:"Carlos Silva",cat:"Plumbing",pri:"Normal",status:"In Progress",age:5,vendor:"Al Reem Plumbing"},
 {id:"m3",code:"MR-0003",desc:"Bedroom power socket has stopped working entirely. Nothing plugged in gets power.",prop:"The Pearl Residences",unit:"203",tenant:"Fatima Noor",cat:"Electrical",pri:"Emergency",status:"Submitted",age:1,vendor:null},
 {id:"m4",code:"MR-0004",desc:"Washing machine will not start its cycle — the display lights up but the drum never turns.",prop:"Lusail Marina View",unit:"502",tenant:"Grace Kim",cat:"Appliances",pri:"Low",status:"Completed",age:12,vendor:"Doha Electrical Works"},
 {id:"m5",code:"MR-0005",desc:"Bathroom extractor fan is very noisy, especially first thing in the morning.",prop:"Al Waab Villa Compound",unit:"Villa 2",tenant:"David Cohen",cat:"HVAC / AC",pri:"Low",status:"Scheduled",age:2,vendor:"Rashid Cooling Services"},
 {id:"m6",code:"MR-0006",desc:"Front door lock is stiff and hard to turn — needs replacing before it seizes completely.",prop:"Al Sadd Business Center",unit:"Office 4",tenant:"Youssef Amin",cat:"Locks & Security",pri:"Normal",status:"Waiting",age:9,vendor:null},
 {id:"m7",code:"MR-0007",desc:"Water heater produces only lukewarm water in the master bathroom.",prop:"The Pearl Residences",unit:"301",tenant:"Omar Farouk",cat:"Plumbing",pri:"High",status:"Closed",age:21,vendor:"Al Reem Plumbing"}];

const EXPENSES=[
 {id:"e1",date:"2026-08-10",desc:"Common area electricity — August",prop:"The Pearl Residences",owner:"Jassim Al-Thani",cat:"Utilities",vendor:"—",amt:1850,status:"approved"},
 {id:"e2",date:"2026-08-08",desc:"AC compressor replacement — Unit 101",prop:"The Pearl Residences",owner:"Jassim Al-Thani",cat:"Maintenance & Repairs",vendor:"Rashid Cooling Services",amt:2400,status:"approved"},
 {id:"e3",date:"2026-08-06",desc:"Monthly common area cleaning",prop:"West Bay Towers",owner:"Doha Horizon Holdings",cat:"Cleaning",vendor:"—",amt:800,status:"pending"},
 {id:"e4",date:"2026-08-01",desc:"Management fee — August",prop:"The Pearl Residences",owner:"Jassim Al-Thani",cat:"Management Fee",vendor:"—",amt:9480,status:"approved"},
 {id:"e5",date:"2026-07-28",desc:"Lift maintenance contract — quarterly",prop:"West Bay Towers",owner:"Doha Horizon Holdings",cat:"Maintenance & Repairs",vendor:"—",amt:3200,status:"approved"},
 {id:"e6",date:"2026-07-25",desc:"Security guard — monthly",prop:"Al Sadd Business Center",owner:"Noora Al-Emadi",cat:"Security",vendor:"—",amt:4500,status:"approved"},
 {id:"e7",date:"2026-07-20",desc:"Pest control treatment",prop:"Al Waab Villa Compound",owner:"Lusail Capital Real Estate",cat:"Other",vendor:"—",amt:650,status:"rejected"},
 {id:"e8",date:"2026-08-14",desc:"Pool servicing — August",prop:"Al Waab Villa Compound",owner:"Lusail Capital Real Estate",cat:"Maintenance & Repairs",vendor:"—",amt:1100,status:"pending"}];

const OWNERS=[
 {id:"o1",name:"Jassim Al-Thani",kind:"Individual",idn:"28511012345",email:"jassim.althani@example.qa",phone:"+974 5511 2233",addr:"West Bay, Doha",props:1,units:16,occ:12,rent:118500,bank:"Qatar National Bank"},
 {id:"o2",name:"Doha Horizon Holdings",kind:"Company",idn:"CR-88213",email:"finance@dohahorizon.qa",phone:"+974 4433 2211",addr:"Al Sadd, Doha",props:1,units:14,occ:9,rent:87000,bank:"Commercial Bank of Qatar"},
 {id:"o3",name:"Noora Al-Emadi",kind:"Individual",idn:"29011045678",email:"noora.emadi@example.qa",phone:"+974 5522 3344",addr:"Al Rayyan, Doha",props:1,units:8,occ:6,rent:66000,bank:"Qatar Islamic Bank"},
 {id:"o4",name:"Khalid Al-Marri",kind:"Individual",idn:"28711078901",email:"khalid.almarri@example.qa",phone:"+974 5533 4455",addr:"Lusail",props:1,units:10,occ:5,rent:48500,bank:"Doha Bank"},
 {id:"o5",name:"Lusail Capital Real Estate",kind:"Company",idn:"CR-91045",email:"ar@lusailcapital.qa",phone:"+974 4400 7788",addr:"Lusail Marina",props:1,units:6,occ:3,rent:41000,bank:"Qatar National Bank"}];

const TENANTS=[
 {id:"t1",name:"John Smith",qid:"28711098765",nat:"British",email:"john.smith@example.com",phone:"+974 5533 1122",emp:"Qatar Energy",unit:"The Pearl Residences · 101",status:"Active",lease:"LEASE-0001"},
 {id:"t2",name:"Priya Sharma",qid:"29011234567",nat:"Indian",email:"priya.s@example.com",phone:"+974 5544 2233",emp:"Hamad Medical",unit:"The Pearl Residences · 102",status:"Expiring",lease:"LEASE-0002"},
 {id:"t3",name:"Ahmed Hassan",qid:"28611445566",nat:"Egyptian",email:"a.hassan@example.com",phone:"+974 5566 3344",emp:"Ooredoo",unit:"The Pearl Residences · 103",status:"Renewal Offered",lease:"LEASE-0003"},
 {id:"t4",name:"Li Wei",qid:"29111778899",nat:"Chinese",email:"li.wei@example.com",phone:"+974 5577 4455",emp:"CSCEC",unit:"The Pearl Residences · 201",status:"Active",lease:"LEASE-0004"},
 {id:"t5",name:"Fatima Noor",qid:"28911002233",nat:"Pakistani",email:"f.noor@example.com",phone:"+974 5588 5566",emp:"Qatar Airways",unit:"The Pearl Residences · 203",status:"Active",lease:"LEASE-0005"},
 {id:"t6",name:"Carlos Silva",qid:"29211334455",nat:"Brazilian",email:"c.silva@example.com",phone:"+974 5599 6677",emp:"Shell Qatar",unit:"West Bay Towers · 301",status:"Active",lease:"LEASE-0006"},
 {id:"t7",name:"Elena Petrova",qid:"28811667788",nat:"Russian",email:"e.petrova@example.com",phone:"+974 5510 7788",emp:"QatarGas",unit:"West Bay Towers · 302",status:"Active",lease:"LEASE-0007"},
 {id:"t8",name:"Youssef Amin",qid:"28511889900",nat:"Jordanian",email:"y.amin@example.com",phone:"+974 5521 8899",emp:"Amin Trading W.L.L.",unit:"Al Sadd Business Center · Office 4",status:"Expiring",lease:"LEASE-0008"},
 {id:"t9",name:"Grace Kim",qid:"29311223344",nat:"Korean",email:"g.kim@example.com",phone:"+974 5532 9900",emp:"Samsung C&T",unit:"Lusail Marina View · 502",status:"Active",lease:"LEASE-0009"},
 {id:"t10",name:"David Cohen",qid:"28411556677",nat:"American",email:"d.cohen@example.com",phone:"+974 5543 1100",emp:"ExxonMobil",unit:"Al Waab Villa Compound · Villa 2",status:"Active",lease:"LEASE-0010"},
 {id:"t11",name:"Omar Farouk",qid:"29011667788",nat:"Sudanese",email:"o.farouk@example.com",phone:"+974 5554 2211",emp:"Doha Bank",unit:"The Pearl Residences · 301",status:"Active",lease:"LEASE-0011"},
 {id:"t12",name:"Sofia Rossi",qid:"29411778800",nat:"Italian",email:"s.rossi@example.com",phone:"+974 5565 3322",emp:"Eni Qatar",unit:"The Pearl Residences · 302",status:"Active",lease:"LEASE-0012"},
 {id:"t13",name:"Hassan Ali",qid:"28311889911",nat:"Iraqi",email:"h.ali@example.com",phone:"+974 5576 4433",emp:"Self-employed",unit:"—",status:"No lease",lease:null}];

const VENDORS=[
 {id:"v1",name:"Rashid Cooling Services",trade:"HVAC",email:"jobs@rashidcooling.qa",phone:"+974 5566 7788",cr:"CR-55219",assigned:8,done:7,cost:4820},
 {id:"v2",name:"Al Reem Plumbing & Maintenance",trade:"Plumbing",email:"ops@alreemplumbing.qa",phone:"+974 5544 3322",cr:"CR-44120",assigned:5,done:4,cost:3150},
 {id:"v3",name:"Doha Electrical Works",trade:"Electrical",email:"info@dohaelectrical.qa",phone:"+974 5511 9900",cr:"CR-33018",assigned:3,done:3,cost:1980}];

const STATEMENTS=[
 {id:"s1",owner:"Jassim Al-Thani",from:"2026-07-01",to:"2026-07-31",open:4200,rent:118500,other:0,exp:1850,maint:2400,fee:9480,adj:0,payout:104770,close:108970,status:"Finalised",v:1},
 {id:"s2",owner:"Doha Horizon Holdings",from:"2026-07-01",to:"2026-07-31",open:0,rent:87000,other:0,exp:800,maint:3200,fee:6525,adj:-500,payout:75975,close:75975,status:"Finalised",v:1},
 {id:"s3",owner:"Noora Al-Emadi",from:"2026-07-01",to:"2026-07-31",open:1200,rent:66000,other:0,exp:4500,maint:0,fee:6600,adj:0,payout:54900,close:56100,status:"Finalised",v:2},
 {id:"s4",owner:"Jassim Al-Thani",from:"2026-08-01",to:"2026-08-31",open:108970,rent:96200,other:0,exp:1850,maint:2400,fee:9480,adj:0,payout:82470,close:191440,status:"Draft",v:1},
 {id:"s5",owner:"Khalid Al-Marri",from:"2026-07-01",to:"2026-07-31",open:0,rent:48500,other:0,exp:0,maint:680,fee:3880,adj:0,payout:43940,close:43940,status:"Finalised",v:1}];

const ARREARS=[
 {tenant:"Youssef Amin",lease:"LEASE-0008",prop:"Al Sadd Business Center",unit:"Office 4",amt:33000,oldest:"2026-04-01",bucket:"90+"},
 {tenant:"Fatima Noor",lease:"LEASE-0005",prop:"The Pearl Residences",unit:"203",amt:24000,oldest:"2026-06-01",bucket:"61-90"},
 {tenant:"David Cohen",lease:"LEASE-0010",prop:"Al Waab Villa Compound",unit:"Villa 2",amt:16000,oldest:"2026-07-15",bucket:"31-60"},
 {tenant:"John Smith",lease:"LEASE-0001",prop:"The Pearl Residences",unit:"101",amt:13300,oldest:"2026-07-01",bucket:"31-60"},
 {tenant:"Elena Petrova",lease:"LEASE-0007",prop:"West Bay Towers",unit:"302",amt:9000,oldest:"2026-08-01",bucket:"1-30"},
 {tenant:"Ahmed Hassan",lease:"LEASE-0003",prop:"The Pearl Residences",unit:"103",amt:5000,oldest:"2026-08-01",bucket:"1-30"}];
const BUCKETS={"Current":0,"1-30":14000,"31-60":29300,"61-90":24000,"90+":33000};

const TREND=[{m:"Mar",exp:342000,col:328000},{m:"Apr",exp:349000,col:341000},{m:"May",exp:355000,col:330000},
 {m:"Jun",exp:358000,col:349000},{m:"Jul",exp:361000,col:338000},{m:"Aug",exp:361000,col:284000}];
const MAINT_CAT=[{c:"HVAC / AC",n:2},{c:"Plumbing",n:2},{c:"Electrical",n:1},{c:"Appliances",n:1},{c:"Locks & Security",n:1}];

const ORGS=[
 {name:"Pearl Property Management",email:"info@pearlpm.qa",plan:"Growth",members:5,units:54,leases:35,created:"2026-08-18",status:"Active",onb:"complete"},
 {name:"Doha Estate Partners",email:"admin@dohaestate.qa",plan:"Starter",members:2,units:23,leases:18,created:"2026-07-02",status:"Active",onb:"complete"},
 {name:"Lusail Living",email:"hello@lusailliving.qa",plan:"Trial",members:1,units:0,leases:0,created:"2026-08-11",status:"Trial",onb:"portfolio"},
 {name:"Msheireb Residences Co.",email:"ops@msheirebres.qa",plan:"Professional",members:11,units:187,leases:164,created:"2026-03-19",status:"Active",onb:"complete"},
 {name:"Al Khor Property Group",email:"info@alkhorpg.qa",plan:"Growth",members:4,units:61,leases:44,created:"2026-05-27",status:"Suspended",onb:"complete"}];

const PLATFORM_USERS=[
 {name:"RentOS Platform Admin",email:"superadmin@rentos.qa",orgs:"—",created:"2026-08-18",sa:true},
 {name:"Fatima Al-Sulaiti",email:"admin@pearlpm.qa",orgs:"Pearl Property Management",created:"2026-08-18",sa:false},
 {name:"Ahmed Khalil",email:"manager@pearlpm.qa",orgs:"Pearl Property Management",created:"2026-08-18",sa:false},
 {name:"Mariam Al-Kuwari",email:"accountant@pearlpm.qa",orgs:"Pearl Property Management",created:"2026-08-18",sa:false},
 {name:"Sara Al-Mannai",email:"sara@msheirebres.qa",orgs:"Msheireb Residences Co.",created:"2026-03-19",sa:false},
 {name:"Omar Nasser",email:"omar@dohaestate.qa",orgs:"Doha Estate Partners",created:"2026-07-02",sa:false},
 {name:"Jassim Al-Thani",email:"owner@pearlpm.qa",orgs:"Pearl Property Management",created:"2026-08-18",sa:false}];

const AUDIT=[
 {at:"2026-08-18T11:42:00",org:"Pearl Property Management",actor:"Mariam Al-Kuwari",act:"payment.confirmed",ent:"payments"},
 {at:"2026-08-18T11:20:00",org:"Pearl Property Management",actor:"Mariam Al-Kuwari",act:"cheque.bounced",ent:"cheques"},
 {at:"2026-08-18T10:55:00",org:"Msheireb Residences Co.",actor:"Sara Al-Mannai",act:"lease.activated",ent:"leases"},
 {at:"2026-08-18T09:31:00",org:"Pearl Property Management",actor:"Ahmed Khalil",act:"work_order.created",ent:"work_orders"},
 {at:"2026-08-17T16:04:00",org:"Doha Estate Partners",actor:"Omar Nasser",act:"owner_statement.finalised",ent:"owner_statements"},
 {at:"2026-08-17T14:48:00",org:"Al Khor Property Group",actor:"RentOS Platform Admin",act:"platform.organisation.suspended",ent:"organisations"},
 {at:"2026-08-17T11:12:00",org:"Pearl Property Management",actor:"Fatima Al-Sulaiti",act:"invitation.sent",ent:"invitations"},
 {at:"2026-08-16T18:20:00",org:"Msheireb Residences Co.",actor:"Sara Al-Mannai",act:"lease.renewal_offered",ent:"lease_renewal_offers"},
 {at:"2026-08-16T15:02:00",org:"Pearl Property Management",actor:"Ahmed Khalil",act:"property.created",ent:"properties"},
 {at:"2026-08-15T09:44:00",org:"Doha Estate Partners",actor:"Omar Nasser",act:"expense.approved",ent:"property_expenses"}];

let NOTIFS=[
 {id:1,type:"cheque_bounced",title:"Cheque returned unpaid",body:"CHQ773455 for QAR 54,000 was returned by Doha Bank.",at:"2026-08-18T11:20:00",read:false,tone:"#ef4444",go:"cheque"},
 {id:2,type:"payment_confirmed",title:"Payment awaiting verification",body:"John Smith submitted proof of a QAR 9,500 transfer.",at:"2026-08-16T08:12:00",read:false,tone:"#f59e0b",go:"payments"},
 {id:3,type:"maintenance",title:"Emergency maintenance raised",body:"MR-0003 — bedroom socket has no power, Unit 203.",at:"2026-08-17T17:40:00",read:false,tone:"#ef4444",go:"maintenance"},
 {id:4,type:"lease_expiring",title:"Lease expiring in 13 days",body:"LEASE-0003 for Ahmed Hassan ends 31 Aug 2026.",at:"2026-08-15T09:00:00",read:true,tone:"#f59e0b",go:"leases"},
 {id:5,type:"renewal",title:"Renewal offer accepted",body:"Sofia Rossi accepted the renewal on LEASE-0012.",at:"2026-08-12T13:25:00",read:true,tone:"#0ea5e9",go:"leases"}];

/* ===================== icons ===================== */
const I={
dash:'<svg fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
build:'<svg fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h1M9 13h1M14 9h1M14 13h1M9 21v-4h6v4"/></svg>',
user:'<svg fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>',
users:'<svg fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2 21c0-3.5 3.5-5.5 7-5.5s7 2 7 5.5M17 11a3 3 0 100-6M18 20c0-2.5-1-4-2.5-5"/></svg>',
file:'<svg fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path d="M14 2H7a2 2 0 00-2 2v16a2 2 0 002 2h10a2 2 0 002-2V7z"/><path d="M14 2v5h5M9 13h6M9 17h4"/></svg>',
wallet:'<svg fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path d="M3 7a2 2 0 012-2h13a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><path d="M16 12h3M3 9h18"/></svg>',
bank:'<svg fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path d="M3 10h18M5 10v9M19 10v9M9 10v9M15 10v9M2 21h20M12 3l9 5H3z"/></svg>',
wrench:'<svg fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path d="M14.7 6.3a4 4 0 105.4 5.4l-1.8-1.8 1.4-1.4 1.8 1.8A6 6 0 0113 4.9l1.7 1.4zM13 11L4 20l-1 1 1 1 1-1 9-9"/></svg>',
chart:'<svg fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path d="M3 3v18h18M7 15l4-5 3 3 5-7"/></svg>',
cog:'<svg fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></svg>',
up:'<svg fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
down:'<svg fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path d="M12 5v14M5 12l7 7 7-7"/></svg>',
home:'<svg fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path d="M3 11l9-8 9 8M5 10v10h14V10"/></svg>',
receipt:'<svg fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path d="M5 3v18l2-1.5L9 21l2-1.5L13 21l2-1.5L17 21l2-1.5V3zM9 8h6M9 12h6"/></svg>',
brief:'<svg fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2"/></svg>',
clip:'<svg fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3h6v3H9zM9 11h6M9 15h4"/></svg>',
plus:'<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
search:'<svg fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
bell:'<svg fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path d="M18 8a6 6 0 10-12 0c0 7-3 8-3 8h18s-3-1-3-8M13.7 21a2 2 0 01-3.4 0"/></svg>',
warn:'<svg fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0zM12 9v4M12 17h.01"/></svg>',
arrow:'<svg fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>',
back:'<svg fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>',
check:'<svg fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>',
x:'<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>',
pin:'<svg fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path d="M12 21s7-5.5 7-11a7 7 0 10-14 0c0 5.5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
act:'<svg fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path d="M3 12h4l3 8 4-16 3 8h4"/></svg>',
card:'<svg fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>',
plug:'<svg fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path d="M9 2v6M15 2v6M6 8h12v4a6 6 0 01-12 0zM12 18v4"/></svg>',
life:'<svg fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M4.9 4.9l4.2 4.2M14.9 14.9l4.2 4.2M19.1 4.9l-4.2 4.2M9.1 14.9l-4.2 4.2"/></svg>',
upload:'<svg fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v13"/></svg>',
copy:'<svg fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>',
clock:'<svg fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
msg:'<svg fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path d="M21 11.5a8.4 8.4 0 01-9 8.4 8.5 8.5 0 01-3.8-.9L3 21l1.9-5.2A8.4 8.4 0 013.9 12a8.5 8.5 0 018.4-8.5 8.4 8.4 0 018.7 8z"/></svg>',
rocket:'<svg fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path d="M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2.1 0-2.9a2 2 0 00-3-.1zM12 15l-3-3a17 17 0 013-6c1.5-2 3.5-3 6-3 0 2.5-1 4.5-3 6a17 17 0 01-3 6zM9 12H5s.5-2.5 2-3 4 0 4 0M12 15v4s2.5-.5 3-2 0-4 0-4"/></svg>'};
