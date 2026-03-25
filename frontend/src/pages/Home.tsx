import { useState, useEffect, useCallback } from 'react';
import type { ProjectSummary } from '../../../shared/types/index.js';
import { ExtractorPanel } from '../components/Extractor/ExtractorPanel.js';
import { getProjects } from '../services/api.js';

export function Home() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setError(null);
    try {
      const data = await getProjects();
      setProjects(data.projects);
    } catch (err) {
      console.error('Error al cargar proyectos:', err);
      setError('No se pudieron cargar los proyectos. Verifica que el servidor esté corriendo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleExtractComplete = (project: ProjectSummary) => {
    setProjects((prev) => [project, ...prev.filter((p) => p.id !== project.id)]);
  };

  return (
    <div className="home">
      <ExtractorPanel onExtractComplete={handleExtractComplete} />

      <section className="projects-section">
        <h2>Proyectos Extraidos</h2>
        {error ? (
          <p className="status-message status-error">{error}</p>
        ) : loading ? (
          <p className="loading-text">Cargando proyectos...</p>
        ) : projects.length === 0 ? (
          <p className="empty-text">No hay proyectos. Extrae tu primer CodePen.</p>
        ) : (
          <ul className="projects-list">
            {projects.map((project) => (
              <li key={project.id} className="project-card">
                <div className="project-info">
                  <h3>{project.name}</h3>
                  <p className="project-author">por {project.author}</p>
                  <p className="project-url">
                    <a href={project.url} target="_blank" rel="noopener noreferrer">
                      {project.url}
                    </a>
                  </p>
                </div>
                <div className="project-meta">
                  <span className={`status status-${project.status}`}>
                    {project.status}
                  </span>
                  <span className="date">
                    {new Date(project.extractedAt).toLocaleDateString('es')}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
