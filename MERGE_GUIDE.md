# Merge Guide: OAuth to Magic Link Authentication
## Step-by-Step Conflict Resolution and Integration

This guide provides detailed instructions for merging the Magic Link authentication feature branch into the main branch, resolving conflicts, and ensuring a smooth transition.

## Pre-Merge Checklist

### For Developer 1 (OAuth - Main Branch)

- [ ] All features committed and pushed to `main`
- [ ] All tests passing on `main` branch
- [ ] Database backup created
- [ ] No pending pull requests
- [ ] Code reviewed and approved
- [ ] Documentation updated for new features

### For Developer 2 (Magic Link - Feature Branch)

- [ ] All magic link features committed to `feature/magic-link-auth`
- [ ] Branch synced with latest `main` (merged `main` into feature branch)
- [ ] All tests passing on feature branch
- [ ] Database backup created (Neon)
- [ ] Documentation complete (MAGIC_LINK_AUTH.md)
- [ ] Migration tested locally

### For Both Developers

- [ ] Communication: Both developers available for merge session
- [ ] Time allocated: 2-4 hours for merge and testing
- [ ] Backup plan: Rollback strategy documented
- [ ] Test environment ready
- [ ] Production deployment plan ready

## Merge Timeline

### Day 1: Preparation (2-3 hours)

**Morning**:
1. Developer 1: Final commit to `main`
2. Developer 2: Sync `feature/magic-link-auth` with `main`
3. Both: Review conflict list (see below)
4. Both: Create database backups

**Afternoon**:
1. Create `develop` branch from `main`
2. Test `develop` branch independently
3. Document current state

### Day 2: Merge and Initial Conflict Resolution (4-6 hours)

**Morning**:
1. Merge `feature/magic-link-auth` into `develop`
2. Resolve conflicts (see detailed guide below)
3. Commit resolved conflicts

**Afternoon**:
1. Run database migrations
2. Update environment variables
3. Initial testing

### Day 3: Testing and Refinement (4-6 hours)

**All Day**:
1. Comprehensive testing
2. Fix bugs discovered during testing
3. Performance testing
4. Security review

### Day 4: Deployment Preparation (2-3 hours)

**Morning**:
1. Final testing on `develop`
2. Create deployment checklist
3. Prepare rollback plan

**Afternoon**:
1. Merge `develop` to `main`
2. Deploy to staging
3. Final smoke tests

### Day 5: Production Deployment (2-3 hours)

**Scheduled Maintenance Window**:
1. Database migration
2. Deploy to production
3. Monitor for issues
4. Communicate with users

## Step-by-Step Merge Process

### Step 1: Create Develop Branch

```bash
# Developer 2 (or designated merge coordinator)
cd /home/ubuntu/property-manager

# Ensure you're on latest main
git checkout main
git pull origin main

# Create develop branch
git checkout -b develop
git push origin develop
```

### Step 2: Merge Feature Branch

```bash
# On develop branch
git merge feature/magic-link-auth

# You'll see conflicts - don't panic!
# Output will look like:
# Auto-merging server/_core/sdk.ts
# CONFLICT (content): Merge conflict in server/_core/sdk.ts
# Auto-merging drizzle/schema.ts
# CONFLICT (content): Merge conflict in drizzle/schema.ts
# ...
```

### Step 3: Identify All Conflicts

```bash
# List all conflicted files
git status

# Or use alias
git diff --name-only --diff-filter=U
```

**Expected Conflicts**:
1. `drizzle/schema.ts` - Database schema
2. `drizzle.config.ts` - Drizzle configuration
3. `server/_core/sdk.ts` - Authentication logic
4. `server/_core/env.ts` - Environment variables
5. `server/_core/index.ts` - Server setup
6. `server/db.ts` - Database queries
7. `client/src/App.tsx` - App routing
8. `client/src/const.ts` - Constants
9. `package.json` - Dependencies
10. `pnpm-lock.yaml` - Lock file

## Detailed Conflict Resolution

### Conflict 1: drizzle/schema.ts

**Conflict Markers**:
```typescript
<<<<<<< HEAD (main - MySQL)
import { mysqlTable, serial, varchar } from 'drizzle-orm/mysql-core';

export const users = mysqlTable('users', {
  id: serial('id').primaryKey(),
  openId: varchar('openId', { length: 255 }).notNull().unique(),
  email: varchar('email', { length: 255 }),
=======
import { pgTable, serial, varchar } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  openId: varchar('openId', { length: 255 }).unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
>>>>>>> feature/magic-link-auth
```

