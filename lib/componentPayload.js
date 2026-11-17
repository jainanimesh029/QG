/** Validates a component request body. Returns { data, errors }. */
export function validateComponent(body = {}) {
  const errors = {};
  const name = String(body.name || '').trim();
  if (!name) errors.name = 'Component name is required.';

  const check = (key, label) => {
    const raw = body[key];
    if (raw === undefined || raw === null || raw === '') {
      errors[key] = `${label} is required.`;
      return 0;
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) {
      errors[key] = `${label} must be a number of 0 or more.`;
      return 0;
    }
    return n;
  };
  const bulkPrice = check('bulkPrice', 'Bulk price');
  const retailPrice = check('retailPrice', 'Retail price');

  return { data: { name, bulkPrice, retailPrice }, errors };
}
