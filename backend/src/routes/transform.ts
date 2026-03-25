import { Router, type Request, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { isValidProjectId, projectExists } from '../utils/projectExists.js';
import { processTransformJob } from '../services/transform/transformHandler.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';

const transformRouter = Router();

transformRouter.post('/:id', (req: Request, res: Response) => {
  const projectId = req.params.id as string;

  if (!isValidProjectId(projectId)) {
    throw new ValidationError('INVALID_REQUEST', `ID de proyecto inválido: ${projectId}`);
  }

  const { message } = req.body as { message?: unknown };

  if (!message || typeof message !== 'string' || message.trim() === '') {
    throw new ValidationError('INVALID_REQUEST', "El campo 'message' es requerido y debe ser un string no vacío");
  }

  if (!projectExists(projectId)) {
    throw new NotFoundError('PROJECT_NOT_FOUND', `Proyecto '${projectId}' no encontrado`);
  }

  const conversationId = `conv_${uuidv4().slice(0, 8)}`;

  processTransformJob(projectId, conversationId, message);

  res.status(202).json({
    success: true,
    conversationId,
    status: 'processing',
    message: 'La transformación se está procesando',
  });
});

export default transformRouter;
