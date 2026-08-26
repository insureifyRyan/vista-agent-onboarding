'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AmsName, AmsStatus } from '@/lib/ams/catalog';
import { amsStatusFor } from '@/lib/ams/catalog';
import type { EligibleVehicleCount } from '@/lib/ams/eligibleVehicles';
import { captureAttribution } from '@/lib/attribution';
import type { AttributionInput } from '@/lib/db/types';
import { codeToString, emptyCode, type CodeDigits } from '@/components/ui/CodeInput';
import { PageShell } from './Shell';
import { StepAms } from './StepAms';
import { StepDone } from './StepDone';
import { StepIdentity, type IdentityValues } from './StepIdentity';
import { StepVerify } from './StepVerify';

type Step = 1 | 2 | 3 | 4;

async function postJson(url: string, body?: unknown): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: response.ok, data };
}

export function OnboardingFlow() {
  const [step, setStep] = useState<Step>(1);
  const [identity, setIdentity] = useState<IdentityValues>({ firstName: '', lastName: '', email: '' });
  const [code, setCode] = useState<CodeDigits>(emptyCode());
  const [ams, setAms] = useState<AmsName | null>(null);
  const [bookSize, setBookSize] = useState('');
  const [finalStatus, setFinalStatus] = useState<AmsStatus | null>(null);
  const [eligibleVehicles, setEligibleVehicles] = useState<EligibleVehicleCount | null>(null);

  const [attribution, setAttribution] = useState<AttributionInput | null>(null);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Capture the campaign attribution on first load and hold it for the session,
  // so it survives the trip to the agent's inbox and back.
  useEffect(() => {
    setAttribution(captureAttribution());
  }, []);

  // The eligible-vehicle count for a live integration. Null while in flight —
  // the panels render a skeleton for that and never a sample number.
  const loadEligibleVehicles = useCallback(async () => {
    setEligibleVehicles(null);
    try {
      const response = await fetch('/api/onboarding/eligible-vehicles');
      setEligibleVehicles((await response.json()) as EligibleVehicleCount);
    } catch {
      setEligibleVehicles({ status: 'unavailable' });
    }
  }, []);

  const submitIdentity = async () => {
    setBusy(true);
    setError(null);
    const { ok, data } = await postJson('/api/onboarding/start', {
      first_name: identity.firstName.trim(),
      last_name: identity.lastName.trim(),
      email: identity.email.trim(),
      attribution: attribution ?? undefined,
    });
    setBusy(false);
    if (!ok) {
      setError((data.error as string) ?? 'Something went wrong. Try again.');
      return;
    }
    setCode(emptyCode());
    setNotice(null);
    setStep(2);
  };

  const submitCode = async () => {
    setBusy(true);
    setError(null);
    const { ok, data } = await postJson('/api/onboarding/verify', { code: codeToString(code) });
    setBusy(false);
    if (!ok) {
      setError((data.error as string) ?? 'That code isn’t right.');
      return;
    }
    setNotice(null);
    setStep(3);
  };

  const resendCode = async () => {
    setResending(true);
    setError(null);
    const { ok, data } = await postJson('/api/onboarding/resend');
    setResending(false);
    setNotice(ok ? 'We sent a new code.' : null);
    if (!ok) setError((data.error as string) ?? 'Could not resend just now.');
  };

  const submitAms = async () => {
    if (!ams) return;
    setBusy(true);
    setError(null);
    const parsedBookSize = bookSize ? Number.parseInt(bookSize, 10) : null;
    const { ok, data } = await postJson('/api/onboarding/ams', {
      ams_name: ams,
      book_size_est: Number.isFinite(parsedBookSize) ? parsedBookSize : null,
    });
    setBusy(false);
    if (!ok) {
      setError((data.error as string) ?? 'Could not save your AMS. Try again.');
      return;
    }
    setFinalStatus((data.ams_status as AmsStatus) ?? amsStatusFor(ams));
    setStep(4);
  };

  // Load the count when a live AMS is picked, and again on the success screen.
  useEffect(() => {
    if (step === 3 && ams && amsStatusFor(ams) === 'live') void loadEligibleVehicles();
    if (step === 4 && finalStatus === 'live') void loadEligibleVehicles();
  }, [step, ams, finalStatus, loadEligibleVehicles]);

  return (
    <PageShell step={step}>
      {step === 1 ? (
        <StepIdentity
          values={identity}
          onChange={setIdentity}
          onSubmit={submitIdentity}
          busy={busy}
          error={error}
        />
      ) : null}

      {step === 2 ? (
        <StepVerify
          code={code}
          onCodeChange={(next) => {
            setCode(next);
            setError(null);
          }}
          onSubmit={submitCode}
          onChangeEmail={() => {
            setStep(1);
            setError(null);
            setNotice(null);
          }}
          onResend={resendCode}
          busy={busy}
          resending={resending}
          error={error}
          notice={notice}
        />
      ) : null}

      {step === 3 ? (
        <StepAms
          ams={ams}
          onAmsChange={(next) => {
            setAms(next);
            setError(null);
          }}
          bookSize={bookSize}
          onBookSizeChange={setBookSize}
          eligibleVehicles={eligibleVehicles}
          onSubmit={submitAms}
          onBack={() => setStep(2)}
          busy={busy}
          error={error}
        />
      ) : null}

      {step === 4 && ams && finalStatus ? (
        <StepDone ams={ams} status={finalStatus} eligibleVehicles={eligibleVehicles} />
      ) : null}
    </PageShell>
  );
}
