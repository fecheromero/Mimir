import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import { JobStatus as JobStatusEnum, JobStatusHelper } from '../models/JobStatus'

interface JobStatusProps {
  status: string
  progress: number
  currentStep: string
}

export default function JobStatus({ status, progress, currentStep }: JobStatusProps): JSX.Element {
  const getStatusIcon = (): JSX.Element => {
    if (JobStatusHelper.isSuccess(status)) {
      return <CheckCircle className="w-6 h-6 text-green-600" />
    }
    if (JobStatusHelper.isFailure(status)) {
      return <XCircle className="w-6 h-6 text-red-600" />
    }
    return <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
  }

  const getStatusColor = (): string => {
    if (JobStatusHelper.isSuccess(status)) {
      return 'bg-green-500/20 text-green-400'
    }
    if (JobStatusHelper.isFailure(status)) {
      return 'bg-red-500/20 text-red-400'
    }
    return 'bg-blue-500/20 text-blue-400'
  }

  const getStatusLabel = (): string => {
    switch (status) {
      case JobStatusEnum.GENERATING:
        return 'GENERATING'
      case JobStatusEnum.GENERATED:
        return 'GENERATED'
      case JobStatusEnum.EXECUTING:
        return 'EXECUTING'
      case JobStatusEnum.PROCESSING:
        return 'PROCESSING'
      case JobStatusEnum.PASSED:
        return 'PASSED'
      case JobStatusEnum.UNSUCCESSFUL:
        return 'UNSUCCESSFUL'
      case JobStatusEnum.FAILED:
        return 'FAILED'
      case JobStatusEnum.COMPLETED:
        return 'COMPLETED'
      default:
        return status.toUpperCase()
    }
  }

  return (
    <div className="bg-[#0F1419] border border-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {getStatusIcon()}
          <div>
            <span className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${getStatusColor()}`}>
              {getStatusLabel()}
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
