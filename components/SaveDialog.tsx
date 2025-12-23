'use client';

import { useState } from 'react';

interface SaveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  defaultName?: string;
  isUpdating?: boolean;
}

export default function SaveDialog({ 
  isOpen, 
  onClose, 
  onSave, 
  defaultName = '',
  isUpdating = false 
}: SaveDialogProps) {
  const [name, setName] = useState(defaultName);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim());
      setName('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363d]">
          <h2 className="text-lg font-semibold text-[#c9d1d9]">
            {isUpdating ? 'Update Snippet' : 'Save Snippet'}
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

        <form onSubmit={handleSubmit} className="p-4">
          <label className="block mb-2 text-sm text-[#8b949e]">
            Snippet Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter a name for your snippet..."
            autoFocus
            className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-md 
                       text-[#c9d1d9] placeholder-[#484f58]
                       focus:outline-none focus:ring-2 focus:ring-[#58a6ff] focus:border-transparent"
          />

          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-[#c9d1d9] hover:bg-[#21262d] rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-[#238636] hover:bg-[#2ea043] 
                         disabled:bg-[#238636]/50 disabled:cursor-not-allowed
                         rounded-md transition-colors"
            >
              {isUpdating ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

