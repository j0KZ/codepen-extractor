import { Router } from 'express';
import type { ExtractRequest, ExtractResponse } from '../../../shared/types/index.js';
import { isValidCodePenUrl } from '../utils/helpers.js';
import { ValidationError } from '../utils/errors.js';
import { extractAndSave } from '../services/scraper/codepen.js';
import { rateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

const extractRateLimiter = rateLimiter({
  windowMs: 3600000,
  maxRequests: 50,
});

router.post('/', extractRateLimiter, async (req, res, next) => {
  try {
    const { url } = req.body as ExtractRequest;

    if (!url || typeof url !== 'string') {
      throw new ValidationError('INVALID_URL', 'URL de CodePen invalida');
    }

    if (!isValidCodePenUrl(url)) {
      throw new ValidationError('INVALID_URL', 'URL de CodePen invalida');
    }

    const project = await extractAndSave(url);

    const response: ExtractResponse = {
      success: true,
      project,
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
