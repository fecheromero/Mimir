import { Improvement } from './Improvement'
import { MODEL_PARSE_ERRORS, REVIEW_STATUS } from '../utils/constants'

export interface RuleSuggestion {
  suggestion: string
  rationale: string
}

export class Review {
  constructor(
    public readonly reviewId: string,
    public readonly prId: string,
    public readonly prUrl: string,
    public readonly status: string,
    public readonly createdAt: Date,
    public readonly prHeadSha: string,
    public readonly reviewText: string | null,
    public readonly summary: string | null,
    public readonly dummyImprovements: Improvement[],
    public readonly mediumImprovements: Improvement[],
    public readonly experimentalImprovements: Improvement[],
    public readonly ruleSuggestion: RuleSuggestion | null
  ) {}

  static fromJson(data: any): Review {
    try {
      // Validate required fields
      if (!data.review_id || !data.pr_id) {
        throw new Error('Missing required fields: review_id or pr_id')
      }

      if (!data.created_at) {
        throw new Error('Missing required field: created_at')
      }

      // Parse improvements arrays safely
      const dummyImprovements = Array.isArray(data.review_data?.dummy_improvements)
        ? data.review_data.dummy_improvements
            .map((imp: any) => {
              try {
                return Improvement.fromJson(imp, 'dummy')
              } catch (error) {
                console.warn('Failed to parse dummy improvement:', error)
                return null
              }
            })
            .filter((imp: any) => imp !== null)
        : []

      const mediumImprovements = Array.isArray(data.review_data?.medium_improvements)
        ? data.review_data.medium_improvements
            .map((imp: any) => {
              try {
                return Improvement.fromJson(imp, 'medium')
              } catch (error) {
                console.warn('Failed to parse medium improvement:', error)
                return null
              }
            })
            .filter((imp: any) => imp !== null)
        : []

      const experimentalImprovements = Array.isArray(data.review_data?.experimental_improvements)
        ? data.review_data.experimental_improvements
            .map((imp: any) => {
              try {
                return Improvement.fromJson(imp, 'experimental')
              } catch (error) {
                console.warn('Failed to parse experimental improvement:', error)
                return null
              }
            })
            .filter((imp: any) => imp !== null)
        : []

      return new Review(
        String(data.review_id),
        String(data.pr_id),
        String(data.pr_url || ''),
        String(data.status || REVIEW_STATUS.PENDING),
        new Date(data.created_at),
        String(data.pr_head_sha || ''),
        data.review_text || null,
        data.review_data?.summary || null,
        dummyImprovements,
        mediumImprovements,
        experimentalImprovements,
        data.rule_suggestion || null
      )
    } catch (error) {
      console.error(MODEL_PARSE_ERRORS.REVIEW, error)
      throw new Error(`${MODEL_PARSE_ERRORS.REVIEW}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  toJson(): Record<string, any> {
    return {
      review_id: this.reviewId,
      pr_id: this.prId,
      pr_url: this.prUrl,
      status: this.status,
      created_at: this.createdAt.toISOString(),
      pr_head_sha: this.prHeadSha,
      review_text: this.reviewText,
      review_data: {
        summary: this.summary,
        dummy_improvements: this.dummyImprovements.map(imp => imp.toJson()),
        medium_improvements: this.mediumImprovements.map(imp => imp.toJson()),
        experimental_improvements: this.experimentalImprovements.map(imp => imp.toJson())
      },
      rule_suggestion: this.ruleSuggestion
    }
  }

  get isCompleted(): boolean {
    return this.status === 'completed'
  }

  get isFailed(): boolean {
    return this.status === 'failed'
  }

  get isPending(): boolean {
    return this.status === 'pending' || this.status === 'processing'
  }

  get hasStructuredReview(): boolean {
    return this.summary !== null
  }

  get totalImprovements(): number {
    return (
      this.dummyImprovements.length +
      this.mediumImprovements.length +
      this.experimentalImprovements.length
    )
  }

  get autoApplicableCount(): number {
    return this.dummyImprovements.filter(imp => imp.isAutoApplicable).length
  }

  get hasRuleSuggestion(): boolean {
    return this.ruleSuggestion !== null
  }

  get shortSha(): string {
    return this.prHeadSha.substring(0, 7)
  }

  getAllImprovements(): Improvement[] {
    return [
      ...this.dummyImprovements,
      ...this.mediumImprovements,
      ...this.experimentalImprovements
    ]
  }

  findImprovementById(id: string): Improvement | null {
    return this.getAllImprovements().find(imp => imp.id === id) || null
  }

  getImprovementsByFile(filePath: string): Improvement[] {
    return this.getAllImprovements().filter(imp => imp.affectsFile(filePath))
  }
}
