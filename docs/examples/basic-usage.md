# Basic Usage Example

This example demonstrates the basic usage of NeuralLog Neurallog-log-server.

## Prerequisites

- Node.js 18 or later
- NeuralLog Neurallog-log-server installed

## Installation

```bash
npm install @neurallog/neurallog-log-server
```

## Example Code

```javascript
// Import the component
const { Component } = require('@neurallog/neurallog-log-server');

// Create an instance with configuration
const component = new Component({
  option1: 'value1',
  option2: 42
});

// Initialize the component
async function initialize() {
  try {
    await component.initialize();
    console.log('Component initialized successfully');
    
    // Use the component
    const result = await component.doSomething('input');
    console.log('Result:', result);
    
    // Clean up
    await component.cleanup();
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the example
initialize();
```

## Step-by-Step Explanation

1. **Import the Component**:
   ```javascript
   const { Component } = require('@neurallog/neurallog-log-server');
   ```
   This imports the main component class from the package.

2. **Create an Instance**:
   ```javascript
   const component = new Component({
     option1: 'value1',
     option2: 42
   });
   ```
   This creates a new instance of the component with the specified configuration options.

3. **Initialize the Component**:
   ```javascript
   await component.initialize();
   ```
   This initializes the component, setting up any necessary resources.

4. **Use the Component**:
   ```javascript
   const result = await component.doSomething('input');
   ```
   This demonstrates using the component's functionality.

5. **Clean Up**:
   ```javascript
   await component.cleanup();
   ```
   This cleans up any resources used by the component.

## Expected Output

```
Component initialized successfully
Result: { status: 'success', data: { ... } }
```

## Common Issues and Solutions

### Issue 1: Connection Error

**Problem**: You might see an error like `Connection refused`.

**Solution**: Ensure that the required services are running and accessible.

### Issue 2: Authentication Error

**Problem**: You might see an error like `Authentication failed`.

**Solution**: Check your authentication credentials and ensure they are correct.

## Next Steps

- Try the [Advanced Usage Example](./advanced-usage.md)
- Learn about [Configuration Options](../configuration.md)
- Explore the [API Reference](../api.md)
