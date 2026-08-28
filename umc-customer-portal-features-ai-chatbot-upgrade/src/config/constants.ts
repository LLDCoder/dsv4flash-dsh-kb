/** Backend dictionary ids for `/api/MyRequest/ApplicationStatuses`. */
export const APPLICATION_STATUS_ID = {
  draft: 101,
  underReview: 102,
  pendingPayment: 103,
  pendingModification: 104,
  completed: 105,
  rejected: 106,
  cancelled: 107,
} as const;

export const TIME = {
  TOKEN_EXPIRE: 30 * 24 * 60 * 60 * 1000,      
  REFRESH_TOKEN_EXPIRE: 7 * 24 * 60 * 60 * 1000, 
  TOKEN_REFRESH_AHEAD: 5 * 60 * 1000,    
  DEBOUNCE_WAIT: 300,                    
  THROTTLE_WAIT: 500                    
} as const;

export const OCR_API_BASE_URL = "https://umc-customerportal.sol.daypop.ai";
export const OCR_API_DEV_PROXY_PREFIX = "/ocr-api";

export default {
  TIME,
};
