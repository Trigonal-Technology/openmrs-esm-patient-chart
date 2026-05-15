import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, Close } from '@carbon/react/icons';
import { Button, TextInput, Form, FormGroup, Select, SelectItem } from '@carbon/react';
import type { OrderSet, DrugOrderItem } from '../resources/orderset-config';
import type { OrderConfigObject } from '../resources/order-config.resource';
import styles from './create-order-set-form.scss';

const CATEGORIES = [
  'Infectious Disease',
  'Cardiology',
  'Endocrinology',
  'Gastroenterology',
  'Pulmonology',
  'Surgery',
  'Emergency',
  'Neurology',
  'Pediatrics',
  'Obstetrics',
  'Other',
];

interface CreateOrderSetFormProps {
  drugs: DrugOrderItem[];
  orderConfig?: OrderConfigObject;
  onSave: (set: OrderSet) => void;
  onCancel: () => void;
}

import { getDisplayForConfig } from '../lib/order-config-utils';

export default function CreateOrderSetForm({ drugs, orderConfig, onSave, onCancel }: CreateOrderSetFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');

  const handleSave = () => {
    if (!name.trim() || !category) return;
    const newSet: OrderSet = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      category,
      description: description.trim() || `Custom order set with ${drugs.length} drugs`,
      drugs: drugs.map((d, i) => ({ ...d, id: `cd-${Date.now()}-${i}` })),
    };
    onSave(newSet);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>{t('saveAsOrderSet', 'Save as Order Set')}</h2>
        <Button
          kind="ghost"
          size="sm"
          hasIconOnly
          renderIcon={Close}
          onClick={onCancel}
          iconDescription={t('close', 'Close')}
        />
      </div>

      <div className={styles.form}>
        <Form>
          <FormGroup legendText="">
            <TextInput
              id="orderset-name"
              labelText={t('orderSetName', 'Order Set Name *')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('orderSetNamePlaceholder', 'e.g. Acute Bronchitis Protocol')}
              size="md"
            />
          </FormGroup>

          <FormGroup legendText="">
            <Select
              id="orderset-category"
              labelText={t('category', 'Category *')}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              size="md"
            >
              <SelectItem value="" text={t('selectCategory', 'Select category')} disabled />
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c} text={c} />
              ))}
            </Select>
          </FormGroup>

          <FormGroup legendText="">
            <TextInput
              id="orderset-description"
              labelText={t('description', 'Description')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('descriptionPlaceholder', 'Brief description of this order set')}
              size="md"
            />
          </FormGroup>
        </Form>

        <div className={styles.drugsPreview}>
          <p className={styles.drugsLabel}>
            {t('includedDrugs', 'Included Drugs')} ({drugs.length})
          </p>
          {drugs.length === 0 ? (
            <p className={styles.drugsEmpty}>{t('addDrugsFirst', 'Add drugs in the editor first, then save.')}</p>
          ) : (
            <div className={styles.drugsList}>
              {drugs.map((d, i) => (
                <p key={d.id} className={styles.drugItem}>
                  <span className={styles.drugIndex}>{i + 1}.</span>{' '}
                  <span className={styles.drugName}>{d.drugName}</span>{' '}
                  <span className={styles.drugMeta}>
                    {d.dose}{' '}
                    {orderConfig ? getDisplayForConfig(orderConfig.drugDosingUnits, d.doseUnit) : d.doseUnit}{' '}
                    ·{' '}
                    {orderConfig ? getDisplayForConfig(orderConfig.drugRoutes, d.route) : d.route}{' '}
                    ·{' '}
                    {orderConfig ? getDisplayForConfig(orderConfig.orderFrequencies, d.frequency) : d.frequency}
                  </span>
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={styles.footer}>
        <Button kind="secondary" size="sm" onClick={onCancel}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button
          size="sm"
          renderIcon={Save}
          onClick={handleSave}
          disabled={!name.trim() || !category || drugs.length === 0}
        >
          {t('saveOrderSet', 'Save Order Set')}
        </Button>
      </div>
    </div>
  );
}
