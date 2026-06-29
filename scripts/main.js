/* =================================================================
   Saltway — main.js
   Renders trips + schedule from JSON, builds JSON-LD for AI search,
   and wires the booking form + WhatsApp deep links.
   No framework, no build step. Plain vanilla JS.
   ================================================================= */

/* -----------------------------------------------------------------
   CONFIG — edit these. (Pasting your endpoint here is all you need.)
   ----------------------------------------------------------------- */

// PRIORITY 3 — booking endpoint. Paste your Formspree form ID below,
// e.g. "https://formspree.io/f/abcdwxyz". Netlify Forms users: see README.
const FORMSPREE_ENDPOINT = "https://formspree.io/f/your-form-id";

// WhatsApp number in international format, digits only (no +, spaces or dashes).
// Leave empty until you have one — the WhatsApp buttons hide themselves and the
// form falls back to Instagram, so nothing links to a dead number.
const WHATSAPP_NUMBER = ""; // <-- e.g. "628123456789" when you have it

const INSTAGRAM_URL = "https://instagram.com/saltway";

// Base URL used in structured data (update to your live domain on deploy).
const SITE_URL = "https://saltway.net";

/* -----------------------------------------------------------------
   Small helpers
   ----------------------------------------------------------------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

async function loadJSON(path) {
  const res = await fetch(path, { cache: "no-cache" });
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

// Format an ISO date (YYYY-MM-DD) → "5 Jul 2026"
function fmtDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// End date = start + (days - 1)
function endDate(iso, days) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + (days - 1));
  return d.toISOString().slice(0, 10);
}

// "5–11 Jul 2026" style range
function fmtRange(iso, days) {
  const start = new Date(iso + "T00:00:00");
  const end = new Date(endDate(iso, days) + "T00:00:00");
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const opts = { day: "numeric", month: "short", year: "numeric" };
  if (sameMonth) {
    return `${start.getDate()}–${end.toLocaleDateString("en-GB", opts)}`;
  }
  return `${start.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("en-GB", opts)}`;
}

const STATUS_LABEL = {
  open: "Open",
  "almost-full": "Almost full",
  waitlist: "Waitlist",
  "sold-out": "Sold out",
};

function statusFor(row) {
  // Derive a sensible status if spotsLeft contradicts the stated one.
  if (row.spotsLeft <= 0) return row.status === "open" ? "waitlist" : row.status;
  return row.status || "open";
}

function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

/* -----------------------------------------------------------------
   PRIORITY 1 — Афиша / schedule
   ----------------------------------------------------------------- */
function renderSchedule(schedule) {
  const list = $("#schedule-list");
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const upcoming = schedule
    .filter((row) => new Date(row.start + "T00:00:00") >= today) // hide past dates
    .sort((a, b) => new Date(a.start) - new Date(b.start));       // soonest first

  if (!upcoming.length) {
    list.innerHTML = `<p class="schedule-empty">No dated departures listed right now — message us on WhatsApp and we'll share what's coming.</p>`;
    return;
  }

  list.innerHTML = upcoming.map((row) => {
    const status = statusFor(row);
    const spots = status === "waitlist" || status === "sold-out"
      ? "Waitlist"
      : `${row.spotsLeft} spot${row.spotsLeft === 1 ? "" : "s"} left`;
    const ctaLabel = (status === "waitlist" || status === "sold-out") ? "Join waitlist" : "Reserve";

    return `
      <article class="dep" data-trip-id="${escapeHtml(row.tripId)}" data-dates="${escapeHtml(fmtRange(row.start, row.days))}" data-trip-name="${escapeHtml(row.trip)}">
        <div class="dep-main">
          <div class="dep-trip">${escapeHtml(row.trip)}</div>
          <div class="dep-meta">${escapeHtml(row.boat)} · ${row.days} days · ${escapeHtml(spots)}</div>
        </div>
        <div class="dep-dates">${fmtRange(row.start, row.days)}<small>${row.days} days</small></div>
        <div class="dep-price">$${row.priceFrom.toLocaleString()}<small>from / guest</small></div>
        <div class="dep-cta">
          <span class="status-tag status-${status}">${STATUS_LABEL[status] || status}</span><br />
          <button class="btn btn-primary btn-small dep-reserve" type="button">${ctaLabel}</button>
        </div>
      </article>`;
  }).join("");

  // Wire each row's CTA → pre-fill the booking form with that trip + dates.
  $$(".dep-reserve", list).forEach((btn) => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".dep");
      openBooking({
        tripId: card.dataset.tripId,
        tripName: card.dataset.tripName,
        dates: card.dataset.dates,
      });
    });
  });
}

