# Database Migration Strategy
## Managing MySQL (OAuth) and PostgreSQL (Magic Link) Simultaneously

This document provides a comprehensive strategy for managing database changes during parallel development with two different authentication systems and database engines.

## Current Database State

### Developer 1 (Main Branch - OAuth)
- **Database**: MySQL / TiDB
- **Schema**: Original schema with OAuth fields
- **Connection**: `mysql://user:password@host:port/database`
- **ORM**: Drizzle ORM with `drizzle-orm/mysql2`

### Developer 2 (Feature Branch - Magic Link)
- **Database**: PostgreSQL (Neon)
- **Schema**: Modified schema with magic link fields
- **Connection**: `postgresql://user:password@host/database`
- **ORM**: Drizzle ORM with `drizzle-orm/neon-http`

## Schema Differences

### Users Table

**MySQL (OAuth - Developer 1)**:
```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  openId VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255),
  name VARCHAR(255),
  avatarUrl TEXT,
  role ENUM('user', 'admin') DEFAULT 'user',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  lastSignedIn TIMESTAMP
);
```

**PostgreSQL (Magic Link - Developer 2)**:
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  "openId" VARCHAR(255) UNIQUE,  -- Nullable for magic link users
  email VARCHAR(255) NOT NULL UNIQUE,  -- Required for magic link
  name VARCHAR(255),
  "avatarUrl" TEXT,
  role user_role DEFAULT 'user',  -- PostgreSQL enum type
  "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
  "lastSignedIn" TIMESTAMP
);
```

**Key Differences**:
- `openId`: NOT NULL (MySQL) vs NULLABLE (PostgreSQL)
- `email`: NULLABLE (MySQL) vs NOT NULL UNIQUE (PostgreSQL)
- `role`: MySQL ENUM vs PostgreSQL custom enum type
- Column names: camelCase (MySQL) vs "camelCase" quoted (PostgreSQL)

### New Table: Magic Link Tokens

**Only in PostgreSQL (Developer 2)**:
```sql
CREATE TABLE magic_link_tokens (
  id SERIAL PRIMARY KEY,
  token VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL,
  "expiresAt" TIMESTAMP NOT NULL,
  "usedAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL
);
```

**Not in MySQL (Developer 1)**: This table doesn't exist

## Migration Strategies

### Strategy 1: Separate Databases (Recommended)

**Best for**: Parallel development without conflicts

#### Setup

**Developer 1**:
```env
# .env
DATABASE_URL=mysql://user:pass@mysql-host:3306/property_manager_oauth
```

**Developer 2**:
```env
# .env
DATABASE_URL=postgresql://user:pass@neon-host/property_manager_magic_link
```

#### Advantages
✅ No database conflicts  
✅ Each developer works independently  
✅ Can test both systems separately  
✅ Easy rollback  

#### Disadvantages
❌ Data not shared between developers  
❌ Need data migration at merge time  
❌ Two databases to maintain  

#### Merge Process

When merging, migrate data from MySQL to PostgreSQL:

```bash
# 1. Export MySQL data
mysqldump -u user -p property_manager_oauth > mysql_backup.sql

# 2. Convert MySQL to PostgreSQL
# Use pgloader (recommended)
pgloader mysql://user:pass@mysql-host/property_manager_oauth \
          postgresql://user:pass@neon-host/property_manager_magic_link

# Or manual conversion
# - Replace AUTO_INCREMENT with SERIAL
# - Replace backticks with double quotes
# - Convert ENUM to PostgreSQL enum
# - Update data types

# 3. Run magic link migrations
cd /home/ubuntu/property-manager
git checkout feature/magic-link-auth
pnpm db:push

# 4. Verify data
psql postgresql://user:pass@neon-host/property_manager_magic_link
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM magic_link_tokens;
```

### Strategy 2: Single PostgreSQL with Neon Branching (Advanced)

**Best for**: Unified database with version control

#### Setup

First, migrate Developer 1 to PostgreSQL:

```bash
# Developer 1: Migrate from MySQL to PostgreSQL
# 1. Create main Neon database
# 2. Migrate data from MySQL to PostgreSQL
# 3. Update Developer 1's .env
DATABASE_URL=postgresql://user:pass@neon-host/main

# Developer 2: Create Neon branch
# Neon automatically creates a branch from main
DATABASE_URL=postgresql://user:pass@neon-host/feature-magic-link
```

#### Neon Branching Commands

```bash
# Create database branch (via Neon CLI or API)
neon branches create --name feature-magic-link --parent main

# Get branch connection string
neon connection-string feature-magic-link
```

#### Advantages
✅ Both use PostgreSQL  
✅ Easy to merge database changes  
✅ Neon handles branching automatically  
✅ Can preview changes before merge  

#### Disadvantages
❌ Requires migrating Developer 1 from MySQL  
❌ Neon-specific feature (vendor lock-in)  
❌ More complex initial setup  

#### Merge Process

```bash
# Neon automatically merges schema changes
# Just need to merge code and apply migrations

