import request from "@/utils/request";
import type { AxiosRequestConfig } from "axios";
import {
    OCR_API_BASE_URL,
    OCR_API_DEV_PROXY_PREFIX,
} from "@/config/constants";

interface ApiResponse<TData> {
    isSuccess?: boolean;
    statusCode?: number;
    message?: string | null;
    data: TData;
}

export type OcrApiDocumentType = "passport" | "emirates-id";

export interface OcrExtractByObjectNameParams {
    documentType: OcrApiDocumentType;
    objectName: string;
}

export interface OcrExtractResponse {
    success: boolean;
    documentType: OcrApiDocumentType;
    passportNumber?: string | null;
    passportExpiryDate?: string | null;
    emiratesId?: string | null;
    expiryDate?: string | null;
    fullNameAr?: string | null;
    fullNameEn?: string | null;
    nationality?: string | null;
    nationalityId?: number | null;
    genderId?: number | null;
    dateOfBirth?: string | null;
    confidence?: number | null;
    message?: string | null;
    warnings?: string[] | null;
}

type OcrExtractApiResponse =
    | OcrExtractResponse
    | ApiResponse<OcrExtractResponse>;

const isOcrExtractResponse = (
    response: unknown,
): response is OcrExtractResponse =>
    !!response &&
    typeof response === "object" &&
    typeof (response as OcrExtractResponse).success === "boolean";

const resolveOcrExtractResponse = (
    response: OcrExtractApiResponse,
    documentType: OcrApiDocumentType,
): OcrExtractResponse => {
    if (isOcrExtractResponse(response)) {
        return response;
    }

    const wrappedResponse = response as ApiResponse<OcrExtractResponse>;
    if (isOcrExtractResponse(wrappedResponse.data)) {
        return wrappedResponse.data;
    }

    return {
        success: false,
        documentType,
        message: wrappedResponse.isSuccess === false
            ? wrappedResponse.message || null
            : null,
    };
};

const getTextValue = (value: unknown): string => {
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
    return "";
};

export const fileUpload = (files: FormData, config: AxiosRequestConfig = {}) => {
    return request.post<ApiResponse<string[]>, ApiResponse<string[]>>("/api/Document/Upload", files, {
        ...config,
        headers: {
            ...config.headers,
            "Content-Type": "multipart/form-data",
        }
    }
    );
};

export const getDocumentUploadResponseUrl = (response: unknown): string => {
    if (!response) return "";

    const directText = getTextValue(response);
    if (directText) return directText;

    if (Array.isArray(response)) {
        return response.map(getDocumentUploadResponseUrl).find(Boolean) || "";
    }

    if (typeof response !== "object") return "";

    const payload = response as Record<string, unknown>;
    return (
        getDocumentUploadResponseUrl(payload.url) ||
        getDocumentUploadResponseUrl(payload.fileUrl) ||
        getDocumentUploadResponseUrl(payload.filePath) ||
        getDocumentUploadResponseUrl(payload.data)
    );
};

export interface FileOriginalNameDto {
    key: string;
    originalFileName: string | null;
}

type FileOriginalNamesResponse =
    | FileOriginalNameDto[]
    | { data?: FileOriginalNameDto[] };

// Display-only lookup: resolves storage keys back to the original upload names.
// Failures must stay silent so the caller can keep the key basename fallback.
export const getOriginalFileNames = async (
    keys: string[],
): Promise<FileOriginalNameDto[]> => {
    const response = await request.post<
        FileOriginalNamesResponse,
        FileOriginalNamesResponse
    >(
        "/api/Document/OriginalNames",
        { keys },
        { skipErrorToast: true },
    );

    if (Array.isArray(response)) return response;
    return Array.isArray(response?.data) ? response.data : [];
};

export const fileDowload = (fileName:string) => {
    return request.get(`/api/Document/Dowload?fileName=${fileName}`);
};

export const ocrExtractByObjectName = (
    params: OcrExtractByObjectNameParams,
) => {
    const ocrBaseUrl = OCR_API_BASE_URL && import.meta.env.DEV
        ? OCR_API_DEV_PROXY_PREFIX
        : OCR_API_BASE_URL;

    return request.post<OcrExtractApiResponse, OcrExtractApiResponse>(
        "/api/Document/OcrExtract",
        params,
        {
            skipErrorToast: true,
            ...(ocrBaseUrl ? { baseURL: ocrBaseUrl } : {}),
        },
    ).then((response) => resolveOcrExtractResponse(response, params.documentType));
};

// Anonymous upload for the public (no-login) enquiry form -> /api/Document/public/Upload.
export const publicFileUpload = (files:FormData) => {
    return request.post<ApiResponse<string[]>, ApiResponse<string[]>>("/api/Document/public/Upload", files, {
        headers: {
            "Content-Type": "multipart/form-data",
        }
    }
    );
};
