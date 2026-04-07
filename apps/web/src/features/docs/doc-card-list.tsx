import type { DocListItem } from '@repo/api';
import { DocCardItem } from './doc-card-item';

type Props = {
  items: DocListItem[];
};

export function DocCardList({ items }: Props) {
  return (
    <div className="space-y-4">
      {items.map((doc) => (
        <DocCardItem key={doc.id} doc={doc} />
      ))}
    </div>
  );
}
