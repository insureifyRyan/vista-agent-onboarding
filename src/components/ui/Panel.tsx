import type { ReactNode } from 'react';
import type { AmsName } from '@/lib/ams/catalog';
import { AMS_HINT, LIVE_PANEL, MANUAL_PANEL, WAITLIST_PANEL } from '@/lib/ams/copy';
import type { EligibleVehicleCount } from '@/lib/ams/eligibleVehicles';
import styles from './Panel.module.css';

/** Step 3, live branch. */
export function LivePanel({ ams, count }: { ams: AmsName; count: EligibleVehicleCount | null }) {
  return (
    <div className={styles.success}>
      <span className={styles.check} aria-hidden="true">
        ✓
      </span>
      <div>
        <div className={styles.successTitle}>{LIVE_PANEL.title(ams)}</div>
        <div className={styles.successBody}>{LIVE_PANEL.body}</div>
        <div className={styles.successPromise}>{LIVE_PANEL.promise}</div>
        <EligibleVehicles count={count} />
      </div>
    </div>
  );
}

/**
 * The eligible-vehicle count.
 *
 * Three states and no fourth: loading shows a skeleton, `ready` shows the real
 * figure from the agent's own book, and anything else shows nothing at all. There
 * is deliberately no placeholder number — the agent will check it against their
 * own book, and a sample figure would be a number we made up.
 */
function EligibleVehicles({ count }: { count: EligibleVehicleCount | null }) {
  if (count === null || count.status === 'pending') {
    return (
      <div className={styles.countRow}>
        <span className={styles.skeleton} role="status" aria-label="Counting eligible vehicles" />
      </div>
    );
  }
  if (count.status !== 'ready') return null;

  return (
    <>
      <div className={styles.countRow}>
        <span className={styles.count}>{count.count.toLocaleString('en-US')}</span>
        <span className={styles.countLabel}>eligible vehicles in your book</span>
      </div>
      <p className={styles.disclosure}>{LIVE_PANEL.countDisclosure}</p>
    </>
  );
}

/** Step 3, waitlist branch. */
export function WaitlistPanel({ ams }: { ams: AmsName }) {
  return (
    <Card eyebrow={WAITLIST_PANEL.eyebrow} eyebrowClass={styles.eyebrowWaitlist} title={WAITLIST_PANEL.title(ams)}>
      {WAITLIST_PANEL.body(ams)}
    </Card>
  );
}

/** Step 3, no-AMS branch. */
export function ManualPanel() {
  return (
    <Card eyebrow={MANUAL_PANEL.eyebrow} eyebrowClass={styles.eyebrowManual} title={MANUAL_PANEL.title}>
      {MANUAL_PANEL.body}
    </Card>
  );
}

/** Shown before an answer is picked. Carries the AMS claim qualifier. */
export function AmsHint() {
  return (
    <div className={styles.hint}>
      <span className={styles.hintCheck} aria-hidden="true">
        ✓
      </span>
      <span className={styles.hintText}>{AMS_HINT}</span>
    </div>
  );
}

function Card({
  eyebrow,
  eyebrowClass,
  title,
  children,
}: {
  eyebrow: string;
  eyebrowClass: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.panel}>
      <div className={`${styles.eyebrow} ${eyebrowClass}`}>{eyebrow}</div>
      <div className={styles.title}>{title}</div>
      <p className={styles.body}>{children}</p>
    </div>
  );
}
