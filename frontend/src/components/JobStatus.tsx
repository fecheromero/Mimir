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
        return 'bg-green-500/20 text-green-400'
      case 'failed':
        return 'bg-red-500/20 text-red-400'
      default:
        return 'bg-blue-500/20 text-blue-400'
    }
  }

  return (
    <div className="bg-[#0F1419] border border-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {getStatusIcon()}
          <div>
            <span className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${getStatusColor()}`}>
              {status.toUpperCase()}
            </span>
          </div>
        </div>
        <span className="text-3xl font-bold text-white">{progress}%</span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-800 rounded-full h-3 mb-4 overflow-hidden">
        <div
          className="bg-gradient-to-r from-blue-600 to-blue-500 h-3 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Current Step */}
      <p className="text-sm text-gray-400 leading-relaxed">{currentStep}</p>
    </div>
  )
}
