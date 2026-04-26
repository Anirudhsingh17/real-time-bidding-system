import { useState } from 'react';
import api from '../services/api';
import { X } from 'lucide-react';
import { utctoISTLocal, parseLocalAsIST } from '../utils/time';

export default function BidModal({ rfqId, currentL1, onClose, onSuccess, onError }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    supplier_name: '',
    freight_charges: '',
    origin_charges: '',
    destination_charges: '',
    transit_time: '',
    quote_validity: utctoISTLocal(new Date(Date.now() + 7 * 86400000).toISOString()),
  });

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const total =
    parseFloat(form.freight_charges || 0) +
    parseFloat(form.origin_charges || 0) +
    parseFloat(form.destination_charges || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (currentL1 !== undefined && total >= currentL1) {
      onError && onError(`Your total (₹${total.toFixed(2)}) must be strictly below current L1 (₹${currentL1.toFixed(2)})`);
      return;
    }

    setLoading(true);
    try {
      await api.post('/bid/', {
        rfq_id: rfqId,
        supplier_name: form.supplier_name,
        freight_charges: parseFloat(form.freight_charges),
        origin_charges: parseFloat(form.origin_charges),
        destination_charges: parseFloat(form.destination_charges),
        transit_time: form.transit_time,
        quote_validity: parseLocalAsIST(form.quote_validity),
      });
      onSuccess && onSuccess('✅ Bid placed successfully!');
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (err.response?.status === 401) {
        onError && onError('You must be logged in to place a bid.');
      } else {
        onError && onError(detail || 'Failed to submit bid.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="glass-panel w-full max-w-lg border border-white/20 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-white/10">
          <h3 className="font-semibold text-lg">Place a Bid</h3>
          <button onClick={onClose} className="text-text-muted hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {currentL1 !== undefined && (
            <div className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 text-sm">
              Current L1 bid: <span className="font-bold text-secondary">₹{currentL1.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              <span className="text-text-muted ml-1">— your bid must be lower</span>
            </div>
          )}

          <div>
            <label className="label-text">Supplier / Company Name</label>
            <input required autoFocus name="supplier_name" value={form.supplier_name}
              onChange={handleChange} className="input-field w-full" placeholder="Acme Logistics Pvt. Ltd." />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label-text">Freight (₹)</label>
              <input required type="number" min="0" step="0.01" name="freight_charges"
                value={form.freight_charges} onChange={handleChange} className="input-field w-full" placeholder="0.00" />
            </div>
            <div>
              <label className="label-text">Origin (₹)</label>
              <input required type="number" min="0" step="0.01" name="origin_charges"
                value={form.origin_charges} onChange={handleChange} className="input-field w-full" placeholder="0.00" />
            </div>
            <div>
              <label className="label-text">Destination (₹)</label>
              <input required type="number" min="0" step="0.01" name="destination_charges"
                value={form.destination_charges} onChange={handleChange} className="input-field w-full" placeholder="0.00" />
            </div>
          </div>

          {/* Live total */}
          <div className="bg-white/5 rounded-xl px-4 py-3 flex justify-between items-center">
            <span className="text-text-muted text-sm">Calculated Total</span>
            <span className="font-mono font-bold text-xl text-secondary">
              ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text">Transit Time</label>
              <input required name="transit_time" value={form.transit_time}
                onChange={handleChange} className="input-field w-full" placeholder="e.g. 15 Days" />
            </div>
            <div>
              <label className="label-text">Quote Valid Until</label>
              <input required type="datetime-local" name="quote_validity"
                value={form.quote_validity} onChange={handleChange} className="input-field w-full" />
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="btn-primary w-full shadow-lg shadow-primary/20">
            {loading ? 'Submitting…' : 'Confirm & Submit Bid'}
          </button>
        </form>
      </div>
    </div>
  );
}
