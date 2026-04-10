// ─────────────────────────────────────────────────────────────────────────────
// Demo sample data — no Supabase, no API calls.
// All interactions in the demo operate on copies of these objects in React state.
// ─────────────────────────────────────────────────────────────────────────────

export interface Student {
  id: string;
  display_name: string;
}

export interface StudentReport {
  id: string;
  user_id: string;
  title: string;
  time_window: string;   // e.g. '3' | '6' | '12'
  kf_avg_data: Record<string, number>;
  llm_feedback: string;  // JSON string keyed by KF id
  created_at: string;
}

export interface FormResult {
  response_id: string;
  created_at: string;
  results: Record<string, number>;
  rater_name: string;
  rater_email: string;
}

export interface DemoUser {
  id: string;
  user_id: string;
  email: string;
  role: string;
  display_name: string;
  account_status: 'Active' | 'Deactivated';
}

export interface SystemStats {
  totalSubmittedForms: number;
  activeFormRequests: number;
  delinquentFormRequests: number;
  averageTurnaroundDays: number;
  topDelinquentRaters: { rater_id: string; display_name: string; email: string; count: number }[];
  monthlySubmissionTrends: { month: string; count: number }[];
  monthlyEPADistribution: Record<string, { month: string; count: number }[]>;
}

// ── KF descriptions ───────────────────────────────────────────────────────────
export const KF_DESCRIPTIONS: Record<number, string[]> = {
  1: [
    'Obtain a complete and accurate history in an organized fashion',
    'Demonstrate patient-centered interview skills',
    'Demonstrate clinical reasoning in gathering focused information relevant to a patient\'s care',
    'Perform a clinically relevant, appropriately thorough physical exam pertinent to the setting and purpose of the patient visit',
  ],
  3: [
    'Recognize the urgency of a clinical situation and appropriately triage',
    'Apply basic science to clinical presentations',
    'Generate and prioritize a differential diagnosis',
  ],
  4: [
    'Compose orders efficiently and effectively verbally, on paper, and electronically',
    'Demonstrate an understanding of the patient\'s condition that underpins the provided orders',
    'Recognize and avoid errors by attending to patient-specific factors, using resources, and appropriately responding to safety alerts',
    'Discuss planned orders and prescriptions with team, patients, and families',
  ],
  8: [
    'Deliver an accurate, concise, and organized oral presentation of a patient',
    'Document a comprehensive and relevant patient encounter',
    'Maintain up-to-date and accurate patient records',
    'Recognize and respond to discordant information in medical records',
    'Handoff patient care to another team member using a standardized framework',
  ],
};

export const EPA_TITLES: Record<number, string> = {
  1: 'Gather a History and Perform a Physical Examination',
  3: 'Recommend and Interpret Diagnostic and Screening Tests',
  4: 'Enter and Discuss Orders and Prescriptions',
  8: 'Give or Receive a Patient Handover to Transition Care Responsibility',
};

// ── Students ──────────────────────────────────────────────────────────────────
export const DEMO_STUDENTS: Student[] = [
  { id: 'demo-s1', display_name: 'Alex Johnson' },
  { id: 'demo-s2', display_name: 'Maria Chen' },
  { id: 'demo-s3', display_name: 'James Williams' },
];

