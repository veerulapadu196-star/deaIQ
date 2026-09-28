import React, { useEffect, useState } from 'react';
import type { DealListItem, MemoryCompareResponse } from '../types';
import { dealsApi } from '../api/deals';
import { aiApi } from '../api/ai';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { AIResponseRenderer } from '../components/ai/AIResponseRenderer';
import { ApiError } from '../api/client';
import { Brain, GitCompare, ChevronDown } from 'lucide-react';

const EXAMPLE_QUESTIONS = [
  "What are the customer's biggest concerns?",
  "What did we discuss in previous interactions?",
  "What is the customer's timeline?",
  "Who are the key decision makers?",
];

export const MemoryCompare: React.FC = () => {
  const [deals, setDeals] = useState<DealListItem[]>([]);
  const [selectedDealId, setSelectedDealId] = useState<number | null>(null);
  const [question, setQuestion] = useState(
    "What are the customer's biggest concerns?"
  );
  const [result, setResult] = useState<MemoryCompareResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingDeals, setLoadingDeals] = useState(true);

  useEffect(() => {
    dealsApi
      .list()
      .then((d) => {
        setDeals(d);
        if (d.length > 0) setSelectedDealId(d[0].id);
        setLoadingDeals(false);
      })
      .catch(() => setLoadingDeals(false));
  }, []);

  const handleCompare = async () => {
    if (!selectedDealId || !question.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await aiApi.memoryCompare(selectedDealId, question.trim());
      setResult(res);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('AI service temporarily unavailable. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  const selectedDeal = deals.find((d) => d.id === selectedDealId);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Memory Compare</h1>
          <p className="page-subtitle">
            Demonstrate why DealIQ's long-term memory makes AI responses significantly more useful
          </p>
        </div>
      </div>

      <div className="page-body">
        {/* Explanatory Banner */}
        <div className="notice notice-info mb-4">
          <Brain size={16} style={{ flexShrink: 0, marginTop: 1, color: 'var(--color-brand)' }} />
          <div>
            <strong>How Memory Compare Works:</strong> DealIQ submits your question under two configurations:
            <strong> Memory ON</strong> (includes full long-term interaction history recalled via Hindsight) versus
            <strong> Memory OFF</strong> (only baseline deal attributes without memory). This proves the value of persistent context.
          </div>
        </div>

        {/* Configuration Card */}
        <div className="card mb-4">
          <div className="section-title mb-3">
            <GitCompare size={14} />
            Configure Comparison {selectedDeal ? `— ${selectedDeal.company_name}` : ''}
          </div>

          <div className="form-grid mb-3">
            <div className="form-group">
              <label className="form-label" htmlFor="compare-deal">
                Select Deal
              </label>
              {loadingDeals ? (
                <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Loading deals…</div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <select
                    id="compare-deal"
                    className="form-select"
                    style={{ paddingRight: 32, appearance: 'none' }}
                    value={selectedDealId ?? ''}
                    onChange={(e) => {
                      setSelectedDealId(Number(e.target.value));
                      setResult(null);
                    }}
                  >
                    {deals.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.company_name} – {d.deal_name}
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
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="compare-question">
                Question to Ask
              </label>
              <input
                id="compare-question"
                className="form-input"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="What are the customer's biggest concerns?"
              />
            </div>
          </div>

          {/* Quick Question Chips */}
          <div className="mb-4">
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>
              Quick test questions:
            </span>
            <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
              {EXAMPLE_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  type="button"
                  className="chip-btn"
                  onClick={() => setQuestion(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCompare}
              disabled={loading || !selectedDealId || !question.trim()}
              id="btn-run-compare"
            >
              <GitCompare size={14} />
              {loading ? 'Comparing Responses…' : 'Run Memory Compare'}
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="card mb-4">
            <LoadingState text="Executing dual LLM passes: Memory ON vs Memory OFF…" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4">
            <ErrorState message={error} onRetry={handleCompare} />
          </div>
        )}

        {/* Comparison Results */}
        {result && !loading && (
          <div className="compare-grid">
            {/* Memory ON */}
            <div className="card compare-card compare-card-on">
              <div className="compare-card-header flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="status-dot status-dot-on" />
                  <span className="compare-title">MEMORY ON</span>
                </div>
                <span className="compare-sub">Context-aware DealIQ answer</span>
              </div>
              <AIResponseRenderer response={result.memory_on} />
            </div>

            {/* Memory OFF */}
            <div className="card compare-card compare-card-off">
              <div className="compare-card-header flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="status-dot status-dot-off" />
                  <span className="compare-title">MEMORY OFF</span>
                </div>
                <span className="compare-sub">Generic LLM without deal memory</span>
              </div>
              <AIResponseRenderer response={result.memory_off} />
            </div>
          </div>
        )}
      </div>
    </>
  );
};
