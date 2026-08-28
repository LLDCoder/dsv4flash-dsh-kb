export interface CardPaymentPurchaseLock {
  tryAcquire: () => boolean;
  release: () => void;
}

export const createCardPaymentPurchaseLock = (): CardPaymentPurchaseLock => {
  let acquired = false;

  return {
    tryAcquire: () => {
      if (acquired) {
        return false;
      }

      acquired = true;
      return true;
    },
    release: () => {
      acquired = false;
    },
  };
};
