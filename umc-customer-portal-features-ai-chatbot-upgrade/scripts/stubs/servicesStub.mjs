const context = globalThis.__RULE_TEST_CONTEXT__;

if (!context?.apiBaseUrl) {
  throw new Error("Missing __RULE_TEST_CONTEXT__.apiBaseUrl");
}

const buildHeaders = () => ({
  "Accept-Language": "en",
  "Content-Type": "application/json;charset=utf-8",
  ...(context.token ? { Authorization: `Bearer ${context.token}` } : {}),
});

const apiGet = async (url, params) => {
  const target = new URL(url, context.apiBaseUrl);
  if (params && typeof params === "object") {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        target.searchParams.set(key, String(value));
      }
    }
  }

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

export const getArtistWorkTypes = (mediaMaterialTypeId = 1) => {
  return apiGet("/api/Lookup/GetArtistWorkTypes", { mediaMaterialTypeId });
};

export const getArtistWorkTypesByServiceCode = () => {
  return getArtistWorkTypes();
};

export const getLookupData = (source) => {
  return apiGet("/api/Lookup/GetLookupData", { tableName: source });
};

export const getSubjectList = () => {
  return apiGet("/api/Lookup/GetSubjectList");
};

export const getLanguages = () => {
  return apiGet("/api/ContentLibrary/Languages");
};
