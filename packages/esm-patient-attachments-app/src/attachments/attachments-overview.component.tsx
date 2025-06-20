import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ContentSwitcher, DataTableSkeleton, IconSwitch, Loading } from '@carbon/react';
import { List, Thumbnail_2 } from '@carbon/react/icons';
import {
  AddIcon,
  createAttachment,
  deleteAttachmentPermanently,
  showModal,
  showSnackbar,
  type Attachment,
  type UploadedFile,
  useAttachments,
  useLayoutType,
  UserHasAccess,
} from '@openmrs/esm-framework';
import { CardHeader, EmptyState, useAllowedFileExtensions } from '@openmrs/esm-patient-common-lib';
import { createGalleryEntry } from '../utils';
import AttachmentPreview from './attachment-preview.component';
import AttachmentsGridOverview from './attachments-grid-overview.component';
import AttachmentsTableOverview from './attachments-table-overview.component';
import styles from './attachments-overview.scss';

interface AttachmentsOverviewProps {
  patientUuid: string;
}

interface SwitchEventHandlersParams {
  index?: number;
  name?: string | number;
  text?: string;
  key?: string | number;
}

type ViewType = 'grid' | 'table';

const AttachmentsOverview: React.FC<AttachmentsOverviewProps> = ({ patientUuid }) => {
  const isTablet = useLayoutType() === 'tablet';
  const { t } = useTranslation();
  const { data, mutate, isValidating, isLoading } = useAttachments(patientUuid, true);
  const { allowedFileExtensions } = useAllowedFileExtensions();

  const [attachmentToPreview, setAttachmentToPreview] = useState<Attachment | null>(null);
  const [hasUploadError, setHasUploadError] = useState(false);
  const [view, setView] = useState<ViewType>('grid');

  const attachments = useMemo(() => data.map((item) => createGalleryEntry(item)), [data]);
  const closeImageOrPdfPreview = useCallback(() => setAttachmentToPreview(null), [setAttachmentToPreview]);

  if (hasUploadError) {
    showSnackbar({
      isLowContrast: true,
      kind: 'error',
      subtitle: t('unsupportedFileType', 'Unsupported file type'),
      title: t('uploadError', 'Error uploading file'),
    });
    setHasUploadError(false);
  }

  const deleteAttachment = useCallback(
    (attachment: Attachment) => {
      deleteAttachmentPermanently(attachment.id, new AbortController())
        .then(() => {
          mutate();
          setAttachmentToPreview(null);

          showSnackbar({
            title: t('fileDeleted', 'File deleted'),
            subtitle: `${attachment.filename} ${t('successfullyDeleted', 'successfully deleted')}`,
            kind: 'success',
            isLowContrast: true,
          });
        })
        .catch(() => {
          showSnackbar({
            title: t('error', 'Error'),
            subtitle: `${attachment.filename} ${t('failedDeleting', "couldn't be deleted")}`,
            kind: 'error',
          });
        });
    },
    [mutate, t, setAttachmentToPreview],
  );

  const openAttachment = useCallback(
    (attachment: Attachment) => {
      if (attachment.bytesContentFamily === 'IMAGE' || attachment.bytesContentFamily === 'PDF') {
        setAttachmentToPreview(attachment);
      } else {
        const anchor = document.createElement('a');
        anchor.setAttribute('href', attachment.src);
        anchor.setAttribute('download', attachment.filename);
        anchor.click();
      }
    },
    [setAttachmentToPreview],
  );

  const showAddAttachmentModal = useCallback(() => {
    const close = showModal('capture-photo-modal', {
      saveFile: (file: UploadedFile) => {
        if (file.capturedFromWebcam && !file.fileName.includes('.')) {
          file.fileName = `${file.fileName}.png`;
        }
        return createAttachment(patientUuid, file);
      },
      allowedExtensions: allowedFileExtensions,
      closeModal: () => close(),
      onCompletion: () => mutate(),
      multipleFiles: true,
      collectDescription: true,
    });
  }, [allowedFileExtensions, mutate, patientUuid]);

  const showDeleteAttachmentModal = useCallback(
    (attachment: Attachment) => {
      const close = showModal('delete-attachment-modal', {
        attachment: attachment,
        close: () => close(),
        onConfirmation: (attachment) => {
          deleteAttachment(attachment);
          close();
        },
      });
    },
    [deleteAttachment],
  );

  if (isLoading) {
    return <DataTableSkeleton role="progressbar" />;
  }

  if (!attachments.length) {
    return (
      <EmptyState
        displayText={t('attachmentsInLowerCase', 'attachments')}
        headerTitle={t('attachmentsInProperFormat', 'Attachments')}
        launchForm={showAddAttachmentModal}
      />
    );
  }

  return (
    <UserHasAccess privilege="View Attachments">
      <div onDragOverCapture={showAddAttachmentModal} className={styles.overview}>
        <>
          <CardHeader title={t('attachments', 'Attachments')}>
            <div className={styles.validatingDataIcon}>{isValidating && <Loading withOverlay={false} small />}</div>
            <div className={styles.attachmentHeaderActionItems}>
              <ContentSwitcher
                onChange={(event: SwitchEventHandlersParams) => setView(event.name.toString() as ViewType)}
                selectedIndex={view === 'grid' ? 0 : 1}
                size={isTablet ? 'md' : 'sm'}
              >
                <IconSwitch name="grid" text={t('gridView', 'Grid view')}>
                  <Thumbnail_2 size={16} />
                </IconSwitch>
                <IconSwitch name="tabular" text={t('tableView', 'Table view')}>
                  <List size={16} />
                </IconSwitch>
              </ContentSwitcher>
              <div className={styles.divider} />
              <Button
                kind="ghost"
                renderIcon={AddIcon}
                iconDescription="Add attachment"
                onClick={showAddAttachmentModal}
              >
                {t('add', 'Add')}
              </Button>
            </div>
          </CardHeader>
          {view === 'grid' ? (
            <AttachmentsGridOverview
              attachments={attachments}
              isLoading={isLoading}
              onOpenAttachment={openAttachment}
            />
          ) : (
            <AttachmentsTableOverview
              attachments={attachments}
              isLoading={isLoading}
              onDeleteAttachment={showDeleteAttachmentModal}
              onOpenAttachment={openAttachment}
            />
          )}
        </>
      </div>
      {attachmentToPreview && (
        <AttachmentPreview
          key={attachmentToPreview.id}
          attachmentToPreview={attachmentToPreview}
          onClosePreview={closeImageOrPdfPreview}
          onDeleteAttachment={showDeleteAttachmentModal}
        />
      )}
    </UserHasAccess>
  );
};

export default AttachmentsOverview;
