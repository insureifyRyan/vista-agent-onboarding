# Handoff: Vista agent sign-up — ads + onboarding

## Overview

Two deliverables for recruiting licensed insurance agents to sell Vista vehicle service contracts:

1. **Twenty paid-social creatives** (Instagram + Facebook) that drive to `www.kovara.ai/onboarding`.
2. **A four-step onboarding flow** that mirrors the existing live sign-up and adds one new capability: an **AMS selector with an integration waitlist**.

The only net-new engineering is in item 2. The ads need no backend — they are static images uploaded to Meta with a destination URL.

## About the design files

The `.dc.html` files in this bundle are **design references created in HTML** — prototypes showing intended look and behavior, not production code to copy. Recreate them in the Kovara app's existing environment using its established patterns, components, and styling approach. Do not port the HTML, and do not port the inline styles.

Two things in the prototypes are review scaffolding and must NOT be built:

- The **"Preview 1 / 2 / 3 / 4" step nav** at the top of the flow — a jump control so reviewers could see each step. Delete it.
- The **gallery chrome** around the ads (headers, jump links, scaled thumbnails). Only the ad canvases themselves are the deliverable.

## Fidelity

**High-fidelity.** Colors, typography, spacing, and copy are final and approved, including legal-reviewed disclosure text. Match the layout and copy exactly; substitute the codebase's own components and tokens for the inline styles.

---

# Part 1 — The ads (no engineering required)

Twenty canvases, each exporting at true pixel size:

| Group | Count | Size | Ratio | Purpose |
|---|---|---|---|---|
| A1–A5 "Ledger" | 5 | 1080×1350 | 4:5 | IG + FB feed, dark editorial |
| B1–B5 "Signal" | 5 | 1080×1350 | 4:5 | IG + FB feed, bright graphic |
| S1–S3 | 3 | 1080×1080 | 1:1 | Right column, Marketplace, Audience Network |
| R1–R3 | 3 | 1080×1920 | 9:16 | Stories (content above the 250px bottom reserve) |
| V1–V3 | 3 | 1080×1920 | 9:16 | Reels (content above y=1180; no in-image CTA) |
| P1 | 1 | 1080×1350 | 4:5 | Photo variant — **holds an empty image slot; excluded from the launch set until a photo is supplied** |

**Destination URL** is baked into all seventeen CTA-bearing frames:

```
https://www.kovara.ai/onboarding?utm_source=meta&utm_medium=paid_social&utm_campaign=agent_signup&utm_content=<FRAME_ID>
```

`<FRAME_ID>` is the frame's label (`A1`, `B3`, `S2`, `R1`, `P1`…). V1–V3 carry no anchor because Reels supplies its own CTA chrome.

### The one app change the ads require: UTM capture

The onboarding page must read the UTM query params on first load, persist them for the session, and write them onto the agent record at creation:

| Field | Source |
|---|---|
| `utm_source` | query param |
| `utm_medium` | query param |
| `utm_campaign` | query param |
| `utm_content` | query param — identifies which of the twenty creatives converted |
| `landing_url` | full URL including query string |
| `referrer` | `document.referrer` |

Persist to `sessionStorage` on first load so the values survive the email-verification round trip. Without this, all twenty creatives are indistinguishable in reporting.

---

# Part 2 — The onboarding flow

Four steps. Steps 1 and 2 already exist in production; **build them only if this replaces the current screens.** Steps 3 and 4 are new.

Page shell: light `#F6F8FC` background, centered single column, `max-width: 560px`, page padding `28px 18px 56px`. Above the content: the Vista lockup with an "Agent-exclusive" pill, then an Old Republic trust row, then a three-segment progress bar.

### Step 1 — "Get started in seconds"

Matches the live screen. Eyebrow `AGENT SIGN-UP` (`#0D8CFF`, 15px/700, 0.14em tracking, uppercase). H1 42px/800, `-0.03em`, `#1D254C`. Subcopy 18px/400 `#6E778F`: "No password required. We'll email you a quick verification code."

