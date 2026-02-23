import { useState, ChangeEvent } from 'react'
import { X, ChevronDown, ChevronRight, MessageSquare } from 'lucide-react'
import { usePromptGenerator } from '../hooks/usePromptGenerator'
import PromptPreview from './PromptPreview'

interface Improvement {
  id: string
  title: string
  description: string
}

interface PR {
  title?: string
  repo?: string
  number?: number
  author?: string
  url: string
  base_branch?: string
  head_branch: string
  body?: string
}

interface PromptData {
  prompt: string
  additionalContext: string
  setAdditionalContext: (context: string) => void
  copyToClipboard: () => void
  copied: boolean
}

interface PromptBuilderProps {
  improvement?: Improvement | undefined
  pr: PR | null
  category: string
  onClose: () => void
  isCombined?: boolean
  combinedPromptData?: PromptData | null
}

export default function PromptBuilder({
  improvement,
  pr,
  category,
  onClose,
  isCombined = false,
  combinedPromptData = null
}: PromptBuilderProps): JSX.Element {
  const [showPreview, setShowPreview] = useState<boolean>(true)

  // Use combined data if in combined mode, otherwise use single improvement generator
  const singlePromptData = usePromptGenerator(
    improvement || { id: '', title: '', description: '' },
    pr || { title: '', repo: '', number: 0, author: '', url: '', base_branch: '', head_branch: '' },
    category
  )

  const promptData = isCombined ? combinedPromptData : singlePromptData

  if (!promptData) {
    return <div>Error: No prompt data available</div>
  }

  const {
    prompt,
    additionalContext,
    setAdditionalContext,
    copyToClipboard,
    copied
  } = promptData

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-[#0F1419] border border-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-6 h-6 text-blue-400" />
            <div>
              <h2 className="text-lg font-semibold text-white">
                {isCombined ? 'Generate Combined Prompt' : 'Generate Improvement Prompt'}
              </h2>
              <p className="text-sm text-gray-400">
                {category === 'medium' ? 'Medium Complexity' : 'Experimental'}
                {isCombined
                  ? ` - Batch of ${prompt.split('### ').length - 1} improvements`
                  : ` - ${improvement?.title || ''}`
                }
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Additional Context Input */}
          <div>
            <label htmlFor="context" className="block text-sm font-medium text-gray-300 mb-2">
              Additional Context (Optional)
            </label>
            <textarea
              id="context"
              value={additionalContext}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setAdditionalContext(e.target.value)}
              placeholder={isCombined
                ? `Add project-specific context for all improvements...

Examples:
- Apply changes in dependency order (auth before API)
- Maintain consistency across all files
- Use the new pattern we discussed for error handling
- Consider performance impact of combined changes`
                : `Add project-specific context, questions, or constraints...

Examples:
- This project uses JWT authentication
- We prefer async/await over promises
- Should we validate tokens server-side?
- Consider backward compatibility with v1 API`
              }
              className="w-full h-32 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-gray-200 text-sm focus:outline-none focus:border-blue-500 resize-none placeholder-gray-500"
            />
            <p className="mt-2 text-xs text-gray-500">
              {isCombined
                ? 'Add context that applies to all improvements in this batch'
                : 'Add any project-specific context, questions, or constraints that Claude should consider'
              }
            </p>
          </div>

          {/* Preview Section */}
          <div>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-white transition-colors mb-2"
            >
              {showPreview ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              Preview Prompt
            </button>

            {showPreview && (
              <PromptPreview
                prompt={prompt}
                onCopy={copyToClipboard}
                copied={copied}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800 bg-[#0A0E14]">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">
              {isCombined
                ? '⚡ Batch mode - All improvements will be applied together in one session'
                : 'Copy the prompt and paste it into Claude Code CLI'
              }
            </p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={copyToClipboard}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
                  copied
                    ? 'bg-green-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {copied ? 'Copied!' : 'Copy Prompt'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
