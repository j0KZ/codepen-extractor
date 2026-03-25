export type CodeEditorTab = 'html' | 'css' | 'js';

export interface CodeBlock {
  html: string;
  css?: string;
  js?: string;
}

export interface CodeEditorProps {
  code: CodeBlock;
  originalCode?: CodeBlock;
  onChange?: (code: CodeBlock) => void;
  readOnly?: boolean;
  className?: string;
}
