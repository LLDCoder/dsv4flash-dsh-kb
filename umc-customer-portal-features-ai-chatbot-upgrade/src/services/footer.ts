import request from "@/utils/request"


interface IPolicyTypeResponse {
    id: number;
    policyType: string;
    content: string;
    language: string;
    version: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}
export const getPolicyType = (type: string) => {
    return request.get<IPolicyTypeResponse>(`/api/ComplianceLegal/policy-type/${type}`)
}