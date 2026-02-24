import { MODEL_PARSE_ERRORS, PR_STATE } from '../utils/constants'

export class PullRequest {
  constructor(
    public readonly id: string,
    public readonly url: string,
    public readonly repo: string,
    public readonly number: number,
    public readonly title: string,
    public readonly author: string,
    public readonly state: string,
    public readonly baseRef: string,
    public readonly headRef: string,
    public readonly headSha: string,
    public readonly body: string,
    public readonly additions: number,
    public readonly deletions: number,
    public readonly changedFiles: number,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly merged: boolean = false,
    public readonly mergedAt: Date | null = null
  ) {}

  static fromJson(data: any): PullRequest {
    try {
      // Validate required fields
      if (!data.id || !data.url || !data.repo || !data.number || !data.title || !data.author) {
        throw new Error('Missing required fields: id, url, repo, number, title, or author')
      }

      // Parse dates safely
      const createdAt = data.created_at || data.createdAt
      const updatedAt = data.updated_at || data.updatedAt

      if (!createdAt || !updatedAt) {
        throw new Error('Missing required date fields: created_at or updated_at')
      }

      const mergedAt = data.merged_at || data.mergedAt

      return new PullRequest(
        String(data.id),
        String(data.url),
        String(data.repo),
        Number(data.number),
        String(data.title),
        String(data.author),
        String(data.state || PR_STATE.OPEN),
        String(data.base_branch || data.baseRef || 'main'),
        String(data.head_branch || data.headRef || ''),
        String(data.head_sha || data.headSha || ''),
        String(data.body || ''),
        Number(data.additions || 0),
        Number(data.deletions || 0),
        Number(data.changed_files || data.changedFiles || 0),
        new Date(createdAt),
        new Date(updatedAt),
        Boolean(data.merged || false),
        mergedAt ? new Date(mergedAt) : null
      )
    } catch (error) {
      console.error(MODEL_PARSE_ERRORS.PULL_REQUEST, error)
      throw new Error(`${MODEL_PARSE_ERRORS.PULL_REQUEST}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  toJson(): Record<string, any> {
    return {
      id: this.id,
      url: this.url,
      repo: this.repo,
      number: this.number,
      title: this.title,
      author: this.author,
      state: this.state,
      base_branch: this.baseRef,
      head_branch: this.headRef,
      head_sha: this.headSha,
      body: this.body,
      additions: this.additions,
      deletions: this.deletions,
      changed_files: this.changedFiles,
      created_at: this.createdAt.toISOString(),
      updated_at: this.updatedAt.toISOString(),
      merged: this.merged,
      merged_at: this.mergedAt?.toISOString() || null
    }
  }

  get isOpen(): boolean {
    return this.state === 'open' && !this.merged
  }

  get isClosed(): boolean {
    return this.state === 'closed' && !this.merged
  }

  get isMerged(): boolean {
    return this.state === 'merged' || this.merged
  }

  get changesSummary(): string {
    return `+${this.additions} -${this.deletions} (${this.changedFiles} files)`
  }

  get shortSha(): string {
    return this.headSha.substring(0, 7)
  }

  hasChanges(): boolean {
    return this.additions > 0 || this.deletions > 0
  }

  isLargeChange(): boolean {
    return this.additions + this.deletions > 500
  }
}
