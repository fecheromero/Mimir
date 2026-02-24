import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Download, Play } from 'lucide-react'
import BrowserSettings from './BrowserSettings'

interface TestCase {
  test_case_text: string
  created_at: string
  ticket_id: string
}

interface TestCaseViewerProps {
  testCases: TestCase | null
  onExecute: (data: { headless: boolean }) => void
  onDownload: () => void
  executing: boolean
}

export default function TestCaseViewer({ testCases, onExecute, onDownload, executing }: TestCaseViewerProps): JSX.Element | null {
  const [headless, setHeadless] = useState<boolean>(false)

  if (!testCases) return null

  const handleExecute = (): void => {
    onExecute({
      headless
    })
  }

  return (
    <div className="bg-[#0F1419] border border-gray-800 rounded-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-white">Generated Test Cases</h2>
        <div className="flex gap-3">
          <button
            onClick={onDownload}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="font-medium">Download</span>
          </button>
          <button
            onClick={handleExecute}
            disabled={executing}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-600 transition-colors"
          >
            <Play className="w-4 h-4" />
            <span className="font-medium">{executing ? 'Executing...' : 'Execute Tests'}</span>
          </button>
        </div>
      </div>

      <div className="border border-gray-700 rounded-lg p-6 bg-[#0A0E14]">
        <div className="markdown-content text-gray-300 leading-relaxed">
          <ReactMarkdown
            components={{
              h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-white mb-4 mt-6 first:mt-0" {...props} />,
              h2: ({node, ...props}) => <h2 className="text-xl font-bold text-white mb-3 mt-5 first:mt-0" {...props} />,
              h3: ({node, ...props}) => <h3 className="text-lg font-semibold text-white mb-2 mt-4 first:mt-0" {...props} />,
              p: ({node, ...props}) => <p className="mb-4 text-gray-300" {...props} />,
              ul: ({node, ...props}) => <ul className="list-disc list-inside mb-4 space-y-2 text-gray-300" {...props} />,
              ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-4 space-y-2 text-gray-300" {...props} />,
              li: ({node, ...props}) => <li className="text-gray-300" {...props} />,
              code: ({node, inline, ...props}: any) =>
                inline
                  ? <code className="bg-gray-800 text-blue-400 px-1.5 py-0.5 rounded text-sm" {...props} />
                  : <code className="block bg-gray-800 text-gray-300 p-4 rounded-lg overflow-x-auto text-sm" {...props} />,
              pre: ({node, ...props}) => <pre className="mb-4" {...props} />,
              strong: ({node, ...props}) => <strong className="font-semibold text-white" {...props} />,
              em: ({node, ...props}) => <em className="italic text-gray-300" {...props} />,
              a: ({node, ...props}) => <a className="text-blue-400 hover:text-blue-300 underline" {...props} />,
            }}
          >
            {testCases.test_case_text}
          </ReactMarkdown>
        </div>
      </div>

      <BrowserSettings
        headless={headless}
        setHeadless={setHeadless}
        disabled={executing}
      />

      <div className="pt-4 border-t border-gray-800 text-sm text-gray-400 space-y-1">
        <p>Created: {new Date(testCases.created_at).toLocaleString()}</p>
        <p>Ticket ID: {testCases.ticket_id}</p>
      </div>
    </div>
  )
}
