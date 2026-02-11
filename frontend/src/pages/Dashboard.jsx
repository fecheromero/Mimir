import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TestCaseGenerator from '../components/TestCaseGenerator'
import TestCaseUploader from '../components/TestCaseUploader'
import { testCasesApi } from '../services/api'

export default function Dashboard() {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleGenerate = async (data) => {
    try {
      setLoading(true)
      const response = await testCasesApi.generate(
        data.ticketId,
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

  const handleUpload = async (data) => {
    try {
      setLoading(true)
      const response = await testCasesApi.uploadAndExecute(
        data.file,
        data.url,
        data.userEmail,
        data.userPassword
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

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome to Mimir
        </h1>
        <p className="text-gray-600">
          AI-powered test case generation and automated browser testing
        </p>
      </div>

      {/* Generate new test cases */}
      <TestCaseGenerator onGenerate={handleGenerate} loading={loading} />

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-gray-50 text-gray-500">OR</span>
        </div>
      </div>

      {/* Upload existing test cases */}
      <TestCaseUploader onUpload={handleUpload} loading={loading} />
    </div>
  )
}
