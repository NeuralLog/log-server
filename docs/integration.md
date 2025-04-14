# NeuralLog Log Server Integration Guide

This document explains how to integrate the NeuralLog Log Server with other components of the NeuralLog ecosystem and external systems.

## Table of Contents

- [Integration with NeuralLog Components](#integration-with-neurallog-components)
  - [Auth Service](#auth-service)
  - [Web Application](#web-application)
  - [MCP Client](#mcp-client)
  - [Registry Service](#registry-service)
- [Integration with Client SDKs](#integration-with-client-sdks)
  - [TypeScript Client SDK](#typescript-client-sdk)
  - [Java Client SDK](#java-client-sdk)
  - [Other Client SDKs](#other-client-sdks)
- [Integration with External Systems](#integration-with-external-systems)
  - [Logging Frameworks](#logging-frameworks)
  - [Monitoring Systems](#monitoring-systems)
  - [Analytics Platforms](#analytics-platforms)
- [Multi-Tenant Integration](#multi-tenant-integration)
- [Kubernetes Integration](#kubernetes-integration)
- [CI/CD Integration](#cicd-integration)
- [Security Integration](#security-integration)

## Integration with NeuralLog Components

The NeuralLog Log Server is designed to work seamlessly with other components of the NeuralLog ecosystem.

### Auth Service

The Log Server integrates with the NeuralLog Auth Service for authentication and authorization:

#### Configuration

```env
AUTH_SERVICE_URL=http://auth-service:3040
SERVER_TOKEN_SECRET=your-secret-key
```

#### Authentication Flow

1. The client authenticates with the Auth Service and receives a token
2. The client includes the token in requests to the Log Server
3. The Log Server verifies the token with the Auth Service
4. If the token is valid, the Log Server processes the request

#### API Key Authentication

1. The client includes an API key in requests to the Log Server
2. The Log Server verifies the API key with the Auth Service
3. If the API key is valid, the Log Server processes the request

#### Resource Token Authentication

1. The client exchanges its token for a resource-specific token with the Auth Service
2. The client includes the resource token in requests to the Log Server
3. The Log Server verifies the resource token with the Auth Service
4. If the resource token is valid, the Log Server processes the request

### Web Application

The NeuralLog Web Application integrates with the Log Server for viewing and searching logs:

#### Configuration

In the Web Application:

```env
NEXT_PUBLIC_LOGS_API_URL=http://log-server:3030
```

#### Integration Flow

1. The Web Application authenticates the user with the Auth Service
2. The Web Application exchanges the user's token for a resource token
3. The Web Application uses the resource token to request logs from the Log Server
4. The Web Application decrypts the logs client-side and displays them to the user

#### Zero-Knowledge Integration

The Web Application implements the client-side of the zero-knowledge architecture:

1. The Web Application derives encryption keys from the user's master secret
2. The Web Application encrypts log names and data before sending them to the Log Server
3. The Web Application decrypts log names and data after retrieving them from the Log Server
4. The Web Application generates search tokens for searching logs

### MCP Client

The NeuralLog MCP (Model Context Protocol) Client integrates with the Log Server for AI-powered log analysis:

#### Configuration

In the MCP Client:

```env
LOGS_API_URL=http://log-server:3030
```

#### Integration Flow

1. The MCP Client authenticates with the Auth Service
2. The MCP Client uses its token to request logs from the Log Server
3. The MCP Client processes the logs with AI models
4. The MCP Client can trigger actions based on log patterns

### Registry Service

The NeuralLog Registry Service provides service discovery for NeuralLog components:

#### Configuration

In the Registry Service:

```env
LOG_SERVER_URL=http://log-server:3030
```

#### Integration Flow

1. The Registry Service registers the Log Server's URL
2. Clients request the Log Server's URL from the Registry Service
3. Clients use the URL to connect to the Log Server

## Integration with Client SDKs

The NeuralLog Log Server is designed to be used with client SDKs that handle encryption and decryption.

### TypeScript Client SDK

The TypeScript Client SDK provides a convenient way to interact with the Log Server:

#### Installation

```bash
npm install @neurallog/client-sdk
```

#### Usage

```typescript
import { NeuralLogClient } from '@neurallog/client-sdk';

// Create a client
const client = new NeuralLogClient({
  serverUrl: 'http://localhost:3030',
  authUrl: 'http://localhost:3040',
  tenantId: 'default'
});

// Authenticate
await client.authenticateWithApiKey('your-api-key');

// Log data (encrypted client-side)
await client.log('application-logs', {
  level: 'info',
  message: 'User logged in',
  userId: '123',
  timestamp: new Date().toISOString()
});

// Retrieve logs (decrypted client-side)
const logs = await client.getLogs('application-logs');
console.log(logs);

// Search logs (using searchable encryption)
const results = await client.searchLogs('error', 'application-logs');
console.log(results);
```

### Java Client SDK

The Java Client SDK provides a convenient way to interact with the Log Server from Java applications:

#### Installation

```xml
<dependency>
  <groupId>com.neurallog</groupId>
  <artifactId>client-sdk</artifactId>
  <version>1.0.0</version>
</dependency>
```

#### Usage

```java
import com.neurallog.client.NeuralLogClient;

// Create a client
NeuralLogClient client = new NeuralLogClient.Builder()
    .serverUrl("http://localhost:3030")
    .authUrl("http://localhost:3040")
    .tenantId("default")
    .build();

// Authenticate
client.authenticateWithApiKey("your-api-key");

// Log data (encrypted client-side)
Map<String, Object> data = new HashMap<>();
data.put("level", "info");
data.put("message", "User logged in");
data.put("userId", "123");
data.put("timestamp", new Date().toString());
client.log("application-logs", data);

// Retrieve logs (decrypted client-side)
List<Map<String, Object>> logs = client.getLogs("application-logs");
System.out.println(logs);

// Search logs (using searchable encryption)
List<Map<String, Object>> results = client.searchLogs("error", "application-logs");
System.out.println(results);
```

### Other Client SDKs

NeuralLog provides client SDKs for other languages as well:

- **Python Client SDK**: For Python applications
- **C# Client SDK**: For .NET applications
- **Go Client SDK**: For Go applications

Each SDK implements the same zero-knowledge architecture and provides a similar API.

## Integration with External Systems

The NeuralLog Log Server can be integrated with external systems for logging, monitoring, and analytics.

### Logging Frameworks

#### Log4j Integration

```java
import org.apache.log4j.Logger;
import com.neurallog.log4j.NeuralLogAppender;

// Configure Log4j
Logger logger = Logger.getLogger(MyClass.class);
NeuralLogAppender appender = new NeuralLogAppender();
appender.setServerUrl("http://localhost:3030");
appender.setAuthUrl("http://localhost:3040");
appender.setApiKey("your-api-key");
appender.setTenantId("default");
appender.setLogName("application-logs");
logger.addAppender(appender);

// Log messages
logger.info("User logged in");
logger.error("Database connection failed", new Exception("Connection refused"));
```

#### Winston Integration

```typescript
import winston from 'winston';
import { NeuralLogTransport } from '@neurallog/winston-transport';

// Configure Winston
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new NeuralLogTransport({
      serverUrl: 'http://localhost:3030',
      authUrl: 'http://localhost:3040',
      apiKey: 'your-api-key',
      tenantId: 'default',
      logName: 'application-logs'
    })
  ]
});

// Log messages
logger.info('User logged in');
logger.error('Database connection failed', { error: 'Connection refused' });
```

### Monitoring Systems

#### Prometheus Integration

The NeuralLog Log Server exposes metrics for Prometheus:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'neurallog-log-server'
    scrape_interval: 15s
    static_configs:
      - targets: ['log-server:3030']
```

#### Grafana Dashboard

You can create a Grafana dashboard to visualize the metrics:

```json
{
  "dashboard": {
    "id": null,
    "title": "NeuralLog Log Server",
    "tags": ["neurallog", "logs"],
    "timezone": "browser",
    "schemaVersion": 16,
    "version": 0,
    "refresh": "5s",
    "panels": [
      {
        "title": "Log Entries",
        "type": "graph",
        "datasource": "Prometheus",
        "targets": [
          {
            "expr": "neurallog_log_entries_total",
            "legendFormat": "Total Log Entries"
          }
        ]
      },
      {
        "title": "API Requests",
        "type": "graph",
        "datasource": "Prometheus",
        "targets": [
          {
            "expr": "neurallog_api_requests_total",
            "legendFormat": "Total API Requests"
          }
        ]
      }
    ]
  }
}
```

### Analytics Platforms

#### Elasticsearch Integration

You can integrate the NeuralLog Log Server with Elasticsearch for advanced analytics:

```typescript
import { NeuralLogClient } from '@neurallog/client-sdk';
import { Client } from '@elastic/elasticsearch';

// Create NeuralLog client
const neuralLog = new NeuralLogClient({
  serverUrl: 'http://localhost:3030',
  authUrl: 'http://localhost:3040',
  tenantId: 'default'
});

// Create Elasticsearch client
const elasticsearch = new Client({
  node: 'http://localhost:9200'
});

// Sync logs to Elasticsearch
async function syncLogsToElasticsearch() {
  // Get logs from NeuralLog
  const logs = await neuralLog.getLogs('application-logs');
  
  // Index logs in Elasticsearch
  for (const log of logs) {
    await elasticsearch.index({
      index: 'neurallog-logs',
      body: log
    });
  }
}

// Run sync every hour
setInterval(syncLogsToElasticsearch, 3600000);
```

## Multi-Tenant Integration

The NeuralLog Log Server supports multi-tenant integration through namespaces:

### Tenant Isolation

Each tenant has its own namespace for logs:

```typescript
import { NeuralLogClient } from '@neurallog/client-sdk';

// Create a client for tenant1
const tenant1Client = new NeuralLogClient({
  serverUrl: 'http://localhost:3030',
  authUrl: 'http://localhost:3040',
  tenantId: 'tenant1'
});

// Create a client for tenant2
const tenant2Client = new NeuralLogClient({
  serverUrl: 'http://localhost:3030',
  authUrl: 'http://localhost:3040',
  tenantId: 'tenant2'
});

// Log data for tenant1
await tenant1Client.log('application-logs', {
  level: 'info',
  message: 'User logged in',
  userId: '123',
  timestamp: new Date().toISOString()
});

// Log data for tenant2
await tenant2Client.log('application-logs', {
  level: 'info',
  message: 'User logged in',
  userId: '456',
  timestamp: new Date().toISOString()
});
```

### Tenant-Specific Storage

You can configure different storage adapters for different tenants:

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

## Kubernetes Integration

The NeuralLog Log Server can be deployed in Kubernetes for scalability and high availability:

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

### Ingress

```yaml
# log-server-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: log-server-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
  - host: logs.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: log-server-service
            port:
              number: 3030
```

## CI/CD Integration

The NeuralLog Log Server can be integrated into CI/CD pipelines for automated testing and deployment:

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy Log Server

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    
    - name: Set up Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '16'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build
      run: npm run build
    
    - name: Run tests
      run: npm test
    
    - name: Build and push Docker image
      uses: docker/build-push-action@v2
      with:
        context: .
        push: true
        tags: neurallog/log-server:latest
    
    - name: Deploy to Kubernetes
      uses: steebchen/kubectl@v2
      with:
        config: ${{ secrets.KUBE_CONFIG_DATA }}
        command: apply -f k8s/log-server-deployment.yaml
```

### Jenkins Pipeline

```groovy
// Jenkinsfile
pipeline {
  agent {
    docker {
      image 'node:16'
    }
  }
  
  stages {
    stage('Build') {
      steps {
        sh 'npm ci'
        sh 'npm run build'
      }
    }
    
    stage('Test') {
      steps {
        sh 'npm test'
      }
    }
    
    stage('Docker Build') {
      steps {
        sh 'docker build -t neurallog/log-server:latest .'
      }
    }
    
    stage('Docker Push') {
      steps {
        withCredentials([string(credentialsId: 'docker-hub-token', variable: 'DOCKER_HUB_TOKEN')]) {
          sh 'docker login -u neurallog -p ${DOCKER_HUB_TOKEN}'
          sh 'docker push neurallog/log-server:latest'
        }
      }
    }
    
    stage('Deploy') {
      steps {
        withCredentials([file(credentialsId: 'kubeconfig', variable: 'KUBECONFIG')]) {
          sh 'kubectl apply -f k8s/log-server-deployment.yaml'
        }
      }
    }
  }
}
```

## Security Integration

The NeuralLog Log Server can be integrated with security tools and practices:

### HTTPS Configuration

```yaml
# docker-compose.yml
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
    volumes:
      - ./certs:/certs
    command: ["node", "dist/server.js", "--https", "--cert", "/certs/server.crt", "--key", "/certs/server.key"]
```

### Security Headers

The NeuralLog Log Server includes security headers by default:

- **Content-Security-Policy**: Prevents XSS attacks
- **X-Content-Type-Options**: Prevents MIME type sniffing
- **X-Frame-Options**: Prevents clickjacking
- **X-XSS-Protection**: Provides XSS protection for older browsers
- **Strict-Transport-Security**: Enforces HTTPS

### Rate Limiting

The NeuralLog Log Server includes rate limiting to prevent abuse:

```env
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=100
```

### Audit Logging

You can enable audit logging to track security-related events:

```env
AUDIT_LOGGING=true
AUDIT_LOG_PATH=/var/log/neurallog/audit.log
```

## Conclusion

The NeuralLog Log Server is designed to integrate seamlessly with other components of the NeuralLog ecosystem and external systems. By following the guidelines in this document, you can integrate the Log Server into your infrastructure and workflows.

For more information, refer to the other documentation:

- [Architecture](./architecture.md)
- [API Reference](./api.md)
- [Configuration Guide](./configuration.md)
- [Storage Adapters](./storage-adapters.md)
- [Zero-Knowledge Architecture](./zero-knowledge.md)
- [Getting Started](./getting-started.md)
