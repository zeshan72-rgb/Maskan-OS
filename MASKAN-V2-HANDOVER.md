# Maskan v2, developer handover

A working prototype of a property management platform for Qatar. Every figure
in this document was read out of the file, not remembered.

```
maskan-v2.html      656 KB, one self-contained file
99 routes           manager app, four portals, platform admin
7 roles             each with its own reach and its own data
```

Open it in a browser. Nothing to install, no server, no build step to view it.

---

## 1. What this is, and what it is not

**It is** a behavioural specification. The rent ledger genuinely works: record a
payment and balances move, reverse a bounced cheque and the debt comes back,
allocate by hand and invalid splits are refused. Roles genuinely restrict what a
person can reach, in data as well as in menus.

**It is not** a system. There is no database, no authentication, no email, no
payment provider, no file storage. State lives in memory and a refresh resets it.
Where a provider is absent the screen says so rather than pretending.

Treat it as the answer to "what should this do", not "how should this be built".

---

## 2. Running and building

The shipped file is generated from parts.

```
src/          numbered source parts, concatenated in filename order
build.sh      validates, then writes dist/index.html
check-tables.js   one of the build guards
```

```bash
./build.sh            # build
./build.sh --check    # validate without writing
```

The build **fails** on a JavaScript syntax error, and on any table element given
a display that breaks it. It **warns** on any class used in markup that has no
CSS rule. Each guard exists because that exact bug shipped once.

Filenames encode load order. `40-app.js` must stay last; it calls `render()`.

---

## 3. The rent ledger

This is the part worth reading closely. It is the core of the product and the
part most rental software gets wrong.

**Rent owed and money received are separate records joined by an allocation.**
Storing a `paid` boolean on an invoice cannot express "QAR 5,700 received
against a QAR 9,500 instalment", which in Qatar is an ordinary Tuesday.

```
LEDGER.instalments   what is owed      { id, lease, due, amount, allocated }
LEDGER.payments      what arrived      { id, amount, method, ref, allocations[] }
```

### The API

| Function | Contract |
| --- | --- |
| `planAllocation(amount, instalments)` | Oldest debt first. **Sorts internally**, does not trust caller order. |
| `validateAllocation(amount, entries)` | Returns `{ok, error}`. See the rules below. |
| `recordPayment(payment, entries)` | Validates, then mutates. Surplus becomes credit. |
| `reversePayment(id, reason)` | Removes allocations, marks reversed, keeps the record. |
| `clearCheque(ref, amount, lease)` | Routes through `recordPayment`. Same path, so the ledger cannot diverge by arrival method. |

### Validation rules, all four tested

1. Total allocated may not exceed the payment
2. **Allocations accumulate per instalment before the cap is checked**
3. No negative amounts
4. The instalment must exist

Rule 2 is the important one. The existing Next.js implementation checks each
entry independently, so `[{A: 500}, {A: 500}]` passes against an instalment
owing 600. That is a live money bug. This prototype gets it right and is a
working reference for the fix.

### Money handling

`round2()` is applied at every step. For production, store minor units as
integers rather than floats.

---

## 4. Received is not cleared

A payment has two states, and only clearing moves the ledger.

| Method | Settles | Behaviour |
| --- | --- | --- |
| Cash | immediately | Money on handover. Requires a receipt, a named recipient, and a destination for the notes. |
| Card | +2 days | Instalment settles today; the money arrives later. |
| Bank transfer | on statement | Matched at reconciliation, or sits unmatched. |
| Post-dated cheque | +4 days after deposit | **Depositing does not settle anything.** |

Get this wrong and a deposited cheque looks like paid rent. The tenant journey
for a cheque is: held → deposited (nothing changes) → cleared (ledger moves) or
bounced (debt restored).

---

## 5. Roles

Scope filters data, not only menus. A hidden link with a reachable screen is
theatre.

| Role | Reach |
| --- | --- |
| Managing Director | all 99 routes |
| Head of Property Management | 31 |
| Head of Leasing | 14 |
| Accountant | 13 |
| Leasing Agent | 7 |
| Facilities Lead | 7 |
| **External agency** | **4** |

`ROLE_ROUTES` is an explicit allow-list per role. Inferring reach from the
sidebar caused tab strips to offer routes the person could not open.

**A refused route redirects silently to that person's home.** There is no error
screen, because a correctly built product never routes someone somewhere invalid.

