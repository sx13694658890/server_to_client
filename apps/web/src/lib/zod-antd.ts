import type { ZodError } from 'zod';

/**
 * 将 Zod 校验错误映射为 antd Form `setFields` 所需结构（仅包含有路径的 issue）。
 */
export function zodErrorToFormFieldData(error: ZodError) {
  return error.issues
    .filter((issue) => issue.path.length > 0)
    .map((issue) => ({
      name: issue.path,
      errors: [issue.message],
    }));
}
