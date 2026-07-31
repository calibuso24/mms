import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'mms',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'mms123',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },
  reporting: {
    serviceUrl: process.env.REPORT_SERVICE_URL || null,
    serviceBaseUrl: process.env.REPORT_SERVICE_BASE_URL || 'http://localhost:8085',
    renderPath: process.env.REPORT_SERVICE_RENDER_PATH || '/reports/render',
    timeoutMs: parseInt(process.env.REPORT_SERVICE_TIMEOUT_MS || '120000', 10),
  },
};
