import React, { useEffect, useState } from 'react';
import { useAPI } from '../../../providers/ApiProvider';
import { Button, Input, Modal, message } from 'antd';

export function WorkspaceEditModal({ open, onSave, onClose, workspace = {} }) {
  const api = useAPI();
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceInput, setWorkspaceInput] = useState('');

  const updateWorkspace = async (workspaceID, workspaceName) => {
    if (!workspaceID || !workspaceName || workspaceName === '') return;
    setWorkspaceLoading(true);
    const response = await api.callApi('editAndArchiveWorkspace', {
      method: 'PATCH',
      params: {
        pk: workspaceID,
      },
      body: {
        title: workspaceName,
      },
    });
    setWorkspaceLoading(false);
    message.success('Workspace updated');
    onSave();
  };

  const deleteWorkspace = async (workspaceID) => {
    const response = await api.callApi('deleteWorkspace', {
      method: 'DELETE',
      params: {
        pk: workspaceID,
      },
    });
    // console.log(response);
    if(response) {
      message.success("Workspace deleted")
      onSave()
      onClose()
    }
  };

  const archiveWorkspace = async (workspaceID) => {
    const response = await api.callApi('editAndArchiveWorkspace', {
      method: 'PATCH',
      params: {
        pk: workspaceID,
      },
      body: {
        is_archived: !workspace.is_archived,
      },
    });
    // console.log(response);
    if(response) {
      message.success(`Workspace ${response.is_archived ? "archived": "unarchived"}`)
      onSave()
      onClose()
    }
  };

  const handleWorkspaceRemove = (id) => {
    if (workspace?.projects_count === 0) {
      deleteWorkspace(id)
    } else {
      archiveWorkspace(id)
    }
  }

  useEffect(() => {
    setWorkspaceInput(workspace?.title || '');
  }, [workspace.title]);

  return (
    <Modal
      title="Update workspace"
      open={open}
      onCancel={onClose}
      footer={[
        <Button onClick={onClose}>Cancel</Button>,
        <Button
          type="primary"
          onClick={() => updateWorkspace(workspace.id, workspaceInput)}
          loading={workspaceLoading}
        >
          Update
        </Button>,
        <Button danger onClick={() => handleWorkspaceRemove(workspace.id)}>
          {workspace?.projects_count === 0 ? 'Delete' : (workspace?.is_archived ? 'Unarchive': 'Archive')}
        </Button>,
      ]}
    >
      <Input
        placeholder="Workspace name"
        style={{ margin: '10px 0' }}
        value={workspaceInput}
        onChange={(e) => setWorkspaceInput(e.target.value)}
      />
    </Modal>
  );
}
