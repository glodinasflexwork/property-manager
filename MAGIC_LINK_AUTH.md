# Magic Link Authentication System

## Overview

The Property Manager Pro application has been successfully migrated from Manus OAuth to a **Magic Link Authentication** system using Resend for email delivery. This provides a passwordless, secure authentication experience for users.

## What Changed

### Authentication Flow

**Before (Manus OAuth):**
- Users clicked "Sign in" → Redirected to Manus OAuth portal
- OAuth flow with authorization codes
- Required `openId` from Manus platform

**After (Magic Link):**
- Users enter email address → Receive magic link via email
- Click link → Automatically signed in
- Email-based authentication with JWT sessions

## Technical Implementation

### Backend Components

#### 1. Database Schema (`drizzle/schema.ts`)
- **Updated `users` table**: Made `email` required and unique, `openId` nullable
- **Added `magicLinkTokens` table**: Stores temporary authentication tokens
  - `token`: SHA-256 hashed secure random string
  - `email`: User's email address
  - `expiresAt`: Token expiration (15 minutes)
  - `usedAt`: Timestamp when token was used (prevents reuse)

#### 2. Email Service (`server/_core/email.ts`)
- Integrated **Resend API** for sending magic link emails
- Beautiful HTML email templates with gradient design
- Configurable sender address and app branding

#### 3. Authentication Routes (`server/_core/auth.ts`)
Replaced OAuth routes with:

**POST `/api/auth/request-magic-link`**
- Accepts: `{ email: string }`
- Generates secure random token
- Stores token in database with 15-minute expiration
- Sends beautiful email via Resend
- Returns: `{ success: true, message: "Magic link sent to your email" }`

**GET `/api/auth/verify-magic-link?token=xxx`**
- Validates token from database
- Checks expiration and usage status
- Creates or retrieves user by email
- Generates JWT session token
- Sets secure HTTP-only cookie
- Redirects to home page (`/`)

#### 4. Session Management (`server/_core/sdk.ts`)
- Updated `authenticateRequest` to support email-based sessions
- JWT payload uses email as `openId` for backward compatibility
- Tries to find user by email first, then by `openId` (for legacy support)

#### 5. Cookie Configuration (`server/_core/cookies.ts`)
- Fixed for localhost development: `sameSite: "lax"` for HTTP
- Production-ready: `sameSite: "none"` with `secure: true` for HTTPS
- HTTP-only cookies for security
- 1-year session duration

### Frontend Components

#### 1. Login Page (`client/src/pages/Login.tsx`)
- Modern, responsive design with gradient background
- Email input with validation
- Loading states and success messages
- "Check your email" confirmation screen

#### 2. App Routing (`client/src/App.tsx`)
- Added public `/login` route
- Protected routes redirect to `/login` when unauthenticated
- Removed OAuth redirect logic

#### 3. Authentication Hook (`client/src/_core/hooks/useAuth.ts`)
- No changes needed - works with existing `auth.me` tRPC endpoint
- Automatically detects session from cookie
- Provides user info, loading state, and logout function

## Environment Variables

Add these to your `.env` file:

```env
# Database
DATABASE_URL=postgresql://user:password@host/database

# Application
VITE_APP_ID=property-manager-pro
VITE_APP_TITLE=Property Manager Pro
APP_URL=http://localhost:3002

# Authentication
JWT_SECRET=your-secure-random-secret-here

# Email (Resend)
RESEND_API_KEY=re_your_api_key_here
EMAIL_FROM=noreply@yourdomain.com

# Legacy OAuth (can be removed or set to placeholder)
OAUTH_SERVER_URL=https://oauth.example.com
VITE_OAUTH_PORTAL_URL=https://oauth.example.com
```

## Security Features

### Token Security
- **Cryptographically secure random tokens**: 32 bytes (256 bits)
- **SHA-256 hashing**: Tokens stored as hashes in database
- **Single-use tokens**: Marked as used after verification
- **Time-limited**: 15-minute expiration
- **Automatic cleanup**: Expired tokens can be purged

### Session Security
- **HTTP-only cookies**: Cannot be accessed via JavaScript
- **Secure flag**: Enabled for HTTPS connections
- **SameSite protection**: Prevents CSRF attacks
- **JWT signing**: HS256 algorithm with secret key
- **Long session duration**: 1 year (configurable)

### Email Security
- **Resend API**: Professional email delivery service
- **Domain verification**: Required for production use
- **Rate limiting**: Prevent abuse (can be added)
- **Email validation**: Basic format checking

## User Experience

### Sign-In Flow

1. **User visits protected page** → Redirected to `/login`
2. **User enters email** → Clicks "Send magic link"
3. **Email sent** → "Check your email" screen shown
4. **User checks email** → Clicks magic link
5. **Token verified** → User signed in automatically
6. **Redirected to home** → Full access to application

### Email Template

The magic link email includes:
- **Professional HTML design** with gradients
- **Clear call-to-action** button
- **Expiration notice** (15 minutes)
- **App branding** (Property Manager Pro)
- **Fallback plain text** for email clients without HTML support

