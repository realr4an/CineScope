export interface FeedbackEntry {
  id: string;
  userId: string | null;
  email: string | null;
  displayName: string | null;
  category: string;
  message: string;
  pagePath: string | null;
  moderationSummary: string | null;
  createdAt: string;
}
