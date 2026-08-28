export const orderHomeActions = ({
  pendingFines,
  pendingPayments,
  renewalsWithin7Days,
  renewalsWithin30Days,
  pendingModifications,
  drafts,
}) => [
  ...pendingFines,
  ...pendingPayments,
  ...renewalsWithin7Days,
  ...renewalsWithin30Days,
  ...pendingModifications,
  ...drafts,
];
