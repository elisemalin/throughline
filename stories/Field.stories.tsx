import type { Meta, StoryObj } from '@storybook/nextjs';
import { useState } from 'react';
import { Field, Input, Textarea } from '@/components';

const meta: Meta<typeof Field> = {
  title: 'Primitives/Field',
  component: Field,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const TextInput: Story = {
  render: () => {
    const [value, setValue] = useState('');
    return (
      <div className="p-6 bg-stone-950 max-w-md">
        <Field label="Company" hint="The legal name on the JD.">
          <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Acme" />
        </Field>
      </div>
    );
  },
};

export const TextareaField: Story = {
  render: () => {
    const [value, setValue] = useState('');
    return (
      <div className="p-6 bg-stone-950 max-w-md">
        <Field label="Notes">
          <Textarea
            rows={4}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Pasted JD or thinking notes..."
          />
        </Field>
      </div>
    );
  },
};
