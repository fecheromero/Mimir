import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TestCaseGenerator from '../components/TestCaseGenerator'
import TestCaseUploader from '../components/TestCaseUploader'
import ReplayUploader from '../components/ReplayUploader'
import { testCasesApi } from '../services/api'

interface GenerateData {
  description: string
  url: string
  userEmail: string | null
  userPassword: string | null
}

interface UploadData {
  file: File
  url: string
  userEmail: string | null
  userPassword: string | null
  headless: boolean
}

interface ReplayData {
  file: File
  userEmail: string | null
  userPassword: string | null
  headless: boolean
}

interface ApiResponse {
  job_id: string
}

export default function Dashboard(): JSX.Element {
  const [loading, setLoading] = useState<boolean>(false)
  const navigate = useNavigate()

  const handleGenerate = async (data: GenerateData): Promise<void> => {
    try {
      setLoading(true)
      const response: ApiResponse = await testCasesApi.generate(
        data.description
      )

      // Navigate to job results page
      navigate(`/jobs/${response.job_id}`, {
        state: {
          mode: 'generate',
          url: data.url,
          userEmail: data.userEmail,
          userPassword: data.userPassword,
        }
      })
    } catch (error) {
      console.error('Error generating test cases:', error)
      alert('Failed to generate test cases. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (data: UploadData): Promise<void> => {
    try {
      setLoading(true)
      const response: ApiResponse = await testCasesApi.uploadAndExecute(
        data.file,
        data.url,
        data.userEmail,
        data.userPassword,
        data.headless
      )

      // Navigate to job results page
      navigate(`/jobs/${response.job_id}`, {
        state: { mode: 'execute' }
      })
    } catch (error) {
      console.error('Error uploading test cases:', error)
      alert('Failed to upload and execute test cases. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleReplay = async (data: ReplayData): Promise<void> => {
    try {
      setLoading(true)
      const response: ApiResponse = await testCasesApi.uploadAndReplay(
        data.file,
        data.userEmail,
        data.userPassword,
        data.headless
      )

      // Navigate to job results page
      navigate(`/jobs/${response.job_id}`, {
        state: { mode: 'replay' }
      })
    } catch (error) {
      console.error('Error executing replay:', error)
      alert('Failed to execute replay. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0E14] p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            QA Assistant
          </h1>
          <p className="text-gray-400">
            AI-powered test case generation and automated browser testing
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Generate new test cases */}
          <div className="lg:col-span-2">
            <TestCaseGenerator onGenerate={handleGenerate} loading={loading} />
          </div>

          {/* Upload existing test cases */}
          <TestCaseUploader onUpload={handleUpload} loading={loading} />

          {/* Execute replay actions */}
          <ReplayUploader onReplay={handleReplay} loading={loading} />
        </div>
      </div>
    </div>
  )
}
