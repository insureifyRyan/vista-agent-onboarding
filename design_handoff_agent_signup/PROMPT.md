# Claude Code — starting prompt

Copy everything below the line into Claude Code, with this folder available in the repo.

---

I'm implementing an agent sign-up flow and a Pipedrive-backed AMS integration waitlist in the Kovara app. The design is finished and documented — read `design_handoff_agent_signup/README.md` first and treat it as the spec.

**Context**

Kovara AI (legal entity: Insureify AI, Inc. DBA Kovara AI) sells Vista vehicle service contracts through licensed independent insurance agents. We're running paid social to recruit agents. The ads point at `www.kovara.ai/onboarding` with per-creative UTMs. Onboarding steps 1 and 2 (name/email, then email verification code) already exist in production. Step 3 — an AMS selector that branches into a live integration, an integration waitlist, or manual entry — is new, and it's the reason for this work.

**What's in the handoff folder**

- `README.md` — the spec: every screen, exact copy, colors, type, states, validation, and the Pipedrive integration design.
- `AgentSignupFlow.dc.html` — the four-step onboarding prototype. Open it in a browser.
- `AgentSignupAds.dc.html` — the twenty ad creatives. Reference only; no engineering needed.
- `WAITLIST.md` — waitlist data model and the demand report it must produce.
- `CAPTIONS.md` — ad captions and compliance copy.
- `styles.css` + `tokens/` — the design tokens as CSS custom properties.

**Important:** the `.dc.html` files are design references, not production code. Recreate them in our existing stack using our established components, patterns, and styling approach. Do not port the HTML or its inline styles.

**Two things in the prototype are review scaffolding — do not build them:**
1. The "Preview 1 / 2 / 3 / 4" step nav at the top of the flow.
2. The gallery chrome around the ads.

**Scope, in the order I want it done**

1. **UTM capture** (smallest, unblocks measurement). The onboarding page reads `utm_source`, `utm_medium`, `utm_campaign`, `utm_content` on first load, persists them to `sessionStorage` so they survive the email-verification round trip, and writes them onto the agent record at creation along with `landing_url` and `referrer`. Without this, all twenty creatives are indistinguishable in reporting.

2. **Step 3 — AMS selector.** One required field, sixteen options, alphabetical (see README for the exact list — do not reorder to put supported platforms first). Three branches:
   - **Live** (`EZLynx`, `Applied Epic`, `Applied TAM`, `Applied CSR24`) → green confirmation panel, button reads "Connect {AMS} →".
   - **Waitlist** (any other named platform) → waitlist card, button reads "Join the {AMS} waitlist →".
   - **No AMS** (`Other / spreadsheet`) → manual-entry card, button reads "Continue →", and **no waitlist record is created**. Enrolling spreadsheet agencies would corrupt the integration demand ranking.

   With nothing selected the primary button is disabled and reads "Select your AMS to continue." Copy for all three panels is verbatim in the README — it's legal- and marketing-approved, so don't paraphrase.

3. **Pipedrive waitlist sync.** Pipeline "AMS integrations" with stages `Waitlisted → Build scheduled → In development → Ready to activate → Activated`, and custom Person fields per the README. On a waitlist answer: upsert the Person, then create one deal keyed on `person_id + ams_name`.

   Hard requirements:
   - **Idempotent.** Re-running onboarding or changing the AMS answer must never produce duplicate deals.
   - **Never block a sign-up on Pipedrive.** Write to our own database first, then enqueue the sync as a background job with retry and backoff. A Pipedrive outage must not fail onboarding.
   - **API token stays server-side.** The onboarding page must never hold a Pipedrive credential — proxy through our backend.
   - **Handle AMS changes.** If an agent switches from HawkSoft to EZLynx, close the stale waitlist deal so they stop counting as HawkSoft demand.

4. **Step 2 improvements.** The existing code-entry screen needs auto-advance on input, paste support that fills all six boxes from a pasted code, `inputmode="numeric"`, backspace-on-empty moving focus back, and an inline error state for a wrong or expired code.

5. **Step 4 — success screen** with branch-specific copy (three variants in the README) and the licensing/NPN handoff card.

**Non-negotiables**

- **Compliance text is verbatim.** Every page carries: "Insureify AI, Inc. DBA Kovara AI. Vehicle service contracts are not insurance; obligations insured by Old Republic Insurance Company. Coverage and eligibility subject to contract terms and exclusions. License verification required to sell. Eligible-vehicle counts are calculated from your own book at connection. All states except California. Administered by Ascent Administration, Mesa, AZ." Don't edit, shorten, or reflow it, and don't let it become the lowest-contrast text on the page.
- **Accessibility.** All disclosure text ≥ 4.5:1 against its own background. On the cyan `#12DEFF` ground use `rgba(29,37,76,0.88)`.
- **No invented numbers.** The eligible-vehicle count must come from the real AMS sync. Show a skeleton while it loads; never render a sample figure.
- **Mobile first.** Agents arrive from Instagram on phones. The six code boxes must fit a 375px viewport, and the name fields collapse to one column.
- **Logo:** compose the lockup from `assets/vista-mark.png` plus type — the raster logo PNGs still say "EXTENDED WARRANTY" and must not be used. On cyan or bright backgrounds the mark needs a white tile behind it or its cyan wedge disappears.

**Acceptance criteria**

- A new agent can complete all four steps on a 375px-wide phone.
- Selecting a waitlist AMS creates exactly one Pipedrive deal; running the flow again creates none.
- Selecting `Other / spreadsheet` creates zero Pipedrive deals.
- `utm_content` from the landing URL is present on the created agent record.
- A forced Pipedrive failure still lets the agent finish onboarding.
- The demand report query returns: `ams_name`, agents waiting, estimated vehicles represented, oldest signup date — sorted descending.

Start by reading the README and the flow prototype, then tell me your implementation plan and which of our existing components you'll use for the inputs, buttons, and cards before you write code.
