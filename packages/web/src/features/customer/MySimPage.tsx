import React, { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import { LoadingState } from '../../components/LoadingState.js';
import { StatusBadge } from '../../components/StatusBadge.js';
import {
  Smartphone,
  QrCode,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Radio,
  Wifi,
  PhoneCall,
  KeyRound,
  X,
  Copy,
} from 'lucide-react';

interface SimCard {
  sim_id: string;
  customer_id: string;
  phone_number: string;
  iccid: string;
  imsi: string;
  sim_type: 'PHYSICAL_SIM' | 'ESIM';
  status: 'ACTIVE' | 'SUSPENDED' | 'BLOCKED';
  activated_at: string;
}

export const MySimPage: React.FC = () => {
  const [sim, setSim] = useState<SimCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEsimModal, setShowEsimModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [converting, setConverting] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [esimResult, setEsimResult] = useState<any | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    loadSim();
  }, []);

  const loadSim = async () => {
    try {
      const res = await api.get<SimCard | null>('/api/v1/sims/me');
      setSim(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConvertToEsim = async () => {
    setConverting(true);
    setFeedback(null);
    try {
      const res = await api.post<any>('/api/v1/sims/convert-esim', {});
      setEsimResult(res);
      await loadSim();
      setFeedback('eSIM activation profile issued successfully! Scan the QR code or enter code manually.');
    } catch (err: any) {
      setFeedback(err.message || 'Failed to generate eSIM profile.');
    } finally {
      setConverting(false);
    }
  };

  const handleBlockSim = async () => {
    setBlocking(true);
    setFeedback(null);
    try {
      const res = await api.post<any>('/api/v1/sims/block', {});
      await loadSim();
      setShowBlockModal(false);
      setFeedback(res.message || 'SIM card has been emergency blocked.');
    } catch (err: any) {
      setFeedback(err.message || 'Failed to block SIM.');
    } finally {
      setBlocking(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (loading) {
    return <LoadingState message="Connecting to HLR/HSS SIM registry..." />;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">My SIM & eSIM Management</h1>
          <p className="page-subtitle">Cellular identity profiles, seamless eSIM upgrade, network provisioning, and security controls</p>
        </div>
      </div>

      {feedback && (
        <div
          className="card"
          style={{
            marginBottom: '20px',
            background: feedback.includes('successfully') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
            borderColor: feedback.includes('successfully') ? 'var(--accent-emerald)' : 'var(--accent-rose)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          {feedback.includes('successfully') ? (
            <CheckCircle2 size={20} style={{ color: 'var(--accent-emerald)', flexShrink: 0 }} />
          ) : (
            <AlertTriangle size={20} style={{ color: 'var(--accent-rose)', flexShrink: 0 }} />
          )}
          <span style={{ fontSize: '0.9rem' }}>{feedback}</span>
        </div>
      )}

      {!sim ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <Smartphone size={40} style={{ opacity: 0.3, marginBottom: '16px' }} />
          <h3>No Registered SIM Found</h3>
          <p style={{ color: 'var(--text-secondary)' }}>No active cellular subscriber profile linked to this account.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '24px' }}>
          {/* Main SIM Information Card */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(6, 182, 212, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-cyan)',
                  }}
                >
                  <Smartphone size={24} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem' }}>{sim.phone_number}</h2>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                    <span className={`badge ${sim.sim_type === 'ESIM' ? 'badge-primary' : 'badge-info'}`}>
                      {sim.sim_type === 'ESIM' ? 'Digital eSIM' : 'Physical Nano-SIM'}
                    </span>
                    <StatusBadge status={sim.status} />
                  </div>
                </div>
              </div>

              {sim.status === 'BLOCKED' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-rose)', fontSize: '0.85rem' }}>
                  <Lock size={16} /> Blocked for Security
                </div>
              ) : (
                <button
                  className="btn btn-danger"
                  style={{ fontSize: '0.82rem', padding: '6px 12px' }}
                  onClick={() => setShowBlockModal(true)}
                >
                  <ShieldAlert size={15} /> Emergency Block
                </button>
              )}
            </div>

            {/* Hardware Identifiers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
              <div style={{ background: 'var(--bg-input)', padding: '14px', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>ICCID (SIM SERIAL)</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 600 }}>{sim.iccid}</div>
              </div>

              <div style={{ background: 'var(--bg-input)', padding: '14px', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>IMSI (NETWORK ID)</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 600 }}>{sim.imsi}</div>
              </div>

              <div style={{ background: 'var(--bg-input)', padding: '14px', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>SIM STATUS</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: sim.status === 'ACTIVE' ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                  {sim.status === 'ACTIVE' ? 'Active on 5G Standalone Core' : 'Cellular Service Suspended'}
                </div>
              </div>

              <div style={{ background: 'var(--bg-input)', padding: '14px', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>ACTIVATED ON</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{new Date(sim.activated_at).toLocaleDateString()}</div>
              </div>
            </div>

            {/* Cellular Capability Matrix */}
            <h3 style={{ fontSize: '1rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Radio size={16} style={{ color: 'var(--accent-cyan)' }} /> Cellular Capabilities
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div style={{ border: '1px solid var(--border-subtle)', padding: '12px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <Radio size={20} style={{ color: 'var(--accent-cyan)', marginBottom: '6px' }} />
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>5G SA True Core</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--accent-emerald)' }}>Active & Ready</div>
              </div>

              <div style={{ border: '1px solid var(--border-subtle)', padding: '12px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <PhoneCall size={20} style={{ color: 'var(--accent-emerald)', marginBottom: '6px' }} />
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>HD VoLTE Voice</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--accent-emerald)' }}>Provisioned</div>
              </div>

              <div style={{ border: '1px solid var(--border-subtle)', padding: '12px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <Wifi size={20} style={{ color: 'var(--accent-primary)', marginBottom: '6px' }} />
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Wi-Fi Calling</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--accent-emerald)' }}>Supported</div>
              </div>
            </div>
          </div>

          {/* Right Column: eSIM conversion / Security */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Convert to eSIM Card */}
            <div
              className="card"
              style={{
                background: sim.sim_type === 'ESIM'
                  ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(16, 21, 34, 0.9))'
                  : 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(16, 21, 34, 0.9))',
                borderColor: sim.sim_type === 'ESIM' ? 'var(--accent-cyan)' : 'var(--accent-primary)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <QrCode size={22} style={{ color: 'var(--accent-cyan)' }} />
                <h3 style={{ fontSize: '1.1rem' }}>
                  {sim.sim_type === 'ESIM' ? 'eSIM Active Profile' : 'Upgrade to Instant eSIM'}
                </h3>
              </div>

              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                {sim.sim_type === 'ESIM'
                  ? 'Your subscription is operating as a digital eSIM. You can re-download profile or transfer to another phone.'
                  : 'Convert your physical SIM card to an embedded eSIM in under 2 minutes. No physical store visit required.'}
              </p>

              <button
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => setShowEsimModal(true)}
              >
                <QrCode size={16} />
                {sim.sim_type === 'ESIM' ? 'View eSIM Setup Details' : 'Convert to eSIM Instantly'}
              </button>
            </div>

            {/* PUK & Security Code Card */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <KeyRound size={20} style={{ color: 'var(--accent-amber)' }} />
                <h3 style={{ fontSize: '1.05rem' }}>SIM PIN & PUK Codes</h3>
              </div>

              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                If your device asks for a PUK code after incorrect PIN attempts, use the official carrier codes below:
              </p>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1, background: 'var(--bg-input)', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>PUK 1 CODE</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--accent-cyan)' }}>
                    48291055
                  </div>
                </div>

                <div style={{ flex: 1, background: 'var(--bg-input)', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>DEFAULT PIN</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.95rem' }}>
                    1234
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Convert to eSIM Modal */}
      {showEsimModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            padding: '20px',
            backdropFilter: 'var(--backdrop-blur)',
          }}
          onClick={() => setShowEsimModal(false)}
        >
          <div
            className="card"
            style={{
              maxWidth: '540px',
              width: '100%',
              background: 'var(--bg-secondary)',
              borderColor: 'var(--border-active)',
              boxShadow: 'var(--shadow-lg)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <QrCode size={22} style={{ color: 'var(--accent-cyan)' }} />
                <h3 style={{ fontSize: '1.2rem' }}>eSIM Digital Onboarding</h3>
              </div>
              <button
                onClick={() => setShowEsimModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {esimResult ? (
              <div>
                <div
                  style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid var(--accent-emerald)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    marginBottom: '16px',
                    textAlign: 'center',
                  }}
                >
                  <CheckCircle2 size={36} style={{ color: 'var(--accent-emerald)', margin: '0 auto 8px' }} />
                  <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>
                    eSIM Profile Ready for Activation
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Scan QR code in device settings or paste manual activation string below.
                  </p>
                </div>

                {/* QR Code Placeholder Representation */}
                <div
                  style={{
                    background: '#ffffff',
                    padding: '18px',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    width: '190px',
                    height: '190px',
                  }}
                >
                  <QrCode size={140} color="#0a0d14" />
                  <span style={{ color: '#0a0d14', fontSize: '0.65rem', fontWeight: 700, marginTop: '4px' }}>
                    TelecomOne eSIM LPA
                  </span>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Manual SM-DP+ LPA Activation String:
                  </div>
                  <div
                    style={{
                      background: 'var(--bg-input)',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.76rem',
                    }}
                  >
                    <span style={{ wordBreak: 'break-all' }}>{esimResult.activationCode}</span>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '4px 8px', marginLeft: '8px' }}
                      onClick={() => copyToClipboard(esimResult.activationCode)}
                    >
                      <Copy size={12} /> {copiedCode ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                  <strong>Device Setup Steps:</strong>
                  <ol style={{ paddingLeft: '18px', marginTop: '6px', lineHeight: 1.6 }}>
                    <li>Navigate to <em>Settings &gt; Cellular / Mobile Data &gt; Add eSIM</em></li>
                    <li>Scan this QR code using your phone camera</li>
                    <li>Once profile downloads, label as Primary and reboot device</li>
                  </ol>
                </div>

                <button
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => setShowEsimModal(false)}
                >
                  Done
                </button>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Switching from physical SIM to eSIM will deactivate your physical nano-SIM card within 15 minutes.
                  Your mobile phone number, plan, data balance, and remaining validity will remain identical.
                </p>

                <div
                  style={{
                    background: 'var(--bg-input)',
                    padding: '14px',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '20px',
                    fontSize: '0.85rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--accent-cyan)' }}>
                    <ShieldCheck size={18} /> Prerequisites
                  </div>
                  <ul style={{ paddingLeft: '20px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                    <li>eSIM compatible smartphone (iPhone XS+, Galaxy S20+, Pixel 4+)</li>
                    <li>Active Wi-Fi connection during profile download</li>
                    <li>OTP authentication via registered subscriber email</li>
                  </ul>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button className="btn btn-secondary" onClick={() => setShowEsimModal(false)}>
                    Cancel
                  </button>
                  <button className="btn btn-primary" disabled={converting} onClick={handleConvertToEsim}>
                    <QrCode size={16} /> {converting ? 'Generating Profile...' : 'Confirm & Generate eSIM'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Emergency Block Confirmation Modal */}
      {showBlockModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            padding: '20px',
            backdropFilter: 'var(--backdrop-blur)',
          }}
          onClick={() => setShowBlockModal(false)}
        >
          <div
            className="card"
            style={{
              maxWidth: '480px',
              width: '100%',
              background: 'var(--bg-secondary)',
              borderColor: 'var(--accent-rose)',
              boxShadow: '0 0 24px rgba(244, 63, 94, 0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'rgba(244, 63, 94, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-rose)',
                }}
              >
                <ShieldAlert size={22} />
              </div>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--accent-rose)' }}>Emergency SIM Suspension</h3>
            </div>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.6 }}>
              Are you sure you want to block this SIM? Mobile calling, SMS OTP verification, and mobile data will be
              suspended immediately. This action prevents unauthorized OTP access in the event of phone theft.
            </p>

            <div
              style={{
                background: 'rgba(244, 63, 94, 0.1)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                marginBottom: '20px',
                fontSize: '0.82rem',
                color: 'var(--text-secondary)',
              }}
            >
              To unblock or obtain a replacement SIM, visit your nearest TelecomOne store with valid government ID.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-secondary" onClick={() => setShowBlockModal(false)}>
                Cancel
              </button>
              <button className="btn btn-danger" disabled={blocking} onClick={handleBlockSim}>
                <Lock size={16} /> {blocking ? 'Blocking SIM...' : 'Yes, Block SIM Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
