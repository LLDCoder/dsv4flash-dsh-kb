import React from 'react'
import { CountryDropdown as CountryDropdownComponent } from './CountryDropdown.tsx'
import { createBehavior, createResource } from '@designable/core'
import type { DnFC } from '@designable/react'
import { connect, mapProps } from '@formily/react'
import { AllLocales } from '../../locales'


export const CountryDropdown: DnFC<React.ComponentProps<typeof CountryDropdownComponent>> =
  connect(
    CountryDropdownComponent,
    mapProps((props, field) => ({
      ...props,
      designMode: field?.designable ? true : false,
    }))
  )
CountryDropdown.Behavior = createBehavior({
  name: 'CountryDropdown',
  extends: ['Field'],
  selector: (node) => node.props?.['x-component'] === 'CountryDropdown',
  designerProps: {
    propsSchema: {
      "type": "object",
      "properties": {
        "field-group": {
            "type": "void",
            "x-component": "CollapseItem",
            "properties": {
                // "name": {
                //     "type": "string",
                //     "x-decorator": "FormItem",
                //     "x-component": "Input"
                // },
                "title": {
                    "type": "string",
                    "x-decorator": "FormItem",
                    "x-component": "Input",
                },
                "x-decorator-props": {
                    "type": "object",
                    "properties": {
                        "tooltip": {
                            "type": "string",
                            "x-decorator": "FormItem",
                            "x-component": "Input"
                        }
                    }
                },
                "x-component-props": {
                  "type": "object",
                  "properties": {
                      "placeholder": {
                          "type": "string",
                          "x-decorator": "FormItem",
                          "x-component": "Input",
                      },
                  }
                },
                "x-decorator-props.style": {
                    "type": "void",
                    "properties": {
                        "style.width": {
                            "type": "string",
                            "x-decorator": "FormItem",
                            "x-component": "FieldWidthSetter"
                        },
                    }
                },
                "required": {
                    "type": "boolean",
                    "x-decorator": "FormItem",
                    "x-component": "Switch"
                },
                "x-display": {
                  "type": "boolean",
                  "x-decorator": "FormItem",
                  "x-component": "StringSwitchSetter",
                  "default": 'visible',
                  "x-component-props": {
                    "checkedValue": "visible",
                    "unCheckedValue": "none"
                  },
                },
                "x-pattern": {
                  "type": "boolean",
                  "x-decorator": "FormItem",
                  "x-component": "StringSwitchSetter",
                  "default": 'editable',
                  "x-component-props": {
                    "checkedValue": "editable",
                    "unCheckedValue": "disabled"
                  },
                }
            }
        }
      },
    },
  },
  designerLocales: AllLocales.CountryDropdown,
})

CountryDropdown.Resource = createResource({
  icon: "SelectSource",
  elements: [
    {
      componentName: "Field",
      props: {
        title: "Country Dropdown",
        "x-decorator": "FormItem",
        "x-component": "CountryDropdown",
        "x-component-props": {
          "title": "Country Dropdown",
        },
      },
    },
  ],
})
