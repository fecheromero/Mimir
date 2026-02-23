import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, GitPullRequest, Play, Clock, CheckCircle, AlertCircle, ExternalLink, Lightbulb, ThumbsUp, ThumbsDown, Edit3, Trash2, AlertTriangle } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import StructuredReview from '@components/StructuredReview'
import { usePRDetails } from '@hooks/usePRDetails'
import { useReviewStatus } from '@hooks/useReviewStatus'

export default function PRDetail() {
  const { prId } = useParams()
  const decodedPrId = decodeURIComponent(prId)

  const [reviewing, setReviewing] = useState(false)
  const [suggestionAction, setSuggestionAction] = useState(null)
  const [editingSuggestion, setEditingSuggestion] = useState(false)
  const [editedSuggestion, setEditedSuggestion] = useState('')
  const [deletingReview, setDeletingReview] = useState(null)

  const {
    pr,
    reviews,
    selectedReview,
    loading,
    error,
    loadReviewContent,
    generateReview,
    deleteReview,
    approveSuggestion,
    rejectSuggestion
  } = usePRDetails(decodedPrId)

  const { status: reviewStatus } = useReviewStatus(pr?.id, selectedReview?.reviewId)

  const handleRunReview = async () => {
    try {
      setReviewing(true)
      await generateReview()
    } catch (err) {
      console.error('Error running review:', err)
    } finally {
      setReviewing(false)
    }
  }

  const handleApproveSuggestion = async () => {
    try {
      setSuggestionAction('approving')
      const suggestionToSubmit = editingSuggestion ? editedSuggestion : undefined

      await approveSuggestion(suggestionToSubmit)

      setEditingSuggestion(false)
      setEditedSuggestion('')

      alert('Rule suggestion approved and applied!')
    } catch (err) {
      console.error('Error approving suggestion:', err)
      alert('Failed to approve suggestion: ' + err.message)
    } finally {
      setSuggestionAction(null)
    }
  }

  const handleRejectSuggestion = async () => {
    try {
      setSuggestionAction('rejecting')
      await rejectSuggestion()
      alert('Rule suggestion rejected')
    } catch (err) {
      console.error('Error rejecting suggestion:', err)
      alert('Failed to reject suggestion: ' + err.message)
    } finally {
      setSuggestionAction(null)
    }
  }

  const handleEditSuggestion = () => {
    setEditingSuggestion(true)
    setEditedSuggestion(selectedReview?.ruleSuggestion?.suggestion || '')
  }

  const handleDeleteReview = async (reviewId) => {
    if (!confirm('Are you sure you want to delete this review? This action cannot be undone.')) {
      return
    }

    try {
      setDeletingReview(reviewId)
      await deleteReview(reviewId)
    } catch (err) {
      console.error('Error deleting review:', err)
      alert('Failed to delete review: ' + err.message)
    } finally {
      setDeletingReview(null)
    }
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0E14] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!pr) {
    return (
      <div className="min-h-screen bg-[#0A0E14] p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-400 text-lg mb-4">PR not found</p>
            <Link to="/pr-reviewer" className="text-blue-400 hover:text-blue-300">
              ← Back to PR Reviewer
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0E14] p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            to="/pr-reviewer"
            className="text-gray-400 hover:text-white flex items-center gap-2 mb-4 w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to PR Reviewer
          </Link>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <GitPullRequest className="w-6 h-6 text-blue-500" />
                <h1 className="text-3xl font-bold text-white">{pr.title}</h1>
                <span
                  className={`px-3 py-1 text-sm rounded-full ${
                    pr.isOpen
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-purple-500/20 text-purple-400'
                  }`}
                >
                  {pr.state}
                </span>
              </div>

              <div className="flex items-center gap-4 text-gray-400 mb-4">
                <span>{pr.repo}</span>
                <span>•</span>
                <span>by {pr.author}</span>
                <span>•</span>
                <span>{pr.baseRef} ← {pr.headRef}</span>
              </div>

              {pr.body && (
                <p className="text-gray-300 mb-4 whitespace-pre-wrap">{pr.body}</p>
              )}

              <div className="flex items-center gap-6 text-sm text-gray-400">
                <span className="text-green-400">+{pr.additions}</span>
                <span className="text-red-400">-{pr.deletions}</span>
                <span>{pr.changedFiles} files changed</span>
              </div>
            </div>

            <div className="flex gap-3">
              <a
                href={pr.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center gap-2 transition-colors"
              >
                Open in GitHub
                <ExternalLink className="w-4 h-4" />
              </a>

              <button
                onClick={handleRunReview}
                disabled={reviewing}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg flex items-center gap-2 font-medium transition-colors"
              >
                {reviewing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Reviewing...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Run New Review
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Reviews Section */}
        <div className="grid grid-cols-3 gap-6">
          {/* Reviews List */}
          <div className="col-span-1">
            <h2 className="text-xl font-semibold text-white mb-4">
              Reviews ({reviews.length})
            </h2>

            {reviews.length === 0 ? (
              <div className="bg-[#0F1419] border border-gray-800 rounded-lg p-6 text-center">
                <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 text-sm mb-2">No reviews yet</p>
                <p className="text-gray-500 text-xs">
                  Click "Run New Review" to generate your first AI review
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {reviews.map((review) => (
                  <div
                    key={review.review_id}
                    className={`relative rounded-lg border transition-colors ${
                      selectedReview?.reviewId === review.review_id
                        ? 'bg-blue-600/20 border-blue-500'
                        : 'bg-[#0F1419] border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    <button
                      onClick={() => loadReviewContent(review.review_id)}
                      className="w-full text-left p-4 pr-12"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {review.status === 'completed' ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : review.status === 'failed' ? (
                          <AlertCircle className="w-4 h-4 text-red-400" />
                        ) : (
                          <Clock className="w-4 h-4 text-yellow-400" />
                        )}
                        <span className="text-white text-sm font-medium">
                          {review.status === 'completed' ? 'Completed' : review.status}
                        </span>
                      </div>

                      <p className="text-gray-400 text-xs flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(review.created_at)}
                      </p>
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteReview(review.review_id)
                      }}
                      disabled={deletingReview === review.review_id}
                      className="absolute top-2 right-2 p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete review"
                    >
                      {deletingReview === review.review_id ? (
                        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Review Content */}
          <div className="col-span-2">
            <h2 className="text-xl font-semibold text-white mb-4">Review Content</h2>

            {selectedReview ? (
              <div className="bg-[#0F1419] border border-gray-800 rounded-lg p-6">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="text-white font-medium">
                      Review completed
                    </span>
                  </div>
                  <span className="text-gray-400 text-sm">
                    {formatDate(selectedReview.createdAt.toISOString())}
                  </span>
                </div>

                {/* Outdated Review Banner */}
                {reviewStatus?.isOutdated && (
                  <div className="mb-6 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="text-yellow-400 font-semibold text-sm mb-1">Review Outdated</h3>
                        <p className="text-gray-300 text-sm">
                          This review was generated at commit <code className="bg-gray-800 px-1.5 py-0.5 rounded text-xs">{reviewStatus.reviewShortSha}</code>.
                          The PR has since been updated to <code className="bg-gray-800 px-1.5 py-0.5 rounded text-xs">{reviewStatus.currentShortSha}</code>.
                          Consider generating a new review.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Render structured review if available, otherwise fall back to markdown */}
                {selectedReview.hasStructuredReview ? (
                  <StructuredReview
                    reviewData={{
                      summary: selectedReview.summary,
                      dummy_improvements: selectedReview.dummyImprovements.map(imp => imp.toJson()),
                      medium_improvements: selectedReview.mediumImprovements.map(imp => imp.toJson()),
                      experimental_improvements: selectedReview.experimentalImprovements.map(imp => imp.toJson())
                    }}
                    pr={pr}
                    reviewId={selectedReview.reviewId}
                  />
                ) : selectedReview.reviewText ? (
                  <div className="prose prose-invert max-w-none">
                    <ReactMarkdown>
                      {selectedReview.reviewText}
                    </ReactMarkdown>
                  </div>
                ) : null}

                {/* Rule Suggestion Section */}
                {selectedReview.hasRuleSuggestion && (
                  <div className="mt-8 pt-6 border-t border-gray-800">
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6">
                      <div className="flex items-start gap-3 mb-4">
                        <Lightbulb className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-1" />
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-yellow-400 mb-2">
                            Reviewer Rule Suggestion
                          </h3>
                          <p className="text-gray-300 text-sm mb-4">
                            The AI suggests adding this to the reviewer rules based on insights from this review:
                          </p>

                          {editingSuggestion ? (
                            <div className="mb-4">
                              <textarea
                                value={editedSuggestion}
                                onChange={(e) => setEditedSuggestion(e.target.value)}
                                className="w-full h-32 bg-gray-800 border border-gray-700 rounded-lg p-3 text-gray-200 font-mono text-sm focus:outline-none focus:border-blue-500"
                                placeholder="Edit the suggestion..."
                              />
                            </div>
                          ) : (
                            <div className="bg-gray-900/50 rounded-lg p-4 mb-4">
                              <pre className="text-gray-200 text-sm whitespace-pre-wrap font-mono">
                                {selectedReview.ruleSuggestion.suggestion}
                              </pre>
                            </div>
                          )}

                          {selectedReview.ruleSuggestion.rationale && (
                            <div className="mb-4">
                              <p className="text-gray-400 text-xs font-semibold mb-2 uppercase tracking-wide">
                                Rationale:
                              </p>
                              <p className="text-gray-300 text-sm italic">
                                {selectedReview.ruleSuggestion.rationale}
                              </p>
                            </div>
                          )}

                          <div className="flex gap-3">
                            {editingSuggestion ? (
                              <>
                                <button
                                  onClick={handleApproveSuggestion}
                                  disabled={suggestionAction === 'approving'}
                                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
                                >
                                  {suggestionAction === 'approving' ? (
                                    <>
                                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                      Approving...
                                    </>
                                  ) : (
                                    <>
                                      <ThumbsUp className="w-4 h-4" />
                                      Approve Edited Version
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingSuggestion(false)
                                    setEditedSuggestion('')
                                  }}
                                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={handleApproveSuggestion}
                                  disabled={suggestionAction === 'approving'}
                                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
                                >
                                  {suggestionAction === 'approving' ? (
                                    <>
                                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                      Approving...
                                    </>
                                  ) : (
                                    <>
                                      <ThumbsUp className="w-4 h-4" />
                                      Approve & Apply
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={handleEditSuggestion}
                                  disabled={suggestionAction !== null}
                                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
                                >
                                  <Edit3 className="w-4 h-4" />
                                  Edit Before Approving
                                </button>
                                <button
                                  onClick={handleRejectSuggestion}
                                  disabled={suggestionAction === 'rejecting'}
                                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
                                >
                                  {suggestionAction === 'rejecting' ? (
                                    <>
                                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                      Rejecting...
                                    </>
                                  ) : (
                                    <>
                                      <ThumbsDown className="w-4 h-4" />
                                      Reject
                                    </>
                                  )}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[#0F1419] border border-gray-800 rounded-lg p-12 text-center">
                <GitPullRequest className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">Select a review to view its content</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
