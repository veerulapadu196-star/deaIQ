import React, { useState } from 'react';
import type { FollowUpEmailResponse } from '../../types';
import { Copy, Check, RotateCw, Mail } from 'lucide-react';

interface EmailEditorProps {
  email: FollowUpEmailResponse;
  onRegenerate: () => void;
  regenerating: boolean;
}

export const EmailEditor: React.FC<EmailEditorProps> = ({
  email,
  onRegenerate,
  regenerating,
}) => {
  const [to, setTo] = useState(email.to);
  const [subject, setSubject] = useState(email.subject);
  const [body, setBody] = useState(email.body);
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    setTo(email.to);
    setSubject(email.subject);
    setBody(email.body);
  }, [email]);


  const handleCopy = async () => {
    const fullText = `To: ${to}\nSubject: ${subject}\n\n${body}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="email-editor-card">
      <div className="flex items-center justify-between mb-4">
        <div className="section-title" style={{ margin: 0 }}>
          <Mail size={14} />
          Follow-Up Email Draft
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onRegenerate}
            disabled={regenerating}
            id="btn-regenerate-email"
          >
            <RotateCw size={13} className={regenerating ? 'spinner' : ''} />
            Regenerate
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleCopy}
            id="btn-copy-email"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      <div className="form-group mb-3">
        <label className="form-label" htmlFor="email-to">
          To:
        </label>
        <input
          id="email-to"
          className="form-input"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </div>

      <div className="form-group mb-3">
        <label className="form-label" htmlFor="email-subject">
          Subject:
        </label>
        <input
          id="email-subject"
          className="form-input"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="email-body">
          Email Body (Editable):
        </label>
        <textarea
          id="email-body"
          className="form-textarea"
          rows={10}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>
    </div>
  );
};