**Resolution**: Keep Magic Link version (PostgreSQL)

```bash
# Accept magic link version
git checkout --theirs drizzle/schema.ts

# Or manually edit to keep PostgreSQL version
```

**Why**: We're migrating to PostgreSQL, so keep the PostgreSQL schema.

### Conflict 2: drizzle.config.ts

**Conflict**:
```typescript
<<<<<<< HEAD
  dialect: 'mysql',
=======
  dialect: 'postgresql',
>>>>>>> feature/magic-link-auth
```

**Resolution**: Keep `'postgresql'`

```bash
git checkout --theirs drizzle.config.ts
```

### Conflict 3: server/_core/sdk.ts

**Conflict in authenticateRequest**:
```typescript
<<<<<<< HEAD
const user = await db.getUserByOpenId(session.openId);
=======
let user = await db.getUserByEmail(session.openId);
if (!user) {
  user = await db.getUserByOpenId(session.openId);
}
>>>>>>> feature/magic-link-auth
```

**Resolution**: Keep Magic Link version (supports both)

```bash
git checkout --theirs server/_core/sdk.ts
```

**Why**: The magic link version has backward compatibility for OAuth users.

### Conflict 4: server/_core/env.ts

**Conflict**:
```typescript
<<<<<<< HEAD
export const ENV = {
  oAuthServerUrl: getEnvVar('OAUTH_SERVER_URL'),
  appId: getEnvVar('VITE_APP_ID'),
  cookieSecret: getEnvVar('JWT_SECRET'),
  databaseUrl: getEnvVar('DATABASE_URL'),
};
=======
export const ENV = {
  oAuthServerUrl: getEnvVar('OAUTH_SERVER_URL', false), // Optional
  appId: getEnvVar('VITE_APP_ID'),
  cookieSecret: getEnvVar('JWT_SECRET'),
  databaseUrl: getEnvVar('DATABASE_URL'),
  resendApiKey: getEnvVar('RESEND_API_KEY', false), // Optional
  emailFrom: getEnvVar('EMAIL_FROM', false), // Optional
  appUrl: getEnvVar('APP_URL'),
};
>>>>>>> feature/magic-link-auth
```

**Resolution**: Keep Magic Link version

```bash
git checkout --theirs server/_core/env.ts
```

**Why**: Includes all environment variables for both systems.

### Conflict 5: server/_core/index.ts

**Conflict**:
```typescript
<<<<<<< HEAD
import { oauthRouter } from './oauth';

app.use('/api/oauth', oauthRouter);
=======
import { authRouter } from './auth';

app.use('/api/auth', authRouter);
>>>>>>> feature/magic-link-auth
```

**Resolution**: Keep Magic Link version

```bash
git checkout --theirs server/_core/index.ts
```

**Why**: New authentication routes replace OAuth routes.

### Conflict 6: server/db.ts

**Conflict in imports and queries**:
```typescript
<<<<<<< HEAD
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

export const db = drizzle(mysql.createPool(ENV.databaseUrl));
=======
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';

export const db = drizzle(neon(ENV.databaseUrl));
>>>>>>> feature/magic-link-auth
```

**Resolution**: Keep Magic Link version

```bash
git checkout --theirs server/db.ts
```

**Why**: PostgreSQL/Neon is the target database.

### Conflict 7: client/src/App.tsx

**Conflict in routing**:
```typescript
<<<<<<< HEAD
// No login route, redirects to OAuth portal
=======
<Route path="/login" element={<Login />} />
>>>>>>> feature/magic-link-auth
```

**Resolution**: Keep Magic Link version

```bash
git checkout --theirs client/src/App.tsx
```

**Why**: Need login route for magic link flow.

### Conflict 8: client/src/const.ts

**Conflict**:
```typescript
<<<<<<< HEAD
export function getLoginUrl() {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  return `${oauthPortalUrl}/login?app_id=${appId}`;
}
=======
export function getLoginUrl() {
  return '/login';
}
>>>>>>> feature/magic-link-auth
```

**Resolution**: Keep Magic Link version

