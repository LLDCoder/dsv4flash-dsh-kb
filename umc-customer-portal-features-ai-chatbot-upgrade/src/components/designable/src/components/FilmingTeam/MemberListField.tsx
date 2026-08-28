import * as React from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { observer, useField, useForm, Field, FormProvider, connect, mapProps } from "@formily/react";
import { createForm } from "@formily/core";

import { FormItem, Form } from "@formily/antd";
import { Table, Button, Modal, Card, Space, Input, Pagination } from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import IDSelectorField from "../IDSelector/IDSelectorField";
import {
  restoreIcpLookupMetadata,
  stripIcpLookupMetadata,
} from "../IDSelector/idSelectorUtils";
import ConfirmModal from "../../../../../components/common/ConfirmModal";
import { getNationalityList } from "../../../../../services/userProfile";
import { getPhotographyPermitExistingMember } from "../../../../../services/services";
import { preferLocalizedEnAr } from "@/utils/bilingualDisplay";
import CustomButton from "../../../../../components/common/CustomButton";
import CustomMessage from "../../../../../components/common/CustomMessage";
import EmptyBox from "../../../../common/EmptyBox/EmptyBox";
import "./styles.less";

type MemberItem = {
  id: string;
  fullNameArabic?: string;
  fullNameEnglish?: string;
  nationality?: number;
  idNumber?: string;
  occupation?: string;
  type?: "emiratesId" | "uid" | "passport";
  emiratesId?: string;
  uid?: string;
  passportNumber?: string;
  passportType?: string;
  placeOfIssueEn?: string;
  placeOfIssueAr?: string;
  passportExpiryDate?: string;
  emirateId?: number;
  regionId?: number;
  areaId?: number;
  street?: string;
  mobileNo?: string;
  telephoneNo?: string;
  fax?: string;
  workNo?: string;
  areaCode?: string;
  emailAddress?: string;
  [key: string]: any;
};

type ViewMemberFormValues = {
  idSelector: MemberItem;
};

type ExistingMemberPageData = {
  items?: Record<string, unknown>[];
  total?: number;
};

const EXISTING_MEMBER_DUPLICATE_NOTICE_SERVICE_CODES = new Set([
  "7",
  "13",
  "14",
  "20",
]);

const normalizeIdNumber = (idNumber: unknown): string =>
  String(idNumber ?? "")
    .trim()
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase();

const getMemberIdNumbers = (member: MemberItem): string[] =>
  Array.from(
    new Set(
      [member.idNumber, member.emiratesId, member.uid, member.passportNumber]
        .map(normalizeIdNumber)
        .filter(Boolean),
    ),
  );

const hasDuplicateIdNumber = (
  membersToAdd: MemberItem[],
  existingMembers: MemberItem[],
  editingId?: string | null,
): boolean => {
  const knownIdNumbers = new Set(
    existingMembers
      .filter((member) => member.id !== editingId)
      .flatMap(getMemberIdNumbers),
  );

  return membersToAdd.some((member) => {
    const memberIdNumbers = getMemberIdNumbers(member);
    const isDuplicate = memberIdNumbers.some((idNumber) =>
      knownIdNumbers.has(idNumber),
    );

    memberIdNumbers.forEach((idNumber) => knownIdNumbers.add(idNumber));
    return isDuplicate;
  });
};

