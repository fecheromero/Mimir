import { useState, useEffect } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import JobStatus from '../components/JobStatus'
import TestCaseViewer from '../components/TestCaseViewer'
import ResultsViewer from '../components/ResultsViewer'
import { jobsApi, testCasesApi } from '../services/api'

export default function JobResults() {
  const { jobId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const [status, setStatus] = useState(null)
  const [testCases, setTestCases] = useState(null)
  const [results, setResults] = useState(null)
  const [executing, setExecuting] = useState(false)

  const mode = location.state?.mode || 'execute'
  const generationData = location.state || {}

  // Reset state when jobId changes (navigating to a new job)
  useEffect(() => {
    setStatus(null)
    setTestCases(null)
    setResults(null)
  }, [jobId])

  // Poll job status
  useEffect(() => {
    const pollStatus = async () => {
      try {
        const statusData = await jobsApi.getStatus(jobId)
        setStatus(statusData)

        // If generation is complete and we haven't loaded test cases yet
        if (statusData.status === 'completed' && mode === 'generate' && !testCases) {
          const testCasesData = await jobsApi.getTestCases(jobId)
          setTestCases(testCasesData.test_cases)
        }

        // If execution/replay is complete/failed and we haven't loaded results yet
        if ((statusData.status === 'completed' || statusData.status === 'failed') && (mode === 'execute' || mode === 'replay') && !results) {
          try {
            const resultsData = await jobsApi.getResults(jobId)
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

  const handleExecute = async (browserSettings) => {
    try {
      setExecuting(true)
      const response = await testCasesApi.execute(
        testCases.test_case_text,
        generationData.url,
        generationData.userEmail,
        generationData.userPassword,
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

  const handleDownloadTestCases = () => {
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
        {results && (
          <ResultsViewer results={results} jobId={jobId} />
        )}
      </div>
    </div>
  )
}
