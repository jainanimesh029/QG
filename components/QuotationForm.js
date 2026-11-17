'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from './Toast';
import ComponentCombobox from './ComponentCombobox';
import { PencilIcon, PlusIcon, TrashIcon } from './Icons';
import { calculateTotals, toNum } from '@/lib/calc';
import {
  DEFAULT_GST_RATE,
  DEFAULT_VALIDITY_DAYS,
  GST_OPTIONS,
  GST_TYPES,
  PAYMENT_OPTIONS,
  PAYMENT_TERMS,
  PRICE_TYPES,
} from '@/lib/constants';
import { addDaysInput, formatINR, toDateInput, todayInput } from '@/lib/format';
import { downloadQuotationPdf } from '@/lib/downloadPdf';
import styles from './QuotationForm.module.css';

let keyCounter = 0;
const newKey = () => ++keyCounter;

function initialState(q) {
  if (!q) {
    const today = todayInput();
    return {
      quotationId: '',
      quotationDate: today,
      validUntil: addDaysInput(today, DEFAULT_VALIDITY_DAYS),
      clientName: '',
      deliveryTarget: '',
      estimatedDuration: '',
      projectOverview: '',
      scope: [{ key: newKey(), text: '' }],
      items: [],
      additionalCharges: '',
      overrideOn: false,
      overridePrice: '',
      gstType: GST_TYPES.EXCLUDED,
      gstRate: String(DEFAULT_GST_RATE),
      paymentTerms: PAYMENT_TERMS.SPLIT,
    };
  }
  return {
    quotationId: q.quotationId,
    quotationDate: toDateInput(q.quotationDate),
    validUntil: toDateInput(q.validUntil),
    clientName: q.clientName,
    deliveryTarget: toDateInput(q.deliveryTarget),
    estimatedDuration: q.estimatedDuration || '',
    projectOverview: q.projectOverview || '',
    scope: q.scope?.length ? q.scope.map((text) => ({ key: newKey(), text })) : [{ key: newKey(), text: '' }],
    items: (q.components || []).map((c) => ({
      key: newKey(),
      componentId: c.componentId,
      name: c.name,
      quantity: String(c.quantity),
      unit: c.unit || '',
      priceType: c.priceType,
      // older/hand-made records may lack one of the prices - fall back to the stored unit price
      bulkPrice: c.bulkPrice || (c.priceType === PRICE_TYPES.BULK ? c.unitPrice : 0),
      retailPrice: c.retailPrice || (c.priceType === PRICE_TYPES.RETAIL ? c.unitPrice : 0),
    })),
    additionalCharges: q.additionalCharges ? String(q.additionalCharges) : '',
    overrideOn: Boolean(q.isPriceOverridden),
    overridePrice: q.isPriceOverridden ? String(q.finalPrice) : '',
    gstType: q.gstType,
    gstRate: String(q.gstRate ?? DEFAULT_GST_RATE),
    paymentTerms: q.paymentTerms,
  };
}

function Field({ label, name, required, error, hint, children, className }) {
  return (
    <div className={`field ${className || ''}`}>
      <label className="label" htmlFor={`f-${name}`}>
        {label} {required && <span className="required">*</span>}
      </label>
      {children}
      {hint && !error && <span className="hint">{hint}</span>}
      {error && (
        <span id={`f-${name}-err`} className="error-text">
          {error}
        </span>
      )}
    </div>
  );
}

