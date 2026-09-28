import React, { useState } from 'react';
import type { DealCreateInput, DealStage, DealStatus } from '../../types';
import { dealsApi } from '../../api/deals';
import { ApiError } from '../../api/client';
import { Modal } from '../common/Modal';
import { Loader2 } from 'lucide-react';

interface DealFormProps {
  onClose: () => void;
  onCreated: () => void;
}

const STAGES: DealStage[] = [
  'Discovery',
  'Qualification',
  'Proposal',
  'Negotiation',
  'Closed Won',
  'Closed Lost',
];

const STATUSES: DealStatus[] = ['Active', 'On Hold', 'Closed'];

export const DealForm: React.FC<DealFormProps> = ({ onClose, onCreated }) => {
  const [companyName, setCompanyName] = useState('');
  const [dealName, setDealName] = useState('');
  const [dealValue, setDealValue] = useState('');
  const [stage, setStage] = useState<DealStage>('Discovery');
  const [status, setStatus] = useState<DealStatus>('Active');
  const [owner, setOwner] = useState('');
  const [expectedCloseDate, setExpectedCloseDate] = useState('');
  const [nextCallDate, setNextCallDate] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!companyName.trim()) {
      setError('Company Name is required.');
      return;
    }
    if (!dealName.trim()) {
      setError('Deal Name is required.');
      return;
    }
    const val = parseFloat(dealValue.replace(/,/g, ''));
    if (isNaN(val) || val < 0) {
      setError('Deal Value must be a valid positive number in INR (₹).');
      return;
    }
    if (!owner.trim()) {
      setError('Deal Owner is required.');
      return;
    }

    const payload: DealCreateInput = {
      company_name: companyName.trim(),
      deal_name: dealName.trim(),
      deal_value: val,
      stage,
      status,
      owner: owner.trim(),
      expected_close_date: expectedCloseDate || null,
      next_call_date: nextCallDate || null,
    };

    setLoading(true);
    try {
      await dealsApi.create(payload);
      onCreated();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to create deal. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Create New Deal" onClose={onClose} maxWidth={560}>
      <form onSubmit={handleSubmit} noValidate>
        {error && (
          <div className="alert alert-error mb-4" role="alert">
            {error}
          </div>
        )}

        <div className="form-group mb-3">
          <label className="form-label" htmlFor="company-name">
            Company Name <span className="text-danger">*</span>
          </label>
          <input
            id="company-name"
            className="form-input"
            placeholder="e.g. TechNova Solutions"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        <div className="form-group mb-3">
          <label className="form-label" htmlFor="deal-name">
            Deal Name <span className="text-danger">*</span>
          </label>
          <input
            id="deal-name"
            className="form-input"
            placeholder="e.g. AI Automation Platform"
            value={dealName}
            onChange={(e) => setDealName(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        <div className="form-grid mb-3">
          <div className="form-group">
            <label className="form-label" htmlFor="deal-value">
              Deal Value (₹ INR) <span className="text-danger">*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <span className="currency-prefix">₹</span>
              <input
                id="deal-value"
                className="form-input"
                style={{ paddingLeft: 28 }}
                placeholder="1500000"
                type="number"
                min="0"
                step="any"
                value={dealValue}
                onChange={(e) => setDealValue(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <span className="form-hint">Indian Rupees only</span>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="deal-owner">
              Owner <span className="text-danger">*</span>
            </label>
            <input
              id="deal-owner"
              className="form-input"
              placeholder="e.g. Rahul"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              disabled={loading}
              required
            />
          </div>
        </div>

        <div className="form-grid mb-3">
          <div className="form-group">
            <label className="form-label" htmlFor="deal-stage">
              Stage <span className="text-danger">*</span>
            </label>
            <select
              id="deal-stage"
              className="form-select"
              value={stage}
              onChange={(e) => setStage(e.target.value as DealStage)}
              disabled={loading}
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="deal-status">
              Status
            </label>
            <select
              id="deal-status"
              className="form-select"
              value={status}
              onChange={(e) => setStatus(e.target.value as DealStatus)}
              disabled={loading}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-grid mb-4">
          <div className="form-group">
            <label className="form-label" htmlFor="expected-close">
              Expected Close Date
            </label>
            <input
              id="expected-close"
              type="date"
              className="form-input"
              value={expectedCloseDate}
              onChange={(e) => setExpectedCloseDate(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="next-call">
              Next Call Date
            </label>
            <input
              id="next-call"
              type="date"
              className="form-input"
              value={nextCallDate}
              onChange={(e) => setNextCallDate(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            id="btn-submit-deal"
          >
            {loading && <Loader2 size={14} className="spinner" />}
            {loading ? 'Creating…' : 'Create Deal'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
