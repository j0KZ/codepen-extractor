import { useState, useEffect } from 'react';
import type { ProjectSummary } from '../../../../shared/types/index.js';
import { useExtraction } from '../../hooks/useExtraction.js';

interface ExtractorPanelProps {
  onExtractComplete: (project: ProjectSummary) => void;
}

export function ExtractorPanel({ onExtractComplete }: ExtractorPanelProps) {
  const [url, setUrl] = useState('');
  const { status, result, error, extract, reset } = useExtraction();

  const isLoading = status === 'validating' || status === 'extracting';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || isLoading) return;

    await extract(url.trim());
  };

  useEffect(() => {
    if (result && status === 'success') {
      onExtractComplete(result);
      reset();
      setUrl('');
    }
  }, [result, status, onExtractComplete, reset]);

  return (
    <div className="extractor-panel">
      <h2>Extraer CodePen</h2>
      <form onSubmit={handleSubmit} className="extractor-form">
        <div className="input-group">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://codepen.io/usuario/pen/id"
            disabled={isLoading}
            className="url-input"
          />
          <button
            type="submit"
            disabled={isLoading || !url.trim()}
            className="extract-btn"
          >
            {isLoading ? 'Extrayendo...' : 'Extraer'}
          </button>
        </div>
      </form>

      {status === 'extracting' && (
        <div className="status-message status-extracting">
          Extrayendo codigo del Pen...
        </div>
      )}

      {status === 'error' && error && (
        <div className="status-message status-error">
          {error}
        </div>
      )}
    </div>
  );
}
