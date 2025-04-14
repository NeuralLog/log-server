# NeuralLog Log Server Architecture

This document provides a detailed overview of the NeuralLog Log Server architecture, explaining its components, data flow, and integration with other NeuralLog services.

## Overview

The NeuralLog Log Server is the central component of the NeuralLog ecosystem, responsible for receiving, storing, and retrieving log data. It implements a RESTful API for log management and supports multiple storage backends through a pluggable adapter system.

The server is designed with the following key principles:

1. **Zero-Knowledge Architecture**: All sensitive log data is encrypted client-side before being sent to the server
2. **Multi-Tenant Support**: Logical isolation of data through namespaces
3. **Pluggable Storage**: Support for different storage backends (Memory, NeDB, Redis)
4. **Searchable Encryption**: Ability to search encrypted logs without decrypting them
5. **Authentication Integration**: Seamless integration with the NeuralLog Auth Service

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         NeuralLog Log Server                            │
│                                                                         │
│  ┌─────────────┐  ┌─────────────────────┐  ┌─────────────────────────┐  │
│  │ API Layer   │  │ Business Logic      │  │ Storage Layer           │  │
│  │             │  │                     │  │                         │  │
│  │ • REST API  │◄─┤ • Log Management   │◄─┤ • Storage Adapters      │  │
│  │ • Swagger   │  │ • Search           │  │ • Namespaced Storage    │  │
│  │ • Auth      │  │ • Statistics       │  │ • Search Indexing       │  │
│  └─────────────┘  └─────────────────────┘  └─────────────────────────┘  │
│         │                    │                          │                │
│         ▼                    ▼                          ▼                │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                      External Integrations                          │ │
│  │                                                                     │ │
│  │  ┌─────────────┐  ┌─────────────────────┐  ┌─────────────────────┐  │ │
│  │  │ Auth Service│  │ MCP Client          │  │ Storage Backends    │  │ │
│  │  │             │  │                     │  │                     │  │ │
│  │  │ • Token Auth│  │ • AI Integration    │  │ • Memory (Dev)      │  │ │
│  │  │ • API Keys  │  │ • Log Analysis      │  │ • NeDB (Small)      │  │ │
│  │  │ • Users     │  │                     │  │ • Redis (Prod)      │  │ │
│  │  └─────────────┘  └─────────────────────┘  └─────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Key Components

### API Layer

The API layer provides RESTful endpoints for log management:

- **REST API**: Implements endpoints for log operations
- **Swagger**: API documentation and testing interface
- **Authentication**: Middleware for token and API key authentication

### Business Logic Layer

The business logic layer handles the core functionality:

- **Log Management**: Creating, reading, updating, and deleting logs
- **Search**: Searching logs with various criteria
- **Statistics**: Tracking and reporting log statistics

### Storage Layer

The storage layer manages data persistence:

- **Storage Adapters**: Pluggable adapters for different storage backends
- **Namespaced Storage**: Logical isolation of data through namespaces
- **Search Indexing**: Indexing logs for efficient searching

### External Integrations

The server integrates with several external components:

- **Auth Service**: Authentication and authorization
- **MCP Client**: AI integration through the Model Context Protocol
- **Storage Backends**: Different storage options (Memory, NeDB, Redis)

## Storage Adapters

The log server supports multiple storage backends through a pluggable adapter system:

### Memory Storage Adapter

- In-memory storage for development and testing
- No persistence across server restarts
- Fast performance for small datasets
- Suitable for development and testing environments

### NeDB Storage Adapter

- File-based storage for small deployments
- Persistence across server restarts
- Good performance for small to medium datasets
- Suitable for small production deployments or development

### Redis Storage Adapter

- Scalable, high-performance storage for production deployments
- Excellent performance for large datasets
- Support for clustering and replication
- Suitable for production environments with high traffic

## Namespaced Storage

The log server supports logical isolation of data through namespaces:

- Each tenant has its own namespace
- Logs are stored in tenant-specific namespaces
- Statistics are tracked per namespace
- Search is scoped to a specific namespace

## Authentication and Authorization

The log server integrates with the NeuralLog Auth Service for authentication and authorization:

### Token Authentication

- JWT tokens issued by the Auth Service
- Support for server access tokens
- Support for resource-specific tokens
- Token verification and validation

### API Key Authentication

- API keys issued by the Auth Service
- API key verification and validation
- Support for zero-knowledge API key verification

### Authorization

- Integration with the Auth Service for permission checks
- Support for role-based access control
- Support for tenant-specific permissions

## Zero-Knowledge Architecture

The log server implements a zero-knowledge architecture where the server never has access to unencrypted data:

- All sensitive data is encrypted client-side before being sent to the server
- The server stores only encrypted data
- Search is performed using searchable encryption techniques
- The server never has access to encryption keys

## Searchable Encryption

The log server supports searching encrypted logs without decrypting them:

- Search tokens are generated client-side
- Tokens are indexed on the server
- Search is performed by matching tokens
- Results are returned encrypted and decrypted client-side

