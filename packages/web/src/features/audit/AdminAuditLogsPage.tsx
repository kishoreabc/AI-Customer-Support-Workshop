import React, { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import { DataTable, Column } from '../../components/DataTable.js';
import { SearchBar } from '../../components/SearchBar.js';
import { Pagination } from '../../components/Pagination.js';
import { Modal } from '../../components/Modal.js';
import { LoadingState } from '../../components/LoadingState.js';
import { History, Eye, Shield, Activity, RefreshCw } from 'lucide-react';

interface AuditLog {
  log_id: string;
  actor_id: string;
  actor_type: 'ADMIN' | 'SUPPORT_AGENT' | 'CUSTOMER' | 'AI' | 'SYSTEM';
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: any;
  timestamp: string;
}

export const AdminAuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actorFilter, setActorFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    loadLogs();
  }, [page, search, actorFilter, entityFilter]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      if (search.trim()) queryParams.set('search', search.trim());
      if (actorFilter) queryParams.set('actorType', actorFilter);
      if (entityFilter) queryParams.set('entityType', entityFilter);

      const res = await api.get<{
        items: AuditLog[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
      }>(`/api/v1/audit-logs?${queryParams.toString()}`);

      setLogs(res.items || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const getActorBadgeStyle = (actorType: string) => {
    switch (actorType) {
      case 'ADMIN':
        return { background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)' };
      case 'SUPPORT_AGENT':
        return { background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee', border: '1px solid rgba(6, 182, 212, 0.3)' };
      case 'CUSTOMER':
        return { background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)' };
      case 'AI':
        return { background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' };
      case 'SYSTEM':
      default:
        return { background: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', border: '1px solid rgba(148, 163, 184, 0.3)' };
    }
  };

  const getActionBadgeStyle = (action: string) => {
    if (action.includes('DELETE') || action.includes('DEACTIVATE') || action.includes('ESCALAT')) {
      return { background: 'rgba(244, 63, 94, 0.12)', color: '#fb7185' };
    }
    if (action.includes('CREATE') || action.includes('REGISTER') || action.includes('LOGIN')) {
      return { background: 'rgba(16, 185, 129, 0.12)', color: '#34d399' };
    }
    if (action.includes('TOOL')) {
      return { background: 'rgba(245, 158, 11, 0.12)', color: '#fbbf24' };
    }
    return { background: 'rgba(99, 102, 241, 0.12)', color: '#a5b4fc' };
  };

  const columns: Column<AuditLog>[] = [
    {
      key: 'timestamp',
      header: 'Timestamp',
      render: (log: AuditLog) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {new Date(log.timestamp).toLocaleDateString()}
          </div>
        </div>
      ),
    },
    {
      key: 'actor',
      header: 'Actor',
      render: (log: AuditLog) => (
        <div>
          <span
            className="badge"
            style={{ ...getActorBadgeStyle(log.actor_type), fontSize: '0.7rem', padding: '2px 8px' }}
          >
            {log.actor_type}
          </span>
          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              marginTop: '4px',
              maxWidth: '120px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={log.actor_id}
          >
            {log.actor_id}
          </div>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (log: AuditLog) => (
        <span
          className="badge"
          style={{
            ...getActionBadgeStyle(log.action),
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            padding: '3px 8px',
          }}
        >
          {log.action}
        </span>
      ),
    },
    {
      key: 'entity',
      header: 'Entity Target',
      render: (log: AuditLog) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{log.entity_type}</div>
          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
              maxWidth: '130px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={log.entity_id}
          >
            {log.entity_id}
          </div>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Payload Details',
      render: (log: AuditLog) => (
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedLog(log);
          }}
        >
          <Eye size={14} />
          <span>Inspect</span>
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Security & System Audit Logs</h1>
          <p className="page-subtitle">
            Immutable tracking of administrator interventions, customer state modifications, AI tool calls, and escalations
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button type="button" className="btn btn-secondary" onClick={loadLogs}>
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Summary Bar */}
      <div
        className="card"
        style={{
          marginBottom: '20px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Shield size={20} style={{ color: 'var(--accent-purple)' }} />
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Total Audit Events Logged: <strong style={{ color: 'var(--text-primary)' }}>{total}</strong>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <Activity size={16} style={{ color: 'var(--accent-emerald)' }} />
          <span>Real-time DB recording active</span>
        </div>
      </div>

      {/* Filters */}
      <div
        className="card"
        style={{
          marginBottom: '20px',
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: '240px' }}>
          <SearchBar
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            placeholder="Search by action, entity ID or metadata..."
          />
        </div>

        <select
          className="select"
          style={{ width: '180px' }}
          value={actorFilter}
          onChange={(e) => {
            setActorFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Actors</option>
          <option value="ADMIN">ADMIN</option>
          <option value="SUPPORT_AGENT">SUPPORT_AGENT</option>
          <option value="CUSTOMER">CUSTOMER</option>
          <option value="AI">AI</option>
          <option value="SYSTEM">SYSTEM</option>
        </select>

        <select
          className="select"
          style={{ width: '180px' }}
          value={entityFilter}
          onChange={(e) => {
            setEntityFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Entity Types</option>
          <option value="Customer">Customer</option>
          <option value="Product">Product</option>
          <option value="Order">Order</option>
          <option value="Conversation">Conversation</option>
          <option value="Ticket">Ticket</option>
          <option value="KnowledgeDoc">KnowledgeDoc</option>
          <option value="FAQ">FAQ</option>
          <option value="AIConfig">AIConfig</option>
          <option value="AIPrompt">AIPrompt</option>
        </select>
      </div>

      {/* Audit Log Table */}
      {loading ? (
        <LoadingState message="Fetching audit events..." />
      ) : (
        <>
          <DataTable
            data={logs}
            columns={columns}
            emptyTitle="No audit log entries"
            emptyDescription="No events match your current filter criteria."
            onRowClick={(log) => setSelectedLog(log)}
          />

          <Pagination page={page} totalPages={totalPages} onPageChange={(p) => setPage(p)} />
        </>
      )}

      {/* Log Detail Modal */}
      {selectedLog && (
        <Modal
          title={`Audit Event: ${selectedLog.action}`}
          isOpen={true}
          onClose={() => setSelectedLog(null)}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Log ID</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{selectedLog.log_id}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Timestamp</div>
              <div style={{ fontSize: '0.85rem' }}>{new Date(selectedLog.timestamp).toLocaleString()}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Actor</div>
              <div style={{ fontSize: '0.85rem' }}>
                <span className="badge" style={{ ...getActorBadgeStyle(selectedLog.actor_type), marginRight: '6px' }}>
                  {selectedLog.actor_type}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{selectedLog.actor_id}</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Target Entity</div>
              <div style={{ fontSize: '0.85rem' }}>
                <strong>{selectedLog.entity_type}</strong>{' '}
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  ({selectedLog.entity_id})
                </span>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Event Metadata & Context</label>
            <div
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.82rem',
                color: 'var(--accent-cyan)',
                lineHeight: 1.5,
                maxHeight: '320px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
              }}
            >
              {selectedLog.metadata ? JSON.stringify(selectedLog.metadata, null, 2) : '// No additional metadata payload'}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setSelectedLog(null)}>
              Close
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};