// ── AI Feedback (realistic Gemini-style markdown per KF) ─────────────────────
const ALEX_FEEDBACK_REPORT1 = JSON.stringify({
  '1.1': '**History Taking:** Alex demonstrates early-developing competency in gathering patient histories. He collects relevant information but occasionally misses pertinent social history details. **Recommendation:** Practice structured history frameworks (OLDCARTS) consistently and focus on eliciting psychosocial factors.',
  '1.2': '**Patient-Centered Communication:** Alex shows satisfactory rapport-building skills. He listens actively and uses open-ended questions. Areas for growth include explaining medical information at an appropriate literacy level.',
  '1.3': '**Clinical Reasoning:** Alex is developing his ability to synthesize history findings into clinical reasoning. He identifies key symptoms but occasionally anchors on the first diagnosis. Encourage him to deliberately expand the differential.',
  '1.4': '**Physical Examination:** Alex performs organized physical exams but sometimes omits key components under time pressure. Focus on building a consistent exam sequence.',
  '3.1': '**Triage Recognition:** Alex reliably identifies urgency in acute presentations and escalates appropriately. A strength.',
  '3.2': '**Basic Science Application:** Alex consistently connects pathophysiology to clinical findings — a clear strength.',
  '3.3': '**Differential Diagnosis:** Alex generates reasonable differentials but could improve prioritization based on pre-test probability.',
  '4.1': '**Order Entry:** Alex enters orders accurately and efficiently. Minor issues with electronic order sets — recommend additional EHR training.',
  '4.2': '**Order Rationale:** Demonstrates strong understanding of the clinical rationale behind orders. Regularly explains reasoning to the team.',
  '4.3': '**Safety Checks:** Alex appropriately consults resources for drug interactions and allergy checking. Consistent performance.',
  '4.4': '**Order Discussion:** Alex proactively discusses orders with patients and families. Continue this collaborative approach.',
  '8.1': '**Oral Presentation:** Alex\'s oral presentations are improving but still tend to be lengthy. Work on concise SBAR-style delivery.',
  '8.2': '**Documentation:** Documentation is thorough but sometimes delayed. Timeliness should be a priority.',
  '8.3': '**Record Accuracy:** Records are generally accurate. Minor discrepancies noted in medication lists.',
  '8.4': '**Discordant Information:** Alex is developing awareness of discordant records. Encourage proactive reconciliation.',
  '8.5': '**Handoffs:** Handoffs are structured but occasionally incomplete. Use I-PASS consistently.',
});

const MARIA_FEEDBACK_REPORT1 = JSON.stringify({
  '1.1': '**History Taking:** Maria excels at thorough, organized history taking. She consistently captures relevant history across domains and demonstrates excellent patient rapport.',
  '1.2': '**Patient-Centered Care:** Maria is highly skilled at patient-centered communication. She tailors her language to patient literacy and regularly elicits patient preferences.',
  '1.3': '**Clinical Reasoning:** Maria demonstrates strong clinical reasoning and constructs comprehensive differentials with appropriate prioritization.',
  '1.4': '**Physical Exam:** Maria\'s physical exam technique is near-entrustable. She performs systematic exams and identifies subtle findings.',
  '3.1': '**Triage:** Maria consistently recognizes clinical urgency and mobilizes appropriate resources swiftly.',
  '3.2': '**Basic Science:** Strong pathophysiology integration into clinical assessment.',
  '3.3': '**Differential:** Maria generates comprehensive and well-prioritized differentials. A consistent strength.',
  '4.1': '**Orders:** Maria composes orders accurately and discusses them proactively with supervising physicians.',
  '4.2': '**Rationale:** Excellent understanding of the clinical rationale underpinning her orders.',
  '4.3': '**Safety:** Maria demonstrates exemplary medication safety practices, routinely flagging potential interactions.',
  '4.4': '**Communication:** Maria consistently communicates planned interventions with patients and the care team.',
  '8.1': '**Oral Presentation:** Concise, accurate, and well-structured presentations. A clear strength.',
  '8.2': '**Documentation:** Timely and comprehensive documentation.',
  '8.3': '**Records:** Maintains accurate and up-to-date records.',
  '8.4': '**Discordance:** Proactively identifies and reconciles discordant information.',
  '8.5': '**Handoffs:** Consistently uses structured handoff frameworks. Exemplary.',
});