git checkout develop
git merge feature/magic-link-auth
pnpm db:push

# Neon merges the database branch
neon branches merge feature-magic-link --into main
```

### Strategy 3: Dual Database Support (Most Complex)

**Best for**: Long-term parallel systems

Modify the application to support both MySQL and PostgreSQL simultaneously using environment variables.

#### Implementation

**1. Update drizzle.config.ts**:
```typescript
import { defineConfig } from 'drizzle-kit';
import { ENV } from './server/_core/env';

const isMysql = ENV.databaseUrl.startsWith('mysql://');

export default defineConfig({
  schema: './drizzle/schema.ts',
  out: './drizzle',
  dialect: isMysql ? 'mysql' : 'postgresql',
  dbCredentials: {
    url: ENV.databaseUrl,
  },
});
```

**2. Create dual schema files**:
```typescript
// drizzle/schema-mysql.ts (for OAuth)
import { mysqlTable, serial, varchar } from 'drizzle-orm/mysql-core';

export const users = mysqlTable('users', {
  id: serial('id').primaryKey(),
  openId: varchar('openId', { length: 255 }).notNull().unique(),
  email: varchar('email', { length: 255 }),
  // ...
});

// drizzle/schema-postgres.ts (for Magic Link)
import { pgTable, serial, varchar } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  openId: varchar('openId', { length: 255 }).unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  // ...
});

export const magicLinkTokens = pgTable('magic_link_tokens', {
  // ...
});

// drizzle/schema.ts (main export)
import { ENV } from '../server/_core/env';

const isMysql = ENV.databaseUrl.startsWith('mysql://');

export * from isMysql ? './schema-mysql' : './schema-postgres';
```

**3. Update database client**:
```typescript
// server/db.ts
import { ENV } from './_core/env';
import { drizzle as drizzleMysql } from 'drizzle-orm/mysql2';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import mysql from 'mysql2/promise';
import { neon } from '@neondatabase/serverless';

const isMysql = ENV.databaseUrl.startsWith('mysql://');

export const db = isMysql
  ? drizzleMysql(mysql.createPool(ENV.databaseUrl))
  : drizzleNeon(neon(ENV.databaseUrl));
```

#### Advantages
✅ Both developers use their preferred database  
✅ No migration needed during development  
✅ Can switch between databases easily  

#### Disadvantages
❌ Very complex to maintain  
❌ Duplicate schema definitions  
❌ Different SQL dialects cause issues  
❌ Not recommended for production  

## Data Migration Tools

### Option 1: pgloader (Recommended)

**Installation**:
```bash
# Ubuntu/Debian
sudo apt-get install pgloader

# macOS
brew install pgloader
```

**Usage**:
```bash
# Simple migration
pgloader mysql://user:pass@mysql-host/db_name \
          postgresql://user:pass@pg-host/db_name

# With configuration file
pgloader migration.load
```

**migration.load**:
```
LOAD DATABASE
  FROM mysql://user:pass@mysql-host/property_manager_oauth
  INTO postgresql://user:pass@neon-host/property_manager_magic_link

WITH include drop, create tables, create indexes, reset sequences

SET maintenance_work_mem to '128MB',
    work_mem to '12MB'

CAST type datetime to timestamptz
     drop default drop not null using zero-dates-to-null,
     type date drop not null drop default using zero-dates-to-null

BEFORE LOAD DO
  $$ DROP SCHEMA IF EXISTS public CASCADE; $$,
  $$ CREATE SCHEMA public; $$;
```

### Option 2: Manual SQL Conversion

**Export from MySQL**:
```bash
mysqldump -u user -p --no-create-info --complete-insert property_manager_oauth > data.sql
```

**Convert to PostgreSQL**:
```bash
# Replace MySQL-specific syntax
sed -i 's/`//g' data.sql  # Remove backticks
sed -i "s/\\\'/\'\'/g" data.sql  # Fix escaping
sed -i 's/\\n/\n/g' data.sql  # Fix newlines

# Convert AUTO_INCREMENT
sed -i 's/AUTO_INCREMENT=[0-9]*//g' data.sql
```

**Import to PostgreSQL**:
```bash
psql -U user -d property_manager_magic_link < data.sql
```

### Option 3: Application-Level Migration

Create a migration script:

```typescript
// scripts/migrate-mysql-to-postgres.ts
import { drizzle as drizzleMysql } from 'drizzle-orm/mysql2';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import mysql from 'mysql2/promise';
import { neon } from '@neondatabase/serverless';

const mysqlDb = drizzleMysql(
  mysql.createPool(process.env.MYSQL_URL!)
);

const pgDb = drizzleNeon(
  neon(process.env.POSTGRES_URL!)
);

