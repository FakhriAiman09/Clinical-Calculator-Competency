export type EPAKFDesc = {
  epa_desc: { [key: string]: string };
  kf_desc: { [key: string]: string };
};

export type MCQ = {
  epa: string;
  kf: string;
  opt_count: number;
  options: { [key: string]: string };
  question: string;
};

export type DevLevel = 'none' | 'remedial' | 'early-developing' | 'developing' | 'entrustable';

export type changeHistoryInstance = {
  updated_at: Date;
  updated_by: string;
  updater_display_name?: string | null;
  updater_email?: string | null;
  text: string;
};
