import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { observer, useField, useForm } from "@formily/react";
import { Col, Input, Row, Select } from "antd";
import {
  getEmirateList,
  getRegionList,
  getAreaList,
  type EmirateItem,
  type RegionItem,
  type AreaItem,
} from "@/services/address";
import { preferLocalizedEnAr } from "@/utils/bilingualDisplay";
import {
  hasCompleteAddressCoordinates,
  resolveProfileFormAddress,
  shouldReportProfileAddressResolutionFailure,
  shouldAttemptProfileAddressSourceInitialization,
  type ProfileFormAddressPicker,
  type ProfileFormSourceAddress,
} from "../ProfileForm/profileFormRules";
import {
  AddressMapField,
  type AddressMapPick,
} from "@/components/common/AddressMapPicker";
import "./AddressPicker.less";

/**
 * Cap for the address Street field. Exported because AddressList's "Set By Map" mode
 * renders the same field by hand and has to enforce the same limit on the same value.
 * Deliberately not named STREET_MAX_LENGTH: idSelectorUtils already exports that name
 * with a different value (1000) for a different form's address.
 */
export const ADDRESS_STREET_MAX_LENGTH = 500;

type AddressValue = {
  emirateId?: number;
  regionId?: number;
  areaId?: number;
  street?: string;
  /**
   * Map pin, carried alongside the hierarchy rather than instead of it: the text is
   * what the address hierarchy validates, the pin is where the user actually pointed.
   * Only meaningful as a pair.
   */
  latitude?: number;
  longitude?: number;
};

type AddressErrorKey = "emirateId" | "regionId" | "areaId" | "street";

interface AddressPickerProps {
  disabled?: boolean;
  initializeFromSource?: boolean;
  sourceReady?: boolean;
  sourceAddress?: ProfileFormSourceAddress;
  sourceRevision?: number;
  onSourceAddressResolved?: (value: ProfileFormAddressPicker) => void;
  onSourceAddressResolutionError?: () => void;
  onEmiratesLoaded?: (items: EmirateItem[]) => void;
  showMap?: boolean;
}

interface AddressPickerFieldModel {
  value?: AddressValue;
  selfInvalid: boolean;
  pattern?: string;
  setValue: (value: AddressValue) => void;
  setValidator: (validator: (value: AddressValue) => string) => void;
  validate: (triggerType?: string) => Promise<unknown>;
}

function getAddressFieldErrors(
  v: AddressValue | undefined,
  requiredMessage: string,
): Partial<Record<AddressErrorKey, string>> {
  const val = v || {};
  const out: Partial<Record<AddressErrorKey, string>> = {};

  if (val.emirateId === undefined || val.emirateId === null) {
    out.emirateId = requiredMessage;
  }

  if (Number(val.emirateId) === 1) {
    if (val.regionId === undefined || val.regionId === null) {
      out.regionId = requiredMessage;
    }
  }

  if (val.areaId === undefined || val.areaId === null) {
    out.areaId = requiredMessage;
  }

  if (!String(val.street ?? "").trim()) {
    out.street = requiredMessage;
  }

  return out;
}

function firstAddressError(v: AddressValue | undefined, requiredMessage: string): string {
  const e = getAddressFieldErrors(v, requiredMessage);
  return (
    e.emirateId || e.regionId || e.areaId || e.street || ""
  );
}

