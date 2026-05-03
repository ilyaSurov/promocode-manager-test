import axios from 'axios';

export function axiosMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const raw = error.response?.data as { message?: string | string[] } | undefined;
    const m = raw?.message;
    if (Array.isArray(m)) {
      return m.join(', ');
    }
    if (typeof m === 'string') {
      return m;
    }
    if (error.response?.status != null) {
      return `HTTP ${error.response.status}`;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Something went wrong';
}
