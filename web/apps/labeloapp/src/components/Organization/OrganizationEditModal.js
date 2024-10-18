import React, { useState, useEffect } from 'react';
import { Button } from '../Button/Button';
import { Input } from '../Form';
import { Modal } from 'antd'; 

export function OrganizationEditModal({ onSave, onClose, visible, organization }) {
  const [editedOrgName, setEditedOrgName] = useState('');

  useEffect(() => {
    if (organization) {
      setEditedOrgName(organization.name);
    }
  }, [organization]);

  const handleOrgEdit = () => {
    onSave({ ...organization, name: editedOrgName });

  };

  return (
    <Modal
      title="Edit Organization"
      open={visible}
      onOk={handleOrgEdit}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button key="save" look='primary' size='compact' onClick={handleOrgEdit}>
          Save
        </Button>
      ]}
    >
      <Input
        type="text"
        placeholder="Organization Name"
        value={editedOrgName}
        onChange={(e) => setEditedOrgName(e.target.value)}
      />
    </Modal>
  );
}