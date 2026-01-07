// ==========================================
// MONITORING & LOGGING SETUP
// ==========================================

// 1. Install dependencies:
// npm install winston winston-daily-rotate-file @sentry/node express-status-monitor

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import * as Sentry from '@sentry/node';
import statusMonitor from 'express-status-monitor';
// import { nodeProfilingIntegration } from '@sentry/profiling-node';

// ==========================================
// WINSTON LOGGER CONFIGURATION
// ==========================================

const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(logColors);

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// JSON format for files
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  levels: logLevels,
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: fileFormat,
  transports: [
    // Error logs (only errors)
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true
    }),

    // Combined logs (all levels)
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true
    }),

    // HTTP request logs
    new DailyRotateFile({
      filename: 'logs/http-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'http',
      maxSize: '20m',
      maxFiles: '7d',
      zippedArchive: true
    })
  ]
});

// Console output in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// ==========================================
// SENTRY ERROR TRACKING
// ==========================================

// Initialize Sentry (get DSN from sentry.io)
Sentry.init({
  dsn: process.env.SENTRY_DSN || '',
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Ignore common non-critical errors
  ignoreErrors: [
    'ECONNRESET',
    'ENOTFOUND',
    'ETIMEDOUT'
  ],

  // Attach user context
  beforeSend(event, hint) {
    // Don't send events in development unless explicitly enabled
    if (process.env.NODE_ENV !== 'production' && !process.env.SENTRY_DEV_ENABLED) {
      return null;
    }
    return event;
  }
});

// ==========================================
// EXPRESS MIDDLEWARE
// ==========================================

export function setupMonitoring(app) {
  
  // 1. Sentry request handler (must be first)
//   app.use(Sentry.Handlers.requestHandler());
//   app.use(Sentry.Handlers.tracingHandler());
Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1.0,
});

 // Request instrumentation
  app.use(Sentry.requestHandler);

  // 2. Server status monitor dashboard
  app.use(statusMonitor({
    title: 'AfroJamz API Status',
    path: '/status',
    spans: [
      { interval: 1, retention: 60 },      // Last minute
      { interval: 5, retention: 60 },      // Last 5 minutes
      { interval: 15, retention: 60 }      // Last 15 minutes
    ],
    chartVisibility: {
      cpu: true,
      mem: true,
      load: true,
      responseTime: true,
      rps: true,
      statusCodes: true
    }
  }));

  // 3. Custom request logging middleware
  app.use((req, res, next) => {
    const start = Date.now();
    
    // Log request
    logger.http(`${req.method} ${req.url}`, {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    // Log response when finished
    res.on('finish', () => {
      const duration = Date.now() - start;
      
      logger.http(`${req.method} ${req.url} ${res.statusCode} ${duration}ms`, {
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip
      });

      // Track slow requests
      if (duration > 1000) {
        logger.warn(`Slow request detected: ${req.method} ${req.url} took ${duration}ms`);
      }
    });

    next();
  });

  // 4. Sentry error handler (must be after routes)
  // Add this AFTER all your routes
  app.use(Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
      // Capture all errors with status >= 400
      return true;
    }
  }));

  logger.info('✅ Monitoring middleware initialized');
}

// ==========================================
// CUSTOM ERROR HANDLER
// ==========================================

export function setupErrorHandler(app) {
  // Catch-all error handler
  app.use((err, req, res, next) => {
    // Log the error
    logger.error(`Error: ${err.message}`, {
      error: err.message,
      stack: err.stack,
      method: req.method,
      url: req.url,
      ip: req.ip,
      userId: req.user?.id
    });

    // Send to Sentry
    Sentry.captureException(err, {
      user: req.user ? {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role
      } : undefined,
      tags: {
        method: req.method,
        url: req.url
      }
    });

    // Send response
    const statusCode = err.statusCode || 500;
    
    res.status(statusCode).json({
      error: process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : err.message,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
  });

  logger.info('✅ Error handler initialized');
}

// ==========================================
// BUSINESS METRICS TRACKING
// ==========================================

export const metrics = {
  // Track purchase events
  trackPurchase: (purchaseData) => {
    logger.info('Purchase completed', {
      event: 'purchase',
      purchase_id: purchaseData.purchase_id,
      beat_id: purchaseData.beat_id,
      buyer_id: purchaseData.buyer_id,
      amount: purchaseData.price,
      license: purchaseData.license_name
    });
  },

  // Track withdrawal events
  trackWithdrawal: (withdrawalData) => {
    logger.info('Withdrawal processed', {
      event: 'withdrawal',
      withdrawal_id: withdrawalData.id,
      producer_id: withdrawalData.producer_id,
      amount: withdrawalData.amount,
      status: withdrawalData.status
    });
  },

  // Track dispute events
  trackDispute: (disputeData) => {
    logger.warn('Purchase disputed', {
      event: 'dispute',
      purchase_id: disputeData.purchase_id,
      buyer_id: disputeData.buyer_id,
      reason: disputeData.reason
    });
  },

  // Track beat uploads
  trackBeatUpload: (beatData) => {
    logger.info('Beat uploaded', {
      event: 'beat_upload',
      beat_id: beatData.id,
      producer_id: beatData.producer_id,
      title: beatData.title,
      genre: beatData.genre
    });
  },

  // Track user registrations
  trackRegistration: (userData) => {
    logger.info('User registered', {
      event: 'registration',
      user_id: userData.id,
      role: userData.role,
      auth_provider: userData.auth_provider
    });
  },

  // Track authentication
  trackLogin: (userId, role) => {
    logger.info('User logged in', {
      event: 'login',
      user_id: userId,
      role: role
    });
  }
};

// ==========================================
// HEALTH CHECK ENDPOINT
// ==========================================

export function setupHealthCheck(app, db) {
  app.get('/health', (req, res) => {
    // Check database connection
    db.get('SELECT 1', [], (err) => {
      if (err) {
        logger.error('Health check failed: Database error', { error: err.message });
        return res.status(503).json({
          status: 'unhealthy',
          database: 'disconnected',
          timestamp: new Date().toISOString()
        });
      }

      res.status(200).json({
        status: 'healthy',
        database: 'connected',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
      });
    });
  });

  logger.info('✅ Health check endpoint initialized at /health');
}

// ==========================================
// GRACEFUL SHUTDOWN
// ==========================================

export function setupGracefulShutdown(server, db) {
  const shutdown = (signal) => {
    logger.info(`${signal} received. Starting graceful shutdown...`);

    // Stop accepting new connections
    server.close(() => {
      logger.info('HTTP server closed');

      // Close database connection
      db.close((err) => {
        if (err) {
          logger.error('Error closing database', { error: err.message });
          process.exit(1);
        } else {
          logger.info('Database connection closed');
          
          // Flush Sentry
          Sentry.close(2000).then(() => {
            logger.info('Sentry flushed');
            process.exit(0);
          });
        }
      });
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  logger.info('✅ Graceful shutdown handlers registered');
}

// ==========================================
// EXPORT LOGGER
// ==========================================

export { logger };