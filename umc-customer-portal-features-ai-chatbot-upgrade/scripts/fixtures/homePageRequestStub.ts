type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
};

const requests: PendingRequest[] = [];
const requestedUrls: string[] = [];

const request = {
  get<T>(url: string): Promise<T> {
    requestedUrls.push(url);
    return new Promise<T>((resolve, reject) => {
      requests.push({
        resolve: (value) => resolve(value as T),
        reject,
      });
    });
  },
};

export function resetRequestStub() {
  requests.splice(0, requests.length);
  requestedUrls.splice(0, requestedUrls.length);
}

export function getRequestCount() {
  return requestedUrls.length;
}

export function getRequestedUrls() {
  return [...requestedUrls];
}

export function resolveRequest(index: number, value: unknown) {
  requests[index]?.resolve(value);
}

export function rejectRequest(index: number, reason: unknown) {
  requests[index]?.reject(reason);
}

export default request;
