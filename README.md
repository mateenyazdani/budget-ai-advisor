# budget-ai-advisor

AI-powered budgeting app with Claude.

## Setup

```bash
npm install
cp .env.example .env   # then fill in the keys
```

| Variable | Used by | Where to get it |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | `api/claude-advisor.js` | https://console.anthropic.com/settings/keys |
| `GOOGLE_PLACES_API_KEY` | `api/places.js` | Google Cloud console → Credentials, with **Places API (New)** enabled |
| `GOCARDLESS_SECRET_ID` / `GOCARDLESS_SECRET_KEY` | `api/bank/*` | https://bankaccountdata.gocardless.com → Developers → User secrets |
| `APP_URL` | `api/bank/connect.js` | Public URL of the deployed app. Optional; falls back to `VERCEL_URL` |

Neither key takes a `REACT_APP_` prefix. That prefix compiles a value into the
public JavaScript bundle, where any visitor can read it; both keys are read only
by the serverless functions in `api/`.

## Running locally

`npm start` runs the React dev server, but it does **not** serve `api/`. The
advisor and the places feed will fall back to their offline states.

To run the API routes locally, use the Vercel CLI:

```bash
npx vercel dev
```

## Smart Spending data

Google Places returns venues, ratings, price bands and opening hours. It does
not return discounts or offers, so the app shows no discount percentages. The
"typical spend" figure on each card is an estimate derived from Google's price
band (`€`–`€€€€`) and is labelled as an estimate in the UI.

Without `GOOGLE_PLACES_API_KEY`, or if the user declines location access, the
page shows a small set of clearly-labelled sample venues instead.

## Bank connections

Revolut does not expose personal account data to third-party apps directly.
Reading consumer transactions is regulated under PSD2 and requires an AISP
licence, so this app connects through **GoCardless Bank Account Data**, which
holds that licence. The user authenticates on their own bank's page; no bank
credentials pass through this app.

The flow is: `institutions` (list banks) → `connect` (create an end-user
agreement and requisition, returning a hosted link) → `accounts` (once the user
returns) → `transactions`.

### Known limitation before real users

The requisition ID is stored in the browser's `localStorage` and sent to
`api/bank/*` to identify the connection. There is no server-side session binding
it to a user, because the app's "login" is an unverified phone number and
username in `localStorage`. Anyone who obtains a requisition ID could read that
account's transactions through these endpoints.

That is acceptable for a personal project on your own data. Before this handles
anyone else's accounts it needs real authentication and server-side storage that
binds each requisition to an authenticated user.

## Deploying

The app is a Create React App front end plus Vercel serverless functions in
`api/`. Set both environment variables in the Vercel project settings before the
first deploy, then:

```bash
npx vercel --prod
```
