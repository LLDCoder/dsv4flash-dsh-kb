import React, { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { observer, useField } from "@formily/react";
import VideoPlayerCore from "./components/VideoPlayerCore";
import { normalizeVideoUrl } from "./utils";
import "./styles.less";

type VideoFieldProps = {
  requiredViewing?: boolean;
  visible?: boolean;
  videoUrl?: string;
};

type VideoFieldValue = {
  videoUrl?: string;
  hasWatchedFully?: boolean;
};

type VideoFormilyField = {
  value?: VideoFieldValue;
  setValue: (value: VideoFieldValue) => void;
  setValidator: (validator: (value?: VideoFieldValue) => string) => void;
  validate?: () => void;
};

export const VideoField: React.FC<VideoFieldProps> = observer((props) => {
  const { t } = useTranslation();
  const field = useField() as VideoFormilyField;
  const {
    requiredViewing = true,
    visible = true,
    videoUrl,
  } = props;

  const previewUrl = useMemo(
    () => (videoUrl ? normalizeVideoUrl(videoUrl) : ""),
    [videoUrl]
  );

  useEffect(() => {
    // Mirror the configured video into the field value so validation can track watch completion.
    if (!videoUrl) return;
    if (field.value?.videoUrl === videoUrl) return;

    field.setValue({
      ...(field.value || {}),
      videoUrl,
      hasWatchedFully: false,
    });
  }, [field, videoUrl]);

  const watchCompleteValidator = useMemo(() => {
    return (value?: VideoFieldValue) => {
      // Only block form submission when this field is configured to require full playback.
      if (!visible || !requiredViewing) return "";
      if (!videoUrl) return "";
      return value?.hasWatchedFully
        ? ""
        : t("Video.validation.watchComplete");
    };
  }, [requiredViewing, t, videoUrl, visible]);

  useEffect(() => {
    // Keep validator current when props/config change in the designer.
    field.setValidator(watchCompleteValidator);
  }, [field, watchCompleteValidator]);

  const handleVideoEnded = () => {
    // Mark the field as completed once the configured video reaches the end.
    field.setValue({
      ...(field.value || {}),
      videoUrl,
      hasWatchedFully: true,
    });
    field.validate?.();
  };

  if (!visible) {
    return null;
  }

  return (
    <div className="video-field-container">
      <div className="video-field-content">
        <VideoPlayerCore videoUrl={previewUrl} onEnded={handleVideoEnded} />
      </div>
    </div>
  );
});

export default VideoField;
