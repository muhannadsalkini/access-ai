/**
 * Lightweight markdown renderer for the extension popup.
 * Tuned for small (xs) text sizes and the dark #09090b theme.
 * Uses react-markdown + remark-gfm (bold, italic, inline code, code blocks, lists).
 */

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

interface MarkdownProps {
  children: string;
  className?: string;
}

const components: Components = {
  // Paragraphs
  p: ({ children }) => (
    <p className="text-xs text-zinc-300 leading-relaxed mb-2 last:mb-0">
      {children}
    </p>
  ),
  // Bold
  strong: ({ children }) => (
    <strong className="font-semibold text-zinc-100">{children}</strong>
  ),
  // Italic
  em: ({ children }) => (
    <em className="italic text-zinc-300">{children}</em>
  ),
  // Inline code + fenced code blocks
  code: ({ className, children }) => {
    const isBlock = !!className; // fenced blocks have a language class
    if (isBlock) {
      return (
        <code className="block text-[11px] font-mono text-zinc-300 leading-relaxed">
          {children}
        </code>
      );
    }
    // Inline code
    return (
      <code className="px-1 py-0.5 rounded bg-white/[0.08] border border-white/[0.06] text-[11px] font-mono text-indigo-300 break-all">
        {children}
      </code>
    );
  },
  // Code block wrapper
  pre: ({ children }) => (
    <pre className="my-2 rounded-lg bg-[#0d1117] border border-white/[0.08] px-3 py-2.5 overflow-x-auto text-[11px] leading-relaxed font-mono text-zinc-300 whitespace-pre-wrap break-all">
      {children}
    </pre>
  ),
  // Unordered list
  ul: ({ children }) => (
    <ul className="list-disc list-outside ml-4 mb-2 space-y-0.5">{children}</ul>
  ),
  // Ordered list
  ol: ({ children }) => (
    <ol className="list-decimal list-outside ml-4 mb-2 space-y-0.5">{children}</ol>
  ),
  // List item
  li: ({ children }) => (
    <li className="text-xs text-zinc-300 leading-relaxed">{children}</li>
  ),
  // Headings (rarely appear in issue text, but handle gracefully)
  h1: ({ children }) => (
    <p className="text-xs font-semibold text-zinc-100 mb-1">{children}</p>
  ),
  h2: ({ children }) => (
    <p className="text-xs font-semibold text-zinc-100 mb-1">{children}</p>
  ),
  h3: ({ children }) => (
    <p className="text-xs font-medium text-zinc-200 mb-1">{children}</p>
  ),
  // Blockquote
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-indigo-500/40 pl-3 my-2 italic text-zinc-400 text-xs">
      {children}
    </blockquote>
  ),
  // Horizontal rule
  hr: () => <hr className="border-white/[0.06] my-2" />,
  // Links — open in new tab
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors"
    >
      {children}
    </a>
  ),
};

export default function Markdown({ children, className = "" }: MarkdownProps) {
  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