Fields: **First name**, **Last name** (side by side, collapsing to one column under ~420px), **Work email** (full width). Inputs: white, `1px solid #E0E5F0`, radius 14px, padding `17px 18px`, 18px text. Focus: border `#0D8CFF` + `0 0 0 4px rgba(13,140,255,0.14)`.

Primary button: full width, `#1D254C`, white 19px/700, radius 14px, padding `22px 28px`. Hover `#2A3464`. Label "Send verification code →".

Footer line, centered, 16px: "Already have an account? **Sign in**".

Validation: all three required; email must be a valid address. Disable the button until valid.

### Step 2 — "Check your inbox"

Six single-character code inputs in a flex row, `gap: 8px`, each `width:100%; min-width:0`, centered text, 24px/700, padding `16px 0`, radius 14px. They must fit a 375px viewport — do not set fixed widths.

Required behaviors (implemented in the prototype, replicate them):

- **Auto-advance**: entering a character moves focus to the next input.
- **Paste**: pasting a six-digit code fills all six boxes and focuses the last. Strip non-digits.
- `inputmode="numeric"` so phones show the number pad.
- Add what the prototype lacks: **backspace on an empty box moves focus back**, and an **inline error state** for a wrong or expired code.

Button "Verify and continue →". Below it: "← Change email" (left) and "Didn't get it? **Resend**" (right). Code expires in ten minutes — enforce server-side and surface the expiry in the error copy.

### Step 3 — "Connect your AMS" (NEW)

This is the new capability. One **required** selector: *Which agency management system do you run?*

Options, alphabetical (do not put the supported ones first — agents scanning for their own system find it faster, and you get cleaner data):

```
Agency Matrix, AMS360, Applied CSR24, Applied Epic, Applied TAM,
Better Agency, BriteCore, EZLynx, InsurancePro (ITC), Jenesis,
NowCerts, Novidea, QQCatalyst, Sagitta, Veruna, Other / spreadsheet
```

Three branches off the answer:

**a) Live integration** — `EZLynx`, `Applied Epic`, `Applied TAM`, `Applied CSR24`

Green panel (`#E4F6EE`, radius 16px, padding 20px), checkmark badge `#1F9D6B`:
- Title (17px/700, `#14603F`): "{AMS} is live today"
- Body (15px, `#166B4B`): "Read-only sync. Vista reads eligible vehicles and never writes to your book."
- Divider, then (16px/600, `#166B4B`): "Vista counts the eligible vehicles in your book the moment you connect, and prices coverage for each one."

No placeholder number ships. Once the sync returns a **real count**, surface it here as the headline figure — it is the single most persuasive element in the flow and the reason this panel sits at step 3 rather than on the success screen. Show a skeleton while the count loads; never render an invented or sample figure, and keep the disclosure line "Eligible-vehicle counts are calculated from your own book at connection."

Button: "Connect {AMS} →".

**b) Waitlist** — any other named platform

White card, `1px solid #E0E5F0`, radius 16px, padding 22px:
- Eyebrow (12px/700, uppercase, 0.14em, `#96600F`): "INTEGRATION WAITLIST"
- Title (20px/700, `#1D254C`): "{AMS} is next in line, not next month"
- Body (16px, `#6E778F`): "We build integrations in the order agents ask for them. Join the list and you can still sell today — you enter the vehicle once instead of it being read from your book, and we migrate you the day {AMS} goes live."

Button: "Join the {AMS} waitlist →".

The "you can still sell today" promise is load-bearing. Without it a non-EZLynx agent reads "waitlist" as "come back later" and never returns.

**c) No AMS** — `Other / spreadsheet`

White card:
- Eyebrow `#0D8CFF`: "MANUAL ENTRY"
- Title: "No AMS needed to sell"
- Body: "You enter the vehicle details once at quote time instead of Vista reading them from a book. Everything after that — pricing, the client's online checkout, claims — works exactly the same."

Button: "Continue →". **This branch must NOT create a waitlist record** — enrolling spreadsheet agencies would corrupt the integration demand ranking.

**Gating:** with nothing selected, the primary button renders disabled (`#C7CEDF`, `cursor: not-allowed`) and reads "Select your AMS to continue."

