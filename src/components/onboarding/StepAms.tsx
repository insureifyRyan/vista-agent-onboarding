'use client';

import { useId } from 'react';
import { AMS_OPTIONS, amsStatusFor, type AmsName } from '@/lib/ams/catalog';
import { primaryButtonLabel } from '@/lib/ams/copy';
import type { EligibleVehicleCount } from '@/lib/ams/eligibleVehicles';
import { Button } from '@/components/ui/Button';
import { AmsHint, LivePanel, ManualPanel, WaitlistPanel } from '@/components/ui/Panel';
import styles from './Steps.module.css';

interface StepAmsProps {
  ams: AmsName | null;
  onAmsChange: (ams: AmsName | null) => void;
  bookSize: string;
  onBookSizeChange: (value: string) => void;
  eligibleVehicles: EligibleVehicleCount | null;
  onSubmit: () => void;
  onBack: () => void;
  busy: boolean;
  error: string | null;
}

export function StepAms({
  ams,
  onAmsChange,
  bookSize,
  onBookSizeChange,
  eligibleVehicles,
  onSubmit,
  onBack,
  busy,
  error,
}: StepAmsProps) {
  const selectId = useId();
  const bookSizeId = useId();
  const status = ams ? amsStatusFor(ams) : null;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (ams && !busy) onSubmit();
      }}
    >
      <div className={styles.eyebrow}>Connect your book</div>
      <h1 className={styles.heading}>Connect your AMS</h1>
      <p className={styles.subcopyTight}>
        This is the part that does the selling. Vista reads eligible vehicles from your book and
        prices coverage for them.
      </p>

      <div className={styles.selectField}>
        <label className={styles.selectLabel} htmlFor={selectId}>
          Which agency management system do you run?
        </label>
        <select
          id={selectId}
          className={styles.select}
          required
          value={ams ?? ''}
          onChange={(event) => onAmsChange((event.target.value || null) as AmsName | null)}
        >
          <option value="">Select your AMS</option>
          {AMS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      {ams === null ? <AmsHint /> : null}
      {ams && status === 'live' ? <LivePanel ams={ams} count={eligibleVehicles} /> : null}
      {ams && status === 'waitlist' ? <WaitlistPanel ams={ams} /> : null}
      {ams && status === 'none' ? <ManualPanel /> : null}

      {/* Asked only on the waitlist branch: it is what turns the list from a
          signup log into a build plan, and it would be friction on the two
          branches whose ranking it cannot affect. */}
      {status === 'waitlist' ? (
        <div className={styles.bookSize}>
          <div className={styles.selectField}>
            <label className={styles.selectLabel} htmlFor={bookSizeId}>
              Roughly how many vehicles are in your book? (optional)
            </label>
            <input
              id={bookSizeId}
              className={styles.select}
              type="text"
              inputMode="numeric"
              placeholder="e.g. 400"
              value={bookSize}
              onChange={(event) => onBookSizeChange(event.target.value.replace(/\D/g, '').slice(0, 7))}
            />
          </div>
          <p className={styles.bookSizeHelp}>
            We build integrations in the order the vehicles are, not the signups. This is the number
            that moves {ams} up the list.
          </p>
        </div>
      ) : null}

      {error ? <p className={styles.formError} role="alert">{error}</p> : null}

      <Button type="submit" className={styles.primaryActionTight} disabled={!ams || busy} aria-busy={busy}>
        {busy ? 'Saving…' : primaryButtonLabel(ams)}
      </Button>

      <Button variant="quiet" className={styles.backAction} onClick={onBack}>
        ← Back
      </Button>
    </form>
  );
}
