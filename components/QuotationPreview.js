import { formatDate, formatINR } from '@/lib/format';
import { gstSummaryRows, quantityText } from '@/lib/summary';
import styles from './QuotationPreview.module.css';

/** On-screen version of the client PDF (same sections, no per-item prices). */
export default function QuotationPreview({ quotation: q }) {
  const summaryRows = gstSummaryRows(q);

  return (
    <article className={styles.doc}>
      <h3 className={styles.title}>CLIENT QUOTATION</h3>

      <dl className={styles.details}>
        <div>
          <dt>Quotation ID</dt>
          <dd>{q.quotationId}</dd>
        </div>
        <div>
          <dt>Quotation Date</dt>
          <dd>{formatDate(q.quotationDate)}</dd>
        </div>
        <div>
          <dt>Client</dt>
          <dd>{q.clientName}</dd>
        </div>
        <div>
          <dt>Valid Until</dt>
          <dd>{formatDate(q.validUntil)}</dd>
        </div>
        <div>
          <dt>Delivery Target</dt>
          <dd>{formatDate(q.deliveryTarget)}</dd>
        </div>
        <div>
          <dt>Estimated Duration</dt>
          <dd>{q.estimatedDuration || '-'}</dd>
        </div>
      </dl>

      <h4 className={styles.heading}>Project Overview</h4>
      <p className={styles.overview}>{q.projectOverview || '-'}</p>

      {q.scope?.length > 0 && (
        <>
          <h4 className={styles.heading}>Scope &amp; Deliverables</h4>
          <ul className={styles.list}>
            {q.scope.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </>
      )}

      {q.components?.length > 0 && (
        <>
          <h4 className={styles.heading}>Components Included</h4>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Component</th>
                  <th className="num">Quantity</th>
                </tr>
              </thead>
              <tbody>
                {q.components.map((c, i) => (
                  <tr key={i}>
                    <td>{c.name}</td>
                    <td className="num">{quantityText(c)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h4 className={styles.heading}>Quotation Summary</h4>
      <div className={styles.price}>
        <span>Final Project Price</span>
        <strong>{formatINR(q.finalPrice)}</strong>
      </div>
      <div className="table-wrap">
        <table className="table">
          <tbody>
            {summaryRows.map((row, i) => (
              <tr key={i} className={row.strong ? styles.strongRow : undefined}>
                <td>{row.label}</td>
                <td className="num">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h4 className={styles.heading}>Payment Terms</h4>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Payment Milestone</th>
              <th className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {q.milestones?.map((m, i) => (
              <tr key={i}>
                <td>
                  {m.label} ({m.percent}%)
                </td>
                <td className="num">{formatINR(m.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}
