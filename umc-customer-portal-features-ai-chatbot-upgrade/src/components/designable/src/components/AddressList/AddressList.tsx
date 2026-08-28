import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  observer,
  useField,
  useForm,
  Field,
  FormProvider,
} from "@formily/react";
import { createForm } from "@formily/core";
import type { Form as FormilyForm } from "@formily/core";
import { Button, Card, Input, Modal, Radio, Select, Table } from "antd";
import { useTranslation } from "react-i18next";
import {
  getEmirateList,
  getRegionList,
  getAreaList,
  type EmirateItem,
  type RegionItem,
  type AreaItem,
} from "@/services/address";
import AddressPicker, {
  ADDRESS_STREET_MAX_LENGTH,
} from "../AddressPicker/AddressPicker";
import GoogleMapPicker from "../FilmingLocations/GoogleMapPicker";
import { findMatchingEmirate } from "./emirateMatching";
import {
  renderLocalMediaAuthorityMessage,
  usesLocalMediaAuthority,
} from "./localMediaAuthorityMessage";
import "./styles.less";
import CustomButton from "../../../../common/CustomButton";
import EmptyBox from "../../../../common/EmptyBox/EmptyBox";
import FieldDecoratorTooltip from "@/components/designable/src/components/FormItemWithHtmlTooltip/FieldDecoratorTooltip";
import SimpleBar from "@/components/SimpleBar";
import ConfirmModal from "@/components/common/ConfirmModal";

type LocationMethod = "data" | "map";

type FilmingLocationItem = {
  id: string;
  method: LocationMethod;
  emirateId?: number;
  regionId?: number;
  areaId?: number;
  street?: string;
  Longitude?: number;
  Latitude?: number;
};

const DEFAULT_METHOD: LocationMethod = "data";

type AddressListProps = Record<string, unknown> & {
  disabled?: boolean;
  labelName?: string;
  addButtonLabel?: string;
  className?: string;
};

type AddressListField = {
  value?: unknown;
  setValue: (value: FilmingLocationItem[]) => void;
  pattern?: string;
  required?: boolean;
  setValidator?: (validator: (value: unknown) => string) => void;
  decoratorProps?: Record<string, unknown>;
  selfErrors?: string[];
};

