import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Search } from '@carbon/react/icons';
import {
  TextInput,
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  TableContainer,
  TableExpandHeader,
  TableExpandRow,
  TableExpandedRow,
  Tag,
  DataTableSkeleton,
} from '@carbon/react';
import { usePagination } from '@openmrs/esm-framework';
import { usePatientDrugOrders } from '../resources/patient-orders.resource';
import { PatientChartPagination } from '@openmrs/esm-patient-common-lib';
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

  const toggleExpand = (id: string, isExpanded: boolean) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (isExpanded) {
        next.add(id);
      } else {
        next.delete(id);
      }
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

  const defaultPageSize = 10;
  const tableHeaders = [
    { key: 'orderNumber', header: 'Order #' },
    { key: 'date', header: 'Date' },
    { key: 'order', header: 'Order' },
    { key: 'priority', header: 'Priority' },
    { key: 'orderedBy', header: 'Ordered by' },
  ];

  const tableRows = filteredOrders.map((order: Order) => ({
    id: order.uuid,
    orderNumber: <span className={styles.mono}>{order.orderNumber}</span>,
    date: formatDate(order.dateActivated),
    order: <span className={styles.drugName}>{order.drug?.display ?? order.display ?? 'Unknown'}</span>,
    priority: (
      <Tag type={order.urgency === 'STAT' ? 'red' : 'green'}>{order.urgency === 'STAT' ? 'STAT' : 'Routine'}</Tag>
    ),
    orderedBy: order.orderer?.person?.display ?? order.orderer?.display ?? '—',
  }));

  const { results: paginatedOrders, goTo, currentPage } = usePagination(tableRows, defaultPageSize);

  if (isLoading) {
    return <DataTableSkeleton role="progressbar" zebra />;
  }

  if (error || !orders || orders.length === 0) {
    return null;
  }

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

      <DataTable headers={tableHeaders} rows={paginatedOrders} useZebraStyles size="sm">
        {({
          getTableContainerProps,
          getTableProps,
          getHeaderProps,
          getRowProps,
          getExpandedRowProps,
          headers,
          rows,
        }) => (
          <TableContainer {...getTableContainerProps()}>
            <Table className={styles.table} {...getTableProps()}>
              <TableHead>
                <TableRow>
                  <TableExpandHeader />
                  {headers.map((header) => (
                    <TableHeader {...getHeaderProps({ header })} key={header.key}>
                      {header.header}
                    </TableHeader>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => {
                  const matchingOrder = orders?.find((order) => order.uuid === row.id);
                  if (!matchingOrder) return null;

                  return (
                    <React.Fragment key={row.id}>
                      <TableExpandRow
                        className={styles.row}
                        {...(({ onClick, ...rest }) => rest)(getRowProps({ row }))}
                        onExpand={(e) => toggleExpand(row.id, !expandedRows.has(row.id))}
                        isExpanded={expandedRows.has(row.id)}
                      >
                        {row.cells.map((cell) => (
                          <TableCell key={cell.id}>{cell.value}</TableCell>
                        ))}
                      </TableExpandRow>
                      {expandedRows.has(row.id) && (
                        <TableExpandedRow
                          colSpan={headers.length + 1}
                          className={styles.expandedRow}
                          {...getExpandedRowProps({ row })}
                        >
                          <div className={styles.expandedCell}>
                            <div className={styles.detail}>
                              <p>
                                <strong>{matchingOrder.drug?.display ?? matchingOrder.display}</strong>
                              </p>
                              <p>
                                {matchingOrder.dose != null && (
                                  <>
                                    <span className={styles.detailLabel}>DOSE</span> {matchingOrder.dose}{' '}
                                    {matchingOrder.doseUnits?.display?.toLowerCase() ?? ''}
                                  </>
                                )}
                                {matchingOrder.route?.display && (
                                  <>
                                    <span className={styles.sep}> — </span>
                                    {matchingOrder.route.display.toLowerCase()}
                                  </>
                                )}
                                {matchingOrder.frequency?.display && (
                                  <>
                                    <span className={styles.sep}> — </span>
                                    {matchingOrder.frequency.display.toLowerCase()}
                                  </>
                                )}
                                {matchingOrder.duration != null && (
                                  <>
                                    <span className={styles.sep}> — </span>
                                    for {matchingOrder.duration}{' '}
                                    {matchingOrder.durationUnits?.display?.toLowerCase() ?? ''}
                                  </>
                                )}
                              </p>
                              <p className={styles.qty}>
                                <span className={styles.detailLabel}>QTY</span> {matchingOrder.quantity ?? '—'}
                                {matchingOrder.asNeeded && (
                                  <>
                                    <span className={styles.sep}> — </span>
                                    PRN (as needed)
                                  </>
                                )}
                              </p>
                            </div>
                          </div>
                        </TableExpandedRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DataTable>

      {filteredOrders.length === 0 && <div className={styles.empty}>No orders matching &quot;{searchQuery}&quot;</div>}
      {filteredOrders.length > 0 && (
        <div className={styles.paginationContainer}>
          <PatientChartPagination
            pageNumber={currentPage}
            totalItems={tableRows.length}
            currentItems={paginatedOrders.length}
            pageSize={defaultPageSize}
            onPageNumberChange={({ page }) => goTo(page)}
          />
        </div>
      )}
    </div>
  );
}
