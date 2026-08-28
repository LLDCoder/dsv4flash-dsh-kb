import React from 'react'
import { Checkbox as FormilyCheckbox } from '@formily/antd'
import { createBehavior, createResource } from '@designable/core'
import { DnFC } from '@designable/react'
import { createFieldSchema } from '../Field'
import { AllSchemas } from '../../schemas'
import { AllLocales } from '../../locales'
import {
  DataSourceSetter,
} from '@designable/formily-setters'

export const Checkbox: DnFC<React.ComponentProps<typeof FormilyCheckbox>> =
  FormilyCheckbox

Checkbox.Behavior = createBehavior({
  name: 'Checkbox.Group',
  extends: ['Field'],
  selector: (node) => node.props['x-component'] === 'Checkbox.Group',
  designerProps: {
    propsSchema: {
      type: 'object',
      properties: {
        'field-group': {
          type: 'void',
          'x-component': 'CollapseItem',
          properties: {
            title: {
              type: 'string',
              'x-decorator': 'FormItem',
              'x-component': 'Input',
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
            'x-validator': {
              type: 'array',
              'x-component': "ValidatorSetter",
            },
            enum: {
              'x-decorator': 'FormItem',
              'x-component': DataSourceSetter,
            },
            'x-decorator-props.style': {
              type: 'void',
              properties: {
                'style.width': {
                  type: 'string',
                  'x-decorator': 'FormItem',
                  'x-component': 'FieldWidthSetter',
                },
              },
            },
            required: {
              type: 'boolean',
              'x-decorator': 'FormItem',
              'x-component': 'Switch',
            },
            'x-display': {
              type: 'boolean',
              'x-decorator': 'FormItem',
              'x-component': 'StringSwitchSetter',
              default: 'visible',
              'x-component-props': {
                checkedValue: 'visible',
                unCheckedValue: 'none',
              },
            },
            'x-pattern': {
              type: 'boolean',
              'x-decorator': 'FormItem',
              'x-component': 'StringSwitchSetter',
              default: 'editable',
              'x-component-props': {
                checkedValue: 'editable',
                unCheckedValue: 'disabled',
              },
            },
          },
        },
      },
    },
  },
  designerLocales: AllLocales.CheckboxGroup,
})

Checkbox.Resource = createResource({
  icon: 'CheckboxGroupSource',
  elements: [
    {
      componentName: 'Field',
      props: {
        type: 'Array<string | number>',
        title: 'Checkbox Group',
        'x-decorator': 'FormItem',
        'x-component': 'Checkbox.Group',
        enum: [
          { label: 'Option1', value: 1 },
          { label: 'Option2', value: 2 },
        ],
      },
    },
  ],
})
