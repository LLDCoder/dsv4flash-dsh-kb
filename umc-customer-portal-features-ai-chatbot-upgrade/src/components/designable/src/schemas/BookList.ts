import { ISchema } from '@formily/react'

export const BookList: ISchema = {
  type: 'object',
  properties: {
    totalQuantity: {
      type: 'number',
      title: 'Total Quantity',
      'x-decorator': 'FormItem',
      'x-component': 'InputNumber',
      'x-component-props': {
        placeholder: 'Total quantity of books',
        min: 0,
      },
    },
    totalWeight: {
      type: 'number',
      title: 'Total Weight',
      'x-decorator': 'FormItem',
      'x-component': 'InputNumber',
      'x-component-props': {
        placeholder: 'Total weight in kg',
        min: 0,
        step: 0.1,
      },
    },
    bookList: {
      type: 'array',
      title: 'Book List',
      items: {
        type: 'object',
        properties: {
          isbn: {
            type: 'string',
            title: 'ISBN',
            'x-decorator': 'FormItem',
            'x-component': 'Input',
            'x-component-props': {
              placeholder: 'Enter ISBN',
            },
          },
          title: {
            type: 'string',
            title: 'Title',
            'x-decorator': 'FormItem',
            'x-component': 'Input',
            'x-component-props': {
              placeholder: 'Enter book title',
            },
          },
          author: {
            type: 'string',
            title: 'Author',
            'x-decorator': 'FormItem',
            'x-component': 'Input',
            'x-component-props': {
              placeholder: 'Enter author name',
            },
          },
          category: {
            type: 'string',
            title: 'Category',
            'x-decorator': 'FormItem',
            'x-component': 'Select',
            'x-component-props': {
              placeholder: 'Select category',
            },
          },
          language1: {
            type: 'string',
            title: 'Language 1',
            'x-decorator': 'FormItem',
            'x-component': 'Select',
            'x-component-props': {
              placeholder: 'Select primary language',
            },
          },
          language2: {
            type: 'string',
            title: 'Language 2',
            'x-decorator': 'FormItem',
            'x-component': 'Select',
            'x-component-props': {
              placeholder: 'Select secondary language',
            },
          },
          quantity: {
            type: 'number',
            title: 'Quantity',
            'x-decorator': 'FormItem',
            'x-component': 'InputNumber',
            'x-component-props': {
              placeholder: 'Enter quantity',
              min: 1,
            },
          },
        },
      },
    },
    serviceFees: {
      type: 'object',
      title: 'Service Fees',
      properties: {
        processingFee: {
          type: 'number',
          title: 'Processing Fee',
          'x-decorator': 'FormItem',
          'x-component': 'InputNumber',
          'x-component-props': {
            placeholder: 'Processing fee amount',
            min: 0,
            step: 0.01,
          },
        },
        shippingFee: {
          type: 'number',
          title: 'Shipping Fee',
          'x-decorator': 'FormItem',
          'x-component': 'InputNumber',
          'x-component-props': {
            placeholder: 'Shipping fee amount',
            min: 0,
            step: 0.01,
          },
        },
        handlingFee: {
          type: 'number',
          title: 'Handling Fee',
          'x-decorator': 'FormItem',
          'x-component': 'InputNumber',
          'x-component-props': {
            placeholder: 'Handling fee amount',
            min: 0,
            step: 0.01,
          },
        },
        total: {
          type: 'number',
          title: 'Total Fee',
          'x-decorator': 'FormItem',
          'x-component': 'InputNumber',
          'x-component-props': {
            placeholder: 'Total fee amount',
            min: 0,
            step: 0.01,
          },
        },
      },
    },
  },
}