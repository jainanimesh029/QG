import mongoose from 'mongoose';
import { GST_TYPES, PAYMENT_TERMS, PRICE_TYPES } from '../lib/constants';

const { Schema } = mongoose;

// Snapshot of the component at the time of quoting, so later price edits
// (or deletion) of the component never change an existing quotation.
const ItemSchema = new Schema(
  {
    componentId: { type: Schema.Types.ObjectId, ref: 'Component' },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, default: '' },
    priceType: { type: String, enum: Object.values(PRICE_TYPES), default: PRICE_TYPES.RETAIL },
    // both prices are kept so the price type can still be switched when editing
    bulkPrice: { type: Number, default: 0 },
    retailPrice: { type: Number, default: 0 },
    unitPrice: { type: Number, required: true },
    lineTotal: { type: Number, required: true },
  },
  { _id: false }
);

const MilestoneSchema = new Schema(
  {
    label: String,
    percent: Number,
    amount: Number,
  },
  { _id: false }
);

const QuotationSchema = new Schema(
  {
    quotationId: { type: String, required: true, unique: true, trim: true },
    quotationDate: { type: Date, required: true },
    validUntil: { type: Date, required: true },
    clientName: { type: String, required: true, trim: true },
    deliveryTarget: { type: Date },
    estimatedDuration: { type: String, default: '' },
    projectOverview: { type: String, default: '' },
    scope: { type: [String], default: [] },
    components: { type: [ItemSchema], default: [] },
    subtotal: { type: Number, default: 0 },
    additionalCharges: { type: Number, default: 0 },
    finalPrice: { type: Number, default: 0 },
    isPriceOverridden: { type: Boolean, default: false },
    gstType: { type: String, enum: Object.values(GST_TYPES), default: GST_TYPES.NA },
    gstRate: { type: Number, default: 18 },
    gstAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    paymentTerms: { type: String, enum: Object.values(PAYMENT_TERMS), default: PAYMENT_TERMS.SPLIT },
    milestones: { type: [MilestoneSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.models.Quotation || mongoose.model('Quotation', QuotationSchema);