```bash
git checkout --theirs client/src/const.ts
```

**Why**: Login is now local, not external OAuth portal.

### Conflict 9: package.json

**Conflict in dependencies**:
```json
<<<<<<< HEAD
{
  "dependencies": {
    "axios": "^1.6.0",
    "drizzle-orm": "^0.29.0",
    "mysql2": "^3.6.0",
    "new-package-from-dev1": "^1.0.0"
  }
}
=======
{
  "dependencies": {
    "axios": "^1.6.0",
    "drizzle-orm": "^0.30.0",
    "@neondatabase/serverless": "^0.9.0",
    "resend": "^3.0.0"
  }
}
>>>>>>> feature/magic-link-auth
```

**Resolution**: Merge both (manual)

```json
{
  "dependencies": {
    "axios": "^1.6.0",
    "drizzle-orm": "^0.30.0",
    "@neondatabase/serverless": "^0.9.0",
    "resend": "^3.0.0",
    "new-package-from-dev1": "^1.0.0"
  }
}
```

**Steps**:
1. Open `package.json` in editor
2. Manually merge dependencies
3. Keep higher version numbers
4. Include packages from both branches
5. Remove MySQL packages (`mysql2`)
6. Save file

### Conflict 10: pnpm-lock.yaml

**Resolution**: Regenerate

```bash
# Delete lock file
rm pnpm-lock.yaml

# Regenerate based on merged package.json
pnpm install

# Add to git
git add pnpm-lock.yaml
```

**Why**: Lock file should be regenerated after merging dependencies.

## After Resolving All Conflicts

### Step 4: Mark Conflicts as Resolved

```bash
# After resolving each file
git add <resolved-file>

# Or add all at once
git add .
```

### Step 5: Complete the Merge

```bash
# Commit the merge
git commit -m "Merge feature/magic-link-auth into develop

Resolved conflicts:
- Database schema: Migrated from MySQL to PostgreSQL
- Authentication: Replaced OAuth with Magic Link
- Dependencies: Merged both branches, removed MySQL packages
- Environment: Added Resend configuration
- Routes: Added /login route for magic link flow

Breaking changes:
- Database changed from MySQL to PostgreSQL
- Authentication flow changed from OAuth to Magic Link
- Environment variables updated (see .env.example)

Co-authored-by: Developer 1 <dev1@example.com>
Co-authored-by: Developer 2 <dev2@example.com>"
```

### Step 6: Install Dependencies

```bash
# Install merged dependencies
pnpm install

# Verify installation
pnpm list
```

### Step 7: Update Environment Variables

```bash
# Copy example
cp .env.example .env

# Edit .env with production values
nano .env

# Required for magic link:
# - DATABASE_URL (PostgreSQL)
# - RESEND_API_KEY
# - EMAIL_FROM
# - APP_URL
# - JWT_SECRET
```

### Step 8: Run Database Migrations

```bash
# Generate migrations if needed
pnpm drizzle-kit generate

# Apply migrations
pnpm db:push

# Verify tables
psql $DATABASE_URL -c "\dt"
```

### Step 9: Test the Application

```bash
# Start dev server
pnpm dev

# In another terminal, run tests
pnpm test

# Manual testing:
# 1. Visit http://localhost:3000
# 2. Test magic link authentication
# 3. Test all features from Developer 1
# 4. Test database operations
# 5. Test API endpoints
```

## Testing Checklist

### Authentication Testing

- [ ] Magic link email sent successfully
- [ ] Magic link works and signs user in
- [ ] Session persists across page refreshes
- [ ] Logout works correctly
- [ ] Protected routes redirect to login
- [ ] Invalid/expired tokens rejected
- [ ] Token can only be used once

### Feature Testing (from Developer 1)

- [ ] All features from `main` branch work
- [ ] New properties can be created
- [ ] Invoices can be managed
- [ ] Team management works
- [ ] Billing features functional
- [ ] All API endpoints respond correctly

### Database Testing

- [ ] All tables exist in PostgreSQL
- [ ] Data migrated correctly (if applicable)
- [ ] Queries execute without errors
- [ ] Indexes created properly
- [ ] Foreign keys enforced

### Integration Testing

- [ ] Frontend and backend communicate correctly
- [ ] tRPC endpoints work
- [ ] File uploads work (if applicable)
- [ ] Real-time features work (if applicable)

