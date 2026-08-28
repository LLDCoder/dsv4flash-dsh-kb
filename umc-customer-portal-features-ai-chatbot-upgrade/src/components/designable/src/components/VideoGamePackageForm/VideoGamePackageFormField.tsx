import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { observer, useField, Field } from "@formily/react";
import { FormItem } from "@formily/antd";
import {
  Input,
  Select,
  Row,
  Col,
  Radio,
  Card as AntdCard,
  DatePicker,
  Tooltip,
  Checkbox,
} from "antd";
import { QuestionCircleOutlined } from "@ant-design/icons";
import moment from "moment";
import type { Moment } from "moment";
import DocumentViewer from "../../../../../components/common/DocumentViewer/index";
import { LanguageSelect as LanguageSelectComponent } from "../LanguageSelect/LanguageSelect";
import { ALL_COUNTRIES } from "../CountryDropdown/countries";
import { toPickerMoment } from "@/utils/dateLocale";
import "./index.less";

const { Option } = Select;
const { RangePicker } = DatePicker;

const clamp = (s: string, max: number) =>
  s.length > max ? s.slice(0, max) : s;

const GAME_PLATFORM_VALUES = [
  "Sony/Playstation",
  "Xbox",
  "Nintendo",
  "PC",
  "Mobile",
  "Other",
] as const;

const TYPE_VALUES = [
  "Action",
  "Action - Adventure",
  "Adventure",
  "Role-Playing",
  "Simulation",
  "Strategy",
] as const;

const COPYRIGHTS_TYPE_VALUES = [
  "Distribution DVD, BD & 3DBD",
  "Distribution of electronic video games",
  "Cinema Distribution",
  "Programs Distribution",
  "Distribution of songs",
] as const;

const PERMIT_LABEL_VALUES = [
  "Age Rating Permit For Video Games",
  "Distribution Of Non-Digital Video Games",
  "Distribution Of Digital Video Games",
] as const;

type VideoGamePackageFormValue = {
  addDigitalVersion?: boolean;
  gamePlatforms?: string[];
  title?: string;
  type?: string;
  languages?: (number | string)[];
  source?: string;
  copyrightsType?: string;
  copyrightStartDate?: string;
  copyrightEndDate?: string;
  digitalGameContentLink?: string;
  economyRegistrationCertificate?: unknown;
  gameMaterialContent?: unknown;
  [key: string]: unknown;
};

type OptionType = { label: string; value: string };

function isValidHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Nested Field validators must not rely on outer `current` (shadowing / stale closure). Read from ctx. */
function getPackageValueFromCtx(ctx: any): VideoGamePackageFormValue {
  const form = ctx?.form;
  const leaf = ctx?.field;
  if (!leaf) return {};
  let f: any = leaf.parent;
  let depth = 0;
  while (f && depth++ < 12) {
    let v = f.value;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const o = v as Record<string, unknown>;
      if (
        "copyrightStartDate" in o ||
        "addDigitalVersion" in o ||
        "title" in o
      ) {
        return v as VideoGamePackageFormValue;
      }
    }
    if (form && f.address != null) {
      v = form.getValuesIn(f.address);
      if (v && typeof v === "object" && !Array.isArray(v)) {
        const o = v as Record<string, unknown>;
        if (
          "copyrightStartDate" in o ||
          "addDigitalVersion" in o ||
          "title" in o
        ) {
          return v as VideoGamePackageFormValue;
        }
      }
    }
    f = f.parent;
  }
  return {};
}

