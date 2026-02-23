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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-[#111827]">Generated Test Cases</h2>
        <div className="flex gap-3">
          <button
            onClick={onDownload}
            className="flex items-center gap-2 px-4 py-2 bg-[#6B7280] text-white rounded-lg hover:bg-gray-700 transition-all shadow-sm hover:shadow-md"
          >
            <Download className="w-4 h-4" />
            <span className="font-medium">Download</span>
          </button>
          <button
            onClick={handleExecute}
            disabled={executing}
            className="flex items-center gap-2 px-4 py-2 bg-[#10B981] text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-all shadow-sm hover:shadow-md"
          >
            <Play className="w-4 h-4" />
            <span className="font-medium">{executing ? 'Executing...' : 'Execute Tests'}</span>
          </button>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg p-6 bg-gradient-to-br from-gray-50 to-white">
        <div className="prose max-w-none">
          <ReactMarkdown>{testCases.test_case_text}</ReactMarkdown>
        </div>
      </div>

      <BrowserSettings
        headless={headless}
        setHeadless={setHeadless}
        disabled={executing}
      />

      <div className="pt-4 border-t border-gray-200 text-sm text-[#6B7280] space-y-1">
        <p>Created: {new Date(testCases.created_at).toLocaleString()}</p>
        <p>Ticket ID: {testCases.ticket_id}</p>
      </div>
    </div>
  )
}
