import ReactMarkdown from 'react-markdown'
import { Download, FileText, FileJson } from 'lucide-react'

export default function ResultsViewer({ results, jobId }) {
  if (!results) return null

  const downloadUrl = (type) => `/api/jobs/${jobId}/download/${type}`

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Test Results</h2>
        <div className="flex space-x-2">
          <a
            href={downloadUrl('results')}
            download
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <FileJson className="w-4 h-4" />
            <span>Results JSON</span>
          </a>
          <a
            href={downloadUrl('report')}
            download
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <FileText className="w-4 h-4" />
            <span>Report MD</span>
          </a>
        </div>
      </div>

      {/* Test Report */}
      <div className="border border-gray-200 rounded-md p-4 bg-gray-50 mb-6">
        <h3 className="text-lg font-semibold mb-2">Test Report</h3>
        <div className="prose max-w-none">
          <ReactMarkdown>{results.final_result}</ReactMarkdown>
        </div>
      </div>

      {/* Actions Summary */}
      <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
        <h3 className="text-lg font-semibold mb-2">Actions Performed</h3>
        <div className="text-sm text-gray-700">
          <p className="mb-2">Total actions: {results.actions?.length || 0}</p>
          <details className="cursor-pointer">
            <summary className="font-medium text-blue-600 hover:text-blue-700">
              View detailed actions
            </summary>
            <pre className="mt-2 p-2 bg-white rounded border border-gray-200 overflow-x-auto text-xs">
              {JSON.stringify(results.actions, null, 2)}
            </pre>
          </details>
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-500">
        <p>Executed: {new Date(results.executed_at).toLocaleString()}</p>
        <p>URL: {results.url}</p>
      </div>
    </div>
  )
}