/* -----------------------------------------------------------------
   Voyages + Days cards
   ----------------------------------------------------------------- */
function renderVoyages(voyages, currency) {
  $("#voyages-list").innerHTML = voyages.map((t) => `
    <article class="card">
      <div class="card-media">
        ${t.badge ? `<span class="card-badge">${escapeHtml(t.badge)}</span>` : ""}
        <img src="${escapeHtml(t.image)}" alt="${escapeHtml(t.alt)}" loading="lazy" width="600" height="450" />
      </div>
      <div class="card-body">
        <p class="card-coords">${escapeHtml(t.coordinates)}</p>
        <h3>${escapeHtml(t.name)}</h3>
        <p class="card-summary">${escapeHtml(t.summary)}</p>
        <ul class="card-facts">
          <li><span>Boat</span><span>${escapeHtml(t.boat)}</span></li>
          <li><span>Length</span><span>${escapeHtml(t.days)}</span></li>
          <li><span>Level</span><span>${escapeHtml(t.level)}</span></li>
        </ul>
        <div class="card-foot">
          <div class="card-price">$${t.priceFrom.toLocaleString()}<small>from / guest</small></div>
          <button class="btn btn-primary btn-small card-reserve" type="button" data-trip-id="${escapeHtml(t.id)}" data-trip-name="${escapeHtml(t.name)}">Reserve</button>
        </div>
      </div>
    </article>`).join("");

  $$(".card-reserve", $("#voyages-list")).forEach((btn) => {
    btn.addEventListener("click", () => openBooking({ tripId: btn.dataset.tripId, tripName: btn.dataset.tripName }));
  });
}

function renderDays(days) {
  $("#days-list").innerHTML = days.map((d) => `
    <article class="card">
      <div class="card-media">
        ${d.tagline ? `<span class="card-badge">${escapeHtml(d.tagline)}</span>` : ""}
        <img src="${escapeHtml(d.image)}" alt="${escapeHtml(d.alt)}" loading="lazy" width="600" height="375" />
      </div>
      <div class="card-body">
        <h3>${escapeHtml(d.name)}</h3>
        <p class="card-summary">${escapeHtml(d.summary)}</p>
        <div class="card-foot">
          <div class="card-price" style="font-size:1rem">${escapeHtml(d.priceFromText)}</div>
          <button class="btn btn-ghost btn-small card-reserve" type="button" style="border-color:var(--line);color:var(--text)" data-trip-id="${escapeHtml(d.id)}" data-trip-name="${escapeHtml(d.name)}">Enquire</button>
        </div>
      </div>
    </article>`).join("");

  $$(".card-reserve", $("#days-list")).forEach((btn) => {
    btn.addEventListener("click", () => openBooking({ tripId: btn.dataset.tripId, tripName: btn.dataset.tripName }));
  });
}

/* -----------------------------------------------------------------
   FAQ + testimonials (from seo.json)
   ----------------------------------------------------------------- */
function renderFAQ(faq) {
  $("#faq-list").innerHTML = faq.map((item, i) => `
    <details${i === 0 ? " open" : ""}>
      <summary>${escapeHtml(item.q)}</summary>
      <div class="faq-a">${escapeHtml(item.a)}</div>
    </details>`).join("");
}

function renderTestimonials(reviews) {
  if (!reviews || !reviews.length) return;
  $("#testimonials").innerHTML = reviews.map((r) => `
    <figure class="tcard">
      <div class="stars" aria-label="${r.rating} out of 5">${"★".repeat(Number(r.rating))}</div>
      <blockquote>“${escapeHtml(r.body)}”</blockquote>
      <cite>— ${escapeHtml(r.author)}</cite>
    </figure>`).join("");
}

