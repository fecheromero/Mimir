import { Loader2, CheckCircle, XCircle } from 'lucide-react'

interface JobStatusProps {
  status: string
  progress: number
  currentStep: string
}

export default function JobStatus({ status, progress, currentStep }: JobStatusProps): JSX.Element {
  const getStatusIcon = (): JSX.Element => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-green-600" />
      case 'failed':
        return <XCircle className="w-6 h-6 text-red-600" />
      default:
        return <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
    }
  }

  const getStatusColor = (): string => {
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {getStatusIcon()}
          <div>
            <span className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${getStatusColor()}`}>
              {status.toUpperCase()}
            </span>
          </div>
        </div>
        <span className="text-3xl font-bold text-[#111827]">{progress}%</span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-3 mb-4 overflow-hidden">
        <div
          className="bg-gradient-to-r from-[#3B82F6] to-blue-500 h-3 rounded-full transition-all duration-500 ease-out shadow-sm"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Current Step */}
      <p className="text-sm text-[#6B7280] leading-relaxed">{currentStep}</p>
    </div>
  )
}
