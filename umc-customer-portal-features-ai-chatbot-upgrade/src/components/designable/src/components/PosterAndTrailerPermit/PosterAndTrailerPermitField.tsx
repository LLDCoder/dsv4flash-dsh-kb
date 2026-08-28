import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Field as FormilyFieldModel } from "@formily/core";
import { observer, useField, useForm } from "@formily/react";
import { Button, Card, Input, Radio, Tooltip } from "antd";
import { QuestionCircleOutlined } from "@ant-design/icons";
import type { RcFile } from "antd/lib/upload";
import DocumentViewer from "@/components/common/DocumentViewer";
import CustomMessage from "@/components/common/CustomMessage";
import EmptyBox from "../../../../common/EmptyBox/EmptyBox";
import { fileUpload } from "@/services/media";
import { useTranslation } from "react-i18next";
import "./styles.less";

type TrailerSubmitType = "url" | "upload";

type TrailerItem = {
  submitType: TrailerSubmitType;
  url?: string;
  password?: string;
  fileUrl?: string;
  fileName?: string;
};

type PosterAndTrailerPermitValue = {
  posterFiles: string[];
  trailers: TrailerItem[];
};

type TrailerFieldErrors = {
  url?: string;
  password?: string;
  fileUrl?: string;
};

type ComponentProps = {
  posterTitleEn?: string;
  posterTitleAr?: string;
  trailerTitleEn?: string;
  trailerTitleAr?: string;
  posterMaxCount?: number;
  trailerMaxCount?: number;
  designMode?: boolean;
  disabled?: boolean;
};

const POSTER_ACTIVITY_IDS = new Set(["2062", "2068","2069"]);
const TRAILER_ACTIVITY_IDS = new Set(["2063", "2068","2069"]);
const POSTER_ACCEPT = ".jpg,.jpeg,.png,.pdf";
const TRAILER_ACCEPT = ".mp4";
const POSTER_MAX_SIZE_MB = 10;
const TRAILER_MAX_SIZE_MB = 100;
const DEFAULT_POSTER_MAX_COUNT = 4;
const DEFAULT_TRAILER_MAX_COUNT = 3;
const ACTIVITIES_FIELD_NAME = ["SelectTable", "SelectTableSingle"];

function isNonEditablePattern(pattern: string | undefined) {
  return (
    pattern === "disabled" ||
    pattern === "readOnly" ||
    pattern === "readPretty"
  );
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && !!item);
  }
  if (typeof value === "string" && value) {
    return [value];
  }
  return [];
}

function normalizeValue(value: unknown): PosterAndTrailerPermitValue {
  const current = value && typeof value === "object" ? (value as Partial<PosterAndTrailerPermitValue>) : {};
  const posterFiles = normalizeStringArray(current.posterFiles);
  const trailers = Array.isArray(current.trailers)
    ? current.trailers
        .filter((item): item is TrailerItem => !!item && typeof item === "object")
        .map((item): TrailerItem => ({
          submitType: item.submitType === "url" ? "url" : "upload",
          url: typeof item.url === "string" ? item.url : undefined,
          password: typeof item.password === "string" ? item.password : undefined,
          fileUrl: typeof item.fileUrl === "string" ? item.fileUrl : undefined,
          fileName: typeof item.fileName === "string" ? item.fileName : undefined,
        }))
    : [];

  return { posterFiles, trailers };
}

function getFileNameFromUrl(value?: string) {
  if (!value) return "";
  const parts = value.split("/");
  return parts[parts.length - 1] || value;
}

function isValidUrl(value?: string) {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return /^https?:$/.test(parsed.protocol);
  } catch {
    return false;
  }
}

function getActivityIds(rawValue: unknown): string[] {
  if (rawValue && typeof rawValue === "object") {
    const current = rawValue as Record<string, unknown>;
    if (Array.isArray(current.selectedKey)) {
      return current.selectedKey.map((item) => String(item)).filter(Boolean);
    }
    if (current.selectedKey !== undefined && current.selectedKey !== null && current.selectedKey !== "") {
      return [String(current.selectedKey)];
    }
  }

  if (rawValue !== undefined && rawValue !== null && rawValue !== "") {
    return [String(rawValue)];
  }

  return [];
}

