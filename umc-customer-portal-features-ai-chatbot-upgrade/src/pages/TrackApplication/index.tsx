import { fmt } from "@/utils/gstTime";
import PublicLayout from "@/components/common/PublicLayout";
import TrackApp from '@/assets/images/TrackApplicationTitle.png';
import ArrowLeft from "@/assets/icons/ArrowLeft";
import './index.less';
import { useHistory, useLocation } from "react-router-dom";
import { Form, Input, Spin } from "antd";
import { useTranslation } from "react-i18next";
import { CustomButton } from "@/components/common";
import OverflowTooltip from "@/components/common/OverflowTooltip";
import { useState, useEffect, type ReactNode } from "react";
import AED from "@/assets/icons/Aed";
import formatMoney from "@/utils/formatMoney";
import {
    searchPublicTrackApplication,
    type TrackApplicationName,
    type PublicTrackApplicationResponse,
} from "@/services/trackApplication";

interface TrackApplicationField {
    label: string;
    value: ReactNode;
}

const RATE_LIMIT_STATUS_CODE = 429;
const RATE_LIMIT_DISABLE_DURATION = 30 * 60 * 1000;

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === "object" && value !== null;
};

const isRateLimitError = (error: unknown): boolean => {
    if (!isRecord(error)) return false;

    if (error.statusCode === RATE_LIMIT_STATUS_CODE) return true;

    const response = error.response;
    if (!isRecord(response)) return false;

    if (response.status === RATE_LIMIT_STATUS_CODE) return true;

    const responseData = response.data;
    return isRecord(responseData) && responseData.statusCode === RATE_LIMIT_STATUS_CODE;
};

const getTextValue = (value: unknown): string => {
    if (typeof value !== "string") return "";
    return value.trim();
};

type TrackApplicationStatusClassName =
    | "warning"
    | "alert"
    | "approved"
    | "rejected"
    | "neutral";

const STATUS_CLASS_BY_APPLICATION_TYPE: Record<
    number,
    Record<number, TrackApplicationStatusClassName>
> = {
    0: {
        100: "neutral",
        101: "neutral",
        102: "warning",
        103: "warning",
        104: "alert",
        105: "approved",
        106: "rejected",
        107: "neutral",
        108: "warning",
        109: "warning",
    },
    1: {
        1: "warning",
        2: "warning",
        3: "warning",
        4: "warning",
        5: "approved",
        6: "approved",
        7: "neutral",
    },
    2: {
        0: "warning",
        1: "warning",
        3: "warning",
        4: "warning",
        5: "warning",
        6: "approved",
        7: "rejected",
        8: "neutral",
        9: "approved",
    },
    3: {
        1: "warning",
        2: "warning",
        3: "warning",
        4: "warning",
        5: "rejected",
        6: "approved",
        7: "neutral",
    },
};

const getStatusClassName = (
    applicationType?: number | null,
    statusId?: number | null,
): TrackApplicationStatusClassName => {
    if (typeof applicationType !== "number" || typeof statusId !== "number") {
        return "neutral";
    }

    return STATUS_CLASS_BY_APPLICATION_TYPE[applicationType]?.[statusId] ?? "neutral";
};

