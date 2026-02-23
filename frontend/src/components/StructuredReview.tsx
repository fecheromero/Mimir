import { useState } from 'react'
import {ChevronDown, ChevronRight, Zap, Wrench, Beaker, CheckSquare, Layers, ExternalLink, X} from 'lucide-react'
import ImprovementCard from './ImprovementCard'
import PromptBuilder from './PromptBuilder'
import ApplyConfirmationModal from './ApplyConfirmationModal'
import { useCombinedPromptGenerator } from '../hooks/useCombinedPromptGenerator'
import { useApplyImprovements } from '../hooks/useApplyImprovements'
import { useReviewStatus } from '../hooks/useReviewStatus'
import { PullRequest } from '@models'

interface StructuredReviewProps {
  reviewData: {
    summary?: string | null
    dummy_improvements?: any[]
    medium_improvements?: any[]
    experimental_improvements?: any[]
  }
  pr: PullRequest | any
  reviewId: string
}

type PromptType = 'medium' | 'experimental' | null

interface ExpandedSections {
  dummy: boolean
  medium: boolean
  experimental: boolean
}

export default function StructuredReview({ reviewData, pr, reviewId }: StructuredReviewProps) {
  const [expandedSections, setExpandedSections] = useState<ExpandedSections>({
    dummy: true,
    medium: false,
    experimental: false
  })

  const [selectedImprovements, setSelectedImprovements] = useState<string[]>([])
  const [selectedMedium, setSelectedMedium] = useState<string[]>([])
  const [selectedExperimental, setSelectedExperimental] = useState<string[]>([])
  const [showCombinedPrompt, setShowCombinedPrompt] = useState<PromptType>(null)
  const [showApplyModal, setShowApplyModal] = useState<boolean>(false)

  // Hook for applying improvements
  const { applying, error, result, applyImprovements, reset } = useApplyImprovements()

  // Hook for review status (merged improvements, outdated check)
  const { status: reviewStatus } = useReviewStatus(pr?.id, reviewId)

  const isImprovementMerged = (improvementId: string): boolean => {
    return reviewStatus?.isImprovementMerged(improvementId) || false
  }

  const toggleSection = (section: keyof ExpandedSections): void => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const handleToggleImprovement = (improvementId: string, checked: boolean): void => {
    setSelectedImprovements(prev => {
      if (checked) {
        return [...prev, improvementId]
      } else {
        return prev.filter(id => id !== improvementId)
      }
    })
  }

  const handleToggleMedium = (improvementId: string, checked: boolean): void => {
    setSelectedMedium(prev => {
      if (checked) {
        return [...prev, improvementId]
      } else {
        return prev.filter(id => id !== improvementId)
      }
    })
  }

  const handleToggleExperimental = (improvementId: string, checked: boolean): void => {
    setSelectedExperimental(prev => {
      if (checked) {
        return [...prev, improvementId]
      } else {
        return prev.filter(id => id !== improvementId)
      }
    })
  }

  // Get selected improvements objects for combined prompt
  const selectedMediumImprovements = reviewData.medium_improvements?.filter(
    imp => selectedMedium.includes(imp.id)
  ) || []

  const selectedExperimentalImprovements = reviewData.experimental_improvements?.filter(
    imp => selectedExperimental.includes(imp.id)
  ) || []

  // Get selected improvements objects
  const selectedDummyImprovements = reviewData.dummy_improvements?.filter(
    imp => selectedImprovements.includes(imp.id)
  ) || []

  // Combined prompt generators
  const mediumCombinedPrompt = useCombinedPromptGenerator(
    selectedMediumImprovements,
    pr,
    'medium'
  )

  const experimentalCombinedPrompt = useCombinedPromptGenerator(
    selectedExperimentalImprovements,
    pr,
    'experimental'
  )

  // Handle apply improvements
  const handleApplyClick = () => {
    setShowApplyModal(true)
  }

  const handleApplyConfirm = async (commitMessage: string) => {
    await applyImprovements(pr.id, selectedDummyImprovements, commitMessage, reviewId)
    // Modal will close on success or error
  }

  const handleApplyCancel = () => {
    setShowApplyModal(false)
    reset()
  }

  // Close modal and clear selection on success
  if (result?.success && showApplyModal) {
    setShowApplyModal(false)
    setSelectedImprovements([])
  }

  const dummyCount = reviewData.dummy_improvements?.length || 0
  const mediumCount = reviewData.medium_improvements?.length || 0
  const experimentalCount = reviewData.experimental_improvements?.length || 0

  return (
    <div className="space-y-6">
      {/* Summary */}
      {reviewData.summary && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <h3 className="text-blue-400 font-semibold mb-2">Review Summary</h3>
          <p className="text-gray-300 text-sm">{reviewData.summary}</p>
        </div>
      )}

      {/* Dummy Improvements */}
      <div className="bg-[#0F1419] border border-gray-800 rounded-lg">
        <button
          onClick={() => toggleSection('dummy')}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            {expandedSections.dummy ? (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-400" />
            )}
            <Zap className="w-5 h-5 text-green-400" />
            <div>
              <h3 className="text-white font-semibold">Dummy Improvements</h3>
              <p className="text-gray-400 text-xs">Safe, trivial changes - Auto-applicable</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {dummyCount > 0 && selectedImprovements.length > 0 && (
              <span className="text-xs text-blue-400">
                {selectedImprovements.length} selected
              </span>
            )}
            <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-sm">
              {dummyCount}
            </span>
          </div>
        </button>

        {expandedSections.dummy && (
          <div className="p-4 pt-0 border-t border-gray-800">
            {dummyCount === 0 ? (
              <p className="text-gray-500 text-sm italic text-center py-4">
                No dummy improvements found
              </p>
            ) : (
              <>
                {reviewData.dummy_improvements?.map((improvement) => {
                  const isMerged = isImprovementMerged(improvement.id)
                  return (
                    <ImprovementCard
                      key={improvement.id}
                      improvement={improvement}
                      category="dummy"
                      selected={selectedImprovements.includes(improvement.id)}
                      onToggle={isMerged ? null : handleToggleImprovement}
                      showCheckbox={!isMerged}
                      merged={isMerged}
                    />
                  )
                })}

                {selectedImprovements.length > 0 && (
                  <>
                    {reviewStatus?.isOutdated && (
                      <div className="mt-4 flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                        <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div className="flex-1">
                          <p className="text-yellow-400 text-sm font-medium">Cannot Apply - Review Outdated</p>
                          <p className="text-yellow-300/80 text-xs mt-1">
                            This review is based on an older commit. Generate a new review to apply improvements.
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="mt-4 flex items-center justify-between p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <span className="text-green-400 text-sm">
                        {selectedImprovements.length} improvement(s) selected
                      </span>
                      <button
                        onClick={handleApplyClick}
                        disabled={applying || reviewStatus?.isOutdated}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={reviewStatus?.isOutdated ? 'Cannot apply improvements - review is outdated' : ''}
                      >
                        <CheckSquare className="w-4 h-4" />
                        {applying ? 'Applying...' : reviewStatus?.isOutdated ? 'Review Outdated' : 'Apply Selected'}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Medium Improvements */}
      <div className="bg-[#0F1419] border border-gray-800 rounded-lg">
        <button
          onClick={() => toggleSection('medium')}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            {expandedSections.medium ? (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-400" />
            )}
            <Wrench className="w-5 h-5 text-yellow-400" />
            <div>
              <h3 className="text-white font-semibold">Medium Improvements</h3>
              <p className="text-gray-400 text-xs">Moderate complexity - Requires review</p>
            </div>
          </div>
          <span className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded text-sm">
            {mediumCount}
          </span>
        </button>

        {expandedSections.medium && (
          <div className="p-4 pt-0 border-t border-gray-800">
            {mediumCount === 0 ? (
              <p className="text-gray-500 text-sm italic text-center py-4">
                No medium improvements found
              </p>
            ) : (
              <>
                {reviewData.medium_improvements?.map((improvement) => (
                  <ImprovementCard
                    key={improvement.id}
                    improvement={improvement}
                    category="medium"
                    pr={pr}
                    selected={selectedMedium.includes(improvement.id)}
                    onToggle={handleToggleMedium}
                    showCheckbox={mediumCount > 1}
                  />
                ))}

                {selectedMedium.length > 1 && (
                  <div className="mt-4 flex items-center justify-between p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <span className="text-yellow-400 text-sm">
                      {selectedMedium.length} improvement(s) selected
                    </span>
                    <button
                      onClick={() => setShowCombinedPrompt('medium')}
                      className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
                    >
                      <Layers className="w-4 h-4" />
                      Generate Combined Prompt
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Experimental Improvements */}
      <div className="bg-[#0F1419] border border-gray-800 rounded-lg">
        <button
          onClick={() => toggleSection('experimental')}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            {expandedSections.experimental ? (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-400" />
            )}
            <Beaker className="w-5 h-5 text-purple-400" />
            <div>
              <h3 className="text-white font-semibold">Experimental Zone</h3>
              <p className="text-gray-400 text-xs">High risk/effort - Consider carefully</p>
            </div>
          </div>
          <span className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded text-sm">
            {experimentalCount}
          </span>
        </button>

        {expandedSections.experimental && (
          <div className="p-4 pt-0 border-t border-gray-800">
            {experimentalCount === 0 ? (
              <p className="text-gray-500 text-sm italic text-center py-4">
                No experimental improvements found
              </p>
            ) : (
              <>
                {reviewData.experimental_improvements?.map((improvement) => (
                  <ImprovementCard
                    key={improvement.id}
                    improvement={improvement}
                    category="experimental"
                    pr={pr}
                    selected={selectedExperimental.includes(improvement.id)}
                    onToggle={handleToggleExperimental}
                    showCheckbox={experimentalCount > 1}
                  />
                ))}

                {selectedExperimental.length > 1 && (
                  <div className="mt-4 flex items-center justify-between p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                    <span className="text-purple-400 text-sm">
                      {selectedExperimental.length} improvement(s) selected
                    </span>
                    <button
                      onClick={() => setShowCombinedPrompt('experimental')}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
                    >
                      <Layers className="w-4 h-4" />
                      Generate Combined Prompt
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Combined Prompt Modal */}
      {showCombinedPrompt === 'medium' && selectedMedium.length > 1 && (
        <PromptBuilder
          improvement={null}
          pr={pr}
          category="medium"
          onClose={() => setShowCombinedPrompt(null)}
          isCombined={true}
          combinedPromptData={mediumCombinedPrompt}
        />
      )}

      {showCombinedPrompt === 'experimental' && selectedExperimental.length > 1 && (
        <PromptBuilder
          improvement={null}
          pr={pr}
          category="experimental"
          onClose={() => setShowCombinedPrompt(null)}
          isCombined={true}
          combinedPromptData={experimentalCombinedPrompt}
        />
      )}

      {/* Apply Confirmation Modal */}
      {showApplyModal && (
        <ApplyConfirmationModal
          improvements={selectedDummyImprovements}
          pr={pr}
          onConfirm={handleApplyConfirm}
          onCancel={handleApplyCancel}
          applying={applying}
        />
      )}

      {/* Success Toast */}
      {result?.success && !showApplyModal && (
        <div className="fixed bottom-6 right-6 bg-green-600 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 z-50 animate-slide-up">
          <CheckSquare className="w-5 h-5" />
          <div>
            <p className="font-semibold">Successfully applied {result.improvements_applied} improvements!</p>
            {result.commit_url && (
              <a
                href={result.commit_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm underline flex items-center gap-1 mt-1 hover:text-green-100"
              >
                View commit <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Error Toast */}
      {error && !showApplyModal && (
        <div className="fixed bottom-6 right-6 bg-red-600 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 z-50 animate-slide-up">
          <div className="w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold">
            !
          </div>
          <div>
            <p className="font-semibold">Failed to apply improvements</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
          <button
            onClick={reset}
            className="ml-4 p-1 hover:bg-red-700 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
