# 🚀 Deployment Guide: Airsoft Tactical Map

## Free Deployment Options

### 1. **Vercel (Recommended)** ⭐
**Best for:** Next.js apps, zero configuration, excellent performance
**Limits:** 100GB bandwidth/month, 6000 build minutes/month

#### Quick Deploy Steps:
1. **GitHub Setup:**
   ```bash
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/airsoft-tactical-map.git
   git push -u origin main
   ```

2. **Deploy to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Sign in with GitHub
   - Click "New Project"
   - Import your GitHub repository
   - Add environment variables (see Environment Setup below)
   - Deploy!

3. **Your app will be live at:** `https://your-app-name.vercel.app`

---

### 2. **Netlify** 
**Best for:** Simple deployment, great for static sites
**Limits:** 300 build minutes/month, 100GB bandwidth/month

#### Steps:
1. Build the app: `npm run build`
2. Deploy the `out` folder to Netlify
3. Configure environment variables in Netlify dashboard

---

### 3. **Railway** 🚂
**Best for:** Full-stack apps with databases
**Limits:** $5/month credit (enough for small projects)

#### Steps:
1. Install Railway CLI: `npm install -g @railway/cli`
2. Login: `railway login`
3. Deploy: `railway up`

---

### 4. **Render**
**Best for:** Free tier with automatic deploys
**Limits:** 750 hours/month, sleeps after 15min inactivity

#### Steps:
1. Connect GitHub repo to Render
2. Set build command: `npm run build`
3. Set start command: `npm start`

---

## Environment Setup

### Required Environment Variables:
```env
# Supabase (get these from supabase.com dashboard)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# App URL (update after deployment)
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
```

### Setting Up Supabase (Free Database):
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Go to Settings > API
4. Copy your URL and keys
5. Run the SQL schema from `api/database/schema.sql`
6. Disable email confirmation in Auth settings for testing

---

## Pre-Deployment Checklist

### ✅ Code Preparation:
- [ ] All environment variables are in `.env.example`
- [ ] Build works locally: `npm run build`
- [ ] No TypeScript errors: `npm run type-check`
- [ ] Git repository is clean

### ✅ Database Setup:
- [ ] Supabase project created
- [ ] Database schema applied
- [ ] RLS policies configured
- [ ] Auth settings configured

### ✅ Environment Variables:
- [ ] All required variables identified
- [ ] Production URLs updated
- [ ] API keys secured

---

## Testing Your Deployment

### 1. **Functionality Test:**
- [ ] Homepage loads
- [ ] Registration works
- [ ] Login works
- [ ] Room creation works
- [ ] Room joining works
- [ ] Map loads properly

### 2. **Performance Test:**
- [ ] Page load speed < 3 seconds
- [ ] Map rendering works on mobile
- [ ] WebSocket connections stable

---

## Troubleshooting

### Common Issues:

1. **"Module not found" errors:**
   - Check all import paths are correct
   - Ensure all dependencies are in `package.json`

2. **Environment variables not working:**
   - Verify variable names (must start with `NEXT_PUBLIC_` for client-side)
   - Check deployment platform environment settings

3. **Database connection fails:**
   - Verify Supabase URL and keys
   - Check if your domain is added to Supabase allowed origins

4. **Map not loading:**
   - Leaflet CSS might not be loading
   - Check browser console for errors

---

## Domain Setup (Optional)

### Free Custom Domains:
- **Freenom:** .tk, .ml, .ga domains
- **GitHub Pages:** username.github.io subdomain
- **Vercel:** Custom domain support

---

## Scaling Considerations

When your app grows:
- **Database:** Supabase Pro ($25/month)
- **Hosting:** Vercel Pro ($20/month)
- **CDN:** Cloudflare (free tier available)
- **Analytics:** Vercel Analytics (free tier)

---

## Security Checklist

- [ ] Environment variables secure
- [ ] API routes protected
- [ ] RLS policies active in database
- [ ] HTTPS enabled (automatic on most platforms)
- [ ] CORS configured properly

---

## Quick Deploy Commands

```bash
# 1. Prepare for deployment
npm run build
npm run type-check

# 2. Git setup
git add .
git commit -m "Ready for deployment"
git push

# 3. Deploy to Vercel (easiest)
npx vercel

# 3. Or deploy to Netlify
npm run build
# Then drag 'out' folder to netlify.com/drop
```

---

**🎯 Recommended Path:** Start with Vercel for the easiest deployment experience!
