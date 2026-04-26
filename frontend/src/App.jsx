import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { Layers, LogOut, User as UserIcon } from 'lucide-react';
import RFQList from './pages/RFQList';
import RFQCreate from './pages/RFQCreate';
import RFQDetail from './pages/RFQDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import { AuthProvider, useAuth } from './context/AuthContext';
import api from './services/api';
import { syncServerTime } from './utils/time';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="border-b border-white/10 bg-surface/60 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-xl font-semibold hover:text-primary transition-colors">
          <Layers className="text-primary" />
          <span>Apex Auction</span>
        </Link>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <UserIcon size={16} className="text-primary" />
                <span className="font-medium text-white">{user.name}</span>
              </div>
              <Link to="/create" className="btn-primary text-sm">Create RFQ</Link>
              <button onClick={handleLogout} title="Logout"
                className="p-2 rounded-xl hover:bg-white/10 text-text-muted hover:text-error transition-colors">
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm text-text-muted hover:text-white transition-colors px-3 py-2">Login</Link>
              <Link to="/register" className="btn-primary text-sm">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function App() {
  useEffect(() => {
    // Initial clock sync
    api.get('/health')
      .then(res => {
        if (res.data?.time_utc) {
          syncServerTime(res.data.time_utc);
        }
      })
      .catch(console.error);
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full animate-fade-in">
            <Routes>
              <Route path="/" element={<RFQList />} />
              <Route path="/create" element={<RFQCreate />} />
              <Route path="/rfq/:id" element={<RFQDetail />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
