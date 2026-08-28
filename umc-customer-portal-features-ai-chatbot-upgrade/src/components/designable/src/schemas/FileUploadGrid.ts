import { ISchema } from '@formily/react'

export const FileUploadGrid: ISchema = {
  type: 'object',
  properties: {
    fileList: {
      type: 'array',
      title: 'File List',
      items: {
        type: 'object',
        properties: {
          uid: {
            type: 'string',
            title: 'File ID',
          },
          name: {
            type: 'string',
            title: 'File Name',
          },
          status: {
            type: 'string',
            title: 'Upload Status',
            enum: ['done', 'uploading', 'error'],
          },
          url: {
            type: 'string',
            title: 'File URL',
          },
          thumbUrl: {
            type: 'string',
            title: 'Thumbnail URL',
          },
          type: {
            type: 'string',
            title: 'File Type',
          },
          size: {
            type: 'number',
            title: 'File Size',
          },
        },
      },
    },
    maxCount: {
      type: 'number',
      title: 'Max File Count',
      default: 10,
      'x-decorator': 'FormItem',
      'x-component': 'InputNumber',
      'x-component-props': {
        min: 1,
        max: 50,
      },
    },
    maxSize: {
      type: 'number',
      title: 'Max File Size (MB)',
      default: 10,
      'x-decorator': 'FormItem',
      'x-component': 'InputNumber',
      'x-component-props': {
        min: 1,
        max: 100,
      },
    },
    accept: {
      type: 'string',
      title: 'Accepted File Types',
      default: 'image/*,.pdf,.doc,.docx,.txt',
      'x-decorator': 'FormItem',
      'x-component': 'Input',
      'x-component-props': {
        placeholder: 'e.g., image/*,.pdf,.doc',
      },
    },
    multiple: {
      type: 'boolean',
      title: 'Allow Multiple Files',
      default: true,
      'x-decorator': 'FormItem',
      'x-component': 'Switch',
    },
    showPreview: {
      type: 'boolean',
      title: 'Show Preview',
      default: true,
      'x-decorator': 'FormItem',
      'x-component': 'Switch',
    },
    gridColumns: {
      type: 'number',
      title: 'Grid Columns',
      default: 3,
      'x-decorator': 'FormItem',
      'x-component': 'InputNumber',
      'x-component-props': {
        min: 1,
        max: 6,
      },
    },
  },
}