`visibleLeads()` shows an agent only the clients they registered, and an outside
agency only theirs, never another agency's.

---

## 6. Data model

| Structure | Rows | Notes |
| --- | --- | --- |
| `UNITS` / `LEASES` / `TENANTS` | 12 / 14 / 13 | |
| `OWNERS` | 5 | Three relationship types, see below |
| `CHEQUES` | 8 | Full lifecycle including bounce |
| `MANDATES` | 5 | Authority limits that gate workflow |
| `UNDERTAKINGS` | 5 | Employer pays, tenant stays the tenant |
| `FEES` | 8 | Four dimensions each |
| `PARTIES` | 8 | Internal and external, leasing and maintenance |
| `LEADS` / `VACANT` / `OFFERS` | 7 / 7 / 5 | |
| `DEPARTMENTS` / `HOLDINGS` | 4 / 5 | Owned versus managed |
| `CONTRACTS` / `TEMPLATES` | 6 / 7 | |
| `PLANS` | 3 | Starter 300, Growth 500, Enterprise custom |

### Three distinctions that must survive into the real schema

**Owner is three relationships.** A unit landlord, a building owner, and the
company itself. They differ in whether a mandate exists, whether a statement is
issued externally, and whether rent is revenue or money held for someone else.
Without this field a firm owning its own tower issues owner statements to
itself and charges itself a management fee.

**A party is internal or external.** Same assignment, same audit trail,
different settlement. In-house work is charged at an internal rate; an outside
company invoices and the owner is recharged with a coordination fee. This
applies to leasing and maintenance identically.

**An employer is a payer, not a tenant.** When a company covers rent or bills,
the tenancy, the QID and usually the cheques stay with the person living there.
Modelling the company as the tenant breaks lease registration, QID compliance
and cheque matching at once. The undertaking has its own expiry, after which
liability reverts.

---

## 7. Offers

`offerMaths(scenario, assumptions)` computes what a deal actually earns.

The output that matters is **annualised including the void**. A longer term
always shows a bigger total and frequently earns less per year. Assumptions are
per-user, not baked in: void months, cost to re-let, fee percentage.

Rent-free months are real instalments at zero, so the ledger and the contract
agree. Bills-included reduces owner income by cap × term across the whole
occupancy, free months included.

`moveFromOffer()` carries every field into the tenancy. Before this existed, an
accepted 14-month offer with two free months became a 12-month lease with none,
so the owner was shown one number and the lease delivered another.

---

## 8. Mandates gate workflow

`checkSpend(owner, amount)` returns `{ok, cap, why}`.

```
Jassim Al-Thani      may sign leases       spend cap 2,500
Lusail Capital       owner signs           spend cap 5,000
Mansour Al-Naimi     owner signs           no standing authority
Al Sadd Holdings     may sign and accept   spend cap 3,000
```

A quote above the cap should pause for approval rather than being assigned.
This is enforced, not displayed.

---

## 9. What is simulated

Every one of these says so on screen rather than pretending:

- E-signature, document generation, document storage
- Email, SMS, any notification
- Payment gateway, bank feeds, reconciliation against a real statement
- Channel synchronisation
- Superhog guest screening (BaytTravel build)
- OCR on the cheque photograph, mobile build

`activateTenancy()` does genuinely create instalments, cheques, a contract and
an undertaking in memory, so the downstream effects are real even though nothing
persists.

---

## 10. What to build first

1. **Schema and RLS.** Get the three distinctions in section 6 into the tables
   before anything else. They are painful to retrofit.
2. **The ledger, with the validation rules as tests.** Port rule 2 first.
3. **Roles, enforced server side.** The allow-lists here are the specification.
4. **Cheque lifecycle**, including bounce and replacement.
5. **Owner statements**, computed from the fee schedule rather than literals.

Two things in this prototype are still literals and should be computed in the
real build: owner statement figures, and the dashboard arrears number.

---

## 11. Decisions worth keeping

**Colour must encode meaning.** Decorative spines and arbitrary palette on cards
were removed. Colour now appears only where it flags a problem.

**Manager-facing labels describe; portal copy addresses.** "Owned units", not
"Units we own". But the owner portal correctly says "Your agreement with us".

**A tab group is one page.** Switching tabs keeps the title. Changing it reads
as leaving.

**Context, not destinations.** An employer undertaking applies to about one
tenant in nine, so it is a card on the rent screen, not a permanent tab.
