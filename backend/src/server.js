import 'dotenv/config';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { adminRouter, appErrorHandler, authRouter, publicRouter } from './routes.js';

const required = ['MONGODB_URI', 'JWT_SECRET', 'CLIENT_ORIGIN'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(', ')}`);

const app = express();
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true, methods: ['GET', 'POST', 'PUT', 'DELETE'], allowedHeaders: ['Content-Type', process.env.CSRF_HEADER_NAME || 'x-bdelog-csrf'] }));
app.use(express.json({ limit: '250kb' }));
app.use(cookieParser());

const publicLimit = rateLimit({ windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 900000), limit: Number(process.env.RATE_LIMIT_MAX || 120), standardHeaders: 'draft-8', legacyHeaders: false, message: { message: 'Too many submissions from this network. Please wait and try again.' } });
const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false, message: { message: 'Too many sign-in attempts. Please wait before trying again.' } });

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'bdelog-api' }));
app.use('/api/public', publicLimit, publicRouter);
app.use('/api/auth/login', loginLimit);
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use(appErrorHandler);

const port = Number(process.env.PORT || 5000);
mongoose.connect(process.env.MONGODB_URI).then(() => app.listen(port, () => console.log(`BDELog API listening on ${port}`))).catch((error) => { console.error('MongoDB connection failed:', error); process.exit(1); });
