# Saltway — Sailing Surf Adventures

A fast, static, mobile-first marketing site for **Saltway**, a premium sailing-surf
adventure brand running small-group expeditions in Eastern Indonesia (Sumba,
Sumbawa, Lombok).

> *The story starts where the shore ends.*

Plain semantic HTML + CSS + a little vanilla JS. **No build step, no framework.**
It deploys as-is to Netlify, Vercel or GitHub Pages.

---

## What's here

```
index.html              # all page markup + baseline JSON-LD + <noscript> trip fallback
styles/main.css         # all styling (editorial expedition-logbook theme)
scripts/main.js         # renders trips + schedule from JSON, JSON-LD, booking form
scripts/gen-placeholders.mjs   # dev-only: regenerates the placeholder images
data/trips.json         # voyages + day trips  ← edit prices/details here
data/schedule.json      # the афиша / upcoming departures ← edit dates here
data/seo.json           # FAQ + reviews used for the visible FAQ and JSON-LD
assets/                 # placeholder SVG images (replace with real photos/video)
robots.txt              # allows all crawlers, points to the sitemap
sitemap.xml             # update the domain after deploy
```

The three priority features:

1. **Афиша / schedule** — `#schedule`, rendered from `data/schedule.json`.
   Sorts soonest-first, hides past dates automatically, shows status states, and
   every row's CTA pre-fills the booking form (and WhatsApp) with that trip + dates.
2. **AI-search / GEO** — meta + Open Graph + Twitter tags, `robots.txt` + `sitemap.xml`,
   a visible FAQ, and valid schema.org JSON-LD (Organization/TravelAgency,
   one TouristTrip+Offer per voyage, FAQPage, AggregateRating + Review, BreadcrumbList).
   Trips also appear in a `<noscript>` block so crawlers always see them.
3. **Booking form** — `#book`, validates client-side, pre-fills from any trip/афиша
   CTA, shows a success state, plus a prominent WhatsApp button and Instagram link.

---

## Editing content (no HTML needed)

All trip, schedule and FAQ content lives in `/data/*.json`. Edit those files and
refresh — the page re-renders.

### Add or change a departure (афиша)

Edit `data/schedule.json`. Each entry:

```json
{
  "id": "sumba-jul",                 // unique id
  "trip": "Sumba — Secret Breaks",   // display name (shown on the row)
  "tripId": "sumba-secret-breaks",   // must match an id in trips.json (for pre-fill)
  "boat": "Trimaran",
  "start": "2026-07-05",             // YYYY-MM-DD; past dates hide automatically
  "days": 6,
  "spotsLeft": 1,                    // 0 → shown as "Waitlist"
  "priceFrom": 1500,                 // USD
  "status": "open"                   // "open" | "almost-full" | "waitlist" | "sold-out"
}
```

### Add or change a trip

Edit `data/trips.json` (`voyages` for multi-day, `days` for one-day/evening).
Prices are numbers in USD (`priceFrom`) for voyages, or a free-text
`priceFromText` for days. Each trip's `id` is what `schedule.json` references.

### Edit the FAQ / reviews

Edit `data/seo.json`. The `faq` array drives both the visible FAQ accordion and
the `FAQPage` structured data. `reviews` + `aggregateRating` drive the
testimonials and the Review/AggregateRating JSON-LD — swap in real reviews as
they come in.

---

## Configuration (one place)

Open `scripts/main.js` and edit the constants at the top:

```js
const FORMSPREE_ENDPOINT = "https://formspree.io/f/your-form-id"; // paste yours
const WHATSAPP_NUMBER    = "6280000000000";   // intl format, digits only
const INSTAGRAM_URL      = "https://instagram.com/saltway";
const SITE_URL           = "https://saltway.example"; // your live domain
```

- **Booking endpoint:** create a free form at [formspree.io](https://formspree.io),
  copy its endpoint (`https://formspree.io/f/abcdwxyz`) into `FORMSPREE_ENDPOINT`.
  Until you do, the form gracefully falls back to opening WhatsApp with the
  enquiry pre-filled, so it's never a dead end.
- **WhatsApp:** set `WHATSAPP_NUMBER` to your number in international format with
  no `+`, spaces or dashes (e.g. Indonesia `62…`).
- After deploying, update `SITE_URL` here and the domain in `sitemap.xml`,
  `robots.txt` and the `og:url` / `canonical` in `index.html`.

### Prefer Netlify Forms instead of Formspree?

Add `netlify` + a hidden `form-name` to the `<form id="book-form">` in
`index.html`, e.g.:

```html
<form id="book-form" name="booking" method="POST" data-netlify="true" novalidate>
  <input type="hidden" name="form-name" value="booking" />
```

Netlify captures the POST automatically; you can then leave `FORMSPREE_ENDPOINT`
as-is or point it at `/`.

---

## Replacing the placeholder media

`/assets/` ships with clearly-labelled **SVG placeholders**. Replace each with a
real photo (keep the same filename, or update the path in the relevant
`data/trips.json` entry / `index.html`):

- `og-image.svg` → a 1200×630 share image (`og:image`).
- `hero-poster.svg` + add `hero-loop.mp4` → the cinematic hero video loop.
- `voyage-*.svg`, `day-*.svg` → trip card images (paths live in `trips.json`).
- `reel-1/2/3.svg` → social-proof Reel stills (in `index.html`).
- `onboard.svg`, `logo.svg`.

You can regenerate the placeholders any time with
`node scripts/gen-placeholders.mjs`.

---

## Running locally

It's static, so any static server works (you need one — `fetch()` of the JSON
files won't work from a `file://` page):

```bash
npx serve .
# or
python3 -m http.server 8000
```

Then open the printed URL.

---

## Deploying

**Netlify** — drag the folder into the Netlify dashboard, or connect the repo.
No build command; publish directory is the repo root.

**Vercel** — import the repo; framework preset "Other", no build command,
output directory = root.

**GitHub Pages** — push to GitHub, then Settings → Pages → deploy from branch
(root). Site serves at `https://<user>.github.io/<repo>/`.

After deploy, update the domain in `SITE_URL` (main.js), `sitemap.xml`,
`robots.txt`, and the `canonical`/`og:url` tags.

---

## Verifying the SEO / structured data

- **Rich Results Test:** https://search.google.com/test/rich-results
- **Schema validator:** https://validator.schema.org/

Paste your deployed URL (JSON-LD is injected into the `<head>` at load), or view
source to see the baseline Organization block.
