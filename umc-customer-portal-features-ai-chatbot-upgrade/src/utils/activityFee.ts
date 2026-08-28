export const normalizeFeeAmount = (fee: unknown): number => {
  const amount = Number(fee);

  return Number.isFinite(amount) ? amount : 0;
};
