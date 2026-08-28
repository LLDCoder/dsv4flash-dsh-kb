import React, { useCallback, useEffect, useState } from "react";
import AddSquareIcon from "@/assets/icons/AddSquareIcon";
import {
  createProfileNameColumn,
  CustomButton,
  CustomMessage,
  TablePanel,
} from "@/components/common";
import EmptyBox from "@/components/common/EmptyBox/EmptyBox";
import MobileFilterModal from "@/components/common/MobileFilterModal";
import { useHistory } from "react-router-dom";
import { Dropdown, Input, Menu, Select } from "antd";
import { MoreOutlined } from '@ant-design/icons';
import FilterIcon from '@/assets/icons/FilterIcon';
import useIsMobile from "@/hooks/useIsMobile";
import useFilterOverflow from "@/hooks/useFilterOverflow";
import type { TableProps } from "antd/es/table";
import {
  queryApplications,
  queryStatus,
  queryCategorys,
  refundEdit,
  enquiryApplication,
  type ApplicationParamsType,
  type ValueObj,
  type RefundApplicationListItem,
} from "@/services/refund";
import CustomStatusTag from "@/components/common/CustomStatusTag";
import ComfirmModal from "@/components/common/ComfirmModal";
import AddModal from "./components/AddModal";
import SearchIcon from "@/assets/icons/SearchIcon";
import AED from "@/assets/icons/Aed";
import CopyIcon from "@/assets/icons/Copy.tsx";
import { copyToClipboard } from "@/utils/copy";
import formatMoney from "@/utils/formatMoney";
import { preferLocalizedEnAr } from "@/utils/bilingualDisplay";
import { resolveRefundStatus } from "@/utils/refundStatus";
import "./index.less";
import moment from "moment";
import { useTranslation } from "react-i18next";
import { isGlobalProfileId, useUserStore } from "@/store/user";
import useKeepAliveActivated from "@/components/KeepAlive/useKeepAliveActivated";
import useKeepAliveScrollRestoration from "@/components/KeepAlive/useKeepAliveScrollRestoration";

