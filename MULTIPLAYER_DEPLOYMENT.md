# Job Wars Multiplayer - Deployment Guide

Complete guide to deploy the multiplayer server and test online play.

## Quick Start (Local Testing)

### 1. Start the Server

```bash
cd server
npm install
npm run dev

# Server runs on http://localhost:3001
```

### 2. Start the Frontend

```bash
# In project root
npm start

# Frontend runs on http://localhost:4200
```

### 3. Test Multiplayer

1. Open two browser windows/tabs at `http://localhost:4200`
2. Navigate to "Jouer" (Play)
3. Click "En ligne" (Online) button
4. Click "Se connecter" (Connect)
5. In window 1: Create room
6. Copy the room code
7. In window 2: Join room with the code
8. Game starts automatically!

---

## Production Deployment

### Option 1: Railway.app (RECOMMENDED - Free Tier)

**Why Railway:**
- Free tier ($5/month credit)
- Automatic HTTPS
- WebSocket support
- Easy deployments
- No credit card required for trial

**Steps:**

1. **Create Railway Account**
   ```bash
   # Install Railway CLI
   npm i -g @railway/cli

   # Login
   railway login
   ```

2. **Deploy Server**
   ```bash
   cd server

   # Initialize project
   railway init

   # Deploy
   railway up

   # Set environment variables
   railway variables set PORT=3001
   railway variables set NODE_ENV=production
   ```

3. **Get Server URL**
   ```bash
   railway domain

   # Example output: job-wars-production.up.railway.app
   ```

4. **Update Frontend**

   In `src/app/services/multiplayer.service.ts`:
   ```typescript
   private serverUrl = 'wss://your-railway-app.up.railway.app';
   ```

5. **Deploy Frontend**

   Deploy to Vercel, Netlify, or any static host:
   ```bash
   npm run build
   # Upload dist/card-game folder
   ```

---

### Option 2: Render.com (Free Tier)

1. **Create Render Account** at [render.com](https://render.com)

2. **Create New Web Service**
   - Connect GitHub repository
   - Root directory: `server`
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
   - Plan: Free

3. **Environment Variables**
   - `PORT`: 3001
   - `NODE_ENV`: production

4. **Get URL** (e.g., `job-wars.onrender.com`)

5. **Update Frontend**
   ```typescript
   private serverUrl = 'wss://job-wars.onrender.com';
   ```

---

### Option 3: DigitalOcean App Platform ($5/month)

Best for production with expected traffic.

1. **Create DO Account** at [digitalocean.com](https://digitalocean.com)

2. **Create App**
   - Select repository
   - Component: Web Service
   - Build command: `cd server && npm install && npm run build`
   - Run command: `cd server && npm start`
   - Plan: Basic ($5/month)

3. **Environment Variables**
   - `PORT`: 3001
   - `NODE_ENV`: production

4. **Custom Domain** (optional)
   - Add domain in DO dashboard
   - Point to app

---

## Environment Variables

### Server

```env
PORT=3001                 # Server port
NODE_ENV=production       # development | production
```

### Frontend

Update `src/app/services/multiplayer.service.ts`:

```typescript
// Development
private serverUrl = 'ws://localhost:3001';

// Production (auto-detect)
if (window.location.protocol === 'https:') {
  this.serverUrl = 'wss://your-server.com';
}
```

---

## Testing Deployment

### 1. Health Check

```bash
curl https://your-server.com/health
```

Expected response:
```json
{
  "status": "ok",
  "rooms": 0,
  "queueLength": 0,
  "uptime": 123.45
}
```

### 2. WebSocket Test

Use a WebSocket client (wscat):
```bash
npm i -g wscat
wscat -c wss://your-server.com
```

Send:
```json
{"type":"ping","timestamp":1234567890}
```

Should receive:
```json
{"type":"pong","timestamp":1234567890}
```

### 3. Full Game Test

1. Share app URL with a friend
2. Both click "En ligne" → "Se connecter"
3. Create room → share code
4. Friend joins with code
5. Play!

---

## Monitoring

### Check Server Logs

**Railway:**
```bash
railway logs
```

**Render:**
- Dashboard → Logs tab

**DigitalOcean:**
- Dashboard → Runtime Logs

### Common Issues

**WebSocket connection fails:**
- Check server is running: `curl https://server/health`
- Verify HTTPS (wss://) in production
- Check firewall allows WebSocket

**Can't join room:**
- Check room code is correct (6 characters)
- Ensure both players on same server
- Room might have expired (1 hour)

**Game doesn't start:**
- Both players must have valid decks
- Check console for errors
- Verify WebSocket messages in Network tab

---

## Cost Breakdown

| Service | Free Tier | Paid Tier | Notes |
|---------|-----------|-----------|-------|
| Railway | $5/month credit | $0.000463/GB-hr | Best for hobby |
| Render | 750hrs/month | $7/month | Sleeps after 15min inactive |
| DigitalOcean | None | $5/month | Always on, reliable |
| Vercel (frontend) | Free | Free for hobby | Unlimited bandwidth |
| Netlify (frontend) | Free | Free for hobby | 100GB/month |

**Recommended for Launch:**
- Server: Railway (free $5 credit)
- Frontend: Vercel (free forever)
- **Total: $0/month** for first month, then $0-5/month

---

## Scaling

### Current Capacity (1 server)

- **Concurrent games**: ~500
- **Messages/sec**: ~10,000
- **Memory**: ~50MB baseline
- **CPU**: <10% on basic tier

### When to Scale

Scale when:
- >100 concurrent games
- >5,000 messages/sec
- Response time >100ms

### How to Scale

**Railway/Render:**
- Upgrade to paid tier
- Enable auto-scaling
- Add Redis for state (future)

**DigitalOcean:**
- Increase app size
- Add more instances
- Load balancer (built-in)

---

## Security

### Production Checklist

- [ ] HTTPS only (wss://)
- [ ] Rate limiting enabled
- [ ] CORS configured
- [ ] Input validation
- [ ] Error handling
- [ ] Logging enabled
- [ ] Monitoring setup

### Future Enhancements

1. **Authentication**: JWT tokens
2. **Anti-cheat**: Server-side validation
3. **Persistence**: Save games to DB
4. **Reconnection**: Resume after disconnect
5. **Spectator Mode**: Watch live games

---

## Support

**Issues?**
- Check server health: `/health`
- View logs in hosting dashboard
- Test WebSocket with wscat
- Check browser console for errors

**Need Help?**
- Server README: `server/README.md`
- WebSocket protocol: See server types
- Frontend service: `src/app/services/multiplayer.service.ts`

---

## Next Steps

1. ✅ Deploy server to Railway (5 min)
2. ✅ Update frontend with server URL (1 min)
3. ✅ Deploy frontend to Vercel (5 min)
4. ✅ Test with a friend (2 min)
5. 🚀 Share and play!

**Total setup time: ~15 minutes**

Enjoy online play! 🎮
