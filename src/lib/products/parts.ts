import type { Product } from "@/types/database";

const PARTS_MARKER = "\n\n[printops_parts]";

type ProductPartsMeta = {
  partNames?: string[];
  parts?: ProductPartDefinition[];
};

export type ProductPartDefinition = {
  name: string;
  weightGrams?: number;
  printTimeMinutes?: number;
};

function cleanParts(parts: ProductPartDefinition[]) {
  return parts
    .map((part) => ({
      name: part.name.trim(),
      weightGrams: Number(part.weightGrams) || 0,
      printTimeMinutes: Number(part.printTimeMinutes) || 0,
    }))
    .filter((part) => part.name);
}

export function splitProductDescription(description: string | null | undefined) {
  const raw = description ?? "";
  const [publicDescription, metaText] = raw.split(PARTS_MARKER);
  if (!metaText) return { description: raw, partNames: [] as string[], parts: [] as ProductPartDefinition[] };

  try {
    const meta = JSON.parse(metaText.trim()) as ProductPartsMeta;
    const parts = Array.isArray(meta.parts)
      ? cleanParts(meta.parts)
      : cleanParts(Array.isArray(meta.partNames) ? meta.partNames.filter(Boolean).map((name) => ({ name })) : []);
    return {
      description: publicDescription.trim(),
      partNames: parts.map((part) => part.name),
      parts,
    };
  } catch {
    return { description: publicDescription.trim(), partNames: [] as string[], parts: [] as ProductPartDefinition[] };
  }
}

export function buildProductDescription(description: string | null | undefined, partNamesOrParts: string[] | ProductPartDefinition[]) {
  const cleanDescription = (description ?? "").trim();
  const parts = cleanParts(
    partNamesOrParts.map((part) => (typeof part === "string" ? { name: part } : part)),
  );
  if (!parts.length) return cleanDescription || null;
  return `${cleanDescription}${PARTS_MARKER}${JSON.stringify({ partNames: parts.map((part) => part.name), parts })}`;
}

export function getProductPartNames(product: Pick<Product, "description">) {
  return splitProductDescription(product.description).partNames;
}

export function getProductParts(product: Pick<Product, "description">) {
  return splitProductDescription(product.description).parts;
}

export function getProductPublicDescription(product: Pick<Product, "description">) {
  return splitProductDescription(product.description).description;
}
