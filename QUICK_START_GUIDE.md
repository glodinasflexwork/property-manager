# Quick Start Guide for Parallel Development

## 🚀 For Developer 1 (OAuth + MySQL)

### Initial Setup

```bash
# Clone repository
git clone https://github.com/glodinasflexwork/property-manager.git
cd property-manager

# Stay on main branch
git checkout main

# Install dependencies
pnpm install

# Create .env file
cp .env.example .env
```

### Environment Configuration (.env)

```env
# OAuth Configuration
AUTH_TYPE=oauth
OAUTH_SERVER_URL=https://oauth.manus.im
VITE_OAUTH_PORTAL_URL=https://oauth.manus.im
VITE_APP_ID=your-app-id

# MySQL Database
DATABASE_URL=mysql://user:password@host:3306/property_manager

# Common Settings
JWT_SECRET=your-secret-here
APP_URL=http://localhost:3000
```

### Daily Workflow

```bash
# Start working
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/your-feature-name

# Make changes, commit
git add .
git commit -m "feat: your feature description"

# Push and create PR
git push origin feature/your-feature-name
# Create PR on GitHub to merge into main
```

### Running the App

```bash
# Run database migrations
pnpm db:push

# Start dev server
pnpm dev

# App runs at http://localhost:3000
```

### Important Notes

✅ **DO**: Work on `main` branch or feature branches from `main`  
✅ **DO**: Use MySQL database  
✅ **DO**: Keep OAuth authentication  
✅ **DO**: Communicate changes to Developer 2  

❌ **DON'T**: Modify `feature/magic-link-auth` branch  
❌ **DON'T**: Change authentication-related files  
❌ **DON'T**: Switch to PostgreSQL  

---

## 🔐 For Developer 2 (Magic Link + PostgreSQL)

### Initial Setup

```bash
# Clone repository
git clone https://github.com/glodinasflexwork/property-manager.git
cd property-manager

# Switch to magic link branch
git checkout feature/magic-link-auth

# Install dependencies
pnpm install

# Create .env file
cp .env.example .env
```

### Environment Configuration (.env)

```env
# Magic Link Configuration
AUTH_TYPE=magic-link
RESEND_API_KEY=re_your_api_key_here
EMAIL_FROM=onboarding@resend.dev

# PostgreSQL Database (Neon)
DATABASE_URL=postgresql://user:password@neon-host/property_manager

# Common Settings
JWT_SECRET=your-secret-here
APP_URL=http://localhost:3002
VITE_APP_ID=property-manager-pro

# Placeholders (not used)
OAUTH_SERVER_URL=https://placeholder.com
VITE_OAUTH_PORTAL_URL=https://placeholder.com
```

### Daily Workflow

```bash
# Start working
git checkout feature/magic-link-auth
git pull origin feature/magic-link-auth

# Make changes, commit
git add .
git commit -m "feat: your feature description"

# Push changes
git push origin feature/magic-link-auth
```

### Weekly Sync with Main

```bash
# Every week, sync with main branch
git checkout feature/magic-link-auth
git fetch origin
git merge origin/main

# Resolve any conflicts
# Test thoroughly
git push origin feature/magic-link-auth
```

### Running the App

```bash
# Run database migrations
pnpm db:push

# Start dev server
pnpm dev

# App runs at http://localhost:3002
```

### Important Notes

✅ **DO**: Work on `feature/magic-link-auth` branch  
✅ **DO**: Use PostgreSQL (Neon) database  
✅ **DO**: Use Magic Link authentication  
✅ **DO**: Sync with `main` weekly  
✅ **DO**: Test migration path from OAuth  

❌ **DON'T**: Merge to `main` without coordination  
❌ **DON'T**: Delete OAuth-related code (for backward compatibility)  
❌ **DON'T**: Break existing features from Developer 1  

---

## 📋 Communication Checklist

### Daily Standup (5 minutes)

**Developer 1**:
- What features did I add/modify?
- Did I change any database schema?
- Did I add new dependencies?

**Developer 2**:
- What magic link features did I work on?
- Did I sync with main this week?
- Any blockers or conflicts?

### Weekly Sync (30 minutes)

**Both Developers**:
1. Review changes from the past week
2. Developer 2 merges `main` into `feature/magic-link-auth`
3. Resolve any conflicts together
4. Test both branches independently
5. Plan for next week

### Before Major Merge (2 hours)

**Both Developers**:
1. Review MERGE_GUIDE.md together
2. Create database backups
3. Commit all pending work
4. Schedule merge session
5. Prepare rollback plan

---

## 🔧 Common Commands

### Git Commands

```bash
# Check current branch
git branch

# See what changed
git status
git diff

# Sync with remote
git fetch origin
git pull origin <branch-name>

# Create new branch
git checkout -b feature/new-feature

# Switch branches
git checkout main
git checkout feature/magic-link-auth

# View commit history
git log --oneline --graph

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Discard all local changes
git reset --hard HEAD
```