const normalizeExistingMemberType = (
  rawType: unknown,
  identifiers: Pick<MemberItem, "emiratesId" | "uid" | "passportNumber">,
): MemberItem["type"] => {
  const normalizedType = String(rawType ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

  if (
    [
      "emiratesid",
      "eid",
      "identitycard",
      "identity",
      "emirateid",
    ].includes(normalizedType)
  ) {
    return "emiratesId";
  }

  if (
    [
      "uid",
      "uaeunifiednumber",
      "unifiednumber",
      "unifiedno",
    ].includes(normalizedType)
  ) {
    return "uid";
  }

  if (
    [
      "passport",
      "passportnumber",
      "passportno",
    ].includes(normalizedType)
  ) {
    return "passport";
  }

  if (identifiers.emiratesId) {
    return "emiratesId";
  }

  if (identifiers.uid) {
    return "uid";
  }

  if (identifiers.passportNumber) {
    return "passport";
  }

  return undefined;
};

const mapExistingMember = (item: Record<string, unknown>, index: number): MemberItem => {
  const id =
    item.personId ??
    item.PersonId ??
    item.id ??
    item.Id ??
    item.memberId ??
    item.MemberId ??
    item.userProfileId ??
    item.UserProfileId ??
    item.emiratesId ??
    item.EmiratesId ??
    item.passportNumber ??
    item.PassportNumber ??
    `existing-member-${index}`;
  const emiratesId = String(item.emiratesId ?? item.EmiratesId ?? "");
  const uid = String(item.uid ?? item.UID ?? item.unifiedNo ?? item.UnifiedNo ?? "");
  const passportNumber = String(
    item.passportNumber ?? item.PassportNumber ?? item.passportNo ?? item.PassportNo ?? ""
  );
  const type = normalizeExistingMemberType(
    item.type ??
      item.Type ??
      item.identityType ??
      item.IdentityType ??
      item.idTypeCode ??
      item.IdTypeCode,
    {
      emiratesId,
      uid,
      passportNumber,
    }
  );

  return {
    ...item,
    id: String(id),
    fullNameArabic: String(
      item.nameAr ??
        item.NameAr ??
      item.fullNameArabic ??
        item.FullNameArabic ??
        item.fullNameAr ??
        item.FullNameAr ??
        item.nameAr ??
        item.NameAr ??
        ""
    ),
    fullNameEnglish: String(
      item.name ??
        item.Name ??
      item.fullNameEnglish ??
        item.FullNameEnglish ??
        item.fullNameEn ??
        item.FullNameEn ??
        item.nameEn ??
        item.NameEn ??
        ""
    ),
    nationality:
      Number(
        item.nationalityId ??
          item.NationalityId ??
        item.nationality ??
          item.Nationality ??
          undefined
      ) || undefined,
    occupation: String(item.occupation ?? item.Occupation ?? ""),
    type,
    emiratesId,
    uid,
    passportNumber,
  };
};

const MemberListFieldDom: React.FC<any> = observer((props) => {
  const { t, i18n } = useTranslation();
  const field = useField<any>();
  const form = useForm();
  const value = (Array.isArray(field.value) ? field.value : []) as MemberItem[];
  const isAr = Boolean(i18n.language?.startsWith("ar"));
  const currentLanguage = i18n.language ?? "";

  const {
    labelName,
    existingMemberButtonLabel,
    newMemberButtonLabel,
    memberLimits,
    showEmiratesId = true,
    showUID = true,
    showPassport = true,
    serviceCode: serviceCodeProp,
    disabled = false,
  } = props;
  console.log(props)
  const routeServiceCode = React.useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("serviceCode") ?? "";
  }, []);
  const serviceCode = React.useMemo(
    () => String(serviceCodeProp ?? routeServiceCode ?? "").trim(),
    [routeServiceCode, serviceCodeProp],
  );
  const localizedLabelName = labelName || labelName==='Filming Team' ? t("FilmingTeam.title") :labelName;
  const localizedExistingMemberButtonLabel =
    existingMemberButtonLabel || existingMemberButtonLabel == 'Add Existing Member' ? t("FilmingTeam.addExistingMember") :existingMemberButtonLabel;
  const localizedNewMemberButtonLabel =
    newMemberButtonLabel || newMemberButtonLabel=='Add New Member' ? t("FilmingTeam.addNewMember") :newMemberButtonLabel;
  const enablePassportExtendedFields = React.useMemo(
    () => new Set(["7", "14", "20"]).has(serviceCode),
    [serviceCode],
  );
  const useAllEmirates = enablePassportExtendedFields;

  const [newMemberModalOpen, setNewMemberModalOpen] = useState(false);
  const [existingMemberModalOpen, setExistingMemberModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [viewMemberModalOpen, setViewMemberModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formInstance, setFormInstance] = useState<any>(null);
  const [viewFormInstance, setViewFormInstance] = useState<ReturnType<
    typeof createForm<ViewMemberFormValues>
  > | null>(null);
  const [nationalityList, setNationalityList] = useState<any[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedExistingMembers, setSelectedExistingMembers] = useState<
    Record<string, MemberItem>
  >({});
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [existingMemberOptions, setExistingMemberOptions] = useState<MemberItem[]>([]);
  const [existingMemberLoading, setExistingMemberLoading] = useState(false);
  const [existingMemberTotal, setExistingMemberTotal] = useState(0);
  const [isIcpReady, setIsIcpReady] = useState(false);
  const requiredMessage = t("FilmingTeam.validation.required");
  const isReadOnly =
    disabled ||
    field.pattern === "disabled" ||
    field.pattern === "readOnly" ||
    field.pattern === "readPretty" ||
    form.pattern === "disabled" ||
    form.pattern === "readOnly" ||
    form.pattern === "readPretty";

  useEffect(() => {
    field.required = true;
    field.setValidator?.((nextValue: unknown) => {
      return Array.isArray(nextValue) && nextValue.length > 0 ? "" : requiredMessage;
    });
    field.decoratorProps = {
      ...(field.decoratorProps || {}),
      feedbackLayout: "none",
    };
  }, [currentLanguage, field, requiredMessage]);

  useEffect(() => {
    const loadNationalityList = async () => {
      try {
        const res = await getNationalityList();
        if (res.data) {
          setNationalityList(res.data);
        }
      } catch (error) {
        console.error("Failed to load nationality list:", error);
      }
    };
    loadNationalityList();
  }, []);

  useEffect(() => {
    if (!existingMemberModalOpen) {
      return;
    }

    let cancelled = false;

    const loadExistingMembers = async () => {
      setExistingMemberLoading(true);
      try {
        const res = await getPhotographyPermitExistingMember({
          pageIndex: currentPage,
          pageSize,
          searchText: searchText.trim() || undefined,
        });
        const data = res?.data as ExistingMemberPageData | Record<string, unknown>[] | undefined;
        let rows: Record<string, unknown>[] = [];
        let total = 0;

        if (Array.isArray(data)) {
          rows = data;
          total = rows.length;
        } else {
          rows = Array.isArray(data?.items) ? data.items : [];
          total = typeof data?.total === "number" ? data.total : rows.length;
        }

        if (!cancelled) {
          setExistingMemberOptions(
            rows.map((item: Record<string, unknown>, index: number) =>
              mapExistingMember(item, index)
            )
          );
          setExistingMemberTotal(total);
        }
      } catch (error) {
        if (!cancelled) {
          setExistingMemberOptions([]);
          setExistingMemberTotal(0);
        }
      } finally {
        if (!cancelled) {
          setExistingMemberLoading(false);
        }
      }
    };

    loadExistingMembers();

    return () => {
      cancelled = true;
    };
  }, [currentPage, existingMemberModalOpen, pageSize, searchText]);

  const nationalityMap = React.useMemo(() => {
    const map = new Map<number, any>();
    nationalityList.forEach((item) => map.set(item.id, item));
    return map;
  }, [nationalityList]);

  const getFullName = (member: MemberItem): string => {
    return (
      preferLocalizedEnAr(
        isAr,
        member.fullNameEnglish,
        member.fullNameArabic,
      ) || "-"
    );
  };

  const getNationalityName = (nationalityId?: number): string => {
    if (!nationalityId) return "-";
    const item = nationalityMap.get(nationalityId);
    if (!item) return "-";
    return (
      preferLocalizedEnAr(
        isAr,
        item.nameEn ?? item.fullNameEn ?? item.name,
        item.nameAr ?? item.fullNameAr,
      ) || "-"
    );
  };

  const getIdNumber = (member: MemberItem): string => {
    if (member.emiratesId) return member.emiratesId;
    if (member.uid) return member.uid;
    if (member.passportNumber) return member.passportNumber;
    return "-";
  };

  const isMaxMembersReached = memberLimits && memberLimits > 0 && value.length >= memberLimits;

  const openNewMemberModal = () => {
    const hasAtLeastOneMethod = showEmiratesId || showUID || showPassport;
    if (!hasAtLeastOneMethod) {
      Modal.warning({
        centered: true,
        title: t("FilmingTeam.validation.validationError"),
        content: t("FilmingTeam.validation.verificationMethodRequired"),
      });
      return;
    }

    setEditingId(null);
    setIsIcpReady(false);
    setNewMemberModalOpen(true);
    const form = createForm({
      initialValues: {
        idSelector: {},
      },
    });
    setFormInstance(form);
  };

  const openEditModal = (member: MemberItem) => {
    const hasAtLeastOneMethod = showEmiratesId || showUID || showPassport;
    if (!hasAtLeastOneMethod) {
      Modal.warning({
        centered: true,
        title: t("FilmingTeam.validation.validationError"),
        content: t("FilmingTeam.validation.verificationMethodRequired"),
      });
      return;
    }

    setEditingId(member.id);
    setIsIcpReady(false);
    setNewMemberModalOpen(true);
    const form = createForm({
      initialValues: {
        idSelector: restoreIcpLookupMetadata(member),
      },
    });
    setFormInstance(form);
  };

  const closeNewMemberModal = () => {
    setNewMemberModalOpen(false);
    setEditingId(null);
    setFormInstance(null);
    setIsIcpReady(false);
  };

  const openViewModal = (member: MemberItem) => {
    const form = createForm({
      pattern: "disabled",
      initialValues: {
        idSelector: { ...member },
      },
    });
    setViewFormInstance(form);
    setViewMemberModalOpen(true);
  };

  const closeViewMemberModal = () => {
    setViewMemberModalOpen(false);
    setViewFormInstance(null);
  };

  const closeExistingMemberModal = () => {
    setExistingMemberModalOpen(false);
    setSelectedRowKeys([]);
    setSelectedExistingMembers({});
    setSearchText("");
    setCurrentPage(1);
    setPageSize(10);
  };

  const handleNewMemberSave = async () => {
    if (!formInstance) return;

    try {
      await formInstance.validate();
      const formValues = formInstance.values;
      const idSelectorValue = stripIcpLookupMetadata(
        formValues.idSelector || formValues,
      );

      const newMember: MemberItem = {
        id:
          editingId ||
          `member-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        ...idSelectorValue,
      };

      if (hasDuplicateIdNumber([newMember], value, editingId)) {
        Modal.warning({
          centered: true,
          title: t("FilmingTeam.validation.validationError"),
          content: t("FilmingTeam.validation.duplicateIdNumber"),
        });
        return;
      }

      if (memberLimits && memberLimits > 0 && !editingId) {
        const currentCount = value.length;
        if (currentCount >= memberLimits) {
          Modal.warning({
            centered: true,
            title: t("FilmingTeam.validation.limitReached"),
            content: t("FilmingTeam.validation.maxMembers", {
              count: memberLimits,
            }),
          });
          return;
        }
      }

      if (editingId) {
        const next = value.map((v) => (v.id === editingId ? newMember : v));
        field.setValue(next);
      } else {
        field.setValue([...value, newMember]);
      }

      closeNewMemberModal();
    } catch (error) {
      console.error("Form validation failed:", error);
    }
  };

  const openDeleteModal = (id: string) => {
    setDeletingId(id);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setDeletingId(null);
  };

  const handleDelete = () => {
    if (deletingId) {
      const next = value.filter((v) => v.id !== deletingId);
      field.setValue(next);
    }
    closeDeleteModal();
  };

  const handleAddExistingMembers = () => {
    const selectedMembers = selectedRowKeys
      .map((key) => selectedExistingMembers[String(key)])
      .filter(Boolean);

    if (
      EXISTING_MEMBER_DUPLICATE_NOTICE_SERVICE_CODES.has(serviceCode) &&
      selectedMembers.some((member) => value.some((item) => item.id === member.id))
    ) {
      CustomMessage.warning(t("FilmingTeam.validation.duplicateExistingMember"));
      return;
    }

    const newMembers = selectedMembers.filter(
      (item) => !value.some((v) => v.id === item.id)
    );

    if (hasDuplicateIdNumber(newMembers, value)) {
      Modal.warning({
        centered: true,
        title: t("FilmingTeam.validation.validationError"),
        content: t("FilmingTeam.validation.duplicateIdNumber"),
      });
      return;
    }

    if (newMembers.length > 0) {
      field.setValue([...value, ...newMembers]);
    }
    closeExistingMemberModal();
  };

  const displayData = React.useMemo(() => {
    if (memberLimits && memberLimits > 0) {
      return value.slice(0, memberLimits);
    }
    return value;
  }, [value, memberLimits]);

  const columns = React.useMemo(
    () => [
      {
        title: t("FilmingTeam.columns.fullName"),
        dataIndex: "fullName",
        key: "fullName",
        render: (_: any, record: MemberItem) => getFullName(record),
      },
      {
        title: t("FilmingTeam.columns.nationality"),
        dataIndex: "nationality",
        key: "nationality",
        render: (_: any, record: MemberItem) =>
          getNationalityName(record.nationality),
      },
      {
        title: t("FilmingTeam.columns.idNumber"),
        dataIndex: "idNumber",
        key: "idNumber",
        render: (_: any, record: MemberItem) => getIdNumber(record),
      },
      {
        title: t("FilmingTeam.columns.occupation"),
        dataIndex: "occupation",
        key: "occupation",
        render: (occupation: string | undefined) => occupation || "-",
      },
      {
        title: t("FilmingTeam.columns.actions"),
        key: "actions",
        render: (_: any, record: MemberItem) => (
          <div className="Formliy-action">
            <Button
              type="link"
              onClick={() => openViewModal(record)}
              className="Edit"
            >
              {t("FilmingTeam.view")}
            </Button>
            {!isReadOnly && (
              <Button
                type="link"
                onClick={() => openEditModal(record)}
                className="Edit"
              >
                {t("FilmingTeam.edit")}
              </Button>
            )}
            {!isReadOnly && (
              <Button
                type="link"
                onClick={() => openDeleteModal(record.id)}
                className="Edit"
              >
                {t("FilmingTeam.delete")}
              </Button>
            )}
          </div>
        ),
      },
    ],
    [currentLanguage, getFullName, getNationalityName, isReadOnly, openEditModal, t],
  );

  const existingMemberColumns = React.useMemo(
    () => [
      {
        title: t("FilmingTeam.columns.fullName"),
        dataIndex: "fullName",
        key: "fullName",
        render: (_: any, record: MemberItem) => getFullName(record),
      },
      {
        title: t("FilmingTeam.columns.nationality"),
        dataIndex: "nationality",
        key: "nationality",
        render: (_: any, record: MemberItem) =>
          getNationalityName(record.nationality),
      },
      {
        title: t("FilmingTeam.columns.idNumber"),
        dataIndex: "idNumber",
        key: "idNumber",
        render: (_: any, record: MemberItem) => getIdNumber(record),
      },
      {
        title: t("FilmingTeam.columns.occupation"),
        dataIndex: "occupation",
        key: "occupation",
        render: (occupation: string | undefined) => occupation || "-",
      },
    ],
    [currentLanguage, getFullName, getNationalityName, t],
  );
  return (
    <div className="member-list-container">
      <Card
        className="member-list-card"
        title={
          <span>
            {localizedLabelName}
<span className="required-icon">*</span>
          </span>
        }
        extra={
          !isReadOnly ? (
            <Space>
              <Button
                // icon={<PlusOutlined />}
                onClick={() => setExistingMemberModalOpen(true)}
                disabled={isReadOnly || isMaxMembersReached}
              >
                {localizedExistingMemberButtonLabel}
              </Button>
              <Button
                type="primary"
                // icon={<PlusOutlined />}
                onClick={openNewMemberModal}
                disabled={isReadOnly || isMaxMembersReached}
              >
                {localizedNewMemberButtonLabel}
              </Button>
            </Space>
          ) : null
        }
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={displayData}
          pagination={false}
          size="middle"
          scroll={{ x: true }}
          locale={{
            emptyText: <EmptyBox title={t("common.noData")} />,
          }}
        />
      </Card>

      {!!field.selfErrors?.length && (
        <div style={{ marginTop: 6, color: "#EA4F49", fontSize: 12 }}>
          {field.selfErrors[0]}
        </div>
      )}

      <Modal centered
        title={
          editingId
            ? t("FilmingTeam.editMember")
            : localizedNewMemberButtonLabel
        }
        visible={newMemberModalOpen}
        onCancel={closeNewMemberModal}
        footer={null}
        width={900}
        destroyOnClose
      >
        {formInstance && (
          <FormProvider form={formInstance}>
            <Form
              form={formInstance}
              layout="vertical"
              className="Formily-Modal-Form"
            >
              <Field
                name="idSelector"
                component={[
                  IDSelectorField,
                  {
                    showEmiratesId,
                    showUID,
                    showPassport,
                    enablePassportExtendedFields,
                    useAllEmirates,
                    onIcpLoadedChange: setIsIcpReady,
                  },
                ]}
                decorator={[FormItem]}
              />
            </Form>
          </FormProvider>
        )}
        <div className="formily-modal-footer">
          <CustomButton variant="outline" onClick={closeNewMemberModal}>
            {t("FilmingTeam.cancel")}
          </CustomButton>
          <CustomButton onClick={handleNewMemberSave} disabled={!isIcpReady}>
            {t("FilmingTeam.confirm")}
          </CustomButton>
        </div>
      </Modal>

      <Modal centered
        title={t("FilmingTeam.viewMember")}
        visible={viewMemberModalOpen}
        onCancel={closeViewMemberModal}
        footer={null}
        width={900}
        destroyOnClose
        wrapClassName="member-list-view-modal"
      >
        {viewFormInstance && (
          <FormProvider form={viewFormInstance}>
            <Form
              form={viewFormInstance}
              layout="vertical"
              className="Formily-Modal-Form"
            >
              <Field
                name="idSelector"
                component={[
                  IDSelectorField,
                  {
                    showEmiratesId,
                    showUID,
                    showPassport,
                    enablePassportExtendedFields,
                    useAllEmirates,
                    disabled: true,
                  },
                ]}
                decorator={[FormItem]}
              />
            </Form>
          </FormProvider>
        )}
        <div className="formily-modal-footer">
          <CustomButton
            variant="outline"
            customClassName="member-list-view-close-btn"
            onClick={closeViewMemberModal}
          >
            {t("FilmingTeam.close")}
          </CustomButton>
        </div>
      </Modal>

      <Modal centered
        title={localizedExistingMemberButtonLabel}
        visible={existingMemberModalOpen}
        onCancel={closeExistingMemberModal}
        footer={null}
        width={1000}
        destroyOnClose
      >
        <div className="member-list-search-container">
          <Input
            prefix={<SearchOutlined />}
            placeholder={t("FilmingTeam.placeholder.search")}
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              setCurrentPage(1);
            }}
            style={{ marginBottom: 16 }}
          />
          <div className="member-list-selected-count">
            {selectedRowKeys.length > 0 && (
              <span>
                {t("FilmingTeam.selectedCount", {
                  count: selectedRowKeys.length,
                })}
              </span>
            )}
          </div>
          <Table
            rowKey="id"
            columns={existingMemberColumns}
            dataSource={existingMemberOptions}
            loading={existingMemberLoading}
            rowSelection={{
              selectedRowKeys,
              preserveSelectedRowKeys: true,
              onChange: (keys, rows) => {
                setSelectedRowKeys(keys);
                setSelectedExistingMembers((prev) => {
                  const next = { ...prev };
                  const currentPageIds = new Set(
                    existingMemberOptions.map((item) => item.id)
                  );

                  currentPageIds.forEach((id) => {
                    delete next[id];
                  });

                  rows.forEach((row) => {
                    next[row.id] = row;
                  });

                  return next;
                });
              },
            }}
            pagination={false}
            size="middle"
            scroll={{ x: true }}
            locale={{
              emptyText: (
                <EmptyBox title={t("FilmingTeam.empty.existingMembers")} />
              ),
            }}
          />
          <div className="member-list-pagination">
            <Pagination
              current={currentPage}
              pageSize={pageSize}
              total={existingMemberTotal}
              onChange={(page, size) => {
                setCurrentPage(page);
                setPageSize(size);
              }}
              showSizeChanger
              showTotal={(total) =>
                t("FilmingTeam.pagination.total", { total })
              }
            />
          </div>
        </div>
        <div className="formily-modal-footer">
          <CustomButton variant="outline" onClick={closeExistingMemberModal}>
            {t("FilmingTeam.cancel")}
          </CustomButton>
          <CustomButton
            onClick={handleAddExistingMembers}
            disabled={selectedRowKeys.length === 0}
          >
            {t("FilmingTeam.confirm")}
          </CustomButton>
        </div>
      </Modal>

      <ConfirmModal
        visible={deleteModalOpen}
        onCancel={closeDeleteModal}
        onConfirm={handleDelete}
        title={t("FilmingTeam.deleteRecord")}
        content={t("FilmingTeam.deleteConfirm")}
        type="danger"
      />
    </div>
  );
});

MemberListFieldDom.displayName = "MemberListFieldDom";

export const MemberListField = connect(
  MemberListFieldDom,
  mapProps((props) => {
    return props;
  })
);

MemberListField.displayName = "MemberListField";

export default MemberListField;
