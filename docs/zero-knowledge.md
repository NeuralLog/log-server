# Zero-Knowledge Architecture in NeuralLog Log Server

This document explains the zero-knowledge architecture implemented in the NeuralLog Log Server, focusing on how it ensures data privacy and security while still providing powerful logging capabilities.

## Overview

NeuralLog's zero-knowledge architecture ensures that sensitive log data remains encrypted end-to-end, with the server never having access to unencrypted data or encryption keys. This is achieved through client-side encryption, client-side decryption, and searchable encryption.

## Key Concepts

### Zero-Knowledge Architecture

In a zero-knowledge architecture:

1. **Data is encrypted client-side** before being sent to the server
2. **Encryption keys never leave the client**
3. **The server stores only encrypted data**
4. **Data is decrypted client-side** after being retrieved from the server
5. **The server can never access unencrypted data**

### End-to-End Encryption

End-to-end encryption ensures that:

1. **Data is encrypted at the source** (the client that generates the log)
2. **Data remains encrypted in transit** (during transmission to the server)
3. **Data remains encrypted at rest** (when stored on the server)
4. **Data is decrypted only at the destination** (the client that views the log)

### Searchable Encryption

Searchable encryption allows:

1. **Searching encrypted data without decrypting it**
2. **Generating search tokens client-side**
3. **Matching search tokens against indexed tokens server-side**
4. **Retrieving encrypted results that match the search criteria**

## Implementation in NeuralLog Log Server

### Server-Side Implementation

The NeuralLog Log Server is designed to work with encrypted data without ever needing to decrypt it:

#### Encrypted Log Names

Log names are encrypted client-side before being sent to the server:

```typescript
// Server-side code (simplified)
// The server receives and stores the encrypted log name without decrypting it
async storeLogEntry(logId: string, encryptedLogName: string, encryptedData: any, searchTokens?: string[]): Promise<void> {
  // Store the encrypted log name and data
  // The server never attempts to decrypt the log name
}
```

#### Encrypted Log Data

Log data is encrypted client-side before being sent to the server:

```typescript
// Server-side code (simplified)
// The server receives and stores the encrypted data without decrypting it
async storeLogEntry(logId: string, encryptedLogName: string, encryptedData: any, searchTokens?: string[]): Promise<void> {
  // Store the encrypted data
  // The server never attempts to decrypt the data
}
```

#### Search Token Indexing

Search tokens are generated client-side and indexed on the server:

```typescript
// Server-side code (simplified)
// The server indexes the search tokens without knowing what they represent
async indexSearchTokens(encryptedLogName: string, logId: string, searchTokens: string[]): Promise<void> {
  for (const token of searchTokens) {
    // Index the token for this log entry
    await this.addTokenToIndex(encryptedLogName, token, logId);
  }
}
```

#### Search Token Matching

Search is performed by matching tokens without decrypting the data:

```typescript
// Server-side code (simplified)
// The server matches search tokens against indexed tokens without decrypting anything
async searchLogsByToken(token: string, limit: number = 100): Promise<Array<{logName: string; entry: any}>> {
  // Find log entries that match the token
  const matchingEntries = await this.findEntriesByToken(token, limit);
  
  // Return the encrypted entries
  // The server never attempts to decrypt the entries
  return matchingEntries;
}
```

### Client-Side Implementation

The NeuralLog Client SDK handles all encryption and decryption operations:

#### Key Hierarchy

The client maintains a key hierarchy for encryption and decryption:

```typescript
// Client-side code (simplified)
class KeyHierarchy {
  private masterSecret: Uint8Array;
  
  constructor(masterSecret: string) {
    this.masterSecret = base64ToArrayBuffer(masterSecret);
  }
  
  // Derive tenant key from master secret
  async deriveTenantKey(tenantId: string): Promise<Uint8Array> {
    return await deriveKey(this.masterSecret, `tenant:${tenantId}`, new Uint8Array(32));
  }
  
  // Derive log encryption key from tenant key
  async deriveLogEncryptionKey(tenantId: string, logName: string): Promise<Uint8Array> {
    const tenantKey = await this.deriveTenantKey(tenantId);
    return await deriveKey(tenantKey, `log:${logName}:encryption`, new Uint8Array(32));
  }
  
  // Derive log search key from tenant key
  async deriveLogSearchKey(tenantId: string, logName: string): Promise<Uint8Array> {
    const tenantKey = await this.deriveTenantKey(tenantId);
    return await deriveKey(tenantKey, `log:${logName}:search`, new Uint8Array(32));
  }
}
```

