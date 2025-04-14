# Getting Started with NeuralLog Log Server

This guide will help you get started with the NeuralLog Log Server, from installation to basic usage.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
  - [Using Docker](#using-docker)
  - [Using npm](#using-npm)
  - [Using Docker Compose](#using-docker-compose)
- [Basic Configuration](#basic-configuration)
- [Running the Server](#running-the-server)
- [Testing the Server](#testing-the-server)
- [Using the API](#using-the-api)
  - [Authentication](#authentication)
  - [Creating Logs](#creating-logs)
  - [Retrieving Logs](#retrieving-logs)
  - [Searching Logs](#searching-logs)
- [Integration with NeuralLog Client SDK](#integration-with-neurallog-client-sdk)
- [Next Steps](#next-steps)

## Prerequisites

Before you begin, make sure you have the following:

- **Node.js**: Version 16 or higher
- **npm**: Version 7 or higher
- **Docker** (optional): For containerized deployment
- **Redis** (optional): For production deployments

## Installation

### Using Docker

The easiest way to get started is with Docker:

```bash
docker pull neurallog/log-server:latest
```

### Using npm

To install and run the server locally:

```bash
# Clone the repository
git clone https://github.com/NeuralLog/log-server.git
cd log-server

# Install dependencies
npm install

# Build the server
npm run build
```

### Using Docker Compose

For a complete setup with Redis:

```bash
# Clone the repository
git clone https://github.com/NeuralLog/log-server.git
cd log-server

# Start with Docker Compose
docker-compose -f docker-compose.redis.yml up -d
```

## Basic Configuration

Create a `.env` file in the project root with the following configuration:

```env
# Server configuration
PORT=3030
LOG_LEVEL=info

# Storage configuration
STORAGE_TYPE=memory  # Use 'memory', 'nedb', or 'redis'

# Authentication configuration
AUTH_SERVICE_URL=http://localhost:3040
SERVER_TOKEN_SECRET=your-secret-key
```

For more configuration options, see the [Configuration Guide](./configuration.md).

## Running the Server

### Using Docker

```bash
docker run -d \
  --name neurallog-log-server \
  -p 3030:3030 \
  -e STORAGE_TYPE=memory \
  -e AUTH_SERVICE_URL=http://host.docker.internal:3040 \
  -e SERVER_TOKEN_SECRET=your-secret-key \
  neurallog/log-server:latest
```

### Using npm

```bash
# Development mode
npm run dev

# Production mode
npm start
```

### Using Docker Compose

```bash
docker-compose -f docker-compose.memory.yml up -d
```

## Testing the Server

Once the server is running, you can test it with a simple health check:

```bash
curl http://localhost:3030/
```

You should receive a response like:

```json
{
  "status": "ok",
  "message": "NeuralLog server is running",
  "version": "1.0.0"
}
```

## Using the API

### Authentication

The NeuralLog Log Server requires authentication for all endpoints except the health check. There are three authentication methods supported:

#### Token Authentication

```bash
curl -X GET http://localhost:3030/api/logs \
  -H "Authorization: Bearer <token>"
```

#### API Key Authentication

```bash
curl -X GET http://localhost:3030/api/logs \
  -H "X-API-Key: <api_key>"
```

### Creating Logs

To create a log entry, you need to send a POST request to the `/api/logs/:logName` endpoint:

```bash
curl -X PATCH http://localhost:3030/api/logs/application-logs \
  -H "X-API-Key: <api_key>" \
  -H "Content-Type: application/json" \
  -d '{
    "level": "info",
    "message": "User logged in",
    "userId": "123",
    "timestamp": "2023-01-01T00:00:00.000Z"
  }'
```

> **Note**: In a zero-knowledge architecture, the data should be encrypted client-side before being sent to the server. The example above shows unencrypted data for simplicity.

### Retrieving Logs

To retrieve logs, you need to send a GET request to the `/api/logs/:logName` endpoint:

```bash
curl -X GET http://localhost:3030/api/logs/application-logs \
  -H "X-API-Key: <api_key>"
```

### Searching Logs

To search logs, you need to send a GET request to the `/api/search` endpoint:

```bash
curl -X GET "http://localhost:3030/api/search?query=error&logName=application-logs" \
  -H "X-API-Key: <api_key>"
```

> **Note**: In a zero-knowledge architecture, search is performed using searchable encryption. The example above shows a simplified search for demonstration purposes.

## Integration with NeuralLog Client SDK

The NeuralLog Client SDK provides a convenient way to interact with the Log Server while handling encryption and decryption automatically:

### TypeScript/JavaScript

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

### Java

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

## Next Steps

Now that you have the NeuralLog Log Server up and running, you can:

1. **Configure for Production**: Set up Redis storage and proper security settings for production deployments
2. **Integrate with Your Application**: Use the NeuralLog Client SDK to integrate with your application
3. **Set Up Monitoring**: Monitor the server's performance and health
4. **Explore Advanced Features**: Learn about advanced features like searchable encryption and namespaced storage

For more information, refer to the other documentation:

- [Architecture](./architecture.md)
- [API Reference](./api.md)
- [Configuration Guide](./configuration.md)
- [Storage Adapters](./storage-adapters.md)
- [Zero-Knowledge Architecture](./zero-knowledge.md)

## Troubleshooting

### Common Issues

#### Server Won't Start

If the server won't start, check:

1. The port is not already in use
2. You have the correct permissions
3. All required environment variables are set

#### Authentication Errors

If you're getting authentication errors:

1. Verify the `AUTH_SERVICE_URL` is correct
2. Ensure the `SERVER_TOKEN_SECRET` matches the Auth Service
3. Check that your tokens or API keys are valid

#### Storage Errors

If you're experiencing storage errors:

1. For NeDB, ensure the `DB_PATH` directory exists and is writable
2. For Redis, verify the Redis connection parameters
3. For memory storage, check for memory leaks

### Getting Help

If you need help, you can:

1. Check the [GitHub repository](https://github.com/NeuralLog/log-server) for issues and discussions
2. Join the NeuralLog community on [Discord](https://discord.gg/neurallog)
3. Contact the NeuralLog team at support@neurallog.com

## Examples

### Basic Example

```typescript
import { NeuralLogClient } from '@neurallog/client-sdk';

async function main() {
  // Create a client
  const client = new NeuralLogClient({
    serverUrl: 'http://localhost:3030',
    authUrl: 'http://localhost:3040',
    tenantId: 'default'
  });

  // Authenticate
  await client.authenticateWithApiKey('your-api-key');

  // Log data
  await client.log('application-logs', {
    level: 'info',
    message: 'Application started',
    timestamp: new Date().toISOString()
  });

  console.log('Log entry created');
}

main().catch(console.error);
```

### Express Middleware Example

```typescript
import express from 'express';
import { NeuralLogClient } from '@neurallog/client-sdk';

const app = express();
const port = 3000;

// Create a NeuralLog client
const neuralLog = new NeuralLogClient({
  serverUrl: 'http://localhost:3030',
  authUrl: 'http://localhost:3040',
  tenantId: 'default'
});

// Authenticate
neuralLog.authenticateWithApiKey('your-api-key');

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  // Log request
  neuralLog.log('api-logs', {
    level: 'info',
    method: req.method,
    path: req.path,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });
  
  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    neuralLog.log('api-logs', {
      level: res.statusCode >= 400 ? 'error' : 'info',
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      timestamp: new Date().toISOString()
    });
  });
  
  next();
});

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
```

### React Application Example

```typescript
import React, { useEffect } from 'react';
import { NeuralLogClient } from '@neurallog/client-sdk';

// Create a NeuralLog client
const neuralLog = new NeuralLogClient({
  serverUrl: 'http://localhost:3030',
  authUrl: 'http://localhost:3040',
  tenantId: 'default'
});

// Authenticate
neuralLog.authenticateWithApiKey('your-api-key');

function App() {
  useEffect(() => {
    // Log application start
    neuralLog.log('application-logs', {
      level: 'info',
      message: 'Application started',
      timestamp: new Date().toISOString()
    });
    
    // Log errors
    const originalConsoleError = console.error;
    console.error = (...args) => {
      // Log the error
      neuralLog.log('application-logs', {
        level: 'error',
        message: args.join(' '),
        timestamp: new Date().toISOString()
      });
      
      // Call the original console.error
      originalConsoleError.apply(console, args);
    };
    
    // Clean up
    return () => {
      console.error = originalConsoleError;
    };
  }, []);
  
  return (
    <div className="App">
      <h1>Hello World</h1>
    </div>
  );
}

export default App;
```

## Conclusion

You now have a basic understanding of how to install, configure, and use the NeuralLog Log Server. As you become more familiar with the system, you can explore advanced features and integrate it more deeply with your applications.

Remember that the NeuralLog Log Server is designed with a zero-knowledge architecture, which means that all sensitive data should be encrypted client-side before being sent to the server. The NeuralLog Client SDK handles this automatically, so it's recommended to use it for integration with your applications.
