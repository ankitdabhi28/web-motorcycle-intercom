# Database Setup Guide

This guide covers setting up PostgreSQL for the Motorcycle Intercom application.

## Prerequisites

- PostgreSQL 12 or higher installed
- Node.js and npm/yarn installed
- Basic knowledge of SQL commands

## Installation

### Ubuntu/Debian

```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo service postgresql start
```

### macOS (Homebrew)

```bash
brew install postgresql
brew services start postgresql
```

### Windows

Download and install from: https://www.postgresql.org/download/windows/

## Database Setup

### 1. Create Database and User

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL prompt:
CREATE DATABASE motorcycle_intercom;
CREATE USER intercom_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE motorcycle_intercom TO intercom_user;
\q
```

### 2. Configure Environment Variables

Update `backend/.env` with your database credentials:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=motorcycle_intercom
DB_USER=intercom_user
DB_PASSWORD=your_secure_password
```

### 3. Initialize Database Schema

The application will automatically initialize the database schema on startup. The schema includes:

- **users** table: User accounts with authentication data
- **rides** table: Ride/group information
- **ride_participants** table: Ride membership tracking

Schema file: `backend/src/db/schema.ts`

## Manual Schema Initialization (Optional)

If you need to manually initialize the schema:

```bash
# Connect to the database
sudo -u postgres psql -d motorcycle_intercom

# Run the schema (copy contents from backend/src/db/schema.ts)
# Or use psql command:
psql -U intercom_user -d motorcycle_intercom -f backend/src/db/schema.ts
```

## Verification

### Test Database Connection

```bash
# From backend directory
cd backend
yarn dev
```

Check the console output for:
- "Database initialized successfully"
- No connection errors

### Test with API

```bash
# Test register endpoint
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test User"}'
```

## Troubleshooting

### Connection Issues

**Error: "Connection refused"**
- Ensure PostgreSQL is running: `sudo service postgresql status`
- Check port: Default is 5432
- Verify host: localhost or 127.0.0.1

**Error: "Authentication failed"**
- Verify username and password in .env
- Check pg_hba.conf for authentication settings
- Restart PostgreSQL after config changes

### Permission Issues

**Error: "Permission denied"**
- Ensure user has privileges: `GRANT ALL PRIVILEGES`
- Check database ownership: `\l` in psql
- Revoke and grant if needed

### Schema Issues

**Error: "Relation already exists"**
- Schema may already be initialized
- Drop and recreate if needed: `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`

## Migration Support

For future schema changes, consider using a migration tool:

### Recommended: node-pg-migrate

```bash
cd backend
yarn add node-pg-migrate
```

Create migration files in `migrations/` directory and run:

```bash
yarn migrate up
```

## Backup and Restore

### Backup

```bash
pg_dump -U intercom_user motorcycle_intercom > backup.sql
```

### Restore

```bash
psql -U intercom_user motorcycle_intercom < backup.sql
```

## Security Best Practices

1. **Strong Passwords**: Use strong passwords for database users
2. **Limited Privileges**: Grant only necessary privileges
3. **Network Security**: Restrict database access in production
4. **SSL/TLS**: Enable SSL for database connections in production
5. **Regular Backups**: Schedule regular database backups
6. **Environment Variables**: Never commit .env files to version control

## Production Considerations

For production deployment:

1. Use managed database service (AWS RDS, Google Cloud SQL, etc.)
2. Enable connection pooling (PgBouncer)
3. Configure proper connection limits
4. Enable SSL/TLS encryption
5. Set up read replicas for scaling
6. Monitor database performance
7. Set up automated backups

## Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [pg Library Documentation](https://node-postgres.com/)
- [Database Best Practices](https://wiki.postgresql.org/wiki/Don%27t_Do_This)
