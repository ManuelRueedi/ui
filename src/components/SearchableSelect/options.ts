import type { TooltipPlacement } from '../Tooltip/Tooltip';

export type SearchableSelectOption =
  | string
  | {
      value: string;
      label?: string;
      tooltip?: string;
      tooltipPlacement?: TooltipPlacement;
    };

export type NormalizedOption = {
  value: string;
  label: string;
  tooltip?: string;
  tooltipPlacement?: TooltipPlacement;
};

export function normalizeSelectOption(option: SearchableSelectOption): NormalizedOption {
  if (typeof option === 'string') return { value: option, label: option };

  return {
    value: option.value,
    label: option.label ?? option.value,
    tooltip: option.tooltip,
    tooltipPlacement: option.tooltipPlacement,
  };
}

export function filterSelectOptions(options: NormalizedOption[], query: string) {
  const term = query.trim().toLowerCase();

  return options.filter(
    (option) =>
      option.label.toLowerCase().includes(term) || option.value.toLowerCase().includes(term),
  );
}

export function getSelectDisplayValue(options: NormalizedOption[], value: string) {
  return options.find((option) => option.value === value)?.label ?? value;
}

export function findSelectOptionIndex(options: NormalizedOption[], value: string) {
  return options.findIndex((option) => option.value === value);
}
