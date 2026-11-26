import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { prisma } from '../prisma';
import { Prisma } from '@prisma/client';

export const foodRouter = Router();

//foods/
foodRouter.get('/', requireAuth, async (req, res) => {
  const search = String(req.query.search ?? '');
  const foods = await prisma.food.findMany({
    where: {
      userId: req.userId!,
      name: {
        contains: search,
      }
    },
    take: 10,
    orderBy: {
      name: 'asc',
    },
  });

  return res.json(foods);
});


foodRouter.post('/', requireAuth, async (req, res) => {
  const {
    name,
    caloriesPer100g,
    carbsPer100g,
    proteinPer100g,
    fatPer100g,
  } = req.body;

  if (req.userId === undefined) {
    return res.sendStatus(401);
  }

  if (
  typeof name !== 'string' ||
  !name.trim() ||
  typeof caloriesPer100g !== 'number' ||
  !Number.isFinite(caloriesPer100g) ||
  caloriesPer100g < 0 ||
  typeof carbsPer100g !== 'number' ||
  !Number.isFinite(carbsPer100g) ||
  carbsPer100g < 0 ||
  typeof proteinPer100g !== 'number' ||
  !Number.isFinite(proteinPer100g) ||
  proteinPer100g < 0 ||
  typeof fatPer100g !== 'number' ||
  !Number.isFinite(fatPer100g) ||
  fatPer100g < 0
) {
    return res.status(400).json({
      error: 'Informe um nome e valores nutricionais válidos. Os valores não podem ser negativos.',
    });
  }

  const food = await prisma.food.create({
    data: {
      name: name.trim(),
      caloriesPer100g,
      carbsPer100g,
      proteinPer100g,
      fatPer100g,
      userId: req.userId,
    },
  });

  return res.status(201).json(food);
});

foodRouter.put('/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);

  const {
    name,
    caloriesPer100g,
    carbsPer100g,
    proteinPer100g,
    fatPer100g,
  } = req.body;

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      error: 'ID do alimento inválido.',
    });
  }

  if (
    typeof name !== 'string' ||
    !name.trim() ||
    ![caloriesPer100g, carbsPer100g, proteinPer100g, fatPer100g]
      .every(value => typeof value === 'number' && Number.isFinite(value) && value >= 0)
  ) {
    return res.status(400).json({
      error: 'Informe dados nutricionais válidos.',
    });
  }

  const updated = await prisma.food.updateMany({
    where: {
      id,
      userId: req.userId!,
    },
    data: {
      name: name.trim(),
      caloriesPer100g,
      carbsPer100g,
      proteinPer100g,
      fatPer100g,
    },
  });

  if (updated.count === 0) {
    return res.status(404).json({
      error: 'Alimento não encontrado.',
    });
  }

  const food = await prisma.food.findFirst({
    where: {
      id,
      userId: req.userId!,
    },
  });

  return res.json(food);
});


foodRouter.delete('/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      error: 'ID do alimento inválido.',
    });
  }

  try {
    const deleted = await prisma.food.deleteMany({
      where: {
        id,
        userId: req.userId!,
      },
    });

    if (deleted.count === 0) {
      return res.status(404).json({
        error: 'Alimento não encontrado.',
      });
    }

    return res.status(204).send();
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2003'
    ) {
      return res.status(409).json({
        error: 'Este alimento está vinculado a refeições e não pode ser excluído.',
      });
    }

    console.error('Erro ao excluir alimento:', error);

    return res.status(500).json({
      error: 'Não foi possível excluir o alimento.',
    });
  }
});