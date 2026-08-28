export const DEFAULT_COUNTRY_DIAL_CODE = "+971";

export const validateMobileNumber = () => ({
  isValid: true,
  errorCode: undefined,
  message: "",
});

const i18n = {
  t: (key: string) => key,
};

export default i18n;
