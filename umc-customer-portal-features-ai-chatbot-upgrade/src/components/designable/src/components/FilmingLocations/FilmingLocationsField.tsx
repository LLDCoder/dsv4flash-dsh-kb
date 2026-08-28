import React, { useCallback, useEffect, useMemo, useState } from "react";
import { observer, useField, useForm } from "@formily/react";
import { Button, Card, Col, Input, Modal, Radio, Row, Select, Table } from "antd";
import { useTranslation } from "react-i18next";
import CustomButton from "@/components/common/CustomButton";
import EmptyBox from "../../../../common/EmptyBox/EmptyBox";
import { preferLocalizedEnAr } from "@/utils/bilingualDisplay";
import {
  getEmirateList,
  getRegionList,
  getAreaList,
  type EmirateItem,
  type RegionItem,
  type AreaItem,
} from "@/services/address";
import "./styles.less";
import GoogleMapPicker from "./GoogleMapPicker";

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

type FilmingLocationsFieldProps = Record<string, unknown> & {
  className?: string;
};
type FilmingLocationsArrayField = {
  value?: unknown;
  setValue: (value: FilmingLocationItem[]) => void;
  pattern?: string;
  required?: boolean;
  setValidator?: (validator: (value: unknown) => string) => void;
  decoratorProps?: Record<string, unknown>;
  selfErrors?: string[];
};

