# Agent sign-up creatives

Twenty-three finished creatives, exported from
`design_handoff_agent_signup/AgentSignupAds.dc.html` in two sets:

- **`ads/2x/` — upload these.** 2160x2700 / 2160x2160 / 2160x3840. Meta wants the
  highest resolution available and downsamples better than we can; at the same
  physical size the type is visibly crisper than the 1x set.
- **`ads/` — 1x, true pixel size.** 1080 wide, matching the handoff spec. Use it
  where something insists on exact placement dimensions.

Both carry identical artwork and copy. Static images — upload to
Meta with the destination URL below. No engineering needed to run them; the only
app-side dependency is UTM capture, which is already live on `/onboarding`.

Regenerate with:

```bash
node --experimental-strip-types scripts/export-ads.mts
```

Set `EXPORT_SCALE=2` for the 2x masters; the default is 1x.

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

Sizes below are the 1x set; the 2x masters are double in both dimensions.

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
| A6 | 1080×1350 | 4:5 | IG + FB feed | A6 / B6 — No cost to add |
| A7 | 1080×1350 | 4:5 | IG + FB feed | A7 / B7 — Every auto quote |
| B6 | 1080×1350 | 4:5 | IG + FB feed | A6 / B6 — No cost to add |
| B7 | 1080×1350 | 4:5 | IG + FB feed | A7 / B7 — Every auto quote |
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
- **The pill reads "Insurance Agency Exclusive VSC program"** — the audience is
  agencies, not individual agents.
- **On the bright grounds the Vista mark sits on a white tile** — its cyan wedge
  disappears otherwise.

## Meta Special Ad Categories

Agent recruitment can trip the Employment classifier, which restricts targeting.
The creative avoids every trigger — no hiring language, no office imagery, no
income claims. Keep it that way in any new copy; `CAPTIONS.md` has the
do-not-write list.

## Compliance

Every entity name, address, phone number and licence number comes from the
executed contract form (Elevate Platinum VSC, `AAS VSC 1 11-2022`), not from the
design handoff. `src/lib/compliance.ts` is the source; `tests/compliance.test.ts`
pins each value and asserts all seventeen CTA-bearing frames carry the block
verbatim, so the art and the landing page cannot drift apart.

The block on every CTA-bearing frame:

> Insureify AI, Inc. DBA Kovara AI. Vehicle service contracts are not insurance,
> a warranty, or a guarantee. Administrator and obligor: Ascent Administration
> Services, LLC, Tempe, AZ; administrator and obligor vary by state. Obligations
> are insured under a contractual liability insurance policy issued by Old
> Republic Insurance Company. Coverage and eligibility subject to contract terms
> and exclusions. Producer license verification required to sell. Available in
> all states except California.

The onboarding page adds one sentence — *"Eligible-vehicle counts are calculated
from your own book at connection."* — because it displays a count and an ad does
not.

The three Reels cuts carry the short line instead — *"Vehicle service contracts
are not insurance. Available in all states except California. Full terms in the
caption."* — which is why **a Reels cut must never run with a truncated caption**.

### What the contract corrected

| Was | Is |
|---|---|
| "Administered by Ascent Administration, Mesa, AZ" | **Ascent Administration Services, LLC**, 360 South Smith Road, **Tempe**, AZ 85281, 866-660-7003 |
| No obligor named | Ascent is the **administrator and obligor** |
| "obligations insured by Old Republic Insurance Company" | obligations are insured **under a contractual liability insurance policy issued by** Old Republic — Old Republic insures the obligor, it is not the obligor (except in Florida) |
| "not insurance" | "not insurance, **a warranty, or a guarantee**" — the contract's own front-page wording |

### Where the parties change

Old Republic runs three states under different entities. Any state-specific
disclosure must use the right one rather than defaulting to Ascent:

| State | Role | Entity |
|---|---|---|
| CA | Administrator & obligor | Old Republic Insured Automotive Services, Inc., 8282 S Memorial Dr., Ste. 202, Tulsa, OK 74133 · 800-331-3780 · Lic. 0C79822 |
| FL | Administrator | Minnehoma Automobile Association, Inc., P.O. Box 35008, Tulsa, OK 74153-0008 · 800-644-9680 · Lic. 60033 |
| FL | Obligor | Old Republic Insurance Company, P.O. Box 35008, Tulsa, OK 74153-0008 · 800-644-9680 |
| NY | Administrator & obligor | ORIAS Warranty Services, 8282 S Memorial Dr., Ste. 202, Tulsa, OK 74133 · 800-331-3780 |

