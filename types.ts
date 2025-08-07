
export type Question = {
  type: 'multiple-choice' | 'extraction' | 'fill-in-the-blank';
  q: string;
  options?: string[];
  a: string | string[];
};

export interface Excerpt {
  id: number;
  subtitle: string;
  text: string;
  notes: Record<string, string>;
  questions: Question[];
}

export interface Work {
  id: string;
  author: string;
  title: string;
  description:string;
  excerpts: Excerpt[];
}

export type UserAnswer = string | string[];

export interface AnswerData {
  answers: { [questionIndex: string]: UserAnswer };
  studyTime: number; // in seconds
  timestamp: number; // Date.now()
}

export interface UserAnswers {
  [workId: string]: {
    [excerptId: string]: AnswerData[];
  };
}