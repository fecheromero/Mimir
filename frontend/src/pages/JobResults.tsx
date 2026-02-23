import { useState, useEffect } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import JobStatus from '../components/JobStatus'
import TestCaseViewer from '../components/TestCaseViewer'
import ResultsViewer from '../components/ResultsViewer'
import { jobsApi, testCasesApi } from '../services/api'

interface JobStatusData {
  status: string
  progress: number
  current_step: string
}

interface TestCase {
  test_case_text: string
  created_at: string
  ticket_id: string
}

interface TestCasesResponse {
  test_cases: TestCase
}

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

interface ResultsResponse {
  results: TestResults
}

interface LocationState {
  mode?: string
  url?: string
  userEmail?: string | null
  userPassword?: string | null
}

interface BrowserSettings {
  headless: boolean
}

interface ApiResponse {
  job_id: string
}

export default function JobResults(): JSX.Element {
  const { jobId } = useParams<{ jobId: string }>()
  const location = useLocation()
  const navigate = useNavigate()

  const [status, setStatus] = useState<JobStatusData | null>(null)
  const [testCases, setTestCases] = useState<TestCase | null>(null)
  const [results, setResults] = useState<TestResults | null>(null)
  const [executing, setExecuting] = useState<boolean>(false)

  const locationState = location.state as LocationState | null
  const mode = locationState?.mode || 'execute'
  const generationData = locationState || {}

  // Reset state when jobId changes (navigating to a new job)
  useEffect(() => {
    setStatus(null)
    setTestCases(null)
    setResults(null)
  }, [jobId])

  // Poll job status
  useEffect(() => {
    const pollStatus = async (): Promise<void> => {
      try {
        if (!jobId) return

        const statusData: JobStatusData = await jobsApi.getStatus(jobId)
        setStatus(statusData)

        // If generation is complete and we haven't loaded test cases yet
        if (statusData.status === 'completed' && mode === 'generate' && !testCases) {
          const testCasesData: TestCasesResponse = await jobsApi.getTestCases(jobId)
          setTestCases(testCasesData.test_cases)
        }

        // If execution/replay is complete/failed and we haven't loaded results yet
        if ((statusData.status === 'completed' || statusData.status === 'failed') && (mode === 'execute' || mode === 'replay') && !results) {
          try {
            const resultsData: ResultsResponse = await jobsApi.getResults(jobId)
            setResults(resultsData.results)
          } catch (error) {
            // Results might not be available for some failures
            console.error('Could not load results:', error)
          }
        }
      } catch (error) {
        console.error('Error fetching job status:', error)
      }
    }

    // Poll immediately
    pollStatus()

    // Then poll every 2 seconds until completed or failed
    const interval = setInterval(() => {
      if (status?.status === 'completed' || status?.status === 'failed') {
        clearInterval(interval)
      } else {
        pollStatus()
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [jobId, mode, status?.status, testCases, results])

  const handleExecute = async (browserSettings: BrowserSettings): Promise<void> => {
    try {
      if (!testCases) return

      setExecuting(true)
      const response: ApiResponse = await testCasesApi.execute(
        testCases.test_case_text,
        generationData.url || '',
        generationData.userEmail || null,
        generationData.userPassword || null,
        browserSettings.headless
      )

      // Navigate to execution job
      navigate(`/jobs/${response.job_id}`, {
        state: { mode: 'execute' }
      })
    } catch (error) {
      console.error('Error executing tests:', error)
      alert('Failed to execute tests. Please try again.')
    } finally {
      setExecuting(false)
    }
  }

  const handleDownloadTestCases = (): void => {
    const blob = new Blob([JSON.stringify(testCases, null, 2)], {
      type: 'application/json'
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `test_cases_${jobId}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-8">
      {/* Header with Back Button */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-[#6B7280] hover:text-[#111827] transition-colors mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to Dashboard</span>
        </button>
        <h1 className="text-3xl font-bold text-[#111827]">Job Results</h1>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl space-y-6">
        {/* Job Status */}
        {status && (
          <JobStatus
            status={status.status}
            progress={status.progress}
            currentStep={status.current_step}
          />
        )}

        {/* Test Cases Viewer (only show for generation mode) */}
        {mode === 'generate' && testCases && (
          <TestCaseViewer
            testCases={testCases}
            onExecute={handleExecute}
            onDownload={handleDownloadTestCases}
            executing={executing}
          />
        )}

        {/* Results Viewer (only show for execution mode or after execution) */}
        {results && jobId && (
          <ResultsViewer results={results} jobId={jobId} />
        )}
      </div>
    </div>
  )
}
