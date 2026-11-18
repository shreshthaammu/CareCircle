import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { apiLimiter } from './middleware/rateLimiters.js';
import { errorHandler } from './middleware/errorHandler.js';
import { verifyCsrf } from './middleware/auth.middleware.js';
import { verifyFirestoreConnection } from './repositories/firestore.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import medicationsRoutes from './routes/medications.routes.js';
import appointmentsRoutes from './routes/appointments.routes.js';
import suggestionsRoutes from './routes/suggestions.routes.js';
import circlesRoutes from './routes/circles.routes.js';
import aiRoutes from './routes/ai.routes.js';
import actionTokenRoutes from './routes/actionToken.routes.js';
import internalRoutes from './routes/internal.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

app.set('trust proxy', 1);

// Security headers with Content Security Policy compatible with iframe preview
app.use(
  helmet({
    frameguard: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'", '*'],
        frameAncestors: ["'self'", 'https://aistudio.google.com', 'https://*.google.com', 'https://*.googleusercontent.com'],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply CSRF validation for state changes
app.use(verifyCsrf);

// Health check endpoint
app.get('/healthz', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'CareCircle Platform',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

app.get('/readyz', async (req, res, next) => {
  try {
    await verifyFirestoreConnection();
    res.status(200).json({ status: 'ready' });
  } catch (error) {
    next(error);
  }
});

// Mount API routes with rate limiting
app.use('/api', apiLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/medications', medicationsRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/suggestions', suggestionsRoutes);
app.use('/api/circles', circlesRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/action-token', actionTokenRoutes);
app.use('/api/internal', internalRoutes);

// In production, serve the built React frontend
const clientDistPath = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDistPath, { maxAge: '1d' }));

// Handle SPA client-side routing fallback
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path === '/healthz') {
    return next();
  }
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) {
      // In dev mode when client isn't built yet
      res.status(200).send('CareCircle API is running. Start the client dev server or build the frontend.');
    }
  });
});

// Centralized error handler
app.use(errorHandler);
