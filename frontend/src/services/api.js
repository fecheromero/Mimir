import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const testCasesApi = {
  generate: async (ticketDescription) => {
    const response = await api.post('/api/test-cases/generate', {
      ticket_description: ticketDescription,
    })
    return response.data
  },

  execute: async (testCaseText, url, userEmail = null, userPassword = null, headless = false) => {
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

  uploadAndExecute: async (file, url, userEmail = null, userPassword = null, headless = false) => {
    const formData = new FormData()
    formData.append('file', file)
    if (url) formData.append('url', url)
    if (userEmail) formData.append('user_email', userEmail)
    if (userPassword) formData.append('user_password', userPassword)
    formData.append('browser_mode', 'new')
    formData.append('headless', headless)

    const response = await api.post('/api/test-cases/upload-and-execute', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  uploadAndReplay: async (file, userEmail = null, userPassword = null, headless = false) => {
    const formData = new FormData()
    formData.append('file', file)
    if (userEmail) formData.append('user_email', userEmail)
    if (userPassword) formData.append('user_password', userPassword)
    formData.append('browser_mode', 'new')
    formData.append('headless', headless)

    const response = await api.post('/api/test-cases/upload-and-replay', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  replayActions: async (
    actions,
    url,
    userEmail = null,
    userPassword = null,
    testCaseText = null,
    testExpectations = null,
    expectedOutcome = null,
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
  getStatus: async (jobId) => {
    const response = await api.get(`/api/jobs/${jobId}/status`)
    return response.data
  },

  getTestCases: async (jobId) => {
    const response = await api.get(`/api/jobs/${jobId}/test-cases`)
    return response.data
  },

  getResults: async (jobId) => {
    const response = await api.get(`/api/jobs/${jobId}/results`)
    return response.data
  },

  downloadFile: (jobId, fileType) => {
    return `${API_BASE_URL}/api/jobs/${jobId}/download/${fileType}`
  },
}

export const prReviewsApi = {
  watchPR: async (prUrl) => {
    const response = await api.post('/api/pr-reviews/watch', {
      pr_url: prUrl,
    })
    return response.data
  },

  getWatchedPRs: async () => {
    const response = await api.get('/api/pr-reviews/watched')
    return response.data
  },

  getPRDetails: async (prId) => {
    const response = await api.get(`/api/pr-reviews/${encodeURIComponent(prId)}`)
    return response.data
  },

  triggerReview: async (prId) => {
    const response = await api.post(`/api/pr-reviews/${encodeURIComponent(prId)}/review`, {
      pr_id: prId,
      sync: true,
    })
    return response.data
  },

  getReview: async (prId, reviewId) => {
    const response = await api.get(`/api/pr-reviews/${encodeURIComponent(prId)}/reviews/${reviewId}`)
    return response.data
  },

  unwatchPR: async (prId) => {
    const response = await api.delete(`/api/pr-reviews/${encodeURIComponent(prId)}`)
    return response.data
  },

  getReviewerRules: async () => {
    const response = await api.get('/api/pr-reviews/reviewer-rules')
    return response.data
  },

  approveSuggestion: async (prId, reviewId, editedSuggestion = null) => {
    const response = await api.post('/api/pr-reviews/reviewer-rules/approve-suggestion', {
      pr_id: prId,
      review_id: reviewId,
      edited_suggestion: editedSuggestion,
    })
    return response.data
  },

  rejectSuggestion: async (prId, reviewId, reason = null) => {
    const response = await api.post('/api/pr-reviews/reviewer-rules/reject-suggestion', {
      pr_id: prId,
      review_id: reviewId,
      reason,
    })
    return response.data
  },

  updateReviewerRules: async (rulesContent) => {
    const response = await api.put('/api/pr-reviews/reviewer-rules', {
      rules_content: rulesContent,
    })
    return response.data
  },
}

export default api
