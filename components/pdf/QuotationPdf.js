import { Document, Font, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import company from '../../lib/company';
import { formatDate, formatINR } from '../../lib/format';
import { gstSummaryRows, quantityText } from '../../lib/summary';

const NAVY = '#1e3a5f';
const HEADER_BG = '#dde6f0';
const BORDER = '#c5d2e0';
const TEXT = '#1c2733';
const MUTED = '#5b6b7c';

let fontsRegistered = false;

/**
 * Registers a font that contains the rupee sign (₹) and subscript digits (₂);
 * the built-in PDF fonts (Helvetica etc.) render these as black boxes.
 * `baseUrl` is where /fonts/*.ttf is served from (the site origin in the browser).
 */
export function registerPdfFonts(baseUrl = '') {
  if (fontsRegistered) return;
  Font.register({
    family: 'NotoSans',
    fonts: [
      { src: `${baseUrl}/fonts/NotoSans-Regular.ttf`, fontWeight: 400 },
      { src: `${baseUrl}/fonts/NotoSans-Bold.ttf`, fontWeight: 700 },
    ],
  });
  Font.registerHyphenationCallback((word) => [word]); // never split words mid-way
  fontsRegistered = true;
}

const s = StyleSheet.create({
  page: {
    fontFamily: 'NotoSans',
    fontSize: 10,
    color: TEXT,
    paddingTop: 36,
    paddingBottom: 56,
    paddingHorizontal: 40,
    lineHeight: 1.4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: NAVY,
  },
  companyName: { fontSize: 16, fontWeight: 700, color: NAVY },
  tagline: { fontSize: 9, color: MUTED, marginTop: 5 },
  contact: { fontSize: 8.5, color: MUTED, textAlign: 'right', lineHeight: 1.5 },
  title: {
    marginTop: 18,
    marginBottom: 14,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 700,
    color: NAVY,
    letterSpacing: 2,
  },
  sectionHeading: {
    marginTop: 16,
    marginBottom: 6,
    fontSize: 12,
    fontWeight: 700,
    color: NAVY,
  },
  table: { borderWidth: 1, borderColor: BORDER },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: BORDER },
  trLast: { borderBottomWidth: 0 },
  th: { backgroundColor: HEADER_BG, color: NAVY, fontWeight: 700, padding: 6 },
  td: { padding: 6 },
  detailLabel: {
    width: '18%',
    backgroundColor: HEADER_BG,
    color: NAVY,
    fontWeight: 700,
    padding: 6,
  },
  detailValue: { width: '32%', padding: 6 },
  paragraph: { textAlign: 'left' },
  bulletRow: { flexDirection: 'row', marginBottom: 3 },
  bullet: { width: 12, color: NAVY },
  bulletText: { flex: 1 },
  priceBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: HEADER_BG,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 10,
  },
  priceLabel: { fontSize: 12, fontWeight: 700, color: NAVY },
  priceValue: { fontSize: 20, fontWeight: 700, color: NAVY },
  strong: { fontWeight: 700 },
  footer: {
    position: 'absolute',
    left: 40,
    right: 40,
    bottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: MUTED,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 6,
  },
});

function DetailsRow({ a, b, last }) {
  return (
    <View style={last ? [s.tr, s.trLast] : s.tr} wrap={false}>
      <Text style={s.detailLabel}>{a[0]}</Text>
      <Text style={s.detailValue}>{a[1]}</Text>
      <Text style={s.detailLabel}>{b[0]}</Text>
      <Text style={s.detailValue}>{b[1]}</Text>
    </View>
  );
}

