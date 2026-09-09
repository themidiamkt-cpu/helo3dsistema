import type { Product } from "@/types/database";

export const blingProductHeaders = [
  "ID",
  "Código",
  "Descrição",
  "Unidade",
  "NCM",
  "Origem",
  "Preço",
  "Valor IPI fixo",
  "Observações",
  "Situação",
  "Estoque",
  "Preço de custo",
  "Cod. no fornecedor",
  "Fornecedor",
  "Localização",
  "Estoque máximo",
  "Estoque mínimo",
  "Peso líquido (Kg)",
  "Peso bruto (Kg)",
  "GTIN/EAN",
  "GTIN/EAN da Embalagem",
  "Largura do produto",
  "Altura do Produto",
  "Profundidade do produto",
  "Data Validade",
  "Descrição do Produto no Fornecedor",
  "Descrição Complementar",
  "Itens p/ caixa",
  "Produto Variação",
  "Tipo Produção",
  "Classe de enquadramento do IPI",
  "Código na Lista de Serviços",
  "Tipo do item",
  "Grupo de Tags/Tags",
  "Tributos",
  "Código Pai",
  "Código Integração",
  "Grupo de produtos",
  "Marca",
  "CEST",
  "Volumes",
  "Descrição Curta",
  "Cross-Docking",
  "URL Imagens Externas",
  "Link Externo",
  "Meses Garantia no Fornecedor",
  "Clonar dados do pai",
  "Condição do Produto",
  "Frete Gratis",
  "Numero FCI",
  "Video",
  "Departamento",
  "Unidade de Medida",
  "Preço de Compra",
  "Valor base ICMS ST para retenção",
  "Valor ICMS ST para retenção",
  "Valor ICMS proprio do substituto",
  "Categoria do produto",
  "Informações Adicionais",
];

export const blingStockHeaders = ["Código", "Descrição", "Estoque", "Preço", "Preço de custo"];

export function getBlingSku(product: Product) {
  return product.sku?.trim() || product.id.slice(0, 8).toUpperCase();
}

export function getBlingSalePrice(product: Product) {
  return Number(product.manual_sale_price ?? product.calculated_sale_price) || 0;
}

export function getBlingCategory(product: Product) {
  const category = (product.category ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const skuPrefix = getBlingSku(product).split("-")[0]?.toLowerCase();

  if (category.includes("brinquedo") || skuPrefix === "brinq") return "Brinquedos";
  return "Decoração";
}

function toBlingNumber(value: number | null | undefined, digits = 2) {
  const safeValue = Number.isFinite(Number(value)) ? Number(value) : 0;
  return safeValue.toFixed(digits).replace(".", ",");
}

function cleanText(value: string | null | undefined) {
  return (value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function csvCell(value: string | number | null | undefined) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv(headers: string[], rows: Array<Record<string, string | number | null | undefined>>) {
  const lines = [
    headers.map(csvCell).join(";"),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(";")),
  ];

  return `\ufeff${lines.join("\n")}\n`;
}

export function buildBlingProductRows(products: Product[]) {
  return products.map((product) => {
    const sku = getBlingSku(product);
    const description = cleanText(product.description);
    const salePrice = getBlingSalePrice(product);
    const blingCategory = getBlingCategory(product);

    return {
      ID: "",
      Código: sku,
      Descrição: product.name,
      Unidade: "UN",
      NCM: "",
      Origem: "0",
      Preço: toBlingNumber(salePrice),
      "Valor IPI fixo": "0",
      Observações: description,
      Situação: product.active ? "Ativo" : "Inativo",
      Estoque: String(product.finished_stock_quantity),
      "Preço de custo": toBlingNumber(product.calculated_unit_cost),
      "Cod. no fornecedor": "",
      Fornecedor: "",
      Localização: "",
      "Estoque máximo": "",
      "Estoque mínimo": String(product.minimum_finished_stock),
      "Peso líquido (Kg)": "0",
      "Peso bruto (Kg)": "0",
      "GTIN/EAN": "",
      "GTIN/EAN da Embalagem": "",
      "Largura do produto": "",
      "Altura do Produto": "",
      "Profundidade do produto": "",
      "Data Validade": "",
      "Descrição do Produto no Fornecedor": "",
      "Descrição Complementar": description,
      "Itens p/ caixa": "1",
      "Produto Variação": "",
      "Tipo Produção": "Propria",
      "Classe de enquadramento do IPI": "",
      "Código na Lista de Serviços": "",
      "Tipo do item": "",
      "Grupo de Tags/Tags": "",
      Tributos: "",
      "Código Pai": "",
      "Código Integração": sku,
      "Grupo de produtos": "",
      Marca: "Mimagi 3D",
      CEST: "",
      Volumes: "1",
      "Descrição Curta": product.name,
      "Cross-Docking": "0",
      "URL Imagens Externas": product.image_url ?? "",
      "Link Externo": "",
      "Meses Garantia no Fornecedor": "",
      "Clonar dados do pai": "NAO",
      "Condição do Produto": "NOVO",
      "Frete Gratis": "NAO",
      "Numero FCI": "",
      Video: "",
      Departamento: "",
      "Unidade de Medida": "Centimetro",
      "Preço de Compra": toBlingNumber(product.calculated_unit_cost),
      "Valor base ICMS ST para retenção": "0",
      "Valor ICMS ST para retenção": "0",
      "Valor ICMS proprio do substituto": "0",
      "Categoria do produto": blingCategory,
      "Informações Adicionais": `SKU ${sku}. Estoque atual: ${product.finished_stock_quantity}.`,
    };
  });
}

export function buildBlingStockRows(products: Product[]) {
  return products.map((product) => ({
    Código: getBlingSku(product),
    Descrição: product.name,
    Estoque: String(product.finished_stock_quantity),
    Preço: toBlingNumber(getBlingSalePrice(product)),
    "Preço de custo": toBlingNumber(product.calculated_unit_cost),
  }));
}
