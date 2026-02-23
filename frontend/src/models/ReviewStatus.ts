import { MODEL_PARSE_ERRORS } from '../utils/constants'

export interface ImprovementStatus {
  id: string
  merged: boolean
}

export class ReviewStatus {
  constructor(
    public readonly reviewId: string,
    public readonly prId: string,
    public readonly isOutdated: boolean,
    public readonly reviewHeadSha: string,
    public readonly currentHeadSha: string,
    public readonly improvementsStatus: ImprovementStatus[]
  ) {}

  static fromJson(data: any): ReviewStatus {
    try {
      // Validate required fields
      if (!data.review_id || !data.pr_id) {
        throw new Error('Missing required fields: review_id or pr_id')
      }

      // Validate improvements_status is an array
      const improvementsStatus = Array.isArray(data.improvements_status)
        ? data.improvements_status
        : []

      return new ReviewStatus(
        String(data.review_id),
        String(data.pr_id),
        Boolean(data.is_outdated),
        String(data.review_head_sha || ''),
        String(data.current_head_sha || ''),
        improvementsStatus
      )
    } catch (error) {
      console.error(MODEL_PARSE_ERRORS.REVIEW_STATUS, error)
      throw new Error(`${MODEL_PARSE_ERRORS.REVIEW_STATUS}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  toJson(): Record<string, any> {
    return {
      review_id: this.reviewId,
      pr_id: this.prId,
      is_outdated: this.isOutdated,
      review_head_sha: this.reviewHeadSha,
      current_head_sha: this.currentHeadSha,
      improvements_status: this.improvementsStatus
    }
  }

  get reviewShortSha(): string {
    return this.reviewHeadSha.substring(0, 7)
  }

  get currentShortSha(): string {
    return this.currentHeadSha.substring(0, 7)
  }

  get hasShaTracking(): boolean {
    return this.reviewHeadSha !== '' && this.currentHeadSha !== ''
  }

  get mergedImprovementIds(): string[] {
    return this.improvementsStatus
      .filter(status => status.merged)
      .map(status => status.id)
  }

  get mergedCount(): number {
    return this.mergedImprovementIds.length
  }

  isImprovementMerged(improvementId: string): boolean {
    const status = this.improvementsStatus.find(s => s.id === improvementId)
    return status?.merged || false
  }

  hasAnyMergedImprovements(): boolean {
    return this.mergedCount > 0
  }
}
