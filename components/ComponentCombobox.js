'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { formatINR } from '@/lib/format';
import styles from './ComponentCombobox.module.css';

/** Searchable single-select dropdown for components. */
export default function ComponentCombobox({ id, components, value, onChange, hasError, describedBy, loading, priceType }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const rootRef = useRef(null);
  const listRef = useRef(null);

  const selected = components.find((c) => c._id === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? components.filter((c) => c.name.toLowerCase().includes(q)) : components;
  }, [components, query]);

  // keep the highlighted option in range and scrolled into view
  useEffect(() => {
    if (active >= filtered.length) setActive(Math.max(0, filtered.length - 1));
  }, [filtered, active]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.children[active]?.scrollIntoView?.({ block: 'nearest' });
  }, [active, open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [open]);

  function openList() {
    setQuery('');
    setActive(Math.max(0, components.findIndex((c) => c._id === value)));
    setOpen(true);
  }

  function choose(c) {
    onChange(c._id);
    setOpen(false);
    setQuery('');
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) openList();
      else setActive((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && open) {
      e.preventDefault();
      if (filtered[active]) choose(filtered[active]);
    } else if (e.key === 'Escape' && open) {
      e.stopPropagation();
      setOpen(false);
    }
  }

  return (
    <div className={styles.root} ref={rootRef}>
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-invalid={hasError ? true : undefined}
        aria-describedby={describedBy}
        autoComplete="off"
        className={`input ${styles.input}${hasError ? ' has-error' : ''}`}
        placeholder={
          loading
            ? 'Loading components…'
            : components.length
              ? 'Search and select a component…'
              : 'No components yet - add them via Components on the dashboard'
        }
        value={open ? query : selected?.name || ''}
        onFocus={openList}
        onClick={() => !open && openList()}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
      />
      <span className={styles.chevron} aria-hidden="true" />

      {open && (
        <ul id={`${id}-list`} role="listbox" className={styles.list} ref={listRef}>
          {filtered.length === 0 ? (
            <li className={styles.empty} role="option" aria-disabled="true" aria-selected="false">
              {loading ? 'Loading…' : components.length ? 'No matching components' : 'No components yet'}
            </li>
          ) : (
            filtered.map((c, i) => (
              <li
                key={c._id}
                role="option"
                aria-selected={c._id === value}
                className={`${styles.option}${i === active ? ` ${styles.active}` : ''}${
                  c._id === value ? ` ${styles.selected}` : ''
                }`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(c)}
                onMouseEnter={() => setActive(i)}
              >
                <span className={styles.name}>{c.name}</span>
                <span className={styles.prices}>
                  <span className={`${styles.price}${priceType === 'retail' ? ` ${styles.priceActive}` : ''}`}>
                    <span className={styles.priceLabel}>Retail</span>
                    <span className={styles.priceValue}>{formatINR(c.retailPrice)}</span>
                  </span>
                  <span className={`${styles.price}${priceType === 'bulk' ? ` ${styles.priceActive}` : ''}`}>
                    <span className={styles.priceLabel}>Bulk</span>
                    <span className={styles.priceValue}>{formatINR(c.bulkPrice)}</span>
                  </span>
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
