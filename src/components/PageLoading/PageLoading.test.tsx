import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UiProvider } from '../../i18n/UiProvider';
import { PageLoading } from './PageLoading';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function statusAfterLongWait() {
  act(() => {
    vi.advanceTimersByTime(2000);
  });
  return screen.getByRole('status');
}

describe('PageLoading', () => {
  it('announces the translated default label after a long wait', () => {
    render(
      <UiProvider locale="de-CH">
        <PageLoading loading>
          <p>Seite</p>
        </PageLoading>
      </UiProvider>,
    );
    expect(statusAfterLongWait()).toHaveTextContent('Seite wird geladen');
  });

  it('uses English without a provider', () => {
    render(
      <PageLoading loading>
        <p>Page</p>
      </PageLoading>,
    );
    expect(statusAfterLongWait()).toHaveTextContent('Loading page');
  });

  it('prefers an explicit label', () => {
    render(
      <UiProvider locale="fr-CH">
        <PageLoading loading label="Opening project">
          <p>Page</p>
        </PageLoading>
      </UiProvider>,
    );
    expect(statusAfterLongWait()).toHaveTextContent('Opening project');
  });
});