const JAMES_FEEDBACK_REPORT1 = JSON.stringify({
  '1.1': '**History Taking:** James is in the early stages of developing structured history-taking skills. He gathers basic information but frequently requires prompting to explore beyond the chief complaint.',
  '1.2': '**Patient Communication:** James is building rapport skills. He should focus on using more open-ended questions and reducing leading questions.',
  '1.3': '**Clinical Reasoning:** James demonstrates foundational reasoning but struggles to synthesize complex multi-system presentations. Focused mentoring recommended.',
  '1.4': '**Physical Exam:** James performs basic exam components but needs to develop consistency and systematic approach.',
  '3.1': '**Triage:** James is developing triage judgment. He recognizes overt emergencies but needs guidance with subtler presentations.',
  '3.2': '**Basic Science:** Demonstrates adequate pathophysiology knowledge for his training level.',
  '3.3': '**Differential:** Generates limited differentials. Encourage use of systematic frameworks.',
  '4.1': '**Orders:** Requires supervision for order entry. Working toward independence.',
  '4.2': '**Rationale:** Beginning to articulate order rationale with prompting.',
  '4.3': '**Safety:** Developing awareness of safety checks. Requires reminders.',
  '4.4': '**Communication:** Improving order discussion with guidance.',
  '8.1': '**Presentation:** Presentations are disorganized. Focus on structured frameworks (SBAR, SOAP).',
  '8.2': '**Documentation:** Documentation is incomplete and often delayed.',
  '8.3': '**Records:** Record accuracy is a work in progress.',
  '8.4': '**Discordance:** Not yet consistently identifying discordant information.',
  '8.5': '**Handoffs:** Handoffs require significant structure from supervisors.',
});

// ── Reports ───────────────────────────────────────────────────────────────────
export const DEMO_REPORTS: Record<string, StudentReport[]> = {
  'demo-s1': [
    {
      id: 'rpt-s1-1',
      user_id: 'demo-s1',
      title: 'Clerkship Mid-Rotation Review',
      time_window: '3',
      kf_avg_data: {
        '1.1': 2.35, '1.2': 1.5, '1.3': 2.03, '1.4': 2.78,
        '3.1': 3.0,  '3.2': 2.62, '3.3': 1.87,
        '4.1': 3.0,  '4.2': 3.75, '4.3': 3.75, '4.4': 1.5,
        '8.1': 1.75, '8.2': 3.75, '8.3': 2.25, '8.4': 3.0, '8.5': 1.5,
      },
      llm_feedback: ALEX_FEEDBACK_REPORT1,
      created_at: '2026-04-01T10:00:00Z',
    },
    {
      id: 'rpt-s1-2',
      user_id: 'demo-s1',
      title: 'Block 2 Assessment',
      time_window: '6',
      kf_avg_data: {
        '1.1': 2.0, '1.2': 1.25, '1.3': 1.75, '1.4': 2.5,
        '3.1': 2.75, '3.2': 2.25, '3.3': 1.5,
        '4.1': 2.75, '4.2': 3.0,  '4.3': 3.25, '4.4': 1.25,
        '8.1': 1.5,  '8.2': 3.25, '8.3': 2.0,  '8.4': 2.75, '8.5': 1.25,
      },
      llm_feedback: ALEX_FEEDBACK_REPORT1,
      created_at: '2026-01-15T09:00:00Z',
    },
  ],
  'demo-s2': [
    {
      id: 'rpt-s2-1',
      user_id: 'demo-s2',
      title: 'Quarterly Review Q1',
      time_window: '3',
      kf_avg_data: {
        '1.1': 3.0,  '1.2': 3.0,  '1.3': 3.0,  '1.4': 2.75,
        '3.1': 3.0,  '3.2': 3.0,  '3.3': 3.0,
        '4.1': 3.0,  '4.2': 3.0,  '4.3': 3.0,  '4.4': 3.0,
        '8.1': 3.0,  '8.2': 3.0,  '8.3': 3.0,  '8.4': 3.0,  '8.5': 3.0,
      },
      llm_feedback: MARIA_FEEDBACK_REPORT1,
      created_at: '2026-03-20T11:00:00Z',
    },
    {
      id: 'rpt-s2-2',
      user_id: 'demo-s2',
      title: 'Annual Performance Review',
      time_window: '12',
      kf_avg_data: {
        '1.1': 2.9, '1.2': 2.8, '1.3': 2.9, '1.4': 2.75,
        '3.1': 3.0, '3.2': 2.9, '3.3': 2.8,
        '4.1': 2.9, '4.2': 3.0, '4.3': 3.0, '4.4': 2.9,
        '8.1': 2.9, '8.2': 3.0, '8.3': 2.9, '8.4': 3.0, '8.5': 2.9,
      },
      llm_feedback: MARIA_FEEDBACK_REPORT1,
      created_at: '2026-02-01T14:00:00Z',
    },
  ],
  'demo-s3': [
    {
      id: 'rpt-s3-1',
      user_id: 'demo-s3',
      title: 'Initial Clerkship Assessment',
      time_window: '3',
      kf_avg_data: {
        '1.1': 1.25, '1.2': 1.0,  '1.3': 1.25, '1.4': 1.0,
        '3.1': 1.5,  '3.2': 1.25, '3.3': 1.0,
        '4.1': 1.0,  '4.2': 1.25, '4.3': 1.0,  '4.4': 1.0,
        '8.1': 1.0,  '8.2': 1.0,  '8.3': 1.25, '8.4': 1.0,  '8.5': 1.0,
      },
      llm_feedback: JAMES_FEEDBACK_REPORT1,
      created_at: '2026-03-10T08:00:00Z',
    },
  ],
};

