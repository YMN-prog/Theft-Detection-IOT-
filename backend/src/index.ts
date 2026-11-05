import 'dotenv/config';
import http from 'http';
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import telemetryRoutes from './routes/telemetry';
import eventsRoutes from './routes/events';
import controlRoutes from './routes/control';
import pushRoutes from './routes/push';
import { wsManager } from './websocket';
import { db } from './db';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

// Enable CORS for frontend Vite development server (typically port 5173 or any origin)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Request logging middleware
app.use((req: Request, _res: Response, next) => {
  if (req.path !== '/api/telemetry') { // Don't flood console with 1-sec telemetry posts
    console.log(`[HTTP] ${req.method} ${req.path}`);
  }
  next();
});

// Mount API routes
app.use('/api/telemetry', telemetryRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/system', controlRoutes);
app.use('/api/push', pushRoutes);

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ONLINE',
    timestamp: new Date().toISOString(),
    systemState: db.getSystemState()
  });
});

// Root friendly welcome
app.get('/', (_req: Request, res: Response) => {
  res.send(`
    <html>
      <body style="font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 2rem;">
        <h2>ESP32 IoT Theft Detection System API</h2>
        <p>Backend server is operational and accepting REST and WebSocket connections.</p>
        <ul>
          <li>REST API: <code>/api/system/status</code>, <code>/api/telemetry</code>, <code>/api/events</code>, <code>/api/push/vapid-public-key</code></li>
          <li>WebSocket endpoint: <code>ws://localhost:${PORT}</code></li>
        </ul>
      </body>
    </html>
  `);
});

// Create HTTP server and initialize WebSocket server on same port
const server = http.createServer(app);
wsManager.initialize(server);

server.listen(Number(PORT), HOST, () => {
  console.log('====================================================');
  console.log(`[Backend] ESP32 IoT Theft Detection System Server`);
  console.log(`[Backend] HTTP API running at: http://${HOST}:${PORT}`);
  console.log(`[Backend] WebSocket running at: ws://${HOST}:${PORT}`);
  console.log('====================================================');
});
