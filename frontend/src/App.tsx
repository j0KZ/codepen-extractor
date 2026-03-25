import { useState } from 'react';
import { CodeEditor } from './components/Transformation/CodeEditor';
import type { CodeBlock } from './types';

const sampleCode: CodeBlock = {
  html: '<div class="container">\n  <h1>Hello World</h1>\n  <p>Sample content</p>\n</div>',
  css: '.container {\n  max-width: 800px;\n  margin: 0 auto;\n  padding: 1rem;\n}',
  js: 'document.querySelector("h1").addEventListener("click", () => {\n  console.log("clicked");\n});',
};

const originalCode: CodeBlock = {
  html: '<div class="wrapper">\n  <h1>Hello</h1>\n</div>',
  css: '.wrapper {\n  max-width: 600px;\n  margin: 0 auto;\n}',
  js: 'console.log("hello");',
};

function App() {
  const [code, setCode] = useState<CodeBlock>(sampleCode);

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>CodeEditor Dev Preview</h1>
      <h2>Editable with diff</h2>
      <CodeEditor
        code={code}
        originalCode={originalCode}
        onChange={setCode}
      />
      <h2 style={{ marginTop: '2rem' }}>Read-only</h2>
      <CodeEditor code={sampleCode} readOnly />
    </div>
  );
}

export default App;
