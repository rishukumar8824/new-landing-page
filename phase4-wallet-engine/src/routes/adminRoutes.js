import { Router } from 'express';
import {
  approveDeposit,
  approveWithdraw,
  getDeposits,
  getWithdrawals
} from '../controllers/adminController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import { requireFields } from '../middleware/validate.js';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/admin/deposits', getDeposits);
router.post('/admin/approve-deposit', requireFields(['deposit_id', 'action']), approveDeposit);
router.get('/admin/withdrawals', getWithdrawals);
router.post('/admin/approve-withdraw', requireFields(['withdrawal_id', 'action']), approveWithdraw);

export default router;
