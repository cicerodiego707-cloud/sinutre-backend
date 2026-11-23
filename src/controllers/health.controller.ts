import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { LEVEL_CHOICES } from '../constants/enums';
export async function getHealthData(
  req: Request,
  res: Response,
) {
  const userId = req.userId!;

  const healthData = await prisma.healthData.findFirst({
    where: {
      userId,
      isActive: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return res.json(healthData);
}
export async function createHealthData(
  req: Request,
  res: Response,
) {
  const userId = req.userId!;

  const { targetDietDaily, levelActivity } = req.body;

  // Validar a meta de calorias
  if (
    !Number.isInteger(targetDietDaily) ||
    targetDietDaily < 500 ||
    targetDietDaily > 10000
  ) {
    return res.status(400).json({
      error: 'A meta deve ser um número inteiro entre 500 e 10000 calorias.',
    });
  }

  // Validar o nível de atividade
  if (!LEVEL_CHOICES.includes(levelActivity)) {
    return res.status(400).json({
      error: 'Nível de atividade física inválido.',
    });
  }

  // Encerrar a meta anterior, se existir, e cadastrar a nova
  const healthData = await prisma.$transaction(async (tx) => {
    await tx.healthData.updateMany({
      where: {
        userId,
        isActive: true,
      },
      data: {
        isActive: false,
        closedAt: new Date(),
      },
    });

    return tx.healthData.create({
      data: {
        targetDietDaily,
        levelActivity,
        userId,
      },
    });
  });

  return res.status(201).json(healthData);
}
export async function createWeightLog(
  req: Request,
  res: Response,
) {
  const userId = req.userId!;

  const { height, weight } = req.body;

  // Validar altura
  if (
    typeof height !== 'number' ||
    !Number.isFinite(height) ||
    height < 0.5 ||
    height > 2.5
  ) {
    return res.status(400).json({
      error: 'Informe uma altura válida em metros.',
    });
  }

  // Validar peso
  if (
    typeof weight !== 'number' ||
    !Number.isFinite(weight) ||
    weight < 20 ||
    weight > 500
  ) {
    return res.status(400).json({
      error: 'Informe um peso válido em quilogramas.',
    });
  }

  const weightLog = await prisma.weightLog.create({
    data: {
      height,
      weight,
      userId,
    },
  });

  return res.status(201).json(weightLog);
}
export async function getWeightLogs(
  req: Request,
  res: Response,
) {
  const userId = req.userId!;

  const weightLogs = await prisma.weightLog.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return res.json(weightLogs);
}