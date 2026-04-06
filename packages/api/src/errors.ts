import axios from 'axios';
import { formatFastApiDetail, type FastApiErrorBody } from '@repo/utils';

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as FastApiErrorBody | undefined;
    if (data?.detail != null) {
      return formatFastApiDetail(data.detail) || error.message;
    }
    return error.response?.statusText || error.message || '请求失败';
  }
  if (error instanceof Error) return error.message;
  return '请求失败';
}

export async function readFetchErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as FastApiErrorBody;
    return formatFastApiDetail(body.detail) || res.statusText || '请求失败';
  } catch {
    return res.statusText || '请求失败';
  }
}
