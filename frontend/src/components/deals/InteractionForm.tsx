import React, { useState } from 'react';
import type { InteractionType } from '../../types';
import { interactionsApi } from '../../api/interactions';
import { ApiError } from '../../api/client';
import { Brain, CheckCircle2, Loader2 } from 'lucide-react';

interface InteractionFormProps {
  dealId: number;
  onSaved: () => void;
}

const TYPES: InteractionType[] = ['Call', 'Meeting', 'Email', 'Note'];

export const InteractionForm: React.FC<InteractionFormProps> = ({ dealId, onSaved }) => {
  const [content, setContent] = useState('');
  const [type, setType] = useState<InteractionType>('Call');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      await interactionsApi.create(dealId, { content: content.trim(), interaction_type: type }, true);
      setContent('');
      setSaveSuccess(true);
      onSaved();
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to record interaction. Please retry.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card mb-4" id="add-interaction-section">
      <div className="section-title mb-3">
        <Brain size={14} />
        Add Customer Interaction & Save to Memory
      </div>

      <form onSubmit={handleSubmit}>
        {error && (
          <div className="alert alert-error mb-3" role="alert">
            {error}
          </div>
        )}

        {saveSuccess && (
          <div className="alert alert-success mb-3" role="status">
            <CheckCircle2 size={15} style={{ marginRight: 6 }} />
            Saved to DealIQ memory
          </div>
        )}

        <div className="form-group mb-3">
          <label className="form-label" htmlFor="interaction-content">
            What happened during the customer interaction?
          </label>
          <textarea
            id="interaction-content"
            className="form-textarea"
            rows={4}
            placeholder="e.g. Customer is interested in the solution but is concerned about integration with their existing SAP systems. They need deployment within 45 days. Pricing proposal requested. CTO will join the next meeting."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={saving}
            required
          />
        </div>

        <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div className="flex items-center gap-2">
            <label className="form-label" htmlFor="interaction-type" style={{ margin: 0 }}>
              Type:
            </label>
            <select
              id="interaction-type"
              className="form-select form-select-sm"
              value={type}
              onChange={(e) => setType(e.target.value as InteractionType)}
              disabled={saving}
              style={{ width: 'auto', minWidth: 100 }}
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving || !content.trim()}
            id="btn-save-memory"
          >
            {saving ? (
              <>
                <Loader2 size={13} className="spinner" />
                Saving to Memory…
              </>
            ) : (
              <>
                <Brain size={13} />
                Save to Memory
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
