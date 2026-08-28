import * as React from 'react'
import { createBehavior, createResource } from '@designable/core'
import type { DnFC } from '@designable/react'
import type { ISchema } from '@formily/react'
import { AllLocales } from '../../locales'
import { BookTradingFormField } from './BookTradingFormField'

export const BookTradingForm: DnFC<React.ComponentProps<typeof BookTradingFormField>> =
  BookTradingFormField

const bookTradingFormSchema: ISchema = {
  type: 'object',
  properties: {},
}

BookTradingForm.Behavior = createBehavior({
  name: 'BookTradingForm',
  extends: ['Field'],
  selector: (node) => node.props?.['x-component'] === 'BookTradingForm',
  designerProps: {
    propsSchema: bookTradingFormSchema,
  },
  designerLocales: (AllLocales as any).BookTradingForm,
})

BookTradingForm.Resource = createResource({
  icon: 'SelectSource',
  elements: [
    {
      componentName: 'Field',
      props: {
        name: 'BookTrading',
        'x-decorator': 'FormItem',
        'x-component': 'BookTradingForm',
      },
    },
  ],
})
