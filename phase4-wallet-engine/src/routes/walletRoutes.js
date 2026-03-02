import { Router } from 'express';
import { getWallet, getWalletTransactions } from '../controllers/walletController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/wallet', requireAuth, getWallet);
router.get('/wallet/transactions', requireAuth, getWalletTransactions);

export default router;
