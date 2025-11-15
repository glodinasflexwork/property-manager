# Parallel Development Strategy
## Managing OAuth and Magic Link Authentication Simultaneously

This document outlines the strategy for allowing multiple developers to work on the Property Manager application with different authentication systems simultaneously, and how to safely merge changes later.

## Current Situation

**Developer 2 (You)**: Working with Magic Link authentication on branch `feature/magic-link-auth`
**Developer 1**: Working with Manus OAuth authentication on branch `main`

## Branch Strategy

### Branch Structure

```
main (Manus OAuth - Original)
  │
  ├── feature/magic-link-auth (Magic Link - New)
  │   └── All magic link authentication changes
  │
  └── feature/dev1-feature (Developer 1's work)
      └── New features using OAuth
```

### Branch Purposes

1. **`main`** - Production-ready code with Manus OAuth
   - Developer 1 works here for features
   - Stable authentication system (OAuth)
   - MySQL database

2. **`feature/magic-link-auth`** - Magic Link authentication
   - Developer 2 (you) works here
   - New authentication system (Magic Link)
   - PostgreSQL database (Neon)
   - Complete authentication overhaul

3. **`develop`** (recommended to create) - Integration branch
   - Merge point for both developers
   - Testing ground before production
   - Final conflict resolution

## Workflow for Parallel Development

### For Developer 1 (OAuth - Main Branch)

```bash
# Work on main branch with OAuth
git checkout main
git pull origin main

# Create feature branch from main
git checkout -b feature/add-new-property-feature

# Develop features using OAuth authentication
# ... make changes ...

# Commit and push
git add .
git commit -m "feat: add new property feature"
git push origin feature/add-new-property-feature

# Create PR to merge into main
```

**Developer 1's Environment (.env)**:
```env
# OAuth Configuration
OAUTH_SERVER_URL=https://oauth.manus.im
VITE_OAUTH_PORTAL_URL=https://oauth.manus.im
VITE_APP_ID=your-app-id
JWT_SECRET=your-secret

# MySQL Database
DATABASE_URL=mysql://user:password@host:port/database
```

### For Developer 2 (Magic Link - Feature Branch)

```bash
# Work on magic link feature branch
git checkout feature/magic-link-auth
git pull origin feature/magic-link-auth

# Develop features using Magic Link authentication
# ... make changes ...

# Commit and push
git add .
git commit -m "feat: enhance magic link email template"
git push origin feature/magic-link-auth

# Keep branch updated with main (important!)
git fetch origin
git merge origin/main
# Resolve any conflicts
git push origin feature/magic-link-auth
```

**Developer 2's Environment (.env)**:
```env
# Magic Link Configuration
RESEND_API_KEY=re_your_api_key
EMAIL_FROM=noreply@yourdomain.com
APP_URL=http://localhost:3002

# PostgreSQL Database (Neon)
DATABASE_URL=postgresql://user:password@host/database

# Placeholders (not used)
OAUTH_SERVER_URL=https://placeholder.com
VITE_OAUTH_PORTAL_URL=https://placeholder.com
VITE_APP_ID=property-manager-pro
JWT_SECRET=your-secret
```

## Database Strategy

### Option 1: Separate Databases (Recommended for Parallel Development)

**Developer 1**: Uses MySQL database
```env
DATABASE_URL=mysql://user:password@mysql-host:3306/property_manager_oauth
```

**Developer 2**: Uses PostgreSQL database (Neon)
```env
DATABASE_URL=postgresql://user:password@neon-host/property_manager_magic_link
```

**Advantages**:
- No conflicts between developers
- Each can work independently
- Data isolation during development

**Disadvantages**:
- Need to migrate data when merging
- Two databases to maintain during development

### Option 2: Shared Database with Feature Flags

Create an authentication abstraction layer that supports both systems:

```typescript
// server/_core/auth-factory.ts
import { ENV } from './env';

export function getAuthProvider() {
  if (ENV.authType === 'magic-link') {
    return new MagicLinkAuthProvider();
  } else {
    return new OAuthProvider();
  }
}
```

