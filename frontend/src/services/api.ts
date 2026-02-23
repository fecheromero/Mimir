import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const testCasesApi = {
  generate: async (ticketDescription: string) => {
    const response = await api.post('/api/test-cases/generate', {
      ticket_description: ticketDescription,
    })
    return response.data
  },

  execute: async (
    testCaseText: string,
    url: string,
    userEmail: string | null = null,
    userPassword: string | null = null,
    headless = false
  ) => {
    const response = await api.post('/api/test-cases/execute', {
      test_case_text: testCaseText,
      url,
      user_email: userEmail,
      user_password: userPassword,
      browser_mode: 'new',
      headless: headless,
    })
    return response.data
  },

  uploadAndExecute: async (
    file: File,
    url: string,
    userEmail: string | null = null,
    userPassword: string | null = null,
    headless = false
  ) => {
    const formData = new FormData()
    formData.append('file', file)
    if (url) formData.append('url', url)
    if (userEmail) formData.append('user_email', userEmail)
    if (userPassword) formData.append('user_password', userPassword)
    formData.append('browser_mode', 'new')
    formData.append('headless', headless.toString())

    const response = await api.post('/api/test-cases/upload-and-execute', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  uploadAndReplay: async (
    file: File,
    userEmail: string | null = null,
    userPassword: string | null = null,
    headless = false
  ) => {
    const formData = new FormData()
    formData.append('file', file)
    if (userEmail) formData.append('user_email', userEmail)
    if (userPassword) formData.append('user_password', userPassword)
    formData.append('browser_mode', 'new')
    formData.append('headless', headless.toString())

    const response = await api.post('/api/test-cases/upload-and-replay', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  replayActions: async (
    actions: any[],
    url: string,
    userEmail: string | null = null,
    userPassword: string | null = null,
    testCaseText: string | null = null,
    testExpectations: string | null = null,
    expectedOutcome: string | null = null,
    headless = false
  ) => {
    const response = await api.post('/api/test-cases/replay-actions', {
      actions,
      url,
      user_email: userEmail,
      user_password: userPassword,
      test_case_text: testCaseText,
      test_expectations: testExpectations,
      expected_outcome: expectedOutcome,
      browser_mode: 'new',
      headless: headless,
    })
    return response.data
  },
}

export const jobsApi = {
  getStatus: async (jobId: string) => {
    const response = await api.get(`/api/jobs/${jobId}/status`)
    return response.data
  },

  getTestCases: async (jobId: string) => {
    const response = await api.get(`/api/jobs/${jobId}/test-cases`)
    return response.data
  },

  getResults: async (jobId: string) => {
    const response = await api.get(`/api/jobs/${jobId}/results`)
    return response.data
  },

  downloadFile: (jobId: string, fileType: string) => {
    return `${API_BASE_URL}/api/jobs/${jobId}/download/${fileType}`
  },
}

interface Improvement {
  id: string
  file_path: string
  diff: string
  title: string
  confidence: string
}

export const prReviewsApi = {
  watchPR: async (prUrl: string) => {
    const response = await api.post('/api/pr-reviews/watch', {
      pr_url: prUrl,
    })
    return response.data
  },

  getWatchedPRs: async () => {
    const response = await api.get('/api/pr-reviews/watched')
    return response.data
  },

  getPRDetails: async (prId: string) => {
    const response = await api.get(`/api/pr-reviews/${encodeURIComponent(prId)}`)
    return response.data
  },

  triggerReview: async (prId: string) => {
    const response = await api.post(`/api/pr-reviews/${encodeURIComponent(prId)}/review`, {
      pr_id: prId,
      sync: true,
    })
    return response.data
  },

  getReview: async (prId: string, reviewId: string) => {
    const response = await api.get(`/api/pr-reviews/${encodeURIComponent(prId)}/reviews/${reviewId}`)
    return response.data
  },

  deleteReview: async (prId: string, reviewId: string) => {
    const response = await api.delete(`/api/pr-reviews/${encodeURIComponent(prId)}/reviews/${reviewId}`)
    return response.data
  },

  unwatchPR: async (prId: string) => {
    const response = await api.delete(`/api/pr-reviews/${encodeURIComponent(prId)}`)
    return response.data
  },

  getReviewerRules: async () => {
    const response = await api.get('/api/pr-reviews/reviewer-rules')
    return response.data
  },

  approveSuggestion: async (prId: string, reviewId: string, editedSuggestion: string | null = null) => {
    const response = await api.post('/api/pr-reviews/reviewer-rules/approve-suggestion', {
      pr_id: prId,
      review_id: reviewId,
      edited_suggestion: editedSuggestion,
    })
    return response.data
  },

  rejectSuggestion: async (prId: string, reviewId: string, reason: string | null = null) => {
    const response = await api.post('/api/pr-reviews/reviewer-rules/reject-suggestion', {
      pr_id: prId,
      review_id: reviewId,
      reason,
    })
    return response.data
  },

  updateReviewerRules: async (rulesContent: string) => {
    const response = await api.put('/api/pr-reviews/reviewer-rules', {
      rules_content: rulesContent,
    })
    return response.data
  },

  applyImprovements: async (
    prId: string,
    improvements: Improvement[],
    commitMessage: string | null = null,
    reviewId: string | null = null
  ) => {
    const response = await api.post(
      `/api/pr-reviews/${encodeURIComponent(prId)}/improvements/apply`,
      {
        improvement_ids: improvements.map(imp => imp.id),
        improvements: improvements.map(imp => ({
          id: imp.id,
          file_path: imp.file_path,
          diff: imp.diff,
          title: imp.title,
          confidence: imp.confidence
        })),
        commit_message: commitMessage,
        review_id: reviewId
      }
    )
    return response.data
  },

  getReviewStatus: async (prId: string, reviewId: string) => {
    const response = await api.get(
      `/api/pr-reviews/${encodeURIComponent(prId)}/reviews/${reviewId}/status`
    )
    return response.data
  },
}

export default api