async function migrate() {
  console.log('Fetching users from MySQL...');
  const users = await mysqlDb.select().from(mysqlUsers);
  
  console.log(`Migrating ${users.length} users to PostgreSQL...`);
  for (const user of users) {
    await pgDb.insert(pgUsers).values({
      openId: user.openId,
      email: user.email || `${user.openId}@placeholder.com`, // Ensure email exists
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
      createdAt: user.createdAt,
      lastSignedIn: user.lastSignedIn,
    }).onConflictDoNothing();
  }
  
  console.log('Migration complete!');
}

migrate().catch(console.error);
```

**Run migration**:
```bash
MYSQL_URL="mysql://..." POSTGRES_URL="postgresql://..." \
  tsx scripts/migrate-mysql-to-postgres.ts
```

## Schema Synchronization

### Tracking Schema Changes

**Developer 1 (MySQL)**:
```bash
# Generate migration
pnpm drizzle-kit generate:mysql

# Apply migration
pnpm db:push

# Commit migration files
git add drizzle/
git commit -m "feat: add new property field to schema"
```

**Developer 2 (PostgreSQL)**:
```bash
# Generate migration
pnpm drizzle-kit generate:pg

# Apply migration
pnpm db:push

# Commit migration files
git add drizzle/
git commit -m "feat: add magic link tokens table"
```

### Merging Migrations

When merging branches:

1. **Keep both migration files**
2. **Rename to avoid conflicts**:
   ```
   drizzle/0001_oauth_add_field.sql
   drizzle/0001_magic_link_add_tokens.sql
   ```
3. **Apply in order**:
   ```bash
   pnpm db:push
   ```

## Testing Strategy

### Test Both Databases

**Developer 1**:
```bash
# Test with MySQL
DATABASE_URL=mysql://... pnpm test
DATABASE_URL=mysql://... pnpm dev
```

**Developer 2**:
```bash
# Test with PostgreSQL
DATABASE_URL=postgresql://... pnpm test
DATABASE_URL=postgresql://... pnpm dev
```

### Integration Testing

After merge:
```bash
# Test with PostgreSQL (final database)
DATABASE_URL=postgresql://... pnpm test
DATABASE_URL=postgresql://... pnpm dev

# Test magic link authentication
# Test all existing features
# Test data migration
```

## Rollback Plan

### If Migration Fails

**Option 1: Restore from backup**:
```bash
# Restore MySQL backup
mysql -u user -p property_manager_oauth < backup.sql

# Restore PostgreSQL backup
pg_restore -U user -d property_manager_magic_link backup.dump
```

**Option 2: Revert migrations**:
```bash
# Drizzle doesn't support down migrations
# Manually revert schema changes

# Or restore from backup and replay migrations
```

**Option 3: Keep both databases**:
```bash
# Temporarily run both systems
# Switch back to MySQL for Developer 1
# Keep PostgreSQL for Developer 2
```

## Best Practices

### For Developer 1 (MySQL)

1. ✅ **Document schema changes**: Keep track in CHANGELOG.md
2. ✅ **Backup before changes**: `mysqldump` before migrations
3. ✅ **Test migrations**: Test on local database first
4. ✅ **Commit migration files**: Include in version control
5. ✅ **Communicate changes**: Share schema changes with Developer 2

### For Developer 2 (PostgreSQL)

1. ✅ **Sync schema changes**: Merge Developer 1's changes regularly
2. ✅ **Maintain compatibility**: Ensure magic link works with OAuth schema
3. ✅ **Backup Neon database**: Use Neon's backup features
4. ✅ **Test migration path**: Test MySQL → PostgreSQL migration
5. ✅ **Document differences**: Keep this file updated

## Recommended Approach

For your specific situation, I recommend **Strategy 1: Separate Databases**:

### Why?

1. **Minimal conflicts**: Developers work independently
2. **Easy to implement**: No code changes needed
3. **Safe**: Can rollback easily
4. **Clear separation**: OAuth vs Magic Link
5. **One-time migration**: Migrate when merging to production

### Implementation Steps

**Week 1-3: Parallel Development**
```bash
# Developer 1
DATABASE_URL=mysql://original-db

# Developer 2  
DATABASE_URL=postgresql://neon-magic-link-db
```

**Week 4: Prepare for Merge**
```bash
# Test migration
pgloader mysql://original-db postgresql://test-merge-db

# Verify data integrity
# Test application with merged database
```

**Week 5: Final Merge**
```bash
# Migrate production data
pgloader mysql://original-db postgresql://production-db

# Deploy magic link authentication
# Switch all users to PostgreSQL
```

## Summary

**Key Takeaways**:

1. **Use separate databases** during parallel development
2. **Document all schema changes** in both branches
3. **Test migration early** and often
4. **Use pgloader** for MySQL → PostgreSQL migration
5. **Backup everything** before major changes
6. **Plan merge carefully** with both developers
7. **Test thoroughly** after migration

**This strategy ensures smooth database management during parallel development and a successful merge.**

---

**Created**: November 15, 2024
**Last Updated**: November 15, 2024
**Status**: Active Development
