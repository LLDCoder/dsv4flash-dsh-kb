import React from 'react'
import { Card as AntdCard } from 'antd'
import CustomizeAddressComponent from './CustomizeAddress'
import { createBehavior, createResource } from '@designable/core'
import { connect, mapProps } from '@formily/react'
import {  DnFC, } from '@designable/react'
import { AllSchemas } from '../../schemas'
import { createVoidFieldSchema } from '../Field'
import { AllLocales } from '../../locales'

// export const Address: DnFC<React.ComponentProps<typeof AntdCard>> = (props) => {
//   return (
//     <AntdCard
//       {...props}
//       title={
//         <span data-content-editable="x-component-props.title">
//           Address
//         </span>
//       }
//     >
//       {props.children}
//     </AntdCard>
//   )
// }

export const CustomizeAddress: DnFC<React.ComponentProps<typeof AntdCard>> = connect(
  CustomizeAddressComponent,
  mapProps(
    (props) => {
      console.log("props--------->", props);
      return { ...props }
    }
  )
)

CustomizeAddress.Behavior = createBehavior({
  name: 'CustomizeAddress',
  extends: ['Field'],
  selector: (node) => node.props['x-component'] === 'CustomizeAddress',
  designerProps: {
    droppable: true,
    defaultProps: {
      name: 'customizeAddress'
    },
    propsSchema: createVoidFieldSchema(AllSchemas.CustomizeAddress),
  },
  designerLocales: AllLocales.CustomizeAddress,
})

CustomizeAddress.Resource = createResource({
  title: {'en-US': 'CustomizeAddress' },
  icon: 'FontColorsOutlined',
  elements: [
    {
      componentName: 'Field',
      props: {
        type: 'object',
        'x-component': 'CustomizeAddress',
        'x-decorator': 'FormItem',
        title: 'Address Fields',
        name: 'customizeAddress',
        properties: {
          grid: {
            type: 'void',
            'x-component': 'FormGrid',
            'x-component-props': {
              maxColumns: 2,
              minColumns: 2,
              columnGap: 24,
              rowGap: 12
            },
            properties: {
              emirate: {
                type: 'string',
                title: 'Emirate',
                'x-decorator': 'FormItem',
                'x-component': 'Select'
              },
              region: {
                type: 'string',
                title: 'Region',
                'x-decorator': 'FormItem',
                'x-component': 'Select'
              },
              area: {
                type: 'string',
                title: 'Area',
                'x-decorator': 'FormItem',
                'x-component': 'Select'
              },
              street: {
                type: 'string',
                title: 'Street',
                'x-decorator': 'FormItem',
                'x-component': 'Input'
              }
            }
          }
        }
      }
    }
  ],
})

