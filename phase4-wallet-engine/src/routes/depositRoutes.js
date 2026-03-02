import { Router } from 'express';
import { createDepositRequest, getUserDeposits } from '../controllers/depositController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireFields } from '../middleware/validate.js';

const router = Router();

router.post('/deposit/request', requireAuth, requireFields(['amount']), createDepositRequest);
router.get('/user/deposits', requireAuth, getUserDeposits);

export default router;