export const FilmingLocationsField: React.FC<AddressListProps> = observer(
  (props) => {
    console.log(props)
    const { t, i18n } = useTranslation();
    const { disabled, labelName, addButtonLabel, className, ...restProps } =
      props;
    const field = useField() as unknown as AddressListField;
    const form = useForm();
    const isReadOnly =
      disabled ||
      field.pattern === "disabled" ||
      field.pattern === "readOnly" ||
      field.pattern === "readPretty" ||
      form.pattern === "disabled" ||
      form.pattern === "readOnly" ||
      form.pattern === "readPretty";
    const isAr = Boolean(i18n.language?.startsWith("ar"));
    const resolvedLabelName =
      !labelName || labelName === "Filming Locations"
        ? t("AddressList.title")
        : labelName;
    const resolvedAddButtonLabel =
      !addButtonLabel || addButtonLabel === "Add New"
        ? t("AddressList.addNew")
        : addButtonLabel;
    const value = useMemo(
      () =>
        (Array.isArray(field.value)
          ? field.value
          : []) as FilmingLocationItem[],
      [field.value],
    );

    const [modalOpen, setModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [method, setMethod] = useState<LocationMethod>(DEFAULT_METHOD);
    /** Modal sub-form for AddressPicker when method === "data" */
    const [addressForm, setAddressForm] = useState<FormilyForm | null>(null);
    const [street, setStreet] = useState<string>("");
    const [longitude, setLongitude] = useState<number | undefined>(undefined);
    const [latitude, setLatitude] = useState<number | undefined>(undefined);
    const [mapEmirateId, setMapEmirateId] = useState<number | undefined>(
      undefined,
    );
    const [resolvedMapEmirateId, setResolvedMapEmirateId] = useState<
      number | undefined
    >(undefined);
    const [validationModal, setValidationModal] = useState<{
      visible: boolean;
      content: React.ReactNode;
    }>({
      visible: false,
      content: null,
    });

    const [emirates, setEmirates] = useState<EmirateItem[]>([]);
    const [regions, setRegions] = useState<RegionItem[]>([]);
    const [areas, setAreas] = useState<AreaItem[]>([]);
    const requiredMessage = t("AddressList.validation.requiredLocation");

    const getAddressName = useCallback(
      (item?: { nameEn?: string; nameAr?: string }) =>
        item
          ? (isAr ? item.nameAr || item.nameEn : item.nameEn || item.nameAr) ||
            "-"
          : "-",
      [isAr],
    );

    const emirateMap = useMemo(() => {
      const map = new Map<number, EmirateItem>();
      emirates.forEach((e) => map.set(e.id, e));
      return map;
    }, [emirates]);

    const regionMap = useMemo(() => {
      const map = new Map<number, RegionItem>();
      regions.forEach((r) => map.set(r.id, r));
      return map;
    }, [regions]);

    const areaMap = useMemo(() => {
      const map = new Map<number, AreaItem>();
      areas.forEach((a) => map.set(a.id, a));
      return map;
    }, [areas]);

    const routeServiceCode = useMemo(
      () => new URLSearchParams(window.location.search).get("serviceCode"),
      [],
    );

    useEffect(() => {
      const load = async () => {
        try {
          const [eRes, rRes, aRes] = await Promise.all([
            getEmirateList(routeServiceCode),
            getRegionList(),
            getAreaList(),
          ]);
          setEmirates(eRes.data || []);
          setRegions(rRes.data || []);
          setAreas(aRes.data || []);
        } catch (err) {
          console.error("Failed to load address lists", err);
        }
      };
      load();
    }, [routeServiceCode]);

    useEffect(() => {
      field.required = true;
      field.setValidator?.((nextValue: unknown) => {
        return Array.isArray(nextValue) && nextValue.length > 0
          ? ""
          : requiredMessage;
      });
      field.decoratorProps = {
        ...field.decoratorProps,
        feedbackLayout: "none",
      };
    }, [field, requiredMessage]);

    const openAdd = () => {
      setEditingId(null);
      setMethod(DEFAULT_METHOD);
      setStreet("");
      setLongitude(undefined);
      setLatitude(undefined);
      setMapEmirateId(undefined);
      setResolvedMapEmirateId(undefined);
      setAddressForm(
        createForm({
          initialValues: {
            address: {},
          },
        }),
      );
      setModalOpen(true);
    };

    const openEdit = (record: FilmingLocationItem) => {
      setEditingId(record.id);
      const m = record.method || DEFAULT_METHOD;
      setMethod(m);
      setStreet(record.street || "");
      setLongitude(record.Longitude);
      setLatitude(record.Latitude);
      setMapEmirateId(record.emirateId);
      setResolvedMapEmirateId(
        record.method === "map" ? record.emirateId : undefined,
      );
      if (m === "data") {
        setAddressForm(
          createForm({
            initialValues: {
              address: {
                emirateId: record.emirateId,
                regionId: record.regionId,
                areaId: record.areaId,
                street: record.street || "",
              },
            },
          }),
        );
      } else {
        setAddressForm(null);
      }
      setModalOpen(true);
    };

    const closeModal = () => {
      setModalOpen(false);
      setValidationModal({
        visible: false,
        content: "",
      });
      setSaving(false);
      setAddressForm(null);
    };

    const closeValidationModal = () => {
      setValidationModal({
        visible: false,
        content: null,
      });
    };

    const onMethodChange = (next: LocationMethod) => {
      setMethod(next);
      if (next === "data") {
        setAddressForm(
          (prev) =>
            prev ??
            createForm({
              initialValues: { address: {} },
            }),
        );
      } else {
        setAddressForm(null);
      }
    };

    const removeItem = useCallback(
      (id: string) => {
        const next = value.filter((v) => v.id !== id);
        field.setValue(next);
      },
      [field, value],
    );

    const handleMapLocationSelect = useCallback(
      ({
        address,
        emirateName,
        latitude: nextLatitude,
        longitude: nextLongitude,
      }: {
        address?: string;
        emirateName?: string;
        latitude: number;
        longitude: number;
      }) => {
        const matchedEmirate = findMatchingEmirate(emirateName, emirates);

        if (!matchedEmirate) {
          setValidationModal({
            visible: true,
            // Text Permit services point the user at the emirate media authorities
            // that actually issue these permits, instead of the generic notice.
            content: usesLocalMediaAuthority(routeServiceCode)
              ? renderLocalMediaAuthorityMessage()
              : t("AddressList.validation.mapEmirateNotAllowed"),
          });
          return false;
        }

        if (address) {
          setStreet(address);
        }
        setMapEmirateId(matchedEmirate.id);
        setResolvedMapEmirateId(matchedEmirate.id);
        setLatitude(nextLatitude);
        setLongitude(nextLongitude);

        return true;
      },
      [emirates, routeServiceCode, t],
    );

    const handleMapEmirateChange = (nextEmirateId: number) => {
      setMapEmirateId(nextEmirateId);

      if (nextEmirateId !== resolvedMapEmirateId) {
        setResolvedMapEmirateId(undefined);
        setStreet("");
        setLongitude(undefined);
        setLatitude(undefined);
      }
    };

    const onSave = async () => {
      if (method === "data") {
        if (!addressForm) {
          setValidationModal({
            visible: true,
            content: t("AddressList.validation.fillRequiredFields"),
          });
          return;
        }
        setSaving(true);
        try {
          await addressForm.validate();
          const addr = (addressForm.values.address || {}) as {
            emirateId?: number;
            regionId?: number;
            areaId?: number;
            street?: string;
          };
          const payload: FilmingLocationItem = {
            id:
              editingId ||
              `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            method: "data",
            emirateId: addr.emirateId,
            regionId: addr.regionId,
            areaId: addr.areaId,
            street: String(addr.street ?? "").trim(),
          };
          if (editingId) {
            const next = value.map((v) => (v.id === editingId ? payload : v));
            field.setValue(next);
          } else {
            field.setValue([...value, payload]);
          }
          closeModal();
        } catch {
          // AddressPicker / form field errors are shown on the form
        } finally {
          setSaving(false);
        }
        return;
      }

      const streetTrim = street?.trim();
      const hasMapCoordinates =
        typeof longitude === "number" && typeof latitude === "number";
      const hasMapEmirate = typeof mapEmirateId === "number";
      if (
        !streetTrim ||
        !hasMapCoordinates ||
        !hasMapEmirate ||
        mapEmirateId !== resolvedMapEmirateId
      ) {
        setValidationModal({
          visible: true,
          content:
            !streetTrim || !hasMapCoordinates
              ? t("AddressList.validation.fillRequiredFields")
              : t("AddressList.validation.mapEmirateNotAllowed"),
        });
        return;
      }

      const payload: FilmingLocationItem = {
        id: editingId || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        method: "map",
        emirateId: mapEmirateId,
        street: streetTrim,
        Longitude: longitude,
        Latitude: latitude,
      };

      setSaving(true);
      try {
        if (editingId) {
          const next = value.map((v) => (v.id === editingId ? payload : v));
          field.setValue(next);
        } else {
          field.setValue([...value, payload]);
        }
        closeModal();
      } finally {
        setSaving(false);
      }
    };

    const columns = useMemo(
      () =>
        [
          {
            title: t("AddressList.columns.emirate"),
            dataIndex: "emirateId",
            key: "emirateId",
            render: (id: number | undefined) =>
              typeof id === "number" ? getAddressName(emirateMap.get(id)) : "-",
          },
          {
            title: t("AddressList.columns.region"),
            dataIndex: "regionId",
            key: "regionId",
            render: (id: number | undefined) =>
              typeof id === "number" ? getAddressName(regionMap.get(id)) : "-",
          },
          {
            title: t("AddressList.columns.area"),
            dataIndex: "areaId",
            key: "areaId",
            render: (id: number | undefined) =>
              typeof id === "number" ? getAddressName(areaMap.get(id)) : "-",
          },
          {
            title: t("AddressList.columns.street"),
            dataIndex: "street",
            key: "street",
            render: (s: string | undefined) => s || "-",
          },
          {
            title: t("AddressList.columns.actions"),
            key: "actions",
            render: (_: unknown, record: FilmingLocationItem) => (
              <div className="filming-locations-actions Formliy-action">
                <Button
                  type="link"
                  className="Edit"
                  {...restProps}
                  onClick={() => openEdit(record)}
                >
                  {t("AddressList.edit")}
                </Button>
                {!disabled && (
                  <Button
                    type="link"
                    className="Delete"
                    danger
                    onClick={() => removeItem(record.id)}
                  >
                    {t("AddressList.delete")}
                  </Button>
                )}
              </div>
            ),
          },
        ].filter((column) => !isReadOnly || column.key !== "actions"),
      [
        areaMap,
        disabled,
        emirateMap,
        getAddressName,
        isReadOnly,
        regionMap,
        removeItem,
        restProps,
        t,
      ],
    );

    const selectedMapEmirate =
      typeof mapEmirateId === "number"
        ? emirateMap.get(mapEmirateId)
        : undefined;
    const mapCenterAddress = selectedMapEmirate?.nameEn
      ? `${selectedMapEmirate.nameEn}, United Arab Emirates`
      : undefined;

    return (
      <div
        {...restProps}
        className={["filming-locations-container", className]
          .filter(Boolean)
          .join(" ")}
      >
        <Card
          className="filming-locations-card"
          title={
            <div className="filming-locations-title">
              {resolvedLabelName}
  <span className="required-icon">*</span>
              <FieldDecoratorTooltip
                fallbackContent={
                  typeof props.description === "string"
                    ? props.description
                    : null
                }
                placement="top"
              />
            </div>
          }
          extra={
            !isReadOnly ? (
              <Button type="primary" onClick={openAdd}>
                {resolvedAddButtonLabel}
              </Button>
            ) : null
          }
        >
          <Table
            rowKey="id"
            columns={columns}
            dataSource={value}
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

        <Modal
          title={
            editingId ? t("AddressList.editLocation") : t("AddressList.addNew")
          }
          visible={modalOpen}
          onCancel={closeModal}
          centered
          footer={
            <div className="formily-modal-footer filming-locations-modal__footer">
              <CustomButton variant="outline" onClick={closeModal}>
                {t("AddressList.cancel")}
              </CustomButton>
              <CustomButton
                variant="primary"
                loading={saving}
                onClick={onSave}
              >
                {t("AddressList.confirm")}
              </CustomButton>
            </div>
          }
          className="filming-locations-address-modal"
          wrapClassName="filming-locations-modal-root"
        >
          <SimpleBar className="filming-locations-modal__scroll">
            <div className="filming-locations-modal formily-control-typography">
              <div className="filming-locations-method">
                <Radio.Group
                  {...restProps}
                  value={method}
                  onChange={(e) =>
                    onMethodChange(e.target.value as LocationMethod)
                  }
                >
                  <Radio value="data">{t("AddressList.setByData")}</Radio>
                  <Radio value="map">{t("AddressList.setByMap")}</Radio>
                </Radio.Group>
              </div>

              {method === "data" && addressForm ? (
                <FormProvider form={addressForm}>
                  <Field
                    name="address"
                    pattern={isReadOnly ? "disabled" : field.pattern}
                    // Manual mode is text-only here; the map lives in this list's own
                    // "Set by Map" mode, so suppress the picker's built-in map.
                    component={[AddressPicker, { showMap: false }]}
                  />
                </FormProvider>
              ) : (
                <div className="filming-locations-map-placeholder">
                  <GoogleMapPicker
                    value={street}
                    centerAddress={mapCenterAddress}
                    latitude={latitude}
                    longitude={longitude}
                    onLocationSelect={handleMapLocationSelect}
                  />
                  <div className="filming-locations-field">
                    <div className="filming-locations-label">
                      {t("AddressList.columns.emirate")}
                      <span className="filming-locations-required-mark">*</span>
                    </div>
                    <Select
                      className="filming-locations-map-emirate-select"
                      dropdownClassName="formily-control-dropdown"
                      placeholder={t("AddressPicker.placeholder.emirate")}
                      value={mapEmirateId}
                      onChange={handleMapEmirateChange}
                      showSearch
                      optionFilterProp="children"
                    >
                      {emirates.map((emirate) => (
                        <Select.Option key={emirate.id} value={emirate.id}>
                          {getAddressName(emirate)}
                        </Select.Option>
                      ))}
                    </Select>
                  </div>
                  <div className="filming-locations-field">
                    <div className="filming-locations-label">
                      {t("AddressList.columns.street")}
                      <span className="filming-locations-required-mark">*</span>
                    </div>
                    <Input.TextArea
                      placeholder={t("AddressList.placeholder.enterStreet")}
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      maxLength={ADDRESS_STREET_MAX_LENGTH}
                      autoSize={{ minRows: 4 }}
                    />
                    <div className="filming-locations-counter">
                      {street.length} / {ADDRESS_STREET_MAX_LENGTH}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </SimpleBar>
        </Modal>
        <ConfirmModal
          // Local skin only. MediaLicense's WarningModal declares the same global
          // `.confirm-modal` rules, so this dialog needs its own class to lay out
          // the way its Figma frame does without restyling every other confirm.
          className="filming-locations-validation-modal"
          visible={validationModal.visible}
          type="warning"
          title={t("AddressList.validation.title")}
          content={validationModal.content}
          cancelText=""
          confirmText={t("common.ok")}
          onCancel={closeValidationModal}
          onConfirm={closeValidationModal}
        />
      </div>
    );
  },
);
