import React from "react";
import { useField, useForm } from "@formily/react";
import { Radio as AntdRadio, Space } from "antd";

type RadioOption = {
  label: string;
  value: string | number;
  disabled?: boolean;
};

type RadioGroupWithLayoutProps = {
  disabled?: boolean;
  readOnly?: boolean;
  layout?: "horizontal" | "vertical";
  options?: RadioOption[];
  dataSource?: RadioOption[];
  [key: string]: unknown;
};

const RadioGroupWithLayout: React.FC<RadioGroupWithLayoutProps> = (props) => {
  const field = useField();
  const form = useForm();
  const layout =
    props.layout ??
    props["x-component-props"]?.layout ??
    "horizontal";
  const {
    layout: _l,
    style,
    "x-component-props": _xcp,
    options,
    dataSource,
    children,
    ...rest
  } = props;
  const isDisabled =
    Boolean(props.disabled) ||
    Boolean(props.readOnly) ||
    field?.pattern === "disabled" ||
    field?.pattern === "readOnly" ||
    field?.pattern === "readPretty" ||
    form?.pattern === "disabled" ||
    form?.pattern === "readOnly" ||
    form?.pattern === "readPretty";

  const opts = Array.isArray(options ?? dataSource)
    ? ((options ?? dataSource) as RadioOption[])
    : [];
  const renderedChildren =
    opts.length > 0
      ? opts.map((opt) => (
          <AntdRadio
            key={String(opt.value)}
            value={opt.value}
            disabled={isDisabled || Boolean(opt.disabled)}
          >
            {opt.label}
          </AntdRadio>
        ))
      : React.Children.map(children, (child) => {
          if (!React.isValidElement(child)) {
            return child;
          }

          return React.cloneElement(
            child as React.ReactElement<{ disabled?: boolean }>,
            {
              disabled:
                isDisabled ||
                Boolean(
                  (
                    child.props as {
                      disabled?: boolean;
                    }
                  )?.disabled,
                ),
            },
          );
        });

  return (
    <AntdRadio.Group
      {...rest}
      style={isDisabled ? { ...style, pointerEvents: "none" } : style}
      disabled={isDisabled}
      onChange={isDisabled ? undefined : rest.onChange}
    >
      <Space
        direction={layout === "vertical" ? "vertical" : "horizontal"}
        size={layout === "vertical" ? "small" : "middle"}
      >
        {renderedChildren}
      </Space>
    </AntdRadio.Group>
  );
};

export default RadioGroupWithLayout;