Direct-claim right (contract VI(l)): if the obligor fails to pay or provide
service within sixty days of proof of loss, the buyer may claim directly against
Old Republic Insurance Company, P.O. Box 35008, Tulsa, OK 74153-0008,
(800) 331-3780.

### Why California is excluded

The contract carries a full California section and names a California-approved
administrator and obligor, which looks at first like the exclusion is stale. It is
not.

Those California provisions assume **a dealer** is selling the contract.
California requires a **dealer licence** to sell a vehicle service contract, and
Kovara does not hold one — the agents this campaign recruits are insurance
producers. The California entity is real, but it is not a route open to this
channel.

"Available in all states except California" is a licensing fact. Leave it.

## The two signup-driver frames

These four are new, and they exist because the ads carry the whole persuasion
load — traffic goes straight to the Kovara app signup, with no landing page in
between. The original ten described the product well but left two questions
that a cold agent answers with "no": *what does this cost me*, and *what do I
actually have to do*.

**A6 / B6 — "No cost to add. No minimums."** The set had no economics language
anywhere. Silence on price reads as a fee nobody is mentioning. Cost and risk
framing is not an income claim, so it clears the Meta Employment category where
"earn $X" would not.

> ⚠️ **Confirm before spend.** These frames assert there is no platform fee, no
> minimum, and no carrier appointment requirement. That is a commercial claim on
> a paid ad — verify all three are literally true of the agency terms.

**A7 / B7 — "Every auto quote gets a VSC quote."** The strongest hook available:
the agent does nothing and a VSC quote appears alongside the auto quote they were
already running. Carries the AMS qualifier next to the claim, since it depends on
the integration being live for that platform.

Both run in each direction so they can be tested head to head.

## Presentation lifts

Four adjustments sit on top of the approved artwork. They are driven by
structural hooks written into the canvases at `data-vw-ground="dark|bright"`, so
nothing lands on a frame where it would be wrong — the bright-ground frames keep
their flat mark on a white tile, and only the dark grounds get the glows.

| Lift | What it does | Where |
|---|---|---|
| Cyan bloom | A wide, low-opacity `text-shadow` so the accent reads luminous rather than printed on. It lightens the surround, not the glyphs. | Display cyan on dark grounds only |
| Mark separation | A cyan drop shadow plus a dark one, so the mark's cyan wedge stops merging into `#0B1024` at feed scale and the purple wedge stays anchored | Dark grounds only |
| CTA body | A lit top edge and a cast shadow in the button's own hue, so it reads as a physical control | All 17 CTAs, softer on bright grounds |
| Tighter display tracking | A further `0.006em` on type at 96px and above, where the drawn tracking still read loose | 18 headlines |

The small inline cyan `<b>` words inside body copy are deliberately left flat.
At that size a bloom muddies the letterforms instead of lifting them.

## Rendering notes

The export applies `-webkit-font-smoothing: antialiased` and
`text-rendering: geometricPrecision`. The first turns off subpixel antialiasing,
which would otherwise bake coloured fringes into the edges of glyphs — invisible
on the screen it was tuned for, visible once the image is composited somewhere
else. The second stops Chromium rounding glyph advances to whole pixels, so the
tracked display type keeps the spacing it was drawn with.

### The one asset that caps sharpness

| Asset | Source | Rendered at | Headroom |
|---|---|---|---|
| `vista-mark.png` | 1554x1322 | ~109px tall | ~12x — sharp at any export scale |
| `old-republic-logo.png` | **205x58** | 42px tall | none — already 72% of native at 1x |

At 2x the Old Republic mark is upscaled past its native resolution. It still
looks better than the 1x version at the same display size, but it is the
limiting asset in the set and the only thing stopping these being pin-sharp
throughout. A vector or higher-resolution file from Old Republic would fix it
outright; do not trace or redraw the mark, it is their trademark and an
approximate reproduction is worse than a slightly soft accurate one.
