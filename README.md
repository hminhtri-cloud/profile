# Cybersecurity Portfolio

The project is split into independently runnable applications:

- `frontend/`: static portfolio pages and browser-side JavaScript.
- `backend/`: FastAPI authentication API and MySQL integration.
- `strapi/`: Strapi CMS containing the `post` collection.

## Run locally

```bash
cd backend
cp .env.example .env
python -m pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

In another terminal:

```bash
cd frontend
python3 -m http.server 5500
```

Run Strapi separately:

```bash
cd strapi
npm run develop
```

The browser pages call Strapi at `http://localhost:1337` and FastAPI at `http://localhost:8000`.