#### Log Name Encryption

Log names are encrypted client-side:

```typescript
// Client-side code (simplified)
async encryptLogName(logName: string, tenantId: string): Promise<string> {
  // Derive tenant key
  const tenantKey = await keyHierarchy.deriveTenantKey(tenantId);
  
  // Encrypt the log name
  const encryptedLogName = await encrypt(logName, tenantKey);
  
  return encryptedLogName;
}
```

#### Log Data Encryption

Log data is encrypted client-side:

```typescript
// Client-side code (simplified)
async encryptLogData(logName: string, data: any, tenantId: string): Promise<any> {
  // Derive log encryption key
  const encryptionKey = await keyHierarchy.deriveLogEncryptionKey(tenantId, logName);
  
  // Encrypt the log data
  const encryptedData = await encrypt(JSON.stringify(data), encryptionKey);
  
  return encryptedData;
}
```

#### Search Token Generation

Search tokens are generated client-side:

```typescript
// Client-side code (simplified)
async generateSearchTokens(logName: string, data: any, tenantId: string): Promise<string[]> {
  // Derive log search key
  const searchKey = await keyHierarchy.deriveLogSearchKey(tenantId, logName);
  
  // Extract searchable fields from data
  const searchableFields = extractSearchableFields(data);
  
  // Generate tokens for each searchable field
  const tokens: string[] = [];
  for (const field of searchableFields) {
    const token = await generateToken(field, searchKey);
    tokens.push(token);
  }
  
  return tokens;
}
```

#### Log Appending

Logs are encrypted and tokenized client-side before being sent to the server:

```typescript
// Client-side code (simplified)
async appendToLog(logName: string, data: any): Promise<string> {
  // Encrypt the log name
  const encryptedLogName = await this.encryptLogName(logName, this.tenantId);
  
  // Encrypt the log data
  const encryptedData = await this.encryptLogData(logName, data, this.tenantId);
  
  // Generate search tokens
  const searchTokens = await this.generateSearchTokens(logName, data, this.tenantId);
  
  // Send to server
  const response = await fetch(`${this.serverUrl}/api/logs/${encryptedLogName}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`
    },
    body: JSON.stringify({
      data: encryptedData,
      searchTokens
    })
  });
  
  const result = await response.json();
  return result.logId;
}
```

#### Log Retrieval and Decryption

Logs are retrieved encrypted and decrypted client-side:

```typescript
// Client-side code (simplified)
async getLogEntries(logName: string, limit: number = 100): Promise<any[]> {
  // Encrypt the log name
  const encryptedLogName = await this.encryptLogName(logName, this.tenantId);
  
  // Retrieve encrypted logs from server
  const response = await fetch(`${this.serverUrl}/api/logs/${encryptedLogName}?limit=${limit}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${this.token}`
    }
  });
  
  const result = await response.json();
  
  // Decrypt each log entry
  const decryptedEntries = [];
  for (const entry of result.entries) {
    // Derive log encryption key
    const encryptionKey = await keyHierarchy.deriveLogEncryptionKey(this.tenantId, logName);
    
    // Decrypt the log data
    const decryptedData = await decrypt(entry.data, encryptionKey);
    
    decryptedEntries.push({
      id: entry.id,
      timestamp: entry.timestamp,
      data: JSON.parse(decryptedData)
    });
  }
  
  return decryptedEntries;
}
```

#### Search

Search is performed by generating tokens client-side and matching them server-side:

