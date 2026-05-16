import React, { useMemo } from 'react';
import { type OrderBasketWindowProps, type PatientWorkspace2DefinitionProps } from '@openmrs/esm-patient-common-lib';
import OrderBasket from './order-basket.component';
import { createOrderBasketExtensionProps } from './order-basket.utils';

/**
 * This workspace renders the main order basket, which contains the buttons to add a drug order and to add a lab order.
 *
 * This workspace must only be used within the patient chart
 * @see exported-order-basket.workspace.tsx
 */
const OrderBasketWorkspace: React.FC<PatientWorkspace2DefinitionProps<{}, OrderBasketWindowProps>> = ({
  groupProps: { patientUuid, patient, visitContext, mutateVisitContext },
  closeWorkspace,
  launchChildWorkspace,
}) => {
  const orderBasketExtensionProps = useMemo(() => {
    const launchDrugOrderForm = (order: OrderBasketItem) => {
      launchChildWorkspace('add-drug-order', { order });
    };
    const launchLabOrderForm = (orderTypeUuid: string, order: OrderBasketItem) => {
      launchChildWorkspace('add-lab-order', { orderTypeUuid, order });
    };
    const launchGeneralOrderForm = (orderTypeUuid: string, order: OrderBasketItem) => {
      launchChildWorkspace('orderable-concept-workspace', { orderTypeUuid, order });
    };
    const launchImagingOrderForm = (orderTypeUuid: string, order: OrderBasketItem) => {
      launchChildWorkspace('add-imaging-order-workspace', { orderTypeUuid, order });
    };
    const launchProcedureOrderForm = (orderTypeUuid: string, order: OrderBasketItem) => {
      launchChildWorkspace('add-procedures-order', { orderTypeUuid, order });
    };
    const launchMedicalSupplyForm = (orderTypeUuid: string, order: OrderBasketItem) => {
      launchChildWorkspace('add-medical-supply-order', { orderTypeUuid, order });
    };

    return {
      patient,
      launchDrugOrderForm,
      launchLabOrderForm,
      launchGeneralOrderForm,
      launchImagingOrderForm,
      launchProcedureOrderForm,
      launchMedicalSupplyForm,
    } satisfies OrderBasketExtensionProps;
  }, [launchChildWorkspace, patient]);

  return (
    <OrderBasket
      patientUuid={patientUuid}
      patient={patient}
      visitContext={visitContext}
      mutateVisitContext={mutateVisitContext}
      closeWorkspace={closeWorkspace}
      orderBasketExtensionProps={orderBasketExtensionProps}
    />
  );
};

export default OrderBasketWorkspace;