// ── Form results (for Edit EPA modal) ─────────────────────────────────────────
export const DEMO_FORM_RESULTS: Record<string, FormResult[]> = {
  'demo-s1': [
    {
      response_id: 'resp-s1-a',
      created_at: '2026-03-28T09:15:00Z',
      rater_name: 'Dr. Robert Hayes',
      rater_email: 'rhayes@pennstate.edu',
      results: {
        '1.1': 3, '1.2': 2, '1.3': 2, '1.4': 3,
        '3.1': 3, '3.2': 3, '3.3': 2,
        '4.1': 3, '4.2': 3, '4.3': 3, '4.4': 2,
        '8.1': 2, '8.2': 3, '8.3': 2, '8.4': 3, '8.5': 2,
      },
    },
    {
      response_id: 'resp-s1-b',
      created_at: '2026-03-15T14:30:00Z',
      rater_name: 'Dr. Jennifer Walsh',
      rater_email: 'jwalsh@pennstate.edu',
      results: {
        '1.1': 2, '1.2': 1, '1.3': 2, '1.4': 2,
        '3.1': 3, '3.2': 2, '3.3': 2,
        '4.1': 3, '4.2': 3, '4.3': 3, '4.4': 1,
        '8.1': 1, '8.2': 3, '8.3': 3, '8.4': 3, '8.5': 1,
      },
    },
    {
      response_id: 'resp-s1-c',
      created_at: '2026-02-20T11:00:00Z',
      rater_name: 'Dr. Thomas Lee',
      rater_email: 'tlee@pennstate.edu',
      results: {
        '1.1': 2, '1.2': 2, '1.3': 2, '1.4': 3,
        '3.1': 3, '3.2': 3, '3.3': 2,
        '4.1': 3, '4.2': 3, '4.3': 3, '4.4': 2,
        '8.1': 2, '8.2': 3, '8.3': 2, '8.4': 3, '8.5': 2,
      },
    },
  ],
  'demo-s2': [
    {
      response_id: 'resp-s2-a',
      created_at: '2026-03-18T10:00:00Z',
      rater_name: 'Dr. Sarah Brown',
      rater_email: 'sbrown@pennstate.edu',
      results: {
        '1.1': 3, '1.2': 3, '1.3': 3, '1.4': 3,
        '3.1': 3, '3.2': 3, '3.3': 3,
        '4.1': 3, '4.2': 3, '4.3': 3, '4.4': 3,
        '8.1': 3, '8.2': 3, '8.3': 3, '8.4': 3, '8.5': 3,
      },
    },
    {
      response_id: 'resp-s2-b',
      created_at: '2026-03-05T09:30:00Z',
      rater_name: 'Dr. Robert Hayes',
      rater_email: 'rhayes@pennstate.edu',
      results: {
        '1.1': 3, '1.2': 3, '1.3': 3, '1.4': 2,
        '3.1': 3, '3.2': 3, '3.3': 3,
        '4.1': 3, '4.2': 3, '4.3': 3, '4.4': 3,
        '8.1': 3, '8.2': 3, '8.3': 3, '8.4': 3, '8.5': 3,
      },
    },
  ],
  'demo-s3': [
    {
      response_id: 'resp-s3-a',
      created_at: '2026-03-08T08:45:00Z',
      rater_name: 'Dr. Michael Park',
      rater_email: 'mpark@pennstate.edu',
      results: {
        '1.1': 1, '1.2': 1, '1.3': 1, '1.4': 1,
        '3.1': 2, '3.2': 1, '3.3': 1,
        '4.1': 1, '4.2': 1, '4.3': 1, '4.4': 1,
        '8.1': 1, '8.2': 1, '8.3': 1, '8.4': 1, '8.5': 1,
      },
    },
    {
      response_id: 'resp-s3-b',
      created_at: '2026-03-01T13:00:00Z',
      rater_name: 'Dr. Jennifer Walsh',
      rater_email: 'jwalsh@pennstate.edu',
      results: {
        '1.1': 2, '1.2': 1, '1.3': 2, '1.4': 1,
        '3.1': 1, '3.2': 2, '3.3': 1,
        '4.1': 1, '4.2': 2, '4.3': 1, '4.4': 1,
        '8.1': 1, '8.2': 1, '8.3': 2, '8.4': 1, '8.5': 1,
      },
    },
  ],
};