export const VideoGamePackageFormField: React.FC<any> = observer((props) => {
  const { t, i18n } = useTranslation();
  const field = useField<any>();
  if (!field) {
    return null;
  }

  const currentLanguage = i18n.language ?? "";
  const requiredMessage = t("VideoGamePackageForm.validation.required");
  const current: VideoGamePackageFormValue = field.value || {};
  const [rangeDates, setRangeDates] = useState<
    [Moment | null, Moment | null] | null
  >(null);

  const [searchType, setSearchType] = useState("");
  const [searchCopyrights, setSearchCopyrights] = useState("");
  const [searchSource, setSearchSource] = useState("");
  const [searchPlatform, setSearchPlatform] = useState("");
  const [languagesSearch, setLanguagesSearch] = useState("");

  const gamePlatformOptions = useMemo<OptionType[]>(
    () =>
      GAME_PLATFORM_VALUES.map((value) => ({
        value,
        label: t(`VideoGamePackageForm.option.gamePlatform.${value}`),
      })),
    [currentLanguage, t],
  );

  const typeOptions = useMemo<OptionType[]>(
    () =>
      TYPE_VALUES.map((value) => ({
        value,
        label: t(`VideoGamePackageForm.option.type.${value}`),
      })),
    [currentLanguage, t],
  );

  const copyrightsTypeOptions = useMemo<OptionType[]>(
    () =>
      COPYRIGHTS_TYPE_VALUES.map((value) => ({
        value,
        label: t(`VideoGamePackageForm.option.copyrightsType.${value}`),
      })),
    [currentLanguage, t],
  );

  const permitLabels = useMemo(
    () =>
      PERMIT_LABEL_VALUES.map((value) =>
        t(`VideoGamePackageForm.permit.${value}`),
      ),
    [currentLanguage, t],
  );

  const countryDisplayNames = useMemo(() => {
    try {
      const DisplayNames = (Intl as any).DisplayNames;
      return DisplayNames
        ? new DisplayNames([currentLanguage || "en"], { type: "region" })
        : undefined;
    } catch {
      return undefined;
    }
  }, [currentLanguage]);

  const countryOptions = useMemo<OptionType[]>(
    () =>
      ALL_COUNTRIES.map((item) => ({
        value: item.label,
        label: countryDisplayNames?.of(item.value) || item.label,
      })),
    [countryDisplayNames],
  );

  useEffect(() => {
    const v = (field.value || {}) as VideoGamePackageFormValue;
    if (v.addDigitalVersion === undefined) {
      field.setValue({ ...v, addDigitalVersion: false });
    }
  }, [field]);

  const handleFieldChange = (key: string, value: unknown) => {
    const newValue: VideoGamePackageFormValue = {
      ...current,
      [key]: value,
    };

    if (key === "addDigitalVersion" && value === false) {
      newValue.gamePlatforms = undefined;
    }

    field.setValue(newValue);
  };

  /** RangePicker must set start+end in one setValue; two handleFieldChange calls race on stale `current`. */
  const handleCopyrightRangeChange = (
    dates: [Moment | null, Moment | null] | null
  ) => {
    const base = (field.value || {}) as VideoGamePackageFormValue;
    if (dates && dates.length === 2 && dates[0] && dates[1]) {
      field.setValue({
        ...base,
        copyrightStartDate: dates[0].format("YYYY-MM-DD"),
        copyrightEndDate: dates[1].format("YYYY-MM-DD"),
      });
    } else {
      field.setValue({
        ...base,
        copyrightStartDate: undefined,
        copyrightEndDate: undefined,
      });
    }
  };

  const renderLabel = (
    label: string,
    required: boolean = true,
    tooltip?: string
  ) => (
    <div className="game-form-label">
      <span>
        {label}
        {required && <span className="game-form-required">*</span>}
      </span>
      {tooltip && (
        <Tooltip title={tooltip}>
          <QuestionCircleOutlined className="game-form-tooltip" />
        </Tooltip>
      )}
    </div>
  );

  const renderSelectSearchable = (
    name: keyof VideoGamePackageFormValue,
    label: string,
    options: OptionType[],
    required: boolean,
    placeholder: string,
    searchValue: string,
    setSearchValue: (v: string) => void
  ) => {
    return (
      <Field
        name={name as string}
        decorator={[FormItem]}
        validator={(value) => {
          if (required && (value === undefined || value === null || value === ""))
            return requiredMessage;
          return "";
        }}
      >
        {renderLabel(label, required)}
        <Select
          showSearch
          disabled={props.disabled}
          placeholder={placeholder}
          value={current[name] as string | undefined}
          onChange={(v) => handleFieldChange(name as string, v)}
          optionFilterProp="label"
          filterOption={(input, opt) =>
            (opt?.label as string)
              ?.toLowerCase()
              .includes(input.toLowerCase()) ?? false
          }
          onSearch={(v) => setSearchValue(clamp(v, 50))}
          searchValue={searchValue}
          onSelect={() => setSearchValue("")}
          onDropdownVisibleChange={(open) => {
            if (!open) setSearchValue("");
          }}
        >
          {options.map((o) => (
            <Option key={o.value} value={o.value} label={o.label}>
              {o.label}
            </Option>
          ))}
        </Select>
      </Field>
    );
  };

  const renderCountrySelect = () => {
    const name = "source";
    return (
      <Field
        name={name}
        decorator={[FormItem]}
        validator={(value) => {
          if (!value) return requiredMessage;
          return "";
        }}
      >
        {renderLabel(t("VideoGamePackageForm.label.source"), true)}
        <Select
          showSearch
          disabled={props.disabled}
          placeholder={t("VideoGamePackageForm.placeholder.countries")}
          value={current.source}
          onChange={(v) => handleFieldChange("source", v)}
          optionFilterProp="label"
          filterOption={(input, opt) =>
            (opt?.label as string)
              ?.toLowerCase()
              .includes(input.toLowerCase()) ?? false
          }
          onSearch={(v) => setSearchSource(clamp(v, 50))}
          searchValue={searchSource}
          onSelect={() => setSearchSource("")}
          onDropdownVisibleChange={(open) => {
            if (!open) setSearchSource("");
          }}
        >
          {countryOptions.map((o) => (
            <Option key={o.value} value={o.value} label={o.label}>
              {o.label}
            </Option>
          ))}
        </Select>
      </Field>
    );
  };

  const renderGamePlatformMulti = () => {
    const selectedValues = Array.isArray(current.gamePlatforms)
      ? current.gamePlatforms
      : [];
    const allSelected =
      gamePlatformOptions.length > 0 &&
      gamePlatformOptions.every((option) => selectedValues.includes(option.value));
    const hasSelectedValues = gamePlatformOptions.some((option) =>
      selectedValues.includes(option.value),
    );
    const handleSelectAll = (checked: boolean) => {
      if (props.disabled || gamePlatformOptions.length === 0) return;
      handleFieldChange(
        "gamePlatforms",
        checked ? gamePlatformOptions.map((option) => option.value) : [],
      );
    };

    return (
      <Field
        name="gamePlatforms"
        decorator={[FormItem]}
        validator={(value) => {
          if (!value || !Array.isArray(value) || value.length === 0)
            return requiredMessage;
          return "";
        }}
      >
        {renderLabel(t("VideoGamePackageForm.label.gamePlatform"), true)}
        <Select
          mode="multiple"
          disabled={props.disabled}
          className="video-game-package-multi-select"
          dropdownClassName="video-game-package-multi-select-dropdown"
          placeholder={t("VideoGamePackageForm.placeholder.platforms")}
          value={current.gamePlatforms}
          onChange={(v) => handleFieldChange("gamePlatforms", v)}
          showSearch
          optionFilterProp="title"
          filterOption={(input, opt) =>
            (opt?.title as string)
              ?.toLowerCase()
              .includes(input.toLowerCase()) ?? false
          }
          onSearch={(v) => setSearchPlatform(clamp(v, 50))}
          searchValue={searchPlatform}
          onSelect={() => setSearchPlatform("")}
          onDropdownVisibleChange={(open) => {
            if (!open) setSearchPlatform("");
          }}
          dropdownRender={(menu) => (
            <div>
              <div className="video-game-package-multi-select-all">
                <Checkbox
                  className={
                    hasSelectedValues && !allSelected
                      ? "video-game-package-multi-select-all-checkbox has-selection"
                      : "video-game-package-multi-select-all-checkbox"
                  }
                  checked={allSelected}
                  disabled={props.disabled || gamePlatformOptions.length === 0}
                  onChange={(event) => handleSelectAll(event.target.checked)}
                >
                  {t("LanguageSelectMulti.selectAll")}
                </Checkbox>
              </div>
              <div>{menu}</div>
            </div>
          )}
        >
          {gamePlatformOptions.map((o) => (
            <Option
              key={o.value}
              value={o.value}
              title={o.label}
              label={
                <div className="video-game-package-multi-selection-item">
                  <Checkbox checked />
                  <span>{o.label}</span>
                </div>
              }
            >
              <div className="video-game-package-multi-option">
                <Checkbox checked={selectedValues.includes(o.value)} />
                <span>{o.label}</span>
              </div>
            </Option>
          ))}
        </Select>
      </Field>
    );
  };

  const renderTitleInput = () => (
    <Field
      name="title"
      decorator={[FormItem]}
      validator={(value) => {
        if (!value || String(value).trim() === "") return requiredMessage;
        return "";
      }}
    >
      {renderLabel(t("VideoGamePackageForm.label.title"), true)}
      <Input
        disabled={props.disabled}
        placeholder={t("VideoGamePackageForm.placeholder.title")}
        value={current.title || ""}
        maxLength={200}
        onChange={(e) =>
          handleFieldChange("title", clamp(e.target.value, 200))
        }
      />
    </Field>
  );

  const renderDigitalLinkInput = () => (
    <Field
      name="digitalGameContentLink"
      decorator={[FormItem]}
      validator={(value) => {
        if (!value || String(value).trim() === "") return requiredMessage;
        const s = String(value).trim();
        if (!isValidHttpUrl(s)) return t("VideoGamePackageForm.validation.url");
        return "";
      }}
    >
      {renderLabel(t("VideoGamePackageForm.label.digitalGameContentLink"), true)}
      <Input
        disabled={props.disabled}
        placeholder={t("VideoGamePackageForm.placeholder.digitalGameContentLink")}
        value={current.digitalGameContentLink || ""}
        maxLength={2048}
        onChange={(e) =>
          handleFieldChange(
            "digitalGameContentLink",
            clamp(e.target.value, 2048)
          )
        }
      />
    </Field>
  );

  const renderLanguageSelect = () => (
    <Field
      name="languages"
      decorator={[FormItem]}
      validator={(value) => {
        if (!value || !Array.isArray(value) || value.length === 0)
          return requiredMessage;
        return "";
      }}
    >
      {renderLabel(t("VideoGamePackageForm.label.languages"), true)}
      <LanguageSelectComponent
        className="game-form-language"
        disabled={props.disabled}
        multiple={true}
        showSearch
        searchValue={languagesSearch}
        onSearch={(v: string) => setLanguagesSearch(clamp(v, 50))}
        onSelect={() => setLanguagesSearch("")}
        onDropdownVisibleChange={(open: boolean) => {
          if (!open) setLanguagesSearch("");
        }}
        filterOption={(input: string, option: any) =>
          String(option?.nameEn ?? option?.label ?? "")
            .toLowerCase()
            .includes(String(input).toLowerCase())
        }
        placeholder={t("VideoGamePackageForm.placeholder.languages")}
        value={
          current.languages
            ? typeof current.languages === "string"
              ? (current.languages as string)
                  .split(",")
                  .map((v: string) => Number(v.trim()) || v.trim())
              : current.languages
            : undefined
        }
        onChange={(value: unknown) => handleFieldChange("languages", value)}
      />
    </Field>
  );

  const renderDateRangePicker = () => (
    <Field
      name="copyrightStartDate"
      decorator={[FormItem]}
      validator={(_value, _rule, ctx) => {
        const pkg = getPackageValueFromCtx(ctx);
        const start = pkg.copyrightStartDate;
        const end = pkg.copyrightEndDate;
        if (!start || !end) return requiredMessage;
        if (moment(start).isBefore(moment(), "day"))
          return t("VideoGamePackageForm.validation.startTodayOrLater");
        if (moment(end).isSameOrBefore(moment(start), "day"))
          return t("VideoGamePackageForm.validation.endAfterStart");
        return "";
      }}
    >
      {renderLabel(t("VideoGamePackageForm.label.copyrightValidityPeriod"), true)}
      <RangePicker
        disabled={props.disabled}
        style={{ width: "100%" }}
        format="DD/MM/YYYY"
        className="video-game-package-form-date-range-picker"
        placeholder={[
          t("VideoGamePackageForm.placeholder.startDate"),
          t("VideoGamePackageForm.placeholder.endDate"),
        ]}
        value={
          current.copyrightStartDate && current.copyrightEndDate
            ? [
                toPickerMoment(current.copyrightStartDate, "YYYY-MM-DD"),
                toPickerMoment(current.copyrightEndDate, "YYYY-MM-DD"),
              ]
            : null
        }
        onCalendarChange={(dates) => {
          setRangeDates(dates as [Moment | null, Moment | null]);
        }}
        onOpenChange={(open) => {
          if (!open) setRangeDates(null);
        }}
        onChange={(dates) => handleCopyrightRangeChange(dates)}
        disabledDate={(date) => {
          if (!date) return false;
          if (date < moment().startOf("day")) return true;
          if (rangeDates && rangeDates[0] && !rangeDates[1]) {
            return date <= rangeDates[0].clone().startOf("day");
          }
          return false;
        }}
      />
    </Field>
  );

  const renderUpload = (
    name: keyof VideoGamePackageFormValue,
    label: string,
    required: boolean,
    tooltip: string
  ) => (
    <Field
      name={name as string}
      decorator={[FormItem]}
      validator={(value) => {
        if (required && !value) return requiredMessage;
        return "";
      }}
    >
      {renderLabel(label, required, tooltip)}
      <DocumentViewer
        hasDelete={true}
        disabled={props.disabled}
        value={current[name] as string | string[] | undefined}
        onChange={(value) => handleFieldChange(name as string, value)}
        uploadConfig={{
          maxCount: 1,
          maxSize: 5,
          uploadTip: tooltip,
          accept: ".pdf",
        }}
      />
    </Field>
  );

  const renderRadioDigital = () => (
    <Field
      name="addDigitalVersion"
      decorator={[FormItem]}
      validator={(value) => {
        if (value === undefined || value === null) return requiredMessage;
        return "";
      }}
    >
      {renderLabel(t("VideoGamePackageForm.label.addDigitalVersion"), true)}
      <Radio.Group
        disabled={props.disabled}
        className="game-form-radio"
        value={current.addDigitalVersion === true ? "yes" : "no"}
        onChange={(e) =>
          handleFieldChange("addDigitalVersion", e.target.value === "yes")
        }
      >
        <Radio value="yes">{t("VideoGamePackageForm.common.yes")}</Radio>
        <Radio value="no">{t("VideoGamePackageForm.common.no")}</Radio>
      </Radio.Group>
    </Field>
  );

  const isDigital = current.addDigitalVersion === true;

  return (
    <div className="video-game-package-form-container" {...props}>
      <AntdCard
        title={
          <span data-content-editable="x-component-props.title">
            {t("VideoGamePackageForm.title")}
          </span>
        }
      >
        <div className="vgp-permit-section">
          <div className="vgp-permit-title">
            {t("VideoGamePackageForm.section.permitTypes")}
          </div>
          {permitLabels.map((text) => (
            <Checkbox key={text} checked disabled>
              {text}
            </Checkbox>
          ))}
        </div>

        <Row gutter={[24, 24]}>
          <Col xs={24} md={12}>{renderRadioDigital()}</Col>

          {isDigital && (
            <Col xs={24} md={12}>{renderGamePlatformMulti()}</Col>
          )}

          <Col xs={24} md={12}>{renderTitleInput()}</Col>

          <Col xs={24} md={12}>
            {renderSelectSearchable(
              "type",
              t("VideoGamePackageForm.label.type"),
              typeOptions,
              true,
              t("VideoGamePackageForm.placeholder.artistWorkType"),
              searchType,
              setSearchType
            )}
          </Col>

          <Col xs={24} md={12}>{renderLanguageSelect()}</Col>

          <Col xs={24} md={12}>{renderCountrySelect()}</Col>

          <Col xs={24} md={12}>
            {renderSelectSearchable(
              "copyrightsType",
              t("VideoGamePackageForm.label.copyrightsType"),
              copyrightsTypeOptions,
              true,
              t("VideoGamePackageForm.placeholder.copyrightsType"),
              searchCopyrights,
              setSearchCopyrights
            )}
          </Col>

          <Col xs={24} md={12}>{renderDateRangePicker()}</Col>

          <Col xs={24} md={12}>{renderDigitalLinkInput()}</Col>

          <Col xs={24} md={12}>
            {renderUpload(
              "economyRegistrationCertificate",
              t("VideoGamePackageForm.label.economyCertificate"),
              true,
              t("VideoGamePackageForm.uploadTip.economyCertificate")
            )}
          </Col>

          <Col xs={24} md={12}>
            {renderUpload(
              "gameMaterialContent",
              t("VideoGamePackageForm.label.gameMaterialContent"),
              false,
              t("VideoGamePackageForm.uploadTip.gameMaterialContent")
            )}
          </Col>
        </Row>
      </AntdCard>
    </div>
  );
});

VideoGamePackageFormField.displayName = "VideoGamePackageFormField";

export default VideoGamePackageFormField;
