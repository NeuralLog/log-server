# NeuralLog Log Server Storage Adapters

This document provides a detailed overview of the storage adapters available in the NeuralLog Log Server, explaining their features, configuration, and use cases.

## Overview

The NeuralLog Log Server uses a pluggable storage adapter system that allows it to work with different storage backends. This provides flexibility in choosing the right storage solution for your specific needs, from simple in-memory storage for development to scalable Redis storage for production.

## Available Storage Adapters

The NeuralLog Log Server currently supports the following storage adapters:

1. **Memory Storage Adapter**: In-memory storage for development and testing
2. **NeDB Storage Adapter**: File-based storage for small deployments
3. **Redis Storage Adapter**: Scalable, high-performance storage for production deployments

## Storage Adapter Interface

All storage adapters implement the `StorageAdapter` interface, which defines the following methods:

```typescript
interface StorageAdapter {
  // Get the namespace for this storage adapter
  getNamespace(): string;
  
  // Initialize the storage adapter
  initialize(): Promise<void>;
  
  // Store a log entry
  storeLogEntry(logId: string, logName: string, encryptedData: any, searchTokens?: string[]): Promise<void>;
  
  // Get a log entry by ID
  getLogEntry(logName: string, logId: string): Promise<LogEntry | null>;
  
  // Update a log entry by ID
  updateLogEntry(logName: string, logId: string, encryptedData: any, searchTokens?: string[]): Promise<void>;
  
  // Delete a log entry by ID
  deleteLogEntry(logName: string, logId: string): Promise<void>;
  
  // Get all log entries for a specific log
  getLogEntries(logName: string, limit?: number): Promise<LogEntry[]>;
  
  // Get all log names
  getLogNames(): Promise<string[]>;
  
  // Clear all entries for a specific log
  clearLog(logName: string): Promise<void>;
  
  // Search logs based on various criteria
  searchLogs(options: SearchOptions): Promise<Array<{logName: string; entry: any}>>;
  
  // Get aggregate statistics for all logs
  getAggregateStatistics(): Promise<AggregateStatistics>;
  
  // Get statistics for a specific log
  getLogStatistics(logName: string): Promise<LogStatistics | null>;
  
  // Close the storage adapter
  close(): Promise<void>;
}
```

## Memory Storage Adapter

The Memory Storage Adapter stores all data in memory, making it fast but non-persistent. It's ideal for development and testing environments.

### Features

- In-memory storage for fast access
- No persistence across server restarts
- Simple implementation with no external dependencies
- Suitable for development and testing

### Configuration

The Memory Storage Adapter requires minimal configuration:

```typescript
const memoryAdapter = new MemoryStorageAdapter('default');
```

Where `'default'` is the namespace for the adapter.

### Implementation Details

The Memory Storage Adapter uses JavaScript Maps to store data in memory:

- `logs`: A Map of log names to arrays of log entries
- `statistics`: An object containing aggregate statistics

### Example Usage

```typescript
import { MemoryStorageAdapter } from './storage/MemoryStorageAdapter';

// Create a memory storage adapter
const memoryAdapter = new MemoryStorageAdapter('default');

// Initialize the adapter
await memoryAdapter.initialize();

// Store a log entry
await memoryAdapter.storeLogEntry('log_123', 'application-logs', {
  level: 'info',
  message: 'User logged in',
  userId: '123',
  timestamp: new Date().toISOString()
});

// Get log entries
const entries = await memoryAdapter.getLogEntries('application-logs', 10);

// Close the adapter
await memoryAdapter.close();
```

## NeDB Storage Adapter

The NeDB Storage Adapter uses the NeDB embedded database to store data on disk, providing persistence across server restarts. It's suitable for small deployments or development environments.

### Features

- File-based storage for persistence
- No external database required
- Good performance for small to medium datasets
- Suitable for small production deployments or development

### Configuration

The NeDB Storage Adapter requires a path to the database directory:

```typescript
const nedbAdapter = new NeDBStorageAdapter('default', '/path/to/db');
```

