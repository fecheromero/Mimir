import { useState, useEffect } from 'react'
 import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, GitPullRequest, Play, Clock, CheckCircle, AlertCircle, ExternalLink, Lightbulb, ThumbsUp, ThumbsDown, Edit3, Trash2 } from 'lucide-react'
import { prReviewsApi } from '../services/api'
import ReactMarkdown from 'react-markdown'
import StructuredReview from '../components/StructuredReview'

export default function PRDetail() {
  const { prId } = useParams()
  const navigate = useNavigate()
  const decodedPrId = decodeURIComponent(prId)

  const [prInfo, setPrInfo] = useState(null)
  const [reviews, setReviews] = useState([])
  const [selectedReview, setSelectedReview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [reviewing, setReviewing] = useState(false)
  const [error, setError] = useState(null)
  const [suggestionAction, setSuggestionAction] = useState(null) // 'approving' | 'rejecting' | null
  const [editingSuggestion, setEditingSuggestion] = useState(false)
  const [editedSuggestion, setEditedSuggestion] = useState('')
  const [deletingReview, setDeletingReview] = useState(null) // review_id being deleted

  useEffect(() => {
    loadPRDetails()
  }, [decodedPrId])

  const loadPRDetails = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await prReviewsApi.getPRDetails(decodedPrId)
      setPrInfo(data.pr_info)
      setReviews(data.reviews || [])

      // Auto-select most recent review
      if (data.reviews && data.reviews.length > 0) {
        loadReviewContent(data.reviews[0].review_id)
      }
    } catch (err) {
      console.error('Error loading PR details:', err)
      setError('Failed to load PR details')
    } finally {
      setLoading(false)
    }
  }

  const loadReviewContent = async (reviewId) => {
    try {
      const reviewData = await prReviewsApi.getReview(decodedPrId, reviewId)
      setSelectedReview(reviewData)
    } catch (err) {
      console.error('Error loading review content:', err)
    }
  }

  const handleRunReview = async () => {
    try {
      setReviewing(true)
      setError(null)

      const result = await prReviewsApi.triggerReview(decodedPrId)

      // Reload PR details to show new review
      await loadPRDetails()

      // Auto-select the new review
      if (result.review_id) {
        await loadReviewContent(result.review_id)
      }
    } catch (err) {
      console.error('Error running review:', err)
      setError(err.response?.data?.detail || 'Failed to generate review')
    } finally {
      setReviewing(false)
    }
  }

  const handleApproveSuggestion = async () => {
    try {
      setSuggestionAction('approving')
      const suggestionToSubmit = editingSuggestion ? editedSuggestion : null

      await prReviewsApi.approveSuggestion(
        decodedPrId,
        selectedReview.review_id,
        suggestionToSubmit
      )

      // Reload review to update suggestion status
      await loadReviewContent(selectedReview.review_id)

      // Reset edit state
      setEditingSuggestion(false)
      setEditedSuggestion('')

      alert('Rule suggestion approved and applied!')
    } catch (err) {
      console.error('Error approving suggestion:', err)
      alert('Failed to approve suggestion: ' + (err.response?.data?.detail || err.message))
    } finally {
      setSuggestionAction(null)
    }
  }

  const handleRejectSuggestion = async () => {
    try {
      setSuggestionAction('rejecting')

      await prReviewsApi.rejectSuggestion(
        decodedPrId,
        selectedReview.review_id
      )

      // Reload review to update suggestion status
      await loadReviewContent(selectedReview.review_id)

      alert('Rule suggestion rejected')
    } catch (err) {
      console.error('Error rejecting suggestion:', err)
      alert('Failed to reject suggestion: ' + (err.response?.data?.detail || err.message))
    } finally {
      setSuggestionAction(null)
    }
  }

  const handleEditSuggestion = () => {
    setEditingSuggestion(true)
    setEditedSuggestion(selectedReview.rule_suggestion?.suggestion || '')
  }

  const handleDeleteReview = async (reviewId) => {
    if (!confirm('Are you sure you want to delete this review? This action cannot be undone.')) {
      return
    }

    try {
      setDeletingReview(reviewId)
      await prReviewsApi.deleteReview(decodedPrId, reviewId)

      // Clear selected review if it was deleted
      if (selectedReview?.review_id === reviewId) {
        setSelectedReview(null)
      }

      // Reload PR details to update review list
      await loadPRDetails()
    } catch (err) {
      console.error('Error deleting review:', err)
      alert('Failed to delete review: ' + (err.response?.data?.detail || err.message))
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

  if (!prInfo) {
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
                <h1 className="text-3xl font-bold text-white">{prInfo.title}</h1>
                <span
                  className={`px-3 py-1 text-sm rounded-full ${
                    prInfo.state === 'open'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-purple-500/20 text-purple-400'
                  }`}
                >
                  {prInfo.state}
                </span>
              </div>

              <div className="flex items-center gap-4 text-gray-400 mb-4">
                <span>{prInfo.repo}</span>
                <span>•</span>
                <span>by {prInfo.author}</span>
                <span>•</span>
                <span>{prInfo.base_branch} ← {prInfo.head_branch}</span>
              </div>

              {prInfo.body && (
                <p className="text-gray-300 mb-4 whitespace-pre-wrap">{prInfo.body}</p>
              )}

              <div className="flex items-center gap-6 text-sm text-gray-400">
                <span className="text-green-400">+{prInfo.additions}</span>
                <span className="text-red-400">-{prInfo.deletions}</span>
                <span>{prInfo.changed_files} files changed</span>
              </div>
            </div>

            <div className="flex gap-3">
              <a
                href={prInfo.url}
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
                      selectedReview?.review_id === review.review_id
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
                    {formatDate(selectedReview.created_at)}
                  </span>
                </div>

                {/* Render structured review if available, otherwise fall back to markdown */}
                {selectedReview.review_data ? (
                  <StructuredReview reviewData={selectedReview.review_data} pr={prInfo} />
                ) : (
                  <div className="prose prose-invert max-w-none">
                    <ReactMarkdown
                    components={{
                      h1: ({ children }) => (
                        <h1 className="text-3xl font-bold text-white mt-8 mb-4">{children}</h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-2xl font-bold text-white mt-6 mb-3">{children}</h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-xl font-semibold text-white mt-4 mb-2">{children}</h3>
                      ),
                      h4: ({ children }) => (
                        <h4 className="text-lg font-semibold text-white mt-3 mb-2">{children}</h4>
                      ),
                      h5: ({ children }) => (
                        <h5 className="text-base font-semibold text-gray-200 mt-3 mb-2">{children}</h5>
                      ),
                      h6: ({ children }) => (
                        <h6 className="text-sm font-semibold text-gray-300 mt-2 mb-1">{children}</h6>
                      ),
                      p: ({ children }) => (
                        <p className="text-gray-300 mb-3 leading-relaxed">{children}</p>
                      ),
                      a: ({ href, children }) => (
                        <a href={href} className="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer">
                          {children}
                        </a>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc list-inside text-gray-300 mb-4 space-y-2">{children}</ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal list-inside text-gray-300 mb-4 space-y-2">{children}</ol>
                      ),
                      li: ({ children }) => (
                        <li className="ml-4 text-gray-300">{children}</li>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-gray-600 pl-4 italic text-gray-400 my-4">
                          {children}
                        </blockquote>
                      ),
                      hr: () => (
                        <hr className="border-gray-700 my-6" />
                      ),
                      em: ({ children }) => (
                        <em className="italic text-gray-300">{children}</em>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-bold text-white">{children}</strong>
                      ),
                      code: ({ inline, children }) =>
                        inline ? (
                          <code className="bg-gray-800 px-2 py-0.5 rounded text-sm text-blue-300">
                            {children}
                          </code>
                        ) : (
                          <code className="block bg-gray-800 p-4 rounded text-sm text-gray-200 overflow-x-auto">
                            {children}
                          </code>
                        ),
                      pre: ({ children }) => (
                        <pre className="bg-gray-800 p-4 rounded overflow-x-auto mb-4">
                          {children}
                        </pre>
                      ),
                      table: ({ children }) => (
                        <table className="min-w-full divide-y divide-gray-700 my-4">
                          {children}
                        </table>
                      ),
                      thead: ({ children }) => (
                        <thead className="bg-gray-800">
                          {children}
                        </thead>
                      ),
                      tbody: ({ children }) => (
                        <tbody className="divide-y divide-gray-700">
                          {children}
                        </tbody>
                      ),
                      tr: ({ children }) => (
                        <tr>{children}</tr>
                      ),
                      th: ({ children }) => (
                        <th className="px-4 py-2 text-left text-sm font-semibold text-white">
                          {children}
                        </th>
                      ),
                      td: ({ children }) => (
                        <td className="px-4 py-2 text-sm text-gray-300">
                          {children}
                        </td>
                      ),
                    }}
                  >
                    {selectedReview.review_text}
                  </ReactMarkdown>
                  </div>
                )}

                {/* Rule Suggestion Section */}
                {selectedReview.rule_suggestion && (
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
                                {selectedReview.rule_suggestion.suggestion}
                              </pre>
                            </div>
                          )}

                          {selectedReview.rule_suggestion.rationale && (
                            <div className="mb-4">
                              <p className="text-gray-400 text-xs font-semibold mb-2 uppercase tracking-wide">
                                Rationale:
                              </p>
                              <p className="text-gray-300 text-sm italic">
                                {selectedReview.rule_suggestion.rationale}
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
