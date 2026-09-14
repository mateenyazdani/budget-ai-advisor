# Bargainly

Know what you can safely spend, catch what you are quietly paying every
month, and find the cheaper option nearby — then put the good ones on a map
your friends can see.

## The friends map

The centre of the app is `/map`: a world map of places your friends rated,
with what they actually paid. It works like this.

1. Everyone picks a **username** at `/profile`. That is how people find you.
2. You **follow** someone at `/friends`. Nothing is shared yet.
3. When they follow you back you are **friends**, and each of you can see the
   other's pins. A one-way follow shows nothing in either direction.
4. Rating a place on `/discover` — the **I've been** button on a venue card —
   drops a **pin**: a score out of five, the price you paid, and a sentence.

Zoomed out, the map shows one bubble per country, sized by how many places are
pinned there and positioned at the mean of those pins. Past zoom 5 it switches
to the individual places. Tapping a country in the sidebar flies to it.

### Why mutual, and where that rule lives

"Friends" means the follow runs both ways, so nobody's map is readable by a
stranger who followed them once. That rule is a row level security policy on
`public.pins`, enforced by `public.is_friend(a, b)` in Postgres — not a filter
in a query. A query that forgets to filter returns nothing it should not,
because the database refuses rather than the application remembering.

`profiles` is the one table that is readable by any signed-in user, because
searching for a friend by username means reading a row that is not yours. Only
username, display name, emoji and home country are exposed.

### Map tiles

The map is Leaflet with OpenStreetMap tiles, which need no API key and no
account. Markers are drawn as HTML elements rather than Leaflet's default PNG,
which a bundler rewrites and then cannot find.

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

## Live deals and prices

Google Places returns venues but no offers, and Groupon retired its public API,
so there is no feed to plug in. Instead `api/deals.js` and `api/prices.js` use
Claude with server-side web search to find real, currently-advertised offers and
current local prices, and every result carries the source URL it came from.

Both endpoints are told explicitly never to invent an offer or estimate a price,
and to return an empty result instead — so an empty list is a correct answer,
not a failure. The UI shows the source link on every card and asks the user to
check it, because a web result can be stale.

They need only `ANTHROPIC_API_KEY`. Results are cached in memory per warm
instance: one hour for deals, a day for prices.

`api/prices.js` also takes an `age`, so it can look up the youth or senior fare
that actually applies rather than a single average.

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
