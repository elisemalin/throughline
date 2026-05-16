import type { Metadata } from 'next';
import { SettingsClient } from './settings-client';

export const metadata: Metadata = {
  title: 'Settings · Throughline',
};

export default function SettingsPage() {
  return <SettingsClient />;
}
