import { createBehavior, createResource } from "@designable/core";
import { useTreeNode, useNodeIdProps } from "@designable/react";
import type { DnFC } from "@designable/react";
import { AllSchemas } from "../../schemas";
import { AllLocales } from "../../locales";
import { observer } from "@formily/react";
import VideoPlayerCore from "./components/VideoPlayerCore";
import "./styles.less";

export const Video: DnFC<any> = observer(() => {
  const node = useTreeNode();
  const nodeId = useNodeIdProps();

  const componentProps = node?.props?.["x-component-props"] || {};
  const {
    labelName = "Video",
    description,
    videoUrl,
  } = componentProps;
  const isRequired = description;

  return (
    <div {...nodeId} className="video-field-wrapper">
      <div className="video-field-container">
        <div className="video-field-label">
          {labelName}
          {isRequired && <span className="required-mark">*</span>}
        </div>

        <div className="video-field-content">
          <VideoPlayerCore videoUrl={videoUrl} />
        </div>
      </div>
    </div>
  );
});

Video.Behavior = createBehavior({
  name: "Video",
  extends: ["Field"],
  selector: (node) => node.props?.["x-component"] === "Video",
  designerProps: {
    propsSchema: (AllSchemas as any).Video,
  },
  designerLocales: (AllLocales as any).Video,
});

Video.Resource = createResource({
  icon: "CardSource",
  elements: [
    {
      componentName: "Field",
      props: {
        name: "Video",
        "x-decorator": "FormItem",
        "x-component": "Video",
        "x-component-props": {
          labelName: "Video",
          description: true,
          requiredViewing: true,
          visible: true,
        },
      },
    },
  ],
});

export default Video;
