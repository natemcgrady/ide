'use client';

import type { CodeSnippet } from '@/lib/db/schema';

interface SnippetsListProps {
  isOpen: boolean;
  onClose: () => void;
  snippets: CodeSnippet[];
  onLoad: (snippet: CodeSnippet) => void;
  onDelete: (id: string) => void;
  isLoading: boolean;
}

const languageColors: Record<string, string> = {
  javascript: 'bg-yellow-500',
  typescript: 'bg-blue-500',
  python: 'bg-green-500',
  go: 'bg-cyan-500',
};

export default function SnippetsList({
  isOpen,
  onClose,
  snippets,
  onLoad,
  onDelete,
  isLoading,
}: SnippetsListProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363d]">
          <h2 className="text-lg font-semibold text-[#c9d1d9]">
            Saved Snippets
          </h2>
          <button
            onClick={onClose}
            className="text-[#8b949e] hover:text-[#c9d1d9] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-[#8b949e]">Loading snippets...</div>
            </div>
          ) : snippets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <svg className="w-12 h-12 text-[#484f58] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p className="text-[#8b949e]">No saved snippets yet</p>
              <p className="text-sm text-[#484f58] mt-1">Save your code to access it later</p>
            </div>
          ) : (
            <div className="space-y-2">
              {snippets.map((snippet) => (
                <div
                  key={snippet.id}
                  className="flex items-center justify-between p-3 bg-[#0d1117] border border-[#21262d] 
                             rounded-md hover:border-[#30363d] transition-colors group"
                >
                  <button
                    onClick={() => onLoad(snippet)}
                    className="flex-1 flex items-center gap-3 text-left"
                  >
                    <span className={`w-2 h-2 rounded-full ${languageColors[snippet.language] || 'bg-gray-500'}`} />
                    <div>
                      <div className="text-[#c9d1d9] font-medium">{snippet.name}</div>
                      <div className="text-xs text-[#8b949e]">
                        {snippet.language} • {new Date(snippet.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(snippet.id);
                    }}
                    className="p-1.5 text-[#484f58] hover:text-[#f85149] opacity-0 group-hover:opacity-100 
                               transition-all rounded hover:bg-[#21262d]"
                    title="Delete snippet"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-[#30363d]">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm text-[#c9d1d9] hover:bg-[#21262d] rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

