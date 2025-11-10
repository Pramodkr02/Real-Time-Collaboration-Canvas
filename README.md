# Collaborative Canvas

Real-time multi-user collaborative drawing app built with React (Vite) and Node.js + Socket.io. No drawing libraries; uses HTML5 Canvas.

## Features
- Brush and eraser tools
- Stroke size slider and color picker
- Live remote cursors
- Global undo/redo and clear
- Room support via URL `?room=your-room`
- Touch support
- Rejoin restores canvas from server memory
- Save canvas as PNG
- Latency indicator

## Quick Start (Recommended)
```bash
# Install dependencies for both client and server
npm run install-all

# Start both servers simultaneously
npm run dev
```

## Manual Installation
```bash
# Install server dependencies
cd server && npm install

# Install client dependencies  
cd ../client && npm install
```

## Manual Run (Alternative)
```bash
# In one terminal - start server
cd server
npm run dev

# In another terminal - start client
cd client
npm run dev
```

Open http://localhost:5173. Optionally add `?room=abc123`.

## Multi-user testing
- Open two browser tabs at http://localhost:5173
- Use two different usernames and the same `?room` value
- Draw in one tab; the other updates in real-time

## Deployment

### Backend Deployment (Node.js + Socket.io)

#### Option 1: Render
1. Create a new Web Service on [Render](https://render.com)
2. Connect your GitHub repository
3. Set environment variables:
   - `PORT=3001`
   - `NODE_ENV=production`
4. Deploy from the `server` directory

#### Option 2: Heroku
```bash
cd server
heroku create your-app-name
heroku config:set PORT=3001
heroku config:set NODE_ENV=production
git push heroku main
```

#### Option 3: Railway/Fly.io
1. Connect your repository
2. Set the root directory to `server`
3. Configure environment variables as needed

### Frontend Deployment (Vite + React)

#### Option 1: Vercel
1. Connect your repository to [Vercel](https://vercel.com)
2. Set the root directory to `client`
3. Add environment variable: `VITE_SERVER_URL=https://your-backend-url.com`
4. Deploy

#### Option 2: Netlify
1. Connect your repository to [Netlify](https://netlify.com)
2. Set the base directory to `client`
3. Add environment variable: `VITE_SERVER_URL=https://your-backend-url.com`
4. Deploy

### Example Configuration
- Deploy server on Render as `https://your-api.onrender.com`
- In Vercel project settings, set `VITE_SERVER_URL=https://your-api.onrender.com`

## Troubleshooting

### Common Issues

#### 1. Socket Connection Issues
- **Problem**: "Connection failed" or "Socket not connected"
- **Solution**: 
  - Check if server is running on port 3001
  - Verify CORS settings in `server/server.js`
  - Ensure firewall allows WebSocket connections
  - Check browser console for detailed error messages

#### 2. Canvas Not Drawing
- **Problem**: Drawing doesn't appear or sync
- **Solution**:
  - Refresh the page
  - Check if both users are in the same room (`?room=abc123`)
  - Verify socket connection status (green dot in header)
  - Clear browser cache and cookies

#### 3. Deployment Issues
- **Problem**: Frontend can't connect to backend
- **Solution**:
  - Verify `VITE_SERVER_URL` environment variable is set correctly
  - Check CORS settings allow your frontend domain
  - Ensure backend is accessible via HTTPS (required for production)
  - Test backend health endpoint: `https://your-api.com/health`

#### 4. Performance Issues
- **Problem**: Lag or slow drawing
- **Solution**:
  - Reduce number of concurrent users per room
  - Check network latency (shown in toolbar)
  - Use wired connection instead of WiFi
  - Close unnecessary browser tabs

### Environment Variables

#### Client (.env file)
```
VITE_SERVER_URL=http://localhost:3001  # Development
# VITE_SERVER_URL=https://your-api.com  # Production
```

#### Server (environment variables)
```
PORT=3001
NODE_ENV=development  # or production
```

### Health Check
To verify your deployment is working:
1. Backend: `curl https://your-api.com/health` should return `OK`
2. Frontend: Open browser console and check for connection status
3. WebSocket: Test with multiple tabs in the same room

## Known bugs / limitations
- In-memory room state; restart loses canvases
- Simple global history (no per-user undo)
- Large rooms could benefit from compression and diffing

## Time spent
- Architecture and implementation: ~4-5 hours

## Evaluation Checklist
- Technical Implementation: Canvas efficiency, socket architecture
- Real-time Performance: Smooth, low-latency sync
- Undo/Redo: Global and consistent
- Code Quality: Clean React & Node
- Documentation: This README + ARCHITECTURE
- Advanced Features: Rooms, touch, PNG save, latency indicator
