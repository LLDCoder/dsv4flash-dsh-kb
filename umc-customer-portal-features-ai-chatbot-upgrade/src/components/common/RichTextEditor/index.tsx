import React from "react";
import { Editor, Toolbar } from "@wangeditor/editor-for-react";
import type {
  IDomEditor,
  IEditorConfig,
  IToolbarConfig,
} from "@wangeditor/editor";
import "@wangeditor/editor/dist/css/style.css";
import "./index.less";

export interface RichTextEditorProps {
  value: string;
  editor: IDomEditor | null;
  onCreated: (editor: IDomEditor) => void;
  onChange?: (html: string, editor: IDomEditor) => void;
  height?: number;
  editorConfig?: Partial<IEditorConfig>;
  toolbarConfig?: Partial<IToolbarConfig>;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  editor,
  onCreated,
  onChange,
  height = 150,
  editorConfig,
  toolbarConfig,
}) => {
  return (
    <div className="editor-wrapper">
      {editor && (
        <Toolbar editor={editor} defaultConfig={toolbarConfig} mode="default" />
      )}
      <Editor
        defaultConfig={editorConfig}
        value={value}
        onCreated={onCreated}
        onChange={(ed) => {
          const html = ed.getHtml();
          if (onChange) {
            onChange(html, ed as IDomEditor);
          }
        }}
        // style={{ height }}
        mode="default"
      />
    </div>
  );
};

export default RichTextEditor;