**Advantages**:
- Single database
- Easier data sharing
- Smoother transition

**Disadvantages**:
- More complex implementation
- Requires refactoring both auth systems

### Option 3: Database Branching (Advanced)

Use Neon's branching feature to create database branches:

```bash
# Developer 1: main database branch
DATABASE_URL=postgresql://...@neon.tech/main

# Developer 2: feature database branch
DATABASE_URL=postgresql://...@neon.tech/feature-magic-link
```

**Advantages**:
- Both use PostgreSQL
- Easy to merge database changes
- Neon handles branching automatically

**Disadvantages**:
- Requires migrating Developer 1 from MySQL to PostgreSQL first

## Keeping Branches in Sync

### Regular Syncing (Recommended)

Developer 2 should regularly merge `main` into `feature/magic-link-auth`:

```bash
# On feature/magic-link-auth branch
git fetch origin
git merge origin/main

# Resolve conflicts if any
# Test thoroughly
git push origin feature/magic-link-auth
```

**Frequency**: At least once per week, or after major commits to `main`

### Conflict Resolution Strategy

When merging `main` into `feature/magic-link-auth`, conflicts will occur in:

1. **Authentication files** - Keep magic link version
2. **Database schema** - Merge carefully, keep both changes
3. **Environment config** - Keep magic link version
4. **Business logic** - Merge both changes

## Files That Will Conflict

### High Conflict Risk (Authentication-Related)

These files have been completely rewritten for magic link:

- `server/_core/oauth.ts` → `server/_core/auth.ts`
- `server/_core/sdk.ts` (modified)
- `server/_core/env.ts` (modified)
- `server/_core/cookies.ts` (modified)
- `server/db.ts` (modified)
- `drizzle/schema.ts` (modified)
- `client/src/App.tsx` (modified)
- `client/src/const.ts` (modified)

**Strategy**: Keep magic link versions, manually port any business logic changes from Developer 1

### Medium Conflict Risk (Shared Files)

Files both developers might modify:

- `package.json` - Merge dependencies
- `server/routers.ts` - Merge new routes
- Database migrations - Keep both, apply sequentially

**Strategy**: Merge both changes carefully

### Low Conflict Risk (New Features)

Files Developer 1 creates for new features:

- New pages/components
- New API routes (non-auth)
- New database tables (non-auth)

**Strategy**: Usually auto-merge, test thoroughly

## Merge Strategy

### Phase 1: Prepare for Merge

**Developer 2 (You)**:
```bash
# Ensure feature branch is up to date
git checkout feature/magic-link-auth
git fetch origin
git merge origin/main
# Resolve conflicts
git push origin feature/magic-link-auth
```

**Developer 1**:
```bash
# Ensure main is up to date
git checkout main
git pull origin main
# Ensure all features are merged
```

### Phase 2: Create Integration Branch

```bash
# Create develop branch from main
git checkout main
git pull origin main
git checkout -b develop
git push origin develop

# Merge magic link into develop
git merge feature/magic-link-auth
# Resolve conflicts (see below)
git push origin develop
```

### Phase 3: Resolve Conflicts

**Conflict Resolution Priority**:

1. **Keep Magic Link Auth System**
   - All auth-related files from `feature/magic-link-auth`
   - Database schema changes for auth
   - Environment variables

2. **Merge Business Logic**
   - New features from Developer 1
   - New API routes (non-auth)
   - UI improvements

3. **Update Dependencies**
   - Merge `package.json` changes
   - Run `pnpm install` to update lockfile

### Phase 4: Database Migration

**If using separate databases**:

```bash
# Export data from MySQL (Developer 1's DB)
mysqldump -u user -p property_manager > backup.sql

# Convert MySQL dump to PostgreSQL format
# Use tools like: pgloader, mysql2pgsql, or manual conversion

# Import into PostgreSQL (Developer 2's DB)
psql -U user -d property_manager < converted_backup.sql

# Run magic link migrations
pnpm db:push
```

