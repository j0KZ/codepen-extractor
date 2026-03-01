import app from './app.js';
import { env } from './config/env.js';
import { ensureProjectsDir } from './services/storage/fileManager.js';
import { ensureIndexExists } from './services/storage/projectsIndex.js';

ensureProjectsDir();
ensureIndexExists();

app.listen(env.PORT, () => {
  console.log(`Backend running on http://localhost:${env.PORT}`);
  console.log(`Projects directory: ${env.PROJECTS_DIR}`);
});
