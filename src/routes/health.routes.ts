import { Router } from 'express';
import {
  getHealthData,
  createHealthData,
  createWeightLog,
  getWeightLogs,
} from '../controllers/health.controller';
import { requireAuth } from '../middlewares/auth.middleware';

export const healthRoutes = Router();

healthRoutes.get('/', requireAuth, getHealthData);
healthRoutes.post('/', requireAuth, createHealthData);

healthRoutes.post('/weight', requireAuth, createWeightLog);
healthRoutes.get('/weight', requireAuth, getWeightLogs);