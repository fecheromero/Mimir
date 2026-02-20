import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { GitPullRequest, Plus, Trash2, ExternalLink, Clock } from 'lucide-react'
import { prReviewsApi } from '../services/api'

export default function PRReviewer() {
  const navigate = useNavigate()
  const [watchedPRs, setWatchedPRs] = useState([])
  const [loading, setLoading] = useState(true)
  const [addingPR, setAddingPR] = useState(false)
  const [prUrl, setPrUrl] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    loadWatchedPRs()
  }, [])

  const loadWatchedPRs = async () => {
    try {
      setLoading(true)
      const data = await prReviewsApi.getWatchedPRs()
      setWatchedPRs(data.prs || [])
    } catch (err) {
      console.error('Error loading PRs:', err)
      setError('Failed to load watched PRs')
    } finally {
      setLoading(false)
    }
  }

  const handleAddPR = async (e) => {
    e.preventDefault()
    if (!prUrl.trim()) return

    try {
      setAddingPR(true)
      setError(null)

      await prReviewsApi.watchPR(prUrl)

      // Reset form
      setPrUrl('')

      // Reload list
      await loadWatchedPRs()
    } catch (err) {
      console.error('Error adding PR:', err)
      setError(err.response?.data?.detail || 'Failed to add PR')
    } finally {
      setAddingPR(false)
    }
  }

  const handleUnwatch = async (prId) => {
    if (!confirm('Are you sure you want to stop watching this PR?')) return

    try {
      await prReviewsApi.unwatchPR(prId)
      await loadWatchedPRs()
    } catch (err) {
      console.error('Error unwatching PR:', err)
      setError('Failed to unwatch PR')
    }
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="min-h-screen bg-[#0A0E14] p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">PR Reviewer</h1>
          <p className="text-gray-400">
            Monitor and review pull requests with AI-powered code analysis
          </p>
        </div>

        {/* Add PR Form */}
        <div className="bg-[#0F1419] border border-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add Pull Request
          </h2>

          <form onSubmit={handleAddPR} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                GitHub PR URL
              </label>
              <input
                type="url"
                value={prUrl}
                onChange={(e) => setPrUrl(e.target.value)}
                placeholder="https://github.com/owner/repo/pull/123"
                className="w-full px-4 py-2 bg-[#0A0E14] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={addingPR}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              {addingPR ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Adding PR...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Watch Pull Request
                </>
              )}
            </button>
          </form>
        </div>

        {/* Watched PRs List */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">
            Watched Pull Requests ({watchedPRs.length})
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : watchedPRs.length === 0 ? (
            <div className="bg-[#0F1419] border border-gray-800 rounded-lg p-12 text-center">
              <GitPullRequest className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-2">No pull requests being watched</p>
              <p className="text-gray-500 text-sm">
                Add a PR URL above to start monitoring and reviewing
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {watchedPRs.map((pr) => (
                <div
                  key={pr.id}
                  className="bg-[#0F1419] border border-gray-800 rounded-lg p-6 hover:border-gray-700 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <GitPullRequest className="w-5 h-5 text-blue-500" />
                        <h3
                          className="text-lg font-semibold text-white hover:text-blue-400 cursor-pointer"
                          onClick={() => navigate(`/pr-reviewer/${encodeURIComponent(pr.id)}`)}
                        >
                          {pr.title}
                        </h3>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            pr.state === 'open'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-purple-500/20 text-purple-400'
                          }`}
                        >
                          {pr.state}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
                        <span>{pr.repo}</span>
                        <span>•</span>
                        <span>by {pr.author}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          Updated {formatDate(pr.updated_at)}
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => navigate(`/pr-reviewer/${encodeURIComponent(pr.id)}`)}
                          className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center gap-1"
                        >
                          View Details
                          <span className="text-xs bg-blue-500/20 px-2 py-0.5 rounded-full">
                            {pr.review_count} {pr.review_count === 1 ? 'review' : 'reviews'}
                          </span>
                        </button>

                        <a
                          href={pr.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-gray-300 text-sm flex items-center gap-1"
                        >
                          Open in GitHub
                          <ExternalLink className="w-3 h-3" />
                        </a>

                        <button
                          onClick={() => handleUnwatch(pr.id)}
                          className="ml-auto text-red-400 hover:text-red-300 text-sm flex items-center gap-1"
                        >
                          <Trash2 className="w-4 h-4" />
                          Unwatch
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