// ── Comments per form result per EPA ─────────────────────────────────────────
export const DEMO_FORM_COMMENTS: Record<string, Record<number, string[]>> = {
  'resp-s1-a': {
    1: [
      'Alex demonstrates solid history-taking skills and effectively communicates with patients in a structured manner.',
      'Good at asking focused questions relevant to the chief complaint.',
    ],
    3: ['Great work on recognizing urgency in clinical situations.'],
    4: ['Good'],
    8: ['Nice work'],
  },
  'resp-s1-b': {
    1: ['ok', 'Good'],
    3: ['Student shows developing clinical reasoning skills.'],
    4: ['Alex needs to improve order discussions with the care team and patients.'],
    8: [
      'Oral presentations are still lengthy. Good good good good.',
      'Documentation improving but timeliness is an issue.',
    ],
  },
  'resp-s1-c': {
    1: ['Alex is improving in gathering histories in an organized manner.'],
    3: ['Good'],
    4: ['Good'],
    8: ['Good'],
  },
  'resp-s2-a': {
    1: [
      'Maria consistently demonstrates exemplary patient-centered history-taking. She elicits psychosocial factors seamlessly.',
      'Outstanding clinical reasoning and physical exam skills. Clear strength.',
    ],
    3: ['Maria rapidly recognizes clinical urgency and responds appropriately. Highly commendable.'],
    4: ['Order management is accurate and proactively discussed with patients and the team.'],
    8: ['Oral presentations are consistently concise and well-structured. Handoffs are excellent.'],
  },
  'resp-s2-b': {
    1: ['Maria demonstrates near-entrustable history-taking. Minor gaps in occupational history.'],
    3: ['Differential diagnosis generation is a clear strength.'],
    4: ['Excellent safety awareness with medication orders.'],
    8: ['Documentation is thorough and timely.'],
  },
  'resp-s3-a': {
    1: ['ok', 'Good', 'Nice'],
    3: ['ok'],
    4: ['Good'],
    8: ['Good'],
  },
  'resp-s3-b': {
    1: ['James is beginning to structure his history-taking. Requires significant prompting.', 'Good'],
    3: ['Developing triage judgment with supervision.'],
    4: ['ok'],
    8: ['Handoffs require structured guidance from supervisors.'],
  },
};

// ── System stats ──────────────────────────────────────────────────────────────
const months = ['2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04'];
const trendCounts = [18, 22, 31, 28, 35, 8];

const epaDistribution: Record<string, { month: string; count: number }[]> = {};
const epaCounts: Record<number, number[]> = {
  1: [5, 6, 9, 8, 10, 3],
  2: [3, 4, 5, 4, 6, 1],
  3: [2, 3, 4, 3, 5, 1],
  4: [2, 3, 4, 4, 4, 1],
  5: [1, 2, 2, 2, 3, 0],
  6: [1, 1, 2, 2, 2, 1],
  7: [1, 1, 1, 1, 2, 0],
  8: [1, 1, 2, 2, 2, 1],
  9: [0, 1, 1, 1, 1, 0],
  10: [1, 0, 1, 1, 1, 0],
  11: [0, 0, 1, 0, 1, 0],
  12: [0, 0, 0, 0, 0, 0],
  13: [1, 0, 0, 0, 1, 0],
};
for (let epa = 1; epa <= 13; epa++) {
  epaDistribution[String(epa)] = months.map((m, i) => ({ month: m, count: epaCounts[epa][i] }));
}

