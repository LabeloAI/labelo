import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Modal, Input as AntInput, Form as AntForm, message, Space, Flex } from 'antd';
// import {  Input, TextArea, Select } from '../../components/Form';
import { Button } from '../../components';
import { Form, Input, Label, Select, TextArea } from '../../components/Form';
import { RadioGroup } from '../../components/Form/Elements/RadioGroup/RadioGroup';
import { ProjectContext } from '../../providers/ProjectProvider';
import { Block, cn, Elem } from '../../utils/bem';
import { EnterpriseBadge } from '../../components/Badges/Enterprise';
import './settings.styl';
import { HeidiTips } from '../../components/HeidiTips/HeidiTips';
import { FF_LSDV_E_297, isFF } from '../../utils/feature-flags';
import { createURL } from '../../components/HeidiTips/utils';
import { Caption } from '../../components/Caption/Caption';
import { useAPI } from '../../providers/ApiProvider';

export const GeneralSettings = () => {
  const { project, fetchProject } = useContext(ProjectContext);
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [selectedImageDescModel, setSelectedImageDescModel] = React.useState(null);
  const [selectedSearchMode, setSelectedSearchMode] = React.useState("word");
  const api = useAPI();
  const [form] = AntForm.useForm();
  const [mlParams, setMlPrams] = useState({});

  useEffect(() => {
    setSelectedWorkspace(project?.workspace);
  }, [project?.workspace]);

  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const response = await api.callApi('getWorkspaces');
        // console.log('response',response)
        if (response) {
          setWorkspaces(response);
        }
      } catch (error) {
        console.error('Error fetching workspaces:', error);
      }
    };

    fetchWorkspaces();
  }, [api]);

  const updateProject = useCallback(() => {
    if (project.id) fetchProject(project.id, true);
  }, [project]);

  const colors = [
    '#FFFFFF',
    '#F52B4F',
    '#FA8C16',
    '#F6C549',
    '#9ACA4F',
    '#51AAFD',
    '#7F64FF',
    '#D55C9D',
  ];

  const samplings = [
    { value: "Sequential", label: "Sequential", description: "Tasks are ordered by Data manager ordering" },
    { value: "Uniform", label: "Random", description: "Tasks are chosen with uniform random" },
  ];

  const image_models = [
    { label: "Vit Gpt2", value: 'vit' },
    { label: "Salesforce Blip", value: "blip" },
    { label: "OpenAI Gpt4 Vision", value: "vision" , "args": {"vision_api_key": "OpenAI Api key"},},
    { label: "No Image description model", value: 'null' }
  ]
  const search_method = [
    { label: "Word Search", value: "word"},
    { label: "all-MiniLM-L6-v2", value: "minilm"},
  ]

  React.useEffect(() => {
    if(project.description_ml_model){
      setSelectedImageDescModel(project.description_ml_model)
    }
    setMlPrams(project.ml_params || {});    
    setSelectedSearchMode(project?.search_method || 'word');
  }, [project]);  

  const getModelArgs = () => {
    const model = image_models.find(ml => ml.value === selectedImageDescModel)
    return model?.args || {}
  }

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  const handleSaveTemplate = async () => {
    try {
      await form.validateFields();
      const response = await api.callApi('createTemplate', {
        body: {
          name: templateName,
          description: templateDescription,
          project_id: project.id,
        },
      });
      // console.log('response', response);
      message.success('Project Template created successfully!');
      // console.log('Template Description:', templateDescription);
      setIsModalVisible(false);
    } catch (error) {
      console.error('Error creating template:', error);
    }
  };

  const modelArgs = getModelArgs()

  return (
    <Block name="general-settings">
      <Elem name={'wrapper'}>
        <Form
          action="updateProject"
          formData={{ ...project }}
          params={{ pk: project.id }}
          onSubmit={updateProject}
        >
          <Form.Row columnCount={1} rowGap="32px">
            <Input
              name="title"
              label="Project Name"
              labelProps={{ large: true }}
            />

            <TextArea
              name="description"
              label="Description"
              labelProps={{ large: true }}
              style={{ minHeight: 128 }}
            />
            {isFF(FF_LSDV_E_297) && (
              <Block name="workspace-placeholder">
                <Elem name="badge-wrapper">
                  <Elem name="title">Workspace</Elem>
                  {/* <EnterpriseBadge /> */}
                </Elem>
                <Select
                  name="workspace"
                  placeholder="Select a workspace"
                  options={workspaces.map(workspace => ({
                    label: workspace.title,
                    value: workspace.id
                  }))}
                  // value={selectedWorkspace}
                  // onChange={setSelectedWorkspace}
                  // style={{width: "100%"}}
                />
                <Caption>
                  Simplify project management by organizing projects into workspaces.
                </Caption>
              </Block>
            )}
            <div className="field field--wide">
              <Elem name="badge-wrapper">
                <Elem name="title">Image description</Elem>
              </Elem>
              <Select
                placeholder="Select a image description model"
                options={image_models}
                value={selectedImageDescModel}
                onChange={e => setSelectedImageDescModel(e.target.value)}
                name="image_desc_model"
              />
              {Object.keys(modelArgs).map((arg) => (
                <Input label={modelArgs[arg]} name={arg} type="text" required
                       value={mlParams[arg] || ''} key={arg}/>
              ))}
            </div>
            <div className="field field--wide">
              <Elem name="badge-wrapper">
                <Elem name="title">Search Method</Elem>
              </Elem>
              <Select
                placeholder="Select a search method"
                options={search_method}
                value={selectedSearchMode}
                onChange={e => setSelectedSearchMode(e.target.value)}
                name="search_method"
              />
            </div>
            <RadioGroup name="color" label="Color" size="large" labelProps={{ size: "large" }}>
              {colors.map(color => (
                <RadioGroup.Button key={color} value={color}>
                  <Block name="color" style={{ '--background': color }} />
                </RadioGroup.Button>
              ))}
            </RadioGroup>

            <RadioGroup label="Task Sampling" labelProps={{ size: "large" }} name="sampling" simple>
              {samplings.map(({ value, label, description }) => (
                <RadioGroup.Button
                  key={value}
                  value={`${value} sampling`}
                  label={`${label} sampling`}
                  description={description}
                />
              ))}
              {isFF(FF_LSDV_E_297) && (
                <RadioGroup.Button
                  key="uncertainty-sampling"
                  value=""
                  label={<>Uncertainty sampling </>}
                  disabled
                  description={(
                    <>
                      Tasks are chosen according to model uncertainty score (active learning mode).
                    </>
                  )}
                />
              )}
            </RadioGroup>
          </Form.Row>

          <Form.Actions>
            <Form.Indicator>
              <span case="success">Saved!</span>
            </Form.Indicator>
            <Button onClick={showModal}>Save as Template</Button>
            <Button type="submit" look="primary" style={{ width: 120 }}>Save</Button>
          </Form.Actions>
        </Form>
      </Elem>
      {/* {isFF(FF_LSDV_E_297) && (
        <HeidiTips collection="projectSettings" />
      )} */}
      <Modal
        title="Create a Template of this project"
        open={isModalVisible}
        onCancel={handleCancel}
        footer={[
          <div style={{ display: 'flex' ,justifyContent: 'flex-end', gap: '8px' }}>
            <Button key="cancel" type="primary" onClick={handleCancel} >
              Cancel
            </Button>
            <Button onClick={handleSaveTemplate} look="primary" style={{ width: 100 }} >
              Save
            </Button>
          </div>
        ]}
      >
        <AntForm form={form} layout="vertical">
          <AntForm.Item
            label="Template Name"
            name="templateName"
            rules={[{ required: true, message: 'Please enter the project name' }]}
          >
            <AntInput value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
          </AntForm.Item>
          <AntForm.Item label="Description">
            <AntInput.TextArea value={templateDescription} onChange={(e) => setTemplateDescription(e.target.value)} />
          </AntForm.Item>
        </AntForm>
      </Modal>
    </Block>
  );
};

GeneralSettings.menuItem = "General";
GeneralSettings.path = "/";
GeneralSettings.exact = true;
