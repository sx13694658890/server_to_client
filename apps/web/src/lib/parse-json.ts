import type { ZodType } from 'zod';

export type ParseJsonResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/**
 * 读取 JSON 响应并按 schema 校验，避免运行态结构漂移。
 */
export async function parseJsonWithSchema<T>(
  res: Response,
  schema: ZodType<T>
): Promise<ParseJsonResult<T>> {
  try {
    const json: unknown = await res.json();
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return { ok: false, error: '响应格式与约定不一致' };
    }
    return { ok: true, data: parsed.data };
  } catch {
    return { ok: false, error: '无法解析 JSON 响应' };
  }
}
