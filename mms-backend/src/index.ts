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
import roleRoutes from './routes/roles.js';
import partyRoutes from './routes/party.js';
import materialControlRoutes from './routes/materialControl.js';
import materialRequestRoutes from './routes/materialRequest.js';
import purchaseOrderRoutes from './routes/purchaseOrder.js';
import deliveryAdviceRoutes from './routes/deliveryAdvice.js';
import supplierDeliveryRoutes from './routes/supplierDelivery.js';
import stockTransferRoutes from './routes/stockTransfer.js';
import materialAdjustmentRoutes from './routes/materialAdjustment.js';
import reportRoutes from './routes/report.js';
import systemSettingsRoutes from './routes/systemSettings.js';
import dashboardRoutes from './routes/dashboard.js';

const app = express();

const configuredCorsOrigins = config.cors.origin
  .split(',')
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

const defaultDevCorsOrigins = ['http://localhost:3000', 'http://localhost:5173'];
const allowedCorsOrigins = Array.from(new Set([...configuredCorsOrigins, ...defaultDevCorsOrigins]));

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (curl, server-to-server) without Origin header.
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedCorsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Middleware
// Increase JSON body size to support large branding payloads (images as data URLs)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors(corsOptions));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/accounts', authMiddleware, accountRoutes);
app.use('/api/roles', authMiddleware, roleRoutes);
app.use('/api/navigation', authMiddleware, navigationRoutes);
app.use('/api/reports', authMiddleware, reportRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);
// Mount system settings without the global auth middleware so individual routes
// (including the public branding endpoint) can opt-in to authentication via
// route-level middleware. This allows unauthenticated pages (like login) to
// fetch branding without receiving a 401 from a global middleware.
app.use('/api/system-settings', systemSettingsRoutes);
app.use('/api/material-controls', authMiddleware, materialControlRoutes);
app.use('/api/material-requests', authMiddleware, materialRequestRoutes);
app.use('/api/purchase-orders', authMiddleware, purchaseOrderRoutes);
app.use('/api/delivery-advices', authMiddleware, deliveryAdviceRoutes);
app.use('/api/supplier-deliveries', authMiddleware, supplierDeliveryRoutes);
app.use('/api/stock-transfers', authMiddleware, stockTransferRoutes);
app.use('/api/material-adjustments', authMiddleware, materialAdjustmentRoutes);
app.use('/api', authMiddleware, productRoutes);
app.use('/api', authMiddleware, partyRoutes);

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
