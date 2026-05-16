import { defineConfigSchema, getSyncLifecycle } from '@openmrs/esm-framework';
import { createDashboardLink } from '@openmrs/esm-patient-common-lib';
import { configSchema } from './config-schema';
import { fastOrdersDashboardMeta } from './dashboard.meta';
import FastOrdersDashboard from './fast-orders-dashboard.component';
import FastOrdersBasketPanelExtension from './order-basket/fast-orders-basket-panel.extension';

const moduleName = '@openmrs/esm-patient-orders-fast-app';

const options = {
  featureName: 'patient-orders-fast',
  moduleName,
};

export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');

export function startupApp() {
  defineConfigSchema(moduleName, configSchema);
}

export const fastOrdersDashboardLink = getSyncLifecycle(createDashboardLink({ ...fastOrdersDashboardMeta }), options);

export const fastOrdersDashboard = getSyncLifecycle(FastOrdersDashboard, options);

export const fastOrdersBasketPanel = getSyncLifecycle(FastOrdersBasketPanelExtension, options);
