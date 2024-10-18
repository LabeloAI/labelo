import React from 'react';
import { Modal, Button } from 'antd';

const LeaveOrganizationModal = ({ visible, onCancel, onConfirm }) => {
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
          Leave
        </Button>,
      ]}
    >
      <p>Are you sure you want to leave this organization?</p>
    </Modal>
  );
};

export default LeaveOrganizationModal;