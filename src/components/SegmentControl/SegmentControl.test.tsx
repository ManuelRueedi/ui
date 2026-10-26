import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SegmentControl } from './SegmentControl';

describe('SegmentControl', () => {
  it('shows option titles and describes the group', () => {
    render(
      <>
        <p id="mode-help">Changes are planned, not built yet.</p>
        <SegmentControl
          label="Lifecycle"
          describedBy="mode-help"
          defaultValue="planning"
          options={[
            { value: 'planning', label: 'Planning', title: 'Shows the planned state' },
            { value: 'built', label: 'As built' },
          ]}
        />
      </>,
    );
    expect(screen.getByRole('radio', { name: 'Planning' })).toHaveAttribute(
      'title',
      'Shows the planned state',
    );
    expect(screen.getByRole('radio', { name: 'As built' })).not.toHaveAttribute('title');
    expect(screen.getByRole('radiogroup', { name: 'Lifecycle' })).toHaveAccessibleDescription(
      'Changes are planned, not built yet.',
    );
  });

  it('leaves out aria-describedby without describedBy', () => {
    render(<SegmentControl label="Lifecycle" options={[{ value: 'a', label: 'A' }]} />);
    expect(screen.getByRole('radiogroup')).not.toHaveAttribute('aria-describedby');
  });
});
