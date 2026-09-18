# Backend

FastAPI authentication service for the portfolio.

```bash
cd backend
cp .env.example .env
python -m pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Create the MySQL database before starting the API:

```sql
CREATE DATABASE profile CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```
