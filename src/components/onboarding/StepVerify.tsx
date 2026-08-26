'use client';

import { Button } from '@/components/ui/Button';
import { CodeInput, isCodeComplete, type CodeDigits } from '@/components/ui/CodeInput';
import styles from './Steps.module.css';

interface StepVerifyProps {
  code: CodeDigits;
  onCodeChange: (code: CodeDigits) => void;
  onSubmit: () => void;
  onChangeEmail: () => void;
  onResend: () => void;
  busy: boolean;
  resending: boolean;
  error: string | null;
  notice: string | null;
}

export function StepVerify({
  code,
  onCodeChange,
  onSubmit,
  onChangeEmail,
  onResend,
  busy,
  resending,
  error,
  notice,
}: StepVerifyProps) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (isCodeComplete(code) && !busy) onSubmit();
      }}
    >
      <div className={styles.eyebrow}>Verify email</div>
      <h1 className={styles.heading}>Check your inbox</h1>
      <p className={styles.subcopy}>
        We sent a six-digit code to your work email. It expires in ten minutes.
      </p>

      <CodeInput value={code} onChange={onCodeChange} error={error} disabled={busy} />

      {notice ? <p className={styles.verifyRowText}>{notice}</p> : null}

      <Button type="submit" className={styles.primaryAction} disabled={!isCodeComplete(code) || busy} aria-busy={busy}>
        {busy ? 'Verifying…' : 'Verify and continue →'}
      </Button>

      <div className={styles.verifyRow}>
        <Button variant="quiet" inline onClick={onChangeEmail}>
          ← Change email
        </Button>
        <span className={styles.verifyRowText}>
          Didn&apos;t get it?{' '}
          <button type="button" className={styles.link} onClick={onResend} disabled={resending}>
            {resending ? 'Sending…' : 'Resend'}
          </button>
        </span>
      </div>
    </form>
  );
}
