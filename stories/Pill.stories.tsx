import type { Meta, StoryObj } from '@storybook/react-vite';
import { Pill, PILL_TONES } from '@/components';

const meta: Meta<typeof Pill> = {
  title: 'Primitives/Pill',
  component: Pill,
  tags: ['autodocs'],
  args: { children: 'Status', tone: 'neutral' },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Neutral: Story = { args: { tone: 'neutral' } };
export const Accent: Story = { args: { tone: 'accent' } };

export const AllTones: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2 p-6 bg-stone-950">
      {PILL_TONES.map((tone) => (
        <Pill key={tone} tone={tone}>
          {tone}
        </Pill>
      ))}
    </div>
  ),
};
