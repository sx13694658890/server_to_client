import { z } from 'zod';

/** 与后端约定一致：新密码至少 6 位、最长 256（见 docs/FRONTEND_API.md §2.1） */
export const changePasswordFormSchema = z
  .object({
    current_password: z.string().min(1, '请输入当前密码'),
    new_password: z
      .string()
      .min(6, '新密码至少 6 位')
      .max(256, '新密码最长 256 位'),
    new_password_confirm: z.string().min(1, '请再次输入新密码'),
  })
  .refine((d) => d.new_password === d.new_password_confirm, {
    message: '两次输入的新密码不一致',
    path: ['new_password_confirm'],
  })
  .refine((d) => d.current_password !== d.new_password, {
    message: '新密码不能与当前密码相同',
    path: ['new_password'],
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordFormSchema>;
