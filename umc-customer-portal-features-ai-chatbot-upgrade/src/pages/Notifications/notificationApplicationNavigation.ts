type NotificationApplication = {
  id: number;
  applicationNumber: string;
};

type NotificationAppeal = {
  id: number;
  appealNo?: string | null;
};

export function isNotificationAppealReference(
  referenceNumber: string,
): boolean {
  return referenceNumber.startsWith("HC-03-");
}

export function createNotificationNavigationGuard() {
  let latestRequestId = 0;
  let active = true;

  return {
    begin: () => ++latestRequestId,
    isCurrent: (requestId: number) =>
      active && requestId === latestRequestId,
    invalidate: () => {
      active = false;
      latestRequestId += 1;
    },
  };
}

export function resolveNotificationApplicationDetailPath(
  referenceNumber: string,
  applications: NotificationApplication[],
): string {
  const application = applications.find(
    (item) => item.applicationNumber === referenceNumber,
  );

  return application ? `/my-requests/detail?id=${application.id}` : "";
}

export function resolveNotificationAppealDetailPath(
  referenceNumber: string,
  appeals: NotificationAppeal[],
): string {
  const appeal = appeals.find((item) => item.appealNo === referenceNumber);

  return appeal ? `/violations-fines/appeals/${appeal.id}` : "";
}
