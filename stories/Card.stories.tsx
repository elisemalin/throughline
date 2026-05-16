import type { Meta, StoryObj } from '@storybook/nextjs';
import { Card, SectionLabel } from '@/components';

const meta: Meta<typeof Card> = {
  title: 'Primitives/Card',
  component: Card,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="p-6 bg-stone-950">
      <Card className="p-5 max-w-md">
        <SectionLabel>Section label</SectionLabel>
        <p className="text-sm text-stone-300">
          Card surface used everywhere in the editorial palette.
        </p>
      </Card>
    </div>
  ),
};
