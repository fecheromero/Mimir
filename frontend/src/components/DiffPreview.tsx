interface DiffPreviewProps {
  diff: string | null
}

export default function DiffPreview({ diff }: DiffPreviewProps): JSX.Element | null {
  if (!diff) return null

  const lines = diff.split('\n')

  return (
    <div className="bg-gray-900 rounded-lg p-3 overflow-x-auto">
      <pre className="text-xs font-mono">
        {lines.map((line, index) => {
          let className = 'text-gray-300'
          if (line.startsWith('+')) {
            className = 'text-green-400 bg-green-500/10'
          } else if (line.startsWith('-')) {
            className = 'text-red-400 bg-red-500/10'
          } else if (line.startsWith('@@')) {
            className = 'text-blue-400'
          }

          return (
            <div key={index} className={className}>
              {line || ' '}
            </div>
          )
        })}
      </pre>
    </div>
  )
}
