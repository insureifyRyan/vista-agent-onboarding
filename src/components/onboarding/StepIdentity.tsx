'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import styles from './Steps.module.css';

export interface IdentityValues {
  firstName: string;
  lastName: string;
  email: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isIdentityValid({ firstName, lastName, email }: IdentityValues): boolean {
  return (
    firstName.trim().length > 0 && lastName.trim().length > 0 && EMAIL_PATTERN.test(email.trim())
  );
}

interface StepIdentityProps {
  values: IdentityValues;
  onChange: (values: IdentityValues) => void;
  onSubmit: () => void;
  busy: boolean;
  error: string | null;
}

export function StepIdentity({ values, onChange, onSubmit, busy, error }: StepIdentityProps) {
  const [touchedEmail, setTouchedEmail] = useState(false);
  const valid = isIdentityValid(values);
  const emailError =
    touchedEmail && values.email.trim() && !EMAIL_PATTERN.test(values.email.trim())
      ? 'Enter a valid work email'
      : null;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (valid && !busy) onSubmit();
      }}
    >
      <div className={styles.eyebrow}>Agent sign-up</div>
      <h1 className={styles.heading}>Get started in seconds</h1>
      <p className={styles.subcopy}>
        No password required. We&apos;ll email you a quick verification code.
      </p>

      <div className={styles.nameGrid}>
        <TextField
          label="First name"
          placeholder="Jordan"
          autoComplete="given-name"
          value={values.firstName}
          onChange={(event) => onChange({ ...values, firstName: event.target.value })}
        />
        <TextField
          label="Last name"
          placeholder="Reyes"
          autoComplete="family-name"
          value={values.lastName}
          onChange={(event) => onChange({ ...values, lastName: event.target.value })}
        />
        <TextField
          className={styles.fullWidth}
          label="Work email"
          type="email"
          inputMode="email"
          placeholder="you@agency.com"
          autoComplete="email"
          value={values.email}
          error={emailError}
          onBlur={() => setTouchedEmail(true)}
          onChange={(event) => onChange({ ...values, email: event.target.value })}
        />
      </div>

      {error ? <p className={styles.formError} role="alert">{error}</p> : null}

      <Button
        type="submit"
        className={styles.primaryAction}
        disabled={!valid || busy}
        aria-busy={busy}
      >
        {busy ? 'Sending…' : 'Send verification code →'}
      </Button>

      <p className={styles.footnote}>
        Already have an account? <b>Sign in</b>
      </p>
    </form>
  );
}
