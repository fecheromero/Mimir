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
    public readonly updatedAt: Date
  ) {}

  static fromJson(data: any): PullRequest {
    return new PullRequest(
      data.id,
      data.url,
      data.repo,
      data.number,
      data.title,
      data.author,
      data.state,
      data.base_branch || data.baseRef,
      data.head_branch || data.headRef,
      data.head_sha || data.headSha || '',
      data.body || '',
      data.additions || 0,
      data.deletions || 0,
      data.changed_files || data.changedFiles || 0,
      new Date(data.created_at || data.createdAt),
      new Date(data.updated_at || data.updatedAt)
    )
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
      updated_at: this.updatedAt.toISOString()
    }
  }

  get isOpen(): boolean {
    return this.state === 'open'
  }

  get isClosed(): boolean {
    return this.state === 'closed'
  }

  get isMerged(): boolean {
    return this.state === 'merged'
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
