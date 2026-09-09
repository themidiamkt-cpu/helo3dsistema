export type SalesChannel = {
  id: string;
  name: string;
  fee_percentage: number;
  fixed_fee: number;
  active: boolean;
};

type SalesChannelSettings = {
  sales_channels?: SalesChannel[];
};

export function parseSalesChannels(value: string | null | undefined): SalesChannel[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value) as SalesChannelSettings;
    if (!Array.isArray(parsed.sales_channels)) return [];
    return parsed.sales_channels
      .filter((channel) => channel.id && channel.name)
      .map((channel) => ({
        id: channel.id,
        name: channel.name,
        fee_percentage: Number(channel.fee_percentage) || 0,
        fixed_fee: Number(channel.fixed_fee) || 0,
        active: channel.active !== false,
      }));
  } catch {
    return [];
  }
}

export function serializeSalesChannels(channels: SalesChannel[]) {
  return JSON.stringify({ sales_channels: channels });
}

export function calculateChannelFee(subtotal: number, channel: Pick<SalesChannel, "fee_percentage" | "fixed_fee">) {
  return subtotal * (channel.fee_percentage / 100) + channel.fixed_fee;
}
