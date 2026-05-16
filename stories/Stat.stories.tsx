import type { Meta, StoryObj } from '@storybook/nextjs';
import { Stat } from '@/components';

const meta: Meta<typeof Stat> = {
  title: 'Primitives/Stat',
  component: Stat,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const KpiRow: Story = {
  render: () => (
    <div className="p-6 bg-stone-950 grid grid-cols-4 gap-3 max-w-3xl">
      <Stat label="Applied" value={42} sub="total submissions" />
      <Stat label="In flight" value={18} sub="awaiting next move" />
      <Stat label="Interviews" value={6} accent sub="active conversations" />
      <Stat label="Response %" value="38%" sub="any response" />
    </div>
  ),
};
