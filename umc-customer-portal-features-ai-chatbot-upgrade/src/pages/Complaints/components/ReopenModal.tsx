import { Modal, Form, Input } from "antd";
import { CustomButton, CustomMessage } from "@/components/common";
import { putStatus } from "@/services/complaints"

import './ReopenModal.less';
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface IReopenModalProps {
    visible: boolean;
    record: {
        id: number;
    } | null;
    onCancel: () => void;
}

export default function ReopenModal({ visible, record, onCancel }: IReopenModalProps) { 
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const { t } = useTranslation();
    async function handleSubmit() {
        const data = await form.validateFields();
        if(record){
            try{
                setLoading(true);
                await putStatus({
                    enquiryId: record.id,
                    enquiryStatusId: 1,
                    reason: data.reason
                });
                CustomMessage.success(t('complaintsPage.reopenModal.success'));
                onCancel();
            }finally{
                setLoading(false);
            }
        }
        
    }
    useEffect(() => {
        if(visible){
            form.resetFields();
        }
    }, [visible]);
    return <Modal centered className="complaints-reopen-modal" title={t('complaintsPage.reopenModal.title')} visible={visible} onCancel={onCancel} footer={false}>
        <div className="complaints-reopen-modal-content">
            <div className="reopen-modal-tip">{t('complaintsPage.reopenModal.tip')}</div>
            <Form form={form} className="custorm-form" layout="vertical">
                <Form.Item label={t('complaintsPage.reopenModal.reason')} name="reason" rules={[
                    { required: true, message: t('common.required') },
                    { validator: async (rule, value) => {
                        if(value && value.length < 5){
                            return Promise.reject(t('complaintsPage.reopenModal.reasonMinLength'));
                        }
                        return Promise.resolve();
                    }}
                ]}>
                    <Input.TextArea maxLength={500} minLength={5} rows={4} placeholder={t('formPlaceholders.pages.complaints.reopenModal.reasonPlaceholder')} />
                </Form.Item>
            </Form>
            <div className="reopen-modal-char-len">{t('complaintsPage.reopenModal.charRange')}</div>
        </div>
        <div className="complaints-add-modal-footer">
            <CustomButton customClassName="footer-btn-cancel" variant="outline" text={t('common.cancel')} onClick={onCancel}  />
            <CustomButton customClassName="footer-btn-submit" loading={loading} text={t('common.submit')} onClick={handleSubmit}  />
        </div>
    </Modal>
}
