import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { UiProvider } from '../../i18n/UiProvider';
import { Button } from './Button';

describe('Button', () => {
  it('calls onClick while idle', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('ignores clicks and shows the status while busy or done', async () => {
    const onClick = vi.fn();
    const { rerender } = render(
      <Button state="success" onClick={onClick}>
        Save
      </Button>,
    );
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('Done');

    rerender(
      <Button state="loading" onClick={onClick}>
        Save
      </Button>,
    );
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
  });

  it('uses the texts of the chosen locale', () => {
    render(
      <UiProvider locale="de-CH">
        <Button state="error">Speichern</Button>
      </UiProvider>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Fehlgeschlagen');
  });

  it('renders a link when it has an address', () => {
    render(<Button href="/projects">Open</Button>);
    expect(screen.getByRole('link', { name: 'Open' })).toHaveAttribute('href', '/projects');
  });

  it('lets a long label wrap on request, on buttons and links', () => {
    const { rerender } = render(<Button>Save</Button>);
    expect(screen.getByRole('button').className).not.toContain('wrap');
    rerender(<Button wrap>Move the selected boxes to the other side of the board</Button>);
    expect(screen.getByRole('button').className).toContain('wrap');
    expect(screen.getByRole('button')).not.toHaveAttribute('wrap');
    rerender(
      <Button wrap href="/records/1">
        Inspection record of 12 May
      </Button>,
    );
    expect(screen.getByRole('link').className).toContain('wrap');
    expect(screen.getByRole('link')).not.toHaveAttribute('wrap');
  });

  it('marks itself as a spotlight surface', () => {
    render(<Button variant="primary">Go</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('data-spotlight-surface');
    expect(button.className).toContain('primary');
  });
});
