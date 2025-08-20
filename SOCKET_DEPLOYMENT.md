# 🚀 Socket.IO Server Deployment Guide

## Railway Deployment (Easiest)

### One-Click Deploy:
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/YourTemplate)

### Manual Deploy:
1. **Go to [railway.app](https://railway.app)**
2. **Sign in with GitHub**
3. **Create New Project**
4. **Deploy from GitHub Repo**
5. **Configure:**
   - **Root Directory**: `/server`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Port**: `3001`

### Environment Variables to Set:
```env
CORS_ORIGIN=https://your-vercel-app.vercel.app
NODE_ENV=production
PORT=3001
```

### Your Socket Server URL will be:
`https://your-app-name.railway.app`

---

## Alternative: Render Deployment

### Steps:
1. **Go to [render.com](https://render.com)**
2. **Create new Web Service**
3. **Connect GitHub repository**
4. **Set:**
   - **Root Directory**: `server`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Port**: `3001`

### Environment Variables:
```env
CORS_ORIGIN=https://your-vercel-app.vercel.app
NODE_ENV=production
```

---

## Update Your Next.js App

After deploying, update your environment variables in Vercel:

1. **Go to Vercel Dashboard**
2. **Select your project**
3. **Go to Settings > Environment Variables**
4. **Add:**
   ```
   NEXT_PUBLIC_SOCKET_URL=wss://your-socket-server.railway.app
   ```

---

## Testing Your Deployment

### Health Check:
Visit: `https://your-socket-server.railway.app/health`

### WebSocket Test:
```javascript
const socket = io('https://your-socket-server.railway.app');
socket.on('connect', () => console.log('Connected!'));
```

---

## Local Development

```bash
cd server
npm install
npm run dev
```

The server runs on http://localhost:3001

---

## Troubleshooting

### Common Issues:
1. **CORS errors**: Make sure CORS_ORIGIN matches your Next.js app URL
2. **Connection fails**: Check if the WebSocket URL is correct
3. **Build fails**: Ensure all dependencies are in package.json

### Logs:
- **Railway**: Check logs in Railway dashboard
- **Render**: Check logs in Render dashboard

---

## Quick Commands

```bash
# Test locally
cd server && npm run dev

# Check health
curl https://your-socket-server.railway.app/health

# Deploy to Railway
# Just push to GitHub - auto-deploys!
```
