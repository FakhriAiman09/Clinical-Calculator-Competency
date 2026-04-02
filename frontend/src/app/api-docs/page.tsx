import Link from 'next/link';
import Script from 'next/script';

const endpoints = [
  {
    method: 'POST',
    path: '/api/ai/summary',
    purpose: 'Summarize clinical rater comments with OpenRouter.',
  },
  {
    method: 'GET',
    path: '/api/generate-csv',
    purpose: 'Export a student report as CSV.',
  },
  {
    method: 'GET, POST',
    path: '/api/rater-email-api/reminders',
    purpose: 'Run overdue reminder processing for raters.',
  },
];

/**
 * Render an interactive Swagger UI page for the documented frontend routes.
 *
 * @returns A page that links to the raw OpenAPI JSON and mounts Swagger UI so
 * users can inspect and test endpoints in the browser.
 */
export default function ApiDocsPage() {
  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
      <Script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js" strategy="afterInteractive" />
      <Script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js" strategy="afterInteractive" />
      <Script
        id="swagger-ui-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.addEventListener('load', function () {
              if (!window.SwaggerUIBundle) return;
              window.SwaggerUIBundle({
                url: '/api/openapi',
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [window.SwaggerUIBundle.presets.apis, window.SwaggerUIStandalonePreset],
                layout: 'StandaloneLayout',
                tryItOutEnabled: true
              });
            });
          `,
        }}
      />

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1rem 4rem', lineHeight: 1.6 }}>
        <h1>API Documentation</h1>
        <p>
          This page exposes the frontend API as an interactive Swagger UI backed by the OpenAPI 3.1
          document at <Link href="/api/openapi">/api/openapi</Link>.
        </p>
        <p>
          You can inspect schemas here, try requests directly in the browser, or import the raw
          JSON into Postman or Swagger Editor.
        </p>

        <h2>Available Endpoints</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc', padding: '0.5rem 0' }}>
                Method
              </th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc', padding: '0.5rem 0' }}>
                Path
              </th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc', padding: '0.5rem 0' }}>
                Purpose
              </th>
            </tr>
          </thead>
          <tbody>
            {endpoints.map((endpoint) => (
              <tr key={`${endpoint.method}-${endpoint.path}`}>
                <td style={{ padding: '0.75rem 0', verticalAlign: 'top' }}>
                  <code>{endpoint.method}</code>
                </td>
                <td style={{ padding: '0.75rem 0', verticalAlign: 'top' }}>
                  <code>{endpoint.path}</code>
                </td>
                <td style={{ padding: '0.75rem 0', verticalAlign: 'top' }}>{endpoint.purpose}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div
          id="swagger-ui"
          style={{
            border: '1px solid #d9d9d9',
            borderRadius: '12px',
            overflow: 'hidden',
            background: '#fff',
          }}
        />
      </main>
    </>
  );
}
