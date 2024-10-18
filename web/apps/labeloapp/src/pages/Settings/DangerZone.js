import { useMemo, useState } from "react";
import { useHistory } from "react-router";
import { Button } from "../../components";
import { Label } from "../../components/Form";
import { confirm } from "../../components/Modal/Modal";
import { Space } from "../../components/Space/Space";
import { Spinner } from "../../components/Spinner/Spinner";
import { useAPI } from "../../providers/ApiProvider";
import { useProject } from "../../providers/ProjectProvider";
import './DangerZone.scss';

export const DangerZone = () => {
  const { project } = useProject();
  const api = useAPI();
  const history = useHistory();
  const [processing, setProcessing] = useState(null);

  const handleOnClick = (type) => () => {
    confirm({
      title: "Action confirmation",
      body: "You're about to delete all things. This action cannot be undone.",
      okText: "Proceed",
      buttonLook: "destructive",
      onOk: async () => {
        setProcessing(type);
        if (type === 'annotations') {
          // Handle annotation deletion
        } else if (type === 'tasks') {
          // Handle task deletion
        } else if (type === 'predictions') {
          // Handle prediction deletion
        } else if (type === 'reset_cache') {
          await api.callApi('projectResetCache', {
            params: {
              pk: project.id,
            },
          });
        } else if (type === 'tabs') {
          await api.callApi('deleteTabs', {
            body: {
              project: project.id,
            },
          });
        } else if (type === 'project') {
          await api.callApi('deleteProject', {
            params: {
              pk: project.id,
            },
          });
          history.replace('/projects');
        }
        setProcessing(null);
      },
    });
  };

  const buttons = useMemo(() => [{
    type: 'annotations',
    disabled: true, //&& !project.total_annotations_number,
    label: `Delete ${project.total_annotations_number} Annotations`,
  }, {
    type: 'tasks',
    disabled: true, //&& !project.task_number,
    label: `Delete ${project.task_number} Tasks`,
  }, {
    type: 'predictions',
    disabled: true, //&& !project.total_predictions_number,
    label: `Delete ${project.total_predictions_number} Predictions`,
  }, {
    type: 'reset_cache',
    help:
      'Reset Cache may help in cases like if you are unable to modify the labeling configuration due ' +
      'to validation errors concerning existing labels, but you are confident that the labels don\'t exist. You can ' +
      'use this action to reset the cache and try again.',
    label: `Reset Cache`,
  }, {
    type: 'tabs',
    help: 'If the Data Manager is not loading, dropping all Data Manager tabs can help.',
    label: `Drop All Tabs`,
  }, {
    type: 'project',
    help: 'Deleting a project removes all tasks, annotations, and project data from the database.',
    label: 'Delete Project',
  }], [project]);

  return (
    <div className="ls-danger-zone">
      <Label
        text="Delete Annotations, Tasks, or Project"
        description="Perform these actions at your own risk. Actions you take on this page can't be reverted. Make sure your data is backed up."
        style={{ 
          fontSize: '220px', 
          fontWeight: 'bold', 
          padding:'20px',
          color: 'rgba(0, 0, 0, 0.8)',
          textAlign: 'start'
        }}
        descriptionStyle={{
          fontSize: '18px',
          fontWeight: 'bold',
          color: 'rgba(0, 0, 0, 0.9)',
          textAlign: 'center',
          lineHeight: '1.5',
          padding: '2000px'
        }}
      />

      {project.id ? (
        <div className="ls-button-container">
          {buttons.map((btn) => {
            const waiting = processing === btn.type;
            const disabled = btn.disabled || (processing && !waiting);

            return (btn.disabled !== true) && (
              <div key={btn.type}>
                {btn.help && <Label description={btn.help} className="ls-danger-description" />}
                <Button
                  look="danger"
                  disabled={disabled}
                  waiting={waiting}
                  onClick={handleOnClick(btn.type)}
                  className="ls-danger-button"
                >
                  {btn.label}
                </Button>
              </div>
            );
          })}
        </div>
      ) : (
          <Spinner size={32} />
      )}
    </div>
  );
};

DangerZone.title = "Danger Zone";
DangerZone.path = "/danger-zone";
