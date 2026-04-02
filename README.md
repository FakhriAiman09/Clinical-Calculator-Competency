<a id="readme-top"></a>

# Clinical Competency Calculator

![CCC Logo](doc/images/github_banner.jpg)

## About The Project

The Clinical Competency Calculator (CCC) is a grading and assessment tool used to evaluate the competencies of students undergoing clinical clerkship at Penn State College of Medicine (Hershey Medical Center).

The CCC replaces and improves upon the legacy method of collecting rater feedback by:
- Aggregating more useful, structured feedback from multiple raters
- Providing insightful performance analysis powered by ML/AI
- Filtering low-quality feedback automatically
- Generating AI-written narrative summaries for each student report

Students, raters, and administrators can access the system from any device with a modern web browser (smartphones, tablets, laptops, desktops).

---

## Architecture Overview

```
Clinical-Calculator-Competency/
├── frontend/           # Next.js 16 web application (React 19, TypeScript)
├── server/             # WebSocket server (Socket.IO) and data format specs
├── python/
│   ├── bert/           # BERT model training pipeline
│   ├── svm/            # SVM model training pipeline
│   └── infer/          # Real-time inference engine & Supabase listener
├── mcq-sample-collect/ # Tool for collecting MCQ training data
├── supabase/           # Database migrations and configuration
├── sphinx/             # Sphinx documentation generator
├── testing/            # Shared test infrastructure
└── doc/                # Project documentation and images
```

### Assessment Pipeline

1. **Rater submits feedback** — structured form with open-text and multiple-choice responses
2. **Supabase Realtime triggers** the Python inference listener on new submissions
3. **Dual classification:**
   - BERT (25%) — classifies free-text open-ended responses
   - SVM (75%) — classifies multiple-choice responses
4. **Weighted average score** is stored in `form_results`
5. **Google Gemini** generates a markdown-formatted narrative summary per student report

### User Roles

| Role | Capabilities |
|------|-------------|
| **Student** | View personal performance reports and AI-generated feedback |
| **Rater** | Submit structured feedback forms |
| **Administrator** | Manage users, filter feedback quality, edit questions, generate/export reports |

---

## Built With

[![Next.js][Next.js-badge]][Next.js-url]
[![Bootstrap][Bootstrap-badge]][Bootstrap-url]
[![TypeScript][Typescript-badge]][Typescript-url]
[![Python][Python-badge]][Python-url]
[![Vercel][Vercel-badge]][Vercel-url]
[![Node.js][Node.js-badge]][Node.js-url]
[![Supabase][Supabase-badge]][Supabase-url]

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.12+
- A Supabase project with the required tables and storage buckets
- Google Gemini API key
- OpenRouter API key

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # fill in your Supabase and API keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Python Inference Listener

```bash
cd python/infer
python -m venv .venv
source .venv/bin/activate           # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                # fill in your Supabase and Gemini keys
python listener.py
```

If you are installing dependencies on a platform-specific environment, use the matching file:

- Default/Windows: `requirements.txt`
- Ubuntu/Linux: `requirements.ubuntu.txt`
- macOS: `requirements.mac.txt`

See [python/infer/README.md](python/infer/README.md) for full setup details.

### Docker (full stack)

```bash
docker compose up --build
```

Compose files are available for the frontend (`frontend/compose.yaml`) and inference engine.

---

## Environment Variables

### Frontend (`frontend/.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `GEMINI_API_KEY` | Google Gemini API key for AI summaries |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | Email (Nodemailer) config |

### Python (`python/infer/.env`)

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_KEY` | Supabase service role key |
| `GEMINI_API_KEY` | Google Gemini API key |

---

## Documentation Deliverables

This repository includes the required submission documentation in three forms:

- Code comments and docstrings using JSDoc/TSDoc for TypeScript and PyDoc-style docstrings for Python
- Updated README files for the root project and major submodules
- OpenAPI-based API documentation for the current frontend server routes

Documentation entry points:

- Root project overview: `README.md`
- Frontend module guide: `frontend/README.md`
- Inference engine guide: `python/infer/README.md`
- API docs landing page: `frontend/src/app/api-docs/page.tsx`
- OpenAPI JSON route: `frontend/src/app/api/openapi/route.ts`
- Submission report: `doc/documentation-report.md`

---

## Viewing API Documentation

Run the frontend locally:

```bash
cd frontend
npm install
npm run dev
```

Then open:

- Interactive Swagger UI: `http://localhost:3000/api-docs`
- Raw OpenAPI JSON: `http://localhost:3000/api/openapi`

The Swagger UI page supports in-browser inspection and test submission for the documented endpoints.

---

## Testing

```bash
# Frontend unit tests
cd frontend && npm test

# Python tests
cd python/bert && pytest
cd python/infer && pytest
```

CI runs tests automatically on every push via GitHub Actions.

---

## CI/CD

GitHub Actions workflows in `.github/workflows/`:

| Workflow | Purpose |
|----------|---------|
| `test-suite.yml` | Run Jest and pytest test suites |
| `pylint.yml` | Python code quality checks |
| `build.yml` | SonarCloud static analysis |
| `codeql.yml` | Security vulnerability scanning |
| `sphinx.yml` | Build Sphinx documentation |
| `auto-release.yml` | Automated version releases |
| `*-docker.yml` | Build and push Docker images |

---

## Sub-module Documentation

- [frontend/README.md](frontend/README.md) — Next.js app setup and structure
- [server/README.md](server/README.md) — WebSocket server details
- [python/bert/README.md](python/bert/README.md) — BERT model training
- [python/svm/README.md](python/svm/README.md) — SVM model training
- [python/infer/README.md](python/infer/README.md) — Real-time inference engine
- [mcq-sample-collect/README.md](mcq-sample-collect/README.md) — MCQ training data collection

---

<!-- BADGE LINKS -->

[Next.js-badge]: https://img.shields.io/badge/next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white
[Next.js-url]: https://nextjs.org/
[Bootstrap-badge]: https://img.shields.io/badge/Bootstrap-702cf5?style=for-the-badge&logo=bootstrap&logoColor=white
[Bootstrap-url]: https://getbootstrap.com
[Typescript-badge]: https://img.shields.io/badge/TypeScript-3178c6?style=for-the-badge&logo=typescript&logoColor=white
[Typescript-url]: https://www.typescriptlang.org
[Python-badge]: https://img.shields.io/badge/Python-244d70?style=for-the-badge&logo=python&logoColor=white
[Python-url]: https://www.python.org/
[Vercel-badge]: https://img.shields.io/badge/vercel-000000?style=for-the-badge&logo=vercel&logoColor=white
[Vercel-url]: https://vercel.com/
[Node.js-badge]: https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white
[Node.js-url]: https://nodejs.org/
[Supabase-badge]: https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white
[Supabase-url]: https://supabase.io/
[AWS-Lightsail-badge]: https://img.shields.io/badge/AWS%20Lightsail-f59e0b?style=for-the-badge&logo=amazonwebservices&logoColor=white
[AWS-Lightsail-url]: https://aws.amazon.com/lightsail/
