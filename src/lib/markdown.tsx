import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import type { Components } from 'react-markdown';

const components: Components = {
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline hover:text-blue-700">
      {children}
    </a>
  ),
  img: ({ src, alt }) => (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className="max-w-full rounded-lg my-1"
    />
  ),
  code: ({ className, children, ...props }) => {
    const isInline = !className;
    return isInline
      ? <code className="inline-code bg-gray-200 text-gray-900 text-sm px-1 py-0.5 rounded font-mono" {...props}>{children}</code>
      : <code className={className} {...props}>{children}</code>;
  },
  pre: ({ children }) => (
    <pre className="w-full bg-gray-200 text-gray-800 rounded-lg p-3 my-2 overflow-x-auto text-sm">
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-gray-300 pl-3 my-2 text-gray-600 italic">
      {children}
    </blockquote>
  ),
};

interface MarkdownContentProps {
  content: string;
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={components}
    >
      {content}
    </ReactMarkdown>
  );
}
