import { Router } from 'express';
import { createWithdrawRequest, getUserWithdrawals } from '../controllers/withdrawController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireFields } from '../middleware/validate.js';

const router = Router();

router.post('/withdraw/request', requireAuth, requireFields(['amount', 'to_address']), createWithdrawRequest);
router.get('/user/withdrawals', requireAuth, getUserWithdrawals);

export default router;
