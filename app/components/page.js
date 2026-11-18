'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ComponentModal from '@/components/ComponentModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import { PencilIcon, PlusIcon, SearchIcon, TrashIcon } from '@/components/Icons';
import { useToast } from '@/components/Toast';
import { formatINR } from '@/lib/format';
import styles from '../page.module.css'; // same header / toolbar / table-card look as the dashboard

export default function ComponentsPage() {
  const toast = useToast();
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/components', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load components.');
      setComponents(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? components.filter((c) => c.name.toLowerCase().includes(term)) : components;
  }, [components, search]);

  const sortByName = (list) =>
    [...list].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

  function handleSaved(component) {
    const wasEdit = Boolean(editing);
    setComponents((list) => sortByName(wasEdit ? list.map((c) => (c._id === component._id ? component : c)) : [...list, component]));
    setAdding(false);
    setEditing(null);
    toast.success(`"${component.name}" ${wasEdit ? 'updated' : 'added'}.`);
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/components/${toDelete._id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed.');
      setComponents((list) => list.filter((c) => c._id !== toDelete._id));
      toast.success(`"${toDelete.name}" deleted.`);
      setToDelete(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <h1 className={styles.appTitle}>Components</h1>
          <div className={styles.headerActions}>
            <Link href="/" className="btn btn-outline">
              ← Quotations
            </Link>
            <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>
              <PlusIcon /> Add Component
            </button>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.toolbar}>
          <div className={styles.search}>
            <SearchIcon className={styles.searchIcon} />
            <input
              type="search"
              className={`input ${styles.searchInput}`}
              placeholder="Search components"
              aria-label="Search components"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {!loading && !error && (
            <p className="hint">
              {filtered.length} of {components.length} component{components.length === 1 ? '' : 's'}
            </p>
          )}
        </div>

        <section className={styles.card} aria-live="polite">
          {loading ? (
            <div className={styles.state}>
              <span className="spinner" /> Loading components…
            </div>
          ) : error ? (
            <div className={styles.state}>
              <p>{error}</p>
              <button type="button" className="btn btn-outline" onClick={load}>
                Try again
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className={styles.state}>
              {components.length === 0 ? (
                <>
                  <p>No components yet.</p>
                  <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>
                    <PlusIcon /> Add your first component
                  </button>
                </>
              ) : (
                <p>No components match “{search}”.</p>
              )}
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table stack-table">
                <thead>
                  <tr>
                    <th>Component</th>
                    <th className="num">Bulk Price</th>
                    <th className="num">Retail Price</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c._id}>
                      <td data-label="Component" className={styles.clientCell} style={{ fontWeight: 600 }}>
                        {c.name}
                      </td>
                      <td data-label="Bulk Price" className="num">
                        {formatINR(c.bulkPrice)}
                      </td>
                      <td data-label="Retail Price" className="num">
                        {formatINR(c.retailPrice)}
                      </td>
                      <td data-label="">
                        <div className={styles.actions}>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => setEditing(c)}
                            aria-label={`Edit ${c.name}`}
                          >
                            <PencilIcon /> <span className={styles.btnLabel}>Edit</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger-ghost btn-sm"
                            onClick={() => setToDelete(c)}
                            aria-label={`Delete ${c.name}`}
                          >
                            <TrashIcon /> <span className={styles.btnLabel}>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {(adding || editing) && (
        <ComponentModal
          initial={editing || undefined}
          onClose={() => {
            setAdding(false);
            setEditing(null);
          }}
          onSaved={handleSaved}
          onError={(m) => toast.error(m)}
        />
      )}

      {toDelete && (
        <ConfirmDialog
          title="Delete component?"
          message={`"${toDelete.name}" will be removed from the component list. Existing quotations keep their saved prices and are not affected.`}
          loading={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </>
  );
}
