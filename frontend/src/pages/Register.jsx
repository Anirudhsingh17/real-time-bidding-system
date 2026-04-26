import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/register', form);
      const { access_token, id, name, email } = res.data;
      login({ id, name, email }, access_token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto pt-12">
      <h1 className="text-3xl font-bold mb-6 text-center">Create Account</h1>
      <form onSubmit={handleSubmit} className="glass-panel p-8 space-y-6">
        {error && (
          <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}
        <div>
          <label className="label-text">Full Name</label>
          <input required name="name" value={form.name} onChange={handleChange}
            className="input-field w-full" placeholder="John Doe" />
        </div>
        <div>
          <label className="label-text">Email Address</label>
          <input required type="email" name="email" value={form.email} onChange={handleChange}
            className="input-field w-full" placeholder="you@example.com" />
        </div>
        <div>
          <label className="label-text">Password</label>
          <input required type="password" name="password" value={form.password} onChange={handleChange}
            className="input-field w-full" placeholder="••••••••" />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Creating account…' : 'Register Now'}
        </button>
        <p className="text-center text-sm text-text-muted">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:underline font-medium">Sign In</Link>
        </p>
      </form>
    </div>
  );
}
