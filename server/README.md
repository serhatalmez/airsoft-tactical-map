# Socket.IO Server Deployment

## Railway Deployment (Recommended)

### Quick Setup:
1. Go to [railway.app](https://railway.app)
2. Sign in with GitHub
3. Create new project
4. Deploy from GitHub repository
5. Set root directory to `/server`

### Environment Variables:
```
CORS_ORIGIN=https://your-next-app.vercel.app
PORT=3001
NODE_ENV=production
```

## Render Deployment

### Steps:
1. Go to [render.com](https://render.com)
2. Create new Web Service
3. Connect GitHub repository
4. Set build command: `cd server && npm install && npm run build`
5. Set start command: `cd server && npm start`
6. Set environment variables

## Fly.io Deployment

### Commands:
```bash
# Install Fly CLI
# Then in /server directory:
fly launch
fly deploy
```

## Local Testing:
```bash
cd server
npm install
npm run dev
```
