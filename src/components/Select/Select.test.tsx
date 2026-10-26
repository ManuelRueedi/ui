import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Select } from './Select';

const groups = [
  {
    label: 'Kitchen',
    options: [
      { value: 'f1-1', label: 'F1.1 Cooker' },
      { value: 'f1-2', label: 'F1.2 Sockets' },
    ],
  },
  { label: 'Closed', disabled: true, options: [{ value: 'f9', label: 'F9 Spare' }] },
  { value: 'new', label: 'New circuit' },
];

describe('Select', () => {
  it('draws option groups and still picks their options', async () => {
    render(<Select label="Circuit" options={groups} defaultValue="new" />);
    const select = screen.getByLabelText<HTMLSelectElement>('Circuit');
    const groupElements = select.querySelectorAll('optgroup');
    expect([...groupElements].map((group) => group.label)).toEqual(['Kitchen', 'Closed']);
    expect(groupElements[1]).toBeDisabled();
    await userEvent.selectOptions(select, 'f1-2');
    expect(select).toHaveValue('f1-2');
  });

  it('shows the label of a grouped option when read only', () => {
    render(<Select label="Circuit" options={groups} value="f1-1" readOnly />);
    expect(screen.getByLabelText('Circuit')).toHaveValue('F1.1 Cooker');
  });

  it('passes the small size to the control', () => {
    render(<Select label="Type" size="sm" options={[{ value: 'a', label: 'A' }]} />);
    expect(screen.getByLabelText('Type').closest('[data-size]')).toHaveAttribute('data-size', 'sm');
  });
});