Where `'default'` is the namespace for the adapter and `'/path/to/db'` is the path to the database directory.

### Implementation Details

The NeDB Storage Adapter uses NeDB to store data on disk:

- `_logsDb`: A NeDB database for storing log entries
- `_statsDb`: A NeDB database for storing statistics

The adapter creates a directory structure based on the namespace:

```
/path/to/db/
  └── logserver/
      └── default/
          ├── logs.db
          └── stats.db
```

### Example Usage

```typescript
import { NeDBStorageAdapter } from './storage/NeDBStorageAdapter';

// Create a NeDB storage adapter
const nedbAdapter = new NeDBStorageAdapter('default', '/path/to/db');

// Initialize the adapter
await nedbAdapter.initialize();

// Store a log entry
await nedbAdapter.storeLogEntry('log_123', 'application-logs', {
  level: 'info',
  message: 'User logged in',
  userId: '123',
  timestamp: new Date().toISOString()
});

// Get log entries
const entries = await nedbAdapter.getLogEntries('application-logs', 10);

// Close the adapter
await nedbAdapter.close();
```

## Redis Storage Adapter

The Redis Storage Adapter uses Redis to store data, providing high performance and scalability. It's suitable for production deployments with high traffic.

### Features

- Scalable, high-performance storage
- Support for clustering and replication
- Excellent performance for large datasets
- Suitable for production environments

### Configuration

The Redis Storage Adapter requires Redis connection options:

```typescript
const redisAdapter = new RedisStorageAdapter('default', {
  host: 'localhost',
  port: 6379,
  password: 'password',
  db: 0
});
```

Where `'default'` is the namespace for the adapter and the options object contains Redis connection parameters.

Alternatively, you can provide a Redis URL:

```typescript
const redisAdapter = new RedisStorageAdapter('default', {
  url: 'redis://username:password@localhost:6379/0'
});
```

### Implementation Details

The Redis Storage Adapter uses the ioredis library to connect to Redis:

- Log entries are stored as JSON strings with keys like `logserver:default:log:application-logs:log_123`
- Log names are stored in a set with key `logserver:default:lognames`
- Log entries for a specific log are stored in a sorted set with key `logserver:default:logentries:application-logs`
- Statistics are stored as JSON strings with keys like `logserver:default:stats:global` and `logserver:default:stats:application-logs`
- Search tokens are indexed in sets with keys like `logserver:default:token:application-logs:token1`

### Example Usage

```typescript
import { RedisStorageAdapter } from './storage/RedisStorageAdapter';

// Create a Redis storage adapter
const redisAdapter = new RedisStorageAdapter('default', {
  host: 'localhost',
  port: 6379,
  password: 'password',
  db: 0
});

// Initialize the adapter
await redisAdapter.initialize();

// Store a log entry
await redisAdapter.storeLogEntry('log_123', 'application-logs', {
  level: 'info',
  message: 'User logged in',
  userId: '123',
  timestamp: new Date().toISOString()
});

// Get log entries
const entries = await redisAdapter.getLogEntries('application-logs', 10);

// Close the adapter
await redisAdapter.close();
```

## Namespaced Storage Adapter Factory

The NeuralLog Log Server uses a factory pattern to create storage adapters for specific namespaces. This allows for logical isolation of data between different tenants or environments.

### Usage

```typescript
import { NamespacedStorageAdapterFactory } from './storage/NamespacedStorageAdapterFactory';

// Get a storage adapter for a specific namespace
const adapter = NamespacedStorageAdapterFactory.getAdapter('tenant1', {
  type: 'redis',
  redis: {
    host: 'localhost',
    port: 6379
  }
});

// Use the adapter
await adapter.initialize();
const entries = await adapter.getLogEntries('application-logs', 10);
```

### Configuration

The factory can be configured with global options that apply to all adapters:

```typescript
import { NamespacedStorageAdapterFactory } from './storage/NamespacedStorageAdapterFactory';

// Configure the factory
NamespacedStorageAdapterFactory.configure({
  type: 'redis',
  redis: {
    host: 'localhost',
    port: 6379
  }
});

// Get a storage adapter for a specific namespace
const adapter = NamespacedStorageAdapterFactory.getAdapter('tenant1');
```

