import { Loader2, CheckCircle, XCircle } from 'lucide-react'

export default function JobStatus({ status, progress, currentStep }) {
  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-green-600" />
      case 'failed':
        return <XCircle className="w-6 h-6 text-red-600" />
      default:
        return <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-blue-100 text-blue-800'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div>
            <span className={`px-2 py-1 rounded text-sm font-medium ${getStatusColor()}`}>
              {status.toUpperCase()}
            </span>
          </div>
        </div>
        <span className="text-2xl font-bold text-gray-700">{progress}%</span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Current Step */}
      <p className="text-sm text-gray-600">{currentStep}</p>
    </div>
  )
}
