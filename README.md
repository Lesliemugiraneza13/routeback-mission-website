# RouteBack, North Mauritius

A student-friendly journey-planning website for Route 95 (Pamplemousses ↔ Saint Antoine Traffic Centre) in Northern Mauritius. Built with semantic HTML5, modern CSS, and vanilla JavaScript only, no frameworks, no backend, no live data.

## Running the site locally

This site must be served over `http://`, not opened directly as a `file://` path (a few pages read the URL query string, which some browsers restrict under `file://`).

From this folder, run a simple static server:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080/index.html` in a browser. Any static server works equally well (VS Code Live Server, `npx serve`, etc.).

## Project structure

```
index.html              Home (the one index.html — every other page is its own flat file)
planner.html             Plan Journey (dependent dropdowns, Route 95 overview, Saved Routes, Recent Searches)
mission.html             Mission (problem, approach, verification process, timeline)
about.html               About (team profiles, how we work, skills dashboard)
contact.html             Contact (guided feedback form)
services.html            Services (alternative transport directory, safety, preparation)
login.html               Open Profile
signup.html              Create Profile
profile.html             My Profile
shared/
  css/                  Design system: main.css (entry point) importing
                        variables, base, layout, patterns, components, utilities
  js/                   Scripts every page loads, in this order:
                        storage.js, i18n.js, theme.js, ui.js, validation.js,
                        data.js (all Route 95/Northern route/stop/provider/
                        team/contact-category data), planner-tools.js (dropdown
                        fill helpers + the stop-search combobox), nav.js, then
                        (after the page's own script) partials.js last, since
                        it builds the header/footer and fires the
                        "rb:partialsready" event every other script waits for
assets/
  js/                   One script per page, named to match: index.js,
                        planner.js, mission.js, about.js, contact.js,
                        services.js, login.js, signup.js, profile.js — each
                        guarded behind document.body.dataset.page so it only
                        ever runs on its own page
images/
  originals/            Unmodified copies of every supplied asset
  logo/, team/, providers/, hero/, patterns/, illustrations/   Web-ready copies used by the site
docs/                   DATA-SOURCES.md, Sources-Credits-AI-Transparency.pdf
```

Every page loads one stylesheet (`shared/css/main.css`) and ten scripts: the eight shared files, that page's own file, then `shared/js/partials.js` last. Script order matters — see `shared/js/` above.

## Data and honesty notes

- Fares are **team-observed** at a point in time (checked 21 July 2026), not live pricing.
- Timetable times are a **published secondary reference**, not a live feed.
- Stop order along Route 95 is **team-sequenced** from the order stops were recorded in, not a verified GPS survey.
- Profiles and saved routes live only in this browser's `localStorage`, clearing site data removes them. Passwords are never stored, logged, or compared.
- Provider links lead to independent services RouteBack does not operate.

## Language and theme

English/French and light/dark are toggled from the header on every page and remembered locally (`localStorage`). Nothing is sent anywhere.
