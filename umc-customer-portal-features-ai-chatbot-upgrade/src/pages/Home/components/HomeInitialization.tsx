import React, { useState, useEffect } from "react";
import { Spin } from "antd";
import { CustomButton, ComfirmModal, CustomMessage } from "@/components/common";
import { collectServiceList } from "@/services/homePage";
import { getTransactionsList } from "@/services/payments";
import ArrowIcon from "@/assets/images/ArrowCircleRight.svg";
import ServiceIcon from "@/assets/images/service_icon.png";
import request from "@/utils/request";
import AED from "@/assets/icons/Aed";
import formatMoney from "@/utils/formatMoney";
import moment from "moment";
import ColorStar from "@/assets/images/color-star.svg";
import { useHistory } from "react-router-dom";
import useMediaQuery from "@/hooks/useMediaQuery";

import ProfileIcon from "@/assets/images/profile-icon.svg";
import ProcessModal from "./ProcessModal";
import TransactionsFinePayment from "@/assets/images/Home_FinePayment.png";
import TransactionsRefund from "@/assets/images/Home_Refund.png";
import TransactionsDefault from "@/assets/images/Home_NewspaperClipping.png";
import RechargeModal from "./RechargeModal";
import EmptyBox from "@/components/common/EmptyBox/EmptyBox";
import {
  useGlobalServiceProfileSelection,
  useServiceEntryGateDialogController,
} from "@/components/ServiceEntryGate";
import { useTranslation } from "react-i18next";
import {
  pendingActionServiceDisplayName,
  preferLocalizedEnAr,
} from "@/utils/bilingualDisplay";
import {
  getKnowledgeItemUrl,
  KNOWLEDGE_ITEMS,
} from "@/pages/Knowledgecenter/knowledgeData";
import { requestOpenAiChatBot } from "@/components/AIChatBot/featureFlag";

interface IWalletDetailObj {
  id: number;
  walletOwnerUserId: string;
  balance: number;
  currency: string;
  statusId: number;
  ishasPin: boolean;
}
interface UserTypeItem {
  nameEn: string;
  nameAr: string;
}
interface ServiceItem {
  code: string;
  id: number;
  serviceNameAr: string;
  serviceNameEn: string;
  serviceCategoryId: number;
  serviceCategoryNameAr: string;
  serviceCategoryNameEn: string;
  userTypes: UserTypeItem[];
}

interface TransactionsItem {
  id?: number | string | null;
  transactionNo?: string | null;
  amount?: number | string | null;
  createOn?: string | null;
  completedAt?: string | null;
  description?: string | null;
  paymentMethodId?: number | null;
  transactionTypeId?: number | null;
  transactionTypeObj?: {
    id?: number | null;
    nameEn?: string | null;
    nameAr?: string | null;
  } | null;
}
interface TransactionsPayload {
  items?: TransactionsItem[] | null;
}

type DataEnvelope<T> = { data: T };

const unwrapPayload = <T,>(response: unknown): T => {
  if (
    typeof response === "object" &&
    response !== null &&
    "data" in response
  ) {
    return (response as DataEnvelope<T>).data;
  }

  return response as T;
};

const getSafeArray = <T,>(value: unknown): T[] =>
  Array.isArray(value) ? (value as T[]) : [];

const toFiniteNumber = (value: unknown): number | null => {
  if (
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim() === "")
  ) {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
};

const formatTransactionDate = (value?: string | null): string => {
  const normalizedValue = String(value ?? "").trim();
  if (!normalizedValue) return "-";

  const date = moment(normalizedValue);
  return date.isValid() ? date.format("DD/MM/YYYY HH:mm:ss") : "-";
};

