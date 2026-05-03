import {
  Alert,
  Button,
  Group,
  Loader,
  Modal,
  Pagination,
  Paper,
  Select,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
} from '@mantine/core';
import { DatePickerInput, type DatesRangeValue } from '@mantine/dates';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import type {
  AnalyticsPromoRow,
  AnalyticsUsageRow,
  AnalyticsUserRow,
} from '../api/types';
import {
  analyticsPromocodes,
  analyticsPromoUsages,
  analyticsUsers,
} from '../api/endpoints';
import { useDateRange } from '../context/DateRangeContext';

type TabKey = 'users' | 'promocodes' | 'usages';

function formatInclusiveEnd(dateToExclusive: string): string {
  return dayjs(dateToExclusive).subtract(1, 'millisecond').format('YYYY-MM-DD');
}

export function AnalyticsPage() {
  const dr = useDateRange();
  const [tab, setTab] = useState<TabKey>('users');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [sortBy, setSortBy] = useState<string>('email');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterEmail, setFilterEmail] = useState('');
  const [filterCode, setFilterCode] = useState('');
  const [customOpen, setCustomOpen] = useState(false);
  const [pickerRange, setPickerRange] = useState<DatesRangeValue<string>>([
    null,
    null,
  ]);

  useEffect(() => {
    if (!customOpen) {
      return;
    }
    setPickerRange([
      dayjs(dr.dateFrom).format('YYYY-MM-DD'),
      dayjs(dr.dateTo).subtract(1, 'millisecond').format('YYYY-MM-DD'),
    ]);
  }, [customOpen, dr.dateFrom, dr.dateTo]);

  useEffect(() => {
    setPage(1);
  }, [tab, dr.dateFrom, dr.dateTo, dr.preset]);

  const usersQuery = useQuery({
    queryKey: [
      'analytics-users',
      dr.dateFrom,
      dr.dateTo,
      page,
      pageSize,
      sortBy,
      sortOrder,
      filterEmail,
      tab,
    ],
    enabled: tab === 'users',
    queryFn: () =>
      analyticsUsers({
        dateFrom: dr.dateFrom,
        dateTo: dr.dateTo,
        page,
        pageSize,
        sortBy,
        sortOrder,
        filterEmail: filterEmail.trim() || undefined,
      }),
  });

  const promosQuery = useQuery({
    queryKey: [
      'analytics-promos',
      dr.dateFrom,
      dr.dateTo,
      page,
      pageSize,
      sortBy,
      sortOrder,
      filterCode,
      tab,
    ],
    enabled: tab === 'promocodes',
    queryFn: () =>
      analyticsPromocodes({
        dateFrom: dr.dateFrom,
        dateTo: dr.dateTo,
        page,
        pageSize,
        sortBy,
        sortOrder,
        filterCode: filterCode.trim() || undefined,
      }),
  });

  const usagesQuery = useQuery({
    queryKey: [
      'analytics-usages',
      dr.dateFrom,
      dr.dateTo,
      page,
      pageSize,
      sortBy,
      sortOrder,
      filterEmail,
      filterCode,
      tab,
    ],
    enabled: tab === 'usages',
    queryFn: () =>
      analyticsPromoUsages({
        dateFrom: dr.dateFrom,
        dateTo: dr.dateTo,
        page,
        pageSize,
        sortBy,
        sortOrder,
        filterEmail: filterEmail.trim() || undefined,
        filterCode: filterCode.trim() || undefined,
      }),
  });

  const userSortOptions = [
    { value: 'email', label: 'Email' },
    { value: 'name', label: 'Name' },
    { value: 'order_count', label: 'Orders' },
    { value: 'total_spent', label: 'Total spent' },
    { value: 'promo_usage_count', label: 'Promo uses' },
    { value: 'created_at', label: 'Created' },
  ];

  const promoSortOptions = [
    { value: 'code', label: 'Code' },
    { value: 'discount_percent', label: '%' },
    { value: 'usage_count', label: 'Uses' },
    { value: 'unique_users', label: 'Unique users' },
    { value: 'revenue_discount', label: 'Discount sum' },
    { value: 'created_at', label: 'Created' },
  ];

  const usageSortOptions = [
    { value: 'used_at', label: 'Used at' },
    { value: 'discount_amount', label: 'Discount' },
    { value: 'user_email', label: 'User email' },
    { value: 'promocode_code', label: 'Promo code' },
    { value: 'user_name', label: 'User name' },
  ];

  function UsersBody() {
    const q = usersQuery;
    if (q.isPending) {
      return (
        <Group justify="center" p="xl">
          <Loader />
        </Group>
      );
    }
    if (q.isError) {
      return (
        <Alert color="red" title="Failed to load">
          {(q.error as Error).message}
        </Alert>
      );
    }
    const data = q.data!;
    const rows = data.items as AnalyticsUserRow[];
    const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
    return (
      <Stack gap="sm">
        <Group grow align="flex-end">
          <TextInput
            label="Filter email"
            value={filterEmail}
            onChange={(e) => setFilterEmail(e.currentTarget.value)}
          />
          <Select
            label="Sort by"
            data={userSortOptions}
            value={sortBy}
            onChange={(v) => v && setSortBy(v)}
          />
          <Select
            label="Order"
            data={[
              { value: 'asc', label: 'Ascending' },
              { value: 'desc', label: 'Descending' },
            ]}
            value={sortOrder}
            onChange={(v) => v && setSortOrder(v as 'asc' | 'desc')}
          />
        </Group>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Email</Table.Th>
              <Table.Th>Name</Table.Th>
              <Table.Th>Orders</Table.Th>
              <Table.Th>Spent</Table.Th>
              <Table.Th>Promo uses</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((r) => (
              <Table.Tr key={r.id}>
                <Table.Td>{r.email}</Table.Td>
                <Table.Td>{r.name}</Table.Td>
                <Table.Td>{r.orderCount}</Table.Td>
                <Table.Td>{r.totalSpent.toFixed(2)}</Table.Td>
                <Table.Td>{r.promoUsageCount}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Total {data.total}
          </Text>
          <Pagination value={page} onChange={setPage} total={pages} />
        </Group>
      </Stack>
    );
  }

  function PromosBody() {
    const q = promosQuery;
    if (q.isPending) {
      return (
        <Group justify="center" p="xl">
          <Loader />
        </Group>
      );
    }
    if (q.isError) {
      return (
        <Alert color="red" title="Failed to load">
          {(q.error as Error).message}
        </Alert>
      );
    }
    const data = q.data!;
    const rows = data.items as AnalyticsPromoRow[];
    const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
    return (
      <Stack gap="sm">
        <Group grow align="flex-end">
          <TextInput
            label="Filter code"
            value={filterCode}
            onChange={(e) => setFilterCode(e.currentTarget.value)}
          />
          <Select
            label="Sort by"
            data={promoSortOptions}
            value={sortBy}
            onChange={(v) => v && setSortBy(v)}
          />
          <Select
            label="Order"
            data={[
              { value: 'asc', label: 'Ascending' },
              { value: 'desc', label: 'Descending' },
            ]}
            value={sortOrder}
            onChange={(v) => v && setSortOrder(v as 'asc' | 'desc')}
          />
        </Group>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Code</Table.Th>
              <Table.Th>%</Table.Th>
              <Table.Th>Uses</Table.Th>
              <Table.Th>Unique users</Table.Th>
              <Table.Th>Discount sum</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((r) => (
              <Table.Tr key={r.id}>
                <Table.Td>{r.code}</Table.Td>
                <Table.Td>{r.discountPercent}</Table.Td>
                <Table.Td>{r.usageCount}</Table.Td>
                <Table.Td>{r.uniqueUsers}</Table.Td>
                <Table.Td>{r.revenueDiscount.toFixed(2)}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Total {data.total}
          </Text>
          <Pagination value={page} onChange={setPage} total={pages} />
        </Group>
      </Stack>
    );
  }

  function UsagesBody() {
    const q = usagesQuery;
    if (q.isPending) {
      return (
        <Group justify="center" p="xl">
          <Loader />
        </Group>
      );
    }
    if (q.isError) {
      return (
        <Alert color="red" title="Failed to load">
          {(q.error as Error).message}
        </Alert>
      );
    }
    const data = q.data!;
    const rows = data.items as AnalyticsUsageRow[];
    const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
    return (
      <Stack gap="sm">
        <Group grow align="flex-end">
          <TextInput
            label="Filter email"
            value={filterEmail}
            onChange={(e) => setFilterEmail(e.currentTarget.value)}
          />
          <TextInput
            label="Filter promo code"
            value={filterCode}
            onChange={(e) => setFilterCode(e.currentTarget.value)}
          />
          <Select
            label="Sort by"
            data={usageSortOptions}
            value={sortBy}
            onChange={(v) => v && setSortBy(v)}
          />
          <Select
            label="Order"
            data={[
              { value: 'asc', label: 'Ascending' },
              { value: 'desc', label: 'Descending' },
            ]}
            value={sortOrder}
            onChange={(v) => v && setSortOrder(v as 'asc' | 'desc')}
          />
        </Group>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Promo</Table.Th>
              <Table.Th>User</Table.Th>
              <Table.Th>Discount</Table.Th>
              <Table.Th>Used at</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((r) => (
              <Table.Tr key={r.id}>
                <Table.Td>{r.promocodeCode}</Table.Td>
                <Table.Td>
                  {r.userEmail}
                  <Text size="xs" c="dimmed">
                    {r.userName}
                  </Text>
                </Table.Td>
                <Table.Td>{r.discountAmount.toFixed(2)}</Table.Td>
                <Table.Td>
                  {dayjs(r.usedAt).format('YYYY-MM-DD HH:mm')}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Total {data.total}
          </Text>
          <Pagination value={page} onChange={setPage} total={pages} />
        </Group>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <Paper p="md" withBorder>
        <Stack gap="sm">
          <Group gap="xs">
            <Text size="sm" fw={600}>
              Date range:
            </Text>
            <Button
              size="xs"
              variant={dr.preset === 'today' ? 'filled' : 'light'}
              onClick={() => dr.applyPreset('today')}
            >
              Today
            </Button>
            <Button
              size="xs"
              variant={dr.preset === '7d' ? 'filled' : 'light'}
              onClick={() => dr.applyPreset('7d')}
            >
              Last 7 days
            </Button>
            <Button
              size="xs"
              variant={dr.preset === '30d' ? 'filled' : 'light'}
              onClick={() => dr.applyPreset('30d')}
            >
              Last 30 days
            </Button>
            <Button size="xs" variant="outline" onClick={() => setCustomOpen(true)}>
              Custom…
            </Button>
          </Group>
          <Text size="sm" c="dimmed">
            From {dayjs(dr.dateFrom).format('YYYY-MM-DD')} to{' '}
            {formatInclusiveEnd(dr.dateTo)}
          </Text>
        </Stack>
      </Paper>

      <Modal
        opened={customOpen}
        onClose={() => setCustomOpen(false)}
        title="Custom date range"
      >
        <Stack>
          <DatePickerInput
            type="range"
            label="Inclusive range"
            value={pickerRange}
            onChange={setPickerRange}
          />
          <Button
            onClick={() => {
              const [a, b] = pickerRange;
              if (a && b) {
                dr.setCustomRange(
                  dayjs(a).toDate(),
                  dayjs(b).toDate(),
                );
                setCustomOpen(false);
              }
            }}
          >
            Apply
          </Button>
        </Stack>
      </Modal>

      <Tabs
        value={tab}
        onChange={(v) => {
          setTab((v as TabKey) ?? 'users');
          setSortBy(
            v === 'promocodes'
              ? 'code'
              : v === 'usages'
                ? 'used_at'
                : 'email',
          );
        }}
      >
        <Tabs.List>
          <Tabs.Tab value="users">Users</Tabs.Tab>
          <Tabs.Tab value="promocodes">Promocodes</Tabs.Tab>
          <Tabs.Tab value="usages">Promo usages</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="users" pt="md">
          <UsersBody />
        </Tabs.Panel>
        <Tabs.Panel value="promocodes" pt="md">
          <PromosBody />
        </Tabs.Panel>
        <Tabs.Panel value="usages" pt="md">
          <UsagesBody />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