function collectSelectedActivityIds(values: unknown[]): string[] {
  return values.flatMap((value) => getActivityIds(value));
}

function isSameStringArray(prev: string[], next: string[]) {
  if (prev.length !== next.length) return false;
  return prev.every((item, index) => item === next[index]);
}

function resolveLocalizedText(
  isAr: boolean,
  primary?: string,
  secondary?: string,
  fallback?: string
) {
  if (isAr && typeof primary === "string" && primary.trim()) {
    return primary;
  }

  if (!isAr && typeof secondary === "string" && secondary.trim()) {
    return secondary;
  }

  if (typeof secondary === "string" && secondary.trim()) {
    return secondary;
  }

  if (typeof primary === "string" && primary.trim()) {
    return primary;
  }

  return fallback || "";
}

function validateValue(
  value: PosterAndTrailerPermitValue,
  showPoster: boolean,
  showTrailer: boolean,
  messages: {
    required: string;
    invalidUrl: string;
  }
) {
  const errors: {
    poster?: string;
    trailers?: string;
    trailerItems: TrailerFieldErrors[];
  } = {
    trailerItems: value.trailers.map(() => ({})),
  };

  if (showPoster && value.posterFiles.length === 0) {
    errors.poster = messages.required;
  }

  if (showTrailer) {
    if (value.trailers.length === 0) {
      errors.trailers = messages.required;
    }

    value.trailers.forEach((trailer, index) => {
      if (trailer.submitType === "url") {
        if (!isValidUrl((trailer.url || "").trim())) {
          errors.trailerItems[index].url = messages.invalidUrl;
        }
        return;
      }

      if (!String(trailer.fileUrl || "").trim()) {
        errors.trailerItems[index].fileUrl = messages.required;
      }
    });
  }

  const firstTrailerItemError = errors.trailerItems.find(
    (item) => item.url || item.password || item.fileUrl
  );

  const firstError =
    errors.poster ||
    errors.trailers ||
    firstTrailerItemError?.url ||
    firstTrailerItemError?.password ||
    firstTrailerItemError?.fileUrl ||
    "";

  return {
    errors,
    firstError,
  };
}

function uploadMedia(options: {
  file: File;
  onSuccess?: (url: string) => void;
  onError?: (error: unknown) => void;
  signal?: AbortSignal;
}) {
  const { file, onSuccess, onError, signal } = options;
  const formData = new FormData();
  formData.append("files", file as Blob);
  fileUpload(formData, { timeout: 0, signal })
    .then((res) => {
      const normalized = res as { data?: string[] };
      if (normalized.data && normalized.data.length > 0) {
        onSuccess?.(normalized.data[0]);
        return;
      }
      onError?.(new Error("Upload response is empty"));
    })
    .catch((error) => {
      onError?.(error);
    });
}