## Data Flow

### Log Creation Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│             │     │             │     │             │     │             │
│ Client      │────▶│ API Layer   │────▶│ Business    │────▶│ Storage     │
│             │     │             │     │ Logic       │     │ Layer       │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
      │                                                            │
      │                                                            │
      │                                                            ▼
      │                                                      ┌─────────────┐
      │                                                      │             │
      └──────────────────────────────────────────────────────▶ Statistics  │
                                                             │             │
                                                             └─────────────┘
```

1. Client encrypts log data and generates search tokens
2. Client sends encrypted data and tokens to the API layer
3. API layer authenticates the request and passes it to the business logic layer
4. Business logic layer processes the request and passes it to the storage layer
5. Storage layer stores the encrypted data and indexes the search tokens
6. Statistics are updated to reflect the new log entry

### Log Retrieval Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│             │     │             │     │             │     │             │
│ Client      │────▶│ API Layer   │────▶│ Business    │────▶│ Storage     │
│             │     │             │     │ Logic       │     │ Layer       │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
      ▲                                                            │
      │                                                            │
      │                                                            │
      │                                                            │
      │                                                            │
      └────────────────────────────────────────────────────────────┘
```

1. Client sends a request to retrieve logs to the API layer
2. API layer authenticates the request and passes it to the business logic layer
3. Business logic layer processes the request and passes it to the storage layer
4. Storage layer retrieves the encrypted logs
5. Encrypted logs are returned to the client
6. Client decrypts the logs client-side

### Search Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│             │     │             │     │             │     │             │
│ Client      │────▶│ API Layer   │────▶│ Business    │────▶│ Storage     │
│             │     │             │     │ Logic       │     │ Layer       │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
      ▲                                                            │
      │                                                            │
      │                                                            │
      │                                                            │
      │                                                            │
      └────────────────────────────────────────────────────────────┘
```

1. Client generates search tokens from the search query
2. Client sends search tokens to the API layer
3. API layer authenticates the request and passes it to the business logic layer
4. Business logic layer processes the request and passes it to the storage layer
5. Storage layer searches for logs matching the search tokens
6. Encrypted logs are returned to the client
7. Client decrypts the logs client-side

## Integration with Other NeuralLog Components

### Auth Service Integration

The log server integrates with the NeuralLog Auth Service for authentication and authorization:

- **Token Authentication**: Verifying JWT tokens issued by the Auth Service
- **API Key Authentication**: Verifying API keys issued by the Auth Service
- **Authorization**: Checking permissions with the Auth Service

### MCP Client Integration

The log server integrates with the NeuralLog MCP Client for AI integration:

- **Log Analysis**: Analyzing logs for patterns and anomalies
- **Automated Actions**: Triggering actions based on log patterns
- **AI Integration**: Integrating with AI models through the Model Context Protocol

### Web Application Integration

The log server integrates with the NeuralLog Web Application:

- **Log Viewing**: Providing logs for the web application to display
- **Log Search**: Supporting search functionality in the web application
- **Statistics**: Providing statistics for the web application to display

## Deployment Options

The log server can be deployed in various ways:

### Docker Deployment

- Docker image for easy deployment
- Docker Compose for local development
- Support for different storage backends

### Kubernetes Deployment

- Kubernetes manifests for production deployment
- Support for scaling and high availability
- Integration with Kubernetes secrets and config maps

### Local Development

- Local development with npm
- Support for hot reloading
- Easy configuration through environment variables

## Configuration

The log server is configured through environment variables:

- **PORT**: Port to listen on (default: 3030)
- **STORAGE_TYPE**: Storage type (memory, nedb, redis)
- **DB_PATH**: Path to the database directory (for NeDB)
- **REDIS_URL**: Redis connection URL (for Redis)
- **AUTH_SERVICE_URL**: URL of the Auth Service
- **SERVER_TOKEN_SECRET**: Secret for verifying server tokens

## Security Considerations

The log server implements several security measures:

- **Zero-Knowledge Architecture**: All sensitive data is encrypted client-side
- **Authentication**: Integration with the Auth Service for authentication
- **Authorization**: Integration with the Auth Service for authorization
- **CORS**: Cross-Origin Resource Sharing for browser security
- **Rate Limiting**: Protection against brute force attacks
- **Input Validation**: Validation of all input data

## Performance Considerations

The log server is designed for high performance:

- **Pluggable Storage**: Choose the right storage backend for your needs
- **Efficient Search**: Indexing for fast search performance
- **Caching**: Caching frequently accessed data
- **Connection Pooling**: Efficient use of database connections
- **Asynchronous Processing**: Non-blocking I/O for high throughput

## Future Improvements

The log server is continuously evolving with planned improvements:

- **Streaming**: Real-time log streaming with WebSockets
- **Advanced Search**: More powerful search capabilities
- **Analytics**: Advanced log analytics and visualization
- **Alerting**: Alerting based on log patterns
- **Retention Policies**: Automatic log retention and archiving
