export const lifecycleActivityCalls = [];

export const resetLifecycleActivityCalls = () => {
  lifecycleActivityCalls.length = 0;
};

export const getApplicationLifecycleActivities = async (
  sourceApplicationId,
  targetServiceCode,
  licensePermitNo,
) => {
  lifecycleActivityCalls.push({
    sourceApplicationId,
    targetServiceCode,
    licensePermitNo,
  });

  return {
    data: {
      sourceApplicationId,
      sourceMedialLicenseId: 1,
      targetServiceCode: String(targetServiceCode),
      targetServiceType: "renew",
      selectionMode: "retained",
      existingActivities: [],
      selectedActivityIds: [],
      selectedActivities: [],
    },
  };
};