export default function QuotationForm({ initial }) {
  const router = useRouter();
  const toast = useToast();
  const isEdit = Boolean(initial);

  const [form, setForm] = useState(() => initialState(initial));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(null); // null | 'save' | 'pdf'

  // quotation ID
  const [idLoading, setIdLoading] = useState(!isEdit);
  const [idEdited, setIdEdited] = useState(false);
  const [idUnlocked, setIdUnlocked] = useState(false);
  const idInputRef = useRef(null);

  // components catalogue + "add component" picker
  const [catalog, setCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [pickedId, setPickedId] = useState('');
  const [pickQty, setPickQty] = useState('1');
  const [pickUnit, setPickUnit] = useState('');
  const [pickType, setPickType] = useState(PRICE_TYPES.RETAIL);
  const [pickError, setPickError] = useState('');

  const validUntilTouched = useRef(isEdit);
  const scopeFocusKey = useRef(null);

  const set = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((e) => (e[name] ? { ...e, [name]: undefined } : e));
  };

  // ---- load next ID (create only) and components ---------------------------------
  useEffect(() => {
    let cancelled = false;

    if (!isEdit) {
      fetch('/api/quotations/next-id', { cache: 'no-store' })
        .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
        .then(({ ok, d }) => {
          if (cancelled) return;
          if (!ok) throw new Error(d.error || 'Could not generate a quotation ID.');
          setForm((f) => ({ ...f, quotationId: d.quotationId }));
        })
        .catch((err) => {
          if (cancelled) return;
          toast.error(`${err.message} You can type an ID manually.`);
          setIdUnlocked(true);
          setIdEdited(true);
        })
        .finally(() => !cancelled && setIdLoading(false));
    }

    fetch('/api/components', { cache: 'no-store' })
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (cancelled) return;
        if (!ok) throw new Error(d.error || 'Could not load components.');
        setCatalog(d);
      })
      .catch((err) => !cancelled && toast.error(err.message))
      .finally(() => !cancelled && setCatalogLoading(false));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- derived totals ---------------------------------------------------------------
  const totals = useMemo(
    () =>
      calculateTotals({
        items: form.items,
        additionalCharges: form.additionalCharges,
        isPriceOverridden: form.overrideOn,
        overridePrice: form.overridePrice,
        gstType: form.gstType,
        gstRate: form.gstRate,
        paymentTerms: form.paymentTerms,
      }),
    [form.items, form.additionalCharges, form.overrideOn, form.overridePrice, form.gstType, form.gstRate, form.paymentTerms]
  );

  // ---- helpers for controls ---------------------------------------------------------
  const ctl = (name, base = 'input') => ({
    id: `f-${name}`,
    className: `${base}${errors[name] ? ' has-error' : ''}`,
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': errors[name] ? `f-${name}-err` : undefined,
  });

  // ---- scope bullets ----------------------------------------------------------------
  const updateScope = (key, text) =>
    setForm((f) => ({ ...f, scope: f.scope.map((s) => (s.key === key ? { ...s, text } : s)) }));
  const addScope = () => {
    const key = newKey();
    scopeFocusKey.current = key;
    setForm((f) => ({ ...f, scope: [...f.scope, { key, text: '' }] }));
  };
  const removeScope = (key) =>
    setForm((f) => {
      const rest = f.scope.filter((s) => s.key !== key);
      return { ...f, scope: rest.length ? rest : [{ key: newKey(), text: '' }] };
    });

  // ---- components -------------------------------------------------------------------
  function addPicked() {
    const c = catalog.find((x) => x._id === pickedId);
    if (!c) return setPickError('Select a component first.');
    if (!(toNum(pickQty) > 0)) return setPickError('Enter a quantity greater than 0.');
    setPickError('');

    setForm((f) => {
      const existing = f.items.find((i) => i.componentId === c._id && i.priceType === pickType);
      if (existing) {
        return {
          ...f,
          items: f.items.map((i) =>
            i === existing ? { ...i, quantity: String(toNum(i.quantity) + toNum(pickQty)) } : i
          ),
        };
      }
      return {
        ...f,
        items: [
          ...f.items,
          {
            key: newKey(),
            componentId: c._id,
            name: c.name,
            quantity: String(toNum(pickQty)),
            unit: pickUnit.trim(),
            priceType: pickType,
            bulkPrice: c.bulkPrice,
            retailPrice: c.retailPrice,
          },
        ],
      };
    });
    setErrors((e) => ({ ...e, components: undefined, finalPrice: undefined }));
    setPickedId('');
    setPickQty('1');
    setPickUnit('');
  }

  // Enter in quantity/unit adds the component instead of submitting the whole form
  const onPickerEnter = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addPicked();
    }
  };

  const updateItem = (key, patch) =>
    setForm((f) => ({ ...f, items: f.items.map((i) => (i.key === key ? { ...i, ...patch } : i)) }));
  const removeItem = (key) => setForm((f) => ({ ...f, items: f.items.filter((i) => i.key !== key) }));

  // ---- ID editing -------------------------------------------------------------------
  function unlockId() {
    setIdUnlocked(true);
    setTimeout(() => idInputRef.current?.focus(), 0);
  }

  // ---- validation + save ------------------------------------------------------------
  function validate() {
    const e = {};
    if (!form.quotationId.trim()) e.quotationId = 'Quotation ID is required.';
    else if (/[\\/]/.test(form.quotationId)) e.quotationId = 'Quotation ID cannot contain slashes.';
    if (!form.quotationDate) e.quotationDate = 'Quotation date is required.';
    if (!form.validUntil) e.validUntil = 'Valid until date is required.';
    else if (form.quotationDate && form.validUntil < form.quotationDate)
      e.validUntil = 'Valid until cannot be before the quotation date.';
    if (!form.clientName.trim()) e.clientName = 'Client name is required.';
    if (!form.deliveryTarget) e.deliveryTarget = 'Delivery target is required.';
    if (!form.estimatedDuration.trim()) e.estimatedDuration = 'Estimated duration is required.';
    if (!form.projectOverview.trim()) e.projectOverview = 'Project overview is required.';
    if (form.items.some((i) => !(toNum(i.quantity) > 0)))
      e.components = 'Every component needs a quantity greater than 0.';
    if (form.additionalCharges !== '' && toNum(form.additionalCharges) < 0)
      e.additionalCharges = 'Additional charges cannot be negative.';
    if (form.overrideOn && form.overridePrice === '') e.finalPrice = 'Enter the custom final price.';
    else if (totals.finalPrice <= 0)
      e.finalPrice = 'Final price must be greater than 0. Add components or a service fee.';
    if (form.gstType !== GST_TYPES.NA) {
      const r = Number(form.gstRate);
      if (form.gstRate === '' || !Number.isFinite(r) || r < 0 || r > 100)
        e.gstRate = 'Enter a GST rate between 0 and 100.';
    }
    return e;
  }

  function focusFirstError(errs) {
    const first = Object.keys(errs).find((k) => errs[k]);
    if (!first) return;
    setTimeout(() => {
      const el = document.getElementById(`f-${first}`) || document.getElementById(`sec-${first}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el?.focus?.({ preventScroll: true });
    }, 0);
  }

  async function submit(downloadPdf) {
    if (saving) return;
    const errs = validate();
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) {
      toast.error('Please fix the highlighted fields.');
      focusFirstError(errs);
      return;
    }

    setSaving(downloadPdf ? 'pdf' : 'save');
    try {
      const payload = {
        quotationId: form.quotationId.trim(),
        idEdited: isEdit ? true : idEdited,
        quotationDate: form.quotationDate,
        validUntil: form.validUntil,
        clientName: form.clientName.trim(),
        deliveryTarget: form.deliveryTarget,
        estimatedDuration: form.estimatedDuration.trim(),
        projectOverview: form.projectOverview.trim(),
        scope: form.scope.map((s) => s.text.trim()).filter(Boolean),
        components: form.items.map((i) => ({
          componentId: i.componentId,
          name: i.name,
          quantity: toNum(i.quantity),
          unit: i.unit,
          priceType: i.priceType,
          bulkPrice: toNum(i.bulkPrice),
          retailPrice: toNum(i.retailPrice),
        })),
        additionalCharges: toNum(form.additionalCharges),
        isPriceOverridden: form.overrideOn,
        finalPrice: form.overrideOn ? toNum(form.overridePrice) : totals.finalPrice,
        gstType: form.gstType,
        gstRate: toNum(form.gstRate),
        paymentTerms: form.paymentTerms,
      };

      const res = await fetch(isEdit ? `/api/quotations/${initial._id}` : '/api/quotations', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.errors && Object.keys(data.errors).length) {
          setErrors(data.errors);
          focusFirstError(data.errors);
          if (data.errors.quotationId) setIdUnlocked(true);
        }
        toast.error(data.error || 'Could not save the quotation.');
        return;
      }

      toast.success(`Quotation ${data.quotationId} ${isEdit ? 'updated' : 'saved'}.`);

      if (downloadPdf) {
        try {
          await downloadQuotationPdf(data);
        } catch (err) {
          console.error(err);
          toast.error('Quotation saved, but the PDF could not be generated.');
        }
      }
      router.push('/');
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error('Network error. Please check your connection and try again.');
    } finally {
      setSaving(null);
    }
  }

  const showGst = form.gstType !== GST_TYPES.NA;
  const busy = Boolean(saving);

  return (
    <>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.back}>
            ← Back to quotations
          </Link>
          <h1 className={styles.title}>{isEdit ? `Edit Quotation ${initial.quotationId}` : 'New Quotation'}</h1>
        </div>
      </header>

      <main className={styles.main}>
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            submit(false);
          }}
        >
          {/* 1. Quotation details */}
          <section className={styles.section} aria-labelledby="h-details">
            <h2 id="h-details" className={styles.sectionTitle}>
              1. Quotation Details
            </h2>
            <div className={styles.grid}>
              <Field label="Quotation ID" name="quotationId" required error={errors.quotationId}>
                <div className={styles.idRow}>
                  <input
                    {...ctl('quotationId')}
                    ref={idInputRef}
                    value={idLoading ? '' : form.quotationId}
                    placeholder={idLoading ? 'Generating…' : 'e.g. CC-26H1-001'}
                    readOnly={!idUnlocked}
                    onChange={(e) => {
                      set('quotationId', e.target.value);
                      setIdEdited(true);
                    }}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon"
                    onClick={unlockId}
                    disabled={idUnlocked || idLoading}
                    aria-label="Edit quotation ID"
                    title="Edit quotation ID"
                  >
                    <PencilIcon />
                  </button>
                </div>
              </Field>

              <Field label="Client Name" name="clientName" required error={errors.clientName}>
                <input
                  {...ctl('clientName')}
                  value={form.clientName}
                  onChange={(e) => set('clientName', e.target.value)}
                  autoComplete="off"
                />
              </Field>

              <Field label="Quotation Date" name="quotationDate" required error={errors.quotationDate}>
                <input
                  {...ctl('quotationDate')}
                  type="date"
                  value={form.quotationDate}
                  onChange={(e) => {
                    const v = e.target.value;
                    set('quotationDate', v);
                    // keep "valid until" 7 days ahead until the user sets it themselves
                    if (!validUntilTouched.current && v) set('validUntil', addDaysInput(v, DEFAULT_VALIDITY_DAYS));
                  }}
                />
              </Field>

              <Field label="Valid Until" name="validUntil" required error={errors.validUntil}>
                <input
                  {...ctl('validUntil')}
                  type="date"
                  value={form.validUntil}
                  min={form.quotationDate || undefined}
                  onChange={(e) => {
                    validUntilTouched.current = true;
                    set('validUntil', e.target.value);
                  }}
                />
              </Field>

              <Field label="Delivery Target" name="deliveryTarget" required error={errors.deliveryTarget}>
                <input
                  {...ctl('deliveryTarget')}
                  type="date"
                  value={form.deliveryTarget}
                  onChange={(e) => set('deliveryTarget', e.target.value)}
                />
              </Field>

              <Field
                label="Estimated Duration"
                name="estimatedDuration"
                required
                error={errors.estimatedDuration}
              >
                <input
                  {...ctl('estimatedDuration')}
                  placeholder="e.g. 1 Week"
                  value={form.estimatedDuration}
                  onChange={(e) => set('estimatedDuration', e.target.value)}
                  autoComplete="off"
                />
              </Field>
            </div>
          </section>

          {/* 2. Project overview */}
          <section className={styles.section} aria-labelledby="h-overview">
            <h2 id="h-overview" className={styles.sectionTitle}>
              2. Project Overview
            </h2>
            <Field label="Overview" name="projectOverview" required error={errors.projectOverview}>
              <textarea
                {...ctl('projectOverview', 'textarea')}
                rows={4}
                value={form.projectOverview}
                onChange={(e) => set('projectOverview', e.target.value)}
              />
            </Field>
          </section>

          {/* 3. Scope */}
          <section className={styles.section} aria-labelledby="h-scope">
            <h2 id="h-scope" className={styles.sectionTitle}>
              3. Scope &amp; Deliverables
            </h2>
            <ul className={styles.scopeList}>
              {form.scope.map((s, idx) => (
                <li key={s.key} className={styles.scopeRow}>
                  <span className={styles.bullet} aria-hidden="true">
                    •
                  </span>
                  <input
                    className="input"
                    aria-label={`Scope item ${idx + 1}`}
                    placeholder="Describe a deliverable"
                    value={s.text}
                    ref={(el) => {
                      if (el && scopeFocusKey.current === s.key) {
                        scopeFocusKey.current = null;
                        el.focus();
                      }
                    }}
                    onChange={(e) => updateScope(s.key, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addScope();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-danger-ghost btn-icon"
                    onClick={() => removeScope(s.key)}
                    aria-label={`Remove scope item ${idx + 1}`}
                  >
                    <TrashIcon />
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className="btn btn-outline btn-block-mobile" onClick={addScope}>
              <PlusIcon /> Add Bullet Point
            </button>
          </section>

          {/* 4. Components */}
          <section className={styles.section} aria-labelledby="h-components">
            <h2 id="h-components" className={styles.sectionTitle}>
              4. Components Included
            </h2>

            <div className={styles.picker}>
              <div className={styles.pickerTop}>
                <div className={`field ${styles.pickerSelect}`}>
                  <label className="label" htmlFor="pick-component">
                    Component
                  </label>
                  <ComponentCombobox
                    id="pick-component"
                    components={catalog}
                    priceType={pickType}
                    loading={catalogLoading}
                    value={pickedId}
                    onChange={(id) => {
                      setPickedId(id);
                      setPickError('');
                    }}
                    hasError={Boolean(pickError)}
                    describedBy={pickError ? 'pick-error' : undefined}
                  />
                </div>
              </div>

              <div className={styles.pickerBottom}>
                <div className="field">
                  <label className="label" htmlFor="pick-qty">
                    Quantity
                  </label>
                  <input
                    id="pick-qty"
                    className="input"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    value={pickQty}
                    onChange={(e) => setPickQty(e.target.value)}
                    onKeyDown={onPickerEnter}
                  />
                </div>
                <div className="field">
                  <label className="label" htmlFor="pick-unit">
                    Unit <span className="hint">(optional)</span>
                  </label>
                  <input
                    id="pick-unit"
                    className="input"
                    placeholder="e.g. set, pcs"
                    value={pickUnit}
                    onChange={(e) => setPickUnit(e.target.value)}
                    onKeyDown={onPickerEnter}
                  />
                </div>
                <div className="field">
                  <span className="label" id="pick-type-label">
                    Price Type
                  </span>
                  <div role="radiogroup" aria-labelledby="pick-type-label" className={styles.tabs}>
                    {[
                      [PRICE_TYPES.RETAIL, 'Retail'],
                      [PRICE_TYPES.BULK, 'Bulk'],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={pickType === value}
                        className={`${styles.tab}${pickType === value ? ` ${styles.tabActive}` : ''}`}
                        onClick={() => setPickType(value)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  className={`btn btn-primary ${styles.addBtn}`}
                  onClick={addPicked}
                  disabled={catalogLoading}
                >
                  {catalogLoading ? <span className="spinner" /> : <PlusIcon />} Add
                </button>
              </div>
            </div>
            {pickError && (
              <p id="pick-error" className={`error-text ${styles.pickError}`}>
                {pickError}
              </p>
            )}

            <div id="sec-components" tabIndex={-1} className={styles.itemsBox}>
              {form.items.length === 0 ? (
                <p className={styles.empty}>No components added yet.</p>
              ) : (
                <div className="table-wrap">
                  <table className="table stack-table">
                    <thead>
                      <tr>
                        <th>Component</th>
                        <th>Quantity</th>
                        <th>Price Type</th>
                        <th className="num">Unit Price</th>
                        <th className="num">Line Total</th>
                        <th>
                          <span className="sr-only">Remove</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.items.map((item, i) => (
                        <tr key={item.key}>
                          <td data-label="Component" className={styles.nameCell}>
                            {item.name}
                          </td>
                          <td data-label="Quantity">
                            <div className={styles.qtyCell}>
                              <input
                                className={`input ${styles.qtyInput}`}
                                type="number"
                                inputMode="decimal"
                                min="0"
                                step="any"
                                aria-label={`Quantity for ${item.name}`}
                                value={item.quantity}
                                onChange={(e) => {
                                  updateItem(item.key, { quantity: e.target.value });
                                  setErrors((er) => ({ ...er, components: undefined }));
                                }}
                              />
                              {item.unit && <span className={styles.unit}>{item.unit}</span>}
                            </div>
                          </td>
                          <td data-label="Price Type">
                            <div
                              role="radiogroup"
                              aria-label={`Price type for ${item.name}`}
                              className={`${styles.tabs} ${styles.tabsSm}`}
                            >
                              {[
                                [PRICE_TYPES.RETAIL, 'Retail'],
                                [PRICE_TYPES.BULK, 'Bulk'],
                              ].map(([value, label]) => (
                                <button
                                  key={value}
                                  type="button"
                                  role="radio"
                                  aria-checked={item.priceType === value}
                                  className={`${styles.tab}${item.priceType === value ? ` ${styles.tabActive}` : ''}`}
                                  onClick={() => updateItem(item.key, { priceType: value })}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td data-label="Unit Price" className="num">
                            {formatINR(totals.lines[i]?.unitPrice)}
                          </td>
                          <td data-label="Line Total" className={`num ${styles.lineTotal}`}>
                            {formatINR(totals.lines[i]?.lineTotal)}
                          </td>
                          <td data-label="">
                            <button
                              type="button"
                              className="btn btn-danger-ghost btn-sm"
                              onClick={() => removeItem(item.key)}
                              aria-label={`Remove ${item.name}`}
                            >
                              <TrashIcon /> Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            {errors.components && <p className="error-text">{errors.components}</p>}
          </section>

          {/* 5. Summary */}
          <section className={styles.section} aria-labelledby="h-summary">
            <h2 id="h-summary" className={styles.sectionTitle}>
              5. Quotation Summary
            </h2>

            <div className={styles.summaryLayout}>
              <div className={styles.summaryInputs}>
                <Field
                  label="Additional Charges / Service Fee (₹)"
                  name="additionalCharges"
                  error={errors.additionalCharges}
                  hint="Optional - e.g. development work"
                >
                  <input
                    {...ctl('additionalCharges')}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    value={form.additionalCharges}
                    onChange={(e) => set('additionalCharges', e.target.value)}
                  />
                </Field>

                <div className="field">
                  <label className={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={form.overrideOn}
                      onChange={(e) => {
                        const on = e.target.checked;
                        setForm((f) => ({
                          ...f,
                          overrideOn: on,
                          overridePrice: on && f.overridePrice === '' ? String(totals.autoPrice) : f.overridePrice,
                        }));
                        setErrors((er) => ({ ...er, finalPrice: undefined }));
                      }}
                    />
                    <span>Override final price</span>
                  </label>
                  {form.overrideOn && (
                    <input
                      {...ctl('finalPrice')}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="any"
                      aria-label="Custom final project price"
                      value={form.overridePrice}
                      onChange={(e) => set('overridePrice', e.target.value)}
                    />
                  )}
                  {errors.finalPrice && (
                    <span id="f-finalPrice-err" className="error-text">
                      {errors.finalPrice}
                    </span>
                  )}
                  {!form.overrideOn && (
                    <span className="hint">
                      Calculated automatically: components + additional charges.
                    </span>
                  )}
                </div>

                <Field label="GST" name="gstType">
                  <select
                    {...ctl('gstType', 'select')}
                    value={form.gstType}
                    onChange={(e) => set('gstType', e.target.value)}
                  >
                    {GST_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </Field>

                {showGst && (
                  <Field label="GST Rate (%)" name="gstRate" error={errors.gstRate}>
                    <input
                      {...ctl('gstRate')}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      max="100"
                      step="any"
                      value={form.gstRate}
                      onChange={(e) => set('gstRate', e.target.value)}
                    />
                  </Field>
                )}
              </div>

              <dl className={styles.summaryBox}>
                <div className={styles.sumRow}>
                  <dt>Components Subtotal</dt>
                  <dd>{formatINR(totals.subtotal)}</dd>
                </div>
                <div className={styles.sumRow}>
                  <dt>Additional Charges</dt>
                  <dd>{formatINR(totals.additionalCharges)}</dd>
                </div>
                <div className={`${styles.sumRow} ${styles.sumFinal}`}>
                  <dt>
                    Final Project Price
                    {form.overrideOn && <span className={styles.badge}>custom</span>}
                  </dt>
                  <dd>{formatINR(totals.finalPrice)}</dd>
                </div>

                {form.gstType === GST_TYPES.INCLUDED && (
                  <>
                    <div className={styles.sumRow}>
                      <dt>Base Amount (excl. GST)</dt>
                      <dd>{formatINR(totals.baseAmount)}</dd>
                    </div>
                    <div className={styles.sumRow}>
                      <dt>GST @ {totals.gstRate}% (included)</dt>
                      <dd>{formatINR(totals.gstAmount)}</dd>
                    </div>
                  </>
                )}
                {form.gstType === GST_TYPES.EXCLUDED && (
                  <div className={styles.sumRow}>
                    <dt>GST @ {totals.gstRate}% (added on top)</dt>
                    <dd>{formatINR(totals.gstAmount)}</dd>
                  </div>
                )}
                {form.gstType === GST_TYPES.NA && (
                  <div className={styles.sumRow}>
                    <dt>GST</dt>
                    <dd>Not applicable</dd>
                  </div>
                )}

                <div className={`${styles.sumRow} ${styles.sumGrand}`}>
                  <dt>Grand Total</dt>
                  <dd>{formatINR(totals.grandTotal)}</dd>
                </div>
              </dl>
            </div>
          </section>

          {/* 6. Payment terms */}
          <section className={styles.section} aria-labelledby="h-payment">
            <h2 id="h-payment" className={styles.sectionTitle}>
              6. Payment Terms
            </h2>
            <Field label="Payment Terms" name="paymentTerms">
              <select
                {...ctl('paymentTerms', 'select')}
                value={form.paymentTerms}
                onChange={(e) => set('paymentTerms', e.target.value)}
              >
                {PAYMENT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>

            <div className={`table-wrap ${styles.milestones}`}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Payment Milestone</th>
                    <th className="num">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {totals.milestones.map((m) => (
                    <tr key={m.label}>
                      <td>
                        {m.label} ({m.percent}%)
                      </td>
                      <td className="num">{formatINR(m.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className={styles.actions}>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {saving === 'save' && <span className="spinner" />}
              {isEdit ? 'Update Quotation' : 'Save Quotation'}
            </button>
            <button type="button" className="btn btn-outline" onClick={() => submit(true)} disabled={busy}>
              {saving === 'pdf' && <span className="spinner" />}
              Save &amp; Download PDF
            </button>
            <Link
              href="/"
              className="btn btn-ghost"
              aria-disabled={busy}
              onClick={(e) => busy && e.preventDefault()}
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </>
  );
}
