import { Card, Skeleton } from 'antd';

const ROWS = 5;

export function DocsListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: ROWS }, (_, i) => (
        <Card key={i} className="!border-neutral-200 shadow-sm" styles={{ body: { padding: 20 } }}>
          <Skeleton active title={{ width: '55%' }} paragraph={{ rows: 2 }} />
        </Card>
      ))}
    </div>
  );
}
