import mongoose from 'mongoose';

// One document per half-year, e.g. { _id: "quotation-26H1", seq: 24 }
const CounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

export default mongoose.models.Counter || mongoose.model('Counter', CounterSchema);
