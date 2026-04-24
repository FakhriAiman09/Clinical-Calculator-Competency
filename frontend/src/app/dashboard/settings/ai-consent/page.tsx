import Link from 'next/link';

export default function AIConsentPage() {
  return (
    <div className="container py-5" style={{ maxWidth: 880 }}>
      <div className="mb-4">
        <Link href="/dashboard/settings" className="link-primary text-decoration-none">
          <i className="bi bi-arrow-left me-2" />
          Back to settings
        </Link>
      </div>

      <header className="mb-4">
        <h1 className="fw-bold mb-2">AI Terms and Consent</h1>
        <p className="text-muted mb-0">
          This page explains how AI summarization is used in the Clinical Competency Calculator and what users
          acknowledge when enabling or using these features.
        </p>
      </header>

      <div className="card shadow-sm mb-4">
        <div className="card-body p-4">
          <h2 className="h5 fw-semibold mb-3">What the AI feature does</h2>
          <p className="text-muted mb-0">
            The AI summarizer creates draft feedback based on structured assessment results. It is intended to
            support educators and raters, not replace academic judgment or institutional review.
          </p>
        </div>
      </div>

      <div className="card shadow-sm mb-4">
        <div className="card-body p-4">
          <h2 className="h5 fw-semibold mb-3">Data handling and privacy</h2>
          <ul className="text-muted mb-0 ps-3">
            <li>AI-generated content may be based on structured student assessment data.</li>
            <li>Users should avoid entering unnecessary personal or sensitive information into AI-assisted workflows.</li>
            <li>All use of student data should follow institutional policy, privacy requirements, and applicable regulations.</li>
          </ul>
        </div>
      </div>

      <div className="card shadow-sm mb-4">
        <div className="card-body p-4">
          <h2 className="h5 fw-semibold mb-3">User consent and responsibilities</h2>
          <ul className="text-muted mb-0 ps-3">
            <li>By using the AI summarizer, you acknowledge that AI output is advisory and must be reviewed by a human.</li>
            <li>You agree not to rely on AI-generated summaries as the sole basis for evaluation decisions.</li>
            <li>You are responsible for confirming that generated text is accurate, appropriate, and professionally suitable.</li>
          </ul>
        </div>
      </div>

      <div className="alert alert-warning mb-0" role="alert">
        <strong>Important:</strong> AI summaries may contain errors or incomplete interpretations. Final assessment
        decisions must remain under human supervision.
      </div>
    </div>
  );
}
