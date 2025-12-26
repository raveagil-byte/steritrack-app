# PostgreSQL Migration Guide

## Status
✅ Database Driver switched to `pg`
✅ Connection logic updated to support PostgreSQL
✅ Database `steritrack` created
✅ Schema migrated and applied

## ⚠️ Action Required: Update .env

Your environment file (`.env` or `.env.local`) currently uses MySQL credentials. You must update it to match your PostgreSQL setup:

**Current Identity (likely):**
```env
DB_USER=root
# DB_PORT=3306
```

**Change to:**
```env
DB_USER=postgres
DB_PORT=5432
# DB_PASSWORD=your_postgres_password (if any)
```

## Running the App

After updating `.env`, you can start the server normally:
```bash
npm run server
```

## Adminer
You can inspect the new database at:
[http://localhost/steritrack---simple-cssd/adminer.php?pgsql=localhost&username=postgres&db=steritrack](http://localhost/steritrack---simple-cssd/adminer.php?pgsql=localhost&username=postgres&db=steritrack)
