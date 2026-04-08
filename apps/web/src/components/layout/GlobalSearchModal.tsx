'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';

interface SearchResult {
  id: string;
  name: string;
  type: 'integration' | 'connection' | 'template';
  status?: string;
  family?: string;
  source?: string | null;
  target?: string | null;
}

interface SearchResponse {
  integrations: SearchResult[];
  connections: SearchResult[];
  templates: SearchResult[];
}

const TYPE_ICON: Record<SearchResult['type'], string> = {
  integration: 'hub',
  connection: 'cable',
  template: 'layers',
};

const TYPE_HREF: Record<SearchResult['type'], (id: string) => string> = {
  integration: (id) => `/integrations/${id}`,
  connection: () => '/connections',
  template: (id) => `/templates?template=${id}`,
};

export function GlobalSearchModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ⌘K / Escape shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.get<SearchResponse>(`/dashboard/search?q=${encodeURIComponent(query.trim())}`);
        const merged: SearchResult[] = [
          ...data.integrations,
          ...data.connections,
          ...data.templates,
        ];
        setResults(merged);
        setSelectedIndex(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const navigate = useCallback((result: SearchResult) => {
    onClose();
    router.push(TYPE_HREF[result.type](result.id));
  }, [router, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      navigate(results[selectedIndex]);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-[560px] rounded-2xl border border-border-soft bg-surface shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border-soft">
          <span className="material-symbols-outlined text-[20px] text-text-muted shrink-0">search</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search integrations, connections, templates…"
            className="flex-1 bg-transparent text-[15px] text-text-main placeholder:text-text-muted/50 focus:outline-none"
            autoComplete="off"
          />
          <kbd className="shrink-0 rounded border border-border-soft bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-text-muted/60">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[360px] overflow-y-auto">
          {loading && (
            <div className="px-5 py-8 text-center text-sm text-text-muted">Searching…</div>
          )}

          {!loading && query.trim() && results.length === 0 && (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-text-muted">No results found for &ldquo;{query}&rdquo;</p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <ul className="py-2">
              {results.map((result, index) => (
                <li key={`${result.type}-${result.id}`}>
                  <button
                    type="button"
                    onClick={() => navigate(result)}
                    className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors ${
                      index === selectedIndex ? 'bg-primary/5' : 'hover:bg-slate-50'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px] text-text-muted shrink-0">
                      {TYPE_ICON[result.type]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium text-text-main truncate">{result.name}</p>
                      <p className="text-[11px] text-text-muted capitalize">{result.type}</p>
                    </div>
                    {result.status && (
                      <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wide">
                        {result.status}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!loading && !query.trim() && (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-text-muted">Start typing to search across your workspace</p>
              <div className="mt-3 flex items-center justify-center gap-4 text-[11px] text-text-muted/50">
                <span><kbd className="rounded border bg-slate-100 px-1 py-0.5 text-[10px]">↑↓</kbd> Navigate</span>
                <span><kbd className="rounded border bg-slate-100 px-1 py-0.5 text-[10px]">↵</kbd> Open</span>
                <span><kbd className="rounded border bg-slate-100 px-1 py-0.5 text-[10px]">esc</kbd> Close</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