const Refund: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isMobile = useIsMobile();
  const currentProfileId = useUserStore((state) => state.currentProfileId);
  const showProfileNameColumn = isGlobalProfileId(currentProfileId);
  const [filterRef, filtersOverflow] = useFilterOverflow();
  const CANCELLED_STATUS_ID = 7;
  const [cancelModalData, setCancelModalData] = useState<{
    id: number | null;
    visible: boolean;
  }>({
    visible: false,
    id: null,
  });
  const [addModalShow, setAddModalShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tableList, setTableList] = useState<RefundApplicationListItem[]>([]);
  const [categoryList, setCategoryList] = useState<ValueObj[]>([]);
  const [successModal, setSuccessModal] = useState<{
    visible: boolean;
    id: number | null;
    applicationNumber: string;
  }>({
    visible: false,
    id: null,
    applicationNumber: "",
  });
  const [statusList, setStatusList] = useState<ValueObj[]>([]);
  const [mobileFilterVisible, setMobileFilterVisible] = useState(false);
  const [pendingCategoryId, setPendingCategoryId] = useState<number | null>(null);
  const [pendingStatusId, setPendingStatusId] = useState<number | null>(null);
  const [queryParam, setQueryParam] = useState<ApplicationParamsType>({
    applicationNumber: "",
    categoryId: null,
    statusId: null,
    pageSize: 10,
    pageIndex: 1,
    sortDirection: 0,
    sortBy: "statusId",
  });
  const [total, setTotal] = useState(0);
  const history = useHistory();

  const getRefundList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await queryApplications(queryParam);
      setTableList(res.data.items);
      setTotal(res.data.total);
    } catch (error) {
      console.error("Failed to load refund list:", error);
      CustomMessage.error(t("refundPage.messages.loadListFailed"));
    } finally {
      setLoading(false);
    }
  }, [queryParam, t]);

  const getAllCategories = useCallback(async () => {
    try {
      const res = await queryCategorys();
      setCategoryList(res.data);
    } catch (error) {
      console.error("Failed to load refund categories:", error);
    }
  }, []);

  const getAllStatuses = useCallback(async () => {
    try {
      const res = await queryStatus();
      setStatusList(res.data);
    } catch (error) {
      console.error("Failed to load refund statuses:", error);
    }
  }, []);

  useEffect(() => {
    getAllCategories();
    getAllStatuses();
  }, [getAllCategories, getAllStatuses]);

  useEffect(() => {
    getRefundList();
  }, [getRefundList]);

  useKeepAliveActivated({
    onActivated: ({ fromPath }) => {
      if (fromPath === "/refund/refund-detail") {
        void getRefundList();
      }
    },
    onDeactivated: () => {
      setAddModalShow(false);
      setCancelModalData({ visible: false, id: null });
      setSuccessModal({ visible: false, id: null, applicationNumber: "" });
      setMobileFilterVisible(false);
      setPendingCategoryId(null);
      setPendingStatusId(null);
    },
  });

  useKeepAliveScrollRestoration();

  const isAr = i18n.language.startsWith("ar");

  const categorySelectOptions = categoryList.map((c) => ({
    label: preferLocalizedEnAr(isAr, c.nameEn, c.nameAr),
    value: c.id,
  }));

  const statusSelectOptions = statusList.map((s) => ({
    label: preferLocalizedEnAr(isAr, s.nameEn, s.nameAr),
    value: s.id,
  }));

  const columns: NonNullable<
    TableProps<RefundApplicationListItem>["columns"]
  > = [
    {
      title: t("refundPage.table.applicationNo"),
      dataIndex: "applicationNumber",
      key: "applicationNumber",
    },
    {
      title: t("refundPage.table.refundCategory"),
      dataIndex: "categoryId",
      key: "categoryId",
      render: (row: number) => {
        return row === 1
          ? t("refundPage.category.fineRefund")
          : t("refundPage.category.applicationRefund");
      },
    },
    {
      title: t("refundPage.table.referenceNo"),
      dataIndex: "referenceNumber",
      key: "referenceNumber",
      render: (text: string) => {
        return (
          <div
            onClick={async (e) => {
              e.stopPropagation();
              const data = await enquiryApplication(text);
              if (!data.data?.applicaitonId) return;
              history.push(`/my-requests/detail?id=${data.data.applicaitonId}`);
            }}
            className="text-btn"
          >
            {text}
          </div>
        );
      },
    },
    {
      title: t("refundPage.table.refundReason"),
      key: "reasonObj",
      dataIndex: "reasonObj",
      render: (text: { id: number; nameEn: string; nameAr?: string } | undefined) => {
        return (
          text && (
            <span>
              {preferLocalizedEnAr(isAr, text.nameEn, text.nameAr) || "-"}
            </span>
          )
        );
      },
    },
    ...(showProfileNameColumn
      ? [
          createProfileNameColumn<RefundApplicationListItem>(
            t("common.profileName"),
          ),
        ]
      : []),
    {
      title: (
        <div style={{ display: "flex", alignItems: "center" }}>
          {t("refundPage.table.refundAmount")}(
          <AED />)
        </div>
      ),
      dataIndex: "amount",
      key: "amount",
      render: (value: RefundApplicationListItem["amount"] | null | undefined) => {
        if (value === null || value === undefined || value === "") {
          return "-";
        }

        return formatMoney(value);
      },
    },
    {
      title: t("refundPage.table.requestTime"),
      dataIndex: "createdOn",
      key: "createdOn",
      sorter: true,
      render: (text: string) => {
        return moment(text).format("DD/MM/YYYY HH:mm:ss");
      },
    },
    {
      title: t("refundPage.table.refundStatus"),
      dataIndex: "statusId",
      key: "statusId",
      render: (text: number) => {
        if (!text) {
          return "-";
        }

        const normalizedStatus = resolveRefundStatus({ statusId: text });
        return <CustomStatusTag status={normalizedStatus.label} />;
      },
    },
    {
      title: t("refundPage.table.actions"),
      fixed: "right" as const,
      width: "1%",
      className: "actions-column",
      render: (_: unknown, record: { id: number; statusId: number }) => {
        const normalizedStatus = resolveRefundStatus({
          statusId: record.statusId,
        });
        const canCancel = normalizedStatus.key === "under_review";

        if (!canCancel) {
          return <span>-</span>;
        }

        if (isMobile) {
          return (
            <div onClick={(e) => e.stopPropagation()}>
              <Dropdown
                overlay={<Menu items={[{
                  key: 'cancel',
                  label: t("refundPage.table.cancel"),
                  onClick: () => setCancelModalData({ id: record.id, visible: true }),
                }]} />}
                trigger={['click']}
                placement="bottomRight"
                overlayClassName="refund-actions-dropdown"
              >
                <button
                  className="refund-more-button"
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
          <div className="text-btn" onClick={(e) => openCancelModal(e, record)}>
            {t("refundPage.table.cancel")}
          </div>
        );
      },
    },
  ];
  const openCancelModal = (e: React.MouseEvent, row: { id: number }) => {
    e.stopPropagation();
    setCancelModalData({ id: row.id, visible: true });
  };
  const categoryChange = (value?: number) => {
    setQueryParam((prevQueryParam) => ({
      ...prevQueryParam,
      pageIndex: 1,
      categoryId: value ?? null,
    }));
  };
  const handleSearch = (val: string) => {
    setQueryParam((prevQueryParam) => ({
      ...prevQueryParam,
      pageIndex: 1,
      applicationNumber: val,
    }));
  };
  const statusChange = (value?: number) => {
    setQueryParam((prevQueryParam) => ({
      ...prevQueryParam,
      pageIndex: 1,
      statusId: value ?? null,
    }));
  };
  const addSuccess = (id: number, applicationNumber: string) => {
    setSuccessModal({ visible: true, id, applicationNumber });
  };
  const cancelRefund = () => {
    if (cancelModalData.id) {
      refundEdit(cancelModalData.id, { statusId: CANCELLED_STATUS_ID }).then(() => {
        setCancelModalData({ id: null, visible: false });
        CustomMessage.success(t("refundPage.messages.cancelSuccess"));
        getRefundList();
      });
    }
  };

  const handleTableChange: NonNullable<
    TableProps<RefundApplicationListItem>["onChange"]
  > = (pagination, _filters, sorter) => {
    const currentSorter = Array.isArray(sorter) ? sorter[0] : sorter;
    const sortDirection = currentSorter?.order === "descend" ? 1 : 0;
    const sortBy = currentSorter?.order ? "createdOn" : "statusId";

    setQueryParam((prevQueryParam) => ({
      ...prevQueryParam,
      pageIndex: pagination.current ?? prevQueryParam.pageIndex,
      pageSize: pagination.pageSize ?? prevQueryParam.pageSize,
      sortDirection,
      sortBy,
    }));
  };

  const emptyState = (
    <div className="refund-container__empty-state">
      <EmptyBox
        customClassName="refund-container__empty-box"
        title={t("refundPage.list.noData")}
      />
    </div>
  );

  return (
    <div className="refund-container">
      {/* main body */}
      <div className="page-body">
        <div
          className={`query-box${filtersOverflow ? " query-box--compact" : ""}`}
          ref={filterRef}
        >
          <div className="flex-box">
            <Input
              className="mr-16"
              style={{ width: 360 }}
              allowClear
              size="large"
              placeholder={t("formPlaceholders.common.search")}
              prefix={<SearchIcon />}
              value={queryParam.applicationNumber}
              onChange={(e) => handleSearch(e.target.value)}
            />
            {!filtersOverflow && (
              <>
                <Select
                  className="mr-16"
                  style={{ width: 240 }}
                  defaultValue={null}
                  placeholder={t("formPlaceholders.pages.refund.list.categories")}
                  allowClear
                  options={categorySelectOptions}
                  onChange={(value: number) => categoryChange(value)}
                />
                <Select
                  style={{ width: 240 }}
                  defaultValue={null}
                  placeholder={t("formPlaceholders.pages.refund.list.status")}
                  allowClear
                  options={statusSelectOptions}
                  onChange={(value: number) => statusChange(value)}
                />
              </>
            )}
            {filtersOverflow && (
              <button
                className="mobile-filter-trigger"
                onClick={() => {
                  setPendingCategoryId(queryParam.categoryId);
                  setPendingStatusId(queryParam.statusId);
                  setMobileFilterVisible(true);
                }}
              >
                <FilterIcon />
                {(!!queryParam.categoryId || !!queryParam.statusId) && (
                  <span className="mobile-filter-trigger__badge" />
                )}
              </button>
            )}
          </div>
          {filtersOverflow ? (
            <button
              className="mobile-export-trigger"
              onClick={() => setAddModalShow(true)}
            >
              <AddSquareIcon />
            </button>
          ) : (
            <CustomButton
              text={t("refundPage.list.addRefundRequest")}
              variant="primary"
              onClick={() => setAddModalShow(true)}
            />
          )}
        </div>
        <MobileFilterModal
          visible={mobileFilterVisible}
          onClose={() => setMobileFilterVisible(false)}
          onConfirm={() => {
            setQueryParam((prev) => ({ ...prev, categoryId: pendingCategoryId, statusId: pendingStatusId, pageIndex: 1 }));
            setMobileFilterVisible(false);
          }}
          sections={[
            {
              title: t("formPlaceholders.pages.refund.list.categories"),
              options: categorySelectOptions,
              value: pendingCategoryId,
              onChange: (v) => setPendingCategoryId(v as number | null),
            },
            {
              title: t("formPlaceholders.pages.refund.list.status"),
              options: statusSelectOptions,
              value: pendingStatusId,
              onChange: (v) => setPendingStatusId(v as number | null),
            },
          ]}
        />
        <TablePanel<RefundApplicationListItem>
          className="refund-container__table-panel"
          tableProps={{
            dataSource: tableList,
            showHeader: tableList.length > 0,
            columns: columns,
            loading: loading,
            onChange: handleTableChange,
            locale: { emptyText: emptyState },
            scroll: { x: 'max-content' },
            pagination: {
              position: ["bottomCenter"],
              current: queryParam.pageIndex,
              pageSize: queryParam.pageSize,
              showSizeChanger: true,
              showTotal: (total) => {
                const totalPage = Math.ceil(
                  total / (queryParam.pageSize || 10),
                );
                return (
                  <div className="payments-page-total-wrapper">
                    <div className="payments-page-total">
                      {t("refundPage.pagination.total", { count: total })}
                    </div>
                    <div>
                      {t("refundPage.pagination.pageOfTotal", {
                        current: queryParam.pageIndex,
                        pages: totalPage,
                      })}
                    </div>
                  </div>
                );
              },
              total: total,
            },
            onRow: (row) => ({
              onClick: () => {
                history.push("/refund/refund-detail?id=" + row.id);
              },
            }),
          }}
        />
      </div>
      {/* add refun request */}
      <AddModal
        show={addModalShow}
        close={() => setAddModalShow(false)}
        refresh={() => {
          getRefundList();
        }}
        success={addSuccess}
        record={null}
      />
      {/* success modal */}
      <ComfirmModal
        title={t("refundPage.successModal.title")}
        content={t("refundPage.successModal.content")}
        expandContent={
          <div className="copy-box">
            {t("refundPage.successModal.applicationNumber")}:{" "}
            <span>{successModal.applicationNumber}</span>
            <div
              className="copy-btn"
              onClick={() => copyToClipboard(String(successModal.applicationNumber ?? ""))}
            >
              <CopyIcon />
            </div>
          </div>
        }
        show={successModal.visible}
        comfrimHanld={() =>
          history.push("/refund/refund-detail?id=" + successModal.id)
        }
        comfrimText={t("refundPage.successModal.viewDetails")}
        cancelText={t("refundPage.successModal.close")}
        close={() =>
          setSuccessModal({ visible: false, id: null, applicationNumber: "" })
        }
      />
      {/* cancel request modal */}
      <ComfirmModal
        title={t("refundPage.cancelModal.title")}
        type="warning"
        content={t("refundPage.cancelModal.content")}
        show={cancelModalData.visible}
        comfrimHanld={cancelRefund}
        close={() => setCancelModalData({ visible: false, id: null })}
      />
    </div>
  );
};

export default Refund;
