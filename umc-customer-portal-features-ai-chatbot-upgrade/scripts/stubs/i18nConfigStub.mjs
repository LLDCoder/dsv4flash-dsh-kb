const i18n = {
  language: "en",
  t: (key, values) => {
    if (values && typeof values === "object") {
      return Object.entries(values).reduce(
        (result, [name, value]) => result.replace(`{{${name}}}`, String(value)),
        key,
      );
    }
    return key;
  },
};

export default i18n;
