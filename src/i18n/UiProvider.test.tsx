import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { en, uiCatalogs } from './messages';
import { resolveCatalog, UiProvider, useUiMessages } from './UiProvider';

function CloseLabel() {
  return <span>{useUiMessages().dialog.close}</span>;
}

describe('resolveCatalog', () => {
  it('picks the Swiss catalog for each language', () => {
    expect(resolveCatalog('de-CH')).toBe(uiCatalogs['de-CH']);
    expect(resolveCatalog('fr-CH')).toBe(uiCatalogs['fr-CH']);
    expect(resolveCatalog('it-CH')).toBe(uiCatalogs['it-CH']);
  });

  it('falls back by language, then to English', () => {
    expect(resolveCatalog('de')).toBe(uiCatalogs['de-CH']);
    expect(resolveCatalog('fr_FR')).toBe(uiCatalogs['fr-CH']);
    expect(resolveCatalog('IT-it')).toBe(uiCatalogs['it-CH']);
    expect(resolveCatalog('en-CH')).toBe(en);
    expect(resolveCatalog('rm-CH')).toBe(en);
  });
});

describe('catalogs', () => {
  // Same keys in every language; the type already checks the shape, this catches empty texts.
  it('fill every text in every language', () => {
    const texts = (catalog: object): unknown[] =>
      Object.values(catalog).flatMap((value) =>
        typeof value === 'object' && value !== null ? texts(value) : [value],
      );
    for (const catalog of Object.values(uiCatalogs)) {
      for (const text of texts(catalog)) {
        const shown = typeof text === 'function' ? (text as (value: string) => string)('X') : text;
        expect(shown).toEqual(expect.stringMatching(/\S/));
      }
    }
  });
});

describe('UiProvider', () => {
  it('gives components the texts of its locale', () => {
    render(
      <UiProvider locale="it-CH">
        <CloseLabel />
      </UiProvider>,
    );
    expect(screen.getByText('Chiudi la finestra di dialogo')).toBeInTheDocument();
  });
});
