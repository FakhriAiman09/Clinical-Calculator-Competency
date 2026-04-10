type OpenApiDocument = {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
  };
  servers: Array<{
    url: string;
    description: string;
  }>;
  tags: Array<{
    name: string;
    description: string;
  }>;
  components: {
    securitySchemes: Record<string, unknown>;
    schemas: Record<string, unknown>;
  };
  paths: Record<string, unknown>;
};

const summaryErrorSchema = {
  type: 'object',
  required: ['error', 'message'],
  properties: {
    error: { type: 'string', examples: ['missing_text'] },
    message: { type: 'string', examples: ['Missing text'] },
  },
};

const genericErrorSchema = {
  type: 'object',
  required: ['error'],
  properties: {
    error: { type: 'string' },
    detail: { type: 'string' },
  },
};

export function getOpenApiDocument(baseUrl?: string): OpenApiDocument {
  const serverUrl = baseUrl || 'http://localhost:3000';

  return {
    openapi: '3.1.0',
    info: {
      title: 'Clinical Competency Calculator API',
      version: '1.0.0',
      description:
        'OpenAPI documentation for the Clinical Competency Calculator Next.js server routes.',
    },
    servers: [
      {
        url: serverUrl,
        description: 'Current application origin',
      },
    ],
    tags: [
      {
        name: 'AI',
        description: 'Endpoints for AI-assisted summarization.',
      },
      {
        name: 'Reports',
        description: 'Endpoints for report export and generation.',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'token',
          description: 'Bearer token authentication scheme.',
        },
      },
      schemas: {
        SummaryRequest: {
          type: 'object',
          required: ['text'],
          example: {
            text: 'Student communicated clearly, organized the history well, and adjusted the plan after new findings emerged.',
            model: 'z-ai/glm-4.5-air:free',
          },
          properties: {
            text: {
              type: 'string',
              description: 'Clinical rater comments to summarize.',
            },
            model: {
              type: 'string',
              description: 'Optional OpenRouter model identifier from the allowed free-model list.',
              examples: ['z-ai/glm-4.5-air:free'],
            },
          },
        },
        SummaryResponse: {
          type: 'object',
          required: ['summary'],
          example: {
            summary:
              'The learner communicated clearly and gathered a well-organized history. They also adapted clinical reasoning appropriately as new information appeared.',
          },
          properties: {
            summary: {
              type: 'string',
              description: 'A 2-4 sentence plain-text summary.',
            },
          },
        },
        SummaryError: summaryErrorSchema,
        CsvError: genericErrorSchema,
      },
    },
    paths: {
      '/api/ai/summary': {
        post: {
          tags: ['AI'],
          summary: 'Generate a concise AI summary for rater comments',
          description: 'Submits rater comments to the configured OpenRouter model and returns a concise plain-text summary.',
          operationId: 'generateAiSummary',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SummaryRequest' },
                example: {
                  text: 'Student communicated clearly and showed strong clinical reasoning.',
                  model: 'z-ai/glm-4.5-air:free',
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Summary generated successfully.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SummaryResponse' },
                  example: {
                    summary:
                      'The student communicated clearly and demonstrated strong clinical reasoning in the encounter.',
                  },
                },
              },
            },
            '400': {
              description: 'The request body is missing text.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SummaryError' },
                },
              },
            },
            '429': {
              description: 'The upstream AI provider rate-limited the request.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SummaryError' },
                },
              },
            },
            '500': {
              description: 'Server-side or configuration error.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SummaryError' },
                },
              },
            },
          },
        },
      },
      '/api/generate-csv': {
        get: {
          tags: ['Reports'],
          summary: 'Export a student competency report as CSV',
          description: 'Builds a CSV file for a specific student report and streams it back as a downloadable response.',
          operationId: 'generateCsvReport',
          parameters: [
            {
              in: 'query',
              name: 'studentId',
              required: true,
              schema: { type: 'string' },
              description: 'Supabase user ID for the student.',
            },
            {
              in: 'query',
              name: 'reportId',
              required: true,
              schema: { type: 'string' },
              description: 'Primary key of the student report to export.',
            },
          ],
          responses: {
            '200': {
              description: 'CSV content returned as a downloadable file.',
              content: {
                'text/csv': {
                  schema: {
                    type: 'string',
                    format: 'binary',
                  },
                },
              },
            },
            '400': {
              description: 'Missing required query parameters.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/CsvError' },
                },
              },
            },
            '404': {
              description: 'Report not found.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/CsvError' },
                },
              },
            },
            '500': {
              description: 'Unexpected export error.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/CsvError' },
                },
              },
            },
          },
        },
      },
    },
  };
}
