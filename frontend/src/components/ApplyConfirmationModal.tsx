import { useState, KeyboardEvent, ChangeEvent } from 'react'
import { X, AlertTriangle, GitCommit, FileCode } from 'lucide-react'

interface Improvement {
  id: string
  title: string
  file_path: string
  confidence?: number
}

interface PR {
  url: string
  head_branch: string
}

interface ApplyConfirmationModalProps {
  improvements: Improvement[]
  pr: PR
  onConfirm: (commitMessage: string | null) => void
  onCancel: () => void
  applying: boolean
}

export default function ApplyConfirmationModal({
  improvements,
  pr,
  onConfirm,
  onCancel,
  applying
}: ApplyConfirmationModalProps): JSX.Element {
  const [commitMessage, setCommitMessage] = useState<string>('')

  // Generate default commit message
  const defaultCommitMessage = improvements.length === 1
    ? `Apply improvement: ${improvements[0].title}\n\n🤖 Generated with Mimir PR Reviewer`
    : `Apply ${improvements.length} dummy improvements\n\n${improvements.map((imp, i) => `${i + 1}. ${imp.title}`).join('\n')}\n\n🤖 Generated with Mimir PR Reviewer\nPR: ${pr.url}`

  const handleConfirm = (): void => {
    onConfirm(commitMessage || null)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    // Auto-complete with TAB
    if (e.key === 'Tab' && !commitMessage.trim()) {
      e.preventDefault()
      setCommitMessage(defaultCommitMessage)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[#0F1419] border border-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <GitCommit className="w-6 h-6 text-green-400" />
            <div>
              <h2 className="text-lg font-semibold text-white">Apply Dummy Improvements</h2>
              <p className="text-sm text-gray-400">
                {improvements.length} improvement{improvements.length > 1 ? 's' : ''} will be applied
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={applying}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Warning */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-yellow-400 font-semibold text-sm mb-1">
                  This will create a commit on the PR branch
                </h3>
                <p className="text-gray-300 text-sm">
                  Branch: <span className="font-mono text-blue-400">{pr.head_branch}</span>
                </p>
                <p className="text-gray-400 text-xs mt-2">
                  Make sure the PR branch is up to date and has no conflicts
                </p>
              </div>
            </div>
          </div>

          {/* Improvements List */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <FileCode className="w-4 h-4" />
              Changes to Apply
            </h3>
            <div className="space-y-2">
              {improvements.map((imp, index) => (
                <div
                  key={imp.id}
                  className="bg-gray-900 border border-gray-800 rounded-lg p-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-xs font-semibold">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white text-sm font-medium mb-1">
                        {imp.title}
                      </h4>
                      <p className="text-xs text-gray-400 font-mono truncate">
                        {imp.file_path}
                      </p>
                      {imp.confidence && (
                        <div className="mt-2">
                          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                            {Math.round(imp.confidence * 100)}% confidence
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Commit Message */}
          <div>
            <label htmlFor="commit-message" className="block text-sm font-medium text-gray-300 mb-2">
              Commit Message (Optional)
            </label>
            <textarea
              id="commit-message"
              value={commitMessage}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setCommitMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={defaultCommitMessage}
              className="w-full h-32 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-gray-200 text-sm focus:outline-none focus:border-green-500 resize-none placeholder-gray-600 font-mono"
              disabled={applying}
            />
            <p className="mt-2 text-xs text-gray-500">
              Press <kbd className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-xs font-mono">TAB</kbd> to auto-complete with default message, or leave empty
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800 bg-[#0A0E14]">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">
              {applying ? 'Applying changes...' : 'Ready to apply changes'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                disabled={applying}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={applying}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {applying ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <GitCommit className="w-4 h-4" />
                    Apply & Commit
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