export default function QuotationPdf({ quotation: q }) {
  const contactLines = [
    ...company.addressLines,
    [company.phone, company.email].filter(Boolean).join('  |  '),
    company.website,
    company.gstin ? `GSTIN: ${company.gstin}` : '',
  ].filter(Boolean);
  const summaryRows = gstSummaryRows(q);
  const scope = q.scope || [];
  const components = q.components || [];
  const milestones = q.milestones || [];

  return (
    <Document title={`${q.quotationId} - ${q.clientName}`} author={company.name}>
      <Page size="A4" style={s.page}>
        <View style={s.header} fixed>
          <View>
            <Text style={s.companyName}>{company.name}</Text>
            {!!company.tagline && <Text style={s.tagline}>{company.tagline}</Text>}
          </View>
          <View>
            {contactLines.map((line, i) => (
              <Text key={i} style={s.contact}>
                {line}
              </Text>
            ))}
          </View>
        </View>

        <Text style={s.title}>CLIENT QUOTATION</Text>

        {/* 1. Details */}
        <View style={s.table}>
          <DetailsRow
            a={['Quotation ID', q.quotationId]}
            b={['Quotation Date', formatDate(q.quotationDate)]}
          />
          <DetailsRow a={['Client', q.clientName]} b={['Valid Until', formatDate(q.validUntil)]} />
          <DetailsRow
            a={['Delivery Target', formatDate(q.deliveryTarget)]}
            b={['Estimated Duration', q.estimatedDuration || '-']}
            last
          />
        </View>

        {/* 2. Project overview */}
        <Text style={s.sectionHeading}>Project Overview</Text>
        <Text style={s.paragraph}>{q.projectOverview || '-'}</Text>

        {/* 3. Scope */}
        {scope.length > 0 && (
          <>
            <Text style={s.sectionHeading}>Scope &amp; Deliverables</Text>
            {scope.map((item, i) => (
              <View key={i} style={s.bulletRow} wrap={false}>
                <Text style={s.bullet}>•</Text>
                <Text style={s.bulletText}>{item}</Text>
              </View>
            ))}
          </>
        )}

        {/* 4. Components (no prices shown to the client) */}
        {components.length > 0 && (
          <>
            <Text style={s.sectionHeading}>Components Included</Text>
            <View style={s.table}>
              <View style={s.tr} wrap={false}>
                <Text style={[s.th, { width: '75%' }]}>Component</Text>
                <Text style={[s.th, { width: '25%' }]}>Quantity</Text>
              </View>
              {components.map((c, i) => (
                <View
                  key={i}
                  style={i === components.length - 1 ? [s.tr, s.trLast] : s.tr}
                  wrap={false}
                >
                  <Text style={[s.td, { width: '75%' }]}>{c.name}</Text>
                  <Text style={[s.td, { width: '25%' }]}>{quantityText(c)}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* 5. Summary */}
        <View wrap={false}>
          <Text style={s.sectionHeading}>Quotation Summary</Text>
          <View style={s.priceBox}>
            <Text style={s.priceLabel}>Final Project Price</Text>
            <Text style={s.priceValue}>{formatINR(q.finalPrice)}</Text>
          </View>
          <View style={[s.table, { borderTopWidth: 0 }]}>
            {summaryRows.map((row, i) => (
              <View
                key={i}
                style={i === summaryRows.length - 1 ? [s.tr, s.trLast] : s.tr}
                wrap={false}
              >
                <Text style={[s.td, { width: '65%' }, row.strong && s.strong]}>{row.label}</Text>
                <Text style={[s.td, { width: '35%', textAlign: 'right' }, row.strong && s.strong]}>
                  {row.value}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* 6. Payment terms */}
        <View wrap={false}>
          <Text style={s.sectionHeading}>Payment Terms</Text>
          <View style={s.table}>
            <View style={s.tr}>
              <Text style={[s.th, { width: '65%' }]}>Payment Milestone</Text>
              <Text style={[s.th, { width: '35%', textAlign: 'right' }]}>Amount</Text>
            </View>
            {milestones.map((m, i) => (
              <View
                key={i}
                style={i === milestones.length - 1 ? [s.tr, s.trLast] : s.tr}
              >
                <Text style={[s.td, { width: '65%' }]}>{`${m.label} (${m.percent}%)`}</Text>
                <Text style={[s.td, { width: '35%', textAlign: 'right' }]}>
                  {formatINR(m.amount)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text>{company.footerNote || company.name}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