export const PosterAndTrailerPermitField: React.FC<ComponentProps> = observer((props) => {
  const { t, i18n } = useTranslation();
  const field = useField<FormilyFieldModel>();
  const form = useForm();
  const isAr = Boolean(i18n.language?.startsWith("ar"));
  const {
    posterTitleEn,
    posterTitleAr,
    trailerTitleEn,
    trailerTitleAr,
    posterMaxCount = DEFAULT_POSTER_MAX_COUNT,
    trailerMaxCount = DEFAULT_TRAILER_MAX_COUNT,
    designMode: designModeProp,
    disabled,
  } = props;
  const designMode = Boolean(designModeProp ?? field.designable);
  const trailerUploadControllersRef = useRef(new Map<number, AbortController>());

  useEffect(() => {
    return () => {
      trailerUploadControllersRef.current.forEach((controller) => controller.abort());
      trailerUploadControllersRef.current.clear();
    };
  }, []);

  const messages = useMemo(
    () => ({
      posterTitle: t("PosterAndTrailerPermit.posterTitle"),
      trailerTitle: t("PosterAndTrailerPermit.trailerTitle"),
      required: t("PosterAndTrailerPermit.requiredMessage"),
      invalidUrl: t("PosterAndTrailerPermit.invalidUrlMessage"),
      posterType: t("PosterAndTrailerPermit.posterTypeMessage"),
      posterSize: t("PosterAndTrailerPermit.posterSizeMessage", {
        size: POSTER_MAX_SIZE_MB,
      }),
      trailerType: t("PosterAndTrailerPermit.trailerTypeMessage"),
      trailerSize: t("PosterAndTrailerPermit.trailerSizeMessage", {
        size: TRAILER_MAX_SIZE_MB,
      }),
      posterUploadTip: t("PosterAndTrailerPermit.posterUploadTip", {
        count: posterMaxCount,
        size: POSTER_MAX_SIZE_MB,
      }),
      trailerUploadTip: t("PosterAndTrailerPermit.trailerUploadTip", {
        size: TRAILER_MAX_SIZE_MB,
      }),
      addTrailer: t("PosterAndTrailerPermit.addTrailer"),
      emptyTrailers: t("PosterAndTrailerPermit.emptyTrailers"),
      trailerIndexedTitle: t("PosterAndTrailerPermit.trailerIndexedTitle"),
      delete: t("PosterAndTrailerPermit.delete"),
      submissionMethod: t("PosterAndTrailerPermit.submissionMethod"),
      urlLink: t("PosterAndTrailerPermit.urlLink"),
      videoFileUpload: t("PosterAndTrailerPermit.videoFileUpload"),
      trailerUrl: t("PosterAndTrailerPermit.trailerUrl"),
      password: t("PosterAndTrailerPermit.password"),
      passwordPlaceholder: t("PosterAndTrailerPermit.passwordPlaceholder"),
      videoFile: t("PosterAndTrailerPermit.videoFile"),
    }),
    [posterMaxCount, t]
  );

  const posterTitle = resolveLocalizedText(
    isAr,
    posterTitleAr,
    posterTitleEn,
    messages.posterTitle
  );
  const trailerTitle = resolveLocalizedText(
    isAr,
    trailerTitleAr,
    trailerTitleEn,
    messages.trailerTitle
  );

  const currentValue = normalizeValue(field.value);
  const [selectedActivityIds, setSelectedActivityIds] = useState<string[]>(() => {
    const activityValue = designMode
      ? ["2062", "2063"]
      : ACTIVITIES_FIELD_NAME.map((name) => form.getValuesIn(name));
    return collectSelectedActivityIds(activityValue);
  });

  useEffect(() => {
    if (designMode) {
      setSelectedActivityIds((prev) => {
        const next = ["2062", "2063"];
        return isSameStringArray(prev, next) ? prev : next;
      });
      return;
    }

    const syncSelectedActivities = () => {
      const next = collectSelectedActivityIds(
        ACTIVITIES_FIELD_NAME.map((name) => form.getValuesIn(name))
      );
      setSelectedActivityIds((prev) => (isSameStringArray(prev, next) ? prev : next));
    };

    syncSelectedActivities();

    const unsubscribe = form.subscribe((event: any) => {
      if (
        event?.type !== "onFieldInputValueChange" &&
        event?.type !== "onFieldValueChange"
      ) {
        return;
      }

      const path = event?.payload?.path?.toString?.() || "";
      if (
        !ACTIVITIES_FIELD_NAME.includes(path) &&
        !ACTIVITIES_FIELD_NAME.some((name) => path.endsWith(`.${name}`))
      ) {
        return;
      }

      syncSelectedActivities();
    });

    return () => {
      void unsubscribe;
    };
  }, [designMode, form]);

  const showPoster = designMode || selectedActivityIds.some((id) => POSTER_ACTIVITY_IDS.has(id));
  const showTrailer = designMode || selectedActivityIds.some((id) => TRAILER_ACTIVITY_IDS.has(id));
  const isDisabled = disabled || isNonEditablePattern(field.pattern);

  const validationResult = useMemo(
    () => validateValue(currentValue, showPoster, showTrailer, messages),
    [currentValue, messages, showPoster, showTrailer]
  );
  const fieldErrors = validationResult.errors;
  const showValidationHints = field.selfInvalid;
  const showPosterError = showValidationHints && Boolean(fieldErrors.poster);

  useEffect(() => {
    field.setValidator((nextValue: unknown) => {
      return validateValue(
        normalizeValue(nextValue),
        showPoster,
        showTrailer,
        messages
      ).firstError;
    });
    field.decoratorProps = {
      ...(field.decoratorProps || {}),
      feedbackLayout: "none",
    };
  }, [field, messages, showPoster, showTrailer]);

  useEffect(() => {
    if (designMode) return;

    const nextValue: Partial<PosterAndTrailerPermitValue> = {
      ...(showPoster ? { posterFiles: currentValue.posterFiles } : {}),
      ...(showTrailer ? { trailers: currentValue.trailers } : {}),
    };

    const shouldUpdate =
      (showPoster
        ? false
        : Object.prototype.hasOwnProperty.call(field.value || {}, "posterFiles")) ||
      (showTrailer
        ? false
        : Object.prototype.hasOwnProperty.call(field.value || {}, "trailers"));

    if (shouldUpdate) {
      field.setValue(nextValue);
    }
  }, [currentValue, designMode, field, showPoster, showTrailer]);

  const triggerValidate = () => {
    field.validate?.();
  };

  const updateValue = (patch: Partial<PosterAndTrailerPermitValue>) => {
    field.setValue({
      ...currentValue,
      ...patch,
    });
  };

  const handlePosterChange = (nextValue: string | string[] | undefined) => {
    updateValue({
      posterFiles: normalizeStringArray(nextValue),
    });
    triggerValidate();
  };

  const handleTrailerChange = (index: number, patch: Partial<TrailerItem>) => {
    const nextTrailers = currentValue.trailers.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      return {
        ...item,
        ...patch,
      };
    });
    updateValue({ trailers: nextTrailers });
  };

  const handleTrailerTypeChange = (index: number, submitType: TrailerSubmitType) => {
    trailerUploadControllersRef.current.get(index)?.abort();
    trailerUploadControllersRef.current.delete(index);
    const nextTrailers = currentValue.trailers.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      return {
        submitType,
        url: undefined,
        password: undefined,
        fileUrl: undefined,
        fileName: undefined,
      };
    });
    updateValue({ trailers: nextTrailers });
    triggerValidate();
  };

  const addTrailer = () => {
    if (isDisabled || currentValue.trailers.length >= trailerMaxCount) return;
    updateValue({
      trailers: [...currentValue.trailers, { submitType: "url" }],
    });
  };

  const removeTrailer = (index: number) => {
    if (isDisabled) return;
    // Removing one item shifts every later array index. Cancel all in-flight uploads so no stale
    // completion callback can write a file into a different trailer after the reindex.
    trailerUploadControllersRef.current.forEach((controller) => controller.abort());
    trailerUploadControllersRef.current.clear();
    updateValue({
      trailers: currentValue.trailers.filter((_, itemIndex) => itemIndex !== index),
    });
    triggerValidate();
  };

  const validatePosterBeforeUpload = (file: RcFile) => {
    const extension = `.${file.name.split(".").pop()?.toLowerCase() || ""}`;
    if (!POSTER_ACCEPT.split(",").includes(extension)) {
      CustomMessage.error(messages.posterType);
      return false;
    }
    if (file.size / 1024 / 1024 > POSTER_MAX_SIZE_MB) {
      CustomMessage.error(messages.posterSize);
      return false;
    }
    return true;
  };

  const createTrailerBeforeUpload = () => (file: RcFile) => {
    const extension = `.${file.name.split(".").pop()?.toLowerCase() || ""}`;
    if (extension !== ".mp4") {
      CustomMessage.error(messages.trailerType);
      return false;
    }
    if (file.size / 1024 / 1024 > TRAILER_MAX_SIZE_MB) {
      CustomMessage.error(messages.trailerSize);
      return false;
    }
    return true;
  };

  const createTrailerUploadRequest = (index: number) =>
    (options: { file: File; onSuccess?: (url: string) => void; onError?: (error: unknown) => void }) => {
      trailerUploadControllersRef.current.get(index)?.abort();
      const controller = new AbortController();
      trailerUploadControllersRef.current.set(index, controller);

      uploadMedia({
        ...options,
        signal: controller.signal,
        onSuccess: (url) => {
          if (controller.signal.aborted) return;
          if (trailerUploadControllersRef.current.get(index) !== controller) return;
          const latestTrailer = normalizeValue(field.value).trailers[index];
          if (!latestTrailer || latestTrailer.submitType !== "upload") return;
          trailerUploadControllersRef.current.delete(index);
          options.onSuccess?.(url);
        },
        onError: (error) => {
          if (trailerUploadControllersRef.current.get(index) === controller) {
            trailerUploadControllersRef.current.delete(index);
          }
          if (controller.signal.aborted) return;
          options.onError?.(error);
        },
      });
    };

  if (!showPoster && !showTrailer && !designMode) {
    return null;
  }

  return (
    <div className="poster-trailer-permit">
      {showPoster && (
        <Card
          title={
            <>
              {posterTitle}{" "}
              <span className="poster-trailer-permit__required" aria-hidden="true">
                *
              </span>
            </>
          }
          className="poster-trailer-permit__card"
        >
          <DocumentViewer
            className={[
              "poster-trailer-permit__viewer",
              showPosterError ? "poster-trailer-permit__viewer--error" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            value={currentValue.posterFiles}
            onChange={handlePosterChange}
            hasDelete
            disabled={isDisabled}
            uploadConfig={
              isDisabled
                ? undefined
                : {
                    maxCount: posterMaxCount,
                    maxSize: POSTER_MAX_SIZE_MB,
                    accept: POSTER_ACCEPT,
                    customRequest: uploadMedia,
                    beforeUpload: validatePosterBeforeUpload,
                    uploadTip: messages.posterUploadTip,
                  }
            }
          />
          {showValidationHints && fieldErrors.poster ? (
            <div className="poster-trailer-permit__error">{fieldErrors.poster}</div>
          ) : null}
        </Card>
      )}

      {showTrailer && (
        <Card
          title={
            <>
              {trailerTitle}{" "}
              <span className="poster-trailer-permit__required" aria-hidden="true">
                *
              </span>
            </>
          }
          className="poster-trailer-permit__card"
          extra={!isDisabled ? (
            <Button
              type="primary"
              onClick={addTrailer}
              disabled={isDisabled || currentValue.trailers.length >= trailerMaxCount}
            >
              {messages.addTrailer}
            </Button>
          ) : null}
        >
          {currentValue.trailers.length === 0 ? (
            <EmptyBox
              title={messages.emptyTrailers}
              customClassName="poster-trailer-permit__empty"
            />
          ) : null}

          {currentValue.trailers.map((trailer, index) => {
            const trailerErrors = fieldErrors.trailerItems[index] || {};
            const showUrlError = showValidationHints && Boolean(trailerErrors.url);
            const showPasswordError =
              showValidationHints && Boolean(trailerErrors.password);
            const showFileUrlError =
              showValidationHints && Boolean(trailerErrors.fileUrl);
            return (
              <div key={`trailer-${index}`} className="poster-trailer-permit__trailer-item">
                <div className="poster-trailer-permit__trailer-header">
                  <div className="poster-trailer-permit__trailer-title">
                    {`${messages.trailerIndexedTitle} ${index + 1}`}
                  </div>
                 {isDisabled ? null : <Button danger type="link" onClick={() => removeTrailer(index)} disabled={isDisabled}>
                    {messages.delete}
                  </Button>}  
                </div>

                {isDisabled ? null : <div className="poster-trailer-permit__field">
                  <div className="poster-trailer-permit__label">
                    {messages.submissionMethod} <span className="poster-trailer-permit__required">*</span>
                  </div>
                  <Radio.Group
                    value={trailer.submitType}
                    onChange={(event) => handleTrailerTypeChange(index, event.target.value)}
                    disabled={isDisabled}
                  >
                    <Radio value="url">{messages.urlLink}</Radio>
                    <Radio value="upload">{messages.videoFileUpload}</Radio>
                  </Radio.Group>
                </div>}

                {trailer.submitType === "url" ? (
                  <div className="poster-trailer-permit__url-fields">
                    <div className="poster-trailer-permit__field">
                      <div className="poster-trailer-permit__label">
                        {messages.trailerUrl} <span className="poster-trailer-permit__required">*</span>
                      </div>
                      <Input
                        value={trailer.url}
                        placeholder="https://"
                        disabled={isDisabled}
                        className={[
                          "poster-trailer-permit__input",
                          showUrlError ? "poster-trailer-permit__input--error" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onChange={(event) =>
                          handleTrailerChange(index, {
                            url: event.target.value,
                            fileUrl: undefined,
                            fileName: undefined,
                          })
                        }
                        onBlur={triggerValidate}
                      />
                      {showUrlError ? (
                        <div className="poster-trailer-permit__error">{trailerErrors.url}</div>
                      ) : null}
                    </div>

                    <div className="poster-trailer-permit__field">
                      <div className="poster-trailer-permit__label">
                        {messages.password}
                      </div>
                      <Input
                        value={trailer.password}
                        placeholder={messages.passwordPlaceholder}
                        disabled={isDisabled}
                        className={[
                          "poster-trailer-permit__input",
                          showPasswordError
                            ? "poster-trailer-permit__input--error"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onChange={(event) =>
                          handleTrailerChange(index, {
                            password: event.target.value,
                            fileUrl: undefined,
                            fileName: undefined,
                          })
                        }
                        onBlur={triggerValidate}
                      />
                      {showPasswordError ? (
                        <div className="poster-trailer-permit__error">{trailerErrors.password}</div>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="poster-trailer-permit__field">
                    <div className="poster-trailer-permit__label">
                      {messages.videoFile} <span className="poster-trailer-permit__required">*</span>
                      <Tooltip
                        title={messages.trailerUploadTip}
                        trigger={["hover", "focus"]}
                      >
                        <QuestionCircleOutlined
                          aria-label={messages.trailerUploadTip}
                          className="poster-trailer-permit__tooltip-icon"
                          tabIndex={0}
                        />
                      </Tooltip>
                    </div>
                    <DocumentViewer
                      className={[
                        "poster-trailer-permit__viewer",
                        showFileUrlError
                          ? "poster-trailer-permit__viewer--error"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      value={trailer.fileUrl}
                      onChange={(nextValue) => {
                        const nextFileUrl = normalizeStringArray(nextValue)[0];
                        handleTrailerChange(index, {
                          fileUrl: nextFileUrl,
                          fileName: nextFileUrl ? getFileNameFromUrl(nextFileUrl) : undefined,
                          url: undefined,
                          password: undefined,
                        });
                        triggerValidate();
                      }}
                      hasDelete
                      disabled={isDisabled}
                      uploadConfig={{
                        maxCount: 1,
                        maxSize: TRAILER_MAX_SIZE_MB,
                        accept: TRAILER_ACCEPT,
                        uploadTip: "",
                        customRequest: createTrailerUploadRequest(index),
                        beforeUpload: createTrailerBeforeUpload(),
                        onUploadSuccess: (uploadedFiles) => {
                          const uploaded = uploadedFiles[0];
                          handleTrailerChange(index, {
                            fileUrl: uploaded?.url,
                            fileName: uploaded?.name || getFileNameFromUrl(uploaded?.url),
                            url: undefined,
                            password: undefined,
                          });
                        },
                      }}
                    />
                    {showFileUrlError ? (
                      <div className="poster-trailer-permit__error">{trailerErrors.fileUrl}</div>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}

          {showValidationHints && fieldErrors.trailers ? (
            <div className="poster-trailer-permit__error">{fieldErrors.trailers}</div>
          ) : null}
        </Card>
      )}
    </div>
  );
});

export default PosterAndTrailerPermitField;
