import type { AmsName } from './catalog';

/**
 * Eligible-vehicle count for a connected book.
 *
 * There is no AMS connector in this repo yet, so this returns `unavailable` and
 * the UI renders a skeleton and then nothing. That is deliberate and must stay
 * that way until a real sync exists: the count is the single most persuasive
 * element in the flow precisely because it is the agent's own book, and a sample
 * figure standing in for it would be a fabricated number shown to a producer who
 * is about to check it against reality.
 *
 * When the connector lands, return `{ status: 'ready', count }` from it here.
 */
export type EligibleVehicleCount =
  | { status: 'ready'; count: number }
  | { status: 'pending' }
  | { status: 'unavailable' };

export async function getEligibleVehicleCount(
  _amsName: AmsName,
  _agentId: string,
): Promise<EligibleVehicleCount> {
  return { status: 'unavailable' };
}
