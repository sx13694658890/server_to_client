import { App, Button, Card, Form, Input, Typography } from 'antd';
import { getApiErrorMessage } from '@repo/api';
import { useAuth } from '@repo/hooks';
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useDocumentTitle } from 'usehooks-ts';
import { useWebApi } from '../hooks/use-web-api';
import { zodErrorToFormFieldData } from '../lib/zod-antd';
import {
  authCredentialsSchema,
  loginResponseSchema,
  type AuthCredentialsFormValues,
} from '../schemas/auth';

export function LoginPage() {
  useDocumentTitle('登录 · client-react-sp');

  const { message } = App.useApp();
  const navigate = useNavigate();
  const { accessToken, setAccessToken } = useAuth();
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
      const { data } = await api.auth.login({
        username: values.username,
        password: values.password,
      });
      const body = loginResponseSchema.safeParse(data);
      if (!body.success) {
        message.error('响应格式与约定不一致');
        return;
      }
      setAccessToken(body.data.access_token);
      message.success('登录成功');
      navigate('/dashboard/home', { replace: true });
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
            登录
          </Typography.Title>
        }
      >
        <Form form={form} layout="vertical" onFinish={onFinish} requiredMark="optional">
          <Form.Item name="username" label="邮箱">
            <Input autoComplete="email" placeholder="user@example.com" />
          </Form.Item>
          <Form.Item name="password" label="密码">
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Form.Item className="!mb-2">
            <Button type="primary" htmlType="submit" loading={submitting} block>
              登录
            </Button>
          </Form.Item>
          <Typography.Text type="secondary">
            还没有账号？<Link to="/register">去注册</Link>
          </Typography.Text>
        </Form>
      </Card>
    </div>
  );
}
