import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { API_URL } from '../services/api';
import { toIST, toISTTime, isExpired, secondsUntil, formatCountdown } from '../utils/time';
import { useAuth } from '../context/AuthContext';
import { Timer, AlertTriangle, ArrowDownCircle, Zap, Activity } from 'lucide-react';
import BidModal from '../components/BidModal';
import Toast from '../components/Toast';

const WS_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000')
  .replace('http://', 'ws://')
  .replace('https://', 'wss://');

export default function RFQDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [rfq, setRfq] = useState(null);
  const [bids, setBids] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [auctionClosed, setAuctionClosed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [extended, setExtended] = useState(false);

  const wsRef = useRef(null);
  const pollRef = useRef(null);
  const rfqRef = useRef(null); // live ref for timer

  // ── Fetch all data ──────────────────────────────────────────────────────
  const fetchAll = async () => {
    try {
      const [rfqRes, bidsRes, logsRes] = await Promise.all([
        api.get(`/rfq/${id}`),
        api.get(`/rfq/${id}/bids`),
        api.get(`/rfq/${id}/logs`),
      ]);
      const r = rfqRes.data;
      setRfq(r);
      rfqRef.current = r;
      setBids(bidsRes.data);
      setLogs(logsRes.data);
      // Determine closure from server status + actual UTC time
      const closed = r.status !== 'ACTIVE' || isExpired(r.bid_close_time);
      setAuctionClosed(closed);
      setTimeLeft(secondsUntil(r.bid_close_time));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  // ── WebSocket ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchAll();
    let ws;

    const connect = () => {
      ws = new WebSocket(`${WS_URL}/ws/rfq/${id}`);
      wsRef.current = ws;

      ws.onmessage = (ev) => {
        const data = JSON.parse(ev.data);

        if (data.type === 'NEW_BID') {
          if (data.bids) setBids(data.bids);

          if (data.extended && data.new_close_time) {
            setRfq((prev) => {
              const updated = { ...prev, bid_close_time: data.new_close_time };
              rfqRef.current = updated;
              return updated;
            });
            setExtended(true);
            setToast({ type: 'info', message: '⏰ Auction extended!' });
            setTimeout(() => setExtended(false), 3000);
          }

          // Refresh logs
          api.get(`/rfq/${id}/logs`).then((r) => setLogs(r.data)).catch(() => { });
        }

        if (data.type === 'AUCTION_CLOSED') {
          setAuctionClosed(true);
          setToast({ type: 'error', message: 'Auction has closed.' });
        }
      };

      ws.onclose = () => {
        // Fallback polling
        if (!pollRef.current) {
          pollRef.current = setInterval(fetchAll, 3000);
        }
      };

      ws.onopen = () => {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      };
    };

    connect();
    return () => {
      ws?.close();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [id]);

  // ── Countdown timer ───────────────────────────────────────────────────────
  useEffect(() => {
    const tick = setInterval(() => {
      if (!rfqRef.current) return;
      const secs = secondsUntil(rfqRef.current.bid_close_time);
      setTimeLeft(secs);
      if (secs === 0) setAuctionClosed(true);
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  if (loading) return <div className="text-center py-20 text-text-muted animate-pulse-soft">Loading Live Auction…</div>;
  if (!rfq) return <div className="text-center py-20 text-error">Auction not found.</div>;

  const statusColor = auctionClosed
    ? 'bg-error/10 border-error/40 text-error'
    : extended
      ? 'bg-secondary/10 border-secondary/40'
      : 'bg-primary/10 border-primary/40';

  return (
    <div className="space-y-6">
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}

      {/* ── Header row ──────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row gap-5">
        {/* Info card */}
        <div className="flex-1 glass-panel p-6 space-y-4">
          <div className="flex items-start justify-between">
            <h1 className="text-2xl font-bold">{rfq.name}</h1>
            <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${auctionClosed ? 'bg-error/20 border-error/50 text-error' : 'bg-secondary/20 border-secondary/40 text-secondary'}`}>
              {rfq.status}
            </span>
          </div>
          <p className="text-text-muted text-sm">
            Rule: <span className="text-white">{rfq.extension_trigger_type.replace(/_/g, ' ')}</span>
            {' '}· extend by <span className="text-white">{rfq.extension_duration}m</span>
            {' '}if bid within last <span className="text-white">{rfq.trigger_window}m</span>
          </p>
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/5 text-sm">
            <div>
              <p className="text-xs text-text-muted mb-1">Start Time (IST)</p>
              <p className="font-medium">{toIST(rfq.start_time)}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted mb-1">Pickup Date (IST)</p>
              <p className="font-medium">{toIST(rfq.pickup_date)}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted mb-1">Hard Stop (IST)</p>
              <p className="font-medium">{toIST(rfq.forced_close_time)}</p>
            </div>
          </div>
        </div>

        {/* Timer card */}
        <div className={`glass-panel p-6 flex flex-col items-center justify-center min-w-[280px] border transition-colors duration-700 ${statusColor}`}>
          {auctionClosed
            ? <AlertTriangle size={32} className="text-error mb-3" />
            : extended
              ? <Zap size={32} className="text-secondary mb-3 animate-pulse" />
              : <Timer size={32} className="text-primary mb-3" />
          }
          <div className={`text-4xl font-mono font-bold tracking-widest ${auctionClosed ? 'text-error' : extended ? 'text-secondary' : ''}`}>
            {formatCountdown(timeLeft)}
          </div>
          {extended && !auctionClosed && (
            <p className="text-secondary text-xs font-semibold mt-1 animate-pulse">EXTENDED</p>
          )}
          <p className="text-xs text-text-muted mt-2">
            Closes {toISTTime(rfq.bid_close_time)} IST
          </p>
        </div>
      </div>

      {/* ── Bids section ─────────────────────────────────────────────────── */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <ArrowDownCircle className="text-secondary" size={22} />
          Live Bids
        </h2>
        {!auctionClosed && (
          user
            ? (user.id === rfq.creator_id
              ? <button disabled className="btn-primary opacity-50 cursor-not-allowed">Your Auction</button>
              : <button onClick={() => setShowModal(true)} className="btn-primary">Place Bid</button>
            )
            : <button onClick={() => navigate('/login')} className="btn-primary">Login to Bid</button>
        )}
      </div>

      <div className="glass-panel overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-text-muted text-xs uppercase tracking-wider">
            <tr>
              <th className="px-5 py-3 font-medium">Rank</th>
              <th className="px-5 py-3 font-medium">Supplier</th>
              <th className="px-5 py-3 font-medium">Transit</th>
              <th className="px-5 py-3 font-medium text-right">Total Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {bids.map((bid) => (
              <tr key={bid.id} className="hover:bg-white/5 transition-colors">
                <td className="px-5 py-4">
                  <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold ${bid.rank === 'L1' ? 'bg-secondary/20 text-secondary' : 'bg-white/10 text-text-muted'}`}>
                    {bid.rank}
                  </span>
                </td>
                <td className="px-5 py-4 font-medium">{bid.supplier_name}</td>
                <td className="px-5 py-4 text-text-muted">{bid.transit_time}</td>
                <td className="px-5 py-4 text-right font-mono font-bold text-lg">
                  ₹{bid.total_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
            {bids.length === 0 && (
              <tr>
                <td colSpan="4" className="px-5 py-10 text-center text-text-muted">
                  No bids yet — {!auctionClosed && 'be the first!'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Activity log ─────────────────────────────────────────────────── */}
      {logs.length > 0 && (
        <div className="glass-panel p-5">
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
            <Activity size={16} /> Activity Log
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 text-sm">
                <span className={`mt-0.5 shrink-0 w-2 h-2 rounded-full ${log.event_type === 'EXTENSION' ? 'bg-secondary' : log.event_type === 'STATUS_CHANGE' ? 'bg-error' : 'bg-primary'}`} />
                <div className="flex-1">
                  <span>{log.message}</span>
                  <span className="text-text-muted ml-2 text-xs">{toIST(log.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showModal && (
        <BidModal
          rfqId={id}
          currentL1={bids[0]?.total_price}
          onClose={() => setShowModal(false)}
          onSuccess={(msg) => {
            setToast({ type: 'success', message: msg });
            setShowModal(false);
          }}
          onError={(msg) => setToast({ type: 'error', message: msg })}
        />
      )}
    </div>
  );
}
