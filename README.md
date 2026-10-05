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

Metadata Analysis is a standalone application in the sibling `../metadata/`
project. Its card on `/projects` opens `https://metadata.hminhtri.cloud/` in a
new tab. The standalone application's visual identity and navigation are
independent of the portfolio.
The GitHub button points to the planned `hminhtri-cloud/metadata` repository;
create and publish that repository before sharing the link.
