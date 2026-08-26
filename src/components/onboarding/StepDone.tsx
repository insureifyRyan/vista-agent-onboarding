'use client';

import type { AmsName, AmsStatus } from '@/lib/ams/catalog';
import { LIVE_PANEL, successLine } from '@/lib/ams/copy';
import type { EligibleVehicleCount } from '@/lib/ams/eligibleVehicles';
import { Button } from '@/components/ui/Button';
import styles from './Steps.module.css';

interface StepDoneProps {
  ams: AmsName;
  status: AmsStatus;
  eligibleVehicles: EligibleVehicleCount | null;
}

export function StepDone({ ams, status, eligibleVehicles }: StepDoneProps) {
  return (
    <div>
      <div className={styles.chip}>
        <span className={styles.chipCheck} aria-hidden="true">
          ✓
        </span>
        <span className={styles.chipText}>Account created</span>
      </div>

      <h1 className={styles.headingDone}>You&apos;re in.</h1>
      <p className={styles.subcopyTight}>
        {successLine(ams, status)} One step left before you can issue contracts.
      </p>

      <div className={styles.card}>
        <div className={styles.cardEyebrow}>Next: licensing</div>
        <div className={styles.cardTitle}>Verify your license with your NPN</div>
        <p className={styles.cardBody}>
          Enter your National Producer Number once and we pull your resident license, lines of
          authority and appointed states from the national producer database — no documents to
          upload.
        </p>
        <Button variant="gradient" onClick={() => { window.location.href = '/licensing'; }}>
          Go to licensing →
        </Button>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <div className={styles.statValue}>
            <EligibleVehicleStat count={eligibleVehicles} status={status} />
          </div>
          <div className={styles.statLabel}>Eligible-vehicle count from your book</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>$5,000</div>
          <div className={styles.statLabel}>Diminished value per contract</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>0</div>
          <div className={styles.statLabel}>Appointments required</div>
        </div>
      </div>

      <p className={styles.statDisclosure}>{LIVE_PANEL.countDisclosure}</p>
    </div>
  );
}

/**
 * An em dash, never a stand-in number. The count is only ever the agent's own
 * book; if the sync has not produced one, the tile says so by saying nothing.
 */
function EligibleVehicleStat({
  count,
  status,
}: {
  count: EligibleVehicleCount | null;
  status: AmsStatus;
}) {
  if (status !== 'live') return <>—</>;
  if (count === null || count.status === 'pending') {
    return <span className={styles.statSkeleton} role="status" aria-label="Counting eligible vehicles" />;
  }
  if (count.status !== 'ready') return <>—</>;
  return <>{count.count.toLocaleString('en-US')}</>;
}
