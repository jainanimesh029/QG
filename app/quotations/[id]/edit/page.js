'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import QuotationForm from '@/components/QuotationForm';

export default function EditQuotationPage({ params }) {
  const { id } = params;
  const [quotation, setQuotation] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/quotations/${id}`, { cache: 'no-store' })
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (cancelled) return;
        if (!ok) throw new Error(d.error || 'Could not load the quotation.');
        setQuotation(d);
      })
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) {
    return (
      <main style={{ maxWidth: 560, margin: '64px auto', padding: '0 16px', textAlign: 'center' }}>
        <p style={{ marginBottom: 16 }}>{error}</p>
        <Link href="/" className="btn btn-primary">
          Back to quotations
        </Link>
      </main>
    );
  }

  if (!quotation) {
    return (
      <main style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: 64, color: '#5b6b7c' }}>
        <span className="spinner" /> Loading quotation…
      </main>
    );
  }

  return <QuotationForm initial={quotation} />;
}
