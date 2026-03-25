import { Router } from 'express';
import type { GetProjectsResponse, GetProjectResponse } from '../../../shared/types/index.js';
import { readIndex } from '../services/storage/projectsIndex.js';
import { readProjectFiles, projectDirExists } from '../services/storage/fileManager.js';
import { NotFoundError, ApiError, ValidationError } from '../utils/errors.js';

const PROJECT_ID_REGEX = /^pen_[a-f0-9]{8}$/;

function validateProjectId(id: string): void {
  if (!PROJECT_ID_REGEX.test(id)) {
    throw new ValidationError('INVALID_PROJECT_ID', 'ID de proyecto invalido');
  }
}

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const index = await readIndex();
    const response: GetProjectsResponse = {
      projects: index.projects,
      total: index.projects.length,
    };
    res.json(response);
  } catch (error) {
    next(
      new ApiError('INDEX_CORRUPTED', 500, 'Indice de proyectos corrupto', {
        originalError: error instanceof Error ? error.message : String(error),
      })
    );
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    validateProjectId(id);

    const index = await readIndex();
    const projectSummary = index.projects.find((p) => p.id === id);

    if (!projectSummary) {
      throw new NotFoundError('PROJECT_NOT_FOUND', 'Proyecto no encontrado');
    }

    if (!projectDirExists(id)) {
      throw new ApiError('FILES_NOT_FOUND', 500, 'Archivos de codigo no encontrados');
    }

    const { code, metadata } = await readProjectFiles(id);

    const response: GetProjectResponse = {
      project: {
        ...projectSummary,
        code,
        dependencies: metadata.dependencies,
        preprocessors: metadata.preprocessors,
      },
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