### Step 4 — "You're in."

Green "Account created" chip. H1 44px/800. Body line varies by branch:

- live: "Vista is synced with {AMS} and your agent account is live."
- waitlist: "Your agent account is live and you are first in line for the {AMS} integration."
- no AMS: "Your agent account is live and you can quote with manual vehicle entry."

Then "**Next: licensing**" card — NPN verification handoff — and a three-stat row (eligible-vehicle count from the connected book, `$5,000` diminished value, `0` appointments required). Stat grid uses `repeat(auto-fit, minmax(150px, 1fr))`.

---

# Part 3 — Pipedrive waitlist integration (NEW)

The waitlist must live in Pipedrive, not a spreadsheet — it is already the CRM of record, and a waitlist entry is a lead with a stage.

## Data to capture

| Field | Source | Notes |
|---|---|---|
| `ams_name` | step 3 selector | Required |
| `ams_status` | derived | `live` \| `waitlist` \| `none` |
| `agency_name` | agent record | |
| `first_name`, `last_name`, `email` | step 1 | |
| `npn` | licensing step | Ties demand to a verified producer, not a tire-kicker |
| `resident_state` | NIPR/PDB pull | |
| `book_size_est` | optional prompt | **Ask for this.** It is what turns the list into a build plan |
| `utm_content` | landing UTMs | Which creative produced this demand |
| `created_at` | system | |

`book_size_est` matters more than headcount: forty HawkSoft agents with 200 vehicles each is a better next integration than ninety agents with twenty.

## Pipedrive wiring

Use the Pipedrive REST API v2 with an API token stored server-side (never client-side — the onboarding page must not hold a Pipedrive credential; proxy through your backend).

**Setup, once:**

1. Create a pipeline **"AMS integrations"** with stages: `Waitlisted` → `Build scheduled` → `In development` → `Ready to activate` → `Activated`.
2. Create custom fields on **Person**: `ams_name` (enum matching the selector list), `ams_status` (enum), `npn` (text), `resident_state` (enum), `book_size_est` (numeric), `utm_content` (text).

**On step 3 submit, server-side:**

1. `ams_status = none` → update the Person's `ams_name`/`ams_status` only. **Create no deal.** Return.
2. `ams_status = live` → update the Person. **Create no deal.** Return.
3. `ams_status = waitlist`:
   - `GET /api/v2/persons/search?term={email}&fields=email` to find an existing Person.
   - `POST /api/v2/persons` or `PATCH /api/v2/persons/{id}` with the custom fields.
   - Search open deals for that Person in the AMS integrations pipeline. If one exists for the same `ams_name`, do nothing (idempotent). Otherwise `POST /api/v2/deals` with `title: "AMS waitlist — {ams_name} — {agency_name}"`, the `Waitlisted` stage id, and `person_id`.

**Requirements:**

- **Idempotent.** An agent re-running onboarding, or changing their AMS answer, must not produce duplicate deals. Key on `person_id + ams_name`.
- **Never block onboarding on Pipedrive.** Write the AMS answer to your own database first, then enqueue the Pipedrive sync as a background job with retry and backoff. A Pipedrive outage must not fail a sign-up.
- **Handle AMS changes.** If an agent switches from `HawkSoft` to `EZLynx`, close the old waitlist deal as won/lost appropriately and stop counting them as HawkSoft demand.
- Respect Pipedrive rate limits (token-bucket per company); the retry queue covers 429s.

## The report this exists to produce

One view, refreshed weekly, sorted descending:

```
ams_name | agents waiting | est. vehicles represented | oldest signup date
```

Build the next integration for the top row. The oldest-signup column is the churn warning — a platform waiting six months is a platform whose agents have stopped believing you.

**Activation:** when an integration ships, filter `Waitlisted` by `ams_name`, bulk-move to `Ready to activate`, and trigger the migration email. Agents on that list were promised migration "the day {AMS} goes live" — honor it.

---

## Design tokens

**Colors**

