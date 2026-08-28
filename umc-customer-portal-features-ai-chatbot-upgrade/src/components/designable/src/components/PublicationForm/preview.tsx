import * as React from 'react'
import { createBehavior, createResource } from '@designable/core'
import { DnFC } from '@designable/react'
import { ISchema } from '@formily/react'
import { AllLocales } from '../../locales'
import { PublicationFormField } from './PublicationFormField'

export const PublicationForm: DnFC<React.ComponentProps<typeof PublicationFormField>> =
  PublicationFormField

const publicationFormSchema: ISchema = {
  type: 'object',
  properties: {
    'field-group': {
      type: 'void',
      'x-component': 'CollapseItem',
      properties: {
        name: {
          type: 'string',
          'x-decorator': 'FormItem',
          'x-component': 'Input',
        },
      },
    },
  },
}

PublicationForm.Behavior = createBehavior({
  name: 'PublicationForm',
  extends: ['Field'],
  selector: (node) => node.props['x-component'] === 'PublicationForm',
  designerProps: {
    propsSchema: publicationFormSchema,
  },
  designerLocales: AllLocales.PublicationForm,
})

PublicationForm.Resource = createResource({
  icon: 'SelectSource',
  elements: [
    {
      componentName: 'Field',
      props: {
        name:'Printing Permit',
        'x-decorator': 'FormItem',
        'x-decorator-props': {
          label: false,
        },
        'x-component': 'PublicationForm',
      },
    },
  ],
})
