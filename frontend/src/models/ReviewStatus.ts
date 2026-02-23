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
    return new ReviewStatus(
      data.review_id,
      data.pr_id,
      data.is_outdated || false,
      data.review_head_sha || '',
      data.current_head_sha || '',
      data.improvements_status || []
    )
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
