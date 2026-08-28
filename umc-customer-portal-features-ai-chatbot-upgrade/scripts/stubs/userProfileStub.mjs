const context = globalThis.__RULE_TEST_CONTEXT__;

if (!context?.apiBaseUrl) {
  throw new Error("Missing __RULE_TEST_CONTEXT__.apiBaseUrl");
}

const buildHeaders = () => ({
  "Accept-Language": "en",
  "Content-Type": "application/json;charset=utf-8",
  ...(context.token ? { Authorization: `Bearer ${context.token}` } : {}),
});

const apiGet = async (url) => {
  const target = new URL(url, context.apiBaseUrl);
  const response = await fetch(target, {
    method: "GET",
    headers: buildHeaders(),
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json?.message || `GET ${target.pathname} failed`);
  }
  return json;
};

export const getNationalityList = () => {
  return apiGet("/api/User/GetNationalityList");
};

export const getTypeDictionaryList = (scope) => {
  return apiGet(`/api/TypeDictionary/GetTypeDictionaries/${encodeURIComponent(scope)}`);
};