**If using same database**:

```bash
# Apply magic link migrations
pnpm db:push

# Verify all tables exist
# Test authentication with both systems (if keeping OAuth as fallback)
```

### Phase 5: Testing

```bash
# On develop branch
git checkout develop

# Install dependencies
pnpm install

# Update environment variables
cp .env.example .env
# Configure for magic link

# Run migrations
pnpm db:push

# Start dev server
pnpm dev

# Test thoroughly:
# - Magic link authentication
# - All features from Developer 1
# - Database operations
# - API endpoints
```

### Phase 6: Deploy

```bash
# After testing on develop
git checkout main
git merge develop
git push origin main

# Deploy to production
```

## Conflict Resolution Examples

### Example 1: server/_core/sdk.ts

**Main (OAuth)**:
```typescript
async authenticateRequest(req: Request): Promise<User> {
  const session = await this.verifySession(sessionCookie);
  const user = await db.getUserByOpenId(session.openId);
  return user;
}
```

**Feature Branch (Magic Link)**:
```typescript
async authenticateRequest(req: Request): Promise<User> {
  const session = await this.verifySession(sessionCookie);
  let user = await db.getUserByEmail(session.openId); // email stored in openId
  if (!user) {
    user = await db.getUserByOpenId(session.openId); // fallback to OAuth
  }
  return user;
}
```

**Resolution**: Keep magic link version (supports both)

### Example 2: drizzle/schema.ts

**Main (OAuth)**:
```typescript
export const users = mysqlTable('users', {
  id: serial('id').primaryKey(),
  openId: varchar('openId', { length: 255 }).notNull().unique(),
  email: varchar('email', { length: 255 }),
  // ... other fields
});
```

**Feature Branch (Magic Link)**:
```typescript
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  openId: varchar('openId', { length: 255 }).unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  // ... other fields
});

export const magicLinkTokens = pgTable('magic_link_tokens', {
  // ... magic link fields
});
```

**Resolution**: Keep magic link version (PostgreSQL + new table)

### Example 3: package.json

**Main (OAuth)**:
```json
{
  "dependencies": {
    "axios": "^1.6.0",
    "express": "^4.18.0",
    "new-package-from-dev1": "^1.0.0"
  }
}
```

**Feature Branch (Magic Link)**:
```json
{
  "dependencies": {
    "axios": "^1.6.0",
    "express": "^4.18.0",
    "resend": "^3.0.0",
    "drizzle-orm": "^0.30.0"
  }
}
```

**Resolution**: Merge both
```json
{
  "dependencies": {
    "axios": "^1.6.0",
    "express": "^4.18.0",
    "resend": "^3.0.0",
    "drizzle-orm": "^0.30.0",
    "new-package-from-dev1": "^1.0.0"
  }
}
```

## Environment Configuration

### .env.example for Both Systems

Create a comprehensive `.env.example` that documents both:

```env
# Application
VITE_APP_ID=property-manager-pro
VITE_APP_TITLE=Property Manager Pro
APP_URL=http://localhost:3002
JWT_SECRET=your-secure-random-secret

# Database
# For OAuth (Developer 1): Use MySQL
# DATABASE_URL=mysql://user:password@host:3306/database
# For Magic Link (Developer 2): Use PostgreSQL
DATABASE_URL=postgresql://user:password@host/database

# Authentication System
# Choose one: 'oauth' or 'magic-link'
AUTH_TYPE=magic-link

# OAuth Configuration (for AUTH_TYPE=oauth)
OAUTH_SERVER_URL=https://oauth.manus.im
VITE_OAUTH_PORTAL_URL=https://oauth.manus.im

# Magic Link Configuration (for AUTH_TYPE=magic-link)
RESEND_API_KEY=re_your_api_key_here
EMAIL_FROM=noreply@yourdomain.com
```

## Communication Between Developers

### Daily Standup Topics