### Database Commands

```bash
# Generate migration
pnpm drizzle-kit generate

# Apply migrations
pnpm db:push

# View database (MySQL)
mysql -u user -p -h host database_name

# View database (PostgreSQL)
psql $DATABASE_URL

# List tables
# MySQL: SHOW TABLES;
# PostgreSQL: \dt

# Backup database
# MySQL: mysqldump -u user -p database > backup.sql
# PostgreSQL: pg_dump $DATABASE_URL > backup.sql
```

### Development Commands

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build

# Lint code
pnpm lint

# Format code
pnpm format
```

---

## 📚 Documentation Reference

### For Developer 1 (OAuth)

**Essential Reading**:
- `.env.example` - Environment configuration
- `README.md` - Project overview
- Original OAuth documentation (if exists)

**Optional Reading**:
- `PARALLEL_DEVELOPMENT_STRATEGY.md` - Understand overall strategy
- `MERGE_GUIDE.md` - Prepare for eventual merge

### For Developer 2 (Magic Link)

**Essential Reading**:
- `MAGIC_LINK_AUTH.md` - Magic Link implementation details
- `PARALLEL_DEVELOPMENT_STRATEGY.md` - Branching strategy
- `DATABASE_MIGRATION_STRATEGY.md` - Database management
- `.env.example` - Environment configuration

**Before Merge**:
- `MERGE_GUIDE.md` - Step-by-step merge instructions

---

## 🆘 Troubleshooting

### "I'm on the wrong branch!"

```bash
# Save your changes
git stash

# Switch to correct branch
git checkout <correct-branch>

# Apply your changes
git stash pop
```

### "I have merge conflicts!"

```bash
# See conflicted files
git status

# For each file, choose:
# 1. Keep yours: git checkout --ours <file>
# 2. Keep theirs: git checkout --theirs <file>
# 3. Manual edit: Open file and resolve

# After resolving
git add <resolved-files>
git commit
```

### "Database won't connect!"

```bash
# Check .env file
cat .env | grep DATABASE_URL

# Test connection
# MySQL: mysql -u user -p -h host
# PostgreSQL: psql $DATABASE_URL

# Verify credentials
# Check host, port, username, password, database name
```

### "Dependencies won't install!"

```bash
# Clear cache and reinstall
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install

# If still fails, check Node.js version
node --version  # Should be 22.x
```

### "Dev server won't start!"

```bash
# Check if port is already in use
# Developer 1: Port 3000
# Developer 2: Port 3002
lsof -i :3000
lsof -i :3002

# Kill process if needed
kill -9 <PID>

# Or use different port
PORT=3001 pnpm dev
```

---

## 🎯 Quick Reference

### Branch Structure

```
main (OAuth + MySQL)
  ├── feature/dev1-feature-1
  ├── feature/dev1-feature-2
  └── feature/magic-link-auth (Magic Link + PostgreSQL)
      └── (Developer 2 works here)
```

### Database Structure

**Developer 1 (MySQL)**:
```
property_manager_oauth
  ├── users (openId required, email optional)
  ├── organizations
  ├── properties
  └── ... other tables
```

**Developer 2 (PostgreSQL)**:
```
property_manager_magic_link
  ├── users (email required, openId optional)
  ├── magic_link_tokens (new table)
  ├── organizations
  ├── properties
  └── ... other tables
```

### Port Allocation

- **Developer 1**: `http://localhost:3000` (OAuth)
- **Developer 2**: `http://localhost:3002` (Magic Link)
- **Production**: `https://yourdomain.com` (TBD)

### Environment Files

- `.env.example` - Template with all variables
- `.env` - Your local configuration (not in git)
- `.env.production` - Production configuration (not in git)

---

## ✅ Success Indicators

### Developer 1

- [ ] Can run app on `main` branch
- [ ] OAuth authentication works
- [ ] MySQL database connected
- [ ] Can create new features
- [ ] Tests pass
- [ ] No conflicts when pushing to `main`

### Developer 2

- [ ] Can run app on `feature/magic-link-auth` branch
- [ ] Magic Link authentication works
- [ ] PostgreSQL (Neon) database connected
- [ ] Can receive magic link emails
- [ ] Weekly sync with `main` successful
- [ ] Tests pass

---

## 📞 Need Help?

### Questions About:

**Git/Branching**: Read `PARALLEL_DEVELOPMENT_STRATEGY.md`  
**Database**: Read `DATABASE_MIGRATION_STRATEGY.md`  
**Magic Link**: Read `MAGIC_LINK_AUTH.md`  
**Merging**: Read `MERGE_GUIDE.md`  
**Environment**: Check `.env.example`  

### Still Stuck?

1. Check the relevant documentation file
2. Search GitHub issues
3. Ask the other developer
4. Review commit history: `git log`
5. Check server logs for errors

---

**Last Updated**: November 15, 2024  
**Version**: 1.0.0  
**Status**: Active Development
