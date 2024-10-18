import React, { useState, useContext, useEffect } from 'react';
import {
  Modal,
  List,
  Button,
  Input,
  Space,
  Typography,
  Form,
  message,
  Popconfirm,
} from 'antd';
import { ApiContext } from '../../../providers/ApiProvider';
import { DeleteOutlined } from '@ant-design/icons';
import './TemplateModal.scss';
import { Block } from 'apps/labeloapp/src/utils/bem';

const { Text } = Typography;

const TemplateModal = ({ visible, onClose, onSelectProject }) => {
  const api = useContext(ApiContext);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [secondModal, setSecondModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        const response = await api.callApi('getProjectTemplate');
        setProjects(response);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching templates:', error);
        setLoading(false);
      }
    };

    if (visible) {
      fetchTemplates();
    }
  }, [api, visible]);

  const handleProjectSelect = (projectId) => {
    setSelectedProject(projectId);
    onSelectProject(projectId);
    onClose();
    openSecondModal();
  };

  const openSecondModal = () => {
    setSecondModal(true);
  };

  const closeSecondModal = () => {
    setSecondModal(false);
    setProjectName('');
    setProjectDescription('');
    setSelectedProject(null);
    form.resetFields();
  };

  const handleCreateProject = async () => {
    try {
      await form.validateFields();
      const response = await api.callApi('createProjectTemplate', {
        body: {
          title: projectName,
          description: projectDescription,
          template: selectedProject,
        },
      });
      message.success('Project created successfully!');
      closeSecondModal();
      window.location.reload();
    } catch (error) {
      console.error('Error creating project:', error);
    }
  };

  const handleDeleteProject = async (projectId) => {
    try {
      const response = await api.callApi('deleteProjectTemplate', {
        params: { pk: projectId },
      });
      message.success('Project template deleted successfully!');
      setProjects((prevProjects) =>
        prevProjects.filter((project) => project.id !== projectId)
      );
    } catch (error) {
      console.error('Error deleting project template:', error);
      message.error('Failed to delete project template');
    }
  };

  const isCreateButtonDisabled = () => {
    return !selectedProject || !projectName || projectName.length < 3;
  };

  return (
    <>
      <Modal
        title="Select Project Template"
        open={visible}
        onCancel={onClose}
        footer={null}
      >
        {projects.length === 0 ? (
          <Text>
            No templates created yet. You can save any project as a template in
            its settings.
          </Text>
        ) : (
          <List
            dataSource={projects}
            loading={loading}
            renderItem={(project) => (
              <List.Item
                className={selectedProject === project.id ? 'clicked-row' : ''}
              >
                <Block
                  name='project-template'
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '12px',
                    backgroundColor: '#f0f0f0',
                    borderRadius: '8px',
                  }}
                  
                  onClick={() => handleProjectSelect(project.id)}
                >
                  <span>{project.name}</span>
                  <Popconfirm
                    title="Are you sure you want to delete this template?"
                    onConfirm={() => handleDeleteProject(project.id)}
                    okText="Yes"
                    cancelText="No"
                  >
                    <DeleteOutlined style={{ color: 'red' }} />
                  </Popconfirm>
                </Block>
              </List.Item>
            )}
          />
        )}
      </Modal>

      <Modal
        title="Use Template"
        open={secondModal}
        onCancel={closeSecondModal}
        footer={[
          <Button key="cancel" onClick={closeSecondModal}>
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            disabled={isCreateButtonDisabled()}
            onClick={handleCreateProject}
          >
            Create
          </Button>,
        ]}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Project Name"
            name="projectName"
            rules={[
              { required: true, message: 'Please enter the project name' },
              { min: 3, message: 'Project name must be at least 3 characters' },
            ]}
          >
            <Input
              placeholder="Project Name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
          </Form.Item>
          <Form.Item label="Description" name="projectDescription">
            <Input.TextArea
              placeholder="Description Optional"
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default TemplateModal;
