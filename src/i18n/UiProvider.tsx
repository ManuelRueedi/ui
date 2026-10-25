import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { uiCatalogs, type UiLocale, type UiMessages } from './messages';

const UiMessagesContext = createContext<UiMessages>(uiCatalogs.en);

type UiProviderProps = {
  /** Picks the built-in component texts. English when left out. */
  locale?: UiLocale | (string & {});
  /** Replaces the built-in texts, e.g. with the app's own translations. */
  messages?: UiMessages;
  children?: ReactNode;
};

/** Gives the components their texts (button states, dialog close label...). */
export function UiProvider({ locale = 'en', messages, children }: UiProviderProps) {
  const value = useMemo(() => messages ?? resolveCatalog(locale), [locale, messages]);
  return <UiMessagesContext.Provider value={value}>{children}</UiMessagesContext.Provider>;
}

export function useUiMessages(): UiMessages {
  return useContext(UiMessagesContext);
}

/** Exact match first, then the language alone (`fr`, `it-IT` → the Swiss catalog), else English. */
export function resolveCatalog(locale: string): UiMessages {
  if (locale in uiCatalogs) return uiCatalogs[locale as UiLocale];
  const language = locale.toLowerCase().split(/[-_]/)[0];
  if (language === 'de') return uiCatalogs['de-CH'];
  if (language === 'fr') return uiCatalogs['fr-CH'];
  if (language === 'it') return uiCatalogs['it-CH'];
  return uiCatalogs.en;
}
