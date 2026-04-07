import { Button, Result } from 'antd';

type Props = {
  message: string;
  onRetry: () => void;
};

export function DocsErrorState({ message, onRetry }: Props) {
  return (
    <Result
      status="error"
      title="加载失败"
      subTitle={message || '请检查网络或稍后重试'}
      extra={
        <Button type="primary" onClick={onRetry}>
          重新加载
        </Button>
      }
    />
  );
}
