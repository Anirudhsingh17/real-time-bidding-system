import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { toIST, isExpired } from '../utils/time';
import { Clock, Tag, ArrowRight, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function RFQList() {
  const [rfqs, setRfqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/rfq/');
        setRfqs(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
    const interval = setInterval(fetch, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1">Active RFQs</h1>
          <p className="text-text-muted text-sm">Browse and bid on open requests for quotations.</p>
        </div>
        {user && (
          <Link to="/create" className="btn-primary flex items-center gap-2">
            <Plus size={16} /> New RFQ
          </Link>
        )}
      </div>

      {loading ? (
        <div className="text-center py-20 text-text-muted animate-pulse-soft">Loading auctions…</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rfqs.map((rfq) => {
            const expired = rfq.status !== 'ACTIVE' || isExpired(rfq.bid_close_time);
            return (
              <div key={rfq.id} className="glass-panel p-6 hover:border-primary/30 transition-all group flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold truncate pr-2">{rfq.name}</h3>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${expired
                      ? 'bg-error/20 text-error'
                      : 'bg-secondary/20 text-secondary'}`}>
                      {rfq.status}
                    </span>
                    {user && user.id === rfq.creator_id && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                        YOURS
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2 mb-6 flex-1 text-sm text-text-muted">
                  <div className="flex items-center gap-2">
                    <Clock size={15} />
                    <span>Pickup: <span className="text-white">{toIST(rfq.pickup_date)}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={15} />
                    <span>Closes: <span className="text-white">{toIST(rfq.bid_close_time)}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={15} />
                    <span>Hard stop: <span className="text-white">{toIST(rfq.forced_close_time)}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Tag size={15} />
                    <span>Rule: {rfq.extension_trigger_type.replace(/_/g, ' ')}</span>
                  </div>
                </div>

                <Link
                  to={`/rfq/${rfq.id}`}
                  className="flex items-center justify-center gap-2 w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium transition-colors"
                >
                  {expired ? 'View Results' : 'View & Bid'}
                  <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            );
          })}

          {rfqs.length === 0 && (
            <div className="col-span-full py-20 text-center text-text-muted glass-panel">
              No RFQs created yet.{' '}
              {user && <Link to="/create" className="text-primary hover:underline">Create the first one →</Link>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
