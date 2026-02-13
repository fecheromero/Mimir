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

  const handleExecute = async () => {
    try {
      setExecuting(true)
      const response = await testCasesApi.execute(
        testCases.test_case_text,
        generationData.url,
        generationData.userEmail,
        generationData.userPassword
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Dashboard</span>
      </button>

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
  )
}
