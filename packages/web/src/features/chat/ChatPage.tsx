import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../api/client.js';
import { StatusBadge } from '../../components/StatusBadge.js';
import { LoadingState } from '../../components/LoadingState.js';
import {
  Send,
  UserCheck,
  LifeBuoy,
  Cpu,
  PlusCircle,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';

interface Message {
  message_id: string;
  sender_type: 'CUSTOMER' | 'AI' | 'HUMAN_AGENT' | 'SYSTEM';
  content: string;
  timestamp: string;
}

interface Conversation {
  conversation_id: string;
  status: string;
  assigned_agent_name?: string;
  ticket?: any;
}

export const ChatPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(searchParams.get('id'));
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [toolsRunning, setToolsRunning] = useState<string[]>([]);
  const [escalating, setEscalating] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (activeConvId) {
      loadConversationDetails(activeConvId);
    }
  }, [activeConvId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, toolsRunning]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ items: any[] }>('/api/v1/conversations');
      const list = res.items || [];
      setConversations(list);

      if (list.length > 0 && !activeConvId) {
        setActiveConvId(list[0].conversation_id);
        setSearchParams({ id: list[0].conversation_id });
      } else if (list.length === 0) {
        // Automatically start first conversation
        await startNewConversation();
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
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
      console.error('Failed to fetch conversation details:', err);
    }
  };

  const startNewConversation = async () => {
    try {
      const newConv = await api.post<any>('/api/v1/conversations', {});
      setConversations((prev) => [newConv, ...prev]);
      setActiveConvId(newConv.conversation_id);
      setSearchParams({ id: newConv.conversation_id });
      setConversation(newConv);
      setMessages(newConv.messages || []);
    } catch (err) {
      console.error('Failed to create new conversation:', err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !activeConvId || sending) return;

    const text = inputMessage.trim();
    setInputMessage('');
    setSending(true);

    // Optimistically add customer message to UI
    const tempUserMsg: Message = {
      message_id: `temp-${Date.now()}`,
      sender_type: 'CUSTOMER',
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    // If conversation is already in human handoff, send directly as customer message
    if (conversation?.status === 'HUMAN_HANDOFF') {
      try {
        await api.post(`/api/v1/conversations/${activeConvId}/messages`, { content: text });
        loadConversationDetails(activeConvId);
      } catch (err) {
        console.error('Failed to send message to human agent:', err);
      } finally {
        setSending(false);
      }
      return;
    }

    // Call AI Agent endpoint
    try {
      setToolsRunning(['Analyzing inquiry & consulting support knowledge...']);

      const response = await api.post<any>('/api/v1/agent/chat', {
        conversationId: activeConvId,
        message: text,
      });

      setToolsRunning([]);
      loadConversationDetails(activeConvId);
    } catch (err: any) {
      setToolsRunning([]);
      setMessages((prev) => [
        ...prev,
        {
          message_id: `err-${Date.now()}`,
          sender_type: 'SYSTEM',
          content: `Error: ${err.message || 'Unable to communicate with AI support agent.'}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
      setToolsRunning([]);
    }
  };

  const handleEscalateToHuman = async () => {
    if (!activeConvId || escalating) return;
    setEscalating(true);
    try {
      await api.post(`/api/v1/conversations/${activeConvId}/escalate`, {
        reason: 'Customer initiated human representative request from Chat UI',
      });
      loadConversationDetails(activeConvId);
    } catch (err) {
      console.error('Failed to escalate to human:', err);
    } finally {
      setEscalating(false);
    }
  };

  if (loading && conversations.length === 0) {
    return <LoadingState message="Connecting to AI Support Assistant..." />;
  }

  const isHumanHandled = conversation?.status === 'HUMAN_HANDOFF';

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      {/* Conversations Mini-Drawer */}
      <div
        style={{
          width: '280px',
          borderRight: '1px solid var(--border-subtle)',
          background: 'var(--bg-secondary)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>Chats</span>
          <button className="btn btn-primary btn-sm" onClick={startNewConversation} title="Start new session">
            <PlusCircle size={15} /> New Chat
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
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
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '6px',
                  cursor: 'pointer',
                  background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                  border: isSelected ? '1px solid var(--accent-primary)' : '1px solid transparent',
                  transition: 'var(--transition)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: isSelected ? '#fff' : 'var(--text-primary)' }}>
                    #{c.conversation_id.substring(0, 8)}
                  </span>
                  <StatusBadge status={c.status} />
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {c.last_message || 'New conversation session'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Chat Interface */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
        {/* Chat Header */}
        <div className="chat-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: isHumanHandled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isHumanHandled ? 'var(--accent-emerald)' : 'var(--accent-primary)',
              }}
            >
              {isHumanHandled ? <UserCheck size={20} /> : <Cpu size={20} />}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '1rem' }}>
                  {isHumanHandled
                    ? `Human Support: ${conversation?.assigned_agent_name || 'Tier 2 Agent'}`
                    : 'AI Support Specialist'}
                </span>
                {conversation && <StatusBadge status={conversation.status} />}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {isHumanHandled
                  ? 'A human representative has taken over this ticket.'
                  : 'Connected to live RAG knowledge base & store databases'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {!isHumanHandled && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleEscalateToHuman}
                disabled={escalating}
                title="Transfer to live representative"
              >
                <LifeBuoy size={16} /> Request Human Support
              </button>
            )}
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => activeConvId && loadConversationDetails(activeConvId)}
              title="Refresh messages"
            >
              <RotateCcw size={15} />
            </button>
          </div>
        </div>

        {/* Escalation Banner if Human Handoff */}
        {isHumanHandled && (
          <div
            style={{
              background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.15), rgba(6, 182, 212, 0.1))',
              borderBottom: '1px solid rgba(16, 185, 129, 0.3)',
              padding: '10px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '0.85rem',
              color: '#6ee7b7',
            }}
          >
            <UserCheck size={18} />
            <span>
              <strong>Human Agent Escalation Active:</strong> AI automated replies have been paused.
              Your assigned support specialist is monitoring this chat.
            </span>
          </div>
        )}

        {/* Messages Body */}
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
                    ? 'message-user'
                    : isAi
                    ? 'message-ai'
                    : isAgent
                    ? 'message-agent'
                    : 'message-system'
                }`}
              >
                {!isSystem && (
                  <div
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      marginBottom: '4px',
                      opacity: 0.8,
                    }}
                  >
                    {isUser ? 'You' : isAi ? 'AI Support Agent' : 'Human Specialist'}
                  </div>
                )}
                <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
                <div
                  style={{
                    fontSize: '0.68rem',
                    opacity: 0.6,
                    marginTop: '6px',
                    textAlign: isUser ? 'right' : 'left',
                  }}
                >
                  {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            );
          })}

          {messages.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '40px 20px', maxWidth: '600px', margin: '0 auto' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(99, 102, 241, 0.2))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  color: 'var(--accent-cyan)',
                }}
              >
                <Cpu size={28} />
              </div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>TelecomOne AI Assistant</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '24px' }}>
                Instant resolution for mobile plans, real-time data usage, network troubleshooting, recharge status, eSIM, and outages.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                {[
                  'How much high-speed data do I have left?',
                  'Is there a network outage in Chennai?',
                  'How do I activate eSIM on my phone?',
                  'What is the best 5G unlimited plan?',
                  'Check my latest bill breakdown',
                ].map((prompt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setInputMessage(prompt);
                    }}
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '20px',
                      padding: '8px 14px',
                      color: 'var(--text-primary)',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      transition: 'var(--transition)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tools Activity Indicator */}
          {toolsRunning.map((t, idx) => (
            <div
              key={idx}
              className="message-bubble message-ai"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(99, 102, 241, 0.1)',
                borderColor: 'var(--accent-primary)',
                color: '#a5b4fc',
                fontSize: '0.85rem',
              }}
            >
              <Cpu size={16} className="spin" style={{ animation: 'spin 2s linear infinite' }} />
              <span>{t}</span>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input Bar */}
        <form className="chat-input-bar" onSubmit={handleSendMessage}>
          <input
            type="text"
            className="input"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={
              isHumanHandled
                ? 'Type your message to the human support agent...'
                : 'Ask about data usage, 5G plans, network issues, recharges, eSIM...'
            }
            disabled={sending}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!inputMessage.trim() || sending}
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};