/* -----------------------------------------------------------------
   PRIORITY 2 — JSON-LD generated from data, injected into <head>.
   (Baseline Organization is already static in index.html.)
   ----------------------------------------------------------------- */
function injectJSONLD(obj) {
  const s = document.createElement("script");
  s.type = "application/ld+json";
  s.textContent = JSON.stringify(obj);
  document.head.appendChild(s);
}

function buildStructuredData(trips, seo) {
  // One TouristTrip + Offer per voyage.
  trips.voyages.forEach((t) => {
    injectJSONLD({
      "@context": "https://schema.org",
      "@type": "TouristTrip",
      name: t.name,
      description: t.summary,
      url: `${SITE_URL}/#voyages`,
      image: `${SITE_URL}/${t.image}`,
      touristType: t.level,
      itinerary: { "@type": "ItemList", itemListElement: t.spots.map((s, i) => ({ "@type": "ListItem", position: i + 1, name: s })) },
      provider: { "@type": "TravelAgency", name: "Saltway", url: SITE_URL + "/" },
      offers: {
        "@type": "Offer",
        price: String(t.priceFrom),
        priceCurrency: trips.currency || "USD",
        availability: "https://schema.org/InStock",
        url: `${SITE_URL}/#book`,
      },
    });
  });

  // FAQPage
  if (seo.faq?.length) {
    injectJSONLD({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: seo.faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    });
  }

  // AggregateRating + Review attached to the Organization.
  if (seo.aggregateRating || seo.reviews?.length) {
    injectJSONLD({
      "@context": "https://schema.org",
      "@type": "TravelAgency",
      name: "Saltway",
      url: SITE_URL + "/",
      ...(seo.aggregateRating && {
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: seo.aggregateRating.ratingValue,
          reviewCount: seo.aggregateRating.reviewCount,
          bestRating: seo.aggregateRating.bestRating,
          worstRating: seo.aggregateRating.worstRating,
        },
      }),
      ...(seo.reviews?.length && {
        review: seo.reviews.map((r) => ({
          "@type": "Review",
          author: { "@type": "Person", name: r.author },
          datePublished: r.date,
          name: r.title,
          reviewBody: r.body,
          reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: "5", worstRating: "1" },
        })),
      }),
    });
  }

  // BreadcrumbList for the main sections.
  injectJSONLD({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Departures", item: `${SITE_URL}/#schedule` },
      { "@type": "ListItem", position: 2, name: "Voyages", item: `${SITE_URL}/#voyages` },
      { "@type": "ListItem", position: 3, name: "Days", item: `${SITE_URL}/#days` },
      { "@type": "ListItem", position: 4, name: "FAQ", item: `${SITE_URL}/#faq` },
    ],
  });
}

/* -----------------------------------------------------------------
   PRIORITY 3 — Booking form + WhatsApp
   ----------------------------------------------------------------- */
function populateTripSelect(trips) {
  const sel = $("#f-trip");
  const all = [...trips.voyages, ...trips.days];
  all.forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t.name;
    opt.dataset.tripId = t.id;
    opt.textContent = `${t.name}${t.type === "Day" ? " (Day)" : ""}`;
    sel.appendChild(opt);
  });
}

// Is a WhatsApp number configured yet?
const hasWhatsApp = () => /^\d{6,}$/.test(WHATSAPP_NUMBER);

function whatsappLink(message) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

function updateWhatsAppButton(tripName, dates) {
  const btn = $("#whatsapp-btn");
  if (!btn) return;
  // No number yet → hide the button so nothing links to a dead chat.
  if (!hasWhatsApp()) { btn.hidden = true; return; }
  btn.hidden = false;
  const base = tripName
    ? `Hi Saltway — I'm interested in ${tripName}${dates ? ` (${dates})` : ""}. Could you share availability?`
    : "Hi Saltway — I'd like to know more about your sailing surf voyages.";
  btn.href = whatsappLink(base);
}

// Open the booking form, optionally pre-filled, and scroll to it.
function openBooking({ tripId, tripName, dates } = {}) {
  if (tripName) {
    const sel = $("#f-trip");
    const match = [...sel.options].find((o) => o.value === tripName || o.dataset.tripId === tripId);
    if (match) sel.value = match.value;
  }
  if (dates) $("#f-dates").value = dates;
  updateWhatsAppButton(tripName, dates);

  document.getElementById("book").scrollIntoView({ behavior: "smooth", block: "start" });
  // Focus the first empty required field for accessibility.
  setTimeout(() => ($("#f-name").value ? $("#f-trip") : $("#f-name")).focus(), 400);
}

