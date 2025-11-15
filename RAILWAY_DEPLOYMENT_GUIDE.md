# Railway Deployment Guide
## Deploy Property Manager Pro to Railway

Railway is perfect for full-stack Node.js applications like Property Manager. This guide will walk you through the deployment process.

## 🚀 Why Railway?

- ✅ **Full Node.js support** - Express server runs natively
- ✅ **PostgreSQL included** - Can use your existing Neon DB or Railway's PostgreSQL
- ✅ **Auto-deploy from GitHub** - Push to deploy
- ✅ **Free tier** - $5/month credit (enough for small projects)
- ✅ **Zero configuration** - Detects Node.js automatically
- ✅ **Environment variables** - Easy to manage
- ✅ **Custom domains** - Free SSL certificates

## 📋 Prerequisites

1. **GitHub account** with `property-manager` repository ✅
2. **Railway account** - Sign up at https://railway.app
3. **Neon database** - Already set up ✅
4. **Resend API key** - Already have it ✅

## 🎯 Step-by-Step Deployment

### Step 1: Sign Up for Railway

1. Go to **https://railway.app**
2. Click **"Start a New Project"** or **"Login with GitHub"**
3. **Authorize Railway** to access your GitHub account
4. You'll get **$5 free credit** per month

### Step 2: Create New Project

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose **`glodinasflexwork/property-manager`**
4. Select branch: **`feature/magic-link-auth`**
5. Click **"Deploy Now"**

Railway will automatically:
- ✅ Detect it's a Node.js project
- ✅ Install dependencies with `pnpm`
- ✅ Run the build command
- ✅ Start the server

### Step 3: Add Environment Variables

1. In your Railway project, click **"Variables"** tab
2. Click **"+ New Variable"**
3. Add each variable from `railway-env-vars.txt`:

```env
DATABASE_URL=postgresql://neondb_owner:npg_Q35JojzwHWvb@...
VITE_APP_ID=property-manager-app
VITE_APP_TITLE=Property Manager Pro
JWT_SECRET=dev-secret-change-in-production-12345
RESEND_API_KEY=re_PPZUzVTe_HCUKybDrYyb6wLy1gYL7shiM
EMAIL_FROM=onboarding@resend.dev
APP_URL=https://your-app.up.railway.app
OAUTH_SERVER_URL=https://placeholder.com
VITE_OAUTH_PORTAL_URL=https://placeholder.com
NODE_ENV=production
PORT=3000
```

4. Click **"Add"** for each variable

**Tip**: Railway will auto-redeploy when you add variables!

### Step 4: Get Your Railway URL

1. Go to **"Settings"** tab
2. Scroll to **"Domains"** section
3. Click **"Generate Domain"**
4. You'll get a URL like: `https://property-manager-production-abc123.up.railway.app`
5. **Copy this URL**

### Step 5: Update APP_URL

1. Go back to **"Variables"** tab
2. Find **`APP_URL`**
3. Click **"Edit"**
4. Replace with your actual Railway URL
5. Click **"Update"**
6. Railway will automatically redeploy

### Step 6: Wait for Deployment

1. Go to **"Deployments"** tab
2. Watch the build logs
3. Wait for **"SUCCESS"** status (usually 2-5 minutes)
4. You'll see: ✅ **"Deployment successful"**

### Step 7: Test Your Application

1. Click on your Railway URL
2. You should see the **Property Manager login page**
3. Enter your email: `angles.readier.7d@icloud.com`
4. Click **"Send magic link"**
5. Check your email
6. Click the magic link
7. You should be logged in! 🎉

## 🔧 Configuration Files

Railway uses these files (already created):

### `railway.json`
```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pnpm install && pnpm build"
  },
  "deploy": {
    "startCommand": "pnpm start"
  }
}
```

### `nixpacks.toml`
```toml
[phases.setup]
nixPkgs = ["nodejs-20_x", "pnpm"]

[phases.install]
cmds = ["pnpm install --frozen-lockfile"]

[phases.build]
cmds = ["pnpm build"]

[start]
cmd = "pnpm start"
```

## 📊 Monitoring

### View Logs

1. Go to **"Deployments"** tab
2. Click on the latest deployment
3. Click **"View Logs"**
4. You'll see real-time server logs

### Check Metrics

1. Go to **"Metrics"** tab
2. View:
   - CPU usage
   - Memory usage
   - Network traffic
   - Response times

## 🔐 Security Best Practices

### Before Production

1. **Generate new JWT_SECRET**:
   ```bash
   openssl rand -base64 32
   ```
   Update in Railway Variables

2. **Verify domain in Resend**:
   - Go to https://resend.com/domains
   - Add your domain
   - Update `EMAIL_FROM` to `noreply@yourdomain.com`

