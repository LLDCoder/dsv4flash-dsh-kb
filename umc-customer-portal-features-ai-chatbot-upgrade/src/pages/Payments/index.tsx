import AED from "@/assets/icons/Aed";
import ExportIcon from "@/assets/icons/ExportIcon";
import recharges from "@/assets/images/recharges.png";
import totalSpending from "@/assets/images/total-spending.png";
import serviceApp from "@/assets/images/service-app.png";
import totalFinesPaid from "@/assets/images/total-fines-paid.png";
import totalRefunds from "@/assets/images/total-refunds.png";
import totalRecharge from "@/assets/images/total-recharge.png";
import success from "@/assets/images/registration-successful.png";
import {
  Dropdown,
  Input,
  DatePicker,
  Menu,
  Select,
  Table,
  Modal,
  Form,
  Spin,
} from "antd";
import { MoreOutlined } from '@ant-design/icons';
import useIsMobile from "@/hooks/useIsMobile";
import useFilterOverflow from "@/hooks/useFilterOverflow";
import type { InputRef } from "antd/lib/input";
import SearchBar from "@/assets/icons/SearchBar";
import CardPay from "@/assets/icons/CardPay";
import noData from "@/assets/images/no-data.png";
import { useState, useRef, useEffect } from "react";
import eyePng from "@/assets/images/eye.png";
import hideEyePng from "@/assets/images/hide-eye.png";
import yellowWarnPng from "@/assets/images/yellow-warn.png";
import shouquan from "@/assets/images/shouquan.png";
import jinggao from "@/assets/images/jinggao.png";
import lockImg from "@/assets/images/lock.png";
import { useTranslation } from "react-i18next";
import {
  AppPagination,
  ComfirmModal,
  createProfileNameColumn,
  CustomButton,
  CustomMessage,
} from "@/components/common";
import formatMoney from "@/utils/formatMoney";
import moment from "moment";
import Loading from "@/components/common/Loading";
import CustomStatusTag from "@/components/common/CustomStatusTag";
import aesEncrypt from "@/utils/aesEncrypt";
import ChangePin from "./components/ChangePin";
import { isGlobalProfileId, useUserStore } from "@/store/user";
import "./index.less";
import { useHistory } from "react-router-dom";
import MobileFilterModal from "@/components/common/MobileFilterModal";
import FilterIcon from "@/assets/icons/FilterIcon";
import {
  downloadTransactionReceipt,
  postActive,
  getExportTransactions,
  getTransactionDetail,
  getTransactionsList,
  getTransactionTypes,
  getTransactionStatuses,
  getDetail,
  getTransactionTypeSum,
  mapPaymentCenterStatisticsToSumDetail,
  postRecharge,
  type IPaymentCenterStatisticsApiResponse,
  type PaymentCenterTransactionDetailDto,
  type ITransactionSumDetial,
} from "@/services/payments";
import type { IGetTransactionsParams } from "@/services/payments";
import RefundModal from "@/pages/Refund/components/AddModal";
import { checkRefundEligibility } from "@/services/refund";
import CopyIcon from "@/assets/icons/Copy.tsx";
import { copyToClipboard } from "@/utils/copy";
import {
  getReceiptDownloadErrorMessage,
  getReceiptDownloadFileName,
  getReceiptPendingMessage,
} from "@/utils/paymentReceipt";
import { preferLocalizedEnAr } from "@/utils/bilingualDisplay";
import { toPickerMoment } from "@/utils/dateLocale";
import useKeepAliveActivated from "@/components/KeepAlive/useKeepAliveActivated";
import useKeepAliveScrollRestoration from "@/components/KeepAlive/useKeepAliveScrollRestoration";
import { createKeepAliveAsyncGuard } from "@/components/KeepAlive/asyncGuard";

const { RangePicker } = DatePicker;

interface TransactionTypeObj {
  id: number;
  nameEn: string;
  nameAr: string;
}

interface WalletVauleObj {
  id: number;
  nameEn: string;
  nameAr: string;
}

interface StatusObj {
  id: number;
  nameEn: string;
  nameAr: string;
}

export interface ITransaction {
  id: number;
  transactionNo: string;
  profileId?: number | string | null;
  profileName?: string | null;
  userTypeId?: number | string | null;
  userTypeName?: string | null;
  transactionTypeId: number;
  transactionTypeObj: TransactionTypeObj;
  paymentMethodId: number;
  /** Present on some list responses; falls back to `walletVauleObj` for display. */
  paymentMethodObj?: WalletVauleObj;
  walletVauleObj: WalletVauleObj;
  /** Gross total the payer was charged, including the Magnati channel fee and its VAT. Display only. */
  amount: number;
  /** Bare settled amount, the only figure a refund can claim back. The channel fee is not refundable. */
  refundableAmount?: number;
  balanceBefore: number;
  balanceAfter: number;
  statusId: number;
  statusObj: StatusObj;
  description: string;
  createOn: string;
  completedAt?: string | null;
  referenceNumber: string;
  maskedCardNumber?: string | null;
  cardBrand?: string | null;
}
interface WalletStatusObj {
  id: number;
  nameEn: string;
  nameAr: string;
  scope: string;
}
export interface IWalletDetailObj {
  id: number;
  walletOwnerUserId: string;
  balance: number;
  currency: string;
  statusId: number;
  statusObj: WalletStatusObj;
  ishasPin: boolean;
}

