import React from "react";
import { LoadingOutlined } from "@ant-design/icons";
import { Button, Input } from "antd";
import { useMaskInputAntd } from "use-mask-input/antd";
import Search from "@/assets/icons/Search";
import { OcrInput } from "@/components/common/ocr";
import { useTranslation } from "react-i18next";

type BaseInputProps = React.ComponentProps<typeof Input>;

interface QueryInputProps extends BaseInputProps {
  onQuery?: () => void;
  queryLoading?: boolean;
  queryLabel?: string;
  showQueryButton?: boolean;
  inputMask?: string;
  ocrDisabled?: boolean;
  onOcrClick?: () => void;
  ocrTitle?: string;
}

const MaskedInput: React.FC<BaseInputProps & { mask: string }> = ({
  mask,
  ...props
}) => {
  const inputRef = useMaskInputAntd({ mask });

  return <Input {...props} ref={inputRef} />;
};

export const QueryInput: React.FC<QueryInputProps> = ({
  onQuery,
  queryLoading = false,
  queryLabel,
  showQueryButton = true,
  inputMask,
  ocrDisabled,
  onOcrClick,
  ocrTitle,
  disabled,
  ...inputProps
}) => {
  const { t } = useTranslation();
  const resolvedQueryLabel = queryLabel || t("IDSelector.common.query");
  return (
    <div className="idselector-query-input">
      <OcrInput
        ocrDisabled={ocrDisabled}
        onOcrClick={onOcrClick}
        ocrTitle={ocrTitle}
      >
        {inputMask ? (
          <MaskedInput {...inputProps} mask={inputMask} disabled={disabled} />
        ) : (
          <Input {...inputProps} disabled={disabled} />
        )}
      </OcrInput>
      {showQueryButton && (
        <Button
          type="primary"
          className="idselector-query-btn"
          disabled={disabled || queryLoading}
          title={resolvedQueryLabel}
          aria-label={resolvedQueryLabel}
          icon={queryLoading ? <LoadingOutlined spin /> : <Search />}
          onMouseDown={(event) => event.preventDefault()}
          onClick={onQuery}
        />
      )}
    </div>
  );
};

export default QueryInput;
