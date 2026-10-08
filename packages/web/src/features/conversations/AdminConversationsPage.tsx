import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../api/client.js';
import { StatusBadge } from '../../components/StatusBadge.js';
import { LoadingState } from '../../components/LoadingState.js';
import {
  Send,
  UserCheck,
  CheckCircle,
  RefreshCw,
  MessageSquare,
  Search,
} from 'lucide-react';

export const AdminConversationsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(searchParams.get('id'));
  const [conversation, setConversation] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [agents, setAgents] = useState<any[]>([]);

  useEffect(() => {
    loadConversations();
    loadAgents();
  }, [statusFilter]);

  useEffect(() => {
    if (activeConvId) {
      loadConversationDetails(activeConvId);
    }
  }, [activeConvId]);

  const loadAgents = async () => {
    try {
      const data = await api.get<any[]>('/api/v1/agents');
      setAgents(data || []);
    } catch (e) {}
  };

  const loadConversations = async () => {
    setLoading(true);
    try {
      const res = await api.get<any>(`/api/v1/conversations?status=${statusFilter}`);
      const list = res.items || [];
      setConversations(list);

      if (list.length > 0 && !activeConvId) {
        setActiveConvId(list[0].conversation_id);
        setSearchParams({ id: list[0].conversation_id });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadConversationDetails = async (id: string) => {
    try {
      const data = await api.get<any>(`/api/v1/conversations/${id}`);
      setConversation(data);
      setMessages(data.messages || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeConvId || sendingReply) return;

    setSendingReply(true);
    try {
      await api.post(`/api/v1/conversations/${activeConvId}/messages`, {
        content: replyText.trim(),
      });
      setReplyText('');
      loadConversationDetails(activeConvId);
      loadConversations();
    } catch (err) {
      console.error(err);
    } finally {
      setSendingReply(false);
    }
  };

  const handleAssignAgent = async (agentId: string) => {
    if (!activeConvId) return;
    try {
      await api.post(`/api/v1/conversations/${activeConvId}/assign`, { agentId });
      loadConversationDetails(activeConvId);
      loadConversations();
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolve = async () => {
    if (!activeConvId) return;
    try {
      await api.post(`/api/v1/conversations/${activeConvId}/resolve`, {});
      loadConversationDetails(activeConvId);
      loadConversations();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      {/* Left List of Conversations */}
      <div
        style={{
          width: '340px',
          borderRight: '1px solid var(--border-subtle)',
          background: 'var(--bg-secondary)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '10px' }}>Support Conversations</h2>
          <select
            className="select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ fontSize: '0.85rem' }}
          >
            <option value="">All Statuses</option>
            <option value="AI_ACTIVE">AI Active</option>
            <option value="HUMAN_HANDOFF">Human Handoff</option>
            <option value="ESCALATED">Escalated</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
          {conversations.map((c) => {
            const isSelected = c.conversation_id === activeConvId;
            return (
              <div
                key={c.conversation_id}
                onClick={() => {
                  setActiveConvId(c.conversation_id);
                  setSearchParams({ id: c.conversation_id });
                }}
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '8px',
                  cursor: 'pointer',
                  background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                  border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                  transition: 'var(--transition)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <strong style={{ fontSize: '0.85rem' }}>
                    {c.customer_first_name} {c.customer_last_name}
                  </strong>
                  <StatusBadge status={c.status} />
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  {c.customer_email}
                </div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {c.last_message || 'New conversation'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Conversation Inspector & Agent Reply */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
        {conversation ? (
          <>
            {/* Header */}
            <div className="chat-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3 style={{ fontSize: '1.1rem' }}>
                    {conversation.customer_first_name} {conversation.customer_last_name}
                  </h3>
                  <StatusBadge status={conversation.status} />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    ({conversation.customer_email})
                  </span>
                </div>
                {conversation.escalation_reason && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--accent-amber)', marginTop: '4px' }}>
                    ⚠️ Escalation Reason: {conversation.escalation_reason}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {/* Agent assign dropdown */}
                <select
                  className="select"
                  style={{ width: 'auto', padding: '6px 12px', fontSize: '0.8rem' }}
                  value={conversation.assigned_agent_id || ''}
                  onChange={(e) => handleAssignAgent(e.target.value)}
                >
                  <option value="">Assign Support Agent</option>
                  {agents.map((a) => (
                    <option key={a.agent_id} value={a.agent_id}>
                      {a.name} ({a.department})
                    </option>
                  ))}
                </select>

                {conversation.status !== 'RESOLVED' && (
                  <button className="btn btn-secondary btn-sm" onClick={handleResolve}>
                    <CheckCircle size={15} /> Mark Resolved
                  </button>
                )}

                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => loadConversationDetails(conversation.conversation_id)}
                >
                  <RefreshCw size={15} />
                </button>
              </div>
            </div>

            {/* Chat Body */}
            <div className="chat-body">
              {messages.map((m) => {
                const isUser = m.sender_type === 'CUSTOMER';
                const isAi = m.sender_type === 'AI';
                const isAgent = m.sender_type === 'HUMAN_AGENT';
                const isSystem = m.sender_type === 'SYSTEM';

                return (
                  <div
                    key={m.message_id}
                    className={`message-bubble ${
                      isUser
                        ? 'message-ai'
                        : isAi
                        ? 'message-system'
                        : isAgent
                        ? 'message-user'
                        : 'message-system'
                    }`}
                    style={
                      isUser
                        ? { alignSelf: 'flex-start', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }
                        : isAgent
                        ? { alignSelf: 'flex-end', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff' }
                        : isAi
                        ? { alignSelf: 'flex-start', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', color: '#e0e7ff', maxWidth: '80%' }
                        : undefined
                    }
                  >
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, marginBottom: '4px', opacity: 0.8 }}>
                      {isUser ? 'Customer' : isAi ? 'AI Support Response' : isAgent ? 'Human Support Agent' : 'System Event'}
                    </div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
                    <div style={{ fontSize: '0.68rem', opacity: 0.6, marginTop: '6px' }}>
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Human Agent Reply Bar */}
            <form className="chat-input-bar" onSubmit={handleSendReply}>
              <input
                type="text"
                className="input"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your response as human support agent (takes over chat)..."
                disabled={sendingReply}
              />
              <button type="submit" className="btn btn-primary" disabled={!replyText.trim() || sendingReply}>
                <Send size={18} /> Reply
              </button>
            </form>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            Select a conversation on the left to review messages or reply.
          </div>
        )}
      </div>
    </div>
  );
};
