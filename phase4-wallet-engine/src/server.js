import dotenv from 'dotenv';
import app from './app.js';
import { connectDatabase } from './config/db.js';
import './models/index.js';

dotenv.config();

const PORT = Number(process.env.PORT || 3001);

const start = async () => {
  try {
    await connectDatabase();
    app.listen(PORT, () => {
      console.log(`Phase 4 Wallet Engine running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

start();