function unwrapTransactionDetail(
  response: unknown,
): PaymentCenterTransactionDetailDto | null {
  if (response == null || typeof response !== "object") {
    return null;
  }

  const result = response as Record<string, unknown>;
  if (result.data != null && typeof result.data === "object") {
    return result.data as PaymentCenterTransactionDetailDto;
  }

  return result as PaymentCenterTransactionDetailDto;
}

export default function Payments() {
  const { i18n, t } = useTranslation();
  const isMobile = useIsMobile();
  const [filterRef, filtersOverflow] = useFilterOverflow();
  const [, update] = useState({});
  const history = useHistory();
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const userInfo = useUserStore((state) => state.userInfo);
  const currentProfileId = useUserStore((state) => state.currentProfileId);
  const showProfileNameColumn = isGlobalProfileId(currentProfileId);
  const [data, setData] = useState<ITransaction[]>([]);
  const [activeAmount, setActiveAmount] = useState("0.00");
  const [form] = Form.useForm();
  const amountValue = Form.useWatch("amount", form);
  const isCustomHighlighted = !!amountValue;
  const [hasError, setHasError] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [mobileFilterVisible, setMobileFilterVisible] = useState(false);
  const [pendingTypeId, setPendingTypeId] = useState<number | null>(null);
  const [pendingStatusId, setPendingStatusId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [createPinModalVisible, setCreatePinModalVisible] = useState(false);
  const [codeYzm, setCodeYzm] = useState(["", "", "", "", "", ""]);
  const [codeYzm2, setCodeYzm2] = useState(["", "", "", "", "", ""]);
  const inputsRef = useRef<Array<InputRef | null>>([]);
  const inputsRef2 = useRef<Array<InputRef | null>>([]);
  const paymentsLeftRef = useRef<HTMLDivElement>(null);
  const dividerRef = useRef<HTMLDivElement>(null);
  const [eye, setEye] = useState(false);
  const [transactionType, setTransactionType] = useState<TransactionTypeObj[]>(
    [],
  );
  const [transactionStatus, setTransactionStatus] = useState<StatusObj[]>([]);
  const [recentRecharge] = useState<ITransaction[]>([]);
  const [recentLoading] = useState(false);
  const [walletDetail, setWalletDetail] = useState<IWalletDetailObj | null>(
    null,
  );
  const [activeLoading, setActiveLoading] = useState(false);
  const [rechargeLoading, setRechargeLoading] = useState(false);
  const [sumDetial, setSumDetial] = useState<ITransactionSumDetial | null>(
    null,
  );
  const [getWalletDetailLoading, setGetWalletDetailLoading] = useState(false);
  const [params, setParams] = useState<IGetTransactionsParams>({
    PageSize: 10,
    PageIndex: 1,
    // SortDirection: 1,
    TransactionTypeId: null,
    StatusId: null,
  });
  const [ChangePinVisible, setChangePinVisible] = useState(false);
  const [total, setTotal] = useState(0);
  const [refundModalVisible, setRefundModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ITransaction | null>(
    null,
  );
  const refundPrecheckPendingRef = useRef(false);
  const transientUiGuardRef = useRef(createKeepAliveAsyncGuard());
  const [successModal, setSuccessModal] = useState<{
    visible: boolean;
    id: number | null;
    applicationNumber: string;
  }>({
    visible: false,
    id: null,
    applicationNumber: "",
  });
  const cols = [
    {
      title: t("payments.body.transactionNo"),
      dataIndex: "transactionNo",
      key: "TransactionNo",
      render: (text: string) => {
        return (
          <div className="w-136" title={text}>
            {text}
          </div>
        );
      },
    },
    {
      title: t("payments.body.type"),
      key: "Type",
      render: (_: unknown, record: ITransaction) => {
        const text = preferLocalizedEnAr(
          i18n.language.startsWith("ar"),
          record.transactionTypeObj?.nameEn,
          record.transactionTypeObj?.nameAr,
        );
        return (
          <div title={text} className="payments-table-ellipsis">
            {text}
          </div>
        );
      },
    },
    {
      title: t("payments.body.paymentMethod"),
      key: "PaymentMethod",
      render: (_: unknown, record: ITransaction) => {
        const src = record.paymentMethodObj ?? record.walletVauleObj;
        const text = preferLocalizedEnAr(
          i18n.language.startsWith("ar"),
          src?.nameEn,
          src?.nameAr,
        );
        return <div className="payments-table-payment-method">{text}</div>;
      },
    },
    ...(showProfileNameColumn
      ? [createProfileNameColumn<ITransaction>(t("common.profileName"))]
      : []),
    {
      title: (
        <div className="amount-title">
          {t("payments.body.amount")} (<AED />)
        </div>
      ),
      dataIndex: "amount",
      key: "Amount",
      render: (text: number, record: ITransaction) => {
        const isPlus =
          record?.transactionTypeObj?.id === 1 ||
          record?.transactionTypeObj?.id === 4;
        return (
          <div className="payments-table-amount">
            <div className={isPlus ? "amount-plus" : "amount-negative"}>
              {!isPlus ? "-" : "+"}
              {formatMoney(text)}
            </div>
          </div>
        );
      },
    },
    {
      title: t("payments.body.status"),
      dataIndex: "statusId",
      key: "Status",
      render: (text: number) => {
        return (
          <div className="payments-talbe-status">
            <CustomStatusTag type="wallet" status={text} />
          </div>
        );
      },
    },
    {
      title: t("payments.body.time"),
      dataIndex: "completedAt",
      key: "Time",
      render: (text: string) => {
        return (
          <div className="payments-table-create-on">
            {moment(text).format("DD/MM/YYYY HH:mm:ss")}
          </div>
        );
      },
    },
    {
      title: t("payments.body.actions"),
      key: "Actions",
      fixed: "right" as const,
      width: "1%",
      className: "actions-column",
      render: (_unused: unknown, record: ITransaction) => {
        if (record.statusId === 4) {
          return "—";
        }

        const canRefund =
          record?.transactionTypeObj?.id === 2 ||
          record?.transactionTypeObj?.id === 3;

        const menuItems = [
          {
            key: 'download',
            label: t("payments.body.downloadReceipt"),
            onClick: () => void handleTransactionReceiptDownload(record.transactionNo),
          },
          ...(canRefund ? [{
            key: 'refund',
            label: t("payments.body.refund"),
            onClick: () => void handleRefundClick(record),
          }] : []),
        ];

        if (isMobile) {
          return (
            <div onClick={(e) => e.stopPropagation()}>
              <Dropdown
                overlay={<Menu items={menuItems} />}
                trigger={['click']}
                placement="bottomRight"
                overlayClassName="payments-actions-dropdown"
              >
                <button
                  className="payments-more-button"
                  type="button"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreOutlined />
                </button>
              </Dropdown>
            </div>
          );
        }

        return (
          <div className="table-actions">
            <div
              className="download"
              onClick={(e) => {
                e.stopPropagation();
                void handleTransactionReceiptDownload(record.transactionNo);
              }}
            >
              <span>{t("payments.body.downloadReceipt")}</span>
            </div>
            {canRefund && (
              <div
                className="refund"
                onClick={(e) => {
                  e.stopPropagation();
                  void handleRefundClick(record);
                }}
              >
                {t("payments.body.refund")}
              </div>
            )}
          </div>
        );
      },
    },
  ];

  function getTransactions(params: IGetTransactionsParams) {
    if (loading) return;
    setLoading(true);
    const TransactionTypeId =
      params.TransactionTypeId === 0 ? null : params.TransactionTypeId;
    const StatusId = params.StatusId === 0 ? null : params.StatusId;
    getTransactionsList({
      ...params,
      TransactionTypeId,
      StatusId,
    })
      .then((res) => {
        setData(res.data?.items);
        setTotal(res.data?.total);
      })
      .finally(() => {
        setLoading(false);
      });
  }
  // Temporary disabled
  function getRecentRecharge(_params: IGetTransactionsParams) {
    void _params;
    // if (recentLoading) return;
    // setRecentLoading(true);
    // getTransactionsList(params)
    //   .then((res) => {
    //     setRecentRecharge(res.data?.items);
    //   })
    //   .finally(() => {
    //     setRecentLoading(false);
    //   });
  }
  function getTransactionType() {
    getTransactionTypes().then((res) => {
      setTransactionType(res.data);
    });
  }
  function getTransactionStatus() {
    getTransactionStatuses().then((res) => {
      setTransactionStatus(res.data);
    });
  }
  function getWalletDetail() {
    setGetWalletDetailLoading(true);
    getDetail()
      .then((res) => {
        setWalletDetail(res.data);
      })
      .finally(() => {
        setGetWalletDetailLoading(false);
      });
  }
  function getSum() {
    getTransactionTypeSum().then((res: IPaymentCenterStatisticsApiResponse) => {
      setSumDetial(mapPaymentCenterStatisticsToSumDetail(res.data));
    });
  }
  useEffect(() => {
    setParams({
      ...params,
      TransactionTypeId: null,
      StatusId: null,
    });
  }, [i18n.language]);
  useEffect(() => {
    getTransactionType();
    getTransactionStatus();
    getTransactions({
      PageSize: params.PageSize,
      PageIndex: params.PageIndex,
      // SortDirection: 1,
    });
    getRecentRecharge({
      PageSize: 100,
      PageIndex: 1,
      TransactionTypeId: 1,
      // SortDirection: 1,
    });
    getWalletDetail();
    getSum();
  }, []);

  useKeepAliveActivated({
    onActivated: ({ fromPath }) => {
      if (fromPath !== "/payments/transaction-detail") {
        return;
      }

      getTransactions(params);
      getWalletDetail();
      getSum();
    },
    onDeactivated: () => {
      transientUiGuardRef.current.invalidate();
      refundPrecheckPendingRef.current = false;
      setModalVisible(false);
      setMobileFilterVisible(false);
      setPendingTypeId(null);
      setPendingStatusId(null);
      setModalOpen(false);
      setCreatePinModalVisible(false);
      setRechargeLoading(false);
      setChangePinVisible(false);
      setRefundModalVisible(false);
      setSelectedRecord(null);
      setSuccessModal({ visible: false, id: null, applicationNumber: "" });
      setCodeYzm(["", "", "", "", "", ""]);
      setCodeYzm2(["", "", "", "", "", ""]);
      setEye(false);
    },
  });

  useKeepAliveScrollRestoration();

  useEffect(() => {
    if (modalOpen) {
      form?.resetFields();
      setActiveAmount("0.00");
      update({});
    }
  }, [modalOpen]);

  useEffect(() => {
    const updateNotch = () => {
      if (!paymentsLeftRef.current || !dividerRef.current) return;
      const cardRect = paymentsLeftRef.current.getBoundingClientRect();
      const divRect = dividerRef.current.getBoundingClientRect();
      const y = divRect.top - cardRect.top + divRect.height / 2;
      paymentsLeftRef.current.style.setProperty("--notch-y", `${Math.round(y)}px`);
    };
    updateNotch();
    const ro = new ResizeObserver(updateNotch);
    if (paymentsLeftRef.current) ro.observe(paymentsLeftRef.current);
    return () => ro.disconnect();
  }, [walletDetail, getWalletDetailLoading]);

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
  ) => {
    if (e.key === "Backspace" && !codeYzm[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleKeyDown2 = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
  ) => {
    if (e.key === "Backspace" && !codeYzm2[index] && index > 0) {
      inputsRef2.current[index - 1]?.focus();
    }
  };

  function handleInputChange(value: string, index: number) {
    if (!/^\d?$/.test(value)) return;
    codeYzm[index] = value;
    setCodeYzm([...codeYzm]);
    if (value && index < codeYzm.length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  }
  function handleInputChange2(value: string, index: number) {
    if (!/^\d?$/.test(value)) return;
    codeYzm2[index] = value;
    setCodeYzm2([...codeYzm2]);
    if (value && index < codeYzm2.length - 1) {
      inputsRef2.current[index + 1]?.focus();
    }
  }
  function handleCreatePin() {
    if (activeLoading) return;
    if (isDisabled) return;
    if (walletDetail?.id) {
      setActiveLoading(true);
      postActive({
        id: walletDetail.id,
        pin: aesEncrypt(codeYzm2.join("")),
      })
        .then((res) => {
          if (res.data) {
            setCreatePinModalVisible(false);
            getWalletDetail();
          }
        })
        .finally(() => {
          setActiveLoading(false);
        });
    }
  }
  function handleTransactionNoChange(value: string) {
    const iparams = {
      ...params,
      PageIndex: 1,
      TransactionNo: value,
    };
    setParams(iparams);
    getTransactions(iparams);
  }
  function handleDateChange(
    v: [moment.Moment | null, moment.Moment | null] | null,
  ) {
    let iparams = { ...params };
    if (!v) {
      iparams = {
        ...params,
        PageIndex: 1,
        StartDate: null,
        EndDate: null,
      };
      setParams(iparams);
    } else {
      iparams = {
        ...params,
        PageIndex: 1,
        StartDate: v[0]?.format("YYYY-MM-DD"),
        EndDate: v[1]?.format("YYYY-MM-DD"),
      };
      setParams(iparams);
    }
    getTransactions(iparams);
  }
  function handleTypeChange(TransactionTypeId: number) {
    const iparams = {
      ...params,
      TransactionTypeId,
      PageIndex: 1,
    };
    setParams(iparams);
    getTransactions(iparams);
  }
  function handleStatusChange(StatusId: number) {
    const iparams = {
      ...params,
      StatusId,
      PageIndex: 1,
    };
    setParams(iparams);
    getTransactions(iparams);
  }
  function handlePageChange(PageIndex: number, PageSize: number) {
    const iparams = {
      ...params,
      PageIndex,
      PageSize,
    };
    setParams(iparams);
    getTransactions(iparams);
  }

  async function handleTransactionReceiptDownload(transactionNo: string) {
    try {
      const response = await getTransactionDetail(transactionNo);
      const transactionDetail = unwrapTransactionDetail(response);
      const pendingMessage = getReceiptPendingMessage(
        transactionDetail?.hasReceipt,
        transactionDetail?.receipt,
      );

      if (pendingMessage) {
        CustomMessage.error(pendingMessage);
        return;
      }

      await downloadTransactionReceipt(
        transactionNo,
        getReceiptDownloadFileName(
          transactionDetail?.receipt,
          `receipt-${transactionNo}.pdf`,
        ),
      );
    } catch (error) {
      CustomMessage.error(getReceiptDownloadErrorMessage(error));
    }
  }

  async function handleRefundClick(record: ITransaction) {
    if (refundPrecheckPendingRef.current) return;

    const referenceNumber = String(record.referenceNumber ?? "").trim();

    setRefundModalVisible(false);
    setSelectedRecord(null);

    if (!referenceNumber) {
      return;
    }

    refundPrecheckPendingRef.current = true;
    const flowVersion = transientUiGuardRef.current.capture();
    try {
      const response = await checkRefundEligibility(referenceNumber);

      if (!transientUiGuardRef.current.isCurrent(flowVersion)) {
        return;
      }

      if (!response?.data?.refund) {
        if (response?.data?.message) {
          CustomMessage.error(response.data.message);
        }
        return;
      }

      setSelectedRecord(record);
      setRefundModalVisible(true);
    } finally {
      if (transientUiGuardRef.current.isCurrent(flowVersion)) {
        refundPrecheckPendingRef.current = false;
      }
    }
  }

  async function handleRecharge() {
    if (rechargeLoading) return;
    if (activeAmount === "0.00" && hasError) {
      return;
    }
    let { amount } = form.getFieldsValue();
    if (!amount || amount < 100) {
      amount = activeAmount;
    }

    if (!amount || amount === "0.00") {
      return;
    }
    if (walletDetail?.id) {
      const flowVersion = transientUiGuardRef.current.capture();
      setRechargeLoading(true);
      postRecharge({
        id: walletDetail.id,
        balance: Number(amount),
        })
        .then((res) => {
          if (!transientUiGuardRef.current.isCurrent(flowVersion)) {
            return;
          }

          if (res.data) {
            setModalOpen(false);
            setModalVisible(true);
            getWalletDetail();
            getSum();
            getRecentRecharge({
              PageSize: 100,
              PageIndex: 1,
              TransactionTypeId: 1,
              // SortDirection: 1,
            });
            getTransactions(params);
          }
        })
        .finally(() => {
          if (transientUiGuardRef.current.isCurrent(flowVersion)) {
            setRechargeLoading(false);
          }
        });
    }
  }
  function handleExportData(
    params: IGetTransactionsParams,
    pageIndex: number = 1,
  ) {
    setExportLoading(true);
    setTimeout(() => {
      setExportLoading(false);
    }, 1000);
    const pageSize = 10000;
    const totalPage = Math.ceil(total / pageSize);
    if (totalPage < pageIndex) {
      return;
    }
    const StartDate = params.StartDate
      ? moment(params.StartDate).format("YYYY-MM-DD")
      : moment(userInfo.createOn).format("YYYY-MM-DD");
    const EndDate = params.EndDate
      ? moment(params.EndDate).format("YYYY-MM-DD")
      : moment().format("YYYY-MM-DD");
    getExportTransactions(
      {
        ...params,
        PageSize: pageSize,
        PageIndex: pageIndex,
      },
      `Transactions_${StartDate}_${EndDate}.csv`,
    );
    handleExportData(params, pageIndex + 1);
  }

  function addSuccess(id: number, applicationNumber: string) {
    setSuccessModal({ visible: true, id, applicationNumber });
    getTransactions(params);
  }
  const typeOpts =
    transactionType?.map((item) => ({
      label: preferLocalizedEnAr(
        i18n.language.startsWith("ar"),
        item.nameEn,
        item.nameAr,
      ),
      value: item.id,
    })) || [];
  typeOpts.unshift({
    value: 0,
    label: t("payments.myWallet.allTypes"),
  });
  const statusOpts =
    transactionStatus?.map((item) => ({
      label: preferLocalizedEnAr(
        i18n.language.startsWith("ar"),
        item.nameEn,
        item.nameAr,
      ),
      value: item.id,
    })) || [];
  statusOpts.unshift({
    value: 0,
    label: t("payments.myWallet.allStatuses"),
  });
  const isNotMatch =
    codeYzm.join("") !== codeYzm2.join("") &&
    codeYzm.join("").length === 6 &&
    codeYzm2.join("").length === 6;
  const isDisabled =
    isNotMatch || codeYzm.join("").length < 6 || codeYzm2.join("").length < 6;
  return (
    <div className="payments">
      <Modal centered
        className="payments-modal"
        maskClosable={false}
        visible={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={false}
        title={
          <div className="payments-modal-header">
            <div className="title">{t("payments.recharge.title")}</div>
            <div className="desc">{t("payments.recharge.desc")}</div>
          </div>
        }
      >
        <div className="payments-modal-content">
          <div className="recharge-amount">
            <div className="recharge-amount-title">
              {t("payments.recharge.rechargeAmount")}
            </div>
            <div className="recharge-amount-amount">
              {["100.00", "500.00", "1000.00", "2000.00", "5000.00"].map(
                (item) => {
                  return (
                    <div
                      key={item}
                      className={
                        item === activeAmount ? "recharge-amount-active" : ""
                      }
                      onClick={() => {
                        if (activeAmount === item) {
                          setActiveAmount("0.00");
                        } else {
                          setActiveAmount(item);
                        }
                        form.setFieldValue("amount", undefined);
                        update({});
                      }}
                    >
                      <AED />
                      {item}
                    </div>
                  );
                },
              )}
              <Form
                form={form}
                layout="vertical"
                onChange={() => {
                  setActiveAmount("0.00");
                  update({});
                }}
                onValuesChange={() => {
                  setActiveAmount("0.00");
                  update({});
                }}
                className={`custorm-form ${
                  isCustomHighlighted ? "has-value" : ""
                }`}
              >
                <Form.Item
                  name="amount"
                  rules={[
                    {
                      validator: (_rule, value) => {
                        if (value && value < 100) {
                          setHasError(true);
                          return Promise.reject();
                        } else {
                          setHasError(false);
                          return Promise.resolve();
                        }
                      },
                    },
                  ]}
                >
                  <Input
                    className="custom-amount-input"
                    autoComplete="off"
                    value={form.getFieldValue("amount")}
                    onChange={(e) => {
                      const num = e.target.value.replace(/\D/g, "");
                      const val = Math.min(Number(num), 50000);
                      form.setFieldValue("amount", val);
                      update({});
                    }}
                    onInput={(e) => {
                      const target = e.target as HTMLInputElement;
                      const num = target.value.replace(/\D/g, "");
                      const val = Math.min(Number(num), 50000);
                      form.setFieldValue("amount", val);
                      update({});
                    }}
                    onBlur={(e) => {
                      const num = e.target.value.replace(/\D/g, "");
                      const val = Math.min(Number(num), 50000);
                      form.setFieldValue("amount", val);
                      update({});
                    }}
                    style={{ color: isCustomHighlighted ? "#fff" : undefined }}
                    placeholder={t("formPlaceholders.pages.payments.recharge.customAmount")}
                  />
                </Form.Item>
                <div
                  className={`payments-modal-form-desc ${
                    hasError ? "error" : ""
                  }`}
                >
                  {t("payments.recharge.minAmount")} <AED /> 100.00
                </div>
              </Form>
            </div>
          </div>
        </div>
        <div className="card-pay">
          <div className="card-pay-title">
            <CardPay />
            {t("payments.recharge.cardPayment")}
          </div>
          <div className="card-pay-desc">
            {t("payments.recharge.cardPaymentDesc")}
          </div>
        </div>
        <div className="payments-modal-footer">
          <div className="total-amount">
            <div className="total-amount-text">
              {t("payments.recharge.totalAmount")}
            </div>
            <div className="total-amount-amount">
              <AED />{" "}
              {activeAmount === "0.00" ||
              (!hasError && !!form.getFieldValue("amount"))
                ? !form.getFieldValue("amount")
                  ? "0.00"
                  : form.getFieldValue("amount")
                : activeAmount ?? "0.00"}
            </div>
          </div>
          <div
            onClick={handleRecharge}
            className={`submit-btn ${
              (activeAmount === "0.00" && !form.getFieldValue("amount")) ||
              (activeAmount === "0.00" && hasError)
                ? "disabled"
                : ""
            }`}
          >
            <Loading loading={rechargeLoading}>
              {t("payments.recharge.continueToPayment")}
            </Loading>
          </div>
        </div>
      </Modal>
      <Modal centered
        className="recharge-successful-modal"
        maskClosable={false}
        onCancel={() => setModalVisible(false)}
        title={<div className="height-64"></div>}
        footer={false}
        visible={modalVisible}
      >
        <div className="recharge-successful-modal-content">
          <img src={success} alt="" />
          <div className="title">{t("payments.rechargeSuccessful.title")}</div>
          <div className="desc">{t("payments.rechargeSuccessful.desc")}</div>
          <div className="btn-group">
            <div onClick={() => setModalVisible(false)} className="close-btn">
              {t("payments.rechargeSuccessful.close")}
            </div>
            <div className="download-btn">
              {t("payments.rechargeSuccessful.downloadReceipt")}
            </div>
          </div>
        </div>
      </Modal>
      <Modal centered
        className="create-pin-modal"
        visible={createPinModalVisible}
        maskClosable={false}
        onCancel={() => setCreatePinModalVisible(false)}
        footer={false}
        title={
          <div className="create-pin-header">
            <div className="create-pin-title">
              {t("payments.createPin.title")}
            </div>
            <div className="create-pin-desc">
              {t("payments.createPin.desc")}
            </div>
          </div>
        }
      >
        <div className="create-pin-content">
          <div className="create-pin-item">
            <div className="create-pin-item-title">
              {t("payments.createPin.enterPIN")}
            </div>
            <div className="create-pin-input-group">
              {codeYzm.map((item, index) => {
                return (
                  <Input
                    type={eye ? "text" : "password"}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    ref={(el) => (inputsRef.current[index] = el)}
                    value={item}
                    key={index}
                    onChange={(e) => handleInputChange(e.target.value, index)}
                  />
                );
              })}
            </div>
            {isNotMatch && (
              <div className="create-pin-jinggao">
                <img src={jinggao} alt="" /> {t("payments.createPin.noMatch")}{" "}
              </div>
            )}
          </div>
          <div className="create-pin-item">
            <div className="create-pin-item-title">
              {t("payments.createPin.confirmPIN")}
            </div>
            <div className="create-pin-input-group">
              {codeYzm2.map((item, index) => {
                return (
                  <Input
                    type={eye ? "text" : "password"}
                    onKeyDown={(e) => handleKeyDown2(e, index)}
                    ref={(el) => (inputsRef2.current[index] = el)}
                    value={item}
                    key={index}
                    onChange={(e) => handleInputChange2(e.target.value, index)}
                  />
                );
              })}
            </div>
            {isNotMatch && (
              <div className="create-pin-jinggao">
                <img src={jinggao} alt="" /> {t("payments.createPin.noMatch")}{" "}
              </div>
            )}
          </div>
          <div className="eye-icon" onClick={() => setEye(!eye)}>
            {eye ? (
              <img className="pwd-eye" src={eyePng} />
            ) : (
              <img className="pwd-eye" src={hideEyePng} />
            )}
            {eye ? (
              <div className="eye-text">{t("payments.createPin.showPIN")}</div>
            ) : (
              <div className="eye-text">{t("payments.createPin.hidePIN")}</div>
            )}
          </div>
          <div className="create-pin-rule">
            <div className="warn-icon">
              <img src={yellowWarnPng} />
            </div>
            <div className="warn-content">
              <div className="warn-title">
                {t("payments.createPin.requirements")}:
              </div>
              <ul className="warn-items">
                <li>{t("payments.createPin.pinLength")}</li>
                <li>{t("payments.createPin.pinComplexity")}</li>
                <li>{t("payments.createPin.pinSecurity")}</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="create-pin-footer">
          <div className="create-pin-securely">
            <img src={shouquan} alt="" />
            {t("payments.createPin.pinSecurityDesc")}
          </div>
          <div
            className={`create-pin-btn ${isDisabled ? "disabled" : ""}`}
            onClick={handleCreatePin}
          >
            <Loading loading={activeLoading}>
              {t("payments.createPin.createPIN")}
            </Loading>
          </div>
        </div>
      </Modal>
      <ChangePin
        walletId={walletDetail?.id}
        visible={ChangePinVisible}
        onCancel={() => setChangePinVisible(false)}
      />
      <RefundModal
        record={selectedRecord}
        show={refundModalVisible}
        refresh={() => getTransactions(params)}
        close={() => {
          setRefundModalVisible(false);
          setSelectedRecord(null);
        }}
        success={addSuccess}
      />
      <ComfirmModal
        className="payments-submission-success-modal"
        title={t("payments.refundSubmittedModal.title")}
        content={t("payments.refundSubmittedModal.content")}
        expandContent={
          <div className="payments-submission-success-copy-box">
            {t("payments.refundSubmittedModal.applicationNumber")}:{" "}
            <span>{successModal.applicationNumber}</span>
            <div
              className="copy-btn"
              onClick={() => copyToClipboard(successModal.applicationNumber)}
            >
              <CopyIcon />
            </div>
          </div>
        }
        show={successModal.visible}
        comfrimHanld={() =>
          history.push("/refund/refund-detail?id=" + successModal.id)
        }
        comfrimText={t("payments.refundSubmittedModal.viewDetails")}
        cancelText={t("payments.refundSubmittedModal.close")}
        close={() =>
          setSuccessModal({ visible: false, id: null, applicationNumber: "" })
        }
      />
      {/* <div className="payments-left" ref={paymentsLeftRef}>
          <div className="title">{t("payments.myWallet.title")}</div>
          {walletDetail?.statusId === 2 && (
            <div className="wallet-card">
              <div className="title">
                {t("payments.myWallet.walletIdPrefix")}: {walletDetail?.id}
              </div>
              <div
                className="change-pin"
                onClick={() => setChangePinVisible(true)}
              >
                {t("payments.myWallet.changePin")}
              </div>
              <div className="balance">
                <div className="wallet-balance">
                  {t("payments.myWallet.walletBbalance")}
                </div>
                <div className="balance-number">
                  <AED />
                  {walletDetail?.balance ? formatMoney(walletDetail.balance) : 0}
                </div>
              </div>
              <div
                className="recharge-btn"
                onClick={() => {
                  setActiveAmount("0.00");
                  setModalOpen(true);
                }}
              >
                {t("payments.myWallet.rechargeBtn")}
              </div>
            </div>
          )}
          {walletDetail?.statusId === 1 && (
            <div className="activate-wallet">
              <div className="wallet-id">
                {t("payments.myWallet.walletIdPrefix")}: {walletDetail?.id}
              </div>
              <div className="lock-img">
                <img src={lockImg} alt="" />
              </div>
              <div className="lock-desc">{t("payments.myWallet.lockDesc")}</div>
              <div
                className="activate-btn"
                onClick={() => setCreatePinModalVisible(true)}
              >
                {t("payments.myWallet.activateBtn")}
              </div>
            </div>
          )}
          <Spin spinning={getWalletDetailLoading}>
            {getWalletDetailLoading && (
              <div className="wallet-detail-placeholder"></div>
            )}
          </Spin>
        <div className="divider-wrapper" ref={dividerRef}>
          <div className="divider"></div>
        </div>
        <div className="recent-recharges">
          <div className="title">{t("payments.recenteCharges.title")}</div>
          <Spin spinning={recentLoading}>
            <div className="list">
              {recentRecharge.length > 0 ? (
                recentRecharge.map((item) => {
                  return (
                    <div key={item.id} className="list-item">
                      <div className="icon">
                        <img src={recharges} />
                      </div>
                      <div className="content">
                        <div className="time">
                          {moment(item.createOn).format("DD/MM/YYYY HH:mm:ss")}
                        </div>
                        <div className="card">
                          {preferLocalizedEnAr(
                            i18n.language.startsWith("ar"),
                            item.transactionTypeObj?.nameEn,
                            item.transactionTypeObj?.nameAr,
                          )}
                        </div>
                      </div>
                      <div className="money">
                        +<AED />
                        {formatMoney(item.amount)}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="no-data">
                  <img src={noData} alt="" />
                  <div className="no-data-title">
                    {t("payments.noData.title")}
                  </div>
                  <div className="no-data-desc">
                    {t("payments.noData.desc")}
                  </div>
                </div>
              )}
            </div>
          </Spin>
        </div>
      </div> */}
      <div className="payments-right">
        <div className="payments-right-header">
          <div className="header-item">
            <img src={totalSpending} />
            <div className="content">
              <div className="title">{t("payments.header.totalSpending")}</div>
              <div className="pay-number">
                <AED />
                {formatMoney(sumDetial?.total)}
              </div>
            </div>
          </div>
          <div className="header-item">
            <img src={serviceApp} />
            <div className="content">
              <div className="title">
                {t("payments.header.serviceApplicationFees")}
              </div>
              <div className="pay-number">
                <AED />
                {formatMoney(sumDetial?.serviceApplicationSum)}
              </div>
            </div>
          </div>
          <div className="header-item">
            <img src={totalFinesPaid} />
            <div className="content">
              <div className="title">{t("payments.header.totalFinesPaid")}</div>
              <div className="pay-number">
                <AED />
                {formatMoney(sumDetial?.finesSum)}
              </div>
            </div>
          </div>
          <div className="header-item">
            <img src={totalRefunds} />
            <div className="content">
              <div className="title">{t("payments.header.totalRefunds")}</div>
              <div className="pay-number">
                <AED />
                {formatMoney(sumDetial?.refund)}
              </div>
            </div>
          </div>
          <div className="header-item">
            <img src={totalRecharge} />
            <div className="content">
              <div className="title">{t("payments.header.totalRecharge")}</div>
              <div className="pay-number">
                <AED />
                {formatMoney(sumDetial?.rechargeSum)}
              </div>
            </div>
          </div>
        </div>
        <div className="payments-right-content">
          <div className="title">{t("payments.body.transactionHistory")}</div>
          <div
            className={`actions${filtersOverflow ? " actions--compact" : ""}`}
            ref={filterRef}
          >
            <div className="filter">
              <Input
                value={params.TransactionNo}
                onChange={(e) => handleTransactionNoChange(e.target.value)}
                prefix={<SearchBar className="filter-search-bar" />}
                allowClear
                placeholder={t("formPlaceholders.common.search")}
              />
              {!filtersOverflow && (
                <>
                  <RangePicker
                    separator="-"
                    disabledDate={(m) => {
                      return (
                        m?.isAfter(moment()) ||
                        m?.isBefore(moment(userInfo.createOn))
                      );
                    }}
                    value={[
                      toPickerMoment(params.StartDate),
                      toPickerMoment(params.EndDate),
                    ]}
                    onChange={handleDateChange}
                    className="custorm-picker"
                    getPopupContainer={(triggerNode) => triggerNode}
                    placeholder={[
                      t("formPlaceholders.common.startTime"),
                      t("formPlaceholders.common.endTime"),
                    ]}
                  />
                  <Select
                    placeholder={t("formPlaceholders.common.allTypes")}
                    value={params.TransactionTypeId}
                    onChange={handleTypeChange}
                    className="types-selector"
                    allowClear
                    options={typeOpts}
                  />
                  <Select
                    placeholder={t("formPlaceholders.common.allStatuses")}
                    value={params.StatusId}
                    onChange={handleStatusChange}
                    className="status-selector"
                    allowClear
                    options={statusOpts}
                  />
                </>
              )}
            </div>
            {filtersOverflow && (
              <button
                className="mobile-filter-trigger"
                onClick={() => {
                  setPendingTypeId(params.TransactionTypeId ?? null);
                  setPendingStatusId(params.StatusId ?? null);
                  setMobileFilterVisible(true);
                }}
              >
                <FilterIcon />
                {(!!params.TransactionTypeId || !!params.StatusId) && (
                  <span className="mobile-filter-trigger__badge" />
                )}
              </button>
            )}
            {isMobile ? (
              <button
                className="mobile-export-trigger"
                onClick={() => handleExportData(params)}
                disabled={exportLoading}
              >
                <ExportIcon />
              </button>
            ) : (
              <CustomButton
                loading={exportLoading}
                text={t("payments.body.export")}
                onClick={() => {
                  handleExportData(params);
                }}
                variant="outline"
              />
            )}
          </div>
          <MobileFilterModal
            visible={mobileFilterVisible}
            onClose={() => setMobileFilterVisible(false)}
            onConfirm={() => {
              const newParams = {
                ...params,
                TransactionTypeId: pendingTypeId ?? 0,
                StatusId: pendingStatusId ?? 0,
                PageIndex: 1,
              };
              setParams(newParams);
              getTransactions(newParams);
              setMobileFilterVisible(false);
            }}
            sections={[
              {
                title: t("formPlaceholders.common.allTypes"),
                options: typeOpts,
                value: pendingTypeId,
                onChange: (v) => setPendingTypeId(v as number | null),
              },
              {
                title: t("formPlaceholders.common.allStatuses"),
                options: statusOpts,
                value: pendingStatusId,
                onChange: (v) => setPendingStatusId(v as number | null),
              },
            ]}
          />
          {data.length > 0 ? (
            <div className="admin-table payments-table">
              <Table
                onRow={(record) => {
                  return {
                    onClick: () => {
                      history.push(
                        `/payments/transaction-detail?transactionNo=${record.transactionNo}`,
                      );
                    },
                  };
                }}
                loading={loading}
                columns={cols}
                dataSource={data}
                pagination={false}
                scroll={{ x: 'max-content' }}
              />
              <AppPagination
                showTotal={(totalCount) => {
                  const totalPage = Math.ceil(total / params.PageSize);
                  return (
                    <div className="payments-page-total-wrapper">
                      <div className="payments-page-total">
                        {t("payments.pagination.total", { count: totalCount })}
                      </div>
                      <div>
                        {t("payments.pagination.pageOfTotal", {
                          current: params.PageIndex,
                          pages: totalPage,
                        })}
                      </div>
                    </div>
                  );
                }}
                current={params.PageIndex}
                total={total}
                showSizeChanger
                onChange={handlePageChange}
              />
            </div>
          ) : (
            <Spin spinning={loading}>
              <div className="no-data">
                <img src={noData} alt="" />
                <div className="no-data-title">
                  {t("payments.noData.title")}
                </div>
                <div className="no-data-desc">{t("payments.noData.desc2")}</div>
              </div>
            </Spin>
          )}
        </div>
      </div>
    </div>
  );
}
