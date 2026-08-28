import * as React from "react";
import { useEffect, useState } from "react";
import {
  observer,
  useField,
  useForm,
  Field,
  FormProvider,
  connect,
  mapProps,
} from "@formily/react";
import { createForm } from "@formily/core";
import { FormItem, Form } from "@formily/antd";
import { Table, Modal, Card, Space } from "antd";
import IDSelectorField from "../IDSelector/IDSelectorField";
import {
  getAvailableOptions,
  getIdSelectorValidatorRules,
  restoreIcpLookupMetadata,
  resolveCurrentType,
  stripIcpLookupMetadata,
  type IDSelectorValue,
} from "../IDSelector/idSelectorUtils";
import { getNationalityList } from "../../../../../services/userProfile";
import { ConfirmModal } from "../../../../common";
import CustomButton from "../../../../common/CustomButton";
import EmptyBox from "../../../../common/EmptyBox/EmptyBox";
import { preferLocalizedEnAr } from "@/utils/bilingualDisplay";
import { useTranslation } from "react-i18next";

import "./styles.less";
import { reaction } from "@formily/reactive";

type PersonsInChargeModalMode = "add" | "edit" | "view";

type PersonItem = {
  id: string;
  fullNameArabic?: string;
  fullNameEnglish?: string;
  nationality?: number | string;
  idNumber?: string;
  occupation?: string;
  [key: string]: any;
};

const getPersonFormDebugState = (
  formValues: Record<string, any> | undefined,
  options: ReturnType<typeof getAvailableOptions>,
  includeDetails: boolean,
) => {
  const idSelectorValue = (formValues?.idSelector || {}) as IDSelectorValue;
  const type = resolveCurrentType(idSelectorValue, options);
  const rules = getIdSelectorValidatorRules(type, includeDetails);
  const fieldErrors = Object.entries(rules).reduce<Record<string, string>>(
    (acc, [fieldName, validator]) => {
      const message = validator?.(
        idSelectorValue[fieldName as keyof IDSelectorValue],
      );
      if (message) {
        acc[fieldName] = message;
      }
      return acc;
    },
    {},
  );

  return {
    type,
    includeDetails,
    idSelectorValue,
    fieldErrors,
    isComplete: Object.keys(fieldErrors).length === 0,
  };
};

