# Cybersecurity Portfolio

Flask serves the portfolio pages and renders the Jinja templates. The existing
FastAPI service remains responsible for authentication, and Strapi remains the
source for blog posts.

## Run locally

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
flask --app app run --debug
```

Open `http://127.0.0.1:5000`.

For authentication, run the existing service separately from `backend/` with
its own environment and MySQL database. For blog content, run Strapi from
`strapi/` with `npm run develop`. The browser-side integration still uses the
existing local endpoints at `http://localhost:8000` and `http://localhost:1337`.

## Routes

- `/` - home
- `/projects` - projects and skills
- `/projects/metadata` - private Facebook / Instagram export analysis
- `/experience` - experience and certifications
- `/blog` - blog listing
- `/blog/<post>` - blog article
- `/login` - account login/register page

## Structure

`templates/base.html` owns the document shell and shared theme controls.
`templates/components/` contains the shared navbar and footer. Page markup is
under `templates/pages/`, while CSS, JavaScript, images, and documents live in
`static/` and are referenced with Flask `url_for` URLs. The existing CSS remains
one `main.css` file because most rules are shared across pages; JavaScript is
split into global behavior and page-specific modules.

The root Flask app is the web layer. `backend/` is intentionally kept as a
separate FastAPI authentication service with MySQL, and `strapi/` remains the
blog CMS. They are not replaced with mock authentication, database, or API
implementations.

## Metadata Analysis

Open `/projects/metadata` and select the **unzipped export root folder** with the
browser folder picker (Chrome/Edge and other browsers supporting
`webkitdirectory`). Select a Facebook or Instagram **JSON** export, one at a
time. Only recognized JSON files are read; media and unrelated files are
ignored. Nothing is sent to the server or persisted. Re-selecting a folder
replaces the previous results; refreshing the page clears everything.

The browser reads at most 20 MiB per recognized file and 50 MiB in total
across recognized files. A folder must contain at least one supported dataset
with valid timestamped records. Invalid JSON/schema files are reported and
skipped individually. The folder picker supplies relative paths used to match
the export structure; arbitrary files with matching basenames outside the
expected location are not interpreted as datasets.

The engine in `static/js/pages/metadata-engine.mjs` refactors the counting
logic in `facebook_data_analysis`: Facebook search/visit counts by month, year,
title and hour, word frequencies, friends added and cumulative per year,
people/friends interactions, profile picture update history, and comments,
reactions and likes. Instagram export support adds follower/following history,
post likes, post comments and story likes based on the second sample's schema.
As in the original scripts, Facebook search/interactions/profile dates use
Asia/Ho_Chi_Minh while friend/comment/reaction dates use UTC. Instagram dates
use UTC. Charts are generated from the parsed records, not stored images.

To check the real sample exports and the legacy decoded totals locally:

```bash
node --test tests/metadata.test.mjs
```

The optional browser test `tests/metadata-browser.mjs` starts Flask, selects
both sample folders and verifies that the real dashboards render. It needs
Playwright and a local Google Chrome installation (set `PLAYWRIGHT_MODULE` to
the Playwright `index.mjs` if installed outside this project). Sample exports
are not included in the website repository.

Deployment uses the existing Flask/Vercel configuration; metadata processing
requires no additional backend dependencies, upload endpoints or storage.
