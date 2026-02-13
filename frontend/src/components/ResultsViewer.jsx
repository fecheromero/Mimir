import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { Download, FileText, FileJson, Play } from 'lucide-react'
import { testCasesApi } from '../services/api'

export default function ResultsViewer({ results, jobId }) {
  const [executing, setExecuting] = useState(false)
  const navigate = useNavigate()

  if (!results) return null

  const downloadUrl = (type) => `/api/jobs/${jobId}/download/${type}`

  const downloadReplayActions = () => {
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

  const executeReplay = async () => {
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
        results.test_case_text, // test instructions
        results.test_expectations, // success criteria
        results.expected_outcome // expected outcome
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
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Test Results</h2>
        <div className="flex space-x-2">
          {results.replay_actions && results.replay_actions.length > 0 && (
            <>
              <button
                onClick={executeReplay}
                disabled={executing}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                <span>{executing ? 'Replaying...' : 'Execute Replay'}</span>
              </button>
              <button
                onClick={downloadReplayActions}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                <FileJson className="w-4 h-4" />
                <span>Replay Actions</span>
              </button>
            </>
          )}
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
