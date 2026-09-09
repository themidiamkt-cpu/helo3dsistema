import "server-only";

import QRCode from "qrcode";

type CustomerInput = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
};

type PixInput = {
  value: number;
  description: string;
  externalReference: string;
  customer: CustomerInput;
};

type PixResult = {
  paymentId: string;
  qrCodeImage: string;
  copyPaste: string;
  expiresAt: string;
  simulated: boolean;
};

function asaasEnv() {
  return {
    apiKey: process.env.ASAAS_API_KEY,
    baseUrl: process.env.ASAAS_BASE_URL ?? "https://sandbox.asaas.com/api/v3",
  };
}

async function asaasFetch<T>(path: string, init: RequestInit) {
  const { apiKey, baseUrl } = asaasEnv();
  if (!apiKey) throw new Error("ASAAS_API_KEY nao configurada.");

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      access_token: apiKey,
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Erro Asaas ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function createAsaasPixPayment(input: PixInput): Promise<PixResult> {
  const { apiKey } = asaasEnv();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  if (!apiKey) {
    const copyPaste = `PIX-SIMULADO-${input.externalReference}-${input.value.toFixed(2)}`;
    return {
      paymentId: `sim_${input.externalReference}`,
      qrCodeImage: await QRCode.toDataURL(copyPaste),
      copyPaste,
      expiresAt,
      simulated: true,
    };
  }

  const customer = await asaasFetch<{ id: string }>("/customers", {
    method: "POST",
    body: JSON.stringify({
      name: input.customer.name || "Cliente PDV",
      email: input.customer.email || undefined,
      mobilePhone: input.customer.phone || undefined,
    }),
  });

  const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const payment = await asaasFetch<{ id: string }>("/payments", {
    method: "POST",
    body: JSON.stringify({
      customer: customer.id,
      billingType: "PIX",
      value: input.value,
      dueDate,
      description: input.description,
      externalReference: input.externalReference,
    }),
  });

  const pix = await asaasFetch<{ encodedImage?: string; payload?: string; expirationDate?: string }>(`/payments/${payment.id}/pixQrCode`, {
    method: "GET",
  });

  return {
    paymentId: payment.id,
    qrCodeImage: pix.encodedImage ? `data:image/png;base64,${pix.encodedImage}` : await QRCode.toDataURL(pix.payload ?? payment.id),
    copyPaste: pix.payload ?? "",
    expiresAt: pix.expirationDate ?? expiresAt,
    simulated: false,
  };
}
