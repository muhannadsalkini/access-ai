"use client";

import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const components: Components = {
  h1: ({ children }) => (
    <h1 className="text-xl font-bold text-white mt-4 mb-2">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-lg font-bold text-white mt-3 mb-2">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-base font-semibold text-white mt-3 mb-1.5">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="text-sm text-zinc-300 leading-relaxed mb-3 last:mb-0">
      {children}
    </p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-zinc-100">{children}</strong>
  ),
  em: ({ children }) => <em className="italic text-zinc-300">{children}</em>,
  ul: ({ children }) => (
    <ul className="list-disc list-outside ml-5 mb-3 space-y-1.5">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-outside ml-5 mb-3 space-y-1.5">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="text-sm text-zinc-300 leading-relaxed">{children}</li>
  ),
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
  code: ({ className, children, ...props }) => {
    const isInline = !className;
    if (isInline) {
      return (
        <code className="px-1.5 py-0.5 rounded-md bg-white/[0.08] border border-white/[0.06] text-indigo-300 text-xs font-mono">
          {children}
        </code>
      );
    }
    return (
      <code className={`block text-sm ${className || ""}`} {...props}>
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="rounded-xl bg-[#0d1117] border border-white/[0.08] p-4 overflow-x-auto mb-3 text-sm leading-relaxed font-mono text-zinc-300">
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-indigo-500/40 pl-4 my-3 italic text-zinc-400">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="border-white/[0.06] my-4" />,
};

export default function MarkdownRenderer({
  content,
  className = "",
}: MarkdownRendererProps) {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown components={components}>{content}</ReactMarkdown>
    </div>
  );
}
