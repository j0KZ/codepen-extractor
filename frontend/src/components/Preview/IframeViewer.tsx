import { useState, useCallback } from 'react';
import './IframeViewer.css';

interface IframeViewerProps {
  html: string;
  css: string;
  js: string;
  title?: string;
}

type SizePreset = 'desktop' | 'tablet' | 'mobile';

const SIZE_WIDTHS: Record<SizePreset, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
};

const SIZE_LABELS: Record<SizePreset, string> = {
  desktop: 'Desktop',
  tablet: 'Tablet',
  mobile: 'Mobile',
};

function buildSrcdoc(html: string, css: string, js: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${html}<script>${js}<\/script></body></html>`;
}

export function IframeViewer({ html, css, js, title }: IframeViewerProps) {
  const [size, setSize] = useState<SizePreset>('desktop');
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const srcdoc = buildSrcdoc(html, css, js);

  const handleRefresh = useCallback(() => {
    setLoading(true);
    setRefreshKey((k) => k + 1);
  }, []);

  const handleLoad = useCallback(() => {
    setLoading(false);
  }, []);

  return (
    <div className="iframe-viewer">
      <div className="iframe-viewer__toolbar">
        <span className="iframe-viewer__title">{title ?? 'Preview'}</span>

        <div className="iframe-viewer__controls">
          {(Object.keys(SIZE_WIDTHS) as SizePreset[]).map((preset) => (
            <button
              key={preset}
              className={`iframe-viewer__size-btn${size === preset ? ' iframe-viewer__size-btn--active' : ''}`}
              onClick={() => setSize(preset)}
              aria-label={`Tamaño ${SIZE_LABELS[preset]}`}
            >
              {SIZE_LABELS[preset]}
            </button>
          ))}

          <button
            className="iframe-viewer__refresh-btn"
            onClick={handleRefresh}
            aria-label="Recargar preview"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="iframe-viewer__container">
        {loading && <div className="iframe-viewer__loading">Cargando preview...</div>}
        <iframe
          key={refreshKey}
          className="iframe-viewer__frame"
          srcDoc={srcdoc}
          sandbox="allow-scripts"
          title={title ?? 'Preview'}
          style={{ maxWidth: SIZE_WIDTHS[size] }}
          onLoad={handleLoad}
        />
      </div>
    </div>
  );
}
