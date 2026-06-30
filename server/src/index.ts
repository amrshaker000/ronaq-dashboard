import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { env, validateEnv } from './config/env.js';
import { logger } from './config/logger.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import apiRouter from './routes/index.js';

// Validate required environment variables
try {
  validateEnv();
} catch (error: any) {
  logger.error(error.message);
  logger.warn('تنبيه: لم يتم تعيين كافة متغيرات البيئة بشكل صحيح. يرجى ملء ملف .env');
  // Exit in production, allow dummy values or fallback in development for build/test processes
  // if (env.isProduction) {
  //   process.exit(1);
  // }
}

const app = express();

// Security headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  })
);

// Compression
app.use(compression());

// Parse JSON bodies
app.use(express.json());

// Request ID tracing
app.use(requestIdMiddleware);

// Basic request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(
      {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        requestId: (req as any).requestId,
      },
      `${req.method} ${req.originalUrl} - ${res.statusCode} in ${duration}ms`
    );
  });
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // limit each IP to 300 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'كثير من الطلبات من هذا الجهاز، يرجى المحاولة لاحقاً.',
    data: null,
  },
});
app.use('/api/', limiter);

// API v1 Routes
app.use('/api/v1', apiRouter);

// Root path fallback
app.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'مرحباً بك في واجهة برمجة تطبيقات لوحة قيادة رونق (Ronaq Dashboard API)',
    version: '1.0.0',
  });
});

// Handle 404
app.use(notFoundHandler);

// Handle errors
app.use(errorHandler);

// Start server only if not running in Vercel Serverless environment
if (process.env.VERCEL !== '1') {
  app.listen(env.port, () => {
    logger.info(`الخادم يعمل بنجاح على المنفذ http://localhost:${env.port} في بيئة ${env.nodeEnv}`);
  });
}

export default app;
