import React, { useCallback, useRef, useState } from "react";
import { Form, Input } from "antd";
import type { FormInstance } from "antd/lib/form";
import { useTranslation } from "react-i18next";
import GoogleMapPicker from "@/components/designable/src/components/FilmingLocations/GoogleMapPicker";
// Shared with Filming Locations so every map picker agrees on what counts as a match.
// The picker pins the Maps UI to English while GetEmirateList answers in the request
// language, so the matcher has to bridge the two scripts, not just compare nameEn.
import { findMatchingEmirate } from "@/components/designable/src/components/AddressList/emirateMatching";
import ConfirmModal from "../ConfirmModal";
import "./index.less";

export interface AddressMapPickerFieldNames {
  emirate: string;
  region: string;
  area: string;
  street: string;
  latitude: string;
  longitude: string;
}

export interface AddressMapPickerEmirate {
  id: number;
  nameEn: string;
  nameAr?: string;
  /** Untranslated by the backend, so it is what the matcher falls back to under Arabic. */
  code?: string;
}

export interface AddressMapPick {
  street?: string;
  emirateId: number;
  /** False when the pin stayed inside the emirate already selected. */
  emirateChanged: boolean;
  latitude: number;
  longitude: number;
}

interface AddressMapFieldProps {
  emirateList: AddressMapPickerEmirate[];
  /** False while the form is read-only; clicks are ignored and no pin is dropped. */
  interactive: boolean;
  /** Restores a stored pin on load. */
  latitude?: number;
  longitude?: number;
  /** Centers an address without creating a pin when coordinates are unavailable. */
  centerAddress?: string;
  /** The emirate currently selected, to decide whether the hierarchy must reset. */
  currentEmirateId?: number;
  onPicked: (pick: AddressMapPick) => void;
  hint?: string;
}

/**
 * The map itself, free of any form library: it validates the pin against the emirate
 * lookup and hands the caller a resolved pick.
 *
 * Region and Area are deliberately never derived. The geocoder resolves nothing below
 * emirate level, so any guess would seat the address in a region the user never chose,
 * and silently. They stay for the user to pick.
 */
export const AddressMapField: React.FC<AddressMapFieldProps> = ({
  emirateList,
  interactive,
  latitude,
  longitude,
  centerAddress,
  currentEmirateId,
  onPicked,
  hint,
}) => {
  const { t } = useTranslation();
  const [emirateNotAllowed, setEmirateNotAllowed] = useState(false);

  // GoogleMapPicker rebuilds the map whenever onLocationSelect changes identity, and
  // most of what this handler needs is unstable — onPicked is typically a fresh
  // function each render, and the emirate it reads is one the pick itself changes.
  // Listing those as deps tore the map down mid-click, taking the new pin with it, so
  // read them through a ref and keep the callback identity fixed.
  const latest = useRef({ emirateList, interactive, currentEmirateId, onPicked });
  latest.current = { emirateList, interactive, currentEmirateId, onPicked };

  const handleLocationSelect = useCallback(
    ({
      address,
      emirateName,
      latitude: pinLat,
      longitude: pinLng,
    }: {
      address?: string;
      emirateName?: string;
      latitude: number;
      longitude: number;
    }) => {
      const current = latest.current;
      if (!current.interactive) return false;

      // The emirate lookup is the service area: a pin the geocoder cannot place in one
      // of them is outside the UAE, or in an emirate this form does not serve. Reject it
      // rather than fill a street the hierarchy can never validate — returning false
      // also stops the picker dropping a marker there.
      const matched = findMatchingEmirate(emirateName, current.emirateList);
      if (!matched) {
        setEmirateNotAllowed(true);
        return false;
      }

      current.onPicked({
        street: address,
        emirateId: matched.id,
        emirateChanged: matched.id !== current.currentEmirateId,
        latitude: pinLat,
        longitude: pinLng,
      });
      return true;
    },
    [],
  );

  return (
    <>
      <div className="address-map">
        <GoogleMapPicker
          centerAddress={centerAddress}
          interactive={interactive}
          latitude={latitude}
          longitude={longitude}
          onLocationSelect={handleLocationSelect}
        />
        {hint ? <span className="address-map__hint">{hint}</span> : null}
      </div>

      <ConfirmModal
        visible={emirateNotAllowed}
        type="warning"
        title={t("AddressList.validation.title")}
        content={t("AddressList.validation.mapEmirateNotAllowed")}
        cancelText=""
        confirmText={t("common.ok")}
        onCancel={() => setEmirateNotAllowed(false)}
        onConfirm={() => setEmirateNotAllowed(false)}
      />
    </>
  );
};

interface AddressMapPickerProps {
  form: FormInstance;
  emirateList: AddressMapPickerEmirate[];
  /** Field names differ per form — personal uses addressStreet, establishment street. */
  fieldNames: AddressMapPickerFieldNames;
  interactive: boolean;
  /** Runs after a matched emirate is written, to refresh the dependent region list. */
  onEmirateMatched?: (emirateId: number) => void;
  hint: string;
}

/** antd Form binding for AddressMapField, used by the profile pages. */
const AddressMapPicker: React.FC<AddressMapPickerProps> = ({
  form,
  emirateList,
  fieldNames,
  interactive,
  onEmirateMatched,
  hint,
}) => {
  const latitude = Form.useWatch(fieldNames.latitude, form);
  const longitude = Form.useWatch(fieldNames.longitude, form);
  const currentEmirateId = Form.useWatch(fieldNames.emirate, form);

  const handlePicked = useCallback(
    ({ street, emirateId, emirateChanged, latitude: lat, longitude: lng }: AddressMapPick) => {
      // A pin resolves only to an emirate and street, never to Region/Area, so any
      // Region/Area chosen earlier now describes a different spot than the new pin.
      // Clear them on every pick and let the user reselect (AC-09) rather than submit
      // a Region/Area that disagrees with the street and coordinates.
      const next: Record<string, unknown> = {
        [fieldNames.emirate]: emirateId,
        [fieldNames.region]: undefined,
        [fieldNames.area]: undefined,
        [fieldNames.latitude]: lat,
        [fieldNames.longitude]: lng,
      };
      if (street) next[fieldNames.street] = street;
      form.setFieldsValue(next);
      // The dependent region list only needs reloading when the emirate itself changed.
      if (emirateChanged) onEmirateMatched?.(emirateId);
    },
    [form, fieldNames, onEmirateMatched],
  );

  return (
    <>
      {/*
        Mounted unconditionally and kept out of sight rather than rendered behind a
        condition: antd only returns registered fields from validateFields(), so a field
        that unmounts reads back as undefined and is blanked on the next save.
      */}
      <Form.Item name={fieldNames.latitude} hidden noStyle>
        <Input type="hidden" />
      </Form.Item>
      <Form.Item name={fieldNames.longitude} hidden noStyle>
        <Input type="hidden" />
      </Form.Item>

      <AddressMapField
        emirateList={emirateList}
        interactive={interactive}
        latitude={latitude}
        longitude={longitude}
        currentEmirateId={currentEmirateId}
        onPicked={handlePicked}
        hint={hint}
      />
    </>
  );
};

export default AddressMapPicker;
