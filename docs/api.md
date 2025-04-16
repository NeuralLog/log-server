# NeuralLog Log Server API Reference

This document provides a comprehensive reference for the NeuralLog Log Server API endpoints.

## Table of Contents

- [Authentication](#authentication)
- [Base URL](#base-url)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [API Endpoints](#api-endpoints)
  - [Health Check](#health-check)
  - [Logs Management](#logs-management)
  - [Log Entries Management](#log-entries-management)
  - [Search](#search)
  - [Statistics](#statistics)

## Authentication

The NeuralLog Log Server API requires authentication for all endpoints except the health check. There are three authentication methods supported:

### Token Authentication

Include a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

Tokens are issued by the NeuralLog Auth Service and can be obtained through the `/api/auth/login` endpoint of the Auth Service.

### Resource Token Authentication

Include a resource-specific token in the Authorization header:

```
Authorization: Bearer <resource_token>
```

Resource tokens are issued by the NeuralLog Auth Service and provide access to specific resources.

### API Key Authentication

Include an API key in the X-API-Key header:

```
X-API-Key: <api_key>
```

API keys are issued by the NeuralLog Auth Service and can be obtained through the `/api/apikeys` endpoint of the Auth Service.

## Base URL

The base URL for all API endpoints is:

```
http://<host>:<port>/
```

Where `<host>` is the hostname or IP address of the NeuralLog Log Server and `<port>` is the port it's running on (default: 3030).

## Response Format

All API responses are in JSON format and follow this structure:

```json
{
  "status": "success",
  "data": { ... }
}
```

For error responses:

```json
{
  "status": "error",
  "error": "Error message"
}
```

## Error Handling

The API uses standard HTTP status codes to indicate the success or failure of a request:

- `200 OK`: The request was successful
- `400 Bad Request`: The request was invalid
- `401 Unauthorized`: Authentication is required
- `403 Forbidden`: The authenticated user doesn't have permission
- `404 Not Found`: The requested resource was not found
- `500 Internal Server Error`: An error occurred on the server

## API Endpoints

### Health Check

#### GET /

Check if the server is running.

**Request**

```http
GET / HTTP/1.1
```

**Response**

```json
{
  "status": "ok",
  "message": "NeuralLog server is running",
  "version": "1.0.0"
}
```

### Logs Management

#### GET /api/logs

Get all log names.

**Request**

```http
GET /api/logs HTTP/1.1
Authorization: Bearer <token>
```

**Query Parameters**

- `limit` (optional): Maximum number of logs to return (default: 100)
- `namespace` (optional): Namespace to get logs from (default: "default")

**Response**

```json
{
  "status": "success",
  "namespace": "default",
  "logs": [
    "application-logs",
    "system-logs",
    "security-logs"
  ]
}
```

#### GET /api/logs/:logName

Get entries for a specific log.

**Request**

```http
GET /api/logs/application-logs HTTP/1.1
Authorization: Bearer <token>
```

**Query Parameters**

- `limit` (optional): Maximum number of entries to return (default: 100)
- `namespace` (optional): Namespace to get logs from (default: "default")

**Response**

```json
{
  "status": "success",
  "namespace": "default",
  "name": "application-logs",
  "entries": [
    {
      "id": "log_123",
      "name": "application-logs",
      "data": { ... },
      "timestamp": "2023-01-01T00:00:00.000Z"
    },
    ...
  ]
}
```

#### POST /api/logs/:logName

Overwrite a log (clear and add new entries).

**Request**

```http
POST /api/logs/application-logs HTTP/1.1
Authorization: Bearer <token>
Content-Type: application/json

{
  "entries": [
    { ... },
    ...
  ]
}
```

**Query Parameters**

- `namespace` (optional): Namespace to store logs in (default: "default")

**Response**

```json
{
  "status": "success",
  "namespace": "default",
  "name": "application-logs",
  "count": 2
}
```

#### PATCH /api/logs/:logName

Append to a log.

**Request**

```http
PATCH /api/logs/application-logs HTTP/1.1
Authorization: Bearer <token>
Content-Type: application/json

{
  "level": "info",
  "message": "User logged in",
  "userId": "123",
  "timestamp": "2023-01-01T00:00:00.000Z"
}
```

**Query Parameters**

- `namespace` (optional): Namespace to store logs in (default: "default")

**Response**

```json
{
  "status": "success",
  "logId": "log_123",
  "namespace": "default"
}
```

#### DELETE /api/logs/:logName

Clear a log.

**Request**

```http
DELETE /api/logs/application-logs HTTP/1.1
Authorization: Bearer <token>
```

**Query Parameters**

- `namespace` (optional): Namespace to clear logs from (default: "default")

**Response**

```json
{
  "status": "success",
  "namespace": "default",
  "name": "application-logs"
}
```

### Log Entries Management

#### GET /api/logs/:logName/:logId

Get a specific log entry.

**Request**

```http
GET /api/logs/application-logs/log_123 HTTP/1.1
Authorization: Bearer <token>
```

**Query Parameters**

- `namespace` (optional): Namespace to get logs from (default: "default")

**Response**

```json
{
  "status": "success",
  "namespace": "default",
  "entry": {
    "id": "log_123",
    "name": "application-logs",
    "data": { ... },
    "timestamp": "2023-01-01T00:00:00.000Z"
  }
}
```

#### POST /api/logs/:logName/:logId

Update a specific log entry.

**Request**

```http
POST /api/logs/application-logs/log_123 HTTP/1.1
Authorization: Bearer <token>
Content-Type: application/json

{
  "level": "info",
  "message": "Updated message",
  "userId": "123",
  "timestamp": "2023-01-01T00:00:00.000Z"
}
```

**Query Parameters**

- `namespace` (optional): Namespace to update logs in (default: "default")

**Response**

```json
{
  "status": "success",
  "namespace": "default",
  "id": "log_123"
}
```

#### DELETE /api/logs/:logName/:logId

Delete a specific log entry.

**Request**

```http
DELETE /api/logs/application-logs/log_123 HTTP/1.1
Authorization: Bearer <token>
```

**Query Parameters**

- `namespace` (optional): Namespace to delete logs from (default: "default")

**Response**

```json
{
  "status": "success",
  "namespace": "default",
  "id": "log_123"
}
```

### Search

#### GET /api/search

Search logs with various criteria.

**Request**

```http
GET /api/search?query=error&logName=application-logs HTTP/1.1
Authorization: Bearer <token>
```

**Query Parameters**

- `query` (optional): Search query
- `logName` (optional): Log name to search in
- `startTime` (optional): Start time for time-based search (ISO 8601 format)
- `endTime` (optional): End time for time-based search (ISO 8601 format)
- `limit` (optional): Maximum number of results to return (default: 100)
- `namespace` (optional): Namespace to search in (default: "default")
- `field_*` (optional): Field-specific filters (e.g., `field_level=error`)

**Response**

```json
{
  "status": "success",
  "namespace": "default",
  "total": 2,
  "results": [
    {
      "logName": "application-logs",
      "entry": {
        "id": "log_123",
        "name": "application-logs",
        "data": { ... },
        "timestamp": "2023-01-01T00:00:00.000Z"
      }
    },
    ...
  ]
}
```



## Namespace Support

All endpoints support the `namespace` query parameter to specify which namespace to operate on. If not provided, the default namespace is used.

Namespaces provide logical isolation of data and are typically used to separate data for different tenants or environments.

## Zero-Knowledge Architecture

The NeuralLog Log Server implements a zero-knowledge architecture where the server never has access to unencrypted data. All sensitive data is encrypted client-side before being sent to the server.

When using the API directly, it's the client's responsibility to encrypt the data before sending it to the server. The NeuralLog Client SDK handles this automatically.

## Rate Limiting

The API implements rate limiting to prevent abuse. If you exceed the rate limit, you'll receive a 429 Too Many Requests response.

## CORS Support

The API supports Cross-Origin Resource Sharing (CORS) to allow browser-based applications to access the API from different domains.

## Versioning

The current API version is v1. The API may be updated in the future with breaking changes. When this happens, a new version will be released, and the old version will be deprecated but still supported for a transition period.

## OpenAPI/Swagger Documentation

The API is documented using OpenAPI (formerly known as Swagger). You can access the Swagger UI at:

```
http://<host>:<port>/api-docs
```

This provides an interactive documentation where you can explore and test the API endpoints.

### OpenAPI Schema as Single Source of Truth

The OpenAPI schema serves as the single source of truth for the API. It defines all endpoints, request/response structures, and validation rules. The schema is located at `src/openapi.yaml` in the log-server repository.

### TypeScript Type Generation

TypeScript types for the API are automatically generated from the OpenAPI schema during the build process. These types are used by the client SDK to ensure type safety and consistency between the server and client.

The generated types are located in the `typescript-client-sdk/src/types/api.ts` file and are used by both the log-server and client applications.

### Updating the API

When making changes to the API:

1. Update the OpenAPI schema in `src/openapi.yaml`
2. Run `npm run generate-api-types` to generate updated TypeScript types
3. Update the implementation to match the new schema

This ensures that the documentation, types, and implementation stay in sync.
