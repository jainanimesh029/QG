import Counter from '../models/Counter';
import Quotation from '../models/Quotation';

/** Current half-year period, computed in IST so IDs roll over at Indian midnight. */
export function getPeriod(now = new Date()) {
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const yy = String(ist.getUTCFullYear()).slice(-2);
  const half = ist.getUTCMonth() < 6 ? 'H1' : 'H2';
  return { key: `quotation-${yy}${half}`, prefix: `CC-${yy}${half}-` };
}

export const formatId = (period, seq) => `${period.prefix}${String(seq).padStart(3, '0')}`;

/** Preview of the next ID. Does NOT reserve it. */
export async function peekNextQuotationId() {
  const period = getPeriod();
  const counter = await Counter.findById(period.key).lean();
  let seq = (counter?.seq || 0) + 1;
  // skip IDs that were typed in manually and already exist
  for (let i = 0; i < 50; i++, seq++) {
    const id = formatId(period, seq);
    if (!(await Quotation.exists({ quotationId: id }))) return id;
  }
  return formatId(period, seq);
}

/**
 * Atomically reserve the next ID. findOneAndUpdate + $inc is a single atomic
 * operation in MongoDB, so two simultaneous saves can never receive the same number.
 */
export async function generateQuotationId() {
  const period = getPeriod();
  for (let attempt = 0; attempt < 50; attempt++) {
    let counter;
    try {
      counter = await Counter.findOneAndUpdate(
        { _id: period.key },
        { $inc: { seq: 1 } },
        { upsert: true, returnDocument: 'after' }
      );
    } catch (err) {
      if (err?.code === 11000) continue; // two first-ever upserts raced - just retry
      throw err;
    }
    const id = formatId(period, counter.seq);
    // skip numbers already taken by a manually typed ID
    if (!(await Quotation.exists({ quotationId: id }))) return id;
  }
  throw new Error('Could not generate a unique quotation ID.');
}
