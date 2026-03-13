import type { DashboardLinkConfig } from '@openmrs/esm-patient-common-lib';

export const ordersetDashboardMeta: DashboardLinkConfig & { slot: string; hideDashboardTitle: boolean } = {
  slot: 'patient-chart-orderset-dashboard-slot',
  path: 'Order Sets',
  title: 'Order Sets',
  icon: 'omrs-icon-add',
  hideDashboardTitle: true,
};
