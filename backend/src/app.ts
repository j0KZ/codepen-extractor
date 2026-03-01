import express from 'express';
import cors from 'cors';
import healthRouter from './routes/health.js';
import extractRouter from './routes/extract.js';
import projectsRouter from './routes/projects.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/health', healthRouter);
app.use('/api/extract', extractRouter);
app.use('/api/projects', projectsRouter);

app.use(errorHandler);

export default app;
