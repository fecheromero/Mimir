import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, GitPullRequest, Play, Clock, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react'
import { prReviewsApi } from '../services/api'
import ReactMarkdown from 'react-markdown'

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
                  <button
                    key={review.review_id}
                    onClick={() => loadReviewContent(review.review_id)}
                    className={`w-full text-left p-4 rounded-lg border transition-colors ${
                      selectedReview?.review_id === review.review_id
                        ? 'bg-blue-600/20 border-blue-500'
                        : 'bg-[#0F1419] border-gray-800 hover:border-gray-700'
                    }`}
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

                <div className="prose prose-invert max-w-none">
                  <ReactMarkdown
                    components={{
                      h2: ({ children }) => (
                        <h2 className="text-2xl font-bold text-white mt-6 mb-3">{children}</h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-xl font-semibold text-white mt-4 mb-2">{children}</h3>
                      ),
                      p: ({ children }) => (
                        <p className="text-gray-300 mb-3 leading-relaxed">{children}</p>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc list-inside text-gray-300 mb-4 space-y-2">{children}</ul>
                      ),
                      li: ({ children }) => (
                        <li className="ml-4">{children}</li>
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
                      strong: ({ children }) => (
                        <strong className="font-bold text-white">{children}</strong>
                      ),
                    }}
                  >
                    {selectedReview.review_text}
                  </ReactMarkdown>
                </div>
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
