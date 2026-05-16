import { defineConfigSchema, getSyncLifecycle } from '@openmrs/esm-framework';
import { createDashboardLink } from '@openmrs/esm-patient-common-lib';
import { configSchema } from './config-schema';
import { ordersetDashboardMeta } from './dashboard.meta';
import OrdersetDashboard from './orderset-dashboard.component';
import OrdersetBasketPanelExtension from './order-basket/orderset-basket-panel.extension';
import { createLeftPanelLink } from './left-panel-link';

const moduleName = '@openmrs/esm-orderset-app';

const options = {
  featureName: 'patient-orderset',
  moduleName,
};

export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');

export function startupApp() {
  defineConfigSchema(moduleName, configSchema);
}

export const orderSetDashboardLink = getSyncLifecycle(
  createLeftPanelLink({
    name: 'orderset',
    title: 'Order Sets',
  }),
  options,
);

export const ordersetDashboardLink = getSyncLifecycle(createDashboardLink({ ...ordersetDashboardMeta }), options);

export const ordersetDashboard = getSyncLifecycle(OrdersetDashboard, options);

export const ordersetBasketPanel = getSyncLifecycle(OrdersetBasketPanelExtension, options);
