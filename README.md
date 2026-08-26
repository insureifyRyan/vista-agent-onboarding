# Vista agent onboarding

The destination for the Vista agent-recruitment paid-social creatives:
`kovara.ai/onboarding`. Four steps — name and email, email verification, AMS
connection, and a licensing handoff — plus the Pipedrive-backed AMS integration
waitlist behind step 3.

Built from `design_handoff_agent_signup/`, which is committed here as the spec.

```bash
npm install
cp .env.example .env
npm run dev          # http://localhost:3000/onboarding
npm run jobs:work    # in a second terminal: drains the Pipedrive sync queue
npm test
```

Without `RESEND_API_KEY` the verification code is printed to the server console,
so the flow is walkable with no email provider configured.

## What the ads need from this app

Every creative points at:

```
https://www.kovara.ai/onboarding?utm_source=meta&utm_medium=paid_social&utm_campaign=agent_signup&utm_content=<FRAME_ID>
```

`utm_content` is the frame id (`A1`, `B3`, `S2`, `R1`, `P1`…) and is the only
thing that tells the twenty creatives apart in reporting. `src/lib/attribution.ts`
reads all four UTM params on first load, holds them in `sessionStorage` so they
survive the trip to the agent's inbox and back, and `POST /api/onboarding/start`
writes them onto the agent record at creation along with `landing_url` and
`referrer`. Attribution is first-touch: a later visit with no query string never
overwrites the creative that converted.

## The AMS step

One required selector, sixteen options, alphabetical with `Other / spreadsheet`
pinned last — deliberately not "ours first", so an agent scanning for their own
system finds it faster and the answers stay clean. `src/lib/ams/catalog.ts` is
the source of truth; do not reorder it.

| Branch | Platforms | Panel | Button | Pipedrive |
|---|---|---|---|---|
| `live` | EZLynx, Applied Epic, Applied TAM, Applied CSR24 | green confirmation | `Connect {AMS} →` | Person only, **no deal** |
| `waitlist` | any other named platform | waitlist card | `Join the {AMS} waitlist →` | Person + exactly one deal |
| `none` | `Other / spreadsheet` | manual-entry card | `Continue →` | **nothing at all** |

The `none` branch stays out of Pipedrive entirely: enrolling spreadsheet
agencies would corrupt the integration demand ranking, which is the only thing
that pipeline exists to produce.

With nothing selected the primary button is disabled and reads
"Select your AMS to continue."

### The eligible-vehicle count

There is no AMS connector in this repo yet, so
`src/lib/ams/eligibleVehicles.ts` returns `unavailable` and the UI renders a
skeleton and then nothing. **Keep it that way until a real sync exists.** The
count is persuasive precisely because it is the agent's own book — a sample
figure would be a number we invented, shown to a producer who is about to check
it against reality. When the connector lands, return
`{ status: 'ready', count }` from that module and both the step 3 panel and the
step 4 stat tile pick it up.

## Pipedrive

Run the one-time setup, then paste the printed keys into `.env`:

```bash
PIPEDRIVE_API_TOKEN=... node --experimental-strip-types scripts/pipedrive-setup.ts --dry-run
PIPEDRIVE_API_TOKEN=... node --experimental-strip-types scripts/pipedrive-setup.ts
```

It creates the **AMS integrations** pipeline
(`Waitlisted → Build scheduled → In development → Ready to activate → Activated`)
and the Person custom fields. Custom-field keys are hashed per account, which is
why they come from the environment rather than the source.

Four properties hold, and each has a test:

- **Server-side only.** `src/lib/pipedrive/client.ts` throws if it is ever
  imported into client code. The page talks to our routes; our routes talk to
  Pipedrive.
- **Idempotent**, keyed on `person_id + ams_name`. Our own `pipedrive_links`
  table is the fast path and a Pipedrive-side deal search is the backstop, so a
  lost link row still cannot produce a twin.
- **Never blocking.** The AMS answer is written to our database first, then the
  sync is enqueued. A Pipedrive outage — or a queue that refuses the job — costs
  a CRM row, never a sign-up.
