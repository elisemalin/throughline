// Status-to-visual mapping used across the Tracker, Dashboard, and
// Discovery views. The labels/tones come from prototype/Throughline.jsx
// STAGES (lines 652-660); kept in one place so a future tone refresh is
// a single-file change.

import type { ApplicationStatus } from '@/contracts/models';
import type { PillTone } from '@/components';

export const STATUS_TONES: Record<ApplicationStatus, PillTone> = {
  researching: 'neutral',
  applied: 'info',
  screen: 'info',
  interview: 'accent',
  offer: 'success',
  rejected: 'muted',
  withdrawn: 'muted',
};

const LABELS: Record<ApplicationStatus, string> = {
  researching: 'Researching',
  applied: 'Applied',
  screen: 'Screen',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

export function statusLabel(status: ApplicationStatus): string {
  return LABELS[status];
}

export const STATUSES: ApplicationStatus[] = [
  'researching',
  'applied',
  'screen',
  'interview',
  'offer',
  'rejected',
  'withdrawn',
];
