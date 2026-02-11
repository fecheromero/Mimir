import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const testCasesApi = {
  generate: async (ticketId, ticketDescription) => {
    const response = await api.post('/test-cases/generate', {
      ticket_id: ticketId,
      ticket_description: ticketDescription,
    })
    return response.data
  },

  execute: async (testCaseText, url, userEmail = null, userPassword = null) => {
    const response = await api.post('/test-cases/execute', {
      test_case_text: testCaseText,
      url,
      user_email: userEmail,
      user_password: userPassword,
    })
    return response.data
  },

  uploadAndExecute: async (file, url, userEmail = null, userPassword = null) => {
    const formData = new FormData()
    formData.append('file', file)
    if (url) formData.append('url', url)
    if (userEmail) formData.append('user_email', userEmail)
    if (userPassword) formData.append('user_password', userPassword)

    const response = await api.post('/test-cases/upload-and-execute', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },
}

export const jobsApi = {
  getStatus: async (jobId) => {
    const response = await api.get(`/jobs/${jobId}/status`)
    return response.data
  },

  getTestCases: async (jobId) => {
    const response = await api.get(`/jobs/${jobId}/test-cases`)
    return response.data
  },

  getResults: async (jobId) => {
    const response = await api.get(`/jobs/${jobId}/results`)
    return response.data
  },

  downloadFile: (jobId, fileType) => {
    return `${API_BASE_URL}/jobs/${jobId}/download/${fileType}`
  },
}

export default api
