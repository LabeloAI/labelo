import React from 'react';
import { Modal } from 'apps/labeloapp/src/components/Modal/ModalPopup';
import { Button } from '../../../components';
import { Block, Elem } from '../../../utils/bem';
// import './ConfirmationModal.scss';

export const ConfirmationModal = ({ onClose, onConfirm }) => {
  return (
    <Modal visible onClose={onClose}>
      <Block name="confirmation-modal">
        <Elem name="content">
          <h3>Resend Invitation Confirmation</h3>
          <p>Are you sure you want to resend the invitation email?</p>
        </Elem>
        <Elem name="actions">
          <Button onClick={onConfirm} look="primary" size="compact">
            Resend
          </Button>
          <Button onClick={onClose} size="compact">
            Cancel
          </Button>
        </Elem>
      </Block>
    </Modal>
  );
};
