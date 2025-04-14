# NeuralLog Log Server Configuration Guide

This document provides detailed information on configuring the NeuralLog Log Server for different environments and use cases.

## Table of Contents

- [Environment Variables](#environment-variables)
- [Storage Configuration](#storage-configuration)
  - [Memory Storage](#memory-storage)
  - [NeDB Storage](#nedb-storage)
  - [Redis Storage](#redis-storage)
- [Authentication Configuration](#authentication-configuration)
- [Server Configuration](#server-configuration)
- [Logging Configuration](#logging-configuration)
- [CORS Configuration](#cors-configuration)
- [Docker Configuration](#docker-configuration)
- [Kubernetes Configuration](#kubernetes-configuration)
- [Development Configuration](#development-configuration)
- [Production Configuration](#production-configuration)

## Environment Variables

The NeuralLog Log Server is configured primarily through environment variables:

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Port to listen on | `3030` | No |
| `STORAGE_TYPE` | Storage adapter type (`memory`, `nedb`, `redis`) | `memory` | No |
| `DB_PATH` | Path to the database directory (for NeDB) | `./data` | No (Yes for NeDB) |
| `REDIS_URL` | Redis connection URL (for Redis) | `redis://localhost:6379` | No (Yes for Redis) |
| `REDIS_HOST` | Redis host (for Redis) | `localhost` | No |
| `REDIS_PORT` | Redis port (for Redis) | `6379` | No |
| `REDIS_PASSWORD` | Redis password (for Redis) | `null` | No |
| `REDIS_DB` | Redis database index (for Redis) | `0` | No |
| `REDIS_TLS` | Whether to use TLS for Redis connection | `false` | No |
| `AUTH_SERVICE_URL` | URL of the Auth Service | `http://localhost:3040` | Yes |
| `SERVER_TOKEN_SECRET` | Secret for verifying server tokens | `neurallog-secret` | Yes |
| `DEFAULT_NAMESPACE` | Default namespace for storage | `default` | No |
| `LOG_LEVEL` | Logging level (`error`, `warn`, `info`, `debug`) | `info` | No |
| `CORS_ORIGIN` | CORS allowed origins | `*` | No |
| `RATE_LIMIT_WINDOW` | Rate limit window in milliseconds | `60000` | No |
| `RATE_LIMIT_MAX` | Maximum requests per window | `100` | No |

## Storage Configuration

### Memory Storage

Memory storage is the simplest configuration and is suitable for development and testing:

```env
STORAGE_TYPE=memory
```

No additional configuration is required for memory storage.

### NeDB Storage

NeDB storage provides file-based persistence and is suitable for small deployments:

```env
STORAGE_TYPE=nedb
DB_PATH=/path/to/data
```

Make sure the directory specified in `DB_PATH` exists and is writable by the server process.

### Redis Storage

Redis storage provides high-performance, scalable storage and is suitable for production deployments:

#### Using Redis URL

```env
STORAGE_TYPE=redis
REDIS_URL=redis://username:password@hostname:port/db
```

#### Using Redis Connection Parameters

```env
STORAGE_TYPE=redis
REDIS_HOST=hostname
REDIS_PORT=6379
REDIS_PASSWORD=password
REDIS_DB=0
REDIS_TLS=false
```

## Authentication Configuration

The NeuralLog Log Server integrates with the NeuralLog Auth Service for authentication:

```env
AUTH_SERVICE_URL=http://auth-service:3040
SERVER_TOKEN_SECRET=your-secret-key
```

The `SERVER_TOKEN_SECRET` must match the secret used by the Auth Service for token verification.

## Server Configuration

Basic server configuration:

```env
PORT=3030
DEFAULT_NAMESPACE=default
```

## Logging Configuration

Configure the logging level:

```env
LOG_LEVEL=info
```

Available logging levels:
- `error`: Only log errors
- `warn`: Log warnings and errors
- `info`: Log info, warnings, and errors (default)
- `debug`: Log debug information, info, warnings, and errors

## CORS Configuration

Configure Cross-Origin Resource Sharing (CORS):

```env
CORS_ORIGIN=*
```

To restrict CORS to specific origins:

```env
CORS_ORIGIN=https://example.com,https://app.example.com
```

## Docker Configuration

### Using Docker Run

```bash
docker run -d \
  --name neurallog-log-server \
  -p 3030:3030 \
  -e STORAGE_TYPE=memory \
  -e AUTH_SERVICE_URL=http://auth-service:3040 \
  -e SERVER_TOKEN_SECRET=your-secret-key \
  neurallog/log-server:latest
```

### Using Docker Compose

#### Memory Storage

```yaml
# docker-compose.memory.yml
version: '3'
services:
  log-server:
    image: neurallog/log-server:latest
    ports:
      - "3030:3030"
    environment:
      - STORAGE_TYPE=memory
      - AUTH_SERVICE_URL=http://auth-service:3040
      - SERVER_TOKEN_SECRET=your-secret-key
```

#### NeDB Storage

```yaml
# docker-compose.nedb.yml
version: '3'
services:
  log-server:
    image: neurallog/log-server:latest
    ports:
      - "3030:3030"
    environment:
      - STORAGE_TYPE=nedb
      - DB_PATH=/data
      - AUTH_SERVICE_URL=http://auth-service:3040
      - SERVER_TOKEN_SECRET=your-secret-key
    volumes:
      - ./data:/data
```

#### Redis Storage

```yaml
# docker-compose.redis.yml
version: '3'
services:
  log-server:
    image: neurallog/log-server:latest
    ports:
      - "3030:3030"
    environment:
      - STORAGE_TYPE=redis
      - REDIS_URL=redis://redis:6379
      - AUTH_SERVICE_URL=http://auth-service:3040
      - SERVER_TOKEN_SECRET=your-secret-key
    depends_on:
      - redis
  
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes

volumes:
  redis-data:
```

## Kubernetes Configuration

### Deployment

```yaml
# log-server-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: neurallog-log-server
  labels:
    app: neurallog-log-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: neurallog-log-server
  template:
    metadata:
      labels:
        app: neurallog-log-server
    spec:
      containers:
      - name: log-server
        image: neurallog/log-server:latest
        ports:
        - containerPort: 3030
        env:
        - name: STORAGE_TYPE
          value: "redis"
        - name: REDIS_URL
          value: "redis://redis-service:6379"
        - name: AUTH_SERVICE_URL
          value: "http://auth-service:3040"
        - name: SERVER_TOKEN_SECRET
          valueFrom:
            secretKeyRef:
              name: neurallog-secrets
              key: server-token-secret
```

### Service

```yaml
# log-server-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: log-server-service
spec:
  selector:
    app: neurallog-log-server
  ports:
  - port: 3030
    targetPort: 3030
  type: ClusterIP
```

### ConfigMap

```yaml
# log-server-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: log-server-config
data:
  STORAGE_TYPE: "redis"
  REDIS_URL: "redis://redis-service:6379"
  AUTH_SERVICE_URL: "http://auth-service:3040"
  LOG_LEVEL: "info"
  DEFAULT_NAMESPACE: "default"
```

### Secret

```yaml
# log-server-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: neurallog-secrets
type: Opaque
data:
  server-token-secret: <base64-encoded-secret>
```

## Development Configuration

For local development, you can use a `.env` file in the project root:

```env
# .env
PORT=3030
STORAGE_TYPE=memory
AUTH_SERVICE_URL=http://localhost:3040
SERVER_TOKEN_SECRET=development-secret
LOG_LEVEL=debug
```

Then run the server with:

```bash
npm run dev
```

## Production Configuration

For production deployments, it's recommended to use Redis storage and proper security settings:

```env
PORT=3030
STORAGE_TYPE=redis
REDIS_URL=redis://username:password@hostname:port/0
REDIS_TLS=true
AUTH_SERVICE_URL=https://auth.example.com
SERVER_TOKEN_SECRET=your-secure-secret
LOG_LEVEL=info
CORS_ORIGIN=https://app.example.com
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=100
```

## Advanced Configuration

### Custom Storage Adapter

To use a custom storage adapter, you need to register it with the `StorageAdapterFactory`:

```typescript
import { StorageAdapterFactory } from './storage/StorageAdapterFactory';
import { CustomStorageAdapter } from './storage/CustomStorageAdapter';

// Register the custom adapter
StorageAdapterFactory.registerAdapter('custom', (namespace, options) => {
  return new CustomStorageAdapter(namespace, options.customOptions);
});
```

Then configure the server to use it:

```env
STORAGE_TYPE=custom
CUSTOM_OPTION_1=value1
CUSTOM_OPTION_2=value2
```

### Multiple Storage Adapters

You can configure different storage adapters for different namespaces:

```typescript
import { NamespacedStorageAdapterFactory } from './storage/NamespacedStorageAdapterFactory';

// Configure the factory
NamespacedStorageAdapterFactory.configure({
  defaultType: 'redis',
  redis: {
    host: 'localhost',
    port: 6379
  },
  namespaceConfigs: {
    'tenant1': {
      type: 'redis',
      redis: {
        host: 'tenant1-redis',
        port: 6379
      }
    },
    'tenant2': {
      type: 'nedb',
      dbPath: '/data/tenant2'
    }
  }
});
```

### Custom Middleware

You can add custom middleware to the server:

```typescript
import express from 'express';
import { Server } from './server/server';

// Create a custom server class
class CustomServer extends Server {
  constructor(port: number = 3030) {
    super(port);
    
    // Add custom middleware
    this.app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
      // Custom middleware logic
      next();
    });
  }
}

// Create and start the custom server
const server = new CustomServer();
server.start();
```

## Troubleshooting

### Connection Issues

If you're having trouble connecting to the server, check:

1. The server is running and listening on the correct port
2. The port is accessible from your client
3. Any firewalls or network restrictions

### Authentication Issues

If you're having authentication problems:

1. Verify the `AUTH_SERVICE_URL` is correct
2. Ensure the `SERVER_TOKEN_SECRET` matches the Auth Service
3. Check that your tokens or API keys are valid

### Storage Issues

For storage-related problems:

#### Memory Storage

- Memory storage is volatile and will lose data on server restart
- Check for memory leaks if the server is using too much memory

#### NeDB Storage

- Ensure the `DB_PATH` directory exists and is writable
- Check for disk space issues
- Verify file permissions

#### Redis Storage

- Verify the Redis connection parameters
- Ensure Redis is running and accessible
- Check Redis memory usage and configuration

### Performance Issues

If you're experiencing performance problems:

1. Use Redis storage for production deployments
2. Increase the resources allocated to the server
3. Consider scaling horizontally with multiple instances
4. Optimize client-side encryption and decryption

## Conclusion

This configuration guide covers the most common settings for the NeuralLog Log Server. By properly configuring the server for your environment, you can ensure optimal performance, security, and reliability.

For more information, refer to the other documentation:

- [Architecture](./architecture.md)
- [API Reference](./api.md)
- [Storage Adapters](./storage-adapters.md)
- [Zero-Knowledge Architecture](./zero-knowledge.md)
- [Getting Started](./getting-started.md)
