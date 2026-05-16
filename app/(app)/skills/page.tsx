import type { Metadata } from 'next';
import { SkillsClient } from './skills-client';

export const metadata: Metadata = {
  title: 'Skills DB · Throughline',
};

export default function SkillsPage() {
  return <SkillsClient />;
}
