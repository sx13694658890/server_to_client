import { Space, Tag } from 'antd';
import type { QuickQuestionItem } from '../../schemas/ai-chat';

export type QuickRepliesProps = {
  items: QuickQuestionItem[];
  disabled?: boolean;
  onSelect: (item: QuickQuestionItem) => void;
};

export function QuickReplies({ items, disabled, onSelect }: QuickRepliesProps) {
  if (items.length === 0) return null;

  return (
    <div className="border-t border-neutral-100 px-2 py-2">
      <Space size={[8, 8]} wrap className="w-full">
        {items.map((item) => (
          <Tag
            key={item.id}
            className="m-0 cursor-pointer px-2 py-1 text-sm"
            onClick={() => {
              if (!disabled) onSelect(item);
            }}
            style={{ opacity: disabled ? 0.5 : 1 }}
          >
            {item.label}
          </Tag>
        ))}
      </Space>
    </div>
  );
}
