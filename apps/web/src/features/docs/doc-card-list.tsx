import type { DocListItem } from '@repo/api';
import { DocCardItem } from './doc-card-item';

type Props = {
  items: DocListItem[];
  onDocDeleted?: () => void;
};

export function DocCardList({ items, onDocDeleted }: Props) {
  return (
    <div className="space-y-4">
      {items.map((doc) => (
        <DocCardItem key={doc.id} doc={doc} onDeleted={onDocDeleted} />
      ))}
    </div>
  );
}