const PersonsInChargeListFieldDom: React.FC<any> = observer((props) => {
  const { t, i18n } = useTranslation();
  const isAr = Boolean(i18n.language?.startsWith("ar"));
  const field = useField<any>();
  const form = useForm();
  const value = (Array.isArray(field.value) ? field.value : []) as PersonItem[];
  const isReviewMode = field.pattern === "readPretty";
  const isFormLocked =
    form.pattern === "disabled" ||
    form.pattern === "readOnly" ||
    form.pattern === "readPretty";
  const isReadOnlyMode =
    !!props.disabled ||
    field.pattern === "disabled" ||
    field.pattern === "readOnly" ||
    isReviewMode ||
    isFormLocked;

  const {
    title,
    addButtonLabel,
    maxMembers,
    showEmiratesId = true,
    showUID = false,
    showPassport = false,
    className,
    ...restProps
  } = props;

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<PersonsInChargeModalMode>("add");
  const [formInstance, setFormInstance] = useState<any>(null);
  const [nationalityList, setNationalityList] = useState<any[]>([]);
  const [deleteModal, setDeleteModal] = useState<{
    visible: boolean;
    id: string | null;
  }>({
    visible: false,
    id: null,
  });
  const [isFormValid, setIsFormValid] = useState(false);
  const [isIcpReady, setIsIcpReady] = useState(false);

  const idSelectorOptions = React.useMemo(
    () => getAvailableOptions({ showEmiratesId, showUID, showPassport }),
    [showEmiratesId, showPassport, showUID],
  );

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

  const nationalityMap = React.useMemo(() => {
    const map = new Map<number, any>();
    nationalityList.forEach((item) => map.set(item.id, item));
    return map;
  }, [nationalityList]);

  const syncConfirmState = React.useCallback(
    (
      nextFormValues: Record<string, any> | undefined,
      nextIcpReady = isIcpReady,
    ) => {
      const debugState = getPersonFormDebugState(
        nextFormValues,
        idSelectorOptions,
        nextIcpReady,
      );

      console.log("[PersonsInChargeListField] confirm debug", {
        modalMode,
        editingId,
        isIcpReady: nextIcpReady,
        isFormValid: debugState.isComplete,
        disabledReason: {
          isFormValid: !debugState.isComplete,
          isIcpReady: !nextIcpReady,
        },
        currentType: debugState.type,
        includeDetails: debugState.includeDetails,
        missingOrInvalidFields: debugState.fieldErrors,
        formValues: nextFormValues,
      });

      setIsFormValid(debugState.isComplete);
    },
    [editingId, idSelectorOptions, isIcpReady, modalMode],
  );

  const getFullName = (person: PersonItem): string => {
    if (isAr && person.fullNameArabic) return person.fullNameArabic;
    if (person.fullNameEnglish) return person.fullNameEnglish;
    if (person.fullNameArabic) return person.fullNameArabic;
    return "-";
  };

  const getNationalityName = (nationalityId?: number | string): string => {
    if (!nationalityId) return "-";
    const nationality = nationalityMap.get(Number(nationalityId));
    return (
      preferLocalizedEnAr(isAr, nationality?.nameEn, nationality?.nameAr) || "-"
    );
  };

  const getIdNumber = (person: PersonItem): string => {
    if (person.emiratesId) return person.emiratesId;
    if (person.uid) return person.uid;
    if (person.passportNumber) return person.passportNumber;
    return "-";
  };

  const openModal = () => {
    const hasAtLeastOneMethod = showEmiratesId || showUID || showPassport;
    if (!hasAtLeastOneMethod) {
      Modal.warning({
        centered: true,
        title: t("PersonsInChargeList.validation.title"),
        content: t("PersonsInChargeList.validation.verificationMethod"),
      });
      return;
    }

    field.setFeedback({ type: "error", messages: [] });
    setEditingId(null);
    setModalMode("add");
    setModalOpen(true);
    setIsFormValid(false);
    setIsIcpReady(false);
    const form = createForm({
      initialValues: {
        idSelector: {},
      },
    });
    setFormInstance(form);
  };

  const openEditModal = (person: PersonItem) => {
    const hasAtLeastOneMethod = showEmiratesId || showUID || showPassport;
    if (!hasAtLeastOneMethod) {
      Modal.warning({
        centered: true,
        title: t("PersonsInChargeList.validation.title"),
        content: t("PersonsInChargeList.validation.verificationMethod"),
      });
      return;
    }

    setEditingId(person.id);
    setModalMode("edit");
    setModalOpen(true);
    setIsFormValid(false);
    setIsIcpReady(false);
    const form = createForm({
      initialValues: {
        idSelector: restoreIcpLookupMetadata(person),
      },
    });
    setFormInstance(form);
  };

  const openViewModal = (person: PersonItem) => {
    setEditingId(person.id);
    setModalMode("view");
    setModalOpen(true);
    setIsFormValid(true);
    setIsIcpReady(true);
    const form = createForm({
      initialValues: {
        idSelector: person,
      },
    });
    setFormInstance(form);
  };

  // Track whether Save can be enabled without showing validation errors on open.
  useEffect(() => {
    if (!formInstance) return;

    const syncFormValid = () => {
      syncConfirmState(formInstance.values);
    };

    syncFormValid();

    const dispose = reaction(
      () => JSON.stringify(formInstance.values),
      syncFormValid,
    );

    return () => dispose();
  }, [formInstance, syncConfirmState]);

  const handleIcpLoadedChange = React.useCallback(
    (loaded: boolean) => {
      console.log("[PersonsInChargeListField] onIcpLoadedChange", {
        loaded,
        modalMode,
        editingId,
      });
      setIsIcpReady(loaded);
      syncConfirmState(formInstance?.values, loaded);
    },
    [editingId, formInstance, modalMode, syncConfirmState],
  );

  const handleIdSelectorValueChange = React.useCallback(
    (nextValue: IDSelectorValue) => {
      const nextFormValues = {
        ...(formInstance?.values || {}),
        idSelector: nextValue,
      };
      syncConfirmState(nextFormValues);
    },
    [formInstance, syncConfirmState],
  );

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setModalMode("add");
    setFormInstance(null);
    setIsFormValid(false);
    setIsIcpReady(false);
  };

  const handleSave = async () => {
    if (modalMode === "view") {
      closeModal();
      return;
    }

    if (!formInstance) return;

    try {
      await formInstance.validate();
      const formValues = formInstance.values;
      const idSelectorValue = stripIcpLookupMetadata(
        formValues.idSelector || formValues,
      );

      const newPerson: PersonItem = {
        id:
          editingId ||
          `person-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        ...idSelectorValue,
      };

      if (maxMembers && maxMembers > 0 && !editingId) {
        const currentCount = value.length;
        if (currentCount >= maxMembers) {
          Modal.warning({
            centered: true,
            title: t("PersonsInChargeList.validation.limitReached"),
            content: t("PersonsInChargeList.validation.maxPersons", {
              max: maxMembers,
            }),
          });
          return;
        }
      }

      if (editingId) {
        const next = value.map((v) => (v.id === editingId ? newPerson : v));
        field.setValue(next);
      } else {
        field.setValue([...value, newPerson]);
      }

      closeModal();
    } catch (error) {
      console.error("Form validation failed:", error);
    }
  };

  const openDeleteModal = (id: string) => {
    setDeleteModal({ visible: true, id });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ visible: false, id: null });
  };

  const handleDelete = () => {
    if (deleteModal.id) {
      const next = value.filter((v) => v.id !== deleteModal.id);
      field.setValue(next);
    }
    closeDeleteModal();
  };

  const isAddButtonDisabled =
    maxMembers && maxMembers > 0 && value.length >= maxMembers;

  const renderEllipsisText = (text?: string) => {
    const displayText = text || "-";
    return (
      <div className="persons-in-charge-list-ellipsis" title={displayText}>
        {displayText}
      </div>
    );
  };

  const columns = [
    {
      title: t("PersonsInChargeList.columns.fullName"),
      dataIndex: "fullName",
      key: "fullName",
      ellipsis: true,
      width: "26%",
      render: (_: any, record: PersonItem) =>
        renderEllipsisText(getFullName(record)),
    },
    {
      title: t("PersonsInChargeList.columns.nationality"),
      dataIndex: "nationality",
      key: "nationality",
      ellipsis: true,
      width: "18%",
      render: (_: any, record: PersonItem) =>
        renderEllipsisText(getNationalityName(record.nationality)),
    },
    {
      title: t("PersonsInChargeList.columns.idNumber"),
      dataIndex: "idNumber",
      key: "idNumber",
      ellipsis: true,
      width: "22%",
      render: (_: any, record: PersonItem) =>
        renderEllipsisText(getIdNumber(record)),
    },
    {
      title: t("PersonsInChargeList.columns.occupation"),
      dataIndex: "occupation",
      key: "occupation",
      ellipsis: true,
      width: "20%",
      render: (occupation: string | undefined) =>
        renderEllipsisText(occupation),
    },
    {
      title: t("PersonsInChargeList.columns.actions"),
      key: "actions",
      width: 120,
      render: (_: any, record: PersonItem) => (
        <Space>
          {isReadOnlyMode ? (
            <span
              className="action-view "
              onClick={() => openViewModal(record)}
            >
              {t("PersonsInChargeList.view")}
            </span>
          ) : (
            <>
              <span
                className="action-edit "
                onClick={() => openEditModal(record)}
              >
                {t("PersonsInChargeList.edit")}
              </span>
              <span
                className="action-delete"
                onClick={() => openDeleteModal(record.id)}
              >
                {t("PersonsInChargeList.delete")}
              </span>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div
      {...restProps}
      className={["persons-in-charge-list-container", className]
        .filter(Boolean)
        .join(" ")}
    >
      <Card
        className="persons-in-charge-list-card"
        title={
          <div className="persons-in-charge-list-title">
            <span className="persons-in-charge-list-title__label">
              {title || t("PersonsInChargeList.title")}
              {field.required && (
                <span className="persons-in-charge-list-title__required">
                  *
                </span>
              )}
            </span>
            {!isReadOnlyMode && (
              <CustomButton
                disabled={isAddButtonDisabled}
                className="social-media-account-add-btn"
                onClick={openModal}
              >
                {addButtonLabel || t("PersonsInChargeList.addNew")}
              </CustomButton>
            )}
          </div>
        }
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={value}
          pagination={false}
          size="middle"
          tableLayout="fixed"
          style={{ width: "100%" }}
          scroll={{ x: true }}
          locale={{
            emptyText: (
              <EmptyBox
                title={t("common.noData")}
                customClassName="persons-in-charge-list-empty"
              />
            ),
          }}
        />
        {!!field.selfErrors?.length && (
          <div className="persons-in-charge-list-card__feedback">
            {field.selfErrors[0]}
          </div>
        )}
      </Card>

      <Modal centered
        title={
          modalMode === "view"
            ? t("PersonsInChargeList.modal.viewPerson")
            : editingId
            ? t("PersonsInChargeList.modal.editPerson")
            : t("PersonsInChargeList.modal.addPerson")
        }
        visible={modalOpen}
        footer={null}
        onCancel={closeModal}
        onOk={modalMode === "view" ? closeModal : handleSave}
        okText={
          modalMode === "view"
            ? t("PersonsInChargeList.cancel")
            : t("PersonsInChargeList.confirm")
        }
        cancelText={t("PersonsInChargeList.cancel")}
        width={900}
        destroyOnClose
        cancelButtonProps={{
          style: {
            display: modalMode === "view" ? "none" : undefined,
          },
        }}
        okButtonProps={{
          disabled: modalMode === "view" ? false : !isFormValid || !isIcpReady,
          className: "custom-button-primary  Formily-save-btn",
        }}
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
                    disabled: modalMode === "view",
                    onIcpLoadedChange: handleIcpLoadedChange,
                    onValueChange: handleIdSelectorValueChange,
                  },
                ]}
                decorator={[FormItem]}
              />
            </Form>
          </FormProvider>
        )}
        <div className="formily-modal-footer">
          {modalMode !== "view" && (
            <CustomButton variant="outline" onClick={closeModal}>
              {t("PersonsInChargeList.cancel")}
            </CustomButton>
          )}
          <CustomButton
            onClick={modalMode === "view" ? closeModal : handleSave}
            disabled={
              modalMode === "view" ? false : !isFormValid || !isIcpReady
            }
          >
            {modalMode === "view"
              ? t("PersonsInChargeList.cancel")
              : t("PersonsInChargeList.confirm")}
          </CustomButton>
        </div>
      </Modal>

      <ConfirmModal
        visible={deleteModal.visible}
        type="danger"
        title={t("PersonsInChargeList.deleteRecord")}
        content={t("PersonsInChargeList.deleteRecordDesc")}
        cancelText={t("PersonsInChargeList.cancel")}
        confirmText={t("PersonsInChargeList.delete")}
        onCancel={closeDeleteModal}
        onConfirm={handleDelete}
      />
    </div>
  );
});

PersonsInChargeListFieldDom.displayName = "PersonsInChargeListFieldDom";

export const PersonsInChargeListField = connect(
  PersonsInChargeListFieldDom,
  mapProps((props) => {
    return props;
  }),
);

PersonsInChargeListField.displayName = "PersonsInChargeListField";

export default PersonsInChargeListField;