const HomeInitialization: React.FC = () => {
    const isMax1280Min1024 = useMediaQuery(
    "(max-width: 1919px) and (min-width: 1024px)",
  );
  const { t, i18n } = useTranslation();
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [walletDetail, setWalletDetail] = useState<IWalletDetailObj | null>(
    null,
  );
  const [transactionsList, setTransactionsList] = useState<TransactionsItem[]>(
    [],
  );
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [showComfirmModal, setShowComfirmModal] = useState(false);
  const history = useHistory();
  const { openDialog, dialogNode } = useServiceEntryGateDialogController();
  const {
    startService: startServiceWithProfileSelection,
    profileSelectionNode,
  } = useGlobalServiceProfileSelection();
  const [serviceList, setServiceList] = useState<ServiceItem[]>([]);
  useEffect(() => {
    getWalletDetail();
    getTransactions();
    getServiceList();
  }, []);
  const knowledgeList = KNOWLEDGE_ITEMS;
  const getWalletDetail = () => {
    request.get("/api/Wallet/Detail").then((res) => {
      setWalletDetail(res.data);
    });
  };
  const getTransactions = () => {
    setTransactionsLoading(true);
    getTransactionsList({
      PageIndex: 1,
      PageSize: 5,
    })
      .then((res) => {
        const payload = unwrapPayload<TransactionsPayload | null>(res);
        setTransactionsList(
          getSafeArray<TransactionsItem>(payload?.items).slice(0, 5),
        );
      })
      .catch((error) => {
        console.error("Failed to fetch payment center transactions:", error);
        setTransactionsList([]);
      })
      .finally(() => {
        setTransactionsLoading(false);
      });
    // request
    //   .get("/api/Wallet/Transactions", {
    //     SortDirection: 1,
    //     pageSize: 4,
    //   })
    //   .then((res) => {
    //     setTransactionsList(res.data?.items);
    //   });
  };
  const handleStartService = async (val: ServiceItem) => {
    await startServiceWithProfileSelection({
      history,
      serviceId: val.id,
      serviceCode: val.code,
      serviceName: val.serviceNameEn,
      source: "home-initialization",
      openDialog,
    });
  };
  // transactionTypeId: 1 RECHARGE (never returned here), 2 SERVICE_PAYMENT, 3 FINES, 4 REFUND
  const getIcon = (transactionTypeId: number | null) => {
    switch (transactionTypeId) {
      case 3:
        return TransactionsFinePayment;
      case 4:
        return TransactionsRefund;
      default:
        return TransactionsDefault;
    }
  };
  const rechanrgeAmount = (amount: string) => {
    if (walletDetail?.id) {
      request
        .post(`/api/Wallet/${walletDetail?.id}/Recharge`, {
          balance: Number(amount),
        })
        .then((res) => {
          if (res.data) {
            setShowRechargeModal(false);
            setShowComfirmModal(true);
            getWalletDetail();
            getTransactions();
          }
        });
    }
  };
  const getServiceList = () => {
    collectServiceList().then((res) => {
      if (res.data.length > 6) {
        setServiceList(res.data.slice(0, 6));
      } else {
        setServiceList(res.data || []);
      }
    });
  };
  const services = serviceList.map((item) => (
    <div className="service-item" key={item.id}>
      <img src={ServiceIcon} alt="" />
      <div className="service-name">
        {pendingActionServiceDisplayName(i18n.language.startsWith("ar"), item)}
      </div>
      <div className="tag-list">
        {item.userTypes.map((type, i) => (
          <div className="tag-item" key={i}>
            {i18n.language.startsWith("ar")
              ? type.nameAr ?? type.nameEn
              : type.nameEn}
          </div>
        ))}
      </div>
      <div className="item-footer">
        <CustomButton
          text={t("homeInitialization.learnMore")}
          customClassName="learn-btn"
          variant="outline"
          size="small"
          onClick={() => history.push(`/services/service-card?id=${item.id}`)}
        />
        <CustomButton
          text={t("homeInitialization.startService")}
          customClassName="start-btn"
          variant="primary"
          size="small"
          onClick={() => handleStartService(item)}
        />
      </div>
    </div>
  ));
  const transactions = transactionsList.map((item, i) => {
    const transactionTypeId = toFiniteNumber(
    item.transactionTypeId ?? item.transactionTypeObj?.id,
    );
    const isPositive = transactionTypeId === 1 || transactionTypeId === 4;
    const amount = toFiniteNumber(item.amount);
    const transactionName =
      preferLocalizedEnAr(
        i18n.language.startsWith("ar"),
        item.transactionTypeObj?.nameEn,
        item.transactionTypeObj?.nameAr,
      ) || "-";

    return (
      <div
        className="transactions-item"
        key={String(item.id ?? item.transactionNo ?? i)}
      >
        <div className="item-icon">
        <img src={getIcon(transactionTypeId)} alt="" />
        </div>
        <div className="item-msg">
          <div className="name">{transactionName}</div>
          <div className="time">{formatTransactionDate(item.completedAt)}</div>
        </div>
        <div className={`item-value ${!isPositive ? "item-value-red" : ""}`}>
          {amount === null ? (
            <span>-</span>
          ) : (
            <>
              <span>{isPositive ? "+" : "-"}</span>
              <AED />
              {formatMoney(amount)}
            </>
          )}
        </div>
      </div>
    );
  });
  return (
    <div className="initaialization-page">
      {/* module-1 */}
      <div className="module-1">
        <div className="module-card module-1-services">
          <div className="card-head">
            <div className="card-title">
              {t("homeInitialization.servicesTitle")}
            </div>
            <img
              src={ArrowIcon}
              onClick={() => history.push("/services")}
              alt=""
            />
          </div>
          {serviceList.length ? (
            <div className="services-list">{services}</div>
          ) : (
            <EmptyBox
              title={t("homeInitialization.noData")}
              customClassName="service-empty"
            />
          )}
        </div>
        <div className="module-1-advisor">
          <div className="module-card">
            <div className="card-head">
              <div className="card-title">
                {t("homeInitialization.serviceAdvisorTitle")}
              </div>
            </div>
            <div className="advisor-content">
              <div className="title-line">
                <img src={ColorStar} alt="" />
                <div className="title">
                  {t("homeInitialization.advisorTitle")}
                </div>
              </div>
              <div className="content">
                {t("homeInitialization.advisorContent")}
              </div>
              <div className="bottom-btn">
                <CustomButton
                  text={t("homeInitialization.getStarted")}
                  variant="primary"
                  size="small"
                  onClick={() => {
                    if (requestOpenAiChatBot()) return;
                    CustomMessage.info(
                      t("homeInitialization.featureInDevelopment"),
                    );
                  }}
                />
              </div>
            </div>
          </div>
          <div className="module-card">
            <div className="card-head">
              <div className="card-title">
                {t("homeInitialization.profileTitle")}
              </div>
            </div>
            <div className="advisor-content">
              <img src={ProfileIcon} alt="" />
              <div className="title">
                {t("homeInitialization.completeProfileTitle")}
              </div>
              <div className="content">
                {t("homeInitialization.completeProfileContent")}
              </div>
              <div className="bottom-btn">
                <CustomButton
                  text={t("homeInitialization.continueSetup")}
                  variant="primary"
                  size="small"
                  onClick={() => history.push("/my-account")}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* module-2 */}
      <div className="module-2">
        <div className="module-card module-2-wallet ">
          <div className="card-head">
            <div className="card-title">
              {/* {walletDetail?.statusId == 1
                ? t("homeInitialization.myWallet")
                : t("homeInitialization.transactionsTitle")} */}
              {t("homeInitialization.transactionsTitle")}
            </div>
            <img
              src={ArrowIcon}
              onClick={() => history.push("/payments")}
              alt=""
            />
          </div>
          <>
            {transactionsLoading ? (
              <div className="transactions-loading-wrapper">
                <Spin size="large" />
              </div>
            ) : transactionsList.length > 0 ? (
              <div className="transactions-list">{transactions}</div>
            ) : (
              <EmptyBox title={t("homeInitialization.noData")} />
            )}
          </>
        </div>
        <div className="module-card module-2-knowledge">
          <div className="card-head">
            <div className="card-title">
              {t("homeInitialization.knowledgeCenterTitle")}
            </div>
            <img
              src={ArrowIcon}
              alt=""
              onClick={() => {
                history.push("/knowledge-center");
              }}
            />
          </div>
          <div className="knowledge-list">
            {knowledgeList?.length > 0 ? (
              knowledgeList.slice(0, isMax1280Min1024 ? 3 : 4).map((item) => {
                return (
                  <div className="knowledge-item" key={item.id}>
                    <img src={item.img} alt="" />
                    <div className="title">
                      {i18n.language?.startsWith("ar") && item.titleAr
                        ? item.titleAr
                        : item.titleEn}
                    </div>
                    <div className="content">
                      {i18n.language?.startsWith("ar") && item.contentAr
                        ? item.contentAr
                        : item.contentEn}
                    </div>
                    <div className="btn-line">
                      <CustomButton
                        onClick={() => {
                          const url = getKnowledgeItemUrl(item, i18n.language);

                          if (url) {
                            window.open(url, "_blank", "noopener,noreferrer");
                            return;
                          }

                          history.push(
                            `/knowledge-center/knowledge-center-detail?id=${item.id}`,
                          );
                        }}
                        text={t("homeInitialization.learnMore")}
                        variant="outline"
                        size="small"
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyBox title={t("homeInitialization.noData")} />
            )}
          </div>
        </div>
      </div>
      <ProcessModal
        show={showProcessModal}
        close={() => setShowProcessModal(false)}
      />
      {/* RechargeModal */}
      <RechargeModal
        show={showRechargeModal}
        close={() => setShowRechargeModal(false)}
        recharge={rechanrgeAmount}
      />
      {/* ComfirmModal */}
      <ComfirmModal
        show={showComfirmModal}
        title={t("homeInitialization.rechargeSuccessTitle")}
        content={t("homeInitialization.rechargeSuccessContent")}
        cancelText={t("homeInitialization.close")}
        comfrimText={t("homeInitialization.downloadReceipt")}
        close={() => setShowComfirmModal(false)}
      />
      {dialogNode}
      {profileSelectionNode}
    </div>
  );
};

export default HomeInitialization;
