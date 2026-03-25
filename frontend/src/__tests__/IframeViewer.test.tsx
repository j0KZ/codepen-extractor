import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IframeViewer } from '../components/Preview/IframeViewer.js';

const props = {
  html: '<h1>Hello</h1>',
  css: 'h1 { color: red; }',
  js: 'console.log("hi")',
};

describe('IframeViewer', () => {
  it('renders iframe with srcdoc containing html, css and js', () => {
    render(<IframeViewer {...props} />);

    const iframe = screen.getByTitle('Preview') as HTMLIFrameElement;
    expect(iframe).toBeInTheDocument();
    expect(iframe.getAttribute('srcdoc')).toContain(props.html);
    expect(iframe.getAttribute('srcdoc')).toContain(props.css);
    expect(iframe.getAttribute('srcdoc')).toContain(props.js);
  });

  it('has sandbox attribute set to allow-scripts only', () => {
    render(<IframeViewer {...props} />);

    const iframe = screen.getByTitle('Preview') as HTMLIFrameElement;
    expect(iframe.getAttribute('sandbox')).toBe('allow-scripts');
  });

  it('renders custom title', () => {
    render(<IframeViewer {...props} title="My Pen" />);

    const iframe = screen.getByTitle('My Pen') as HTMLIFrameElement;
    expect(iframe).toBeInTheDocument();
    expect(screen.getByText('My Pen')).toBeInTheDocument();
  });

  it('size controls change iframe max-width', () => {
    render(<IframeViewer {...props} />);

    const iframe = screen.getByTitle('Preview') as HTMLIFrameElement;

    // Default is desktop (100%)
    expect(iframe.style.maxWidth).toBe('100%');

    // Switch to tablet
    fireEvent.click(screen.getByLabelText('Tamaño Tablet'));
    expect(iframe.style.maxWidth).toBe('768px');

    // Switch to mobile
    fireEvent.click(screen.getByLabelText('Tamaño Mobile'));
    expect(iframe.style.maxWidth).toBe('375px');

    // Back to desktop
    fireEvent.click(screen.getByLabelText('Tamaño Desktop'));
    expect(iframe.style.maxWidth).toBe('100%');
  });

  it('refresh button forces iframe reload by changing key', () => {
    const { container } = render(<IframeViewer {...props} />);

    const iframeBefore = container.querySelector('iframe');
    fireEvent.click(screen.getByLabelText('Recargar preview'));
    const iframeAfter = container.querySelector('iframe');

    // After refresh, the iframe element is replaced (new key = new DOM node)
    expect(iframeBefore).not.toBe(iframeAfter);
  });

  it('shows loading state initially', () => {
    render(<IframeViewer {...props} />);

    expect(screen.getByText('Cargando preview...')).toBeInTheDocument();
  });

  it('hides loading state after iframe loads', () => {
    render(<IframeViewer {...props} />);

    const iframe = screen.getByTitle('Preview');
    fireEvent.load(iframe);

    expect(screen.queryByText('Cargando preview...')).not.toBeInTheDocument();
  });
});
