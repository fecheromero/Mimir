import ReactMarkdown from 'react-markdown'
import { Download, Play } from 'lucide-react'

export default function TestCaseViewer({ testCases, onExecute, onDownload, executing }) {
  if (!testCases) return null

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Generated Test Cases</h2>
        <div className="flex space-x-2">
          <button
            onClick={onDownload}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            <Download className="w-4 h-4" />
            <span>Download</span>
          </button>
          <button
            onClick={onExecute}
            disabled={executing}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
          >
            <Play className="w-4 h-4" />
            <span>{executing ? 'Executing...' : 'Execute Tests'}</span>
          </button>
        </div>
      </div>

      <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
        <div className="prose max-w-none">
          <ReactMarkdown>{testCases.test_case_text}</ReactMarkdown>
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-500">
        <p>Created: {new Date(testCases.created_at).toLocaleString()}</p>
        <p>Ticket ID: {testCases.ticket_id}</p>
      </div>
    </div>
  )
}
