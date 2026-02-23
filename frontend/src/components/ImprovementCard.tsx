import { useState } from 'react'
import { MessageSquare, CheckCircle2 } from 'lucide-react'
import DiffPreview from './DiffPreview'
import PromptBuilder from './PromptBuilder'

interface Improvement {
  id: string
  title: string
  description: string
  file_path?: string
  line_start?: number
  files?: string[]
  type?: string
  diff?: string
  impact?: string
  risk?: string
  effort?: string
  files_affected_count?: number
  rationale?: string
  confidence?: number
}

interface PR {
  url: string
  head_branch: string
}

interface ImprovementCardProps {
  improvement: Improvement
  category: string
  selected?: boolean
  onToggle?: ((id: string, checked: boolean) => void) | null
  showCheckbox?: boolean
  pr?: PR | null
  merged?: boolean
}

export default function ImprovementCard({
  improvement,
  category,
  selected = false,
  onToggle = null,
  showCheckbox = false,
  pr = null,
  merged = false
}: ImprovementCardProps): JSX.Element {
  const [showPromptBuilder, setShowPromptBuilder] = useState<boolean>(false)

  const getBadgeColor = (confidence: number): string => {
    if (confidence >= 0.9) return 'bg-green-500/20 text-green-400 border-green-500/30'
    if (confidence >= 0.75) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
  }

  return (
    <div className="bg-[#0F1419] border border-gray-800 rounded-lg p-4 mb-3">
      <div className="flex items-start gap-3">
        {showCheckbox && onToggle && (
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onToggle(improvement.id, e.target.checked)}
            className="mt-1 w-4 h-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-900"
          />
        )}

        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h4 className="text-white font-medium">{improvement.title}</h4>
              {merged && (
                <div className="flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs border border-green-500/30">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Merged</span>
                </div>
              )}
            </div>

            {improvement.confidence && (
              <div className={`px-2 py-0.5 rounded text-xs border ${getBadgeColor(improvement.confidence)}`}>
                {Math.round(improvement.confidence * 100)}% confidence
              </div>
            )}
          </div>

          <p className="text-gray-400 text-sm mb-3">{improvement.description}</p>

          {/* File info */}
          <div className="flex flex-wrap gap-2 mb-3">
            {improvement.file_path && (
              <div className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded font-mono">
                {improvement.file_path}
                {improvement.line_start && `:${improvement.line_start}`}
              </div>
            )}
            {improvement.files && improvement.files.map((file, i) => (
              <div key={i} className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded font-mono">
                {file}
              </div>
            ))}
            {improvement.type && (
              <div className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded border border-blue-500/30">
                {improvement.type}
              </div>
            )}
          </div>

          {/* Diff preview for dummy improvements */}
          {improvement.diff && (
            <div className="mb-2">
              <div className="text-xs text-gray-500 mb-1">Changes:</div>
              <DiffPreview diff={improvement.diff} />
            </div>
          )}

          {/* Additional metadata */}
          {improvement.impact && (
            <div className="flex gap-3 text-xs text-gray-500 mt-2">
              {improvement.impact && <span>Impact: {improvement.impact}</span>}
              {improvement.risk && <span>Risk: {improvement.risk}</span>}
              {improvement.effort && <span>Effort: {improvement.effort}</span>}
              {improvement.files_affected_count && (
                <span>{improvement.files_affected_count} files affected</span>
              )}
            </div>
          )}

          {improvement.rationale && (
            <div className="mt-2 p-2 bg-gray-800/50 rounded text-xs text-gray-400 italic">
              {improvement.rationale}
            </div>
          )}

          {/* Generate Prompt button for medium/experimental */}
          {(category === 'medium' || category === 'experimental') && pr && (
            <div className="mt-3">
              <button
                onClick={() => setShowPromptBuilder(true)}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                Generate Prompt
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Prompt Builder Modal */}
      {showPromptBuilder && (
        <PromptBuilder
          improvement={improvement}
          pr={pr}
          category={category}
          onClose={() => setShowPromptBuilder(false)}
        />
      )}
    </div>
  )
}
