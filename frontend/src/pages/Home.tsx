import { useState, useEffect, useCallback } from 'react';
import type { ProjectSummary } from '../../../shared/types/index.js';
import { ExtractorPanel } from '../components/Extractor/ExtractorPanel.js';
import { ProjectGrid } from '../components/Gallery/ProjectGrid.js';
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

  const handleProjectClick = (project: ProjectSummary) => {
    // TODO: navigate to project detail
    console.log('Open project:', project.id);
  };

  return (
    <div className="home">
      <ExtractorPanel onExtractComplete={handleExtractComplete} />

      <section className="projects-section">
        <h2>Proyectos Extraidos</h2>
        {error ? (
          <p className="status-message status-error">{error}</p>
        ) : (
          <ProjectGrid
            projects={projects}
            loading={loading}
            onProjectClick={handleProjectClick}
          />
        )}
      </section>
    </div>
  );
}
