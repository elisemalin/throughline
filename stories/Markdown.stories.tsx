import type { Meta, StoryObj } from '@storybook/react-vite';
import { Markdown } from '@/components';

const meta: Meta<typeof Markdown> = {
  title: 'Primitives/Markdown',
  component: Markdown,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const sample = `# Cover Letter

Dear Vercel hiring team,

I'm writing about the **Senior Full Stack Engineer** opening.

### Skills and capabilities that align
- React
- TypeScript
- Customer-facing engineering

Sincerely,
Elise
`;

export const Default: Story = {
  render: () => (
    <div className="p-6 bg-stone-950 max-w-2xl">
      <Markdown>{sample}</Markdown>
    </div>
  ),
};
