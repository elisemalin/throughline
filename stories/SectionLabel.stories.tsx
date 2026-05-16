import type { Meta, StoryObj } from '@storybook/nextjs';
import { Card, SectionLabel } from '@/components';

const meta: Meta<typeof SectionLabel> = {
  title: 'Primitives/SectionLabel',
  component: SectionLabel,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="p-6 bg-stone-950">
      <Card className="p-5">
        <SectionLabel
          right={
            <button className="text-[10px] uppercase tracking-[0.2em] text-amber-200 font-mono">
              View all
            </button>
          }
        >
          Recent applications
        </SectionLabel>
        <p className="text-sm text-stone-400">List would render below.</p>
      </Card>
    </div>
  ),
};
