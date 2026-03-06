import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Search } from '@carbon/react/icons';
import { TextInput } from '@carbon/react';
import { usePatientDrugOrders } from '../resources/patient-orders.resource';
import type { Order } from '@openmrs/esm-patient-common-lib';
import type { OrderConfigObject } from '../resources/order-config.resource';
import styles from './orders-table.scss';

interface OrdersTableProps {
  patientUuid: string;
  orderConfig: OrderConfigObject;
  drugOrderTypeUuid?: string;
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function OrdersTable({ patientUuid, orderConfig, drugOrderTypeUuid }: OrdersTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: orders,
    isLoading,
    error,
  } = usePatientDrugOrders(patientUuid, drugOrderTypeUuid ?? '131168f4-15f5-102d-96e4-000c29c2a5d7');

  const toggleExpand = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredOrders =
    orders?.filter(
      (o) =>
        !searchQuery ||
        o.drug?.display?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase()),
    ) ?? [];

  if (isLoading || error || !orders) {
    return null;
  }

  if (orders.length === 0) return null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Recent Orders</h3>
          <p className={styles.subtitle}>
            {orders.length} order{orders.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className={styles.search}>
          <Search size={14} className={styles.searchIcon} />
          <TextInput
            id="orders-search"
            labelText=""
            size="sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search orders…"
            className={styles.searchInput}
          />
        </div>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.expandCol} />
            <th>Order #</th>
            <th>Date</th>
            <th>Order</th>
            <th>Priority</th>
            <th>Ordered by</th>
          </tr>
        </thead>
        <tbody>
          {filteredOrders.map((order: Order) => {
            const isExpanded = expandedRows.has(order.uuid);
            const priority = order.urgency === 'STAT' ? 'STAT' : 'Routine';

            return (
              <React.Fragment key={order.uuid}>
                <tr className={styles.row} onClick={() => toggleExpand(order.uuid)}>
                  <td className={styles.expandCol}>
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </td>
                  <td className={styles.mono}>{order.orderNumber}</td>
                  <td>{formatDate(order.dateActivated)}</td>
                  <td className={styles.drugName}>{order.drug?.display ?? order.display ?? 'Unknown'}</td>
                  <td>
                    <span className={order.urgency === 'STAT' ? styles.statTag : styles.routineTag}>{priority}</span>
                  </td>
                  <td>{order.orderer?.person?.display ?? order.orderer?.display ?? '—'}</td>
                </tr>
                {isExpanded && (
                  <tr className={styles.expandedRow}>
                    <td colSpan={6} className={styles.expandedCell}>
                      <div className={styles.detail}>
                        <p>
                          <strong>{order.drug?.display ?? order.display}</strong>
                        </p>
                        <p>
                          {order.dose != null && (
                            <>
                              <span className={styles.detailLabel}>DOSE</span> {order.dose}{' '}
                              {order.doseUnits?.display?.toLowerCase() ?? ''}
                            </>
                          )}
                          {order.route?.display && (
                            <>
                              <span className={styles.sep}> — </span>
                              {order.route.display.toLowerCase()}
                            </>
                          )}
                          {order.frequency?.display && (
                            <>
                              <span className={styles.sep}> — </span>
                              {order.frequency.display.toLowerCase()}
                            </>
                          )}
                          {order.duration != null && (
                            <>
                              <span className={styles.sep}> — </span>
                              for {order.duration} {order.durationUnits?.display?.toLowerCase() ?? ''}
                            </>
                          )}
                        </p>
                        <p className={styles.qty}>
                          <span className={styles.detailLabel}>QTY</span> {order.quantity ?? '—'}
                          {order.asNeeded && (
                            <>
                              <span className={styles.sep}> — </span>
                              PRN (as needed)
                            </>
                          )}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>

      {filteredOrders.length === 0 && <div className={styles.empty}>No orders matching &quot;{searchQuery}&quot;</div>}
    </div>
  );
}
