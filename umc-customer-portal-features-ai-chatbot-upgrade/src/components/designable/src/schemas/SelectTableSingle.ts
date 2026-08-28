import { ISchema } from '@formily/react'

export const SelectTableSingle: ISchema & { Column?: ISchema } = {
  type: 'object',
  properties: {
    placeholder: {
      type: 'string',
      'x-decorator': 'FormItem',
      'x-component': 'Input',
    },
    placeholderKey: {
      type: 'string',
      'x-decorator': 'FormItem',
      'x-component': 'Input',
    },
    placeholderParams: {
      'x-decorator': 'FormItem',
      'x-component': 'ValueInput',
      'x-component-props': {
        include: ['EXPRESSION'],
      },
    },
  },
}

const Column: ISchema = {
  type: 'object',
  properties: {
  },
}

SelectTableSingle.Column = Column



