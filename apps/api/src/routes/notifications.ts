import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as notificationController from '../controllers/notificationController';

const router = Router();

router.use(authenticate);

router.get('/', notificationController.getNotifications);
router.put('/read', notificationController.markAsRead);

export default router;
