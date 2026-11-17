'use client';

import { useState } from 'react';
import Modal from './Modal';
import styles from './ComponentModal.module.css';

/** "+ Add New Component" dialog. Calls onSaved(component) after it is stored. */
export default function ComponentModal({ onClose, onSaved, onError }) {
  const [form, setForm] = useState({ name: '', bulkPrice: '', retailPrice: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((errs) => ({ ...errs, [key]: undefined }));
  };

  function validate() {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Component name is required.';
    for (const [key, label] of [
      ['bulkPrice', 'Bulk price'],
      ['retailPrice', 'Retail price'],
    ]) {
      const v = form[key];
      if (v === '') errs[key] = `${label} is required.`;
      else if (!Number.isFinite(Number(v)) || Number(v) < 0)
        errs[key] = `${label} must be a number of 0 or more.`;
    }
    return errs;
  }

  async function submit(e) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      const res = await fetch('/api/components', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          bulkPrice: Number(form.bulkPrice),
          retailPrice: Number(form.retailPrice),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.errors && Object.keys(data.errors).length) setErrors(data.errors);
        else onError?.(data.error || 'Could not save the component.');
        return;
      }
      onSaved(data);
    } catch {
      onError?.('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const fieldProps = (key) => ({
    id: `nc-${key}`,
    'aria-invalid': errors[key] ? true : undefined,
    'aria-describedby': errors[key] ? `nc-${key}-err` : undefined,
  });

  return (
    <Modal
      title="Add New Component"
      size="md"
      labelledBy="new-component-title"
      onClose={saving ? undefined : onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form="new-component-form" className="btn btn-primary" disabled={saving}>
            {saving && <span className="spinner" />}
            Save Component
          </button>
        </>
      }
    >
      <form id="new-component-form" onSubmit={submit} noValidate className={styles.form}>
        <div className="field">
          <label className="label" htmlFor="nc-name">
            Component Name <span className="required">*</span>
          </label>
          <input
            {...fieldProps('name')}
            className={`input${errors.name ? ' has-error' : ''}`}
            value={form.name}
            onChange={set('name')}
            autoFocus
            autoComplete="off"
          />
          {errors.name && (
            <span id="nc-name-err" className="error-text">
              {errors.name}
            </span>
          )}
        </div>

        <div className={styles.row}>
          <div className="field">
            <label className="label" htmlFor="nc-bulkPrice">
              Bulk Price (₹) <span className="required">*</span>
            </label>
            <input
              {...fieldProps('bulkPrice')}
              className={`input${errors.bulkPrice ? ' has-error' : ''}`}
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={form.bulkPrice}
              onChange={set('bulkPrice')}
            />
            {errors.bulkPrice && (
              <span id="nc-bulkPrice-err" className="error-text">
                {errors.bulkPrice}
              </span>
            )}
          </div>

          <div className="field">
            <label className="label" htmlFor="nc-retailPrice">
              Retail Price (₹) <span className="required">*</span>
            </label>
            <input
              {...fieldProps('retailPrice')}
              className={`input${errors.retailPrice ? ' has-error' : ''}`}
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={form.retailPrice}
              onChange={set('retailPrice')}
            />
            {errors.retailPrice && (
              <span id="nc-retailPrice-err" className="error-text">
                {errors.retailPrice}
              </span>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
}
