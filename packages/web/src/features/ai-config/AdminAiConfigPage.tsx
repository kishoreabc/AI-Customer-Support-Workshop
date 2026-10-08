import React, { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.js';
import { StatusBadge } from '../../components/StatusBadge.js';
import { Modal } from '../../components/Modal.js';
import { LoadingState } from '../../components/LoadingState.js';
import {
  Cpu,
  Save,
  PlusCircle,
  CheckCircle,
  History,
  ShieldAlert,
  Sliders,
  FileCode,
  AlertCircle,
  Check,
} from 'lucide-react';

interface AiConfig {
  model: string;
  systemInstructions: string;
  temperature: number;
  maxTokens: number;
  ragTopK: number;
  ragSimilarityThreshold: number;
  maxConversationHistory: number;
  escalationThreshold: number;
  aiEnabled: boolean;
  updatedAt?: string;
}

interface PromptVersion {
  prompt_id: string;
  version: number;
  content: string;
  status: 'ACTIVE' | 'ARCHIVED';
  created_by: string;
  created_at: string;
}

export const AdminAiConfigPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Config State
  const [config, setConfig] = useState<AiConfig>({
    model: 'gpt-4o-mini',
    systemInstructions: '',
    temperature: 0.7,
    maxTokens: 1024,
    ragTopK: 5,
    ragSimilarityThreshold: 0.7,
    maxConversationHistory: 20,
    escalationThreshold: 0.8,
    aiEnabled: true,
  });

  // Prompt History State
  const [prompts, setPrompts] = useState<PromptVersion[]>([]);
  const [viewingPrompt, setViewingPrompt] = useState<PromptVersion | null>(null);
  const [newPromptModalOpen, setNewPromptModalOpen] = useState(false);
  const [newPromptContent, setNewPromptContent] = useState('');
  const [creatingPrompt, setCreatingPrompt] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [configRes, promptsRes] = await Promise.all([
        api.get<AiConfig>('/api/v1/admin/ai-config'),
        api.get<PromptVersion[]>('/api/v1/admin/ai-prompts'),
      ]);
      setConfig(configRes);
      setPrompts(promptsRes || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load AI configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const updated = await api.put<AiConfig>('/api/v1/admin/ai-config', {
        model: config.model,
        temperature: Number(config.temperature),
        maxTokens: Number(config.maxTokens),
        ragTopK: Number(config.ragTopK),
        ragSimilarityThreshold: Number(config.ragSimilarityThreshold),
        maxConversationHistory: Number(config.maxConversationHistory),
        escalationThreshold: Number(config.escalationThreshold),
        aiEnabled: Boolean(config.aiEnabled),
      });
      setConfig(updated);
      setSuccessMsg('AI configuration updated successfully');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update AI configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleCreatePromptVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !newPromptContent.trim()) return;

    setCreatingPrompt(true);
    setErrorMsg(null);

    try {
      await api.post('/api/v1/admin/ai-prompts', {
        content: newPromptContent.trim(),
      });
      setNewPromptModalOpen(false);
      setNewPromptContent('');
      setSuccessMsg('New prompt version deployed and activated');
      setTimeout(() => setSuccessMsg(null), 4000);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create prompt version');
    } finally {
      setCreatingPrompt(false);
    }
  };

  const handleActivatePrompt = async (promptId: string) => {
    if (!isAdmin) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      await api.put(`/api/v1/admin/ai-prompts/${promptId}/activate`);
      setSuccessMsg(`Prompt version ${promptId} activated`);
      setTimeout(() => setSuccessMsg(null), 4000);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to activate prompt version');
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading AI Agent Configuration & Prompt History..." />;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Engine Configuration</h1>
          <p className="page-subtitle">
            Configure agent models, RAG vector parameters, autonomous tool calling, and versioned system behavior prompts
          </p>
        </div>
      </div>

      {/* Security Banner */}
      <div
        className="card"
        style={{
          marginBottom: '24px',
          borderLeft: '4px solid var(--accent-emerald)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          background: 'rgba(16, 185, 129, 0.05)',
        }}
      >
        <ShieldAlert size={24} style={{ color: 'var(--accent-emerald)', flexShrink: 0 }} />
        <div style={{ fontSize: '0.875rem' }}>
          <strong style={{ color: 'var(--text-primary)' }}>Secure Server Isolation:</strong>{' '}
          <span style={{ color: 'var(--text-secondary)' }}>
            OpenAI API keys and authentication credentials are strictly protected on the backend server and never
            transmitted to the browser client.
          </span>
        </div>
      </div>

      {!isAdmin && (
        <div
          className="card"
          style={{
            marginBottom: '24px',
            borderLeft: '4px solid var(--accent-amber)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            background: 'rgba(245, 158, 11, 0.05)',
          }}
        >
          <AlertCircle size={24} style={{ color: 'var(--accent-amber)', flexShrink: 0 }} />
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--accent-amber)' }}>Read-Only Mode:</strong> You are logged in as a Support
            Agent. AI configuration and system prompt changes require Administrator privileges.
          </div>
        </div>
      )}

      {successMsg && (
        <div
          className="card"
          style={{
            marginBottom: '24px',
            borderLeft: '4px solid var(--accent-emerald)',
            color: '#6ee7b7',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <Check size={18} />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div
          className="card"
          style={{
            marginBottom: '24px',
            borderLeft: '4px solid var(--accent-rose)',
            color: '#fca5a5',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <AlertCircle size={18} />
          {errorMsg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Left Column: AI Parameters Form */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Sliders size={20} style={{ color: 'var(--accent-primary)' }} />
            <h2 style={{ fontSize: '1.15rem' }}>Hyperparameters & Runtime</h2>
          </div>

          <form onSubmit={handleSaveConfig}>
            {/* AI Toggle */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '20px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>AI Autonomous Support Mode</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  When disabled, conversations immediately route to human support agents
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', cursor: isAdmin ? 'pointer' : 'not-allowed' }}>
                <input
                  type="checkbox"
                  disabled={!isAdmin}
                  checked={config.aiEnabled}
                  onChange={(e) => setConfig({ ...config, aiEnabled: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)' }}
                />
              </label>
            </div>

            {/* Model Selection */}
            <div className="form-group">
              <label className="form-label">Language Model</label>
              <select
                className="select"
                disabled={!isAdmin}
                value={config.model}
                onChange={(e) => setConfig({ ...config, model: e.target.value })}
              >
                <option value="gpt-4o-mini">gpt-4o-mini (Fast & Recommended)</option>
                <option value="gpt-4o">gpt-4o (High Reasoning)</option>
                <option value="gpt-4-turbo">gpt-4-turbo</option>
                <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Temperature */}
              <div className="form-group">
                <label className="form-label">
                  Temperature: <code>{config.temperature}</code>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.05"
                  disabled={!isAdmin}
                  value={config.temperature}
                  onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                  style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
                />
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.7rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  <span>Deterministic (0.0)</span>
                  <span>Creative (1.5)</span>
                </div>
              </div>

              {/* Max Tokens */}
              <div className="form-group">
                <label className="form-label">Max Response Tokens</label>
                <input
                  type="number"
                  className="input"
                  min="128"
                  max="4096"
                  disabled={!isAdmin}
                  value={config.maxTokens}
                  onChange={(e) => setConfig({ ...config, maxTokens: parseInt(e.target.value, 10) || 512 })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* RAG Top K */}
              <div className="form-group">
                <label className="form-label">RAG Top-K Chunks</label>
                <input
                  type="number"
                  className="input"
                  min="1"
                  max="20"
                  disabled={!isAdmin}
                  value={config.ragTopK}
                  onChange={(e) => setConfig({ ...config, ragTopK: parseInt(e.target.value, 10) || 5 })}
                />
              </div>

              {/* Similarity Threshold */}
              <div className="form-group">
                <label className="form-label">
                  Similarity Threshold: <code>{config.ragSimilarityThreshold}</code>
                </label>
                <input
                  type="range"
                  min="0.3"
                  max="0.95"
                  step="0.05"
                  disabled={!isAdmin}
                  value={config.ragSimilarityThreshold}
                  onChange={(e) => setConfig({ ...config, ragSimilarityThreshold: parseFloat(e.target.value) })}
                  style={{ width: '100%', accentColor: 'var(--accent-cyan)' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Max History */}
              <div className="form-group">
                <label className="form-label">Max History Turns</label>
                <input
                  type="number"
                  className="input"
                  min="2"
                  max="50"
                  disabled={!isAdmin}
                  value={config.maxConversationHistory}
                  onChange={(e) =>
                    setConfig({ ...config, maxConversationHistory: parseInt(e.target.value, 10) || 20 })
                  }
                />
              </div>

              {/* Escalation Threshold */}
              <div className="form-group">
                <label className="form-label">
                  Escalation Threshold: <code>{config.escalationThreshold}</code>
                </label>
                <input
                  type="range"
                  min="0.4"
                  max="1.0"
                  step="0.05"
                  disabled={!isAdmin}
                  value={config.escalationThreshold}
                  onChange={(e) => setConfig({ ...config, escalationThreshold: parseFloat(e.target.value) })}
                  style={{ width: '100%', accentColor: 'var(--accent-rose)' }}
                />
              </div>
            </div>

            {isAdmin && (
              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <Save size={16} />
                  <span>{saving ? 'Saving...' : 'Save AI Parameters'}</span>
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Right Column: Prompt Management */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Active Prompt Overview */}
          <div className="card">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Cpu size={20} style={{ color: 'var(--accent-cyan)' }} />
                <h2 style={{ fontSize: '1.15rem' }}>Active System Prompt</h2>
              </div>
              {isAdmin && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setNewPromptContent(config.systemInstructions || '');
                    setNewPromptModalOpen(true);
                  }}
                >
                  <PlusCircle size={14} />
                  <span>Draft New Version</span>
                </button>
              )}
            </div>

            <div
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                maxHeight: '260px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
              }}
            >
              {config.systemInstructions || 'No system prompt configured.'}
            </div>
          </div>

          {/* Prompt Version History */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <History size={20} style={{ color: 'var(--accent-purple)' }} />
              <h2 style={{ fontSize: '1.15rem' }}>Version History</h2>
            </div>

            {prompts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                No prompt versions recorded yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {prompts.map((p) => {
                  const isActive = p.status === 'ACTIVE';
                  return (
                    <div
                      key={p.prompt_id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        background: isActive ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                        border: `1px solid ${isActive ? 'rgba(99, 102, 241, 0.4)' : 'var(--border-subtle)'}`,
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Version {p.version}</span>
                          <StatusBadge status={p.status} />
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Created by {p.created_by} on {new Date(p.created_at).toLocaleDateString()}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setViewingPrompt(p)}
                          title="Inspect prompt text"
                        >
                          <FileCode size={14} />
                          <span>View</span>
                        </button>

                        {!isActive && isAdmin && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => handleActivatePrompt(p.prompt_id)}
                            title="Activate this version"
                          >
                            <CheckCircle size={14} />
                            <span>Activate</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: View Prompt */}
      {viewingPrompt && (
        <Modal
          title={`Prompt v${viewingPrompt.version} (${viewingPrompt.status})`}
          isOpen={true}
          onClose={() => setViewingPrompt(null)}
        >
          <div style={{ marginBottom: '16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            ID: <code>{viewingPrompt.prompt_id}</code> &bull; Author: {viewingPrompt.created_by} &bull; Date:{' '}
            {new Date(viewingPrompt.created_at).toLocaleString()}
          </div>
          <div
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.85rem',
              color: 'var(--text-primary)',
              lineHeight: 1.6,
              maxHeight: '400px',
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
            }}
          >
            {viewingPrompt.content}
          </div>
        </Modal>
      )}

      {/* Modal: Draft New Prompt Version */}
      <Modal
        title="Draft & Deploy New System Prompt Version"
        isOpen={newPromptModalOpen}
        onClose={() => setNewPromptModalOpen(false)}
      >
        <form onSubmit={handleCreatePromptVersion}>
          <div style={{ marginBottom: '14px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Creating a new prompt will archive the current active version and immediately deploy this version for all
            autonomous AI interactions.
          </div>

          <div className="form-group">
            <label className="form-label">System Prompt Instructions</label>
            <textarea
              className="textarea"
              style={{ minHeight: '260px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
              value={newPromptContent}
              onChange={(e) => setNewPromptContent(e.target.value)}
              placeholder="Define agent company persona, tone, refund policies, tool invocation rules, and human escalation criteria..."
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setNewPromptModalOpen(false)}
              disabled={creatingPrompt}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={creatingPrompt}>
              <CheckCircle size={16} />
              <span>{creatingPrompt ? 'Deploying...' : 'Deploy Version'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