| Token | Hex |
|---|---|
| Navy (brand, text strong) | `#1D254C` |
| Navy deep (ad grounds) | `#0B1024` |
| Navy 900 | `#11173A` |
| Cyan (brand accent) | `#12DEFF` |
| Blue (action, links) | `#0D8CFF` |
| Purple (accent, sparing) | `#8F66FF` |
| Page surface | `#F6F8FC` |
| Border subtle | `#E0E5F0` / `#E4E7EF` |
| Body text | `#4E5670` |
| Muted text | `#6E778F` |
| Disabled | `#C7CEDF` |
| Success | `#1F9D6B` (tint `#E4F6EE`, ink `#14603F` / `#166B4B`) |
| Waitlist amber ink | `#96600F` |
| CTA gradient (dark grounds) | `linear-gradient(120deg,#12DEFF,#0D8CFF)` |

**Typography** — Display: Montserrat (Gotham substitute), weights 700/800. Body: Source Sans 3 (Myriad Pro substitute), 400/600/700. Headlines use tight tracking, `-0.03em` to `-0.045em`.

**Radii** — inputs and buttons 14px; cards 16–18px; ad cards 20–32px; pills 999px.

## Accessibility requirements (non-negotiable)

Every disclosure and trust statement was contrast-audited. Hold the line:

- All legal/disclosure text ≥ 4.5:1 against its own ground. On the cyan `#12DEFF` ground use `rgba(29,37,76,0.88)`; on gradient grounds set an explicit dark ink rather than inheriting white.
- The disclosure must never be the lowest-contrast text on a surface.
- Ad disclosures render at 20px on a 1080px canvas — do not shrink them to make room for copy.

## Compliance — required on every creative and page

> Insureify AI, Inc. DBA Kovara AI. Vehicle service contracts are not insurance; obligations insured by Old Republic Insurance Company Coverage and eligibility subject to contract terms and exclusions. License verification required to sell. All states except California. Administered by Ascent Administration, Mesa, AZ.

Claim-specific qualifiers must sit next to their claim, not in the footer block:

- Price/savings claims → "Savings vary by vehicle, term and coverage."
- AMS claims → "Live today for EZLynx and supported Applied Systems platforms."
- Time claims ("60 seconds", "30 seconds") → "Times are typical, not guaranteed."

The Old Republic trust mark appears on every creative and on the onboarding page.

## Assets

- `assets/vista-mark.png` — the V logomark. On cyan or bright grounds it must sit on a white rounded tile; its cyan wedge otherwise disappears into the background.
- `assets/old-republic-logo.png` — trust mark. Always in a white chip on dark or colored grounds.
- The lockup is composed inline: mark + "Vista™" wordmark + tracked "VEHICLE SERVICE CONTRACTS" beneath, tracking tuned (0.24em) so the subline measures flush with the mark-plus-wordmark row. **The raster logo PNGs still say "EXTENDED WARRANTY" — do not use them.**
- `P1` uses an image placeholder awaiting a real photo (agent at desk, or the client checkout on a phone).

## Files

| File | What it is |
|---|---|
| `PROMPT.md` | Starting prompt to paste into Claude Code |
| `AgentSignupAds.dc.html` | All twenty ad canvases + gallery |
| `AgentSignupFlow.dc.html` | The four-step onboarding prototype |
| `CAPTIONS.md` | Per-ad captions, disclosure boilerplate, hashtags, Meta Employment-category do-not-write list |
| `WAITLIST.md` | Waitlist data model and demand report spec |
| `assets/` | Logo mark and Old Republic trust mark |

Open the `.dc.html` files in a browser to see them render.

## Out of scope, flagged

- **Meta Special Ad Categories.** Agent recruitment can trip the Employment classifier, which restricts targeting. The creative avoids every trigger (no hiring language, no office imagery, no income claims) — keep it that way in any new copy. `CAPTIONS.md` has the do-not-write list.
- **NPN / NIPR PDB integration** exists elsewhere in the app; this flow only hands off to it.
- **Legal review.** The disclosure language is drafted, not counsel-approved. Confirm the exact Old Republic underwriting entity name before launch.