## Testing

### Test with Verified Email

With Resend in test mode, you can only send to verified email addresses. To test:

```bash
# Send magic link
curl -X POST http://localhost:3002/api/auth/request-magic-link \
  -H "Content-Type: application/json" \
  -d '{"email":"your-verified-email@example.com"}'

# Check your email and click the link
# Or manually navigate to the link in browser
```

### Production Setup

1. **Verify your domain** in Resend dashboard
2. **Update `EMAIL_FROM`** to use your domain (e.g., `noreply@yourdomain.com`)
3. **Deploy with HTTPS** for secure cookies
4. **Test with any email address**

## Database Migrations

The schema changes have been applied to your Neon PostgreSQL database:

```sql
-- Users table updated
ALTER TABLE users
  ALTER COLUMN email SET NOT NULL,
  ADD CONSTRAINT users_email_unique UNIQUE (email),
  ALTER COLUMN "openId" DROP NOT NULL;

-- Magic link tokens table created
CREATE TABLE magic_link_tokens (
  id SERIAL PRIMARY KEY,
  token VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL,
  "expiresAt" TIMESTAMP NOT NULL,
  "usedAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL
);
```

## Troubleshooting

### Issue: Magic link doesn't work
- **Check token expiration**: Links expire after 15 minutes
- **Check if already used**: Tokens can only be used once
- **Check server logs**: Look for `[Auth]` prefixed messages

### Issue: Cookie not set
- **Check browser console**: Look for cookie-related errors
- **Check SameSite settings**: Must be `lax` for localhost HTTP
- **Check domain**: Cookies must match the domain

### Issue: Email not received
- **Check Resend API key**: Must be valid and active
- **Check email address**: Must be verified in test mode
- **Check spam folder**: Emails might be filtered
- **Check Resend logs**: View delivery status in dashboard

### Issue: User redirected to login after signing in
- **Check session cookie**: Use browser DevTools → Application → Cookies
- **Check JWT verification**: Server logs show verification failures
- **Check database**: Ensure user exists with correct email

## API Reference

### Request Magic Link

**Endpoint:** `POST /api/auth/request-magic-link`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Magic link sent to your email"
}
```

**Errors:**
- `400 Bad Request`: Invalid email format
- `500 Internal Server Error`: Email sending failed

### Verify Magic Link

**Endpoint:** `GET /api/auth/verify-magic-link?token={token}`

**Query Parameters:**
- `token` (required): The magic link token from email

**Response:**
- `302 Redirect`: Redirects to `/` on success
- `400 Bad Request`: Invalid, expired, or used token
- `500 Internal Server Error`: Authentication failed

### Get Current User

**Endpoint:** `GET /api/trpc/auth.me`

**Response:**
```json
{
  "result": {
    "data": {
      "json": {
        "id": 1,
        "email": "user@example.com",
        "name": "User Name",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "lastSignedIn": "2024-01-01T00:00:00.000Z"
      }
    }
  }
}
```

### Logout

**Endpoint:** `POST /api/trpc/auth.logout`

**Response:**
```json
{
  "result": {
    "data": {
      "json": {
        "success": true
      }
    }
  }
}
```

## Future Enhancements

### Recommended Improvements

1. **Rate Limiting**
   - Limit magic link requests per email (e.g., 3 per hour)
   - Prevent spam and abuse

2. **Email Verification**
   - Add email verification step for new users
   - Prevent typos and invalid emails

3. **Remember Device**
   - Option to extend session on trusted devices
   - Reduce friction for returning users

4. **Admin Panel**
   - View active sessions
   - Revoke sessions remotely
   - Monitor authentication activity

5. **Multi-Factor Authentication**
   - Optional TOTP/SMS verification
   - Enhanced security for sensitive accounts

6. **Social Login**
   - Add Google, GitHub, Microsoft OAuth
   - Provide multiple sign-in options

7. **Session Management**
   - View active sessions in user settings
   - Logout from all devices
   - Session activity log

## Migration Notes

### From Manus OAuth to Magic Link

If you have existing users with `openId` from Manus OAuth:

1. **Backward compatibility maintained**: Users with `openId` can still be authenticated
2. **Email required**: Ensure all existing users have email addresses
3. **Gradual migration**: Users will transition to email-based auth naturally
4. **Data cleanup**: After migration period, `openId` column can be removed

### Database Conversion

The application was also migrated from **MySQL to PostgreSQL** (Neon):

- All MySQL-specific types converted to PostgreSQL equivalents
- Auto-increment → PostgreSQL identity columns
- Enum types → PostgreSQL enum types
- Drizzle ORM updated to use `drizzle-orm/neon-http`

## Support

For issues or questions:
- Check server logs for `[Auth]` and `[Email]` prefixed messages
- Review this documentation
- Check Resend dashboard for email delivery status
- Verify environment variables are set correctly

---

**Status**: ✅ Fully Implemented and Tested
**Last Updated**: November 15, 2024
**Version**: 1.0.0