export default function TrackApplication(){
    const { t, i18n } = useTranslation();
    const isAr = i18n.language?.toLowerCase().startsWith("ar");
    const [,update] = useState({});
    const history = useHistory();
    const location = useLocation();
    const [form] = Form.useForm();
    const [data, setData] = useState<PublicTrackApplicationResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [isRateLimitReached, setIsRateLimitReached] = useState(false);
    const [rateLimitDisabledUntil, setRateLimitDisabledUntil] = useState<number | null>(null);

    const fmtTime = (s?: string | null) =>
    fmt(s, "DD/MM/YYYY HH:mm:ss");

    const getLocalizedName = (item?: TrackApplicationName | null) => {
        const localizedValue = isAr
            ? item?.nameAr || item?.nameEn
            : item?.nameEn || item?.nameAr;
        return getTextValue(localizedValue) || "-";
    };

    const getReferenceNumber = (referenceNo?: string | null) => {
        return getTextValue(referenceNo) || getTextValue(data?.referenceNumber) || "-";
    };

    const renderFields = (fields: TrackApplicationField[]) => (
        <div className="track-application-content-data">
            {fields.map((field) => (
                <div className="track-application-data-item" key={field.label}>
                    <div className="track-application-fields-name">{field.label}</div>
                    <div className="track-application-fields-value" dir="auto">
                        {field.value}
                    </div>
                </div>
            ))}
        </div>
    );

    const renderResultCard = (
        applicationType: number | null | undefined,
        referenceNo: string | null | undefined,
        status: TrackApplicationName | null | undefined,
        fields: TrackApplicationField[],
    ) => (
        <div className="track-application-content-wrapper">
            <div className="track-application-content">
                <div className="track-application-content-title">
                    <div className="track-application-reference-number">
                        {getReferenceNumber(referenceNo)}
                    </div>
                    <div
                        className={`track-application-status-tag track-application-status-tag--${getStatusClassName(applicationType, status?.id)}`}
                    >
                        {getLocalizedName(status)}
                    </div>
                </div>
                {renderFields(fields)}
            </div>
        </div>
    );

    const renderRefundAmount = (refundAmount?: number | null) => {
        if (typeof refundAmount !== "number" || !Number.isFinite(refundAmount)) {
            return "-";
        }

        return (
            <span className="track-application-refund-amount" dir="ltr">
                <AED />
                {formatMoney(refundAmount)}
            </span>
        );
    };

    const renderPublicResult = () => {
        if (!data || data.requiresLogin === true) return null;

        switch (data.applicationType) {
            case 0: {
                const detail = data.serviceApplication;
                if (!detail) return null;
                const serviceName = getLocalizedName(detail.service);
                return renderResultCard(data.applicationType, detail.referenceNo, detail.status, [
                    {
                        label: t("trackApplication.serviceName"),
                        value: (
                            <OverflowTooltip
                                className="track-application-service-name"
                                placement="top"
                                title={serviceName}
                            >
                                {serviceName}
                            </OverflowTooltip>
                        ),
                    },
                    { label: t("trackApplication.applicantName"), value: getTextValue(detail.applicantName) || "-" },
                    { label: "Apply for", value: getTextValue(detail.applyfor) || "-" },
                    { label: t("trackApplication.submissionTime"), value: fmtTime(detail.submissionTime) },
                ]);
            }
            case 1: {
                const detail = data.enquiryComplaint;
                if (!detail) return null;
                return renderResultCard(data.applicationType, detail.referenceNo, detail.status, [
                    { label: t("trackApplication.enquiryType"), value: getLocalizedName(detail.enquiryType) },
                    { label: t("trackApplication.applicationNumber"), value: getTextValue(detail.applicationNumber) || "-" },
                    { label: t("trackApplication.serviceName"), value: getLocalizedName(detail.service) },
                    { label: t("trackApplication.description"), value: getTextValue(detail.problemDescription) || "-" },
                    { label: t("trackApplication.submissionTime"), value: fmtTime(detail.submissionTime) },
                ]);
            }
            case 2: {
                const detail = data.appeal;
                if (!detail) return null;
                return renderResultCard(data.applicationType, detail.referenceNo, detail.status, [
                    { label: t("trackApplication.appealReason"), value: getTextValue(detail.appealReason) || "-" },
                    { label: t("trackApplication.violationNumber"), value: getTextValue(detail.violationNumber) || "-" },
                    { label: t("trackApplication.profileName"), value: getTextValue(detail.profileName) || "-" },
                    { label: t("trackApplication.notes"), value: getTextValue(detail.notes) || "-" },
                    { label: t("trackApplication.submissionTime"), value: fmtTime(detail.submissionTime) },
                ]);
            }
            case 3: {
                const detail = data.refund;
                if (!detail) return null;
                return renderResultCard(data.applicationType, detail.referenceNo, detail.status, [
                    { label: t("trackApplication.refundCategory"), value: getLocalizedName(detail.refundCategory) },
                    { label: t("trackApplication.applicationNumber"), value: getTextValue(detail.applicationNumber) || "-" },
                    { label: t("trackApplication.refundReason"), value: getLocalizedName(detail.refundReason) },
                    { label: t("trackApplication.refundAmount"), value: renderRefundAmount(detail.refundAmount) },
                    { label: t("trackApplication.submissionTime"), value: fmtTime(detail.submissionTime) },
                ]);
            }
            default:
                return null;
        }
    };

    const publicResult = renderPublicResult();
    const shouldShowLoginPrompt = data?.requiresLogin === true;
    const isSearchDisabledByRateLimit =
        typeof rateLimitDisabledUntil === "number" && rateLimitDisabledUntil > Date.now();

    useEffect(() => {
        if (rateLimitDisabledUntil === null) return undefined;

        const remainingTime = rateLimitDisabledUntil - Date.now();
        if (remainingTime <= 0) {
            setRateLimitDisabledUntil(null);
            return undefined;
        }

        const timer = window.setTimeout(() => {
            setRateLimitDisabledUntil(null);
        }, remainingTime);

        return () => window.clearTimeout(timer);
    }, [rateLimitDisabledUntil]);
    
    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const requestNumber = searchParams.get("requestNumber");
        if (requestNumber) {
            form.setFieldsValue({ referenceNumber: requestNumber });
        }
    }, [location.search, form]);
    async function handleSearch(){
        if (isSearchDisabledByRateLimit) return;

        const values = await form.validateFields();
        const referenceNumber = String(values.referenceNumber || "").trim();
        const email = String(values.email || "").trim();
        setData(null);
        setHasSearched(true);
        setIsRateLimitReached(false);
        setLoading(true);
        try {
            const res = await searchPublicTrackApplication({ referenceNumber, email });
            if (isRateLimitError(res)) {
                setIsRateLimitReached(true);
                setRateLimitDisabledUntil(Date.now() + RATE_LIMIT_DISABLE_DURATION);
                return;
            }

            const result = res?.data;
            if (res?.isSuccess === true && result?.status === 0) {
                setData(result);
            }
        } catch (error) {
            setData(null);
            if (isRateLimitError(error)) {
                setIsRateLimitReached(true);
                setRateLimitDisabledUntil(Date.now() + RATE_LIMIT_DISABLE_DURATION);
            }
        } finally {
            setLoading(false);
        }
    }
    return<div className="track-application-wrapper">
        <PublicLayout title={TrackApp}>
            <div className="track-application">
                <div className="pay-fines-back">
                    <ArrowLeft className="go-back" onClick={() => history.goBack()} />
                    <div className="pay-fines-title">{t("trackApplication.title")}</div>
                </div>
                <div className="track-application-filter">
                    <Form form={form} layout="vertical" className="custorm-form track-application-form" onValuesChange={()=>{
                        update({});
                    }}>
                        <Form.Item label={t("trackApplication.referenceNumber")} name="referenceNumber" required rules={[
                            { required: true, message: t('common.required')}
                        ]}>
                            <Input placeholder={t("formPlaceholders.pages.trackApplication.enterReference")} />
                        </Form.Item>
                        <Form.Item label={t("login.email")} name="email" required rules={[
                            { required: true, message: t('common.required')},
                            { type: "email", message: t("login.invalidEmail") },
                        ]}>
                            <Input type="email" autoComplete="email" placeholder={t("formPlaceholders.common.enterEmail")} />
                        </Form.Item>
                    </Form>
                    <div className="track-application-search">
                        <CustomButton onClick={handleSearch} customClassName="search-btn" text={t("common.search")} disabled={isSearchDisabledByRateLimit || !form.getFieldValue('referenceNumber')?.trim() || !form.getFieldValue('email')?.trim()} />
                    </div>
                </div>
                {!data && !loading && !shouldShowLoginPrompt && !isRateLimitReached && <div className="track-application-empty">
                    {hasSearched ? t("trackApplication.noResults") : t("trackApplication.resultsHint")}
                </div>}
                <Spin spinning={loading}>
                    {loading && <div className="track-application-loading-height"></div>}
                </Spin>
                {/* {shouldShowLoginPrompt && !loading && <div className="track-application-content-wrapper track-application-login-required">
                    <div className="track-application-login-required-content">
                        <div className="track-application-login-required-message">
                            {t("trackApplication.nonPublicServiceMessage")}
                        </div>
                        <CustomButton
                            customClassName="track-application-login-required-button"
                            onClick={() => history.push("/login")}
                            text={t("trackApplication.login")}
                        />
                    </div>
                </div>} */}
                {isRateLimitReached && !loading && <div className="track-application-content-wrapper track-application-login-required">
                    <div className="track-application-login-required-content">
                        <div className="track-application-login-required-message-error">
                            {t("trackApplication.attemptLimitReached")}
                        </div>
                    </div>
                </div>}
                {publicResult && !loading && publicResult}
                {data && !loading && !shouldShowLoginPrompt && !publicResult && <div className="track-application-empty">
                    {t("trackApplication.noResults")}
                </div>}
            </div>
        </PublicLayout>
    </div>
    
}
