const request = {
  get: async (url, params, config) => {
    const request = { method: "get", url };
    if (params !== undefined) request.params = params;
    if (config !== undefined) request.config = config;
    globalThis.__serviceEntryGateRequests.push(request);
    return globalThis.__serviceEntryGateGetResponses?.get(url) ?? null;
  },
  post: async (url, payload) => {
    globalThis.__serviceEntryGateRequests.push({ method: "post", url, payload });

    if (url === "/api/User/ChangeIdentity") {
      return { data: { token: "test-access-token" } };
    }

    return null;
  },
  put: async () => null,
  delete: async () => null,
};

export default request;
