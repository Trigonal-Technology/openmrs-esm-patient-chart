import type { DashboardLinkConfig } from '@openmrs/esm-patient-common-lib';

export const fastOrdersDashboardMeta: DashboardLinkConfig & { slot: string; hideDashboardTitle: boolean } = {
  slot: 'patient-chart-orders-fast-dashboard-slot',
  path: 'Orders (Fast)',
  title: 'Orders (Fast)',
  icon: 'omrs-icon-add',
  hideDashboardTitle: true,
};
