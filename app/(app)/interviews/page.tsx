import type { Metadata } from 'next';
import { InterviewsClient } from './interviews-client';

export const metadata: Metadata = {
  title: 'Interviews · Throughline',
};

export default function InterviewsPage() {
  return <InterviewsClient />;
}
