import mongoose from 'mongoose';

const ComponentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    bulkPrice: { type: Number, required: true, min: 0 },
    retailPrice: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

// Case-insensitive unique name ("power supply" == "Power Supply")
ComponentSchema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

export default mongoose.models.Component || mongoose.model('Component', ComponentSchema);
