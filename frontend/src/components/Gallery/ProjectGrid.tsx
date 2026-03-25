import { useState, useMemo } from 'react';
import type { ProjectSummary } from '../../../../shared/types/index.js';
import { ProjectCard } from './ProjectCard.js';
import './ProjectGrid.css';

interface ProjectGridProps {
  projects: ProjectSummary[];
  loading: boolean;
  onProjectClick: (project: ProjectSummary) => void;
}

const SKELETON_COUNT = 6;

function SkeletonCard() {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <div className="skeleton-card__thumbnail" />
      <div className="skeleton-card__body">
        <div className="skeleton-card__line skeleton-card__line--title" />
        <div className="skeleton-card__line skeleton-card__line--subtitle" />
      </div>
      <div className="skeleton-card__footer">
        <div className="skeleton-card__line skeleton-card__line--badge" />
        <div className="skeleton-card__line skeleton-card__line--date" />
      </div>
    </div>
  );
}

export function ProjectGrid({ projects, loading, onProjectClick }: ProjectGridProps) {
  const [search, setSearch] = useState('');
  // TODO: agregar filtro por preprocessor cuando ProjectSummary incluya ese campo

  const filtered = useMemo(() => {
    let result = projects;

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (p) => p.name.toLowerCase().includes(q) || p.author.toLowerCase().includes(q)
      );
    }

    return result;
  }, [projects, search]);

  if (loading) {
    return (
      <div>
        <div className="project-grid__toolbar">
          <input
            className="project-grid__search"
            type="text"
            placeholder="Buscar por nombre o autor..."
            disabled
          />
        </div>
        <div className="project-grid__skeleton" data-testid="skeleton">
          {Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="project-grid__empty">
        <p className="project-grid__empty-title">No hay proyectos extraidos</p>
        <p className="project-grid__empty-text">
          Extrae tu primer CodePen usando el panel de arriba.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* TODO: agregar filtro por fecha (issue #10 - descoped para iteración futura) */}
      <div className="project-grid__toolbar">
        <input
          className="project-grid__search"
          type="text"
          placeholder="Buscar por nombre o autor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Buscar proyectos"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="project-grid__empty">
          <p className="project-grid__empty-title">Sin resultados</p>
          <p className="project-grid__empty-text">
            No se encontraron proyectos que coincidan con tu busqueda.
          </p>
        </div>
      ) : (
        <div className="project-grid__grid">
          {filtered.map((project) => (
            <ProjectCard key={project.id} project={project} onClick={onProjectClick} />
          ))}
        </div>
      )}
    </div>
  );
}
