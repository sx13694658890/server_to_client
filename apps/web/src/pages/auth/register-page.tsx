import { App, Button, Card, Form, Input, Typography } from 'antd';
import { getApiErrorMessage } from '@repo/api';
import { useAuth } from '@repo/hooks';
import { useDocumentTitle } from 'usehooks-ts';
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useWebApi } from '../../hooks/use-web-api';
import { zodErrorToFormFieldData } from '../../lib/zod-antd';
import {
  authCredentialsSchema,
  registerResponseSchema,
  type AuthCredentialsFormValues,
} from '../../schemas/auth';

export function RegisterPage() {
  useDocumentTitle('注册 · client-react-sp');

  const { message } = App.useApp();
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const api = useWebApi();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  if (accessToken) {
    return <Navigate to="/dashboard/home" replace />;
  }

  async function onFinish(raw: AuthCredentialsFormValues) {
    const parsedValues = authCredentialsSchema.safeParse(raw);
    if (!parsedValues.success) {
      form.setFields(zodErrorToFormFieldData(parsedValues.error));
      return;
    }
    const values = parsedValues.data;

    setSubmitting(true);
    try {
      const { status, data } = await api.auth.register({
        username: values.username,
        password: values.password,
      });
      if (status === 201) {
        const body = registerResponseSchema.safeParse(data);
        if (body.success) {
          message.success(`注册成功：${body.data.email}`);
        } else {
          message.warning('注册已创建账号，但响应格式与约定不一致');
        }
        navigate('/login', { replace: true });
        return;
      }
    } catch (e) {
      message.error(getApiErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-4">
      <Card
        className="w-full max-w-md"
        title={
          <Typography.Title level={3} style={{ margin: 0 }}>
            注册
          </Typography.Title>
        }
      >
        <Form form={form} layout="vertical" onFinish={onFinish} requiredMark="optional">
          <Form.Item name="username" label="邮箱">
            <Input autoComplete="email" placeholder="user@example.com" />
          </Form.Item>
          <Form.Item name="password" label="密码">
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item className="!mb-2">
            <Button type="primary" htmlType="submit" loading={submitting} block>
              注册
            </Button>
          </Form.Item>
          <Typography.Text type="secondary">
            已有账号？<Link to="/login">去登录</Link>
          </Typography.Text>
        </Form>
      </Card>
    </div>
  );
}
