/* eslint-disable @typescript-eslint/no-explicit-any */
const userSchema = {
  type: 'object',
  required: [
    'id',
    'email',
    'displayName',
    'avatarUrl',
    'coupleId',
    'createdAt',
    'updatedAt',
  ],
  properties: {
    id: { type: 'string', format: 'uuid' },
    email: { type: 'string', format: 'email' },
    displayName: { type: 'string' },
    avatarUrl: { type: ['string', 'null'] },
    coupleId: { type: ['string', 'null'], format: 'uuid' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const coupleSchema = {
  type: 'object',
  required: ['id', 'name', 'createdAt', 'updatedAt'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const invitationSchema = {
  type: 'object',
  required: [
    'id',
    'coupleId',
    'createdByUserId',
    'code',
    'status',
    'expiresAt',
    'createdAt',
  ],
  properties: {
    id: { type: 'string', format: 'uuid' },
    coupleId: { type: 'string', format: 'uuid' },
    createdByUserId: { type: 'string', format: 'uuid' },
    code: { type: 'string', pattern: '^[A-Z0-9]{8}$' },
    status: { type: 'string', enum: ['pending', 'accepted', 'revoked', 'expired'] },
    expiresAt: { type: 'string', format: 'date-time' },
    createdAt: { type: 'string', format: 'date-time' },
  },
};

const photoSchema = {
  type: 'object',
  required: [
    'id',
    'coupleId',
    'uploadedByUserId',
    'blobName',
    'blobUrl',
    'mimeType',
    'sizeBytes',
    'caption',
    'captionStatus',
    'takenAt',
    'createdAt',
    'updatedAt',
  ],
  properties: {
    id: { type: 'string', format: 'uuid' },
    coupleId: { type: 'string', format: 'uuid' },
    uploadedByUserId: { type: ['string', 'null'], format: 'uuid' },
    blobName: { type: 'string' },
    blobUrl: { type: 'string' },
    mimeType: { type: 'string' },
    sizeBytes: { type: 'integer', minimum: 1 },
    caption: { type: 'string' },
    captionStatus: { type: 'string', enum: ['pending', 'ready', 'failed'] },
    takenAt: { type: ['string', 'null'], format: 'date-time' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const errorResponse = {
  type: 'object',
  required: ['error'],
  properties: {
    error: {
      type: 'object',
      required: ['code', 'message'],
      properties: {
        code: {
          type: 'string',
          enum: [
            'VALIDATION_ERROR',
            'BAD_REQUEST',
            'NOT_FOUND',
            'CONFLICT',
            'UNAUTHORIZED',
            'FORBIDDEN',
            'PAYLOAD_TOO_LARGE',
            'UNSUPPORTED_MEDIA_TYPE',
            'INTERNAL_ERROR',
          ],
        },
        message: { type: 'string' },
        details: {},
      },
    },
  },
};

const json = (schema: any) => ({ 'application/json': { schema } });
const sec = [{ sessionToken: [] as string[] }];

export const OPENAPI_SPEC = {
  openapi: '3.1.0',
  info: { title: 'Duo Scrapbook API', version: '0.1.0' },
  components: {
    securitySchemes: {
      sessionToken: {
        type: 'apiKey',
        in: 'header',
        name: 'x-session-token',
      },
    },
  },
  paths: {
    '/api/health': {
      get: {
        summary: 'Health probe',
        responses: {
          '200': { description: 'Healthy or degraded' },
          '503': { description: 'Unhealthy', content: json(errorResponse) },
        },
      },
    },
    '/api/auth/register': {
      post: {
        summary: 'Register new user',
        requestBody: {
          required: true,
          content: json({
            type: 'object',
            required: ['email', 'password', 'displayName'],
            properties: {
              email: { type: 'string', format: 'email' },
              password: { type: 'string', minLength: 8, maxLength: 128 },
              displayName: { type: 'string', minLength: 1, maxLength: 80 },
            },
          }),
        },
        responses: {
          '201': {
            description: 'Created',
            content: json({
              type: 'object',
              required: ['user', 'sessionToken'],
              properties: {
                user: userSchema,
                sessionToken: { type: 'string' },
              },
            }),
          },
          '409': { description: 'Email already in use', content: json(errorResponse) },
          '422': { description: 'Validation failure', content: json(errorResponse) },
        },
      },
    },
    '/api/auth/login': {
      post: {
        summary: 'Sign in',
        requestBody: {
          required: true,
          content: json({
            type: 'object',
            required: ['email', 'password'],
            properties: {
              email: { type: 'string', format: 'email' },
              password: { type: 'string' },
            },
          }),
        },
        responses: {
          '200': {
            description: 'Authenticated',
            content: json({
              type: 'object',
              required: ['user', 'sessionToken'],
              properties: { user: userSchema, sessionToken: { type: 'string' } },
            }),
          },
          '401': { description: 'Invalid credentials', content: json(errorResponse) },
          '422': { description: 'Validation failure', content: json(errorResponse) },
        },
      },
    },
    '/api/auth/logout': {
      post: {
        summary: 'Sign out',
        security: sec,
        responses: {
          '204': { description: 'Logged out' },
          '401': { description: 'Unauthorized', content: json(errorResponse) },
        },
      },
    },
    '/api/auth/me': {
      get: {
        summary: 'Current user',
        security: sec,
        responses: {
          '200': {
            description: 'Current user + couple',
            content: json({
              type: 'object',
              required: ['user', 'couple'],
              properties: {
                user: userSchema,
                couple: { oneOf: [coupleSchema, { type: 'null' }] },
              },
            }),
          },
          '401': { description: 'Unauthorized', content: json(errorResponse) },
        },
      },
    },
    '/api/users/me': {
      patch: {
        summary: 'Update profile',
        security: sec,
        requestBody: {
          required: true,
          content: json({
            type: 'object',
            properties: {
              displayName: { type: 'string', minLength: 1, maxLength: 80 },
              avatarUrl: { type: ['string', 'null'] },
            },
          }),
        },
        responses: {
          '200': {
            description: 'Updated user',
            content: json({
              type: 'object',
              required: ['user'],
              properties: { user: userSchema },
            }),
          },
          '401': { description: 'Unauthorized', content: json(errorResponse) },
          '422': { description: 'Validation failure', content: json(errorResponse) },
        },
      },
    },
    '/api/couples': {
      post: {
        summary: 'Create couple + invite code',
        security: sec,
        requestBody: {
          required: true,
          content: json({
            type: 'object',
            required: ['name'],
            properties: { name: { type: 'string', minLength: 1, maxLength: 80 } },
          }),
        },
        responses: {
          '201': {
            description: 'Created',
            content: json({
              type: 'object',
              required: ['couple', 'invite'],
              properties: { couple: coupleSchema, invite: invitationSchema },
            }),
          },
          '409': {
            description: 'Already in a couple',
            content: json(errorResponse),
          },
          '422': { description: 'Validation failure', content: json(errorResponse) },
        },
      },
    },
    '/api/couples/join': {
      post: {
        summary: 'Join couple by code',
        security: sec,
        requestBody: {
          required: true,
          content: json({
            type: 'object',
            required: ['code'],
            properties: { code: { type: 'string', pattern: '^[A-Z0-9]{8}$' } },
          }),
        },
        responses: {
          '200': {
            description: 'Joined',
            content: json({
              type: 'object',
              required: ['couple'],
              properties: { couple: coupleSchema },
            }),
          },
          '404': {
            description: 'Invite code not found',
            content: json(errorResponse),
          },
          '409': {
            description: 'Already in a couple',
            content: json(errorResponse),
          },
          '422': { description: 'Validation failure', content: json(errorResponse) },
        },
      },
    },
    '/api/couples/me': {
      get: {
        summary: 'Get current couple + members',
        security: sec,
        responses: {
          '200': {
            description: 'Couple + members',
            content: json({
              type: 'object',
              required: ['couple', 'members'],
              properties: {
                couple: coupleSchema,
                members: { type: 'array', items: userSchema },
              },
            }),
          },
          '401': { description: 'Unauthorized', content: json(errorResponse) },
          '404': { description: 'No couple', content: json(errorResponse) },
        },
      },
    },
    '/api/couples/me/leave': {
      delete: {
        summary: 'Leave current couple',
        security: sec,
        responses: {
          '204': { description: 'Left' },
          '401': { description: 'Unauthorized', content: json(errorResponse) },
          '404': { description: 'No couple', content: json(errorResponse) },
        },
      },
    },
    '/api/photos': {
      post: {
        summary: 'Upload photo',
        security: sec,
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: {
                  file: { type: 'string', format: 'binary' },
                  takenAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Uploaded',
            content: json({
              type: 'object',
              required: ['photo'],
              properties: { photo: photoSchema },
            }),
          },
          '401': { description: 'Unauthorized', content: json(errorResponse) },
          '403': { description: 'Forbidden', content: json(errorResponse) },
          '422': { description: 'Validation failure', content: json(errorResponse) },
        },
      },
      get: {
        summary: "List couple's photos",
        security: sec,
        parameters: [
          { name: 'cursor', in: 'query', required: false, schema: { type: 'string' } },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 24 },
          },
        ],
        responses: {
          '200': {
            description: 'Photos page',
            content: json({
              type: 'object',
              required: ['photos', 'nextCursor'],
              properties: {
                photos: { type: 'array', items: photoSchema },
                nextCursor: { type: ['string', 'null'] },
              },
            }),
          },
          '401': { description: 'Unauthorized', content: json(errorResponse) },
          '403': { description: 'Forbidden', content: json(errorResponse) },
        },
      },
    },
    '/api/photos/{id}': {
      get: {
        summary: 'Get single photo',
        security: sec,
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'Photo',
            content: json({
              type: 'object',
              required: ['photo'],
              properties: { photo: photoSchema },
            }),
          },
          '401': { description: 'Unauthorized', content: json(errorResponse) },
          '403': { description: 'Forbidden', content: json(errorResponse) },
          '404': { description: 'Not found', content: json(errorResponse) },
        },
      },
      delete: {
        summary: 'Delete photo',
        security: sec,
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '204': { description: 'Deleted' },
          '401': { description: 'Unauthorized', content: json(errorResponse) },
          '403': { description: 'Forbidden', content: json(errorResponse) },
          '404': { description: 'Not found', content: json(errorResponse) },
        },
      },
    },
    '/api/photos/{id}/regenerate-caption': {
      post: {
        summary: 'Regenerate caption',
        security: sec,
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'Updated photo',
            content: json({
              type: 'object',
              required: ['photo'],
              properties: { photo: photoSchema },
            }),
          },
          '401': { description: 'Unauthorized', content: json(errorResponse) },
          '403': { description: 'Forbidden', content: json(errorResponse) },
          '404': { description: 'Not found', content: json(errorResponse) },
        },
      },
    },
    '/api/openapi.json': {
      get: {
        summary: 'OpenAPI spec',
        responses: {
          '200': {
            description: 'OpenAPI document',
            content: { 'application/json': { schema: { type: 'object' } } },
          },
        },
      },
    },
  },
} as const;
