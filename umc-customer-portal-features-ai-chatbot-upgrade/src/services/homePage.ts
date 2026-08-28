import request from "@/utils/request";

export interface ProfilePendingActionCount {
    profileId: string | number;
    count: number;
}

let pendingActionCountsRequest: ReturnType<typeof request.get<ProfilePendingActionCount[]>> | null = null;

export const myPendingAcctions = () => {
    return request.get("/api/HomePage/MyPendingAcctions");
};

export const recentRequestList = () => {
    return request.get("/api/HomePage/RecentRequestList");
};

export const collectServiceList = () => {
    return request.get("/api/HomePage/CollectServiceList");
};

export const getPendingAcctions = (profileId: string | number) => {
    return request.get(`/api/HomePage/MyPendingAcctions?profileId=${profileId}`);
};

export const getPendingActionCounts = () => {
    if (!pendingActionCountsRequest) {
        pendingActionCountsRequest = request
            .get<ProfilePendingActionCount[]>("/api/HomePage/PendingActionCounts")
            .finally(() => {
                pendingActionCountsRequest = null;
            });
    }

    return pendingActionCountsRequest;
};
