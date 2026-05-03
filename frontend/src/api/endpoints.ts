import { api } from './client';
import type {
  AnalyticsPromoRow,
  AnalyticsUsageRow,
  AnalyticsUserRow,
  Order,
  Paginated,
  Promocode,
  TokensResponse,
} from './types';

export async function login(email: string, password: string): Promise<TokensResponse> {
  const { data } = await api.post<TokensResponse>('/api/auth/login', {
    email,
    password,
  });
  return data;
}

export async function register(payload: {
  email: string;
  password: string;
  name: string;
  phone: string;
}): Promise<TokensResponse> {
  const { data } = await api.post<TokensResponse>('/api/auth/register', payload);
  return data;
}

export async function logout(refreshToken: string): Promise<void> {
  await api.post('/api/auth/logout', { refreshToken });
}

export type AnalyticsQuery = {
  page?: number;
  pageSize?: number;
  dateFrom: string;
  dateTo: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filterEmail?: string;
  filterCode?: string;
  filterActive?: 0 | 1;
};

export async function analyticsUsers(
  q: AnalyticsQuery,
): Promise<Paginated<AnalyticsUserRow>> {
  const { data } = await api.get<Paginated<AnalyticsUserRow>>('/api/analytics/users', {
    params: q,
  });
  return data;
}

export async function analyticsPromocodes(
  q: AnalyticsQuery,
): Promise<Paginated<AnalyticsPromoRow>> {
  const { data } = await api.get<Paginated<AnalyticsPromoRow>>(
    '/api/analytics/promocodes',
    { params: q },
  );
  return data;
}

export async function analyticsPromoUsages(
  q: AnalyticsQuery,
): Promise<Paginated<AnalyticsUsageRow>> {
  const { data } = await api.get<Paginated<AnalyticsUsageRow>>(
    '/api/analytics/promo-usages',
    { params: q },
  );
  return data;
}

export async function listPromocodes(): Promise<Promocode[]> {
  const { data } = await api.get<Promocode[]>('/api/promocodes', {
    params: { page: 1, pageSize: 100 },
  });
  return data;
}

export async function createPromocode(payload: {
  code: string;
  discountPercent: number;
  maxUsesTotal: number;
  maxUsesPerUser: number;
  validFrom?: string;
  validTo?: string;
  isActive?: boolean;
}): Promise<Promocode> {
  const { data } = await api.post<Promocode>('/api/promocodes', payload);
  return data;
}

export async function updatePromocode(
  id: string,
  payload: Partial<{
    code: string;
    discountPercent: number;
    maxUsesTotal: number;
    maxUsesPerUser: number;
    validFrom: string | null;
    validTo: string | null;
    isActive: boolean;
  }>,
): Promise<Promocode> {
  const { data } = await api.patch<Promocode>(`/api/promocodes/${id}`, payload);
  return data;
}

export async function deactivatePromocode(id: string): Promise<Promocode> {
  const { data } = await api.patch<Promocode>(`/api/promocodes/${id}/deactivate`);
  return data;
}

export async function createOrder(amount: number): Promise<Order> {
  const { data } = await api.post<Order>('/api/orders', { amount });
  return data;
}

export async function listMyOrders(): Promise<Order[]> {
  const { data } = await api.get<Order[]>('/api/orders/mine');
  return data;
}

export async function applyPromocode(
  orderId: string,
  code: string,
): Promise<Order> {
  const { data } = await api.post<Order>(
    `/api/orders/${orderId}/apply-promocode`,
    { code },
  );
  return data;
}
