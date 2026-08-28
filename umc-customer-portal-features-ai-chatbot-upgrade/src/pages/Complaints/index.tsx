import React, { useState, useEffect, useMemo, useCallback } from "react";
import AddSquareIcon from "@/assets/icons/AddSquareIcon";
import {
  createProfileNameColumn,
  CustomButton,
  CustomMessage,
} from "@/components/common";
import MobileFilterModal from "@/components/common/MobileFilterModal";
import { useHistory } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { withTablePaginationOptionText } from "@/utils/pagination";
import SearchBar from "@/assets/icons/SearchBar";
import { Table, Input, Select, DatePicker, Dropdown, Menu, Tooltip } from "antd";
import { MoreOutlined } from "@ant-design/icons";
import FilterIcon from "@/assets/icons/FilterIcon";
import useIsMobile from "@/hooks/useIsMobile";
import useFilterOverflow from "@/hooks/useFilterOverflow";
import CustomStatusTag from "@/components/common/CustomStatusTag";
import moment, { type Moment } from "moment";
import {
  getEnquiryList,
  getEnquiryTypes,
  getEnquirySources,
  putStatus,
  getStatusCount,
  type EnquiryItem,
  type EnquiryListParams,
  type EnquiryPageResponse,
  type IStatusCountResponse,
} from "@/services/complaints";
import AddModal from "./components/AddModal";
import ReopenModal from "./components/ReopenModal";
import CancelEnquiryModal from "./components/CancelEnquiryModal";
import "./index.less";
import { resolveApiEntityLabel } from "@/utils/bilingualDisplay";
import { toPickerMoment } from "@/utils/dateLocale";
import { formatDisplayDateTime } from "@/utils/date";
import { isGlobalProfileId, useUserStore } from "@/store/user";
import useKeepAliveActivated from "@/components/KeepAlive/useKeepAliveActivated";
import useKeepAliveScrollRestoration from "@/components/KeepAlive/useKeepAliveScrollRestoration";

type OptionItem = { label: string; value: number | null };
export type DisplayItem = {
  id: number;
  key: string;
  profileId?: number | string | null;
  profileName?: string | null;
  userTypeId?: number | string | null;
  userTypeName?: string | null;
  enquiryNumber: string;
  applicationNumber: string;
  serviceName: string;
  enquiryTypeName: string;
  createdOn: string;
  enquiryStatusId: number;
  reopenTimes: number;
  messageCount: number;
};
interface ParamsType {
  StartDate: string | null;
  EndDate: string | null;
  searchText: string;
  enquiryTypeId: number | null;
  pageIndex: number;
  pageSize: number;
  sortBy: string;
  sortDirection: number;
}
const { RangePicker } = DatePicker;
const CANCELLABLE_ENQUIRY_STATUS_IDS = [1, 2, 3, 4];

const renderLtrDateTime = (value?: string | null) => {
  const displayValue = value && value.trim() ? value : "-";

  return (
    <span className="complaints-ltr-datetime" dir="ltr">
      {displayValue}
    </span>
  );
};