- **AMS changes are handled.** Switching from a waitlisted platform to another
  marks the stale deal lost, so the agent stops counting as demand for the one
  they left.

Failed syncs retry with exponential backoff (30s → 1h cap, 8 attempts) and give
up immediately on a non-retryable error rather than looping.

### Draining the queue

`POST /api/jobs/run` with `Authorization: Bearer $JOBS_RUN_SECRET`. Point a
scheduler at it once a minute — Vercel Cron, or anything that can issue an
authenticated POST. `npm run jobs:work` does the same thing in a loop for
development.

### The demand report

`GET /api/reports/ams-demand` with `Authorization: Bearer $REPORTS_SECRET`
returns `ams_name`, agents waiting, estimated vehicles represented, and oldest
signup date.

It ranks by **vehicles represented** by default (`?sort=agents` for headcount):
forty agents on one platform with 200 vehicles each is a better next integration
than ninety agents with twenty. `oldest_signup` is the churn warning column — a
platform waiting six months is a platform whose agents have stopped believing us.

When an integration ships, filter `Waitlisted` by `ams_name`, bulk-move to
`Ready to activate`, and send the migration email. Those agents were promised
migration "the day {AMS} goes live".

## Layout

```
src/app/                     routes and API handlers
  api/onboarding/            start, verify, resend, ams, eligible-vehicles
  api/jobs/run               queue drain
  api/reports/ams-demand     the demand report
src/components/onboarding/   page shell and the four steps
src/components/ui/           Button, TextField, CodeInput, Panel
src/lib/ams/                 catalog, approved copy, eligible-vehicle count
src/lib/pipedrive/           client, config, sync
src/lib/jobs/                queue and worker
src/lib/db/                  Store interface and the SQLite adapter
sql/                         schemas
scripts/                     Pipedrive setup, dev job worker
design_handoff_agent_signup/ the design handoff, as delivered
```

Styling is CSS modules over the handoff's own tokens
(`src/styles/tokens/`). The `.dc.html` prototypes are references, not sources —
nothing was ported from them.

## Compliance

`src/lib/compliance.ts` holds the disclosure verbatim and a test asserts it
character for character. It renders at `--text-body` (10.3:1 on the page
surface) so it is never the lowest-contrast text on the page. Claim-specific
qualifiers sit next to their claims rather than in the footer.

The lockup is composed from `vista-mark.png` plus type — the raster logo PNGs
still read "EXTENDED WARRANTY" and must not be used.

## Storage

The shipped adapter is SQLite via `node:sqlite`, which needs no native build and
is what the tests run against. Serverless filesystems are ephemeral, so before
production either mount a volume for `DATABASE_FILE` or implement the `Store`
interface (`src/lib/db/types.ts`) against Postgres — `sql/postgres.sql` has the
schema and `tests/store-contract.test.ts` is the adapter-agnostic suite that
proves a new adapter behaves identically.

## Known gaps

- **No AMS connector**, so no eligible-vehicle count. See above.
- **`agency_name` is not collected.** Step 1 is name and email only, per the
  approved design, so waitlist deals title as "Unknown agency" until the
  licensing step fills it in. `npn` and `resident_state` come from the same
  place.
- **`/licensing` does not exist here.** Step 4's button points at it; the NPN /
  NIPR PDB integration lives elsewhere in the Kovara app.
- **Two approved colours fall just under 4.5:1** for normal-size text: the muted
  subcopy `#6E778F` (4.20:1 on the page surface, 4.47:1 on white). They are the
  design's core muted tone and are not disclosure text, so they were left as
  approved — worth a designer's ruling. The trust-row administrator line was
  changed: at `#9AA3BC` it measured 2.37:1, and it is a trust statement.
- **Legal review outstanding.** The handoff carries three different wordings of
  the disclosure; `PROMPT.md`'s is the one implemented. Confirm the exact Old
  Republic underwriting entity name before launch.
