'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/Toast';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import QuotationPreview from '@/components/QuotationPreview';
import { DownloadIcon, EyeIcon, PencilIcon, PlusIcon, SearchIcon, TrashIcon } from '@/components/Icons';
import { downloadQuotationPdf } from '@/lib/downloadPdf';
import { formatDate, formatINR } from '@/lib/format';
import { GST_TYPES } from '@/lib/constants';
import styles from './page.module.css';

const gstCaption = (q) =>
  q.gstType === GST_TYPES.INCLUDED
    ? `Incl. GST ${q.gstRate}%`
    : q.gstType === GST_TYPES.EXCLUDED
      ? `+ GST ${q.gstRate}%`
      : 'No GST';

export default function Dashboard() {
  const toast = useToast();
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [pdfBusyId, setPdfBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await fetch('/api/quotations', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load quotations.');
      setQuotations(data);
    } catch (err) {
      setLoadError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return quotations;
    return quotations.filter(
      (q) => q.clientName.toLowerCase().includes(term) || q.quotationId.toLowerCase().includes(term)
    );
  }, [quotations, search]);

  async function handlePdf(q) {
    setPdfBusyId(q._id);
    try {
      await downloadQuotationPdf(q);
    } catch (err) {
      console.error(err);
      toast.error('Could not generate the PDF. Please try again.');
    } finally {
      setPdfBusyId(null);
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/quotations/${toDelete._id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed.');
      setQuotations((list) => list.filter((q) => q._id !== toDelete._id));
      toast.success(`Quotation ${toDelete.quotationId} deleted.`);
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
          <h1 className={styles.appTitle}>Quotation Manager</h1>
          <div className={styles.headerActions}>
            <Link href="/components" className="btn btn-outline">
              Components
            </Link>
            <Link href="/quotations/new" className="btn btn-primary">
              <PlusIcon /> New Quotation
            </Link>
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
              placeholder="Search by client name or quotation ID"
              aria-label="Search quotations"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {!loading && !loadError && (
            <p className="hint">
              {filtered.length} of {quotations.length} quotation{quotations.length === 1 ? '' : 's'}
            </p>
          )}
        </div>

        <section className={styles.card} aria-live="polite">
          {loading ? (
            <div className={styles.state}>
              <span className="spinner" /> Loading quotations…
            </div>
          ) : loadError ? (
            <div className={styles.state}>
              <p>{loadError}</p>
              <button type="button" className="btn btn-outline" onClick={load}>
                Try again
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className={styles.state}>
              {quotations.length === 0 ? (
                <>
                  <p>No quotations yet.</p>
                  <Link href="/quotations/new" className="btn btn-primary">
                    <PlusIcon /> Create your first quotation
                  </Link>
                </>
              ) : (
                <p>No quotations match “{search}”.</p>
              )}
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table stack-table">
                <thead>
                  <tr>
                    <th>Quotation ID</th>
                    <th>Client</th>
                    <th>Quotation Date</th>
                    <th>Valid Until</th>
                    <th className="num">Final Price</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((q) => (
                    <tr key={q._id}>
                      <td data-label="Quotation ID" className={styles.idCell}>
                        {q.quotationId}
                      </td>
                      <td data-label="Client" className={styles.clientCell}>
                        {q.clientName}
                      </td>
                      <td data-label="Quotation Date">{formatDate(q.quotationDate)}</td>
                      <td data-label="Valid Until">{formatDate(q.validUntil)}</td>
                      <td data-label="Final Price" className="num">
                        <span className={styles.price}>{formatINR(q.grandTotal)}</span>
                        <span className={styles.caption}>{gstCaption(q)}</span>
                      </td>
                      <td data-label="">
                        <div className={styles.actions}>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            aria-label={`View ${q.quotationId}`}
                            title="View"
                            onClick={() => setPreview(q)}
                          >
                            <EyeIcon /> <span className={styles.btnLabel}>View</span>
                          </button>
                          <Link
                            href={`/quotations/${q._id}/edit`}
                            className="btn btn-ghost btn-sm"
                            aria-label={`Edit ${q.quotationId}`}
                            title="Edit"
                          >
                            <PencilIcon /> <span className={styles.btnLabel}>Edit</span>
                          </Link>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => handlePdf(q)}
                            aria-label={`Download PDF for ${q.quotationId}`}
                            title="Download PDF"
                            disabled={pdfBusyId === q._id}
                          >
                            {pdfBusyId === q._id ? <span className="spinner" /> : <DownloadIcon />} <span className={styles.btnLabel}>PDF</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger-ghost btn-sm"
                            onClick={() => setToDelete(q)}
                            aria-label={`Delete ${q.quotationId}`}
                            title="Delete"
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

      {preview && (
        <Modal
          title={`Quotation ${preview.quotationId}`}
          size="lg"
          onClose={() => setPreview(null)}
          footer={
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setPreview(null)}>
                Close
              </button>
              <Link href={`/quotations/${preview._id}/edit`} className="btn btn-outline">
                <PencilIcon /> Edit
              </Link>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handlePdf(preview)}
                disabled={pdfBusyId === preview._id}
              >
                {pdfBusyId === preview._id ? <span className="spinner" /> : <DownloadIcon />} Download PDF
              </button>
            </>
          }
        >
          <QuotationPreview quotation={preview} />
        </Modal>
      )}

      {toDelete && (
        <ConfirmDialog
          title="Delete quotation?"
          message={`Quotation ${toDelete.quotationId} for ${toDelete.clientName} will be permanently deleted. This cannot be undone.`}
          loading={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </>
  );
}
