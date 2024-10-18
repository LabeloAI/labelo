import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Button } from '../../components';
import { Form, TextArea, Toggle } from '../../components/Form';
import { MenubarContext } from '../../components/Menubar/Menubar';
import { Block, Elem } from '../../utils/bem';
import { Radio, message } from 'antd';
import { ModelVersionSelector } from './AnnotationSettings/ModelVersionSelector';
import { ProjectContext } from '../../providers/ProjectProvider';
import { Divider } from '../../components/Divider/Divider';
import { useAPI } from '../../providers/ApiProvider';
import { FF_LSDV_E_297, isFF } from '../../utils/feature-flags';
import './AnnotationSettings.styl';

export const AnnotationSettings = () => {
  const { project, fetchProject } = useContext(ProjectContext);
  const api = useAPI();
  const pageContext = useContext(MenubarContext);
  const formRef = useRef();
  const [collab, setCollab] = useState(null);
  const [skipQueueOption, setSkipQueueOption] = useState(project.skip_queue);
  const [distributeTasks, setDistributeTasks] = useState(project.task_distribution)
  const [skipEnable, setSkipEnable] = useState(project.show_skip_button);
  const [requiredComments, setRequiredComments ] = useState(project.require_comments_on_skip);
  const [allowEmptyAnnotations, setAllowEmptyAnnotations] = useState(project.enable_empty_annotation);
  const [showDataManager, setShowDataManager] = useState(project.show_dm_to_annotators);

  useEffect(() => {
    pageContext.setProps({ formRef });
  }, [formRef]);

  useEffect(() => {
    setSkipQueueOption(project.skip_queue);
  }, [project]);

  // const updateProject = useCallback(async () => {
  useEffect(() => {
    setDistributeTasks(project.task_distribution);
  }, [project]);

  const updateProject = useCallback(async() => {
    await fetchProject(project.id, true);
    // message.success('Saved!');
  }, [project, fetchProject]);

  const handleSkipQueueChange = async (e) => {
    const value = e.target.value;
    setSkipQueueOption(value);
    try {
      const response = await api.callApi('updateProject', {
        params: {
          pk: project.id,
        },
        body: {
          skip_queue: value,
        }
      })
      message.success('Saved!');
    } catch (error) {
      message.error('Failed to save!');
    }
  }

  const handleToggleChange = async (name, value) => {
    try {
      const response = await api.callApi('updateProject', {
        params: {
          pk: project.id,
        },
        body: {
          [name]: value,
        },
      })
      message.success('Saved!');
    } catch (error) {
      message.error('Failed to save!');
    }
  }

  const handleTaskDistribution = async (e) => {
    const value = e.target.value;
    setDistributeTasks(value);
    try {
      const res = await api.callApi('updateProject', {
        params: {
          pk:project.id,
        },
        body: {
          task_distribution: value,
        }
      })
      message.success('Saved!');
    } catch (error) {
      message.error('Failed to save!');
    }
  }

  return (
    <Block name="annotation-settings">
      <Elem name="wrapper">
        <Form
          ref={formRef}
          action="updateProject"
          formData={{ ...project }}
          params={{ pk: project.id }}
          onSubmit={updateProject}
        >
          <Form.Row columnCount={1}>
            <Elem name={'header'}>Labeling Instructions</Elem>
            <div>
              <Toggle label="Show before labeling" name="show_instruction" />
            </div>
            <div style={{ color: 'rgba(0,0,0,0.4)' }}>
              <p>Write instructions to help users complete labeling tasks.</p>
              <p>
                The instruction field supports HTML markup and it allows use of
                images, iframes (pdf).
              </p>
            </div>
          </Form.Row>
          <Form.Row columnCount={1}>
            <TextArea
              name="expert_instruction"
              style={{ minHeight: 128, maxWidth: '520px' }}
            />
          </Form.Row>
          <Divider height={32} />
          <Form.Row columnCount={1} style={{ borderTop: '1px solid #f1f1f1' }}>
            <br />
            <Elem name={'header'}>Prelabeling</Elem>
            <div>
              <Toggle
                label="Use predictions to prelabel tasks"
                description={
                  <span>
                    Enable and select which set of predictions to use for prelabeling.                   
                  </span>
                }
                name="show_collab_predictions"
                onChange={(e) => {
                  setCollab(e.target.checked);
                }}
              />
            </div>

            {(collab !== null ? collab : project.show_collab_predictions) && (
              <ModelVersionSelector />
            )}
          </Form.Row>

          <Divider height={32} />
          <Form.Actions>
            <Form.Indicator>
              <span case="success">Saved!</span>
            </Form.Indicator>
            <Button type="submit" look="primary" style={{ width: 120 }}>
              Save
            </Button>
          </Form.Actions>
          <Form.Row columnCount={1} style={{ borderTop: '1px solid #f1f1f1' }}>
            <br />
            <Elem name={'header'}>Skip Queue</Elem>
            <Radio.Group onChange={handleSkipQueueChange} value={skipQueueOption}>
              <Radio value="REQUEUE_FOR_ME" style={{ fontSize: '0.995rem' }}>
                Requeue skipped tasks back to the annotator
                <div style={{ color: 'rgba(0,0,0,0.4)', fontSize: '0.875rem' }}>
                  Requeue to the end of the same annotator’s queue
                </div>
              </Radio>
              <Radio value="REQUEUE_FOR_OTHERS" style={{ fontSize: '0.995rem' }}>
                Requeue skipped tasks to others
                <div style={{ color: 'rgba(0,0,0,0.4)', fontSize: '0.875rem' }}>
                  Requeue skipped tasks to another annotators
                </div>
              </Radio>
              <Radio value="IGNORE_SKIPPED" style={{ fontSize: '0.995rem' }}>
                Ignore skipped
                <div style={{ color: 'rgba(0,0,0,0.4)', fontSize: '0.875rem' }}>
                  No one sees skipped tasks and tasks with skipped annotations are finished
                </div>
              </Radio>
            </Radio.Group>
          </Form.Row>
          <Divider height={32} />

          <Form.Row columnCount={1} style={{ borderTop: '1px solid #f1f1f1' }}>
            <br />
            <Elem name={'header'}>Annotating Options</Elem>
            <div>
              <Toggle
                label="Show Skip button"
                defaultChecked={skipEnable}
                onChange={(e) => {
                  const checked= e.target.checked;
                  setSkipEnable(checked);
                  handleToggleChange('show_skip_button', checked);
                }}
                name="show_skip_button"
              />
            </div>
            <div>
              <Toggle
                label="Allow empty annotations"
                defaultChecked= {allowEmptyAnnotations}
                onChange={(e) => {
                  const checked= e.target.checked;
                  setAllowEmptyAnnotations(checked);
                  handleToggleChange('enable_empty_annotation', checked);
                }}
                name="enable_empty_annotation"
              />
            </div>
            <div>
              <Toggle
                label="Show the Data Manager to annotators"
                defaultChecked={showDataManager}
                onChange={(e) => {
                  const checked= e.target.checked;
                  setShowDataManager(checked);
                  handleToggleChange('show_dm_to_annotators', checked);
                }}
                name="show_dm_to_annotators"
              />
            </div>
            <div>
              <Toggle
                label="Annotators must leave a comment on skip"
                defaultChecked={requiredComments}
                onChange={(e) => {
                  const checked= e.target.checked;
                  setRequiredComments(checked);
                  handleToggleChange('require_comments_on_skip', checked);
                }}
                name="require_comments_on_skip"
              />
            </div>
          </Form.Row>
          <Divider height={32} />
          <Form.Row columnCount={1} style={{ borderTop: '1px solid #f1f1f1' }}>
            <br />
            <Elem name={'header'}>Distribute Task Labelling</Elem>
              <Radio.Group onChange={handleTaskDistribution} value={distributeTasks}>
              <div className="radio-option">
                <Radio value="AUTO" style={{ fontSize: '0.975rem'}}>
                  Auto
                  <div style={{ color: 'rgba(0,0,0,0.4)', fontSize: '0.875rem' }}>
                  Distributes tasks automatically to annotators
                  </div>
                </Radio>
                </div>
                <div className="radio-option">
                <Radio value="MANUEL" style={{ fontSize: '0.975rem' }}>
                  Manual
                  <div style={{ color: 'rgba(0,0,0,0.4)', fontSize: '0.875rem' }}>
                  Show annotators assigned tasks only
                  </div>
                </Radio>
                </div>
              </Radio.Group>
          </Form.Row>
        </Form>
      </Elem>
    </Block>
  );
};

AnnotationSettings.title = 'Annotation';
AnnotationSettings.path = '/annotation';
