import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { qaRunHistoryApi } from '../services/api'
import { Clock, ChevronDown, ChevronRight, CheckCircle, XCircle, Trash2 } from 'lucide-react'

interface QARun {
  run_id: string
  job_id: string
  name: string
  status: string
  job_type: string
  timestamp: string
  parent_run_id: string
  replay_count: number
  replays: QARun[]
}

export default function QARunHistory(): JSX.Element {
  const [runs, setRuns] = useState<QARun[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedRuns, setExpandedRuns] = useState<Set<string>>(new Set())
  const navigate = useNavigate()

  useEffect(() => {
    loadRuns()
  }, [])

  const loadRuns = async () => {
    try {
      setLoading(true)
      const response = await qaRunHistoryApi.getAllRuns()
      setRuns(response.runs || [])
    } catch (error) {
      console.error('Error loading run history:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleExpanded = (runId: string) => {
    const newExpanded = new Set(expandedRuns)
    if (newExpanded.has(runId)) {
      newExpanded.delete(runId)
    } else {
      newExpanded.add(runId)
    }
    setExpandedRuns(newExpanded)
  }

  const handleViewRun = (jobId: string) => {
    navigate(`/jobs/${jobId}`)
  }

  const handleDeleteRun = async (runId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    if (!confirm('Are you sure you want to delete this run and all its replays?')) {
      return
    }

    try {
      await qaRunHistoryApi.deleteRun(runId)
      loadRuns()
    } catch (error) {
      console.error('Error deleting run:', error)
      alert('Failed to delete run')
    }
  }

  const getStatusIndicator = (status: string) => {
    const isPassed = status === 'passed' || status === 'completed' || status === 'generated'
    return isPassed ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <XCircle className="w-4 h-4 text-red-500" />
    )
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString()
  }

  const renderRun = (run: QARun, isReplay = false, isLatest = false) => {
    const hasReplays = run.replays && run.replays.length > 0
    const isExpanded = expandedRuns.has(run.run_id)

    return (
      <div key={run.run_id} className={`${isReplay ? 'ml-8 mt-2' : 'mt-4'}`}>
        <div
          className={`bg-[#1A1F2E] rounded-lg p-4 cursor-pointer hover:bg-[#242938] transition-colors border ${
            isLatest && hasReplays ? 'border-blue-500' : 'border-gray-700'
          }`}
          onClick={() => handleViewRun(run.job_id)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              {/* Expand/Collapse button for runs with replays */}
              {hasReplays && !isReplay && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleExpanded(run.run_id)
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronRight className="w-5 h-5" />
                  )}
                </button>
              )}

              {/* Status indicator */}
              <div className="flex-shrink-0">
                {getStatusIndicator(run.status)}
              </div>

              {/* Run details */}
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-medium truncate">
                  {run.name}
                  {isLatest && hasReplays && (
                    <span className="ml-2 text-xs text-blue-400">(Latest)</span>
                  )}
                </h3>
                <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTimestamp(run.timestamp)}
                  </span>
                  <span className="capitalize">{run.job_type}</span>
                  <span className="capitalize">{run.status}</span>
                  {hasReplays && (
                    <span className="text-blue-400">
                      {run.replays.length} replay{run.replays.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>

              {/* Delete button */}
              <button
                onClick={(e) => handleDeleteRun(run.run_id, e)}
                className="text-gray-400 hover:text-red-500 transition-colors"
                title="Delete run"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Render replays (tree view) */}
        {hasReplays && isExpanded && (
          <div className="mt-2 border-l-2 border-gray-700 ml-4">
            {run.replays.map((replay) => renderRun(replay, true, false))}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0E14] p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center text-gray-400">Loading run history...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0E14] p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">QA Run History</h1>
          <p className="text-gray-400">
            View and manage your test execution history
          </p>
        </div>

        {/* Runs list */}
        {runs.length === 0 ? (
          <div className="bg-[#1A1F2E] rounded-lg p-8 text-center">
            <p className="text-gray-400">No test runs found.</p>
            <p className="text-gray-500 text-sm mt-2">
              Run some tests to see them here!
            </p>
          </div>
        ) : (
          <div>
            {runs.map((run) => {
              // Find the latest replay or use the run itself
              const latestRun =
                run.replays && run.replays.length > 0
                  ? run.replays[run.replays.length - 1]
                  : run

              return (
                <div key={run.run_id}>
                  {/* Show latest run first */}
                  {renderRun(latestRun, false, run.replays && run.replays.length > 0)}

                  {/* Show parent and older replays when expanded */}
                  {expandedRuns.has(latestRun.run_id) && run.replays && run.replays.length > 0 && (
                    <div className="ml-8 mt-2 border-l-2 border-gray-700 pl-4">
                      {/* Original run */}
                      {renderRun(run, true, false)}

                      {/* Older replays (excluding the latest one already shown) */}
                      {run.replays.slice(0, -1).map((replay) => renderRun(replay, true, false))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
