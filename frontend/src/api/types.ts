export type TokensResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn?: string;
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type AnalyticsUserRow = {
  id: string;
  email: string;
  name: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
  orderCount: number;
  totalSpent: number;
  totalDiscount: number;
  promoUsageCount: number;
};

export type AnalyticsPromoRow = {
  id: string;
  code: string;
  discountPercent: number;
  maxUsesTotal: number;
  maxUsesPerUser: number;
  validFrom: string | null;
  validTo: string | null;
  isActive: boolean;
  createdAt: string;
  usageCount: number;
  uniqueUsers: number;
  revenueDiscount: number;
};

export type AnalyticsUsageRow = {
  id: string;
  promocodeId: string;
  promocodeCode: string;
  userId: string;
  userEmail: string;
  userName: string;
  orderId: string;
  discountAmount: number;
  usedAt: string;
};

export type Promocode = {
  _id: string;
  code: string;
  discountPercent: number;
  maxUsesTotal: number;
  maxUsesPerUser: number;
  validFrom: string | null;
  validTo: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Order = {
  _id: string;
  userId: string;
  amount: number;
  promocodeId: string | null;
  discountAmount: number;
  promocodeAppliedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
