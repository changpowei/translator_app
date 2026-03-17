export interface Vocabulary {
  readonly id: string;
  readonly user_id: string;
  readonly word: string;
  readonly translation: string;
  readonly query_count: number;
  readonly familiarity_score: number;
  readonly quiz_correct_count: number;
  readonly last_queried: string;
  readonly created_at: string;
}
