import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { DealListItem, AIResponse } from '../types';
import { dealsApi } from '../api/deals';
import { aiApi } from '../api/ai';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { AIResponseRenderer } from '../components/ai/AIResponseRenderer';
import { ApiError } from '../api/client';
import { Brain, Bot, Send, ChevronDown, Sparkles } from 'lucide-react';

const EXAMPLE_QUESTIONS = [
  "What are the customer's biggest concerns?",
  "What happened in the previous call?",
  "What should I discuss in the next meeting?",
  "What commitments has the customer made?",
  "What are the biggest risks in this deal?",
  "What should my next action be?",
];

export const Copilot: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialDealId = searchParams.get('dealId');

  const [deals, setDeals] = useState<DealListItem[]>([]);
  const [selectedDealId, setSelectedDealId] = useState<number | null>(
    initialDealId ? Number(initialDealId) : null
  );
  const [useMemory, setUseMemory] = useState(true);
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState<AIResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingDeals, setLoadingDeals] = useState(true);

  useEffect(() => {
    dealsApi
      .list()
      .then((data) => {
        setDeals(data);
        if (!selectedDealId && data.length > 0) {
          setSelectedDealId(data[0].id);
        }
        setLoadingDeals(false);
      })
      .catch(() => setLoadingDeals(false));
  }, []);

  const handleAsk = useCallback(async () => {
    if (!selectedDealId || !question.trim()) return;
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const res = await aiApi.chat(selectedDealId, question.trim(), useMemory);
      setResponse(res);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('AI service temporarily unavailable. Please retry.');
      }
    } finally {
      setLoading(false);
    }
  }, [selectedDealId, question, useMemory]);

  const selectedDeal = deals.find((d) => d.id === selectedDealId);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Copilot</h1>
          <p className="page-subtitle">Ask questions about your deals and customer conversations</p>
        </div>
      </div>

      <div className="page-body">
        <div className="copilot-layout">
          {/* Controls Bar */}
          <div className="card mb-4">
            <div className="form-grid" style={{ alignItems: 'flex-end' }}>
              {/* Select Deal */}
              <div className="form-group">
                <label className="form-label" htmlFor="copilot-deal">
                  Deal
                </label>
                {loadingDeals ? (
                  <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Loading deals…</div>
                ) : (
                  <div style={{ position: 'relative' }}>
                    <select
                      id="copilot-deal"
                      className="form-select"
                      style={{ paddingRight: 32, appearance: 'none' }}
                      value={selectedDealId ?? ''}
                      onChange={(e) => {
                        setSelectedDealId(Number(e.target.value));
                        setResponse(null);
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

              {/* Memory Toggle */}
              <div className="form-group" style={{ minWidth: 160 }}>
                <label className="form-label">Long-Term Memory</label>
                <button
                  type="button"
                  className={`btn btn-sm ${useMemory ? 'btn-memory-active' : 'btn-secondary'}`}
                  onClick={() => setUseMemory(!useMemory)}
                  style={{ width: '100%', height: 38 }}
                >
                  <Brain size={14} />
                  Memory: {useMemory ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

            {selectedDeal && (
              <div className="deal-context-bar mt-3 flex items-center justify-between">
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  Active Context: <strong>{selectedDeal.company_name}</strong> ({selectedDeal.stage}, Owner: {selectedDeal.owner})
                </span>
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                  Hindsight {useMemory ? 'Active' : 'Disabled'}
                </span>
              </div>
            )}
          </div>

          {/* Question Input Card */}
          <div className="card mb-4">
            <div className="form-group mb-3">
              <label className="form-label" htmlFor="copilot-question">
                Ask DealIQ about this deal:
              </label>
              <div style={{ position: 'relative' }}>
                <textarea
                  id="copilot-question"
                  className="form-textarea"
                  rows={3}
                  placeholder="e.g. What are the customer's biggest concerns?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAsk();
                    }
                  }}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Example Prompts */}
            <div className="mb-4">
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>
                Suggested questions:
              </span>
              <div className="example-chips flex gap-2" style={{ flexWrap: 'wrap' }}>
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
                onClick={handleAsk}
                disabled={loading || !question.trim() || !selectedDealId}
                id="btn-ask-copilot"
              >
                <Send size={14} />
                {loading ? 'Analyzing…' : 'Ask DealIQ'}
              </button>
            </div>
          </div>

          {/* AI Response Display */}
          {loading && (
            <div className="card mb-4">
              <LoadingState text="DealIQ is querying long-term memory and synthesizing answer…" />
            </div>
          )}

          {error && (
            <div className="mb-4">
              <ErrorState message={error} onRetry={handleAsk} />
            </div>
          )}

          {response && !loading && (
            <div className="card mb-4">
              <div className="section-title mb-4">
                <Bot size={15} style={{ color: 'var(--color-brand)' }} />
                <span>Response for: "{response.question}"</span>
              </div>
              <AIResponseRenderer response={response} />
            </div>
          )}

          {!response && !loading && (
            <div className="card empty-state" style={{ padding: '36px 16px' }}>
              <Sparkles size={28} style={{ color: 'var(--color-brand)', marginBottom: 8 }} />
              <div className="empty-title">Ask DealIQ about this deal</div>
              <div className="empty-description">
                Ask questions about past discussions, customer objections, timeline requirements, or next steps.
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
