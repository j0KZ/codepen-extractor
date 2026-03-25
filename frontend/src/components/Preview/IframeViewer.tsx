import { useState, useCallback, useEffect } from 'react';
import type { ProjectCode } from '../../../../shared/types';
import './IframeViewer.css';

interface IframeViewerProps extends ProjectCode {
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
  const safeJs = js.replace(/<\/script/gi, '<\\/script');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:;"><style>${css}</style></head><body>${html}<script>${safeJs}<\/script></body></html>`;
}

export function IframeViewer({ html, css = '', js = '', title }: IframeViewerProps) {
  const [size, setSize] = useState<SizePreset>('desktop');
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const srcdoc = buildSrcdoc(html, css, js);

  useEffect(() => {
    setLoading(true);
  }, [srcdoc]);

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
              type="button"
              key={preset}
              className={`iframe-viewer__size-btn${size === preset ? ' iframe-viewer__size-btn--active' : ''}`}
              onClick={() => setSize(preset)}
              aria-label={`Tamaño ${SIZE_LABELS[preset]}`}
            >
              {SIZE_LABELS[preset]}
            </button>
          ))}

          <button
            type="button"
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
