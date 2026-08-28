import { useEffect, useMemo, useState } from "react";
import { Button, Form, Input, Select, Spin } from "antd";
import { LinkOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";

import ArrowLeft from "@/assets/icons/ArrowLeft";
import notVerifiedIcon from "@/assets/images/verifyAdvertiserPermit-tishi.svg";
import verifiedIcon from "@/assets/images/verifyAdvertiserPermit-tishi-Union.svg";
import { CustomMessage, PlatformMultiSelect } from "@/components/common";
import EmptyBox from "@/components/common/EmptyBox/EmptyBox";
import PublicLayout from "@/components/common/PublicLayout";
import { SocialMediaAccountIcon } from "@/components/designable/src/components/SocialMediaAccount/SocialMediaAccountIcon";
import {
  type AdvertiserPermitVerifyResultDto,
  type AdvertiserPermitVerifyType,
  type SocialMediaLookupItem,
  getSocialMediaPlatforms,
  verifyAdvertiserPermit,
} from "@/services/advertiserPermits";

import { resolveExternalWebUrl } from "@/utils/url";
import "./index.less";

type VerifyFormValues = {
  type: AdvertiserPermitVerifyType;
  query: string;
};

type PlatformOption = {
  label: string;
  value: number;
};

const ACCOUNT_NAME_TYPE: AdvertiserPermitVerifyType = 1;
const PERMIT_NUMBER_TYPE: AdvertiserPermitVerifyType = 2;

const getShownPlatforms = (items: SocialMediaLookupItem[]) => {
  const platformIds = new Set<number>();

  return items.filter((item) => {
    if (item.IsShown !== true || !Number.isFinite(item.Id)) return false;
    if (platformIds.has(item.Id)) return false;

    platformIds.add(item.Id);
    return true;
  });
};

const getPlatformLabel = (item: SocialMediaLookupItem, isArabic: boolean) => {
  const primaryLabel = isArabic ? item.NameAr : item.NameEn;
  const fallbackLabel = isArabic ? item.NameEn : item.NameAr;

  return primaryLabel?.trim() || fallbackLabel?.trim() || String(item.Id);
};

export default function VerifyNow() {
  const { t, i18n } = useTranslation();
  const history = useHistory();
  const [form] = Form.useForm<VerifyFormValues>();

  const [searchType, setSearchType] =
    useState<AdvertiserPermitVerifyType>(ACCOUNT_NAME_TYPE);
  const [platforms, setPlatforms] = useState<SocialMediaLookupItem[]>([]);
  const [selectedPlatformIds, setSelectedPlatformIds] = useState<number[]>([]);
  const [platformsLoading, setPlatformsLoading] = useState(true);
  const [result, setResult] =
    useState<AdvertiserPermitVerifyResultDto | null>(null);
  const [searching, setSearching] = useState(false);
  const resultAccounts = Array.isArray(result?.accounts)
    ? result.accounts
    : [];
  const showNotVerifiedEmptyState =
    result?.isVerified === false && resultAccounts.length === 0;

  const platformOptions = useMemo<PlatformOption[]>(
    () =>
      platforms.map((platform) => ({
        value: platform.Id,
        label: getPlatformLabel(
          platform,
          Boolean(i18n.language?.startsWith("ar")),
        ),
      })),
    [i18n.language, platforms],
  );

  useEffect(() => {
    let active = true;

    const loadPlatforms = async () => {
      try {
        const response = await getSocialMediaPlatforms();
        if (!response.isSuccess || !Array.isArray(response.data)) {
          throw new Error(response.message || "Unable to load social media platforms.");
        }

        const shownPlatforms = getShownPlatforms(response.data);
        if (!active) return;

        setPlatforms(shownPlatforms);
        setSelectedPlatformIds(shownPlatforms.map((platform) => platform.Id));
      } catch {
        if (!active) return;

        setPlatforms([]);
        setSelectedPlatformIds([]);
      } finally {
        if (active) setPlatformsLoading(false);
      }
    };

    loadPlatforms();

    return () => {
      active = false;
    };
  }, []);

  const searchByOptions = useMemo(
    () => [
      {
        value: ACCOUNT_NAME_TYPE,
        label: t("verifyAdvertiserPermit.accountName"),
      },
      {
        value: PERMIT_NUMBER_TYPE,
        label: t("verifyAdvertiserPermit.permitNumber"),
      },
    ],
    [t],
  );

  const handleValuesChange = (changedValues: Partial<VerifyFormValues>) => {
    setResult(null);
    if (changedValues.type !== undefined) {
      setSearchType(changedValues.type);
      setSelectedPlatformIds(platforms.map((platform) => platform.Id));
      form.setFieldsValue({ query: "" });
    }
  };

  const handleSearch = async (values: VerifyFormValues) => {
    if (searching) return;
    const query = values.query.trim();
    if (!query) return;

    try {
      setResult(null);
      setSearching(true);
      const shouldFilterByPlatform =
        values.type === ACCOUNT_NAME_TYPE &&
        selectedPlatformIds.length > 0 &&
        selectedPlatformIds.length < platformOptions.length;
      const response = await verifyAdvertiserPermit({
        query,
        type: values.type,
        ...(shouldFilterByPlatform
          ? { platform: selectedPlatformIds }
          : {}),
      });
      setResult(response.data);
      // console.log(response.data);

      // mock data
      // setResult({
      //   isVerified: true,
      //   expiryDate: "2026-07-17",
      //   accounts: [
      //     { platform: 4, title: "Facebook", url: "https://www.facebook.com/1234567890" },
      //     { platform: 5, title: "X", url: "https://www.x.com/1234567890" },
      //     { platform: 6, title: "Instagram", url: "https://www.instagram.com/1234567890" },
      //     { platform: 7, title: "YouTube", url: "https://www.youtube.com/1234567890" },
      //     { platform: 8, title: "Snapchat", url: "https://www.snapchat.com/1234567890" },
      //     { platform: 9, title: "LinkedIn", url: "https://www.linkedin.com/1234567890" },
      //     { platform: 10, title: "TikTok", url: "https://www.tiktok.com/1234567890" },
      //     { platform: 13, title: "Others", url: "https://www.others.com/1234567890" },
      //   ],
      // });

      //mock empty
      // setResult({
      //   isVerified: false,
      //   expiryDate: null,
      //   accounts: [],
      // });
    } catch {
      setResult(null);
      CustomMessage.error(t("verifyAdvertiserPermit.searchError"));
    } finally {
      setSearching(false);
    }
  };

  return (
    <PublicLayout>
      <div className="verify-now">
        <div className="verify-now-card">
          <div className="verify-now-title">
            <ArrowLeft
              className="verify-now-back"
              onClick={() => history.goBack()}
            />
            <h1>{t("verifyAdvertiserPermit.title")}</h1>
          </div>

          <div className="verify-now-search-panel">
            <Form<VerifyFormValues>
              className={`verify-now-form verify-now-form--${
                searchType === ACCOUNT_NAME_TYPE ? "account" : "permit"
              }`}
              layout="vertical"
              form={form}
              requiredMark={false}
              initialValues={{
                type: ACCOUNT_NAME_TYPE,
                query: "",
              }}
              onValuesChange={handleValuesChange}
              onFinish={handleSearch}
            >
              <Form.Item
                className="verify-now-search-type"
                name="type"
                label={
                  <span className="verify-now-required-label">
                    {t("verifyAdvertiserPermit.searchBy")}
                    <span
                      aria-hidden="true"
                      className="verify-now-required-mark"
                    >
                      *
                    </span>
                  </span>
                }
              >
                <Select aria-required="true" options={searchByOptions} />
              </Form.Item>

              {searchType === ACCOUNT_NAME_TYPE && (
                <Form.Item
                  className="verify-now-platform"
                  label={t("verifyAdvertiserPermit.platform")}
                >
                  <PlatformMultiSelect
                    allLabel={t("verifyAdvertiserPermit.all")}
                    maxVisibleTags={4}
                    onChange={setSelectedPlatformIds}
                    options={platformOptions}
                    value={selectedPlatformIds}
                    loading={platformsLoading}
                  />
                </Form.Item>
              )}

              <Form.Item
                className="verify-now-query"
                label={
                  searchType === PERMIT_NUMBER_TYPE ? (
                    <span
                      className="verify-now-label-spacer"
                      aria-hidden="true"
                    />
                  ) : undefined
                }
                name="query"
                rules={[
                  {
                    required: true,
                    whitespace: true,
                    message: t("verifyAdvertiserPermit.queryRequired"),
                  },
                ]}
              >
                <Input
                  maxLength={256}
                  placeholder={t(
                    searchType === ACCOUNT_NAME_TYPE
                      ? "verifyAdvertiserPermit.enterAccountName"
                      : "verifyAdvertiserPermit.enterPermitNumber",
                  )}
                />
              </Form.Item>

              <div className="verify-now-search-action">
                <Button
                  className="verify-now-search-button"
                  htmlType="submit"
                  loading={searching}
                >
                  {t("verifyAdvertiserPermit.search")}
                </Button>
              </div>
            </Form>
          </div>

          {(searching || result) && (
            <section
              className={`verify-now-result${
                searching
                  ? " verify-now-result--loading"
                  : showNotVerifiedEmptyState
                    ? " verify-now-result--not-verified-empty"
                    : result?.isVerified === true
                    ? " verify-now-result--verified"
                    : " verify-now-result--not-verified"
              }`}
            >
              <Spin size="large" spinning={searching}>
                <div className="verify-now-result-content">
                  {showNotVerifiedEmptyState ? (
                    <EmptyBox
                      customClassName="verify-now-empty-state"
                      hasButton={false}
                      title={t(
                        searchType === PERMIT_NUMBER_TYPE
                          ? "verifyAdvertiserPermit.permitNotVerified"
                          : "verifyAdvertiserPermit.accountNotVerified",
                      )}
                    />
                  ) : result && (
                    <>
                      <div className="verify-now-status-row">
                        {result.isVerified === true ? (
                          <img
                            className="verify-now-status-image verify-now-status-image--verified"
                            src={verifiedIcon}
                            alt=""
                          />
                        ) : (
                          <img
                            className="verify-now-status-image verify-now-status-image--not-verified"
                            src={notVerifiedIcon}
                            alt=""
                          />
                        )}
                        <h2>
                          {result.isVerified
                            ? t("verifyAdvertiserPermit.verified")
                            : t(
                                searchType === PERMIT_NUMBER_TYPE
                                  ? "verifyAdvertiserPermit.permitNotVerified"
                                  : "verifyAdvertiserPermit.accountNotVerified",
                              )}
                        </h2>
                      </div>

                    {resultAccounts.length > 0 && (
                      <div className="verify-now-accounts">
                        <h3>
                          {t(
                            searchType === PERMIT_NUMBER_TYPE
                              ? "verifyAdvertiserPermit.associatedAccounts"
                              : "verifyAdvertiserPermit.matchedAccounts",
                          )}
                        </h3>
                        <div className="verify-now-account-list">
                          {resultAccounts.map((account, index) => {
                            const safeAccountUrl = resolveExternalWebUrl(
                              account.url,
                            );

                            return (
                              <div
                                className="verify-now-account"
                                key={`${account.platform}-${account.title}-${index}`}
                              >
                                <SocialMediaAccountIcon
                                  typeId={account.platform}
                                  className="verify-now-account-icon"
                                />
                                <div className="verify-now-account-info">
                                  <div className="verify-now-account-title">
                                    {account.title}
                                  </div>
                                  {account.url &&
                                    (safeAccountUrl ? (
                                      <a
                                        className="verify-now-account-url"
                                        href={safeAccountUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        <LinkOutlined />
                                        <span>{account.url}</span>
                                      </a>
                                    ) : (
                                      <div className="verify-now-account-url">
                                        <LinkOutlined />
                                        <span>{account.url}</span>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    </>
                  )}
                </div>
              </Spin>
            </section>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
