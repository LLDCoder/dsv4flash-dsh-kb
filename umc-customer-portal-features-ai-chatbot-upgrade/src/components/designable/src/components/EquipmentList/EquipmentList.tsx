// EquipmentList.tsx
import * as React from 'react';
import { useEffect, useState, useCallback } from 'react';
import { Button, Modal, Table, Form, Select, Input, Space, Popconfirm } from 'antd';
import type { DataSourceConfig } from './Setter/DataSource';
import { useTranslation } from 'react-i18next';
import CustomButton from '@/components/common/CustomButton';
import EmptyBox from "../../../../common/EmptyBox/EmptyBox";
import { createEquipmentListTextMap } from './i18n';

type EquipmentOption = {
  id: string;
  name: string;
};

type EquipmentItem = Record<string, string | number | boolean>;

type EquipmentListProps = {
  value?: EquipmentItem[];
  onChange?: (value: EquipmentItem[]) => void;
  fieldSource?: DataSourceConfig;
  addButtonText?: string;
  designMode?: boolean;
};

const api = {
  async fetchEquipmentOptions(): Promise<EquipmentOption[]> {
    return [
      { id: 'camera', name: 'Camera' },
      { id: 'monopod', name: 'Monopod' },
      { id: 'filter', name: 'Photographic filter' },
    ];
  },
};

