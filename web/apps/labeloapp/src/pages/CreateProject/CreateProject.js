import React from 'react';
import { useHistory } from 'react-router';
import { Button, ToggleItems } from '../../components';
import { Modal } from '../../components/Modal/Modal';
import { Space } from '../../components/Space/Space';
import { HeidiTips } from '../../components/HeidiTips/HeidiTips';
import { useAPI } from '../../providers/ApiProvider';
import { cn } from '../../utils/bem';
import { ConfigPage } from './Config/Config';
import './CreateProject.styl';
import { ImportPage } from './Import/Import';
import { useImportPage } from './Import/useImportPage';
import { useDraftProject } from './utils/useDraftProject';
// import { Select } from '../../components/Form';
import { EnterpriseBadge } from '../../components/Badges/Enterprise';
import { Caption } from '../../components/Caption/Caption';
import { FF_LSDV_E_297, isFF } from '../../utils/feature-flags';
import { createURL } from '../../components/HeidiTips/utils';
import { id } from 'date-fns/locale';
import { Select } from 'antd';

const ProjectName = ({
  name,
  setName,
  onSaveName,
  onSubmit,
  error,
  description,
  setDescription,
  workspaces,
  selectedWorkspace,
  setSelectedWorkspace,
  selectedWorkspaceId,
  show = true,
}) =>
  !show ? null : (
    <form
      className={cn('project-name')}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="field field--wide">
        <label htmlFor="project_name">Project Name</label>
        <input
          name="name"
          id="project_name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={onSaveName}
        />
        {error && <span className="error">{error}</span>}
      </div>
      <div className="field field--wide">
        <label htmlFor="project_description">Description</label>
        <textarea
          name="description"
          id="project_description"
          placeholder="Optional description of your project"
          rows="4"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      {isFF(FF_LSDV_E_297) && (
        <div className="field field--wide">
          <label>
            Workspace
            {/* <EnterpriseBadge filled={true}/> */}
          </label>
          {/* <Select placeholder="Select a workspace" options={[]} /> */}

          <Select
            placeholder="Select a workspace"
            options={workspaces.map((workspace) => ({
              label: workspace.title,
              value: workspace.id,
            }))}
            value={selectedWorkspaceId} // Show the selected workspace by default
            onChange={setSelectedWorkspace}
            allowClear
          />
          <Caption>
            Simplify project management by organizing projects into workspaces.
            {/* <a
              href={createURL(
                'https://docs.labelo.ai/',
                {
                  experiment: 'project_creation_dropdown',
                  treatment: 'simplify_project_management',
                }
              )}
              target="_blank"
            >
              Learn more
            </a> */}
          </Caption>
          {/* <HeidiTips collection="projectCreation" /> */}
        </div>
      )}
    </form>
  );

// options = ['a','b','c']
export const CreateProject = ({ onClose, selectedWorkspaceId }) => {
  const [workspaces, setWorkspaces] = React.useState([]); // State to hold workspace options
  const [selectedWorkspace, setSelectedWorkspace] = React.useState(isNaN(selectedWorkspaceId) ? "": +selectedWorkspaceId);
  const [step, setStep] = React.useState('name'); // name | import | config
  const [waiting, setWaitingStatus] = React.useState(false);
  // const workspaceRef = React.useRef(null);

  const project = useDraftProject();
  const history = useHistory();
  const api = useAPI();

  const [name, setName] = React.useState('');
  const [error, setError] = React.useState();
  const [description, setDescription] = React.useState('');
  const [config, setConfig] = React.useState('<View></View>');

  React.useEffect(() => {
    setError(null);
  }, [name]);

  const { columns, uploading, uploadDisabled, finishUpload, pageProps } =
    useImportPage(project);

  const rootClass = cn('create-project');
  const tabClass = rootClass.elem('tab');
  const steps = {
    name: (
      <span className={tabClass.mod({ disabled: !!error })}>Project Name</span>
    ),
    import: (
      <span className={tabClass.mod({ disabled: uploadDisabled })}>
        Data Import
      </span>
    ),
    config: 'Labeling Setup',
  };

  // name intentionally skipped from deps:
  // this should trigger only once when we got project loaded
  React.useEffect(() => project && !name && setName(project.title), [project]);

  React.useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const response = await api.callApi('getWorkspaces');
        if (response) {
          setWorkspaces(response);

          // Set the selected workspace if the selectedWorkspaceId is provided
          if (selectedWorkspaceId) {
            const selectedWorkspace = response.find(
              (workspace) => workspace.id === selectedWorkspaceId
            );
            if (selectedWorkspace) {
              setSelectedWorkspace(selectedWorkspace.id);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching workspaces:', error);
      }
    };

    fetchWorkspaces();
  }, [api, selectedWorkspaceId]);

  const projectBody = React.useMemo(
    () => ({
      title: name,
      description,
      label_config: config,
      workspace: selectedWorkspace,
    }),
    [name, description, config, selectedWorkspace]
  );

  const onCreate = React.useCallback(async () => {
    const imported = await finishUpload();

    if (!imported) return;

    setWaitingStatus(true);
    const response = await api.callApi('updateProject', {
      params: {
        pk: project.id,
      },
      body: projectBody,
    });

    setWaitingStatus(false);

    if (response !== null) {
      history.push(`/projects/${response.id}/data`);
    }
  }, [project, projectBody, finishUpload]);

  const onSaveName = async () => {
    if (error) return;
    const res = await api.callApi('updateProjectRaw', {
      params: {
        pk: project.id,
      },
      body: {
        title: name,
      },
    });

    if (res.ok) return;
    const err = await res.json();

    setError(err.validation_errors?.title);
  };

  const onDelete = React.useCallback(async () => {
    setWaitingStatus(true);
    if (project)
      await api.callApi('deleteProject', {
        params: {
          pk: project.id,
        },
      });
    setWaitingStatus(false);
    // history.replace('/projects');
    onClose?.();
  }, [project]);

  return (
    <Modal
      onHide={onDelete}
      closeOnClickOutside={false}
      allowToInterceptEscape
      fullscreen
      visible
      bare
    >
      <div className={rootClass}>
        <Modal.Header>
          <h1 style={{ fontWeight: 450, fontSize: '24px' }}>Create Project</h1>
          <ToggleItems items={steps} active={step} onSelect={setStep} />

          <Space>
            <Button
              look="danger"
              size="compact"
              onClick={onDelete}
              waiting={waiting}
            >
              Delete
            </Button>
            <Button
              look="primary"
              size="compact"
              onClick={onCreate}
              waiting={waiting || uploading}
              disabled={!project || uploadDisabled || error}
            >
              Save
            </Button>
          </Space>
        </Modal.Header>
        <ProjectName
          name={name}
          setName={setName}
          error={error}
          onSaveName={onSaveName}
          onSubmit={onCreate}
          description={description}
          setDescription={setDescription}
          show={step === 'name'}
          workspaces={workspaces}
          selectedWorkspace={selectedWorkspace}
          setSelectedWorkspace={setSelectedWorkspace}
          selectedWorkspaceId={selectedWorkspace}
          // handleWorkspaceChange={handleWorkspaceChange}
          // workspaceRef={workspaceRef}
        />
        <ImportPage project={project} show={step === 'import'} {...pageProps} />
        <ConfigPage
          project={project}
          onUpdate={setConfig}
          show={step === 'config'}
          columns={columns}
          disableSaveButton={true}
        />
      </div>
    </Modal>
  );
};
