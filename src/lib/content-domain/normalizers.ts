import { convertToSlug } from "../../utils/convertToSlug.ts";

export function normalizeLabel(label: string): string {
  return label
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
    .trim();
}

export function normalizeTaxonomyValues(values: string[] | undefined): string[] {
  return (values ?? []).map(normalizeLabel).filter(Boolean);
}

export function normalizeDraftFlag(value: boolean | undefined): boolean {
  return value === true;
}

export function normalizeDate(value: Date | string | undefined | null): Date | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date;
}

export function toTaxonomySlug(value: string): string {
  return convertToSlug(normalizeLabel(value));
}
