import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { ProjectWithCode } from '../../../shared/types/index.js';
import { IframeViewer } from '../components/Preview/IframeViewer.js';
import { getProject } from '../services/api.js';
import axios from 'axios';
import './ProjectDetail.css';

type CodeTab = 'html' | 'css' | 'js';

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectWithCode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<CodeTab>('html');

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    setError(null);
    setNotFound(false);

    getProject(id)
      .then((data) => setProject(data.project))
      .catch((err) => {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          setNotFound(true);
        } else {
          setError('No se pudo cargar el proyecto. Verifica que el servidor este corriendo.');
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="project-detail">
        <p className="loading-text">Cargando proyecto...</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="project-detail">
        <button type="button" className="project-detail__back-btn" onClick={() => navigate('/')}>
          &larr; Volver
        </button>
        <div className="project-detail__error">
          <h2>Proyecto no encontrado</h2>
          <p>El proyecto con ID &quot;{id}&quot; no existe.</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="project-detail">
        <button type="button" className="project-detail__back-btn" onClick={() => navigate('/')}>
          &larr; Volver
        </button>
        <div className="project-detail__error">
          <h2>Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const tabs: { key: CodeTab; label: string; content: string }[] = [
    { key: 'html', label: 'HTML', content: project.code.html },
    { key: 'css', label: 'CSS', content: project.code.css ?? '' },
    { key: 'js', label: 'JS', content: project.code.js ?? '' },
  ];

  const activeContent = tabs.find((t) => t.key === activeTab)?.content ?? '';

  const formattedDate = new Date(project.extractedAt).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="project-detail">
      <button type="button" className="project-detail__back-btn" onClick={() => navigate('/')}>
        &larr; Volver
      </button>

      <section className="project-detail__metadata">
        <h1 className="project-detail__title">{project.name}</h1>
        <div className="project-detail__meta-grid">
          <div className="project-detail__meta-item">
            <span className="project-detail__meta-label">Autor</span>
            <span className="project-detail__meta-value">
              {project.authorUrl ? (
                <a href={project.authorUrl} target="_blank" rel="noopener noreferrer">
                  {project.author}
                </a>
              ) : (
                project.author
              )}
            </span>
          </div>
          <div className="project-detail__meta-item">
            <span className="project-detail__meta-label">Fecha de extraccion</span>
            <span className="project-detail__meta-value">{formattedDate}</span>
          </div>
          <div className="project-detail__meta-item">
            <span className="project-detail__meta-label">Estado</span>
            <span className="project-detail__meta-value">
              <span className={`status status-${project.status}`}>{project.status}</span>
            </span>
          </div>
          <div className="project-detail__meta-item">
            <span className="project-detail__meta-label">Preprocessors</span>
            <span className="project-detail__meta-value">
              HTML: {project.preprocessors.html} / CSS: {project.preprocessors.css} / JS: {project.preprocessors.js}
            </span>
          </div>
          <div className="project-detail__meta-item">
            <span className="project-detail__meta-label">CodePen</span>
            <span className="project-detail__meta-value">
              <a href={project.url} target="_blank" rel="noopener noreferrer">
                Ver original
              </a>
            </span>
          </div>
        </div>
      </section>

      <section className="project-detail__preview">
        <h2>Preview</h2>
        <IframeViewer
          html={project.code.html}
          css={project.code.css}
          js={project.code.js}
          title={project.name}
        />
      </section>

      <section className="project-detail__code-section">
        <h2>Codigo</h2>
        <div className="project-detail__tabs">
          {tabs.map((tab) => (
            <button
              type="button"
              key={tab.key}
              className={`project-detail__tab${activeTab === tab.key ? ' project-detail__tab--active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <pre className="project-detail__code-block">
          <code>{activeContent || '(vacio)'}</code>
        </pre>
      </section>
    </div>
  );
}
