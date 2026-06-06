import { Router } from 'express';
import { authenticate, checkRole } from '../middleware/auth';
import * as profileController from '../controllers/profileController';
import { UserRole } from '@talentcircuit/shared-types';

const router = Router();

// All profile routes require authentication
router.use(authenticate);

router.get('/', profileController.getProfile);
router.put('/', profileController.updateProfile);
router.get('/skills', profileController.getSkills);
router.post('/skills', profileController.addSkill);
router.put('/skills/:skillId', profileController.updateSkill);
router.delete('/skills/:skillId', profileController.removeSkill);
router.post('/validate-skill', checkRole(UserRole.Manager, UserRole.HrAdmin, UserRole.SuperAdmin), profileController.validateSkill);

export default router;
