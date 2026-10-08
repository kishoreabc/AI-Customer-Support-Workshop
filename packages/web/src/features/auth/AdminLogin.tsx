import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { ShieldCheck, ArrowRight, Lock, Mail } from 'lucide-react';

export const AdminLogin: React.FC = () => {
  const [email, setEmail] = useState('admin@company.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { loginAdmin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await loginAdmin(email, password);
      navigate('/admin');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (role: 'admin' | 'agent') => {
    if (role === 'admin') {
      setEmail('admin@company.com');
      setPassword('admin123');
    } else {
      setEmail('sarah.agent@company.com');
      setPassword('agent123');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '36px', borderColor: 'rgba(168, 85, 247, 0.3)' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div className="brand-badge" style={{ margin: '0 auto 16px auto', width: '52px', height: '52px', background: 'linear-gradient(135deg, #a855f7, #6366f1)' }}>
            <ShieldCheck size={28} />
          </div>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '6px' }}>Staff & Admin Access</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Restricted portal for Operations, IT Administrators, and Support Agents.
          </p>
        </div>

        {error && (
          <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#fecdd3', padding: '12px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginBottom: '18px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Staff Work Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="email"
                className="input"
                style={{ paddingLeft: '38px' }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="password"
                className="input"
                style={{ paddingLeft: '38px' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '8px', background: 'linear-gradient(135deg, #a855f7, #6366f1)' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Enter Admin Panel'} <ArrowRight size={16} />
          </button>
        </form>

        <div style={{ marginTop: '20px', padding: '14px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>Demo Role Credentials:</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleQuickFill('admin')}>
              Fill Admin
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleQuickFill('agent')}>
              Fill Support Agent
            </button>
          </div>
        </div>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <Link to="/login" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            ← Back to Customer Portal
          </Link>
        </div>
      </div>
    </div>
  );
};
