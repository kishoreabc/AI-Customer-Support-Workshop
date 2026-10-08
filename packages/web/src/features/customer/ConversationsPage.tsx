import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client.js';
import { DataTable, Column } from '../../components/DataTable.js';
import { StatusBadge } from '../../components/StatusBadge.js';
import { SearchBar } from '../../components/SearchBar.js';
import { Pagination } from '../../components/Pagination.js';
import { PlusCircle, MessageSquare } from 'lucide-react';

export const ConversationsPage: React.FC = () => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, [page, search]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get<any>(`/api/v1/conversations?page=${page}&pageSize=10&search=${encodeURIComponent(search)}`);
      setConversations(res.items || []);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startNew = async () => {
    try {
      const newConv = await api.post<any>('/api/v1/conversations', {});
      navigate(`/chat?id=${newConv.conversation_id}`);
    } catch (err) {
      console.error(err);
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'conversation_id',
      header: 'Session ID',
      render: (r) => <strong style={{ color: 'var(--accent-primary)' }}>#{r.conversation_id.substring(0, 8)}</strong>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'last_message',
      header: 'Recent Message',
      render: (r) => (
        <span style={{ color: 'var(--text-secondary)', display: 'block', maxWidth: '380px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {r.last_message || 'No messages yet'}
        </span>
      ),
    },
    {
      key: 'updated_at',
      header: 'Last Active',
      render: (r) => new Date(r.updated_at).toLocaleString(),
    },
    {
      key: 'actions',
      header: 'Action',
      render: (r) => (
        <button
          className="btn btn-secondary btn-sm"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/chat?id=${r.conversation_id}`);
          }}
        >
          <MessageSquare size={14} /> Continue Chat
        </button>
      ),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Support Conversations</h1>
          <p className="page-subtitle">Inspect your past chat logs and continue discussions with AI or human agents.</p>
        </div>
        <button className="btn btn-primary" onClick={startNew}>
          <PlusCircle size={18} /> Start New Conversation
        </button>
      </div>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '12px' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search conversations..." />
      </div>

      <DataTable
        columns={columns}
        data={conversations}
        loading={loading}
        onRowClick={(r) => navigate(`/chat?id=${r.conversation_id}`)}
        emptyTitle="No conversations found"
        emptyDescription="You haven't initiated any support sessions yet."
      />

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
};
