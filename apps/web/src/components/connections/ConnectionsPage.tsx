'use client';

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api-client';
import { ConnectionDrawer } from './ConnectionDrawer';
import { ConnectionsEmptyState } from './ConnectionsEmptyState';
import { ConnectionsFilterBar } from './ConnectionsFilterBar';
import { ConnectionsHeader } from './ConnectionsHeader';
import { ConnectionsSkeleton } from './ConnectionsSkeleton';
import { ConnectionsTable } from './ConnectionsTable';
import { CreateConnectionModal } from './CreateConnectionModal';
import {
  type ConnectionListItem,
  type ConnectionRow,
  type ConnectionFamilyFilterOption,
  type ConnectionSortOption,
  type ConnectionStatus,
  type ConnectionStatusFilterOption,
  toConnectionRow,
} from './types';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const WORKSPACE_SLUG = 'procurement';

const STATUS_SORT_ORDER: Record<ConnectionStatus, number> = {
  Failed: 0,
  Warning: 1,
  Untested: 2,
  Healthy: 3,
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function sortRows(rows: ConnectionRow[], sortBy: ConnectionSortOption): ConnectionRow[] {
  const next = [...rows];

  if (sortBy === 'Name A-Z') {
    next.sort((a, b) => a.name.localeCompare(b.name));
    return next;
  }

  if (sortBy === 'Status') {
    next.sort((a, b) => STATUS_SORT_ORDER[a.health] - STATUS_SORT_ORDER[b.health]);
    return next;
  }

  if (sortBy === 'Last Tested') {
    next.sort((a, b) => {
      if (a.lastTestedAt === '--') return 1;
      if (b.lastTestedAt === '--') return -1;
      return new Date(b.lastTestedAt).getTime() - new Date(a.lastTestedAt).getTime();
    });
    return next;
  }

  // 'Recently Updated'
  next.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return next;
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export function ConnectionsPage() {
  // Data
  const [rows, setRows] = useState<ConnectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Filters
  const [searchValue, setSearchValue] = useState('');
  const [family, setFamily] = useState<ConnectionFamilyFilterOption>('All Types');
  const [status, setStatus] = useState<ConnectionStatusFilterOption>('All Statuses');
  const [sortBy, setSortBy] = useState<ConnectionSortOption>('Recently Updated');
  const deferredSearch = useDeferredValue(searchValue.trim().toLowerCase());

  // Modal / drawer
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);

  // Fetch connections
  const fetchConnections = useCallback(async () => {
    setFetchError(null);
    try {
      const items = await api.get<ConnectionListItem[]>(`/connections?slug=${encodeURIComponent(WORKSPACE_SLUG)}`);
      setRows(items.map(toConnectionRow));
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load connections.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  // Filter + sort
  const filteredRows = useMemo(() => {
    const filtered = rows.filter((row) => {
      const matchesSearch =
        deferredSearch.length === 0 ||
        row.name.toLowerCase().includes(deferredSearch) ||
        (row.platformLabel ?? '').toLowerCase().includes(deferredSearch) ||
        row.family.toLowerCase().includes(deferredSearch);
      const matchesFamily = family === 'All Types' || row.family === family;
      const matchesStatus = status === 'All Statuses' || row.health === status;
      return matchesSearch && matchesFamily && matchesStatus;
    });
    return sortRows(filtered, sortBy);
  }, [rows, deferredSearch, family, status, sortBy]);

  // Handlers
  const handleCreated = useCallback(() => {
    setShowCreateModal(false);
    fetchConnections();
  }, [fetchConnections]);

  const handleSaved = useCallback(() => {
    fetchConnections();
  }, [fetchConnections]);

  const handleDeleted = useCallback(() => {
    setActiveConnectionId(null);
    fetchConnections();
  }, [fetchConnections]);

  const openCreateModal = useCallback(() => setShowCreateModal(true), []);

  // Render
  if (loading) {
    return (
      <div className="space-y-6">
        <ConnectionsHeader onAddConnection={openCreateModal} />
        <ConnectionsSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ConnectionsHeader onAddConnection={openCreateModal} />

      <ConnectionsFilterBar
        searchValue={searchValue}
        family={family}
        status={status}
        sortBy={sortBy}
        disabled={rows.length === 0}
        onSearchChange={setSearchValue}
        onFamilyChange={setFamily}
        onStatusChange={setStatus}
        onSortChange={setSortBy}
      />

      {fetchError && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {fetchError}
        </div>
      )}

      {rows.length === 0 && !fetchError ? (
        <ConnectionsEmptyState onAddConnection={openCreateModal} />
      ) : (
        <ConnectionsTable rows={filteredRows} onView={setActiveConnectionId} />
      )}

      {/* Create modal */}
      {showCreateModal && (
        <CreateConnectionModal
          workspaceSlug={WORKSPACE_SLUG}
          onCreated={handleCreated}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* View / Edit drawer */}
      <ConnectionDrawer
        isOpen={activeConnectionId != null}
        connectionId={activeConnectionId}
        onClose={() => setActiveConnectionId(null)}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
