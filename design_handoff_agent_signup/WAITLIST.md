# AMS integration waitlist — spec

Live today: **EZLynx, Applied Epic, Applied TAM, Applied CSR24.**
Everything else: waitlist, and the agent can still sell (manual vehicle entry instead of book sync).

## What to capture

At the AMS step of onboarding, one required field: *Which agency management system do you run?*

| Field | Source | Notes |
|---|---|---|
| `ams_name` | selector | Required. Free-text fallback only behind "Other / spreadsheet". |
| `ams_status` | derived | `live` or `waitlist` |
| `agency_name` | step 1 | |
| `agent_email` | step 1 | |
| `npn` | licensing step | Ties demand to a verified producer, not a tire-kicker |
| `resident_state` | NIPR pull | |
| `book_size_est` | optional | Single most useful field for ranking demand |
| `created_at` | system | |

`book_size_est` is what turns the list from a signup log into a build plan — 40 agents on HawkSoft with 200 vehicles each beats 90 agents with 20.

## Selector options

Applied CSR24 · Applied Epic · Applied TAM · Agency Matrix · AMS360 · Better Agency · BriteCore · EZLynx · InsurancePro (ITC) · Jenesis · NowCerts · Novidea · QQCatalyst · Sagitta · Veruna · Other / spreadsheet

Alphabetical, not "ours first" — an agent scanning for their own system finds it faster, and you get cleaner data than if EZLynx sits at the top and gets mis-picked.

## Where it lives

Pipedrive, not a spreadsheet — you already run it, and the waitlist entry is a lead with a deal stage. Suggested wiring:

1. Onboarding writes the AMS answer to the agent record in your app.
2. On `ams_status = waitlist`, create/update a Pipedrive person + deal in a **"Waiting on AMS integration"** stage, with `ams_name` as a custom field.
3. When an integration ships, filter that stage by `ams_name`, bulk-move to "Ready to activate", and trigger the migration email.

## The demand report you actually need

One view, sorted descending, refreshed weekly:

`ams_name` | agents waiting | est. vehicles represented | oldest signup date

Build the next integration for the top row. The oldest-signup column is your churn warning — a platform that has been waiting six months is a platform whose agents have stopped believing you.

## Ads

A static Meta feed image cannot contain a dropdown — the creative is a flat PNG. Two correct ways to collect AMS at the ad level:

- **Meta Lead Ads** with a dropdown question. Copy for it:
  - Question: *Which agency management system does your agency use?*
  - Options: the list above.
  - Follow-up: *Roughly how many personal auto policies do you write a year?* (ranges: under 100 / 100–500 / 500–2,000 / 2,000+)
  - Then webhook into Pipedrive with the same fields.
- **Ad → onboarding**, where the selector already exists. Fewer, better leads.

Run Lead Ads as a second campaign, not the primary. In-platform forms convert at higher volume and much lower intent, which is fine for building a waitlist and bad for building a producer roster.
