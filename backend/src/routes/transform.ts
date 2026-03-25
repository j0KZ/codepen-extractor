import { Router, type Request, type Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { isValidProjectId, projectExists } from "../utils/projectExists.js";
import { processTransformJob } from "../services/transform/transformHandler.js";

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export const transformRouter = Router();

transformRouter.post("/:id", (req: Request, res: Response) => {
  const projectId = req.params.id as string;

  if (!isValidProjectId(projectId)) {
    const body: ApiError = {
      error: {
        code: "INVALID_REQUEST",
        message: `ID de proyecto inválido: ${projectId}`,
      },
    };
    res.status(400).json(body);
    return;
  }

  const { message } = req.body as { message?: unknown };

  if (!message || typeof message !== "string" || message.trim() === "") {
    const body: ApiError = {
      error: {
        code: "INVALID_REQUEST",
        message: "El campo 'message' es requerido y debe ser un string no vacío",
      },
    };
    res.status(400).json(body);
    return;
  }

  if (!projectExists(projectId)) {
    const body: ApiError = {
      error: {
        code: "PROJECT_NOT_FOUND",
        message: `Proyecto '${projectId}' no encontrado`,
      },
    };
    res.status(404).json(body);
    return;
  }

  const conversationId = `conv_${uuidv4().slice(0, 8)}`;

  processTransformJob(projectId, conversationId, message);

  res.status(202).json({
    success: true,
    conversationId,
    status: "processing",
    message: "La transformación se está procesando",
  });
});
