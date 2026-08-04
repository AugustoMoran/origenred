import express from 'express';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import csurf from 'csurf';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import morgan from 'morgan';
import path from 'path';
import { ensureListingsIndex, isMeilisearchEnabled } from './modules/marketplace/services/meilisearchService';
import { registerMarketplaceChatSocket } from './socket/marketplaceChatSocket';

dotenv.config();

const app = express();
// Socket.IO will be dynamically imported inside start() to avoid TS server errors when
// @types/* are not yet installed in the editor environment.

const parseAllowedOrigins = () => {
  const raw = process.env.CORS_ALLOWED_ORIGINS || process.env.FRONTEND_URL || '';
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const allowedOrigins = parseAllowedOrigins();

const normalizeOrigin = (value: string) => {
  try {
    return new URL(value).origin.toLowerCase();
  } catch {
    return value.trim().toLowerCase().replace(/\/+$/, '');
  }
};

const isAllowedOrigin = (origin?: string) => {
  if (!origin) return true;
  if (!allowedOrigins.length) return true;

  const normalizedOrigin = normalizeOrigin(origin);
  let originUrl: URL | null = null;
  try {
    originUrl = new URL(normalizedOrigin);
  } catch {
    originUrl = null;
  }

  if (process.env.NODE_ENV !== 'production' && originUrl) {
    if (originUrl.hostname === 'localhost' || originUrl.hostname === '127.0.0.1') {
      return true;
    }
  }

  return allowedOrigins.some((allowed) => {
    const normalizedAllowed = normalizeOrigin(allowed);

    if (normalizedAllowed.startsWith('*.') && originUrl) {
      const domain = normalizedAllowed.slice(1); // ".vercel.app"
      return originUrl.hostname.endsWith(domain);
    }

    const protocolWildcardMatch = normalizedAllowed.match(/^(https?):\/\/\*\.(.+)$/);
    if (protocolWildcardMatch && originUrl) {
      const [, protocol, domain] = protocolWildcardMatch;
      return originUrl.protocol === `${protocol}:` && originUrl.hostname.endsWith(`.${domain}`);
    }

    return normalizedOrigin === normalizedAllowed;
  });
};

app.use(helmet({
  crossOriginResourcePolicy: false,
}));
app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use(limiter);

// CSRF disabled for development/troubleshooting
// if (process.env.NODE_ENV !== 'test') {
//   app.use(csurf({ cookie: { httpOnly: true, sameSite: 'strict' } }));
// }

// Health check (used by Render / uptime monitors)
app.get('/health', (_req, res) => {
  const mongoOk = mongoose.connection.readyState === 1;
  const body = {
    ok: mongoOk,
    mongo: mongoOk ? 'connected' : 'disconnected',
    meilisearch: isMeilisearchEnabled(),
    uptime: Math.floor(process.uptime()),
    version: process.env.npm_package_version || '0.1.0',
  };
  res.status(mongoOk ? 200 : 503).json(body);
});

// mount modules
import authRoutes from './modules/auth/routes/authRoutes';
import inventoryRoutes from './modules/inventory/routes/inventoryRoutes';
import salesRoutes from './modules/sales/routes/salesRoutes';
import branchRoutes from './modules/branches/routes/branchRoutes';
import stockRoutes from './modules/stock/routes/stockRoutes';
import categoryRoutes from './modules/categories/routes/categoryRoutes';
import supplierRoutes from './modules/suppliers/routes/supplierRoutes';
import expenseRoutes from './modules/expenses/routes/expenseRoutes';
import supplierLedgerRoutes from './modules/supplierLedger/routes/supplierLedgerRoutes';
import afipRoutes from './modules/afip/routes/afipRoutes';
import settingsRoutes from './modules/settings/routes/settingsRoutes';
import ecommerceRoutes from './modules/ecommerce/routes/ecommerceRoutes';
import analyticsRoutes from './modules/analytics/routes/analyticsRoutes';
import paymentsRoutes from './modules/payments/routes/paymentsRoutes';
import shippingRoutes from './modules/shipping/routes/shippingRoutes';
import marketplaceRoutes from './modules/marketplace/routes/marketplaceRoutes';

app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/supplier-ledger', supplierLedgerRoutes);
app.use('/api/afip', afipRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/ecommerce', ecommerceRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/marketplace', marketplaceRoutes);

// Error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error('SERVER ERROR:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// io will be initialized when server starts
let io: any = null;

const PORT = process.env.PORT || 4000;

export async function start() {
  try {
    const mongo = process.env.MONGO_URI || 'mongodb://localhost:27017/origenred';
    await mongoose.connect(mongo);

    if (isMeilisearchEnabled()) {
      try {
        await ensureListingsIndex();
        console.log('Meilisearch listings index ready');
      } catch (meiliErr: any) {
        console.warn('Meilisearch index setup failed:', meiliErr?.message || meiliErr);
      }
    } else {
      console.log('Meilisearch disabled (set MEILISEARCH_HOST + MEILISEARCH_API_KEY to enable)');
    }

    const server = app.listen(PORT, () => console.log(`Server listening ${PORT}`));

    // Initialize Socket.IO
    const { Server } = await import('socket.io');
    io = new Server(server, {
      cors: {
        origin: (origin, callback) => {
          if (isAllowedOrigin(origin)) {
            callback(null, true);
            return;
          }
          callback(new Error('Socket origin not allowed by CORS'));
        },
        credentials: true,
      },
    });

    // Initialize AFIP Workers only when explicitly enabled
    if (process.env.ENABLE_AFIP_QUEUE === 'true') {
      try {
        await import('./config/queues');
        console.log('AFIP Billing Worker initialized');
      } catch (queueErr: any) {
        console.warn('AFIP Billing Worker disabled (Redis unavailable):', queueErr?.message || queueErr);
      }
    } else {
      console.log('AFIP Billing Worker disabled (set ENABLE_AFIP_QUEUE=true to enable)');
    }

    registerMarketplaceChatSocket(io);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

export { app, io };
