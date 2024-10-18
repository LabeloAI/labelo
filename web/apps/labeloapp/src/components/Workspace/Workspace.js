import React, { useState } from 'react';
import { Button } from '../Button/Button';
import { Input } from '../Form';
import { useAPI } from '../../providers/ApiProvider';
import { Space } from '../Space/Space';
import { Modal } from 'antd';

export function Workspace({ onSave, onClose }) {
  const [workspaceName, setWorkspaceName] = useState('');
  const api = useAPI();

  const handleSave = async () => {
    onSave(workspaceName);
    setWorkspaceName(workspaceName);

    const res = await api.callApi('createWorkspace', {  
      body: {
        title: workspaceName,
      },
    });
    // console.log('API Response:', res);
    window.location.reload();
    
  };

  return (
    <Modal
    open
    onOk={handleSave}
    onCancel={onClose}  
    >
    <div className="workspace-modal">
      <div className="workspace-modal-content">
        <h2>New Workspace</h2>
        <Input 
          type="text" 
          placeholder="Enter Workspace Name" 
          value={workspaceName} 
          onChange={(e) => setWorkspaceName(e.target.value)} 
        />
      </div>
    </div>
    </Modal> 
  );
}