## Choosing the Right Storage Adapter

The choice of storage adapter depends on your specific needs:

### Memory Storage Adapter

**Use when:**
- You're developing or testing the application
- You don't need persistence across server restarts
- You're working with small datasets
- You want the fastest possible performance

**Not recommended when:**
- You need data persistence
- You're working with large datasets
- You're in a production environment

### NeDB Storage Adapter

**Use when:**
- You need persistence across server restarts
- You don't want to set up an external database
- You're working with small to medium datasets
- You're in a development or small production environment

**Not recommended when:**
- You're working with large datasets
- You need high performance for large datasets
- You need clustering or replication

### Redis Storage Adapter

**Use when:**
- You need high performance for large datasets
- You need clustering or replication
- You're in a production environment with high traffic
- You already have Redis infrastructure

**Not recommended when:**
- You're in a simple development environment
- You don't need the additional complexity
- You're working with very small datasets

## Performance Considerations

When choosing a storage adapter, consider the following performance factors:

### Memory Storage Adapter

- **Read Performance**: Excellent (in-memory access)
- **Write Performance**: Excellent (in-memory access)
- **Search Performance**: Good (in-memory search)
- **Scalability**: Poor (limited by available memory)
- **Persistence**: None (data is lost on server restart)

### NeDB Storage Adapter

- **Read Performance**: Good (file-based access with caching)
- **Write Performance**: Good (file-based access with caching)
- **Search Performance**: Moderate (file-based search with indexing)
- **Scalability**: Moderate (limited by disk I/O)
- **Persistence**: Good (data is stored on disk)

### Redis Storage Adapter

- **Read Performance**: Excellent (in-memory access with persistence)
- **Write Performance**: Excellent (in-memory access with persistence)
- **Search Performance**: Excellent (in-memory search with indexing)
- **Scalability**: Excellent (support for clustering and replication)
- **Persistence**: Excellent (data is stored in Redis with persistence options)

## Docker Deployment

The NeuralLog Log Server provides Docker Compose files for each storage adapter:

### Memory Storage

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
```

### NeDB Storage

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
    volumes:
      - ./data:/data
```

### Redis Storage

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

## Extending the Storage Adapter System

The NeuralLog Log Server's storage adapter system is designed to be extensible. You can create your own storage adapter by implementing the `StorageAdapter` interface.

### Creating a Custom Storage Adapter

```typescript
import { StorageAdapter } from './StorageAdapter';
import { LogEntry, LogStatistics, AggregateStatistics } from '@neurallog/shared';

export class CustomStorageAdapter implements StorageAdapter {
  private namespace: string;
  
  constructor(namespace: string) {
    this.namespace = namespace;
  }
  
  public getNamespace(): string {
    return this.namespace;
  }
  
  public async initialize(): Promise<void> {
    // Initialize your storage
  }
  
  public async storeLogEntry(logId: string, logName: string, encryptedData: any, searchTokens?: string[]): Promise<void> {
    // Store a log entry
  }
  
  // Implement other methods...
}
```

### Registering a Custom Storage Adapter

```typescript
import { StorageAdapterFactory } from './StorageAdapterFactory';
import { CustomStorageAdapter } from './CustomStorageAdapter';

// Register the custom adapter
StorageAdapterFactory.registerAdapter('custom', (namespace, options) => {
  return new CustomStorageAdapter(namespace);
});

// Use the custom adapter
const adapter = StorageAdapterFactory.createAdapter('default', {
  type: 'custom'
});
```

## Conclusion

The NeuralLog Log Server's storage adapter system provides flexibility in choosing the right storage solution for your specific needs. Whether you're developing locally with in-memory storage, deploying a small application with NeDB, or scaling to production with Redis, the storage adapter system has you covered.

By understanding the features, configuration, and use cases of each storage adapter, you can make an informed decision about which one to use for your deployment.
