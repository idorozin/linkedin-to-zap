#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load environment variables from .env file if it exists
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envLines = envContent.split('\n');
  
  envLines.forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      if (key && valueParts.length > 0) {
        process.env[key] = valueParts.join('=');
      }
    }
  });
}

// Get configuration values from environment variables or use defaults
const config = {
  ZAPIER_WEBHOOK_URL: process.env.ZAPIER_WEBHOOK_URL,
  DEBUG_MODE: process.env.DEBUG_MODE === 'true' || false,
  APP_NAME: 'Profile To Affinity'
};

// Generate the config file content
const configContent = `// config.js

const CONFIG = ${JSON.stringify(config, null, 2)};

// Make it available in global scope for background scripts
self.CONFIG = CONFIG;
`;

// Write the config file
const configPath = path.join(__dirname, '..', 'src', 'config', 'config.js');
const configDir = path.dirname(configPath);

// Create config directory if it doesn't exist
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}

fs.writeFileSync(configPath, configContent);
console.log('Configuration file generated successfully at:', configPath);
console.log('Webhook URL:', config.ZAPIER_WEBHOOK_URL); 