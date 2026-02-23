import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { FileText, FileJson, Play } from 'lucide-react'
import { testCasesApi } from '../services/api'

interface Action {
  [key: string]: unknown
}

interface TestResults {
  replay_actions?: Action[]
  url: string
  test_case_text?: string
  test_expectations?: string
  expected_outcome?: string
  final_result: string
  actions?: Action[]
  executed_at: string
}

interface ResultsViewerProps {
  results: TestResults | null
  jobId: string
}

export default function ResultsViewer({ results, jobId }: ResultsViewerProps): JSX.Element | null {
  const [executing, setExecuting] = useState<boolean>(false)
  const navigate = useNavigate()

  if (!results) return null

  const downloadUrl = (type: string): string => `/api/jobs/${jobId}/download/${type}`

  const downloadReplayActions = (): void => {
    const replayData = {
      actions: results.replay_actions,
      url: results.url,
      test_case_text: results.test_case_text,
      test_expectations: results.test_expectations,
      expected_outcome: results.expected_outcome
    }
    const blob = new Blob([JSON.stringify(replayData, null, 2)], {
      type: 'application/json'
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `replay_actions_${jobId}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const executeReplay = async (): Promise<void> => {
    if (!results.replay_actions || results.replay_actions.length === 0) {
      alert('No replay actions available')
      return
    }

    try {
      setExecuting(true)
      const response = await testCasesApi.replayActions(
        results.replay_actions,
        results.url,
        null, // user_email
        null, // user_password
        results.test_case_text || null, // test instructions
        results.test_expectations || null, // success criteria
        results.expected_outcome || null // expected outcome
      )

      // Navigate to replay job
      navigate(`/jobs/${response.job_id}`, {
        state: { mode: 'replay' }
      })
    } catch (error) {
      console.error('Error executing replay:', error)
      alert('Failed to execute replay. Please try again.')
    } finally {
      setExecuting(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-[#111827]">Test Results</h2>
        <div className="flex gap-2 flex-wrap justify-end">
          {results.replay_actions && results.replay_actions.length > 0 && (
            <>
              <button
                onClick={executeReplay}
                disabled={executing}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-all shadow-sm hover:shadow-md"
              >
                <Play className="w-4 h-4" />
                <span className="font-medium">{executing ? 'Replaying...' : 'Execute Replay'}</span>
              </button>
              <button
                onClick={downloadReplayActions}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-sm hover:shadow-md"
              >
                <FileJson className="w-4 h-4" />
                <span className="font-medium">Replay Actions</span>
              </button>
            </>
          )}
          <a
            href={downloadUrl('results')}
            download
            className="flex items-center gap-2 px-4 py-2 bg-[#3B82F6] text-white rounded-lg hover:bg-blue-700 transition-all shadow-sm hover:shadow-md"
          >
            <FileJson className="w-4 h-4" />
            <span className="font-medium">Results JSON</span>
          </a>
          <a
            href={downloadUrl('report')}
            download
            className="flex items-center gap-2 px-4 py-2 bg-[#10B981] text-white rounded-lg hover:bg-green-700 transition-all shadow-sm hover:shadow-md"
          >
            <FileText className="w-4 h-4" />
            <span className="font-medium">Report MD</span>
          </a>
        </div>
      </div>

      {/* Test Report */}
      <div className="border border-gray-200 rounded-lg p-6 bg-gradient-to-br from-gray-50 to-white mb-6">
        <h3 className="text-lg font-semibold text-[#111827] mb-4">Test Report</h3>
        <div className="prose max-w-none">
          <ReactMarkdown>{results.final_result}</ReactMarkdown>
        </div>
      </div>

      {/* Actions Summary */}
      <div className="border border-gray-200 rounded-lg p-6 bg-gradient-to-br from-blue-50/30 to-white">
        <h3 className="text-lg font-semibold text-[#111827] mb-4">Actions Performed</h3>
        <div className="text-sm text-[#111827]">
          <p className="mb-3 font-medium">Total actions: {results.actions?.length || 0}</p>
          <details className="cursor-pointer group">
            <summary className="font-medium text-[#3B82F6] hover:text-blue-700 transition-colors">
              View detailed actions
            </summary>
            <pre className="mt-3 p-4 bg-white rounded-lg border border-gray-200 overflow-x-auto text-xs shadow-inner">
              {JSON.stringify(results.actions, null, 2)}
            </pre>
          </details>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200 text-sm text-[#6B7280] space-y-1">
        <p>Executed: {new Date(results.executed_at).toLocaleString()}</p>
        <p>URL: {results.url}</p>
      </div>
    </div>
  )
}
