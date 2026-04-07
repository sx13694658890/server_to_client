import ReactMarkdown from 'react-markdown';
import './doc-markdown.css';

type Props = {
  source: string;
};

export function DocMarkdown({ source }: Props) {
  return (
    <div className="doc-md">
      <ReactMarkdown>{source}</ReactMarkdown>
    </div>
  );
}