export const FilmingLocationsField: React.FC<FilmingLocationsFieldProps> = observer((props) => {
  const { className, ...restProps } = props;
  const { t, i18n } = useTranslation();
  const isAr = Boolean(i18n.language?.startsWith("ar"));
  const field = useField() as unknown as FilmingLocationsArrayField;
  const form = useForm();
  const isReadOnly =
    field.pattern === "disabled" ||
    field.pattern === "readOnly" ||
    field.pattern === "readPretty" ||
    form.pattern === "disabled" ||
    form.pattern === "readOnly" ||
    form.pattern === "readPretty";
    console.log('FilmingLocationsField isReadOnly', isReadOnly)
  const value = useMemo(
    () => (Array.isArray(field.value) ? field.value : []) as FilmingLocationItem[],
    [field.value]
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [method, setMethod] = useState<LocationMethod>(DEFAULT_METHOD);
  const [emirateId, setEmirateId] = useState<number | undefined>(undefined);
  const [regionId, setRegionId] = useState<number | undefined>(undefined);
  const [areaId, setAreaId] = useState<number | undefined>(undefined);
  const [street, setStreet] = useState<string>("");
  const [longitude, setLongitude] = useState<number | undefined>(undefined);
  const [latitude, setLatitude] = useState<number | undefined>(undefined);

  const [emirates, setEmirates] = useState<EmirateItem[]>([]);
  const [regions, setRegions] = useState<RegionItem[]>([]);
  const [areas, setAreas] = useState<AreaItem[]>([]);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const requiredMessage = t("AddressList.validation.requiredLocation");

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

  const filteredRegions = useMemo(() => {
    if (!emirateId) return [];
    return regions.filter((r) => r.emirateId === emirateId);
  }, [regions, emirateId]);

  const filteredAreas = useMemo(() => {
    if (!regionId) return [];
    return areas.filter((a) => a.regionId === regionId);
  }, [areas, regionId]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingAddress(true);
        const [eRes, rRes, aRes] = await Promise.all([
          getEmirateList(),
          getRegionList(),
          getAreaList(),
        ]);
        setEmirates(eRes.data || []);
        setRegions(rRes.data || []);
        setAreas(aRes.data || []);
      } catch (err) {
        console.error("Failed to load address lists", err);
      } finally {
        setLoadingAddress(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    field.required = true;
    field.setValidator?.((nextValue: unknown) => {
      return Array.isArray(nextValue) && nextValue.length > 0 ? "" : requiredMessage;
    });
    field.decoratorProps = {
      ...field.decoratorProps,
      feedbackLayout: "none",
    };
  }, [field, requiredMessage]);

  const openAdd = () => {
    setEditingId(null);
    setMethod(DEFAULT_METHOD);
    setEmirateId(undefined);
    setRegionId(undefined);
    setAreaId(undefined);
    setStreet("");
    setLongitude(undefined);
    setLatitude(undefined);
    setModalOpen(true);
  };

  const openEdit = (record: FilmingLocationItem) => {
    setEditingId(record.id);
    setMethod(record.method || DEFAULT_METHOD);
    setEmirateId(record.emirateId);
    setRegionId(record.regionId);
    setAreaId(record.areaId);
    setStreet(record.street || "");
    setLongitude(record.Longitude);
    setLatitude(record.Latitude);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSaving(false);
  };

  const removeItem = useCallback((id: string) => {
    const next = value.filter((v) => v.id !== id);
    field.setValue(next);
  }, [field, value]);

  const handleMapLocationSelect = useCallback(
    ({
      address,
      latitude: nextLatitude,
      longitude: nextLongitude,
    }: {
      address?: string;
      latitude: number;
      longitude: number;
    }) => {
      if (address) {
        setStreet(address);
      }
      setLatitude(nextLatitude);
      setLongitude(nextLongitude);
    },
    []
  );

  const validateAndBuildPayload = (): FilmingLocationItem | null => {
    if (method === "data") {
      if (!emirateId || !regionId || !areaId) {
        return null;
      }
      if (!street?.trim()) {
        return null;
      }
      return {
        id: editingId || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        method,
        emirateId,
        regionId,
        areaId,
        street: street.trim(),
      };
    }

    if (typeof longitude !== "number" || typeof latitude !== "number") {
      return null;
    }

    if (!street?.trim()) {
      return null;
    }

    return {
      id: editingId || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      method,
      street: street.trim(),
      Longitude: longitude,
      Latitude: latitude,
    };
  };

  const onSave = async () => {
    const payload = validateAndBuildPayload();
    if (!payload) {
      Modal.warning({
        centered: true,
        title: t("AddressList.validation.title"),
        content: t("AddressList.validation.fillRequiredFields"),
      });
      return;
    }

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
    () => [
      {
        title: t("AddressList.columns.emirate"),
        dataIndex: "emirateId",
        key: "emirateId",
        render: (id: number | undefined) => {
          const emirate = id ? emirateMap.get(id) : undefined;
          return preferLocalizedEnAr(isAr, emirate?.nameEn, emirate?.nameAr) || "-";
        },
      },
      {
        title: t("AddressList.columns.region"),
        dataIndex: "regionId",
        key: "regionId",
        render: (id: number | undefined) => {
          const region = id ? regionMap.get(id) : undefined;
          return preferLocalizedEnAr(isAr, region?.nameEn, region?.nameAr) || "-";
        },
      },
      {
        title: t("AddressList.columns.area"),
        dataIndex: "areaId",
        key: "areaId",
        render: (id: number | undefined) => {
          const area = id ? areaMap.get(id) : undefined;
          return preferLocalizedEnAr(isAr, area?.nameEn, area?.nameAr) || "-";
        },
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
          <div className="filming-locations-actions">
            <Button type="link" onClick={() => openEdit(record)}>
              {t("AddressList.edit")}
            </Button>
            <Button type="link" danger onClick={() => removeItem(record.id)}>
              {t("AddressList.delete")}
            </Button>
          </div>
        ),
      },
    ].filter((column) => !isReadOnly || column.key !== "actions"),
    [areaMap, emirateMap, isAr, isReadOnly, regionMap, removeItem, t]
  );

  return (
    <div
      {...restProps}
      className={["filming-locations-container", className].filter(Boolean).join(" ")}
    >
      <Card
        className="filming-locations-card"
        title={
          <div className="filming-locations-title">
            {t("AddressList.title")}
            <span className="required-icon">*</span>
          </div>
        }
        extra={!isReadOnly ? (
          <Button type="primary" onClick={openAdd}>
            {t("AddressList.addNew")}
          </Button>
        ) : null}
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

      <Modal centered
        title={t("AddressList.addNew")}
        visible={modalOpen}
        onCancel={closeModal}
        footer={null}
        width={900}
        wrapClassName="filming-locations-modal-root"
      >
        <div className="filming-locations-modal formily-control-typography">
          <div className="filming-locations-method">
            <Radio.Group
              value={method}
              onChange={(e) => setMethod(e.target.value as LocationMethod)}
            >
              <Radio value="data">{t("AddressList.setByData")}</Radio>
              <Radio value="map">{t("AddressList.setByMap")}</Radio>
            </Radio.Group>
          </div>

          {method === "data" ? (
            <Row gutter={24}>
              <Col xs={24} md={12}>
                <div className="filming-locations-label">
                  {t("AddressList.columns.emirate")} *
                </div>
                <Select
                  placeholder={t("AddressPicker.placeholder.emirate")}
                  value={emirateId}
                  onChange={(v) => {
                    setEmirateId(v);
                    setRegionId(undefined);
                    setAreaId(undefined);
                  }}
                  loading={loadingAddress}
                  showSearch
                  optionFilterProp="children"
                  style={{ width: "100%" }}
                >
                  {emirates.map((e) => (
                    <Select.Option key={e.id} value={e.id}>
                      {preferLocalizedEnAr(isAr, e.nameEn, e.nameAr)}
                    </Select.Option>
                  ))}
                </Select>
              </Col>
              <Col xs={24} md={12}>
                <div className="filming-locations-label">
                  {t("AddressList.columns.region")} *
                </div>
                <Select
                  placeholder={t("AddressPicker.placeholder.region")}
                  value={regionId}
                  onChange={(v) => {
                    setRegionId(v);
                    setAreaId(undefined);
                  }}
                  disabled={!emirateId}
                  loading={loadingAddress}
                  showSearch
                  optionFilterProp="children"
                  style={{ width: "100%" }}
                >
                  {filteredRegions.map((r) => (
                    <Select.Option key={r.id} value={r.id}>
                      {preferLocalizedEnAr(isAr, r.nameEn, r.nameAr)}
                    </Select.Option>
                  ))}
                </Select>
              </Col>
              <Col xs={24} md={12}>
                <div className="filming-locations-label">
                  {t("AddressList.columns.area")} *
                </div>
                <Select
                  placeholder={t("AddressPicker.placeholder.area")}
                  value={areaId}
                  onChange={(v) => setAreaId(v)}
                  disabled={!regionId}
                  loading={loadingAddress}
                  showSearch
                  optionFilterProp="children"
                  style={{ width: "100%" }}
                >
                  {filteredAreas.map((a) => (
                    <Select.Option key={a.id} value={a.id}>
                      {preferLocalizedEnAr(isAr, a.nameEn, a.nameAr)}
                    </Select.Option>
                  ))}
                </Select>
              </Col>
              <Col xs={24} md={12}>
                <div className="filming-locations-label">
                  {t("AddressList.columns.street")} *
                </div>
                <Input.TextArea
                  placeholder={t("AddressList.placeholder.enterStreet")}
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  maxLength={200}
                  autoSize={{ minRows: 4, maxRows: 4 }}
                />
                <div className="filming-locations-counter">{street.length} / 200</div>
              </Col>
            </Row>
          ) : (
            <div className="filming-locations-map-placeholder">
              <GoogleMapPicker
                value={street}
                latitude={latitude}
                longitude={longitude}
                onLocationSelect={handleMapLocationSelect}
              />
              <div className="filming-locations-field">
                <div className="filming-locations-label">
                  {t("AddressList.columns.street")} *
                </div>
                <Input.TextArea
                  placeholder={t("AddressList.placeholder.enterStreet")}
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  maxLength={200}
                  autoSize={{ minRows: 4, maxRows: 4 }}
                />
                <div className="filming-locations-counter">{street.length} / 200</div>
              </div>
            </div>
          )}
        </div>
        <div className="formily-modal-footer">
          <CustomButton variant="outline" onClick={closeModal}>
            {t("AddressList.cancel")}
          </CustomButton>
          <CustomButton loading={saving} onClick={onSave}>
            {t("AddressList.save")}
          </CustomButton>
        </div>
      </Modal>
    </div>
  );
});
