import Image from 'next/image';
import type { ReactNode } from 'react';
import { ADMINISTRATOR_LINE, COMPLIANCE_DISCLOSURE, TRUST_LINE } from '@/lib/compliance';
import styles from './Shell.module.css';

/**
 * The lockup is composed from the mark plus type — the raster logo PNGs still
 * read "EXTENDED WARRANTY" and must not be used.
 */
export function VistaLockup() {
  return (
    <div className={styles.lockup}>
      <div className={styles.lockupRow}>
        <Image src="/assets/vista-mark.png" alt="Vista" width={46} height={46} className={styles.mark} priority />
        <span className={styles.wordmark}>
          Vista<sup className={styles.trademark}>™</sup>
        </span>
      </div>
      <span className={styles.subline}>Vehicle Service Contracts</span>
    </div>
  );
}

export function Masthead() {
  return (
    <header className={styles.masthead}>
      <VistaLockup />
      <span className={styles.pill}>Agent-exclusive</span>
    </header>
  );
}

export function TrustRow() {
  return (
    <div className={styles.trust}>
      <span className={styles.chip}>
        <Image
          src="/assets/old-republic-logo.png"
          alt="Old Republic"
          width={72}
          height={18}
          className={styles.chipLogo}
        />
      </span>
      <span className={styles.trustStrong}>{TRUST_LINE}</span>
      <span className={styles.trustMuted}>· {ADMINISTRATOR_LINE}</span>
    </div>
  );
}

/** Three segments; all green once the account exists. */
export function ProgressBar({ step }: { step: 1 | 2 | 3 | 4 }) {
  const complete = step === 4;
  return (
    <div className={styles.progress} role="progressbar" aria-valuemin={1} aria-valuemax={3} aria-valuenow={Math.min(step, 3)}>
      {[1, 2, 3].map((segment) => (
        <span
          key={segment}
          className={[
            styles.segment,
            complete ? styles.segmentComplete : segment <= step ? styles.segmentDone : '',
          ]
            .filter(Boolean)
            .join(' ')}
        />
      ))}
    </div>
  );
}

export function ComplianceFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerTrust}>
        <span className={styles.chip}>
          <Image
            src="/assets/old-republic-logo.png"
            alt="Old Republic"
            width={80}
            height={20}
            className={styles.footerChipLogo}
          />
        </span>
        <span className={styles.footerTrustText}>{TRUST_LINE}</span>
      </div>
      <div className={styles.disclosure}>{COMPLIANCE_DISCLOSURE}</div>
    </footer>
  );
}

export function PageShell({ step, children }: { step: 1 | 2 | 3 | 4; children: ReactNode }) {
  return (
    <div className={styles.page}>
      <Masthead />
      <TrustRow />
      <ProgressBar step={step} />
      <main className={styles.content}>{children}</main>
      <ComplianceFooter />
    </div>
  );
}
