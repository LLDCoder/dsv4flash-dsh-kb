export const CountryDropdown = {
  'en-US': {
    title: 'Region Selector',
    settings: {
      title: {
        title: 'Label Name',
      },
      placeholder: {
        title: 'Placeholder',
        tooltip: 'Enter the placeholder for the region selector',
      },
      required: {
        title: 'Required Field',
      },
      'x-decorator-props': {
        tooltip: {
          title: 'Description',
          tooltip: 'Enter the Description for the region selector',
        },
      },
      'x-component-props': {
        fieldWidth: {
          title: 'Field Width',
          dataSource: ['Full Line', '1/2'],
        },
        mode: {
          title: 'Mode',
          dataSource: ['Multiple', 'Tags', 'Single'],
        },
        autoClearSearchValue: {
          title: 'Auto Clear Search Value',
          tooltip: 'Only used to multiple and tags mode',
        },
        defaultActiveFirstOption: 'Default Active First Option',
        dropdownMatchSelectWidth: 'Dropdown Match Select Width',
        defaultOpen: 'Default Open',
        filterOption: 'Filter Option',
        filterSort: 'Filter Sort',
        labelInValue: 'label InValue',
        listHeight: 'List Height',
        maxTagCount: 'Max Tag Count',
        maxTagPlaceholder: {
          title: 'Max Tag Placeholder',
          tooltip: 'Content displayed when tag is hidden',
        },
        maxTagTextLength: 'Max Tag Text Length',
        showArrow: 'Show Arrow',
        virtual: 'Use Virtual Scroll',
      },
      'x-display': {
        title: 'Visible',
      },
      'x-pattern': {
        title: 'Editable',
      },
    },
  },
}