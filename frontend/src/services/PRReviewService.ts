import axios, { AxiosInstance } from 'axios'
import { PullRequest, Review, ReviewStatus, Improvement } from '../models'

export interface ApplyImprovementsRequest {
  improvementIds: string[]
  improvements: {
    id: string
    file_path: string
    diff: string
    title: string
    confidence: number
  }[]
  commitMessage?: string
  reviewId?: string
}

export interface ApplyImprovementsResult {
  success: boolean
  commitSha: string
  commitUrl: string
  filesChanged: number
  improvementsApplied: number
  message: string
}

export class PRReviewService {
  private api: AxiosInstance

  constructor(baseURL: string = import.meta.env.VITE_API_URL || '/api') {
    this.api = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }

  async watchPR(prUrl: string): Promise<PullRequest> {
    const response = await this.api.post('/api/pr-reviews/watch', {
      pr_url: prUrl
    })
    return PullRequest.fromJson(response.data.pr_info)
  }

  async getWatchedPRs(): Promise<PullRequest[]> {
    const response = await this.api.get('/api/pr-reviews/watched')
    return response.data.prs.map((pr: any) => PullRequest.fromJson(pr))
  }

  async getPRDetails(prId: string): Promise<{ pr: PullRequest; reviews: any[] }> {
    const response = await this.api.get(`/api/pr-reviews/${encodeURIComponent(prId)}`)
    return {
      pr: PullRequest.fromJson(response.data.pr_info),
      reviews: response.data.reviews
    }
  }

  async triggerReview(prId: string): Promise<Review> {
    const response = await this.api.post(`/api/pr-reviews/${encodeURIComponent(prId)}/review`, {
      pr_id: prId,
      sync: true
    })
    return Review.fromJson(response.data)
  }

  async getReview(prId: string, reviewId: string): Promise<Review> {
    const response = await this.api.get(
      `/api/pr-reviews/${encodeURIComponent(prId)}/reviews/${reviewId}`
    )
    return Review.fromJson(response.data)
  }

  async deleteReview(prId: string, reviewId: string): Promise<void> {
    await this.api.delete(`/api/pr-reviews/${encodeURIComponent(prId)}/reviews/${reviewId}`)
  }

  async unwatchPR(prId: string): Promise<void> {
    await this.api.delete(`/api/pr-reviews/${encodeURIComponent(prId)}`)
  }

  async getReviewStatus(prId: string, reviewId: string): Promise<ReviewStatus> {
    const response = await this.api.get(
      `/api/pr-reviews/${encodeURIComponent(prId)}/reviews/${reviewId}/status`
    )
    return ReviewStatus.fromJson(response.data)
  }

  async applyImprovements(
    prId: string,
    improvements: Improvement[],
    commitMessage?: string,
    reviewId?: string
  ): Promise<ApplyImprovementsResult> {
    const request: ApplyImprovementsRequest = {
      improvementIds: improvements.map(imp => imp.id),
      improvements: improvements.map(imp => ({
        id: imp.id,
        file_path: imp.filePath!,
        diff: imp.diff!,
        title: imp.title,
        confidence: imp.confidence
      })),
      commitMessage,
      reviewId
    }

    const response = await this.api.post(
      `/api/pr-reviews/${encodeURIComponent(prId)}/improvements/apply`,
      request
    )

    return {
      success: response.data.success,
      commitSha: response.data.commit_sha,
      commitUrl: response.data.commit_url,
      filesChanged: response.data.files_changed,
      improvementsApplied: response.data.improvements_applied,
      message: response.data.message
    }
  }

  async getReviewerRules(): Promise<{ rules: string; filePath: string }> {
    const response = await this.api.get('/api/pr-reviews/reviewer-rules')
    return {
      rules: response.data.rules,
      filePath: response.data.file_path
    }
  }

  async approveSuggestion(
    prId: string,
    reviewId: string,
    editedSuggestion?: string
  ): Promise<{ message: string; updatedRules: string }> {
    const response = await this.api.post('/api/pr-reviews/reviewer-rules/approve-suggestion', {
      pr_id: prId,
      review_id: reviewId,
      edited_suggestion: editedSuggestion
    })
    return {
      message: response.data.message,
      updatedRules: response.data.updated_rules
    }
  }

  async rejectSuggestion(
    prId: string,
    reviewId: string,
    reason?: string
  ): Promise<{ message: string }> {
    const response = await this.api.post('/api/pr-reviews/reviewer-rules/reject-suggestion', {
      pr_id: prId,
      review_id: reviewId,
      reason
    })
    return {
      message: response.data.message
    }
  }

  async updateReviewerRules(rulesContent: string): Promise<{ message: string; rules: string }> {
    const response = await this.api.put('/api/pr-reviews/reviewer-rules', {
      rules_content: rulesContent
    })
    return {
      message: response.data.message,
      rules: response.data.rules
    }
  }
}

export const prReviewService = new PRReviewService()