export const DEMO_SYSTEM_STATS: SystemStats = {
  totalSubmittedForms: 142,
  activeFormRequests: 8,
  delinquentFormRequests: 3,
  averageTurnaroundDays: 4.2,
  topDelinquentRaters: [
    { rater_id: 'r1', display_name: 'Dr. Robert Hayes', email: 'rhayes@pennstate.edu', count: 4 },
    { rater_id: 'r2', display_name: 'Dr. Jennifer Walsh', email: 'jwalsh@pennstate.edu', count: 3 },
    { rater_id: 'r3', display_name: 'Dr. Michael Park', email: 'mpark@pennstate.edu', count: 2 },
  ],
  monthlySubmissionTrends: months.map((m, i) => ({ month: m, count: trendCounts[i] })),
  monthlyEPADistribution: epaDistribution,
};

// ── Users ─────────────────────────────────────────────────────────────────────
export const DEMO_USERS: DemoUser[] = [
  { id: 'u1', user_id: 'u1', email: 'admin@pennstate.edu', role: 'admin', display_name: 'System Admin', account_status: 'Active' },
  { id: 'u2', user_id: 'u2', email: 'ajohnson@pennstate.edu', role: 'student', display_name: 'Alex Johnson', account_status: 'Active' },
  { id: 'u3', user_id: 'u3', email: 'mchen@pennstate.edu', role: 'student', display_name: 'Maria Chen', account_status: 'Active' },
  { id: 'u4', user_id: 'u4', email: 'jwilliams@pennstate.edu', role: 'student', display_name: 'James Williams', account_status: 'Active' },
  { id: 'u5', user_id: 'u5', email: 'rhayes@pennstate.edu', role: 'rater', display_name: 'Dr. Robert Hayes', account_status: 'Active' },
  { id: 'u6', user_id: 'u6', email: 'jwalsh@pennstate.edu', role: 'rater', display_name: 'Dr. Jennifer Walsh', account_status: 'Active' },
  { id: 'u7', user_id: 'u7', email: 'mpark@pennstate.edu', role: 'rater', display_name: 'Dr. Michael Park', account_status: 'Active' },
  { id: 'u8', user_id: 'u8', email: 'tlee@pennstate.edu', role: 'rater', display_name: 'Dr. Thomas Lee', account_status: 'Active' },
  { id: 'u9', user_id: 'u9', email: 'sbrown@pennstate.edu', role: 'rater', display_name: 'Dr. Sarah Brown', account_status: 'Deactivated' },
  { id: 'u10', user_id: 'u10', email: 'devuser@pennstate.edu', role: 'dev', display_name: 'Dev User', account_status: 'Active' },
];

export const DEMO_ROLES = ['admin', 'student', 'rater', 'dev'];

// ── Helpers ───────────────────────────────────────────────────────────────────
export const DEV_LEVEL_LABELS = ['Remedial', 'Early-Developing', 'Developing', 'Entrustable'];
export const DEV_LEVEL_COLORS = ['#ea3636', '#ffb800', '#90ee90', '#3ead16'];

export function computeEPAAverage(kfAvgData: Record<string, number>, epaId: number): number | null {
  const keys = Object.keys(kfAvgData).filter((k) => k.startsWith(`${epaId}.`));
  if (keys.length === 0) return null;
  const avg = keys.reduce((sum, k) => sum + kfAvgData[k], 0) / keys.length;
  const floored = Math.floor(avg);
  const allEntrustable = keys.every((k) => Math.floor(kfAvgData[k]) === 3);
  if (allEntrustable) return 3;
  if (floored === 3) return 2;
  return floored;
}
