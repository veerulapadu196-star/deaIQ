import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Activity, DealListItem, PipelineSummary } from '../types';
import { dealsApi } from '../api/deals';
import { interactionsApi } from '../api/interactions';
import { formatINR, formatDate, formatActivityTime, getStageClass } from '../utils';
import { LoadingState } from '../components/common/LoadingState';
import { Badge } from '../components/common/Badge';
import { ApiError } from '../api/client';
import {
  TrendingUp,
  Building2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Mail,
  FileText,
  Clock,
  Phone,
  MessageSquare,
  Brain,
  RefreshCw,
  Loader2,
} from 'lucide-react';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  Call: <Phone size={11} />,
  Meeting: <MessageSquare size={11} />,
  Email: <Mail size={11} />,
  Note: <FileText size={11} />,
};

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<PipelineSummary | null>(null);
  const [recentDeals, setRecentDeals] = useState<DealListItem[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);

  const loadActivities = async () => {
    setLoadingActivities(true);
    setActivitiesError(null);
    try {
      const rawData = await interactionsApi.recent(10);
      let list: Activity[] = [];
      if (Array.isArray(rawData)) {
        list = rawData;
      } else if (rawData && typeof rawData === 'object') {
        const wrapped = rawData as Record<string, unknown>;
        if (Array.isArray(wrapped.data)) {
          list = wrapped.data as Activity[];
        } else if (Array.isArray(wrapped.activities)) {
          list = wrapped.activities as Activity[];
        } else if (Array.isArray(wrapped.interactions)) {
          list = wrapped.interactions as Activity[];
        } else {
          throw new Error('Unexpected activity payload structure');
        }
      } else {
        throw new Error('Invalid activity payload structure');
      }
      setActivities(list);
    } catch (err) {
      if (err instanceof ApiError) {
        setActivitiesError(err.message || 'Unable to load recent activity.');
      } else {
        setActivitiesError('Unable to load recent activity.');
      }
    } finally {
      setLoadingActivities(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sum, deals] = await Promise.all([dealsApi.summary(), dealsApi.list()]);
      setSummary(sum);
      setRecentDeals(deals.slice(0, 5));
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
    loadActivities();
  };

  useEffect(() => {
    loadData();
  }, []);


  if (loading && loadingActivities) {
    return (
      <div className="page-body">
        <LoadingState text="Loading DealIQ dashboard…" />
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Your DealIQ sales pipeline and memory at a glance</p>
        </div>
      </div>

      <div className="page-body">
        {error && (
          <div className="alert alert-error mb-4" role="alert">
            <AlertCircle size={16} style={{ marginRight: 8, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>{error}</div>
            <button className="btn btn-secondary btn-sm" onClick={loadData}>
              Retry
            </button>
          </div>
        )}

        {/* KPI Stat Cards */}
        <div className="kpi-grid mb-5">
          <div className="stat-card">
            <div className="stat-label">
              <TrendingUp size={14} style={{ color: 'var(--color-brand)' }} />
              Pipeline Value
            </div>
            <div className="stat-value">{formatINR(summary?.total_pipeline_value ?? 0)}</div>
            <div className="stat-sublabel">Active opportunities</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">
              <Building2 size={14} style={{ color: 'var(--color-brand)' }} />
              Active Deals
            </div>
            <div className="stat-value">{summary?.active_deals ?? 0}</div>
            <div className="stat-sublabel">of {summary?.total_deals ?? 0} total deals</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">
              <AlertCircle size={14} style={{ color: 'var(--color-warning)' }} />
              Need Attention
            </div>
            <div
              className="stat-value"
              style={{
                color: (summary?.deals_needing_attention ?? 0) > 0 ? 'var(--color-warning)' : undefined,
              }}
            >
              {summary?.deals_needing_attention ?? 0}
            </div>
            <div className="stat-sublabel">Discovery or no call date</div>
          </div>
        </div>

        {/* Dashboard 2-column Layout */}
        <div className="dashboard-grid">
          {/* Recent Deals Table Card */}
          <div className="card dashboard-deals-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="card-title" style={{ margin: 0 }}>
                  Recent Deals
                </div>
                <div className="card-subtitle">Active pipeline opportunities</div>
              </div>
              <button
                className="btn btn-ghost btn-sm text-brand"
                onClick={() => navigate('/deals')}
              >
                View all <ArrowRight size={13} />
              </button>
            </div>

            {recentDeals.length === 0 ? (
              <div className="empty-state">
                <div className="empty-title">No deals yet</div>
                <div className="empty-description">Create your first deal to start using DealIQ.</div>
                <button className="btn btn-primary btn-sm" onClick={() => navigate('/deals')}>
                  Go to Deals
                </button>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="recent-deals-table">
                  <thead>
                    <tr>
                      <th style={{ width: '34%' }}>Deal / Company</th>
                      <th style={{ width: '14%' }}>Stage</th>
                      <th style={{ width: '16%' }}>Value</th>
                      <th style={{ width: '14%' }}>Owner</th>
                      <th style={{ width: '22%', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentDeals.map((deal) => (
                      <tr key={deal.id}>
                        <td>
                          <div
                            className="deal-cell-clickable"
                            onClick={() => navigate(`/deals/${deal.id}`)}
                          >
                            <div className="table-company">{deal.company_name}</div>
                            <div className="table-deal-name">{deal.deal_name}</div>
                          </div>
                        </td>
                        <td>
                          <Badge className={getStageClass(deal.stage)}>{deal.stage}</Badge>
                        </td>
                        <td className="table-value">{formatINR(deal.deal_value)}</td>
                        <td className="table-owner">{deal.owner}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="table-actions">
                            <button
                              className="action-btn"
                              title="Prepare for next call"
                              onClick={() => navigate(`/deals/${deal.id}?action=prepare`)}
                            >
                              <Sparkles size={12} />
                              <span>Prep</span>
                            </button>
                            <button
                              className="action-btn"
                              title="Generate follow-up email"
                              onClick={() => navigate(`/deals/${deal.id}?action=email`)}
                            >
                              <Mail size={12} />
                              <span>Email</span>
                            </button>
                            <button
                              className="action-btn"
                              title="Add call note"
                              onClick={() => navigate(`/deals/${deal.id}?action=note`)}
                            >
                              <FileText size={12} />
                              <span>Note</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Activity Card */}
          <div className="card dashboard-activity-card">
            <div className="card-title mb-1">Recent Activity</div>
            <div className="card-subtitle mb-4">Customer notes and memory updates</div>

            {loadingActivities ? (
              <div className="activity-loading-state">
                <Loader2 size={24} className="spinner" style={{ color: 'var(--color-brand)', marginBottom: 8 }} />
                <div>Loading recent activity...</div>
              </div>
            ) : activitiesError ? (
              <div className="activity-error-state">
                <AlertCircle size={24} style={{ color: 'var(--color-danger)', marginBottom: 6 }} />
                <div className="activity-error-title">Unable to load recent activity.</div>
                <div className="activity-error-sub">{activitiesError}</div>
                <button
                  className="btn btn-secondary btn-sm mt-2"
                  onClick={loadActivities}
                  title="Retry loading recent activity"
                >
                  <RefreshCw size={12} />
                  <span>Retry</span>
                </button>
              </div>
            ) : activities.length === 0 ? (
              <div className="activity-empty-state">
                <Clock size={28} className="activity-icon-empty" />
                <div className="activity-empty-title">No recorded sales interactions yet.</div>
                <div className="activity-empty-sub">
                  Open a deal to record discussion notes and save them into DealIQ memory.
                </div>
                <button
                  className="btn btn-secondary btn-sm mt-3"
                  onClick={() => navigate('/deals')}
                >
                  Browse Deals
                </button>
              </div>
            ) : (
              <div className="activity-feed">
                {activities.map((act) => (
                  <div key={act.id} className="activity-feed-item">
                    <div className="activity-feed-header">
                      <div
                        className="activity-feed-deal"
                        onClick={() => navigate(`/deals/${act.deal_id}`)}
                        title={`View ${act.company_name || 'deal'} details`}
                      >
                        <span className="activity-company-name">
                          {act.company_name || `Deal #${act.deal_id}`}
                        </span>
                        {act.deal_name && (
                          <span className="activity-deal-name"> • {act.deal_name}</span>
                        )}
                      </div>
                      <span className="activity-feed-time" title={formatDate(act.created_at)}>
                        {formatActivityTime(act.created_at)}
                      </span>
                    </div>

                    <div className="activity-feed-content">{act.content}</div>

                    <div className="activity-feed-footer">
                      <div className="flex items-center gap-2">
                        <Badge
                          className="badge-type"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          {TYPE_ICONS[act.interaction_type] || <MessageSquare size={11} />}
                          <span>{act.interaction_type}</span>
                        </Badge>
                        {act.memory_saved && (
                          <Badge
                            className="badge-memory"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}
                          >
                            <Brain size={10} />
                            <span>In Memory</span>
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

