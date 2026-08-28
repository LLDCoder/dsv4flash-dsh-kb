import "@wangeditor/editor/dist/css/style.css";
import React, { useEffect, useState } from "react";
import { connect, mapReadPretty } from "@formily/react";
import type {
  IDomEditor,
  IEditorConfig,
  IToolbarConfig,
} from "@wangeditor/editor";
import { Editor, Toolbar } from "@wangeditor/editor-for-react";
import { i18nChangeLanguage } from "@wangeditor/editor";
import { sanitizeRichTextHtml } from "@/utils/sanitizeRichTextHtml";
import "./index.less";
export interface RichTextProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  height?: number;
  maxLength?: number;
  disabled?: boolean;
  readOnly?: boolean;
  defaultValue?: string;
}

const RichTextComponent: React.FC<RichTextProps> = (props) => {
  const {
    value,
    onChange,
    placeholder,
    height = 200,
    maxLength,
    disabled = false,
    readOnly = false,
    defaultValue,
  } = props;

  const [editor, setEditor] = useState<IDomEditor | null>(null);

  useEffect(() => {
    i18nChangeLanguage("en");
    return () => {
      if (editor == null) return;
      editor.destroy();
    };
  }, [editor]);

  const toolbarConfig: Partial<IToolbarConfig> = {
    toolbarKeys: [
      "bold",
      "underline",
      "italic",
      "bulletedList",
      "numberedList",
      "color",
      "bgColor",
      "insertLink",
      "clearStyle",
    ],
  };

  const editorConfig: Partial<IEditorConfig> = {
    placeholder: placeholder || "",
    maxLength,
    readOnly: disabled || readOnly,
  };

  const editorValue = value ?? defaultValue ?? "";

  return (
    <div className="richtext-editor">
      {editor && (
        <Toolbar
          editor={editor}
          defaultConfig={toolbarConfig}
          mode="default"
          style={{ borderBottom: "1px solid #f0f0f0" }}
        />
      )}
      <Editor
        defaultConfig={editorConfig}
        value={editorValue}
        onCreated={setEditor}
        onChange={(ed) => {
          const html = ed.getHtml();
          onChange?.(html);
        }}
        mode="default"
        style={{
          minHeight: 120,
          height,
          border: "1px solid #d9d9d9",
          borderRadius: 4,
        }}
      />
    </div>
  );
};

export const RichText = connect(
  RichTextComponent,
  mapReadPretty((props: any) => {
    const html = props.value || "";
    return (
      <div
        className="richtext-preview"
        style={{ minHeight: 24 }}
        dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(html) }}
      />
    );
  })
);

export default RichText;
