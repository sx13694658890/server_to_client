import { DeleteOutlined } from '@ant-design/icons';
import { App, Alert, Button, Card, Popconfirm, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { getApiErrorMessage, type UserListItem } from '@repo/api';
import { useCallback, useEffect, useState } from 'react';
import { useDocumentTitle } from 'usehooks-ts';
import { useWebApi } from '../../hooks/use-web-api';

const PAGE_SIZE = 10;

export function UsersManagementPage() {
  useDocumentTitle('用户管理 · client-react-sp');

  const { message } = App.useApp();
  const api = useWebApi();
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [currentSummary, setCurrentSummary] = useState<{
    email: string;
    user_id: string;
    roles: string[];
  } | null>(null);

  const isAdmin = Boolean(currentSummary?.roles.includes('admin'));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const offset = (page - 1) * PAGE_SIZE;
      const { data } = await api.users.list({ limit: PAGE_SIZE, offset });
      setUsers(data.users);
      setTotal(data.total);
      setCurrentSummary(data.current_user);
    } catch (e) {
      message.error(getApiErrorMessage(e));
      setUsers([]);
      setTotal(0);
      setCurrentSummary(null);
    } finally {
      setLoading(false);
    }
  }, [api, message, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: ColumnsType<UserListItem> = [
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      ellipsis: true,
    },
    {
      title: '用户 ID',
      dataIndex: 'user_id',
      key: 'user_id',
      width: 280,
      ellipsis: true,
      render: (id: string) => (
        <Typography.Text copyable className="font-mono text-xs">
          {id}
        </Typography.Text>
      ),
    },
    {
      title: '注册时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 200,
      render: (iso: string) => {
        try {
          return new Date(iso).toLocaleString();
        } catch {
          return iso;
        }
      },
    },
    {
      title: '角色',
      dataIndex: 'roles',
      key: 'roles',
      width: 200,
      render: (roles: string[]) => (
        <Space size={[0, 4]} wrap>
          {roles.map((r) => (
            <Tag key={r} color={r === 'admin' ? 'red' : 'blue'}>
              {r}
            </Tag>
          ))}
        </Space>
      ),
    },
    ...(isAdmin
      ? ([
          {
            title: '操作',
            key: 'actions',
            width: 100,
            fixed: 'right' as const,
            render: (_: unknown, record: UserListItem) => {
              const isSelf = record.user_id === currentSummary?.user_id;
              if (isSelf) {
                return (
                  <Typography.Text type="secondary" className="text-xs">
                    当前账号
                  </Typography.Text>
                );
              }
              return (
                <Popconfirm
                  title="确定删除该用户？"
                  description="删除后不可恢复，关联角色关系一并清除。"
                  okText="删除"
                  okType="danger"
                  cancelText="取消"
                  onConfirm={async () => {
                    try {
                      await api.users.remove(record.user_id);
                      message.success('已删除');
                      await load();
                    } catch (e) {
                      message.error(getApiErrorMessage(e));
                    }
                  }}
                >
                  <Button type="link" danger size="small" icon={<DeleteOutlined />}>
                    删除
                  </Button>
                </Popconfirm>
              );
            },
          },
        ] satisfies ColumnsType<UserListItem>)
      : []),
  ];

  return (
    <div>
      <Typography.Title level={4} className="!mb-6">
        用户管理
      </Typography.Title>

      {currentSummary ? (
        <Alert
          type="info"
          showIcon
          className="!mb-4"
          message={
            <span>
              当前登录：<strong>{currentSummary.email}</strong>
            </span>
          }
          description={
            <Space direction="vertical" size="small" className="w-full">
              <Typography.Text type="secondary" className="!text-sm">
                用户 ID（可对照 JWT <code>sub</code>）
              </Typography.Text>
              <Typography.Text copyable className="block font-mono text-xs">
                {currentSummary.user_id}
              </Typography.Text>
              <Space size={[0, 4]} wrap>
                {currentSummary.roles.map((r) => (
                  <Tag key={r} color={r === 'admin' ? 'red' : 'blue'}>
                    {r}
                  </Tag>
                ))}
              </Space>
            </Space>
          }
        />
      ) : null}

      <Card>
        <Table<UserListItem>
          rowKey="user_id"
          loading={loading}
          columns={columns}
          dataSource={users}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total,
            showSizeChanger: false,
            showTotal: (t) => `共 ${t} 条`,
            onChange: (p) => setPage(p),
          }}
        />
      </Card>
    </div>
  );
}