const AddressPicker: React.FC<AddressPickerProps> = observer((props) => {
  const { t, i18n } = useTranslation();
  const { onSourceAddressResolved } = props;
  const { onSourceAddressResolutionError } = props;
  const field = useField<AddressPickerFieldModel>();
  const form = useForm();
  const value = useMemo(() => field.value || {}, [field.value]);
  const isAr = Boolean(i18n.language?.startsWith("ar"));
  const currentLanguage = i18n.language ?? "";
  const requiredMessage = t("AddressPicker.validation.required");

  const [emirates, setEmirates] = useState<EmirateItem[]>([]);
  const [regions, setRegions] = useState<RegionItem[]>([]);
  const [areas, setAreas] = useState<AreaItem[]>([]);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [lookupsLoaded, setLookupsLoaded] = useState(false);
  const [lookupLoadFailed, setLookupLoadFailed] = useState(false);
  const sourceInitializationRevisionRef = React.useRef<number>();
  const resolvedSourceAddressRef = React.useRef<ProfileFormSourceAddress>();
  const onEmiratesLoadedRef = React.useRef(props.onEmiratesLoaded);
  const isLockedPattern = (pattern?: string) =>
    pattern === "disabled" ||
    pattern === "readOnly" ||
    pattern === "readPretty";
  const isDisabled =
    Boolean(props.disabled) ||
    isLockedPattern(field.pattern) ||
    isLockedPattern(form.pattern);
  const hasCoordinates = hasCompleteAddressCoordinates(value);
  const selectedEmirate = emirates.find(
    (emirate) => Number(emirate.id) === Number(value.emirateId),
  );
  const mapCenterAddress = selectedEmirate?.nameEn
    ? `${selectedEmirate.nameEn}, United Arab Emirates`
    : undefined;
  const shouldShowMap = props.showMap !== false;

  useEffect(() => {
    onEmiratesLoadedRef.current = props.onEmiratesLoaded;
  }, [props.onEmiratesLoaded]);

  const showRegion = Number(value.emirateId) === 1;

  const filteredRegions = useMemo(() => {
    if (!value.emirateId) return [];
    return regions.filter((r) => r.emirateId === value.emirateId);
  }, [regions, value.emirateId]);

  const filteredAreas = useMemo(() => {
    if (!value.emirateId) return [];
    if (Number(value.emirateId) === 1) {
      if (!value.regionId) return [];
      return areas.filter((a) => a.regionId === value.regionId);
    }
    const regionIds = new Set(
      regions
        .filter((r) => r.emirateId === value.emirateId)
        .map((r) => r.id),
    );
    return areas.filter((a) => regionIds.has(a.regionId));
  }, [areas, regions, value.emirateId, value.regionId]);

  const fieldErrors = useMemo(
    () => getAddressFieldErrors(value, requiredMessage),
    [requiredMessage, value],
  );

  const showValidationHints = field.selfInvalid;

  useEffect(() => {
    field.setValidator((val: AddressValue) =>
      firstAddressError(val, requiredMessage),
    );
  }, [currentLanguage, field, requiredMessage]);

  useEffect(() => {
    if (
      !isDisabled &&
      Number(value.emirateId) !== 1 &&
      value.regionId != null
    ) {
      field.setValue({ ...value, regionId: undefined });
    }
  }, [field, isDisabled, value]);

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      try {
        setLoadingAddress(true);
        const [eRes, rRes, aRes] = await Promise.all([
          getEmirateList(),
          getRegionList(),
          getAreaList(),
        ]);

        if (!isActive) return;

        const nextEmirates = eRes.data || [];
        setEmirates(nextEmirates);
        setRegions(rRes.data || []);
        setAreas(aRes.data || []);
        onEmiratesLoadedRef.current?.(nextEmirates);
        setLookupLoadFailed(false);
        setLookupsLoaded(true);
      } catch (err) {
        if (!isActive) return;
        setLookupLoadFailed(true);
        console.error("Failed to load address lists", err);
      } finally {
        if (isActive) setLoadingAddress(false);
      }
    };

    void load();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (
      shouldReportProfileAddressResolutionFailure(
        lookupLoadFailed,
        Boolean(props.sourceReady),
        props.sourceAddress,
      )
    ) {
      onSourceAddressResolutionError?.();
    }
  }, [
    lookupLoadFailed,
    onSourceAddressResolutionError,
    props.sourceAddress,
    props.sourceReady,
  ]);

  useEffect(() => {
    const sourceAddress = props.sourceAddress;
    if (!props.sourceReady) {
      resolvedSourceAddressRef.current = undefined;
      return;
    }
    if (
      !lookupsLoaded ||
      !sourceAddress ||
      !onSourceAddressResolved ||
      resolvedSourceAddressRef.current === sourceAddress
    ) {
      return;
    }

    resolvedSourceAddressRef.current = sourceAddress;
    onSourceAddressResolved(
      resolveProfileFormAddress(sourceAddress, emirates, regions, areas),
    );
  }, [
    areas,
    emirates,
    lookupsLoaded,
    onSourceAddressResolved,
    props.sourceAddress,
    props.sourceReady,
    regions,
  ]);

  useEffect(() => {
    const sourceRevision = props.sourceRevision ?? 0;
    const sourceAddress = props.sourceAddress;
    if (
      !shouldAttemptProfileAddressSourceInitialization(
        sourceInitializationRevisionRef.current,
        sourceRevision,
        lookupsLoaded,
        Boolean(props.initializeFromSource),
        Boolean(sourceAddress),
      )
    ) {
      return;
    }
    if (!sourceAddress) return;

    sourceInitializationRevisionRef.current = sourceRevision;
    const latestValue = (field.value || {}) as AddressValue;
    if (Object.keys(latestValue).length > 0) {
      return;
    }

    field.setValue(
      resolveProfileFormAddress(
        sourceAddress,
        emirates,
        regions,
        areas,
      ),
    );
  }, [
    areas,
    emirates,
    field,
    lookupsLoaded,
    props.initializeFromSource,
    props.sourceAddress,
    props.sourceRevision,
    regions,
  ]);

  const commitValue = useCallback(
    (nextValue: AddressValue) => {
      const shouldRevalidate =
        field.selfInvalid && !firstAddressError(nextValue, requiredMessage);
      field.setValue(nextValue);

      if (shouldRevalidate) {
        void field.validate("onInput").catch(() => {
          // Formily stores validation failures on the field for FormItem display.
        });
      }
    },
    [field, requiredMessage],
  );

  const updateValue = (patch: Partial<AddressValue>) => {
    commitValue({ ...value, ...patch });
  };

  const handleMapPicked = useCallback(
    ({ street, emirateId, latitude, longitude }: AddressMapPick) => {
      // A pin resolves only to an emirate and street, never to Region/Area, so any
      // previously chosen Region/Area now describe a different spot than the new pin.
      // Clear them on every pick and let the user reselect (AC-09) rather than submit
      // a Region/Area that disagrees with the street and coordinates.
      commitValue({
        ...field.value,
        emirateId,
        regionId: undefined,
        areaId: undefined,
        latitude,
        longitude,
        ...(street ? { street } : {}),
      });
    },
    [commitValue, field],
  );

  const areaDisabled =
    isDisabled ||
    !value.emirateId ||
    (Number(value.emirateId) === 1 && !value.regionId);

  const renderFieldError = (key: AddressErrorKey) =>
    showValidationHints && fieldErrors[key] ? (
      <div
        className="address-picker-field-error"
        data-form-validation-error="true"
      >
        {fieldErrors[key]}
      </div>
    ) : null;

  return (
    <div className="address-picker-container">
      <Row gutter={24}>
        <Col xs={24} md={12}>
          <div className="address-picker-label">
            {t("AddressPicker.label.emirate")} <span className="address-picker-required">*</span>
          </div>
          <Select
            placeholder={t("AddressPicker.placeholder.emirate")}
            value={value.emirateId}
            onChange={(v) =>
              // Changing the emirate invalidates any previously dropped pin, so
              // clear the coordinates too (a pin resolves to a single emirate).
              // The map falls back to emirate-centered display until the user
              // re-pins, keeping the marker and submitted coords consistent with
              // the selected address.
              updateValue({
                emirateId: v,
                regionId: undefined,
                areaId: undefined,
                latitude: undefined,
                longitude: undefined,
              })
            }
            loading={loadingAddress}
            disabled={isDisabled}
            showSearch
            optionFilterProp="children"
            className={
              showValidationHints && fieldErrors.emirateId
                ? "address-picker-select-error"
                : undefined
            }
            style={{ width: "100%" }}
          >
            {emirates.map((e) => (
              <Select.Option key={e.id} value={e.id}>
                {preferLocalizedEnAr(isAr, e.nameEn, e.nameAr)}
              </Select.Option>
            ))}
          </Select>
          {renderFieldError("emirateId")}
        </Col>
        {showRegion ? (
          <Col xs={24} md={12}>
            <div className="address-picker-label">
              {t("AddressPicker.label.region")} <span className="address-picker-required">*</span>
            </div>
            <Select
              placeholder={t("AddressPicker.placeholder.region")}
              value={value.regionId}
              onChange={(v) =>
                updateValue({ regionId: v, areaId: undefined })
              }
              disabled={isDisabled || !value.emirateId}
              loading={loadingAddress}
              showSearch
              optionFilterProp="children"
              className={
                showValidationHints && fieldErrors.regionId
                  ? "address-picker-select-error"
                  : undefined
              }
              style={{ width: "100%" }}
            >
              {filteredRegions.map((r) => (
                <Select.Option key={r.id} value={r.id}>
                  {preferLocalizedEnAr(isAr, r.nameEn, r.nameAr)}
                </Select.Option>
              ))}
            </Select>
            {renderFieldError("regionId")}
          </Col>
        ) : null}
        <Col xs={24} md={12}>
          <div className="address-picker-label">
            {t("AddressPicker.label.area")} <span className="address-picker-required">*</span>
          </div>
          <Select
            placeholder={t("AddressPicker.placeholder.area")}
            value={value.areaId}
            onChange={(v) => updateValue({ areaId: v })}
            disabled={areaDisabled}
            loading={loadingAddress}
            showSearch
            optionFilterProp="children"
            className={
              showValidationHints && fieldErrors.areaId
                ? "address-picker-select-error"
                : undefined
            }
            style={{ width: "100%" }}
          >
            {filteredAreas.map((a) => (
              <Select.Option key={a.id} value={a.id}>
                {preferLocalizedEnAr(isAr, a.nameEn, a.nameAr)}
              </Select.Option>
            ))}
          </Select>
          {renderFieldError("areaId")}
        </Col>
        <Col xs={24} md={12}>
          <div className="address-picker-label">
            {t("AddressPicker.label.street")} <span className="address-picker-required">*</span>
          </div>
          <Input.TextArea
            placeholder={t("AddressPicker.placeholder.street")}
            value={value.street}
            onChange={(e) => updateValue({ street: e.target.value })}
            disabled={isDisabled}
            maxLength={ADDRESS_STREET_MAX_LENGTH}
            showCount
            rows={4}
            className={
              showValidationHints && fieldErrors.street
                ? "address-picker-street address-picker-input-error"
                : "address-picker-street"
            }
          />
          {renderFieldError("street")}
        </Col>
      </Row>

      {/*
        Hidden when the host already provides its own map. AddressList's map mode has
        a dedicated GoogleMapPicker, so its manual mode must not show a second one.
      */}
      {shouldShowMap ? (
        <AddressMapField
          emirateList={emirates}
          interactive={!isDisabled}
          centerAddress={mapCenterAddress}
          latitude={hasCoordinates ? value.latitude : undefined}
          longitude={hasCoordinates ? value.longitude : undefined}
          currentEmirateId={value.emirateId}
          onPicked={handleMapPicked}
          hint={isDisabled ? undefined : t("AddressPicker.mapHint")}
        />
      ) : null}
    </div>
  );
});

export default AddressPicker;
