import React from 'react'
import { Information as InformationCompoent } from './Information.tsx'
import { createBehavior, createResource } from '@designable/core'
import { DnFC } from '@designable/react'
import { AllSchemas } from '../../schemas'
import { createFieldSchema } from '../Field'
import { AllLocales } from '../../locales'

export const Information: DnFC<React.ComponentProps<typeof InformationCompoent>> =
  InformationCompoent

Information.Behavior = createBehavior({
  name: 'Information',
  extends: ['Field'],
  selector: (node) => node.props['x-component'] === 'Information',
  designerProps: {
    propsSchema: createFieldSchema(AllSchemas.Information),
  },
  designerLocales: AllLocales.Information,
})

Information.Resource = createResource({
  icon: "SelectSource",
  elements: [
    {
      componentName: "Field",
      props: {
        // title: "Information",
        "x-decorator": "FormItem",
        "x-component": "Information",
      },
    },
  ],
})
