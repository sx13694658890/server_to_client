import { Button, Card, Space, Typography } from 'antd';
import { getApiBaseUrl } from '@repo/utils';
import { useDocumentTitle, useToggle } from 'usehooks-ts';
import { useState } from 'react';
import { getApiErrorMessage } from '@repo/api';
import { API_V1_PREFIX } from '../../constants';
import { AiChatWidget } from '../../features/ai-chat';
import { useWebApi } from '../../hooks/use-web-api';

/** 登录后工作台首页：环境与连通性调试 + AI 助手 */
export function DashboardHomePage() {
  useDocumentTitle('工作台 · client-react-sp');

  const api = useWebApi();
  const [pingText, setPingText] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showEnvCard, toggleShowEnvCard] = useToggle(true);

  const apiBaseLabel = getApiBaseUrl(import.meta.env) || '（相对路径，经 Vite 代理 /api）';

  async function callPing() {
    setLoading(true);
    setPingText('');
    try {
      const { data, status } = await api.system.ping();
      const text = typeof data === 'string' ? data : String(data ?? '');
      setPingText(text || `OK (${status})`);
    } catch (e) {
      setPingText(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-[calc(100dvh-56px-48px)]">
      <Typography.Title level={4} className="!mb-6">
        工作台
      </Typography.Title>
      <Space direction="vertical" size="large" className="w-full max-w-2xl">
        <Card
          title="环境"
          extra={
            <Button type="link" size="small" onClick={toggleShowEnvCard}>
              {showEnvCard ? '收起' : '展开'}
            </Button>
          }
        >
          {showEnvCard ? (
            <>
              <Typography.Paragraph className="!mb-2">
                <code className="rounded bg-neutral-100 px-1 py-0.5">VITE_API_BASE_URL</code>：{' '}
                {String(import.meta.env.VITE_API_BASE_URL ?? '') || '（空）'}
              </Typography.Paragraph>
              <Typography.Paragraph className="!mb-0 text-neutral-600">
                实际请求基路径：<strong>{apiBaseLabel}</strong> + <code>{API_V1_PREFIX}</code>
              </Typography.Paragraph>
            </>
          ) : (
            <Typography.Text type="secondary">已收起</Typography.Text>
          )}
        </Card>
        <Card title="连通性">
          <Typography.Paragraph type="secondary" className="!mb-3">
            调用 <code>GET /api/v1/ping</code>（需本地后端与代理，见 docs/FRONTEND_API.md §2）。
          </Typography.Paragraph>
          <Space wrap>
            <Button type="primary" loading={loading} onClick={callPing}>
              Ping
            </Button>
            {pingText ? (
              <Typography.Text className="block w-full whitespace-pre-wrap">{pingText}</Typography.Text>
            ) : null}
          </Space>
        </Card>
      </Space>

      <AiChatWidget />
    </div>
  );
}
