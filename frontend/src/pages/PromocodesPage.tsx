import {
  Badge,
  Button,
  Group,
  Modal,
  NumberInput,
  Stack,
  Switch,
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
import type { Promocode } from '../api/types';
import {
  createPromocode,
  deactivatePromocode,
  listPromocodes,
  updatePromocode,
} from '../api/endpoints';
import { axiosMessage } from '../utils/axios-message';

const createSchema = z.object({
  code: z.string().min(2).max(64),
  discountPercent: z.coerce.number().min(1).max(100),
  maxUsesTotal: z.coerce.number().int().min(0),
  maxUsesPerUser: z.coerce.number().int().min(0),
  validFrom: z.string().optional(),
  validTo: z.string().optional(),
  isActive: z.boolean().optional(),
});

type CreateForm = z.infer<typeof createSchema>;

function invalidateAnalytics(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ['analytics-users'] });
  void qc.invalidateQueries({ queryKey: ['analytics-promos'] });
  void qc.invalidateQueries({ queryKey: ['analytics-usages'] });
}

export function PromocodesPage() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['promocodes'],
    queryFn: listPromocodes,
  });
  const [editPc, setEditPc] = useState<Promocode | null>(null);

  const create = useForm<CreateForm>({
    resolver: zodResolver(createSchema) as Resolver<CreateForm>,
    defaultValues: {
      code: '',
      discountPercent: 10,
      maxUsesTotal: 100,
      maxUsesPerUser: 1,
      isActive: true,
    },
  });

  const createMut = useMutation({
    mutationFn: createPromocode,
    onSuccess: async () => {
      notifications.show({
        title: 'Created',
        message: 'Promocode has been saved',
        color: 'green',
      });
      await qc.invalidateQueries({ queryKey: ['promocodes'] });
      invalidateAnalytics(qc);
      create.reset();
    },
    onError: (e) =>
      notifications.show({
        title: 'Error',
        message: axiosMessage(e),
        color: 'red',
      }),
  });

  const deactivateMut = useMutation({
    mutationFn: deactivatePromocode,
    onSuccess: async () => {
      notifications.show({
        title: 'Deactivated',
        message: 'Promocode set to inactive',
        color: 'green',
      });
      await qc.invalidateQueries({ queryKey: ['promocodes'] });
      invalidateAnalytics(qc);
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
      <Title order={3}>Promocodes</Title>

      <Stack gap="xs" p="md" style={{ border: '1px solid var(--mantine-color-default-border)', borderRadius: 8 }}>
        <Title order={5}>Create</Title>
        <form
          onSubmit={create.handleSubmit((v) =>
            createMut.mutate({
              ...v,
              validFrom: v.validFrom || undefined,
              validTo: v.validTo || undefined,
            }),
          )}
        >
          <Stack gap="xs">
            <Group grow>
              <Controller
                name="code"
                control={create.control}
                render={({ field, fieldState }) => (
                  <TextInput label="Code" {...field} error={fieldState.error?.message} />
                )}
              />
              <Controller
                name="discountPercent"
                control={create.control}
                render={({ field, fieldState }) => (
                  <NumberInput
                    label="Discount %"
                    min={1}
                    max={100}
                    value={field.value}
                    onChange={(n) => field.onChange(typeof n === 'number' ? n : field.value)}
                    error={fieldState.error?.message}
                  />
                )}
              />
            </Group>
            <Group grow>
              <Controller
                name="maxUsesTotal"
                control={create.control}
                render={({ field, fieldState }) => (
                  <NumberInput
                    label="Max uses total"
                    min={0}
                    value={field.value}
                    onChange={(n) => field.onChange(typeof n === 'number' ? n : field.value)}
                    error={fieldState.error?.message}
                  />
                )}
              />
              <Controller
                name="maxUsesPerUser"
                control={create.control}
                render={({ field, fieldState }) => (
                  <NumberInput
                    label="Max per user"
                    min={0}
                    value={field.value}
                    onChange={(n) => field.onChange(typeof n === 'number' ? n : field.value)}
                    error={fieldState.error?.message}
                  />
                )}
              />
            </Group>
            <Group grow>
              <Controller
                name="validFrom"
                control={create.control}
                render={({ field }) => (
                  <TextInput type="datetime-local" label="Valid from (optional)" {...field} />
                )}
              />
              <Controller
                name="validTo"
                control={create.control}
                render={({ field }) => (
                  <TextInput type="datetime-local" label="Valid to (optional)" {...field} />
                )}
              />
            </Group>
            <Controller
              name="isActive"
              control={create.control}
              render={({ field }) => (
                <Switch
                  label="Active"
                  checked={Boolean(field.value)}
                  onChange={(e) => field.onChange(e.currentTarget.checked)}
                />
              )}
            />
            <Button type="submit" loading={createMut.isPending}>
              Create
            </Button>
          </Stack>
        </form>
      </Stack>

      <Stack gap="xs" p="md" style={{ border: '1px solid var(--mantine-color-default-border)', borderRadius: 8 }}>
        <Title order={5}>All promocodes</Title>
        {list.isPending ? (
          <div>Loading…</div>
        ) : list.isError ? (
          <div>{(list.error as Error).message}</div>
        ) : (
          <Table striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Code</Table.Th>
                <Table.Th>%</Table.Th>
                <Table.Th>Limits</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(list.data ?? []).map((p) => (
                <Table.Tr key={p._id}>
                  <Table.Td>{p.code}</Table.Td>
                  <Table.Td>{p.discountPercent}</Table.Td>
                  <Table.Td>
                    {p.maxUsesTotal} / {p.maxUsesPerUser}
                  </Table.Td>
                  <Table.Td>
                    <Badge color={p.isActive ? 'green' : 'gray'}>
                      {p.isActive ? 'active' : 'inactive'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Button size="xs" variant="light" onClick={() => setEditPc(p)}>
                        Edit
                      </Button>
                      <Button
                        size="xs"
                        color="orange"
                        variant="light"
                        disabled={!p.isActive}
                        onClick={() => {
                          if (confirm('Deactivate this promocode?')) {
                            deactivateMut.mutate(p._id);
                          }
                        }}
                      >
                        Deactivate
                      </Button>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Stack>

      <Modal
        opened={editPc !== null}
        onClose={() => setEditPc(null)}
        title="Edit promocode"
      >
        {editPc ? (
          <EditPromocodeForm
            key={editPc._id}
            promocode={editPc}
            onDone={() => setEditPc(null)}
          />
        ) : null}
      </Modal>
    </Stack>
  );
}

function EditPromocodeForm({
  promocode,
  onDone,
}: {
  promocode: Promocode;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const form = useForm<CreateForm>({
    resolver: zodResolver(createSchema) as Resolver<CreateForm>,
    defaultValues: {
      code: promocode.code,
      discountPercent: promocode.discountPercent,
      maxUsesTotal: promocode.maxUsesTotal,
      maxUsesPerUser: promocode.maxUsesPerUser,
      validFrom: promocode.validFrom ?? '',
      validTo: promocode.validTo ?? '',
      isActive: promocode.isActive,
    },
  });

  const mut = useMutation({
    mutationFn: (v: CreateForm) =>
      updatePromocode(promocode._id, {
        code: v.code,
        discountPercent: v.discountPercent,
        maxUsesTotal: v.maxUsesTotal,
        maxUsesPerUser: v.maxUsesPerUser,
        validFrom: v.validFrom ? v.validFrom : null,
        validTo: v.validTo ? v.validTo : null,
        isActive: v.isActive,
      }),
    onSuccess: async () => {
      notifications.show({
        title: 'Saved',
        message: 'Changes applied',
        color: 'green',
      });
      await qc.invalidateQueries({ queryKey: ['promocodes'] });
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
    <form onSubmit={form.handleSubmit((v) => mut.mutate(v))}>
      <Stack>
        <Controller
          name="code"
          control={form.control}
          render={({ field, fieldState }) => (
            <TextInput {...field} label="Code" error={fieldState.error?.message} />
          )}
        />
        <Controller
          name="discountPercent"
          control={form.control}
          render={({ field, fieldState }) => (
            <NumberInput
              label="%"
              min={1}
              max={100}
              value={field.value}
              onChange={(n) => field.onChange(typeof n === 'number' ? n : field.value)}
              error={fieldState.error?.message}
            />
          )}
        />
        <Group grow>
          <Controller
            name="maxUsesTotal"
            control={form.control}
            render={({ field, fieldState }) => (
              <NumberInput
                label="Max total"
                min={0}
                value={field.value}
                onChange={(n) => field.onChange(typeof n === 'number' ? n : field.value)}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            name="maxUsesPerUser"
            control={form.control}
            render={({ field, fieldState }) => (
              <NumberInput
                label="Max per user"
                min={0}
                value={field.value}
                onChange={(n) => field.onChange(typeof n === 'number' ? n : field.value)}
                error={fieldState.error?.message}
              />
            )}
          />
        </Group>
        <Controller
          name="isActive"
          control={form.control}
          render={({ field }) => (
            <Switch
              label="Active"
              checked={Boolean(field.value)}
              onChange={(e) => field.onChange(e.currentTarget.checked)}
            />
          )}
        />
        <Button type="submit" loading={mut.isPending}>
          Save
        </Button>
      </Stack>
    </form>
  );
}
