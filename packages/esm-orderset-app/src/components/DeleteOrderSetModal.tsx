import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, TextInput, Form } from '@carbon/react';
import styles from './order-set-detail.scss';

interface DeleteOrderSetModalProps {
  open: boolean;
  orderSetName: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isDeleting?: boolean;
}

export default function DeleteOrderSetModal({
  open,
  orderSetName,
  onClose,
  onConfirm,
  isDeleting,
}: DeleteOrderSetModalProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim()) {
      onConfirm(reason.trim());
    }
  };

  return (
    <Modal
      open={open}
      modalHeading={t('deleteOrderSet', 'Delete Order Set')}
      primaryButtonText={t('delete', 'Delete')}
      secondaryButtonText={t('cancel', 'Cancel')}
      danger
      onRequestClose={onClose}
      onRequestSubmit={handleSubmit}
      primaryButtonDisabled={!reason.trim() || isDeleting}
    >
      <p style={{ marginBottom: '1rem' }}>
        {t('deleteOrderSetConfirmation', 'Are you sure you want to delete the order set "{{name}}"? This action cannot be undone.', { name: orderSetName })}
      </p>
      <Form onSubmit={handleSubmit}>
        <TextInput
          id="delete-reason"
          labelText={<>
            {t('reasonForDeletion', 'Reason for deletion')}<span className={styles.requiredIndicator}>*</span>
          </>}
          placeholder={t('enterReason', 'e.g. Obsolete protocol')}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          data-modal-primary-focus
        />
      </Form>
    </Modal>
  );
}