```typescript
// Client-side code (simplified)
async searchLogs(query: string, logName?: string, limit: number = 100): Promise<any[]> {
  // Derive log search key
  const searchKey = await keyHierarchy.deriveLogSearchKey(this.tenantId, logName || '');
  
  // Generate search token
  const searchToken = await generateToken(query, searchKey);
  
  // Encrypt the log name if provided
  let encryptedLogName;
  if (logName) {
    encryptedLogName = await this.encryptLogName(logName, this.tenantId);
  }
  
  // Search logs on server
  const response = await fetch(`${this.serverUrl}/api/search?token=${searchToken}&logName=${encryptedLogName || ''}&limit=${limit}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${this.token}`
    }
  });
  
  const result = await response.json();
  
  // Decrypt each log entry
  const decryptedResults = [];
  for (const item of result.results) {
    // Decrypt the log name
    const decryptedLogName = await this.decryptLogName(item.logName, this.tenantId);
    
    // Derive log encryption key
    const encryptionKey = await keyHierarchy.deriveLogEncryptionKey(this.tenantId, decryptedLogName);
    
    // Decrypt the log data
    const decryptedData = await decrypt(item.entry.data, encryptionKey);
    
    decryptedResults.push({
      logName: decryptedLogName,
      id: item.entry.id,
      timestamp: item.entry.timestamp,
      data: JSON.parse(decryptedData)
    });
  }
  
  return decryptedResults;
}
```

## Security Considerations

### Key Management

The NeuralLog Client SDK implements secure key management:

- **Master Secret**: The root key for the key hierarchy, never sent to the server
- **Tenant Key**: Derived from the master secret and tenant ID, used to encrypt log names
- **Log Encryption Key**: Derived from the tenant key and log name, used to encrypt log data
- **Log Search Key**: Derived from the tenant key and log name, used to generate search tokens

### Authentication and Authorization

The NeuralLog Log Server integrates with the NeuralLog Auth Service for authentication and authorization:

- **Token Authentication**: JWT tokens issued by the Auth Service
- **API Key Authentication**: API keys issued by the Auth Service
- **Resource-Specific Tokens**: Tokens with limited scope for specific resources

### Data Protection

The NeuralLog Log Server implements several data protection measures:

- **Zero-Knowledge Architecture**: The server never has access to unencrypted data
- **End-to-End Encryption**: Data is encrypted from source to destination
- **Searchable Encryption**: Search is performed without decrypting data
- **Namespace Isolation**: Data is logically isolated by namespace

## Limitations

The zero-knowledge architecture has some limitations:

- **Limited Search Capabilities**: Search is limited to exact matches on indexed tokens
- **Performance Overhead**: Client-side encryption and decryption add some performance overhead
- **Key Management Complexity**: The key hierarchy adds complexity to the system
- **No Server-Side Processing**: The server cannot process or analyze the log data

## Best Practices

When using the NeuralLog Log Server with its zero-knowledge architecture, follow these best practices:

### Client-Side Security

- **Protect the Master Secret**: The master secret is the root of the key hierarchy and must be protected
- **Use Secure Storage**: Store the master secret in secure storage (e.g., secure enclave, HSM)
- **Limit Key Exposure**: Minimize the exposure of encryption keys in memory

### Server-Side Security

- **Use HTTPS**: Always use HTTPS to protect data in transit
- **Enable Authentication**: Always enable authentication to protect access to the API
- **Use Resource-Specific Tokens**: Use resource-specific tokens with limited scope
- **Implement Rate Limiting**: Protect against brute force attacks with rate limiting

### Search Optimization

- **Index Important Fields**: Generate search tokens for important fields to enable searching
- **Limit Token Size**: Keep search tokens small to improve performance
- **Use Specific Queries**: Use specific search queries to reduce the number of results

## Integration with NeuralLog Client SDK

The NeuralLog Client SDK handles all the complexity of the zero-knowledge architecture:

```typescript
// Example usage of the NeuralLog Client SDK
import { NeuralLogClient } from '@neurallog/client-sdk';

// Create a client
const client = new NeuralLogClient({
  serverUrl: 'https://logs.example.com',
  authUrl: 'https://auth.example.com',
  tenantId: 'tenant1'
});

// Authenticate
await client.authenticateWithPassword('username', 'password');

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

## Conclusion

The NeuralLog Log Server's zero-knowledge architecture provides a secure way to store and retrieve logs while ensuring that sensitive data remains private. By implementing client-side encryption, client-side decryption, and searchable encryption, the server can provide powerful logging capabilities without ever having access to unencrypted data.

This architecture is particularly valuable for organizations that handle sensitive data and need to ensure that their logging system does not become a security liability. By keeping encryption keys client-side and storing only encrypted data server-side, the NeuralLog Log Server provides a high level of security while still enabling essential logging functionality.