### Performance Testing

- [ ] Page load times acceptable
- [ ] Database queries optimized
- [ ] No N+1 query problems
- [ ] API response times under 200ms

### Security Testing

- [ ] Cookies set with correct flags (httpOnly, secure, sameSite)
- [ ] JWT tokens properly signed
- [ ] SQL injection prevented
- [ ] XSS protection in place
- [ ] CSRF protection enabled

## Common Issues and Solutions

### Issue 1: "Module not found" errors

**Cause**: Dependencies not installed after merge

**Solution**:
```bash
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install
```

### Issue 2: Database connection errors

**Cause**: Wrong database URL or credentials

**Solution**:
```bash
# Check .env file
cat .env | grep DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Update .env with correct URL
```

### Issue 3: TypeScript errors after merge

**Cause**: Type definitions changed

**Solution**:
```bash
# Regenerate types
pnpm drizzle-kit generate

# Restart TypeScript server in VSCode
# Cmd+Shift+P -> "TypeScript: Restart TS Server"
```

### Issue 4: Tests failing after merge

**Cause**: Tests written for OAuth, not magic link

**Solution**:
```bash
# Update tests to use magic link authentication
# Or temporarily skip auth tests
pnpm test -- --skip-auth
```

### Issue 5: Cookies not being set

**Cause**: Cookie settings incorrect for environment

**Solution**:
```typescript
// Check server/_core/cookies.ts
// Ensure sameSite is 'lax' for localhost
// Ensure secure is false for HTTP
```

## Rollback Plan

If merge causes critical issues:

### Option 1: Revert Merge Commit

```bash
# Find merge commit hash
git log --oneline

# Revert the merge
git revert -m 1 <merge-commit-hash>
git push origin develop
```

### Option 2: Reset to Pre-Merge State

```bash
# Hard reset to before merge
git reset --hard HEAD~1

# Force push (dangerous!)
git push -f origin develop
```

### Option 3: Keep Develop, Fix Main

```bash
# Don't merge develop to main yet
# Fix issues on develop
# Test thoroughly
# Then merge when ready
```

## Post-Merge Tasks

### Update Documentation

- [ ] Update README.md with new auth instructions
- [ ] Update API documentation
- [ ] Update deployment guide
- [ ] Create migration guide for existing users

### Communicate Changes

- [ ] Notify team of authentication change
- [ ] Send email to users about new login flow
- [ ] Update help documentation
- [ ] Create video tutorial (optional)

### Monitor Production

- [ ] Set up error monitoring (Sentry, etc.)
- [ ] Monitor authentication success rate
- [ ] Track email delivery rate
- [ ] Monitor database performance
- [ ] Watch for user complaints

### Cleanup

- [ ] Delete `feature/magic-link-auth` branch (after successful merge)
- [ ] Archive old OAuth code (for reference)
- [ ] Remove unused dependencies
- [ ] Clean up old migration files

## Final Deployment to Production

```bash
# After thorough testing on develop
git checkout main
git pull origin main
git merge develop

# Tag the release
git tag -a v2.0.0 -m "Release: Magic Link Authentication"
git push origin main --tags

# Deploy to production
# (Your deployment process here)
```

## Success Criteria

Merge is successful when:

✅ All conflicts resolved
✅ All tests passing  
✅ Application runs without errors  
✅ Magic link authentication works  
✅ All features from Developer 1 work  
✅ Database migrations applied  
✅ Documentation updated  
✅ Team notified  
✅ Production deployed  
✅ Users can sign in successfully  

## Summary

**Merge Process**:
1. ✅ Create `develop` branch
2. ✅ Merge `feature/magic-link-auth` into `develop`
3. ✅ Resolve conflicts (keep magic link versions)
4. ✅ Merge `package.json` dependencies
5. ✅ Regenerate `pnpm-lock.yaml`
6. ✅ Update `.env` file
7. ✅ Run database migrations
8. ✅ Test thoroughly
9. ✅ Merge `develop` to `main`
10. ✅ Deploy to production

**Estimated Time**: 2-5 days depending on complexity and testing requirements

**Team Required**: Both developers should be available for merge session

**Risk Level**: Medium (breaking changes, but well-documented)

---

**Created**: November 15, 2024
**Last Updated**: November 15, 2024
**Status**: Ready for Merge
