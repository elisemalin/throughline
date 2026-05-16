import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button, Field, Input, Modal } from '@/components';

const meta: Meta<typeof Modal> = {
  title: 'Primitives/Modal',
  component: Modal,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Toggleable: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    const [value, setValue] = useState('');
    return (
      <div className="p-6 bg-stone-950 min-h-screen">
        <Button onClick={() => setOpen(true)}>Open modal</Button>
        <Modal open={open} onClose={() => setOpen(false)} title="Add application">
          <div className="space-y-4">
            <Field label="Company">
              <Input value={value} onChange={(e) => setValue(e.target.value)} />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={() => setOpen(false)}>
                Save
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  },
};
