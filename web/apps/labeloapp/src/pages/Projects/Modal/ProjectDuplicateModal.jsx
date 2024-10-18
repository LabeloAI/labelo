import { Flex, Form, Input, Modal, Radio, Select, Space, message } from 'antd';
import { useAPI } from 'apps/labeloapp/src/providers/ApiProvider';
import React, { useEffect, useState } from 'react';

const { TextArea } = Input;

const ProjectDuplicateModel = ({ open, onClose, data, workspaces, onSave }) => {
  const [formData, setFormData] = useState({});
  const [isLoading, setIsLoading] = useState(false)
  const api = useAPI();

  const handleInputChange = (val, key) => {
    const newData = { ...formData };
    newData[key] = val;
    setFormData(newData);
  };

  const handleSubmit = async () => {
    if (!data?.id || !formData?.title || formData?.title === '') return;
    setIsLoading(true)
    const response = await api.callApi('duplicateProject', {
      method: 'POST',
      params: {
        pk: data?.id,
      },
      body: formData,
    });
    // console.log(response);
    setIsLoading(false)
    message.success("Project duplicated")
    onSave()
    onClose()
  }
  // console.log(data, formData);
  useEffect(() => {
    setFormData({
      title: data?.title || '',
      description: data?.description || '',
      workspace: data?.workspace,
      method: 'SET',
    });
  }, [data]);

  return (
    <Modal
      title={`Duplicate ${data?.title ? data.title : 'Project'}`}
      open={open}
      onOk={handleSubmit}
      confirmLoading={isLoading}
      onCancel={onClose}
      okText="Duplicate"
    >
      <Flex vertical gap={10} style={{ padding: '10px 0' }}>
        <Flex vertical gap={2}>
          Project name
          <Input
            placeholder="New project"
            value={formData.title || ''}
            onChange={(e) => handleInputChange(e.target.value, 'title')}
          />
        </Flex>
        <Flex vertical gap={2}>
          Project description
          <TextArea
            rows={3}
            placeholder="Description of your project"
            value={formData.description || ''}
            onChange={(e) => handleInputChange(e.target.value, 'description')}
          />
        </Flex>
        <Flex vertical gap={2}>
          Workspace
          <Select
            placeholder="Select a workspace"
            value={formData.workspace}
            options={workspaces.map((workspace) => ({
              label: workspace.title,
              value: workspace.id,
            }))}
            onChange={(val) => handleInputChange(val, "workspace")}
            allowClear
          />
        </Flex>
        <Flex vertical gap={4}>
          What to duplicate
          <Radio.Group
            value={formData.method || 'SET'}
            onChange={(e) => handleInputChange(e.target.value, 'method')}
          >
            <Flex vertical gap={2}>
              <Radio value="SET">Settings</Radio>
              <Radio value="TSK">Settings, tasks</Radio>
            </Flex>
          </Radio.Group>
        </Flex>
      </Flex>
    </Modal>
  );
};

export default ProjectDuplicateModel;
