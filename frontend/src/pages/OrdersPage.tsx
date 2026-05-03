import {
  Button,
  Group,
  Modal,
  NumberInput,
  Stack,
  Table,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { Resolver } from 'react-hook-form';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import type { Order } from '../api/types';
import {
  applyPromocode,
  createOrder,
  listMyOrders,
} from '../api/endpoints';
import { axiosMessage } from '../utils/axios-message';

const orderSchema = z.object({
  amount: z.coerce.number().min(0.01),
});

type OrderFormValues = z.infer<typeof orderSchema>;

const applySchema = z.object({
  code: z.string().min(2).max(64),
});

export function OrdersPage() {
  const qc = useQueryClient();
  const orders = useQuery({
    queryKey: ['orders-mine'],
    queryFn: listMyOrders,
  });

  const [applyOrder, setApplyOrder] = useState<Order | null>(null);

  const createForm = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema) as Resolver<OrderFormValues>,
    defaultValues: { amount: 100 },
  });

  const createMut = useMutation({
    mutationFn: (amount: number) => createOrder(amount),
    onSuccess: async () => {
      notifications.show({
        title: 'Order created',
        message: 'Added to your orders',
        color: 'green',
      });
      await qc.invalidateQueries({ queryKey: ['orders-mine'] });
      invalidateAnalytics(qc);
      createForm.reset({ amount: 100 });
    },
    onError: (e) =>
      notifications.show({
        title: 'Error',
        message: axiosMessage(e),
        color: 'red',
      }),
  });

  return (
    <Stack gap="md">
      <Title order={3}>Orders</Title>

      <Stack gap="xs" p="md" style={{ border: '1px solid var(--mantine-color-default-border)', borderRadius: 8 }}>
        <Title order={5}>New order</Title>
        <form
          onSubmit={createForm.handleSubmit((v) => createMut.mutate(v.amount))}
        >
          <Group align="flex-end">
            <Controller
              name="amount"
              control={createForm.control}
              render={({ field, fieldState }) => (
                <NumberInput
                  label="Amount"
                  min={0.01}
                  decimalScale={2}
                  value={field.value}
                  onChange={(n) =>
                    field.onChange(typeof n === 'number' ? n : field.value)
                  }
                  error={fieldState.error?.message}
                />
              )}
            />
            <Button type="submit" loading={createMut.isPending}>
              Create
            </Button>
          </Group>
        </form>
      </Stack>

      <Stack gap="xs" p="md" style={{ border: '1px solid var(--mantine-color-default-border)', borderRadius: 8 }}>
        <Title order={5}>My orders</Title>
        {orders.isPending ? (
          <div>Loading…</div>
        ) : orders.isError ? (
          <div>{(orders.error as Error).message}</div>
        ) : (
          <Table striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Amount</Table.Th>
                <Table.Th>Discount</Table.Th>
                <Table.Th>Promo</Table.Th>
                <Table.Th>Created</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(orders.data ?? []).map((o) => (
                <Table.Tr key={o._id}>
                  <Table.Td>{o.amount.toFixed(2)}</Table.Td>
                  <Table.Td>{o.discountAmount.toFixed(2)}</Table.Td>
                  <Table.Td>{o.promocodeId ? 'yes' : '—'}</Table.Td>
                  <Table.Td>
                    {new Date(o.createdAt).toLocaleString()}
                  </Table.Td>
                  <Table.Td>
                    <Button
                      size="xs"
                      variant="light"
                      disabled={Boolean(o.promocodeId)}
                      onClick={() => setApplyOrder(o)}
                    >
                      Apply promo
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Stack>

      <Modal
        opened={applyOrder !== null}
        onClose={() => setApplyOrder(null)}
        title="Apply promocode"
      >
        {applyOrder ? (
          <ApplyPromoForm
            key={applyOrder._id}
            order={applyOrder}
            onDone={() => setApplyOrder(null)}
            qc={qc}
          />
        ) : null}
      </Modal>
    </Stack>
  );
}

function ApplyPromoForm({
  order,
  onDone,
  qc,
}: {
  order: Order;
  onDone: () => void;
  qc: ReturnType<typeof useQueryClient>;
}) {
  const form = useForm<{ code: string }>({
    resolver: zodResolver(applySchema),
    defaultValues: { code: '' },
  });

  const mut = useMutation({
    mutationFn: (code: string) => applyPromocode(order._id, code),
    onSuccess: async () => {
      notifications.show({
        title: 'Promocode applied',
        message: 'Order updated',
        color: 'green',
      });
      await qc.invalidateQueries({ queryKey: ['orders-mine'] });
      invalidateAnalytics(qc);
      onDone();
    },
    onError: (e) =>
      notifications.show({
        title: 'Error',
        message: axiosMessage(e),
        color: 'red',
      }),
  });

  return (
    <form onSubmit={form.handleSubmit((v) => mut.mutate(v.code.trim()))}>
      <Stack>
        <Controller
          name="code"
          control={form.control}
          render={({ field, fieldState }) => (
            <TextInput
              label="Promocode"
              {...field}
              error={fieldState.error?.message}
            />
          )}
        />
        <Button type="submit" loading={mut.isPending}>
          Apply
        </Button>
      </Stack>
    </form>
  );
}

function invalidateAnalytics(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ['analytics-users'] });
  void qc.invalidateQueries({ queryKey: ['analytics-promos'] });
  void qc.invalidateQueries({ queryKey: ['analytics-usages'] });
}
