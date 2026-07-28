import express, { Request, Response } from 'express';
import cors, { CorsOptions } from 'cors';
import { config } from './config/env.js';
import { testConnection } from './config/database.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { authMiddleware } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import accountRoutes from './routes/account.js';
import productRoutes from './routes/product.js';
import navigationRoutes from './routes/navigation.js';

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/accounts', authMiddleware, accountRoutes);
app.use('/api/navigation', authMiddleware, navigationRoutes);
app.use('/api', authMiddleware, productRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
async function start() {
  try {
    await testConnection();
    app.listen(config.port, () => {
      console.log(`MMS Backend server running on port ${config.port}`);
      console.log(`Environment: ${config.nodeEnv}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
