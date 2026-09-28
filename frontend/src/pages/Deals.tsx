import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { DealListItem, DealStage } from '../types';
import { dealsApi } from '../api/deals';
import { formatINR, formatDate, getStageClass, getStatusClass } from '../utils';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { Badge } from '../components/common/Badge';
import { DealForm } from '../components/deals/DealForm';
import { ApiError } from '../api/client';
import { Plus, Search, Clock, ChevronDown, Building2 } from 'lucide-react';

const STAGES: (DealStage | 'All')[] = [
  'All',
  'Discovery',
  'Qualification',
  'Proposal',
  'Negotiation',
  'Closed Won',
  'Closed Lost',
];

export const Deals: React.FC = () => {
  const navigate = useNavigate();
  const [deals, setDeals] = useState<DealListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<DealStage | 'All'>('All');

  const loadDeals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await dealsApi.list();
      setDeals(data);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Failed to load deals. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDeals();
  }, [loadDeals]);

  const filtered = deals.filter((d) => {
    const matchSearch =
      d.company_name.toLowerCase().includes(search.toLowerCase()) ||
      d.deal_name.toLowerCase().includes(search.toLowerCase()) ||
      d.owner.toLowerCase().includes(search.toLowerCase());
    const matchStage = stageFilter === 'All' || d.stage === stageFilter;
    return matchSearch && matchStage;
  });

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Deals</h1>
          <p className="page-subtitle">Manage your sales opportunities and memory context</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowForm(true)}
          id="btn-new-deal"
        >
          <Plus size={15} />
          New Deal
        </button>
      </div>

      <div className="page-body">
        {/* Toolbar */}
        <div className="toolbar mb-4">
          <div className="search-input-wrapper">
            <Search size={15} className="search-icon" />
            <input
              className="search-input"
              placeholder="Search deals by company, name, or owner…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              id="search-deals"
              aria-label="Search deals"
            />
          </div>

          <div style={{ position: 'relative' }}>
            <select
              className="form-select"
              style={{ paddingRight: 32, appearance: 'none', minWidth: 140 }}
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value as DealStage | 'All')}
              id="filter-stage"
              aria-label="Filter by stage"
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s === 'All' ? 'All Stages' : s}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
                color: 'var(--color-text-muted)',
              }}
            />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <LoadingState text="Loading deals…" />
        ) : error ? (
          <ErrorState message={error} onRetry={loadDeals} />
        ) : filtered.length === 0 ? (
          <div className="table-wrapper">
            <div className="empty-state">
              <div className="empty-state-icon">
                <Building2 size={22} />
              </div>
              <div className="empty-title">
                {deals.length === 0 ? 'No deals yet' : 'No deals match your search'}
              </div>
              <div className="empty-description">
                {deals.length === 0
                  ? 'Create your first deal to start using DealIQ.'
                  : 'Try adjusting your search query or stage filter.'}
              </div>
              {deals.length === 0 && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowForm(true)}
                >
                  <Plus size={13} />
                  New Deal
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '32%' }}>Deal / Company</th>
                  <th style={{ width: '16%' }}>Value</th>
                  <th style={{ width: '14%' }}>Stage</th>
                  <th style={{ width: '12%' }}>Status</th>
                  <th style={{ width: '12%' }}>Owner</th>
                  <th style={{ width: '14%' }}>Next Call</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((deal) => (
                  <tr
                    key={deal.id}
                    className="table-row-link"
                    onClick={() => navigate(`/deals/${deal.id}`)}
                    aria-label={`Open deal: ${deal.company_name} – ${deal.deal_name}`}
                  >
                    <td>
                      <div className="table-company">{deal.company_name}</div>
                      <div className="table-deal-name">{deal.deal_name}</div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{formatINR(deal.deal_value)}</td>
                    <td>
                      <Badge className={getStageClass(deal.stage)}>{deal.stage}</Badge>
                    </td>
                    <td>
                      <Badge className={getStatusClass(deal.status)}>{deal.status}</Badge>
                    </td>
                    <td style={{ fontSize: 13 }}>{deal.owner}</td>
                    <td>
                      {deal.next_call_date ? (
                        <span
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 13,
                            color: 'var(--color-text-secondary)',
                          }}
                        >
                          <Clock size={12} />
                          {formatDate(deal.next_call_date)}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <DealForm
          onClose={() => setShowForm(false)}
          onCreated={loadDeals}
        />
      )}
    </>
  );
};
