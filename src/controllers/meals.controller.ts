import { Request, Response } from 'express';
import { prisma } from '../prisma';

export async function meals(
  req: Request,
  res: Response,
) {
  const meals = await prisma.meal.findMany({
    where: {
      userId: req.userId,
    },

    include: {
      foods: {
        include: {
          food: true,
        },
      },
    },

    orderBy: {
      createdAt: 'desc',
    },
  });

  const result = meals.map((meal) => {
    const totals = meal.foods.reduce(
      (acc, item) => {
        const factor = item.foodG / 100;

        acc.grams += item.foodG;

        acc.calories +=
          item.food.caloriesPer100g *
          factor;

        acc.carbs +=
          item.food.carbsPer100g *
          factor;

        acc.proteins +=
          item.food.proteinPer100g *
          factor;

        acc.fats +=
          item.food.fatPer100g *
          factor;

        return acc;
      },
      {
        grams: 0,
        calories: 0,
        carbs: 0,
        proteins: 0,
        fats: 0,
      },
    );

    return {
      id: meal.id,
      name: meal.description,
      type: meal.type,
      createdAt: meal.createdAt,
      eatTime: meal.eatTime,

      totals,

      items: meal.foods,
    };
  });

  return res.json(result);
}

export async function createMeal(
  req: Request,
  res: Response,
) {
  const userId = req.userId!;

  const {
    type,
    eatTime,
    description,
    items,
  } = req.body;
  if (!eatTime || isNaN(new Date(eatTime).getTime())) {
  return res.status(400).json({
    error: 'Informe uma data e horário válidos para a refeição.',
  });
}

  const meal = await prisma.$transaction(
    async (tx) => {
      // Busca os alimentos envolvidos
      const foods = await tx.food.findMany({
        where: {
          id: {
            in: items.map(
              (i: { foodId: number }) =>
                i.foodId,
            ),
          },

          userId,
        },
      });

      if (foods.length !== items.length) {
        throw new Error(
          'Alimento não encontrado',
        );
      }

      // Cria a refeição
      const meal = await tx.meal.create({
        data: {
          type,
          eatTime: new Date(eatTime),
          description,
          userId,
        },
      });

      // Cria MealFood
      await tx.mealFood.createMany({
        data: items.map(
          (
            item: {
              foodId: number;
              grams: number;
            },
          ) => {
            const food = foods.find(
              (f) => f.id === item.foodId,
            )!;

            return {
              mealId: meal.id,

              foodId: food.id,

              foodG: item.grams,

              calories:
                (food.caloriesPer100g *
                  item.grams) /
                100,

              carbs:
                (food.carbsPer100g *
                  item.grams) /
                100,

              protein:
                (food.proteinPer100g *
                  item.grams) /
                100,

              fat:
                (food.fatPer100g *
                  item.grams) /
                100,
            };
          },
        ),
      });

      return meal;
    },
  );

  return res.status(201).json(meal);
}
export async function deleteMeal(
  req: Request,
  res: Response,
) {
  const mealId = Number(req.params.id);
  const userId = req.userId!;

  if (!Number.isInteger(mealId) || mealId <= 0) {
    return res.status(400).json({
      error: 'ID de refeição inválido.',
    });
  }

  const deleted = await prisma.$transaction(async (tx) => {
    const meal = await tx.meal.findFirst({
      where: {
        id: mealId,
        userId,
      },
    });

    if (!meal) {
      return false;
    }

    await tx.mealFood.deleteMany({
      where: {
        mealId,
      },
    });

    await tx.meal.delete({
      where: {
        id: mealId,
      },
    });

    return true;
  });

  if (!deleted) {
    return res.status(404).json({
      error: 'Refeição não encontrada.',
    });
  }

  return res.status(200).json({
    message: 'Refeição excluída com sucesso.',
  });
}

export async function updateMeal(
  req: Request,
  res: Response,
) {
  const mealId = Number(req.params.id);
  const userId = req.userId!;

  const { type, eatTime, description, items } = req.body;

  if (!Number.isInteger(mealId) || mealId <= 0) {
    return res.status(400).json({
      error: 'ID de refeição inválido.',
    });
  }

  if (
    !type ||
    !eatTime ||
    isNaN(new Date(eatTime).getTime()) ||
    !Array.isArray(items) ||
    items.length === 0
  ) {
    return res.status(400).json({
      error: 'Informe os dados da refeição corretamente.',
    });
  }

  const validItems = items.every(
    (item: { foodId: number; grams: number }) =>
      Number.isInteger(item.foodId) &&
      item.foodId > 0 &&
      Number.isFinite(item.grams) &&
      item.grams > 0,
  );

  if (!validItems) {
    return res.status(400).json({
      error: 'Verifique os alimentos e suas quantidades.',
    });
  }

  const foodIds = items.map(
    (item: { foodId: number }) => item.foodId,
  );

  if (new Set(foodIds).size !== foodIds.length) {
    return res.status(400).json({
      error: 'Não repita o mesmo alimento na refeição.',
    });
  }

  const result = await prisma.$transaction(async (tx) => {
    const existingMeal = await tx.meal.findFirst({
      where: {
        id: mealId,
        userId,
      },
    });

    if (!existingMeal) {
      return { notFound: true };
    }

    const foods = await tx.food.findMany({
      where: {
        id: { in: foodIds },
        userId,
      },
    });

    if (foods.length !== foodIds.length) {
      return { invalidFoods: true };
    }

    const updatedMeal = await tx.meal.update({
      where: { id: mealId },
      data: {
        type,
        eatTime: new Date(eatTime),
        description,
      },
    });

    await tx.mealFood.deleteMany({
      where: { mealId },
    });

    await tx.mealFood.createMany({
      data: items.map(
        (item: { foodId: number; grams: number }) => {
          const food = foods.find(
            (f) => f.id === item.foodId,
          )!;

          return {
            mealId,
            foodId: food.id,
            foodG: item.grams,
            calories:
              (food.caloriesPer100g * item.grams) / 100,
            carbs:
              (food.carbsPer100g * item.grams) / 100,
            protein:
              (food.proteinPer100g * item.grams) / 100,
            fat:
              (food.fatPer100g * item.grams) / 100,
          };
        },
      ),
    });

    return { updatedMeal };
  });

  if ('notFound' in result) {
    return res.status(404).json({
      error: 'Refeição não encontrada.',
    });
  }

  if ('invalidFoods' in result) {
    return res.status(400).json({
      error: 'Um ou mais alimentos não foram encontrados.',
    });
  }

  return res.status(200).json({
    message: 'Refeição atualizada com sucesso.',
    meal: result.updatedMeal,
  });
}

