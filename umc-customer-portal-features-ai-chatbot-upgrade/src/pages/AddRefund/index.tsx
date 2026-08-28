import React from "react";
import { Form, Input, Select, Row, Col, Upload } from 'antd';
import './index.less';
import { ActionFooter, CustomButton } from "@/components/common";
import { useTranslation } from "react-i18next";
import { refundApplication } from "@/services/refund";
import WarnningIcon from "@/assets/icons/warning_fill.svg";
import UploadCloud from "@/assets/images/uploadCloud.png";

const AddRefund: React.FC = () => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const options = [
        {
            label: t("refundPage.category.fineRefund"),
            value: 0
        },
        {
            label: t("refundPage.category.applicationRefund"),
            value: 1
        }
    ];
    const submit = () => {
        form.validateFields().then((values) => {
            refundApplication(values).then((res) => {
                console.log(res)
            });
        })
    };
    return (
        <div className="add-container">
            <div className="page-body">
                <div className="title">{t("refundPage.addForm.title")}</div>
                <div className="warn-box">
                    <img src={WarnningIcon} alt="" />
                    <div className="warn-content">
                        <h2>{t("refundPage.addForm.noticeTitle")}</h2>
                        <div className="warn-text">
                            {t("refundPage.addForm.noticeContent")}
                        </div>
                    </div>
                </div>
                {/* Form */}
                <Form
                    className="custorm-form"
                    layout="vertical"
                    form={form}
                >   
                    <Row gutter={{ xs: 8, sm: 16 }}>
                        <Col span={8}>
                            <Form.Item label={t("refundPage.addForm.refundCategory")} name="categoryId" rules={[{ required: true }]}>
                                <Select placeholder={t("formPlaceholders.common.select")} options={options}/>
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item label={t("refundPage.addForm.referenceNumber")} name="fineNumber" rules={[{ required: true }]}>
                                <Input  size="large" placeholder={t("formPlaceholders.pages.refund.requestModal.referenceRequired")} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item label={t("refundPage.addForm.refundAmount")} name="amount">
                                <Input disabled size="large" placeholder={t("formPlaceholders.pages.refund.requestModal.amountAuto")} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={{ xs: 8, sm: 16 }}>
                        <Col span={8}>
                            <Form.Item label={t("refundPage.addForm.refundReason")} name="reasonId" rules={[{ required: true }]}>
                                <Select placeholder={t("formPlaceholders.common.select")} options={options}/>
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item label={t("refundPage.addForm.description")} name="additionalComments" rules={[{ required: true }]}>
                                <Input  size="large" placeholder={t("formPlaceholders.pages.refund.requestModal.notesPlaceholder")} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item label={t("refundPage.addForm.attachments")} name="attachments">
                                <Upload
                                >
                                    <Input 
                                        prefix={<img src={UploadCloud} alt="" />}
                                        className="upload-input" 
                                        readOnly size="large" 
                                        placeholder={t("formPlaceholders.common.uploadFile")}
                                    />
                                </Upload>
                                <div className="upload-tip">
                                    {t("refundPage.addForm.uploadTip")}
                                </div>
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </div>
            <ActionFooter 
                actions={
                    <CustomButton
                        text={t("refundPage.addForm.submit")}
                        variant="primary"
                        onClick={submit}
                    />
                } 
            />
        </div>
    )
};

export default AddRefund;
