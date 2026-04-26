import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { utctoISTLocal, parseLocalAsIST } from '../utils/time';

export default function RFQCreate() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const now = new Date();

  const [form, setForm] = useState({
    name: '',
    start_time: utctoISTLocal(now.toISOString()),
    pickup_date: utctoISTLocal(new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()),
    bid_close_time: utctoISTLocal(new Date(now.getTime() + 60 * 60 * 1000).toISOString()),
    forced_close_time: utctoISTLocal(new Date(now.getTime() + 120 * 60 * 1000).toISOString()),
    trigger_window: 5,
    extension_duration: 5,
    extension_trigger_type: 'ANY_BID',
  });

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }

    const startUTC = parseLocalAsIST(form.start_time);
    const pickupUTC = parseLocalAsIST(form.pickup_date);
    const closeUTC = parseLocalAsIST(form.bid_close_time);
    const forcedUTC = parseLocalAsIST(form.forced_close_time);

    if (new Date(forcedUTC) <= new Date(closeUTC)) {
      setError('Forced close time must be after the initial close time.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const payload = {
        ...form,
        start_time: startUTC,
        pickup_date: pickupUTC,
        bid_close_time: closeUTC,
        forced_close_time: forcedUTC,
        trigger_window: parseInt(form.trigger_window),
        extension_duration: parseInt(form.extension_duration),
      };
      const res = await api.post('/rfq/', payload);
      navigate(`/rfq/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Create New RFQ</h1>

      <form onSubmit={handleSubmit} className="glass-panel p-8 space-y-6">
        {error && (
          <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="label-text">Auction Name</label>
          <input required name="name" value={form.name} onChange={handleChange}
            className="input-field w-full" placeholder="e.g. Q3 Logistics Contract" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-text">Start Time (Local)</label>
            <input required type="datetime-local" name="start_time" value={form.start_time}
              onChange={handleChange} className="input-field w-full" />
          </div>
          <div>
            <label className="label-text">Pickup Date (Local)</label>
            <input required type="datetime-local" name="pickup_date" value={form.pickup_date}
              onChange={handleChange} className="input-field w-full" />
          </div>
          <div>
            <label className="label-text">Initial Close Time (Local)</label>
            <input required type="datetime-local" name="bid_close_time" value={form.bid_close_time}
              onChange={handleChange} className="input-field w-full" />
          </div>
        </div>

        <div>
          <label className="label-text">Forced Close Time (Hard Limit)</label>
          <input required type="datetime-local" name="forced_close_time" value={form.forced_close_time}
            onChange={handleChange} className="input-field w-full" />
          <p className="text-xs text-text-muted mt-1">
            Auction can never be extended beyond this point.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-text">Trigger Window (min)</label>
            <input required type="number" min="1" name="trigger_window" value={form.trigger_window}
              onChange={handleChange} className="input-field w-full" />
            <p className="text-xs text-text-muted mt-1">Check extension within last X min.</p>
          </div>
          <div>
            <label className="label-text">Extension Duration (min)</label>
            <input required type="number" min="1" name="extension_duration" value={form.extension_duration}
              onChange={handleChange} className="input-field w-full" />
            <p className="text-xs text-text-muted mt-1">Add Y minutes if triggered.</p>
          </div>
        </div>

        <div>
          <label className="label-text">Extension Trigger Rule</label>
          <select name="extension_trigger_type" value={form.extension_trigger_type}
            onChange={handleChange} className="input-field w-full bg-surface">
            <option value="ANY_BID">Any Bid — any bid within trigger window extends time</option>
            <option value="L1_CHANGE">L1 Change — only a new lowest price extends time</option>
            <option value="ANY_RANK_CHANGE">Any Rank Change — any rank shift extends time</option>
          </select>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Launching…' : 'Launch Auction'}
        </button>
      </form>
    </div>
  );
}