3. **Use strong database password**:
   - Your Neon database already has a secure password ✅

4. **Enable Railway's security features**:
   - Go to Settings → Security
   - Enable "Private Networking" (optional)

## 💰 Pricing

### Free Tier
- **$5 credit/month** (auto-renews)
- Enough for:
  - Small projects
  - Development/testing
  - Low traffic apps

### Usage-Based Pricing
- **$0.000463/GB-hour** for memory
- **$0.000231/vCPU-hour** for CPU
- **$0.10/GB** for bandwidth

**Estimate for Property Manager**:
- ~$3-5/month for low traffic
- ~$10-15/month for moderate traffic

## 🆘 Troubleshooting

### Build Fails

**Error**: `pnpm: command not found`
- **Solution**: Railway should auto-detect pnpm from `package.json`
- If not, add to `nixpacks.toml`: `nixPkgs = ["nodejs-20_x", "pnpm"]`

**Error**: `Module not found`
- **Solution**: Check `package.json` dependencies
- Run `pnpm install` locally to verify

### Deployment Succeeds but App Doesn't Load

**Error**: `Application failed to respond`
- **Solution**: Check that `PORT` environment variable is set
- Railway provides `PORT` automatically, but we default to 3000

**Error**: `Database connection failed`
- **Solution**: Verify `DATABASE_URL` is correct
- Test connection: `psql $DATABASE_URL`

### Magic Link Not Working

**Error**: `Failed to send email`
- **Solution**: Check `RESEND_API_KEY` is correct
- Verify you're sending to `angles.readier.7d@icloud.com` (verified email)

**Error**: `Invalid magic link`
- **Solution**: Check `APP_URL` matches your Railway URL
- Ensure `JWT_SECRET` is set

## 🔄 Auto-Deploy from GitHub

Railway automatically deploys when you push to GitHub:

1. Make changes locally
2. Commit and push:
   ```bash
   git add .
   git commit -m "feat: new feature"
   git push origin feature/magic-link-auth
   ```
3. Railway detects the push
4. Automatically builds and deploys
5. Takes 2-5 minutes

## 🌐 Custom Domain (Optional)

### Add Your Own Domain

1. Go to **Settings** → **Domains**
2. Click **"Custom Domain"**
3. Enter your domain: `app.yourdomain.com`
4. Add DNS records (Railway provides instructions):
   ```
   Type: CNAME
   Name: app
   Value: <your-railway-app>.up.railway.app
   ```
5. Wait for DNS propagation (5-60 minutes)
6. Railway automatically provisions SSL certificate

### Update Environment Variables

After adding custom domain:
1. Update `APP_URL` to `https://app.yourdomain.com`
2. Update `EMAIL_FROM` to `noreply@yourdomain.com` (after verifying in Resend)

## 📚 Useful Links

- **Railway Dashboard**: https://railway.app/dashboard
- **Railway Docs**: https://docs.railway.app
- **Railway Status**: https://status.railway.app
- **Railway Discord**: https://discord.gg/railway
- **Neon Dashboard**: https://console.neon.tech
- **Resend Dashboard**: https://resend.com/emails

## ✅ Deployment Checklist

- [ ] Sign up for Railway account
- [ ] Create new project from GitHub
- [ ] Select `feature/magic-link-auth` branch
- [ ] Add all environment variables
- [ ] Generate Railway domain
- [ ] Update `APP_URL` with Railway URL
- [ ] Wait for deployment to succeed
- [ ] Test login page
- [ ] Test magic link email
- [ ] Verify authentication works
- [ ] Check database connectivity
- [ ] (Optional) Add custom domain
- [ ] (Optional) Update JWT_SECRET for production
- [ ] (Optional) Verify domain in Resend

## 🎉 Success Indicators

Your deployment is successful when:

✅ Build completes without errors  
✅ Deployment status shows "SUCCESS"  
✅ Railway URL loads the login page  
✅ Magic link email is sent  
✅ Magic link redirects and logs you in  
✅ Dashboard loads after login  
✅ Database queries work  
✅ All features function correctly  

## 🚀 Next Steps After Deployment

1. **Test thoroughly** - Try all features
2. **Monitor logs** - Watch for errors
3. **Set up monitoring** - Use Railway metrics
4. **Add custom domain** - Professional URL
5. **Verify Resend domain** - Production email sending
6. **Update JWT_SECRET** - Generate secure secret
7. **Share with users** - Send Railway URL
8. **Merge to main** - After testing (optional)

---

**Created**: November 15, 2024  
**Last Updated**: November 15, 2024  
**Status**: Ready for Deployment  
**Deployment Platform**: Railway  
**Estimated Time**: 15-30 minutes
