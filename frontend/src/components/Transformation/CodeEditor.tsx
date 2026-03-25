import { useState, useRef, useEffect, useCallback } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching } from '@codemirror/language';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import { MergeView } from '@codemirror/merge';
import type { CodeEditorTab, CodeEditorProps } from '../../types';
import './CodeEditor.css';

const TABS: { key: CodeEditorTab; label: string }[] = [
  { key: 'html', label: 'HTML' },
  { key: 'css', label: 'CSS' },
  { key: 'js', label: 'JS' },
];

function getLanguageExtension(tab: CodeEditorTab) {
  switch (tab) {
    case 'html': return html();
    case 'css': return css();
    case 'js': return javascript();
  }
}

function getCodeForTab(code: { html: string; css?: string; js?: string }, tab: CodeEditorTab): string {
  return code[tab] ?? '';
}

function clearElement(el: HTMLElement) {
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}

export function CodeEditor({ code, originalCode, onChange, readOnly = false, className }: CodeEditorProps) {
  const [activeTab, setActiveTab] = useState<CodeEditorTab>('html');
  const [showDiff, setShowDiff] = useState(false);
  const editorContainer = useRef<HTMLDivElement>(null);
  const editorView = useRef<EditorView | null>(null);
  const mergeView = useRef<MergeView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const codeRef = useRef(code);
  codeRef.current = code;

  const destroyEditors = useCallback(() => {
    if (mergeView.current) {
      mergeView.current.destroy();
      mergeView.current = null;
    }
    if (editorView.current) {
      editorView.current.destroy();
      editorView.current = null;
    }
  }, []);

  useEffect(() => {
    if (!editorContainer.current) return;
    destroyEditors();
    clearElement(editorContainer.current);

    const currentCode = getCodeForTab(code, activeTab);
    const langExt = getLanguageExtension(activeTab);

    const sharedExtensions = [
      langExt,
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      bracketMatching(),
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      EditorView.lineWrapping,
    ];

    if (showDiff && originalCode) {
      const origCode = getCodeForTab(originalCode, activeTab);

      const mv = new MergeView({
        a: {
          doc: origCode,
          extensions: [
            ...sharedExtensions,
            EditorView.editable.of(false),
            EditorState.readOnly.of(true),
          ],
        },
        b: {
          doc: currentCode,
          extensions: [
            ...sharedExtensions,
            EditorView.editable.of(!readOnly),
            EditorState.readOnly.of(readOnly),
            ...(readOnly ? [] : [
              EditorView.updateListener.of((update) => {
                if (update.docChanged && onChangeRef.current) {
                  const newValue = update.state.doc.toString();
                  onChangeRef.current({
                    ...codeRef.current,
                    [activeTab]: newValue,
                  });
                }
              }),
            ]),
          ],
        },
        parent: editorContainer.current,
      });
      mergeView.current = mv;
    } else {
      const extensions = [
        ...sharedExtensions,
        EditorView.editable.of(!readOnly),
        EditorState.readOnly.of(readOnly),
        ...(readOnly ? [] : [
          EditorView.updateListener.of((update) => {
            if (update.docChanged && onChangeRef.current) {
              const newValue = update.state.doc.toString();
              onChangeRef.current({
                ...codeRef.current,
                [activeTab]: newValue,
              });
            }
          }),
        ]),
      ];

      const state = EditorState.create({ doc: currentCode, extensions });
      editorView.current = new EditorView({ state, parent: editorContainer.current });
    }

    return destroyEditors;
  }, [activeTab, showDiff, readOnly, originalCode, code, destroyEditors]);

  return (
    <div className={`code-editor ${className ?? ''}`}>
      <div className="code-editor__tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`code-editor__tab ${activeTab === tab.key ? 'code-editor__tab--active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
        {originalCode && (
          <button
            className={`code-editor__tab code-editor__tab--diff ${showDiff ? 'code-editor__tab--active' : ''}`}
            onClick={() => setShowDiff((v) => !v)}
          >
            Diff
          </button>
        )}
      </div>
      <div className="code-editor__content" ref={editorContainer} />
    </div>
  );
}
