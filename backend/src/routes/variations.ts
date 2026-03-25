import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import path from 'node:path';
import {
  assertProjectExists,
  listVariations,
  getVariation,
  saveVariation,
  deleteVariation,
  setPreferredVariation,
} from '../services/storage/variations.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';

const PROJECT_ID_RE = /^pen_[a-f0-9]{8}$/;
const VARIATION_ID_RE = /^pen_[a-f0-9]{8}_v\d+$/;

function getProjectsDir(): string {
  return path.resolve(process.cwd(), process.env['PROJECTS_DIR'] || 'proyectos');
}

function validateProjectId(id: string): void {
  if (!PROJECT_ID_RE.test(id)) {
    throw new ValidationError('INVALID_ID_FORMAT', `Invalid project ID format: ${id}`);
  }
}

function validateVariationId(id: string): void {
  if (!VARIATION_ID_RE.test(id)) {
    throw new ValidationError('INVALID_ID_FORMAT', `Invalid variation ID format: ${id}`);
  }
}

type ProjectParams = { id: string };
type VariationParams = { id: string; variationId: string };

const router = Router();

// GET /:id/variations
router.get('/:id/variations', async (req: Request<ProjectParams>, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    validateProjectId(id);

    const projectsDir = getProjectsDir();
    await assertProjectExists(projectsDir, id);

    const variations = await listVariations(projectsDir, id);
    res.json({ variations });
  } catch (err) {
    next(err);
  }
});

// GET /:id/variations/:variationId
router.get('/:id/variations/:variationId', async (req: Request<VariationParams>, res: Response, next: NextFunction) => {
  try {
    const { id, variationId } = req.params;
    validateProjectId(id);
    validateVariationId(variationId);

    const projectsDir = getProjectsDir();
    await assertProjectExists(projectsDir, id);

    const variation = await getVariation(projectsDir, id, variationId);
    if (!variation) {
      throw new NotFoundError('VARIATION_NOT_FOUND', `Variation ${variationId} not found`);
    }

    res.json({ variation });
  } catch (err) {
    next(err);
  }
});

// POST /:id/variations
router.post('/:id/variations', async (req: Request<ProjectParams>, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    validateProjectId(id);

    const { name, description, code, isPreferred } = req.body;

    if (!name || typeof name !== 'string') {
      throw new ValidationError('VALIDATION_ERROR', 'Field "name" is required and must be a string');
    }

    if (!code || typeof code !== 'object' || !code.html || typeof code.html !== 'string') {
      throw new ValidationError('VALIDATION_ERROR', 'Field "code.html" is required and must be a string');
    }

    const projectsDir = getProjectsDir();
    await assertProjectExists(projectsDir, id);

    const variationId = await saveVariation(projectsDir, id, {
      name,
      description,
      code: {
        html: code.html,
        css: code.css,
        js: code.js,
      },
      isPreferred,
    });

    res.status(201).json({ id: variationId });
  } catch (err) {
    next(err);
  }
});

// DELETE /:id/variations/:variationId
router.delete('/:id/variations/:variationId', async (req: Request<VariationParams>, res: Response, next: NextFunction) => {
  try {
    const { id, variationId } = req.params;
    validateProjectId(id);
    validateVariationId(variationId);

    const projectsDir = getProjectsDir();
    const success = await deleteVariation(projectsDir, id, variationId);
    res.json({ success });
  } catch (err) {
    next(err);
  }
});

// POST /:id/variations/:variationId/prefer
router.post('/:id/variations/:variationId/prefer', async (req: Request<VariationParams>, res: Response, next: NextFunction) => {
  try {
    const { id, variationId } = req.params;
    validateProjectId(id);
    validateVariationId(variationId);

    const projectsDir = getProjectsDir();
    await assertProjectExists(projectsDir, id);
    await setPreferredVariation(projectsDir, id, variationId);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export { router as variationsRouter };
