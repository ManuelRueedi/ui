import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Collapsible } from './Collapsible';

describe('Collapsible', () => {
  it('renders the toggle without a heading for headingLevel none', async () => {
    render(
      <div role="alert">
        <Collapsible title="Technical details" headingLevel="none">
          <p>Stack trace</p>
        </Collapsible>
      </div>,
    );
    expect(screen.queryByRole('heading')).toBeNull();
    const toggle = screen.getByRole('button', { name: 'Technical details' });
    expect(toggle.parentElement?.tagName).toBe('DIV');
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  it('renders deeper heading levels', () => {
    render(<Collapsible title="Cores" headingLevel={5} />);
    expect(screen.getByRole('heading', { level: 5, name: 'Cores' })).toBeInTheDocument();
  });

  it('puts className on the root element', () => {
    const { container } = render(<Collapsible title="Cores" className="app-fold" />);
    expect(container.firstElementChild).toHaveClass('app-fold');
    expect(container.firstElementChild).toContainElement(screen.getByRole('heading'));
  });
});