function validateForm(form) {
  let ok = true;
  const setError = (id, msg) => {
    const field = $(`#${id}`);
    const err = $(`.error[data-for="${id}"]`);
    if (msg) { field.classList.add("invalid"); if (err) err.textContent = msg; ok = false; }
    else { field.classList.remove("invalid"); if (err) err.textContent = ""; }
  };

  setError("f-name", form.name.value.trim() ? "" : "Please tell us your name.");
  const email = form.email.value.trim();
  setError("f-email", /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "" : "Enter a valid email.");
  setError("f-trip", form.trip.value ? "" : "Choose a voyage.");
  setError("f-level", form.level.value ? "" : "Select your surf level.");
  return ok;
}

function wireForm() {
  const form = $("#book-form");
  const status = $("#form-status");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.textContent = "";
    status.className = "form-status";
    if (!validateForm(form)) {
      status.textContent = "Please fix the highlighted fields.";
      status.classList.add("bad");
      return;
    }

    const data = Object.fromEntries(new FormData(form).entries());
    const submitBtn = $("button[type=submit]", form);
    submitBtn.disabled = true;
    submitBtn.textContent = "Sending…";

    try {
      // If the endpoint hasn't been configured yet, fall back so the form is
      // never a dead end during setup: WhatsApp if a number is set, else Instagram.
      if (FORMSPREE_ENDPOINT.includes("your-form-id")) {
        const msg = `New enquiry — ${data.trip}\nName: ${data.name}\nEmail: ${data.email}\nDates: ${data.dates || "flexible"}\nLevel: ${data.level}\nGroup: ${data.groupSize}\n${data.message || ""}`;
        if (hasWhatsApp()) {
          window.open(whatsappLink(msg), "_blank", "noopener");
          showSuccess(form, status, "Opening WhatsApp to send your enquiry. (Tip: set FORMSPREE_ENDPOINT in main.js to collect these by email.)");
        } else {
          window.open(INSTAGRAM_URL, "_blank", "noopener");
          showSuccess(form, status, "We're still wiring up enquiries — opening Instagram so you can DM us. (Tip: set FORMSPREE_ENDPOINT in main.js to collect these by email.)");
        }
        return;
      }

      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new FormData(form),
      });

      if (res.ok) {
        showSuccess(form, status, "Thank you — your enquiry is in. We'll reply with availability shortly.");
      } else {
        throw new Error("Bad response");
      }
    } catch (err) {
      status.textContent = hasWhatsApp()
        ? "Something went wrong sending the form. Please message us on WhatsApp instead."
        : "Something went wrong sending the form. Please reach us on Instagram @saltway instead.";
      status.classList.add("bad");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Send enquiry";
    }
  });
}

function showSuccess(form, status, msg) {
  form.reset();
  status.textContent = msg;
  status.classList.remove("bad");
  status.classList.add("ok");
}

/* -----------------------------------------------------------------
   Boot
   ----------------------------------------------------------------- */
async function init() {
  // Footer year + WhatsApp button state work even if data fails to load.
  const yr = $("#year"); if (yr) yr.textContent = new Date().getFullYear();
  updateWhatsAppButton();

  wireForm();

  try {
    const [trips, schedule, seo] = await Promise.all([
      loadJSON("data/trips.json"),
      loadJSON("data/schedule.json"),
      loadJSON("data/seo.json"),
    ]);

    renderSchedule(schedule);
    renderVoyages(trips.voyages, trips.currency);
    renderDays(trips.days);
    populateTripSelect(trips);
    renderFAQ(seo.faq);
    renderTestimonials(seo.reviews);
    buildStructuredData(trips, seo);
  } catch (err) {
    console.error(err);
    // Graceful degradation — the noscript fallback + static content remain.
    const list = $("#schedule-list");
    if (list) list.innerHTML = `<p class="schedule-empty">Couldn't load departures. Please message us on WhatsApp for current dates.</p>`;
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
