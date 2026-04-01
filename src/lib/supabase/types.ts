export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          display_name: string | null;
          avatar_url: string | null;
          birth_date: string | null;
          is_admin: boolean;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          birth_date?: string | null;
          is_admin?: boolean;
        };
        Update: {
          display_name?: string | null;
          avatar_url?: string | null;
          birth_date?: string | null;
          is_admin?: boolean;
        };
        Relationships: [];
      };
      user_preferences: {
        Row: {
          id: string;
          user_id: string;
          favorite_genres: string[] | null;
          preferred_media_types: string[] | null;
          preferred_region: string | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          favorite_genres?: string[] | null;
          preferred_media_types?: string[] | null;
          preferred_region?: string | null;
        };
        Update: {
          favorite_genres?: string[] | null;
          preferred_media_types?: string[] | null;
          preferred_region?: string | null;
        };
        Relationships: [];
      };
      watchlist_items: {
        Row: {
          id: string;
          user_id: string;
          tmdb_id: number;
          media_type: "movie" | "tv";
          title: string;
          poster_path: string | null;
          backdrop_path: string | null;
          release_date: string | null;
          vote_average: number | null;
          watched: boolean;
          liked: boolean | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          tmdb_id: number;
          media_type: "movie" | "tv";
          title: string;
          poster_path?: string | null;
          backdrop_path?: string | null;
          release_date?: string | null;
          vote_average?: number | null;
          watched?: boolean;
          liked?: boolean | null;
        };
        Update: {
          title?: string;
          poster_path?: string | null;
          backdrop_path?: string | null;
          release_date?: string | null;
          vote_average?: number | null;
          watched?: boolean;
          liked?: boolean | null;
        };
        Relationships: [];
      };
      feedback_entries: {
        Row: {
          id: string;
          user_id: string | null;
          email: string | null;
          display_name: string | null;
          category: string;
          message: string;
          page_path: string | null;
          moderation_summary: string | null;
          created_at: string;
        };
        Insert: {
          user_id?: string | null;
          email?: string | null;
          display_name?: string | null;
          category: string;
          message: string;
          page_path?: string | null;
          moderation_summary?: string | null;
        };
        Update: {
          email?: string | null;
          display_name?: string | null;
          category?: string;
          message?: string;
          page_path?: string | null;
          moderation_summary?: string | null;
        };
        Relationships: [];
      };
    };
  };
}
