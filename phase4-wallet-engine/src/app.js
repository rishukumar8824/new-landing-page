import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import walletRoutes from './routes/walletRoutes.js';
import depositRoutes from './routes/depositRoutes.js';
import withdrawRoutes from './routes/withdrawRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { encrypt, decrypt } from './utils/encryption.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ success: true, message: 'OK', data: {} });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

app.get('/api/test/encryption', (req, res) => {
  try {
    const text = String(req.query.text || 'test-message');
    const encrypted = encrypt(text);
    const decrypted = decrypt(encrypted);

    return res.json({
      ok: true,
      input: text,
      encrypted,
      decrypted
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: String(error?.message || 'Encryption test failed')
    });
  }
});

app.use('/api', authRoutes);
app.use('/api', walletRoutes);
app.use('/api', depositRoutes);
app.use('/api', withdrawRoutes);
app.use('/api', adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
