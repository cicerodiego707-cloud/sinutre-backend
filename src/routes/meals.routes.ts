import { Router } from 'express';
import {
  createMeal,
  meals,
  deleteMeal,
  updateMeal,
} from '../controllers/meals.controller';
import { requireAuth } from '../middlewares/auth.middleware';

export const mealsRoutes = Router();

mealsRoutes.post('/', requireAuth, createMeal);
mealsRoutes.get('/', requireAuth, meals);
mealsRoutes.delete('/:id', requireAuth, deleteMeal);
mealsRoutes.put('/:id', requireAuth, updateMeal);