const EquipmentListInner: React.FC<EquipmentListProps> = ({ 
  value = [], 
  onChange, 
  fieldSource,
  addButtonText,
  designMode,
}) => {
  const { t } = useTranslation();
  const [data, setData] = useState<EquipmentItem[]>(
    Array.isArray(value) ? value : [],
  );
  const [options, setOptions] = useState<EquipmentOption[]>([]);
  const [visible, setVisible] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [form] = Form.useForm();
  const localizedText = React.useMemo(
    () => createEquipmentListTextMap(t),
    [t],
  );
  const equipmentOptionLabel = useCallback(
    (option: EquipmentOption) => localizedText[option.name] || option.name,
    [localizedText],
  );

  const dataSourceLabel = React.useMemo(() => {
    const source = fieldSource?.dataSource;
    if (!source) return t('EquipmentList.title');
    return localizedText[source] || t('EquipmentList.title');
  }, [fieldSource?.dataSource, localizedText, t]);

  // sync external value change
  useEffect(() => {
    if (designMode) {
      // display sample data in design mode
      if (fieldSource?.fields && fieldSource.fields.length > 0) {
        const sampleData: EquipmentItem = {};
        fieldSource.fields.forEach(field => {
          const fieldKey = field.fieldName.toLowerCase().replace(/\s+/g, '_');
          if (field.displayType === 'Dropdown' && field.options?.[0]) {
            sampleData[fieldKey] = field.options[0].value;
          } else {
            sampleData[fieldKey] = t('DataList.designSampleRow', {
              field: localizedText[field.fieldName] || field.fieldName,
            });
          }
        });
        setData([sampleData]);
      } else {
        setData([{ equipmentId: 'camera', equipmentName: 'Camera', number: '1' }]);
      }
    } else {
      setData(Array.isArray(value) ? value : []);
    }
  }, [value, designMode, fieldSource, localizedText, t]);

  // Initialize loading optional devices (compatible with old API)
  useEffect(() => {
    api.fetchEquipmentOptions().then(setOptions);
  }, []);

  const triggerChange = useCallback((next: EquipmentItem[]) => {
    setData(next);
    onChange?.(next);
  }, [onChange]);

  const openAddModal = useCallback(() => {
    if (designMode) {
      return;
    }
    setEditingIndex(null);
    form.resetFields();
    setVisible(true);
  }, [designMode, form]);

  const openEditModal = useCallback((record: EquipmentItem, index: number) => {
    if (designMode) {
      return;
    }
    setEditingIndex(index);
    form.setFieldsValue(record);
    setVisible(true);
  }, [designMode, form]);

  const handleDelete = useCallback((index: number) => {
    if (designMode) {
      return;
    }
    const next = data.filter((_, i) => i !== index);
    triggerChange(next);
  }, [designMode, data, triggerChange]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const item: EquipmentItem = { ...values };

      const next = [...data];
      if (editingIndex != null) {
        next[editingIndex] = item;
      } else {
        next.push(item);
      }
      triggerChange(next);
      setVisible(false);
    } catch (e) {
      console.error('handleOk', e);
    }
  };

  // Dynamically generate columns based on fieldSource
  const columns = React.useMemo(() => {
    const cols: any[] = [];

    if (fieldSource?.fields) {
      // Generate columns using fieldSource configuration
      fieldSource.fields
        .filter(field => field.listVisible)
        .forEach(field => {
          const fieldKey = field.fieldName.toLowerCase().replace(/\s+/g, '_');
          cols.push({
            title: localizedText[field.fieldName] || field.fieldName,
            dataIndex: fieldKey,
            key: fieldKey,
            render: (value: string | number | boolean) => {
              // If dropdown, display label
              if (field.displayType === 'Dropdown' && field.options) {
                const option = field.options.find(opt => opt.value === value);
                return option
                  ? localizedText[option.label] || option.label
                  : value;
              }
              return value;
            },
          });
        });
    } else {
      // Compatible with old default columns
      cols.push(
        {
          title: t('EquipmentList.columns.equipment'),
          dataIndex: 'equipmentId',
          key: 'equipmentId',
          render: (_: unknown, record: EquipmentItem) => {
            const id = String(record.equipmentId ?? '');
            const matched = options.find((option) => option.id === id);
            return matched ? equipmentOptionLabel(matched) : record.equipmentName || id;
          },
        },
        {
          title: t('EquipmentList.columns.number'),
          dataIndex: 'number',
          key: 'number',
        }
      );
    }

    // Add Actions column
    cols.push({
      title: t('EquipmentList.columns.actions'),
      key: 'actions',
      render: (_: unknown, record: EquipmentItem, index: number) => (
        <Space>
          <a onClick={() => openEditModal(record, index)}>{t('EquipmentList.edit')}</a>
          <Popconfirm 
            title={t('EquipmentList.deleteConfirm')}
            onConfirm={() => handleDelete(index)} 
            disabled={designMode}
            okText={t('EquipmentList.delete')}
            cancelText={t('EquipmentList.cancel')}
          >
            <a style={{ color: '#d93025' }}>{t('EquipmentList.delete')}</a>
          </Popconfirm>
        </Space>
      ),
    });

    return cols;
  }, [fieldSource, designMode, handleDelete, openEditModal, t, options, equipmentOptionLabel, localizedText]);

  // Dynamically generate form items based on fieldSource
  const renderFormItems = () => {
    if (fieldSource?.fields) {
      return fieldSource.fields
        .filter(field => field.formVisible)
        .map(field => {
          const fieldKey = field.fieldName.toLowerCase().replace(/\s+/g, '_');
          
          return (
            <Form.Item
              key={fieldKey}
              label={localizedText[field.fieldName] || field.fieldName}
              name={fieldKey}
              rules={[
                { 
                  required: field.required, 
                  message: t(
                    field.displayType === 'Dropdown'
                      ? 'EquipmentList.validation.requiredSelect'
                      : 'EquipmentList.validation.requiredEnter',
                    {
                      field:
                        localizedText[field.fieldName] || field.fieldName,
                    },
                  ),
                }
              ]}
            >
              {field.displayType === 'Dropdown' ? (
                <Select
                  placeholder={
                    localizedText[field.placeholderText] ||
                    field.placeholderText
                  }
                >
                  {field.options?.map((opt) => (
                    <Select.Option key={opt.value} value={opt.value}>
                      {localizedText[opt.label] || opt.label}
                    </Select.Option>
                  ))}
                </Select>
              ) : (
                <Input
                  placeholder={
                    localizedText[field.placeholderText] ||
                    field.placeholderText
                  }
                />
              )}
            </Form.Item>
          );
        });
    }

    // Compatible with old default form
    return (
      <>
        <Form.Item
          label={t('EquipmentList.columns.equipment')}
          name="equipmentId"
          rules={[{ required: true, message: t('EquipmentList.validation.selectEquipment') }]}
        >
          <Select placeholder={t('EquipmentList.placeholder.selectEquipment')}>
            {options.map((opt) => (
              <Select.Option key={opt.id} value={opt.id}>
                {equipmentOptionLabel(opt)}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          label={t('EquipmentList.columns.number')}
          name="number"
          rules={[{ required: true, message: t('EquipmentList.validation.enterNumber') }]}
        >
          <Input placeholder={t('EquipmentList.placeholder.enterNumber')} />
        </Form.Item>
      </>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>
          {dataSourceLabel}
        </h3>
        <Button type="primary" onClick={openAddModal}>
          {addButtonText || t('EquipmentList.addNew')}
        </Button>
      </div>

      <Table
        rowKey={(_, index) => `row-${index}`}
        columns={columns}
        dataSource={data}
        pagination={false}
        scroll={{ x: true }}
        className='EquipmentList-table'
        locale={{
          emptyText: <EmptyBox title={t("common.noData")} />,
        }}
      />

      <Modal centered
        visible={visible}
        title={editingIndex != null ? t('EquipmentList.modal.editItem') : t('EquipmentList.modal.addItem')}
        onCancel={() => setVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          {renderFormItems()}
        </Form>
        <div className="formily-modal-footer">
          <CustomButton variant="outline" onClick={() => setVisible(false)}>
            {t('EquipmentList.cancel')}
          </CustomButton>
          <CustomButton onClick={handleOk}>
            {t('EquipmentList.save')}
          </CustomButton>
        </div>
      </Modal>
    </div>
  );
};

export default EquipmentListInner;