1. **What auth-related files did you modify?**
2. **What database changes did you make?**
3. **Any new dependencies added?**
4. **Ready to sync branches?**

### Weekly Sync

```bash
# Developer 2: Merge main into feature branch
git checkout feature/magic-link-auth
git fetch origin
git merge origin/main
# Resolve conflicts
git push origin feature/magic-link-auth
```

### Before Major Merge

1. **Code freeze**: Both developers commit all pending work
2. **Create backup**: Backup both databases
3. **Test independently**: Each developer tests their branch
4. **Merge to develop**: Merge both branches to develop
5. **Resolve conflicts**: Work together to resolve
6. **Test together**: Both developers test develop branch
7. **Deploy**: Merge develop to main

## Recommended Timeline

### Week 1-2: Parallel Development
- Developer 1: Works on `main` with OAuth
- Developer 2: Works on `feature/magic-link-auth`
- Weekly sync: Merge `main` into `feature/magic-link-auth`

### Week 3: Integration Preparation
- Code freeze on major auth changes
- Developer 2: Final sync with `main`
- Create `develop` branch
- Document all conflicts

### Week 4: Merge and Testing
- Merge both branches to `develop`
- Resolve conflicts together
- Comprehensive testing
- Database migration

### Week 5: Deployment
- Deploy `develop` to staging
- Final testing
- Merge to `main`
- Deploy to production

## Rollback Strategy

If merge causes issues:

```bash
# Revert develop branch
git checkout develop
git reset --hard origin/main
git push -f origin develop

# Or revert specific commit
git revert <commit-hash>
git push origin develop
```

## Best Practices

### For Developer 1 (OAuth)

1. ✅ **Don't modify auth files**: Avoid changing `server/_core/oauth.ts`, `server/_core/sdk.ts`
2. ✅ **Document DB changes**: Keep track of schema changes
3. ✅ **Use feature branches**: Create branches from `main` for features
4. ✅ **Communicate**: Share what you're working on
5. ✅ **Test thoroughly**: Ensure OAuth still works

### For Developer 2 (Magic Link)

1. ✅ **Sync regularly**: Merge `main` into `feature/magic-link-auth` weekly
2. ✅ **Keep docs updated**: Update MAGIC_LINK_AUTH.md
3. ✅ **Test migration path**: Ensure smooth transition from OAuth
4. ✅ **Backward compatibility**: Support OAuth users during transition
5. ✅ **Database backups**: Backup before major changes

### For Both Developers

1. ✅ **Commit often**: Small, focused commits
2. ✅ **Clear commit messages**: Use conventional commits (feat:, fix:, etc.)
3. ✅ **Code reviews**: Review each other's PRs
4. ✅ **Testing**: Write tests for new features
5. ✅ **Documentation**: Update docs for changes

## Tools to Help

### Git Aliases

Add to `.gitconfig`:

```ini
[alias]
  sync-main = "!git fetch origin && git merge origin/main"
  conflicts = "diff --name-only --diff-filter=U"
  ours = "checkout --ours"
  theirs = "checkout --theirs"
```

### Merge Tool

Use a visual merge tool:

```bash
# Configure merge tool
git config --global merge.tool vscode
git config --global mergetool.vscode.cmd 'code --wait $MERGED'

# Use during conflicts
git mergetool
```

## Summary

**Key Points**:

1. **Use separate branches**: `main` (OAuth) and `feature/magic-link-auth` (Magic Link)
2. **Separate databases**: Avoid conflicts during development
3. **Regular syncing**: Merge `main` into feature branch weekly
4. **Clear communication**: Daily standups and weekly syncs
5. **Careful merging**: Use `develop` branch for integration
6. **Thorough testing**: Test after every merge
7. **Database migration plan**: Prepare for final merge

**This strategy allows both developers to work simultaneously without blocking each other, while ensuring a smooth merge when ready.**

---

**Created**: November 15, 2024
**Status**: Active Development
**Next Review**: Weekly sync
