import React, { useState } from 'react';
import { Form, Button, Card, Space, Divider } from 'antd';
import { FileUploadGridField } from './FileUploadGridField';

const FileUploadGridExample: React.FC = () => {
  const [form] = Form.useForm();
  const [fileData, setFileData] = useState({});

  const handleSubmit = () => {
    const values = form.getFieldsValue();
    console.log('Form Values:', values);
    console.log('File Data:', fileData);
  };

  const handleReset = () => {
    form.resetFields();
    setFileData({});
  };

  const mockFileData = {
    fileList: [
      {
        uid: 'file-1',
        name: 'sample-image.jpg',
        status: 'done' as const,
        url: 'https://via.placeholder.com/300x300/4CAF50/white?text=Image+1',
        thumbUrl: 'https://via.placeholder.com/300x300/4CAF50/white?text=Image+1',
        type: 'image/jpeg',
        size: 1024000,
      },
      {
        uid: 'file-2',
        name: 'document.pdf',
        status: 'done' as const,
        url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        type: 'application/pdf',
        size: 2048000,
      },
      {
        uid: 'file-3',
        name: 'another-image.png',
        status: 'done' as const,
        url: 'https://via.placeholder.com/300x300/2196F3/white?text=Image+2',
        thumbUrl: 'https://via.placeholder.com/300x300/2196F3/white?text=Image+2',
        type: 'image/png',
        size: 1536000,
      },
    ],
  };

  const loadMockData = () => {
    setFileData(mockFileData);
    form.setFieldsValue({ fileUploadGrid: mockFileData });
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1000px' }}>
      <Card title="FileUploadGrid Component Example">
        
        {/* Controls */}
        <div style={{ marginBottom: '24px' }}>
          <Space>
            <Button onClick={loadMockData}>Load Mock Files</Button>
            <Button onClick={handleReset}>Reset</Button>
            <Button type="primary" onClick={handleSubmit}>
              Submit
            </Button>
          </Space>
        </div>

        <Divider />

        {/* Form */}
        <Form form={form} layout="vertical">
          <Form.Item name="fileUploadGrid" label="File Upload Grid">
            <FileUploadGridField />
          </Form.Item>
        </Form>

        <Divider />

        {/* Instructions */}
        <Card size="small" title="How to Use" style={{ marginTop: '24px' }}>
          <div style={{ lineHeight: '1.8' }}>
            <h4>Upload Files:</h4>
            <ul>
              <li>Click the "Add New" area to select files</li>
              <li>Supports images, PDFs, and documents</li>
              <li>Maximum file size: 10MB</li>
              <li>Multiple files can be uploaded</li>
            </ul>

            <h4>File Management:</h4>
            <ul>
              <li><strong>Preview:</strong> Hover over a file and click the eye icon</li>
              <li><strong>Delete:</strong> Hover over a file and click the trash icon</li>
              <li><strong>Images:</strong> Show thumbnails and open in modal for preview</li>
              <li><strong>Documents:</strong> Show file icons and open in new tab</li>
            </ul>

            <h4>Mock Data:</h4>
            <ul>
              <li>Click "Load Mock Files" to see the component with sample files</li>
              <li>Includes different file types: images and PDF</li>
              <li>Demonstrates the grid layout and hover effects</li>
            </ul>
          </div>
        </Card>

        {/* Features */}
        <Card size="small" title="Features" style={{ marginTop: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            <div>
              <h4>📁 File Types</h4>
              <ul style={{ fontSize: '12px', margin: 0 }}>
                <li>Images: JPG, PNG, GIF, WEBP</li>
                <li>Documents: PDF, DOC, DOCX, TXT</li>
                <li>Custom icons for each type</li>
              </ul>
            </div>
            
            <div>
              <h4>🎨 Design</h4>
              <ul style={{ fontSize: '12px', margin: 0 }}>
                <li>Responsive grid layout</li>
                <li>Hover effects and animations</li>
                <li>Clean, modern interface</li>
              </ul>
            </div>
            
            <div>
              <h4>⚡ Performance</h4>
              <ul style={{ fontSize: '12px', margin: 0 }}>
                <li>Efficient file handling</li>
                <li>Thumbnail generation</li>
                <li>Memory management</li>
              </ul>
            </div>
            
            <div>
              <h4>🔧 Integration</h4>
              <ul style={{ fontSize: '12px', margin: 0 }}>
                <li>Formily form support</li>
                <li>Custom validation</li>
                <li>Easy configuration</li>
              </ul>
            </div>
          </div>
        </Card>

      </Card>
    </div>
  );
};

export default FileUploadGridExample;