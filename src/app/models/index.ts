export interface User {
  id: string;
  name?: string;
  email?: string;
}

export interface Subject {
  id: string;
  name: string;
}

export interface Topic {
  id: string;
  name: string;
  subject_id: string;
}

export interface SubTopic {
  id: string;
  name: string;
  topic_id: string;
}

export interface Test {
  id: string;
  name: string;
  type?: string;
  subject: string;
  topics: string[];
  sub_topics?: string[];
  correct_marks?: number;
  wrong_marks?: number;
  unattempt_marks?: number;
  difficulty?: string;
  total_time?: number;
  total_marks?: number;
  total_questions?: number;
  status: 'draft' | 'live' | 'unpublished' | null;
  created_at?: string;
  updated_at?: string;
  questions?: string[];
}

export interface Question {
  id?: string;
  type: 'mcq';
  question: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  correct_option: 'option1' | 'option2' | 'option3' | 'option4';
  explanation?: string;
  difficulty?: string;
  topic_id?: string;
  sub_topic_id?: string;
  media_url?: string;
  test_id?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}
