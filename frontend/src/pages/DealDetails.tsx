import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type {
  Deal,
  Interaction,
  CallBriefingResponse,
  FollowUpEmailResponse,
  PreparationStatus,
  EmailStatus,
} from '../types';
import { dealsApi } from '../api/deals';
import { interactionsApi } from '../api/interactions';
import { aiApi } from '../api/ai';
import { formatINR, formatDate, getStageClass, getStatusClass } from '../utils';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { Badge } from '../components/common/Badge';
import { InteractionTimeline } from '../components/deals/InteractionTimeline';
import { InteractionForm } from '../components/deals/InteractionForm';
import { AIResponseRenderer } from '../components/ai/AIResponseRenderer';
import { EmailEditor } from '../components/ai/EmailEditor';
import { ApiError } from '../api/client';
import {
  ArrowLeft,
  User,
  Calendar,
  Phone,
  Brain,
  Sparkles,
  Mail,
  ChevronDown,
  ChevronUp,
  MessageSquare,
} from 'lucide-react';

export const DealDetails: React.FC = () => {
  const { dealId } = useParams<{ dealId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const id = Number(dealId);

  const [deal, setDeal] = useState<Deal | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loadingDeal, setLoadingDeal] = useState(true);
  const [dealError, setDealError] = useState<string | null>(null);

  // AI Briefing State
  const [preparationStatus, setPreparationStatus] = useState<PreparationStatus>('idle');
  const [briefing, setBriefing] = useState<CallBriefingResponse | null>(null);
  const [briefingError, setBriefingError] = useState<string | null>(null);
  const [showBriefing, setShowBriefing] = useState(false);

  // AI Email State
  const [emailStatus, setEmailStatus] = useState<EmailStatus>('idle');
  const [email, setEmail] = useState<FollowUpEmailResponse | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [showEmail, setShowEmail] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);


  const loadDeal = useCallback(async () => {
    setLoadingDeal(true);
    setDealError(null);
    // Reset preparation and email workflow states on deal reload/switch
    setPreparationStatus('idle');
    setBriefing(null);
    setBriefingError(null);
    setShowBriefing(false);

    setEmailStatus('idle');
    setEmail(null);
    setEmailError(null);
    setShowEmail(false);
    setIsRegenerating(false);


    try {
      const [d, i] = await Promise.all([
        dealsApi.get(id),
        interactionsApi.list(id),
      ]);
      setDeal(d);
      setInteractions(i);
    } catch (err) {
      if (err instanceof ApiError) setDealError(err.message);
      else setDealError('Unable to load this deal.');
    } finally {
      setLoadingDeal(false);
    }
  }, [id]);

  useEffect(() => {
    loadDeal();
  }, [loadDeal]);

  const handleInteractionSaved = () => {
    interactionsApi.list(id).then(setInteractions).catch(() => {});
  };

  const handlePrepareCall = async (): Promise<CallBriefingResponse | null> => {
    if (preparationStatus === 'preparing') {
      return null;
    }
    setPreparationStatus('preparing');
    setBriefingError(null);
    setShowBriefing(true);
    try {
      const b = await aiApi.prepareCall(id);
      setBriefing(b);
      setPreparationStatus('completed');
      return b;
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'AI service temporarily unavailable. Please retry.';
      setBriefingError(msg);
      setPreparationStatus('error');
      return null;
    }
  };

  const handleFollowUpEmail = async () => {
    // Sequential guard: preparation must be completed before generating email
    if (preparationStatus !== 'completed') {
      return;
    }
    if (emailStatus === 'generating') {
      return;
    }
    setEmailStatus('generating');
    setEmailError(null);
    setShowEmail(true);
    try {
      const e = await aiApi.followUpEmail(id);
      setEmail(e);
      setEmailStatus('completed');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'AI service temporarily unavailable. Please retry.';
      setEmailError(msg);
      setEmailStatus('error');
    }
  };

  const handleRegenerateEmail = async () => {
    if (isRegenerating) return;
    setIsRegenerating(true);
    try {
      const e = await aiApi.followUpEmail(id);
      setEmail(e);
      setEmailStatus('completed');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'AI service temporarily unavailable. Please retry.';
      setEmailError(msg);
    } finally {
      setIsRegenerating(false);
    }
  };


  // Handle action query param (e.g. ?action=prepare or ?action=email)
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'prepare') {
      handlePrepareCall();
    } else if (action === 'email') {
      // Sequential flow: prepare first, then generate email upon completion
      const runSequentialEmailFlow = async () => {
        let b = briefing;
        if (preparationStatus !== 'completed' || !b) {
          b = await handlePrepareCall();
          if (!b) return; // Preparation failed; do not generate email
        }
        setEmailStatus('generating');
        setEmailError(null);
        setShowEmail(true);
        try {
          const e = await aiApi.followUpEmail(id);
          setEmail(e);
          setEmailStatus('completed');
        } catch (err) {
          const msg = err instanceof ApiError ? err.message : 'AI service temporarily unavailable. Please retry.';
          setEmailError(msg);
          setEmailStatus('error');
        }
      };
      runSequentialEmailFlow();
    } else if (action === 'note') {
      const el = document.getElementById('add-interaction-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  }, [searchParams]);


  if (loadingDeal) {
    return (
      <div className="page-body">
        <LoadingState text="Loading deal details…" />
      </div>
    );
  }

  if (dealError || !deal) {
    return (
      <div className="page-body">
        <button className="back-link" onClick={() => navigate('/deals')}>
          <ArrowLeft size={14} /> Back to Deals
        </button>
        <ErrorState
          title="Unable to load deal"
          message={dealError ?? 'Deal not found.'}
          onRetry={loadDeal}
        />
      </div>
    );
  }

  return (
    <div className="page-body" style={{ maxWidth: 1200 }}>
      {/* Back button */}
      <button className="back-link" onClick={() => navigate('/deals')}>
        <ArrowLeft size={14} /> Back to Deals
      </button>

      {/* Deal Header Card */}
      <div className="deal-header mb-5">
        <div className="deal-header-top">
          <div>
            <div className="deal-company">{deal.company_name}</div>
            <div className="deal-name">{deal.deal_name}</div>
            <div className="deal-badges mt-2 flex gap-2" style={{ flexWrap: 'wrap' }}>
              <Badge className={getStageClass(deal.stage)}>{deal.stage}</Badge>
              <Badge className={getStatusClass(deal.status)}>{deal.status}</Badge>
              {deal.memory_bank_id && (
                <Badge className="badge-memory" style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <Brain size={10} />
                  Memory Active
                </Badge>
              )}
            </div>
          </div>
          <div className="deal-value">{formatINR(deal.deal_value)}</div>
        </div>

        {/* Info Grid */}
        <div className="deal-info-grid">
          <div className="deal-info-item">
            <span className="deal-info-label">
              <User size={11} style={{ marginRight: 3, display: 'inline' }} />
              Owner
            </span>
            <span className="deal-info-value">{deal.owner}</span>
          </div>
          <div className="deal-info-item">
            <span className="deal-info-label">
              <Calendar size={11} style={{ marginRight: 3, display: 'inline' }} />
              Expected Close
            </span>
            <span className="deal-info-value">{formatDate(deal.expected_close_date)}</span>
          </div>
          <div className="deal-info-item">
            <span className="deal-info-label">
              <Phone size={11} style={{ marginRight: 3, display: 'inline' }} />
              Next Call
            </span>
            <span className="deal-info-value">{formatDate(deal.next_call_date)}</span>
          </div>
          <div className="deal-info-item">
            <span className="deal-info-label">
              <MessageSquare size={11} style={{ marginRight: 3, display: 'inline' }} />
              Interactions
            </span>
            <span className="deal-info-value">{interactions.length}</span>
          </div>
        </div>
      </div>

      {/* AI Actions Row */}
      <div className="card mb-5">
        <div className="flex items-center justify-between mb-3" style={{ flexWrap: 'wrap', gap: 8 }}>
          <div className="section-title" style={{ margin: 0 }}>
            <Sparkles size={14} style={{ color: 'var(--color-brand)' }} />
            DealIQ AI Actions
          </div>
          <button
            className="btn btn-ghost btn-sm text-brand"
            onClick={() => navigate(`/copilot?dealId=${deal.id}`)}
          >
            Ask in AI Copilot →
          </button>
        </div>

        <div className="flex gap-3" style={{ flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary"
            onClick={handlePrepareCall}
            disabled={preparationStatus === 'preparing'}
            id="btn-prepare-call"
          >
            <Sparkles size={14} />
            {preparationStatus === 'preparing' ? 'Preparing Briefing…' : 'Prepare for Next Call'}
          </button>

          <button
            className="btn btn-secondary"
            onClick={handleFollowUpEmail}
            disabled={preparationStatus !== 'completed' || emailStatus === 'generating'}
            title={
              preparationStatus !== 'completed'
                ? 'Prepare for next call first to enable follow-up email'
                : undefined
            }
            id="btn-follow-up-email"
          >
            <Mail size={14} />
            {emailStatus === 'generating' ? 'Generating Draft…' : 'Generate Follow-up Email'}
          </button>
        </div>
      </div>

      {/* AI Next Call Briefing Accordion / Box */}
      {showBriefing && (
        <div className="card mb-5 briefing-card" id="briefing-section">
          <div
            className="flex items-center justify-between cursor-pointer mb-3"
            onClick={() => setShowBriefing(!showBriefing)}
          >
            <div className="section-title" style={{ margin: 0 }}>
              <Sparkles size={14} style={{ color: 'var(--color-brand)' }} />
              Next Call Briefing: {deal.company_name} – {deal.deal_name}
            </div>
            {showBriefing ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>

          {preparationStatus === 'preparing' ? (
            <LoadingState text="Building briefing with Deal context + Hindsight memory…" />
          ) : preparationStatus === 'error' ? (
            <ErrorState message={briefingError || 'Failed to prepare call briefing.'} onRetry={handlePrepareCall} />
          ) : briefing ? (
            <AIResponseRenderer
              response={{
                question: 'Prepare for Next Call',
                sections: briefing.sections,
                answer_raw: briefing.briefing_raw,
                memory_used: true,
                model_used: briefing.model_used,
              }}
            />
          ) : null}
        </div>
      )}

      {/* AI Follow-Up Email Accordion / Box */}
      {showEmail && (
        <div className="card mb-5" id="email-section">
          <div
            className="flex items-center justify-between cursor-pointer mb-3"
            onClick={() => setShowEmail(!showEmail)}
          >
            <div className="section-title" style={{ margin: 0 }}>
              <Mail size={14} style={{ color: 'var(--color-brand)' }} />
              Follow-up Email Draft
            </div>
            {showEmail ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>

          {emailStatus === 'generating' ? (
            <LoadingState text="Synthesizing deal discussions and drafting email…" />
          ) : emailStatus === 'error' ? (
            <ErrorState message={emailError || 'Failed to generate email draft.'} onRetry={handleFollowUpEmail} />
          ) : emailStatus === 'completed' && email ? (
            <EmailEditor
              email={email}
              onRegenerate={handleRegenerateEmail}
              regenerating={isRegenerating}
            />
          ) : null}

        </div>
      )}


      {/* Interaction History Timeline */}
      <div className="card mb-5">
        <div className="section-title mb-3">
          <Phone size={14} />
          Interaction History ({interactions.length})
        </div>
        <InteractionTimeline interactions={interactions} />
      </div>

      {/* Add New Interaction Form */}
      <InteractionForm dealId={id} onSaved={handleInteractionSaved} />
    </div>
  );
};
