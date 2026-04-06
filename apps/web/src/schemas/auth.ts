import { z } from 'zod';

const trimmedEmail = z.preprocess(
  (val) => (typeof val === 'string' ? val.trim() : val),
  z.string().min(1, '请输入邮箱').email('请输入有效邮箱')
);

/** 登录 / 注册表单（与 FastAPI 字段名 `username` 对齐，值为邮箱） */
export const authCredentialsSchema = z.object({
  username: trimmedEmail,
  password: z.string().min(1, '请输入密码'),
});

export type AuthCredentialsFormValues = z.infer<typeof authCredentialsSchema>;

/** POST /auth/login 成功体 */
export const loginResponseSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string(),
  expires_in: z.number(),
});

export type LoginResponse = z.infer<typeof loginResponseSchema>;

/** POST /auth/register 201 响应体 */
export const registerResponseSchema = z.object({
  user_id: z.string().uuid(),
  email: z.string().email(),
});

export type RegisterResponse = z.infer<typeof registerResponseSchema>;
