import type { ProjectSummary } from '../../../../shared/types/index.js';
import './ProjectCard.css';

interface ProjectCardProps {
  project: ProjectSummary;
  onClick: (project: ProjectSummary) => void;
}

const STATUS_LABELS: Record<string, string> = {
  complete: 'Completo',
  partial: 'Parcial',
  failed: 'Fallido',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(project);
    }
  };

  return (
    <article
      className="gallery-card"
      role="article"
      tabIndex={0}
      onClick={() => onClick(project)}
      onKeyDown={handleKeyDown}
      aria-label={`Proyecto: ${project.name} por ${project.author}`}
    >
      <div className="gallery-card__thumbnail">
        <span className="gallery-card__thumbnail-icon" aria-hidden="true">
          {'</>'}
        </span>
      </div>

      <div className="gallery-card__body">
        <h3 className="gallery-card__name">{project.name}</h3>
        <p className="gallery-card__author">por {project.author}</p>
      </div>

      <div className="gallery-card__footer">
        <span className={`gallery-card__status gallery-card__status--${project.status}`}>
          {STATUS_LABELS[project.status] ?? project.status}
        </span>
        <time className="gallery-card__date" dateTime={project.extractedAt}>
          {formatDate(project.extractedAt)}
        </time>
      </div>
    </article>
  );
}
