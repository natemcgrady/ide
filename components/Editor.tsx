'use client';

import MonacoEditor from '@monaco-editor/react';
import type { SupportedLanguage } from '@/lib/languages';
import { inferLanguageFromTitle } from '@/lib/languages';

interface EditorProps {
  code: string;
  fileTitle: string;
  onChange: (value: string | undefined) => void;
  onRun: () => void;
  readOnly?: boolean;
}

const languageMap: Record<SupportedLanguage, string> = {
  typescript: 'typescript',
  python: 'python',
};

export default function Editor({ code, fileTitle, onChange, onRun, readOnly }: EditorProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      onRun();
    }
  };
  const language = inferLanguageFromTitle(fileTitle);

  return (
    <div
      className="h-full w-full"
      onKeyDown={handleKeyDown}
    >
      <MonacoEditor
        height="100%"
        language={languageMap[language]}
        value={code}
        onChange={onChange}
        theme="vs-dark"
        options={{
          fontSize: 14,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          padding: { top: 16, bottom: 16 },
          readOnly: readOnly ?? false,
        }}
      />
    </div>
  );
}

