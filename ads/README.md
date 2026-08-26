# Agent sign-up creatives

Nineteen finished creatives, exported at true pixel size from
`design_handoff_agent_signup/AgentSignupAds.dc.html`. Static images — upload to
Meta with the destination URL below. No engineering needed to run them; the only
app-side dependency is UTM capture, which is already live on `/onboarding`.

Regenerate with:

```bash
node --experimental-strip-types scripts/export-ads.mts
```

It needs a Chromium (`npx playwright install chromium`, or set `CHROMIUM_PATH`
to one already on disk) and reaches fonts.googleapis.com for Montserrat and
Source Sans 3. Where that host is unreachable, drop the `.woff2` files into
`ads/fonts/` and the script uses those instead — without one or the other the
export falls back to a system face and is not usable.

## Destination URL

Every CTA-bearing frame points at the same place, with its own `utm_content`:

```
https://www.kovara.ai/onboarding?utm_source=meta&utm_medium=paid_social&utm_campaign=agent_signup&utm_content=<FRAME_ID>
```

`utm_content` is the only thing that tells these nineteen apart in reporting —
set it per creative when you build the ad, and don't let Meta's URL builder
overwrite it.

## The set

| Frame | Size | Ratio | Placement | Caption in `CAPTIONS.md` |
|---|---|---|---|---|
| A1 | 1080×1350 | 4:5 | IG + FB feed | A1 / B1 — Speed |
| A2 | 1080×1350 | 4:5 | IG + FB feed | A2 / B5 — AI selling from the AMS |
| A3 | 1080×1350 | 4:5 | IG + FB feed | A3 — Dealer markup |
| A4 | 1080×1350 | 4:5 | IG + FB feed | A4 — 30-second checkout |
| A5 | 1080×1350 | 4:5 | IG + FB feed | A5 / B4 — Coverage and carrier |
| B1 | 1080×1350 | 4:5 | IG + FB feed | A1 / B1 — Speed |
| B2 | 1080×1350 | 4:5 | IG + FB feed | B2 — Product suite |
| B3 | 1080×1350 | 4:5 | IG + FB feed | B3 — Three nos |
| B4 | 1080×1350 | 4:5 | IG + FB feed | A5 / B4 — Coverage and carrier |
| B5 | 1080×1350 | 4:5 | IG + FB feed | A2 / B5 — AI selling from the AMS |
| S1 | 1080×1080 | 1:1 | Right column, Marketplace, Audience Network | A1 / B1 — Speed |
| S2 | 1080×1080 | 1:1 | Right column, Marketplace, Audience Network | A3 — Dealer markup |
| S3 | 1080×1080 | 1:1 | Right column, Marketplace, Audience Network | A5 / B4 — Coverage and carrier |
| R1 | 1080×1920 | 9:16 | Stories | A1 / B1 — Speed |
| R2 | 1080×1920 | 9:16 | Stories | A3 — Dealer markup |
| R3 | 1080×1920 | 9:16 | Stories | A5 / B4 — Coverage and carrier |
| V1 | 1080×1920 | 9:16 | Reels | Reels cuts — **full boilerplate required** |
| V2 | 1080×1920 | 9:16 | Reels | Reels cuts — **full boilerplate required** |
| V3 | 1080×1920 | 9:16 | Reels | Reels cuts — **full boilerplate required** |

Two directions run through the feed set: **A1–A5 "Ledger"** (near-black ground,
hairline rules, one cyan accent) and **B1–B5 "Signal"** (bright cyan ground,
navy type). S/R/V are cut from whichever direction their row names.

**P1 is not here.** It is the photo variant and holds an empty image slot —
excluded from the launch set until a real photo is supplied (an agent at a desk,
or the client checkout on a phone). `scripts/export-ads.mts` skips it by name;
remove it from `EXCLUDED` once the photo is in.

## Rules that are already baked in — keep them that way

- **Reels (V1–V3) carry no in-image CTA.** Reels supplies its own, and content
  sits above the chrome zone. Their in-image legal line is the short form, so
  **the caption must carry the full boilerplate** — never run a Reels cut with a
  truncated caption.
- **Stories (R1–R3)** keep content above the 250px bottom reserve.
- **Disclosures render at 20px** on the 1080px canvas. Do not shrink them to make
  room for copy.
- **Claim-specific qualifiers sit next to their claim**, not in the footer block:
  savings claims, AMS availability, and "60 seconds" timing each carry their own.
- **The Old Republic trust mark appears on every creative.**
- **On the bright grounds the Vista mark sits on a white tile** — its cyan wedge
  disappears otherwise.

## Meta Special Ad Categories

Agent recruitment can trip the Employment classifier, which restricts targeting.
The creative avoids every trigger — no hiring language, no office imagery, no
income claims. Keep it that way in any new copy; `CAPTIONS.md` has the
do-not-write list.

## Compliance

The block on every CTA-bearing frame reads:

> Insureify AI, Inc. DBA Kovara AI. Vehicle service contracts are not insurance;
> obligations insured by Old Republic Insurance Company. Coverage and eligibility
> subject to contract terms and exclusions. License verification required to sell.
> All states except California. Administered by Ascent Administration, Mesa, AZ.

This is the same text the onboarding page carries, minus one sentence: the page
adds *"Eligible-vehicle counts are calculated from your own book at connection."*
because it displays a count and an ad does not. `tests/compliance.test.ts` asserts
all seventeen frames carry it verbatim and that it still matches the page, so the
art and the landing page cannot drift apart.

The three Reels cuts carry the short line instead — *"Vehicle service contracts
are not insurance. Available in all states except California. Full terms in the
caption."* — which is why **a Reels cut must never run with a truncated caption**.

### Still open for counsel

The disclosure names an **insurer** (Old Republic) and an **administrator**
(Ascent) but no **obligor** — the entity actually on the hook for the contract.
Most VSC disclosure regimes want that named. It is not in the handoff and is not
something to infer, so it needs an answer from counsel along with confirmation of
the exact Old Republic underwriting entity name. If a sentence is added, put it in
`src/lib/compliance.ts` and re-run the export; the page and all nineteen creatives
update together.
