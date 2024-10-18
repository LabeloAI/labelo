import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../Button/Button';
import { Input } from '../Form';
import { useAPI } from '../../providers/ApiProvider';
import { Modal } from 'antd';

export function OrganizationModal({ onSave, onClose }) {
  const [organizationName, setOrganizationName] = useState('');
  const api = useAPI();
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleSave = async () => {
    if(organizationName && organizationName !== ''){
      try {
        const res = await api.callApi('createOrganization', {  
          body: {
            title: organizationName,
          },
        });
  
        // console.log('API Response:', res);
        
        if (isMounted.current) {
          onSave();
          setOrganizationName('');
          onClose();
        }
      } catch (error) {
        console.error('Error creating organization:', error);
      }
    }
  };

  return (
    <Modal
      open
      onOk={handleSave}
      onCancel={onClose}
      okText='Create'  
    >
      <div className="workspace-modal">
        <div className="workspace-modal-content">
          <h2>New Organization</h2>
          <div style={{marginTop: '20px'}}>
          <Input 
            type="text" 
            placeholder="Enter Organization Name" 
            value={organizationName} 
            onChange={(e) => setOrganizationName(e.target.value)} 
            style={{width:'480px'}}
          />
          </div>
        </div>
      </div>
    </Modal> 
  );
}