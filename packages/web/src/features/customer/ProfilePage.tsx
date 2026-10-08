import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../api/client.js';
import { LoadingState } from '../../components/LoadingState.js';
import { StatusBadge } from '../../components/StatusBadge.js';
import { User, Save, Check } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  useEffect(() => {
    if (user?.customerId) {
      loadProfile(user.customerId);
    }
  }, [user]);

  const loadProfile = async (customerId: string) => {
    setLoading(true);
    try {
      const data = await api.get<any>(`/api/v1/customers/${customerId}`);
      setProfile(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setSuccessMsg(false);

    try {
      await api.put(`/api/v1/customers/${profile.customer_id}`, {
        firstName: profile.first_name,
        lastName: profile.last_name,
        phone: profile.phone,
        address: profile.address,
        city: profile.city,
        state: profile.state,
        country: profile.country,
        postalCode: profile.postal_code,
      });
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !profile) {
    return <LoadingState message="Loading your account profile..." />;
  }

  return (
    <div className="page-container" style={{ maxWidth: '800px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Customer Profile</h1>
          <p className="page-subtitle">Manage personal and delivery information for customer support verification.</p>
        </div>
      </div>

      {successMsg && (
        <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', padding: '12px 18px', borderRadius: 'var(--radius-md)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Check size={18} /> Profile details saved successfully!
        </div>
      )}

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div className="avatar-circle" style={{ width: '56px', height: '56px', fontSize: '1.4rem' }}>
              {profile.first_name?.[0] || 'C'}
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem' }}>{profile.first_name} {profile.last_name}</h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{profile.email}</span>
                <StatusBadge status={profile.customer_status} />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">First Name</label>
              <input
                type="text"
                name="first_name"
                className="input"
                value={profile.first_name || ''}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Last Name</label>
              <input
                type="text"
                name="last_name"
                className="input"
                value={profile.last_name || ''}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Contact Phone</label>
              <input
                type="text"
                name="phone"
                className="input"
                value={profile.phone || ''}
                onChange={handleChange}
                placeholder="+1 (555) 000-0000"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Customer ID (Read-only)</label>
              <input
                type="text"
                className="input"
                value={profile.customer_id}
                disabled
                style={{ opacity: 0.6 }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Street Delivery Address</label>
            <input
              type="text"
              name="address"
              className="input"
              value={profile.address || ''}
              onChange={handleChange}
              placeholder="123 Example Street, Apt 4"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">City</label>
              <input
                type="text"
                name="city"
                className="input"
                value={profile.city || ''}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">State / Region</label>
              <input
                type="text"
                name="state"
                className="input"
                value={profile.state || ''}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Postal Code</label>
              <input
                type="text"
                name="postal_code"
                className="input"
                value={profile.postal_code || ''}
                onChange={handleChange}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Save size={16} /> {saving ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