const Complaints: React.FC = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || "en";
  const isMobile = useIsMobile();
  // min usable: search(160) + date(160) + type(140) + 2×gap(8) + add-new(140) + gap(12)
  const [filterRef, filtersOverflow] = useFilterOverflow();
  const [loading, setLoading] = useState(false);
  const [tableList, setTableList] = useState<EnquiryItem[]>([]);
  const [addModalShow, setAddModalShow] = useState(false);
  const [, setCountData] = useState<IStatusCountResponse>({
    underProcessingCount: 0,
    resolvedCount: 0,
    cancelledCount: 0,
    completedCount: 0,
  });
  const [typeOptions, setTypeOptions] = useState<OptionItem[]>([]);
  const [mobileFilterVisible, setMobileFilterVisible] = useState(false);
  const [pendingEnquiryTypeId, setPendingEnquiryTypeId] = useState<number | null>(null);
  const [pendingStartDate, setPendingStartDate] = useState<string | null>(null);
  const [pendingEndDate, setPendingEndDate] = useState<string | null>(null);
  const [queryParam, setQueryParam] = useState<ParamsType>({
    StartDate: null,
    EndDate: null,
    searchText: "",
    enquiryTypeId: null,
    pageIndex: 1,
    pageSize: 10,
    sortBy: "createdOn",
    sortDirection: 1,
  });
  const [total, setTotal] = useState(0);
  const history = useHistory();
  const currentProfileId = useUserStore((state) => state.currentProfileId);
  const showProfileNameColumn = isGlobalProfileId(currentProfileId);
  const [selectedRecord, setSelectedRecord] = useState<DisplayItem | null>(null);
  const [reopenModalVisible, setReopenModalVisible] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);

  function handleReopen(record: DisplayItem) {
    setSelectedRecord(record);
    setReopenModalVisible(true);
  }
  function handleCancel(record: DisplayItem) {
    setSelectedRecord(record);
    setCancelModalVisible(true);
  }

  const columns = useMemo(
    () => [
      {
        title: t("complaintsPage.list.columns.ticketId"),
        dataIndex: "enquiryNumber",
        key: "enquiryNumber",
        width: 208,
      },
      {
        title: t("complaintsPage.list.columns.enquiryType"),
        dataIndex: "enquiryTypeName",
        key: "enquiryTypeName",
        width: 120,
      },
      {
        title: t("complaintsPage.list.columns.applicationNo"),
        dataIndex: "applicationNo",
        key: "applicationNo",
        render(text: string) {
          return text ? text : "-";
        },
        width: 180,
      },
      {
        title: t("complaintsPage.list.columns.serviceName"),
        dataIndex: "serviceName",
        key: "serviceName",
        width: 274,
        className: "complaints-service-name-column",
        render: (text?: string | null) => {
          const displayText = text?.trim() || "-";

          return (
            <Tooltip title={displayText}>
              <div className="complaints-service-name-cell">{displayText}</div>
            </Tooltip>
          );
        },
      },
      ...(showProfileNameColumn
        ? [createProfileNameColumn<DisplayItem>(t("common.profileName"))]
        : []),
      {
        title: t("complaintsPage.list.columns.submissionTime"),
        dataIndex: "createdOn",
        key: "createdOn",
        render: (text: string) => renderLtrDateTime(text),
        width: 180,
      },
      {
        title: t("complaintsPage.list.columns.status"),
        dataIndex: "enquiryStatusId",
        key: "state",
        render: (_: unknown, record: DisplayItem) => {
          return (
            <CustomStatusTag
              type="equiry"
              status={
                [1, 2, 3, 4].includes(record.enquiryStatusId)
                  ? 0
                  : record.enquiryStatusId
              }
            />
          );
        },
        width: 140,
      },
      {
        title: t("complaintsPage.list.columns.actions"),
        fixed: "right" as const,
        width: "1%",
        className: "actions-column",
        render: (_: unknown, record: DisplayItem) => {
        const isActive = [1, 2, 3, 4].includes(record.enquiryStatusId);
        const canReopen = record.enquiryStatusId === 5 && record.reopenTimes < 3;

        if (!isActive && !canReopen) {
          return <span>-</span>;
        }

        const menuItems = [
          ...(isActive ? [
            {
              key: 'message',
              label: t('complaintsPage.list.actions.message'),
              onClick: () => history.push(`/complaints/complaints-details?id=${record.id}&scrollToMessage=1`),
            },
            {
              key: 'cancel',
              label: t('complaintsPage.list.actions.cancel'),
              onClick: () => handleCancel(record),
            },
          ] : []),
          ...(canReopen ? [{
            key: 'reopen',
            label: t('complaintsPage.list.actions.reopen'),
            onClick: () => handleReopen(record),
          }] : []),
        ];

        if (isMobile) {
          return (
            <div onClick={(e) => e.stopPropagation()}>
              <Dropdown
                overlay={<Menu items={menuItems} />}
                trigger={['click']}
                placement="bottomRight"
                overlayClassName="complaints-actions-dropdown"
              >
                <button
                  className="complaints-more-button"
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
            <div className="complaints-actions-box">
              {CANCELLABLE_ENQUIRY_STATUS_IDS.includes(
                record.enquiryStatusId,
              ) && (
                <div className="actions-message">
                  <span
                    className="complaints-table-message-btn"
                    onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                      e.stopPropagation();
                      history.push(
                        `/complaints/complaints-details?id=${record.id}&scrollToMessage=1`,
                      );
                    }}
                  >
                    {t("complaintsPage.list.actions.message")}
                  </span>
                  {record.messageCount > 0 && <div className="red-dot"></div>}
                </div>
              )}
              {CANCELLABLE_ENQUIRY_STATUS_IDS.includes(
                record.enquiryStatusId,
              ) && (
                <span
                  className="complaints-table-message-btn"
                  onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                    e.stopPropagation();
                    handleCancel(record);
                  }}
                >
                  {t("complaintsPage.list.actions.cancel")}
                </span>
              )}

              {record.enquiryStatusId === 5 && record.reopenTimes < 3 && (
                <span
                  className="complaints-table-message-btn"
                  onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                    e.stopPropagation();
                    handleReopen(record);
                  }}
                >
                  {t("complaintsPage.list.actions.reopen")}
                </span>
              )}
            </div>
          );
        },
      },
    ],
    [t, history, isMobile, showProfileNameColumn],
  );

  const displayData = useMemo<DisplayItem[]>(() => {
    return tableList.map((item) => {
      const key = item.enquiryNumber ?? `${item.serviceId}-${item.createdOn}`;
      const serviceName = item.serviceObj
        ? resolveApiEntityLabel(currentLang.startsWith("ar"), item.serviceObj) || "-"
        : "-";
      const enquiryTypeName = item.enquiryTypeObj
        ? resolveApiEntityLabel(currentLang.startsWith("ar"), item.enquiryTypeObj) ||
          "-"
        : "-";
      const createdOn = formatDisplayDateTime(item.createdOn);
      const applicationNumber = item.enquiryNumber ?? "-";
      const messageCount = item.messageCount || 0;

      return {
        id: item.id,
        key,
        profileId: item.profileId ?? null,
        profileName: item.profileName ?? null,
        userTypeId: item.userTypeId ?? null,
        userTypeName: item.userTypeName ?? null,
        enquiryNumber: item.enquiryNumber ?? "-",
        applicationNumber,
        serviceName,
        enquiryTypeName,
        createdOn,
        enquiryStatusId: item.enquiryStatusId,
        applicationNo: item.applicationNo,
        reopenTimes: item.reopenTimes,
        messageCount,
      };
    });
  }, [tableList, currentLang]);

  const tablePagination = useMemo(
    () =>
      withTablePaginationOptionText(
        {
          position: ["bottomCenter"],
          current: queryParam.pageIndex,
          pageSize: queryParam.pageSize,
          showSizeChanger: true,
          onChange: (page, pageSize) => {
            setQueryParam((prev) => ({ ...prev, pageIndex: page, pageSize }));
          },
          showTotal: (totalValue) => {
            const totalPage = Math.ceil(totalValue / queryParam.pageSize);
            return (
              <div className="payments-page-total">
                {queryParam.pageIndex}/{totalPage}
              </div>
            );
          },
          total,
        },
        i18n.language,
      ),
    [queryParam.pageIndex, queryParam.pageSize, total, i18n.language],
  );

  const getCountData = async () => {
    const res = await getStatusCount();
    if (res.data) {
      setCountData(res.data);
    }
  };

  useEffect(() => {
    getCountData();
  }, []);

  const fetchTypeOptions = useCallback(async () => {
    try {
      const response = await getEnquiryTypes();
      if (Array.isArray(response?.data)) {
        const options: OptionItem[] = response.data
          .filter((item) => item && (item.nameAr || item.nameEn))
          .map((item) => ({
            label: resolveApiEntityLabel(currentLang.startsWith("ar"), item) || "",
            value: item.id,
          }));
        setTypeOptions(options);
      }
    } catch (error) {
      console.error("Failed to fetch enquiry types:", error);
      setTypeOptions([]);
      CustomMessage.error(
        t("request.operation.failed") ?? "Failed to load enquiry types",
      );
    }
  }, [currentLang, t]);

  const fetchSourceOptions = useCallback(async () => {
    try {
      await getEnquirySources();
    } catch (error) {
      console.error("Failed to fetch enquiry sources:", error);
    }
  }, []);

  const fetchEnquiryList = useCallback(
    async (params: EnquiryListParams) => {
      setLoading(true);
      try {
        const response = await getEnquiryList(params);
        if (response && response.data) {
          const data: EnquiryPageResponse = response.data;
          const items = data.items ?? [];
          setTableList(items);
          setTotal(data.total);
          setQueryParam((prev) => {
            if (
              data.pageIndex === prev.pageIndex &&
              data.pageSize === prev.pageSize
            ) {
              return prev;
            }
            return {
              ...prev,
              pageIndex: data.pageIndex,
              pageSize: data.pageSize,
            };
          });
        }
      } catch (error) {
        console.error("Failed to fetch enquiry list:", error);
        CustomMessage.error(
          t("request.operation.failed") ?? "Failed to load enquiries",
        );
      } finally {
        setLoading(false);
      }
    },
    [
      queryParam.EndDate,
      queryParam.StartDate,
      queryParam.enquiryTypeId,
      queryParam.pageIndex,
      queryParam.pageSize,
      queryParam.searchText,
      t,
    ],
  );

  useEffect(() => {
    fetchTypeOptions();
    fetchSourceOptions();
  }, [fetchSourceOptions, fetchTypeOptions]);
  function toEnquiryListParams(params: ParamsType) {
    return {
      EnquiryNumber: params.searchText || undefined,
      StartTime: params.StartDate ?? undefined,
      EndTime: params.EndDate ?? undefined,
      EnquiryType: params.enquiryTypeId ?? undefined,
      PageIndex: params.pageIndex,
      PageSize: params.pageSize,
      SortBy: params.sortBy,
      SortDirection: params.sortDirection,
    };
  }
  useEffect(() => {
    const params: EnquiryListParams = toEnquiryListParams(queryParam);
    fetchEnquiryList(params);
  }, [fetchEnquiryList]);

  useKeepAliveActivated({
    onActivated: ({ fromPath }) => {
      if (fromPath !== "/complaints/complaints-details") {
        return;
      }

      void fetchEnquiryList(toEnquiryListParams(queryParam));
      void getCountData();
    },
    onDeactivated: () => {
      setAddModalShow(false);
      setMobileFilterVisible(false);
      setPendingEnquiryTypeId(null);
      setPendingStartDate(null);
      setPendingEndDate(null);
      setReopenModalVisible(false);
      setCancelModalVisible(false);
      setSelectedRecord(null);
    },
  });

  useKeepAliveScrollRestoration();

  const handleRangeChange = (dates: [Moment | null, Moment | null] | null) => {
    setQueryParam((prev) => ({
      ...prev,
      StartDate: dates?.[0] ? moment(dates[0]).format("YYYY-MM-DD") : null,
      EndDate: dates?.[1] ? moment(dates[1]).format("YYYY-MM-DD") : null,
      pageIndex: 1,
    }));
  };

  const handleTypeChange = (value: number | null) => {
    setQueryParam((prev) => ({
      ...prev,
      enquiryTypeId: value ?? null,
      pageIndex: 1,
    }));
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setQueryParam((prev) => ({ ...prev, searchText: value, pageIndex: 1 }));
  };

  const handleOpenAddModal = () => {
    setAddModalShow(true);
    void fetchTypeOptions();
  };

  return (
    <div className="complaints-container">
      {/* main body */}
      <div className="page-body">
        <div
          className={`query-box${filtersOverflow ? " query-box--compact" : ""}`}
          ref={filterRef}
        >
          <div className="flex-box">
            <Input
              className="query-input"
              value={queryParam.searchText}
              prefix={<SearchBar className="filter-search-bar" />}
              allowClear
              placeholder={t("formPlaceholders.common.search")}
              onChange={handleSearchChange}
            />
            {!filtersOverflow && (
              <RangePicker
                value={[
                  toPickerMoment(queryParam.StartDate),
                  toPickerMoment(queryParam.EndDate),
                ]}
                className="custorm-picker"
                getPopupContainer={(triggerNode) => triggerNode}
                placeholder={[
                  t("formPlaceholders.common.startTime"),
                  t("formPlaceholders.common.endTime"),
                ]}
                onChange={handleRangeChange}
                separator="-"
              />
            )}
            {!filtersOverflow && (
              <Select
                className="custom-select"
                value={queryParam.enquiryTypeId}
                options={typeOptions}
                allowClear
                placeholder={t(
                  "formPlaceholders.pages.complaints.list.enquiryTypes",
                )}
                onChange={handleTypeChange}
              />
            )}
            {filtersOverflow && (
              <button
                className="mobile-filter-trigger"
                onClick={() => {
                  setPendingEnquiryTypeId(queryParam.enquiryTypeId);
                  setPendingStartDate(queryParam.StartDate);
                  setPendingEndDate(queryParam.EndDate);
                  setMobileFilterVisible(true);
                }}
              >
                <FilterIcon />
                {(!!queryParam.enquiryTypeId || !!queryParam.StartDate || !!queryParam.EndDate) && (
                  <span className="mobile-filter-trigger__badge" />
                )}
              </button>
            )}
            {filtersOverflow && (
              <button
                className="mobile-export-trigger"
                onClick={handleOpenAddModal}
              >
                <AddSquareIcon />
              </button>
            )}
          </div>
          <MobileFilterModal
            visible={mobileFilterVisible}
            onClose={() => setMobileFilterVisible(false)}
            onConfirm={() => {
              setQueryParam((prev) => ({
                ...prev,
                enquiryTypeId: pendingEnquiryTypeId,
                StartDate: pendingStartDate,
                EndDate: pendingEndDate,
                pageIndex: 1,
              }));
              setMobileFilterVisible(false);
            }}
            extra={
              <RangePicker
                value={[
                  toPickerMoment(pendingStartDate),
                  toPickerMoment(pendingEndDate),
                ]}
                placeholder={[t("formPlaceholders.common.startTime"), t("formPlaceholders.common.endTime")]}
                onChange={(dates) => {
                  setPendingStartDate(dates?.[0] ? moment(dates[0]).format("YYYY-MM-DD") : null);
                  setPendingEndDate(dates?.[1] ? moment(dates[1]).format("YYYY-MM-DD") : null);
                }}
                separator="-"
                style={{ width: "100%" }}
              />
            }
            sections={[
              {
                title: t("formPlaceholders.pages.complaints.list.enquiryTypes"),
                options: typeOptions,
                value: pendingEnquiryTypeId,
                onChange: (v) => setPendingEnquiryTypeId(v as number | null),
              },
            ]}
          />
          {!filtersOverflow && (
            <CustomButton
              text={t("complaintsPage.list.addNew")}
              variant="primary"
              onClick={handleOpenAddModal}
            />
          )}
          <AddModal
            visible={addModalShow}
            enquiryTypes={typeOptions}
            onSubmit={() => {
              fetchEnquiryList({
                ...toEnquiryListParams(queryParam),
                PageIndex: 1,
              });
              getCountData();
            }}
            onCancel={() => {
              setAddModalShow(false);
            }}
          />
        </div>
        {/* <div className="data_line">
              <div className="data_item completed">
                <span>Completed</span>
                <span>{countData.completedCount}</span>
              </div>
              <div className="data_item processing">
                <span>Under Processing</span>
                <span>{countData.underProcessingCount}</span>
              </div>
              <div className="data_item rsolved">
                <span>Resolved</span>
                <span>{countData.resolvedCount}</span>
              </div>
              <div className="data_item cancelled">
                <span>Cancelled</span>
                <span>{countData.cancelledCount}</span>
              </div>
            </div> */}
        <Table
          className="admin-table"
          tableLayout="fixed"
          scroll={{ x: "max-content" }}
          onRow={(record) => ({
            onClick: () => {
              if (record.id !== undefined && record.id !== null) {
                history.push(`/complaints/complaints-details?id=${record.id}`);
              }
            },
          })}
          dataSource={displayData}
          columns={columns}
          loading={loading}
          pagination={tablePagination}
        />
        <CancelEnquiryModal
          onCancel={() => {
            setCancelModalVisible(false);
            setSelectedRecord(null);
          }}
          onConfirm={async () => {
            if (selectedRecord) {
              try {
                await putStatus({
                  enquiryId: selectedRecord.id,
                  enquiryStatusId: 7,
                });
                CustomMessage.success(t("common.operationSuccess"));
                setCancelModalVisible(false);
                setSelectedRecord(null);
                fetchEnquiryList(toEnquiryListParams(queryParam));
                getCountData();
              } catch (error) {
                const statusCode =
                  (error as { statusCode?: number }).statusCode ??
                  (error as { response?: { data?: { statusCode?: number } } })
                    .response?.data?.statusCode;

                if (statusCode === 4205) {
                  setCancelModalVisible(false);
                  setSelectedRecord(null);
                  fetchEnquiryList(toEnquiryListParams(queryParam));
                  return;
                }

                throw error;
              }
            }
          }}
          visible={cancelModalVisible}
          title={t("complaintsPage.cancelModal.title")}
          content={t("complaintsPage.cancelModal.content")}
        />
        <ReopenModal
          visible={reopenModalVisible}
          record={selectedRecord}
          onCancel={() => {
            setReopenModalVisible(false);
            setSelectedRecord(null);
            fetchEnquiryList(toEnquiryListParams(queryParam));
            getCountData();
          }}
        />
      </div>
    </div>
  );
};

export default Complaints;
