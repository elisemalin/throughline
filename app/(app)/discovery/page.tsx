import type { Metadata } from 'next';
import { DiscoveryClient } from './discovery-client';

export const metadata: Metadata = {
  title: 'Discovery · Throughline',
};

export default function DiscoveryPage() {
  return <DiscoveryClient />;
}
