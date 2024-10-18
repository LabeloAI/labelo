import React from 'react';
import { Modal, Button } from 'antd';

const DeleteOrganizationModal = ({ visible, onCancel, onConfirm }) => {
  return (
    <Modal
      open={visible}
    //   title="Delete Organization"
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancel
        </Button>,
        <Button key="confirm" type="primary" danger onClick={onConfirm}>
          Confirm Delete
        </Button>,
      ]}
    >
      <p>Are you sure you want to delete this organization?</p>
    </Modal>
  );
};

export default DeleteOrganizationModal;