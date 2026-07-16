interface CodeBlockProps {
  code: string
  language?: string
}

export function CodeBlock({ code, language }: CodeBlockProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      {language && (
        <div className="border-b border-border px-4 py-2 text-xs text-gray-500">
          {language}
        </div>
      )}
      <pre className="overflow-x-auto p-4">
        <code className="font-mono text-sm text-gray-200">{code}</code>
      </pre>
    </div>
  )
}
