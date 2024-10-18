import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Button } from '../../components';
import { Form, TextArea, Toggle } from '../../components/Form';
import { MenubarContext } from '../../components/Menubar/Menubar';
import { Block, Elem } from '../../utils/bem';
import { Radio, message } from 'antd';
import { ProjectContext } from '../../providers/ProjectProvider';
import { Divider } from '../../components/Divider/Divider';
import { useAPI } from '../../providers/ApiProvider';

export const ReviewSettings = () => {
    const { project, fetchProject } = useContext(ProjectContext);
    const api = useAPI();
    const pageContext = useContext(MenubarContext);
    const formRef = useRef();
    const [reviewDistribution, setReviewDistribution] = useState(project.review_distribution)
    const [showDataManager,setShowDataManager] = useState(project.show_dm_to_reviewers);

    useEffect(() => {
        pageContext.setProps({ formRef });
    }, [formRef]);

    useEffect(() => {
        setReviewDistribution(project.review_distribution);
    }, [project]);

    const updateProject = useCallback(async() => {
        await fetchProject(project.id, true);
        // message.success('Saved!');
    }, [project, fetchProject]);

    const handleToggleChange = async (name, value) => {
        try {
            const response = await api.callApi('updateProject',{
                params: {
                    pk: project.id,
                },
                body: {
                  [name]: value,  
                },
            })
            message.success('Saved!');
        } catch (error) {
            message.error('Failed to Save!');
        }
    }

    const handleTaskDistribution = async (e) => {
        const value = e.target.value;
        setReviewDistribution(value);
        try {
        const res = await api.callApi('updateProject', {
            params: {
            pk:project.id,
            },
            body: {
                review_distribution: value,
            }
        })
        message.success('Saved!');
        } catch (error) {
        console.log('failed',error);
        }
    }

    return (
        <Block name="annotation-settings">
        <Elem name={'wrapper'}>
            <Form
                ref={formRef}
                action="updateProject"
                formData={{ ...project }}
                params={{ pk: project.id }}
                onSubmit={updateProject}
            >
            <Form.Row columnCount={1}>
                <Elem name={'header'}>Rewiew Instructions</Elem>
                <div>
                <Toggle label="Show before labeling" name="show_review_instruction" />
                </div>
                <div style={{ color: 'rgba(0,0,0,0.4)' }}>
                <p>Write instructions to help users complete labeling tasks.</p>
                </div>
            </Form.Row>

            <Form.Row columnCount={1}>
                <TextArea
                name="review_instruction"
                style={{ minHeight: 128, maxWidth: '520px' }}
                />
            </Form.Row>
            {/* <Divider height={32} /> */}

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
                <Elem name={'header'}>Distribute Task Labelling</Elem>
                <Radio.Group onChange={handleTaskDistribution} value={reviewDistribution}>
                <div className="radio-option">
                    <Radio value="AUTO" style={{ fontSize: '0.975rem'}}>
                    Auto
                    <div style={{ color: 'rgba(0,0,0,0.4)', fontSize: '0.875rem' }}>
                    Distributes tasks automatically to reviewrs
                    </div>
                    </Radio>
                    </div>
                    <div className="radio-option">
                    <Radio value="MANUEL" style={{ fontSize: '0.975rem' }}>
                    Manual
                    <div style={{ color: 'rgba(0,0,0,0.4)', fontSize: '0.875rem' }}>
                    Show reviewers assigned tasks only
                    </div>
                    </Radio>
                    </div>
                </Radio.Group>
            </Form.Row>
            <Form.Row columnCount={1} style={{ borderTop: '1px solid #f1f1f1' }}>
            <br />
            {/* <Elem name={'header'}>Review Options</Elem>
            <div>
                <Toggle
                    label="Show the Data Manager to reviewers"
                    defaultChecked={showDataManager}
                    onChange={(e) => {
                        const checked=e.target.checked;
                        setShowDataManager(checked);
                        handleToggleChange('show_dm_to_reviewers',checked);
                    }}
                    name="show_dm_to_reviewers"
                />
            </div> */}
            </Form.Row>
            </Form>
        </Elem>
        </Block>
    );
    };

ReviewSettings.title = 'Review';
ReviewSettings.path = '/review';
