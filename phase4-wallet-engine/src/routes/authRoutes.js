import { Router } from 'express';
import { login, register } from '../controllers/authController.js';
import { requireFields, validateEmailField } from '../middleware/validate.js';

const router = Router();

router.post('/register', requireFields(['email', 'password']), validateEmailField('email'), register);
router.post('/login', requireFields(['email', 'password']), validateEmailField('email'), login);

export default router;
