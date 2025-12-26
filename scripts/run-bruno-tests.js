#!/usr/bin/env node

/**
 * Script to run Bruno API tests locally or in CI
 * This script provides a standardized way to run Bruno collections
 * with proper environment configuration and error handling.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const BRUNO_COLLECTION_PATH = './bruno';
const DEFAULT_ENVIRONMENT = {
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  apiKey: process.env.API_KEY || '',
  model: process.env.MODEL || 'google/gemini-2.5-flash',
  prompt: process.env.PROMPT || 'Test prompt',
  max_tokens: process.env.MAX_TOKENS || '100'
};

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type.toUpperCase().padEnd(7);
  console.log(`[${timestamp}] [${prefix}] ${message}`);
}

function error(message) {
  log(message, 'error');
  process.exit(1);
}

function success(message) {
  log(message, 'success');
}

function checkBrunoInstallation() {
 return new Promise((resolve) => {
    const child = spawn('bruno', ['--version']);
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
    
    child.on('error', () => {
      resolve(false);
    });
  });
}

function createEnvironmentFile(envVars) {
  const envContent = JSON.stringify(envVars, null, 2);
  const envFilePath = path.join(process.cwd(), 'temp-bruno-env.json');
  
  fs.writeFileSync(envFilePath, envContent);
  log(`Created temporary environment file: ${envFilePath}`);
  
  return envFilePath;
}

function runBrunoTests(envFilePath) {
  return new Promise((resolve, reject) => {
    const args = ['run', BRUNO_COLLECTION_PATH, '--env', envFilePath];
    
    log(`Running Bruno tests with command: bruno ${args.join(' ')}`);
    
    const child = spawn('bruno', args, {
      stdio: 'inherit',
      env: { ...process.env }
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        success('Bruno tests completed successfully');
        resolve(code);
      } else {
        error(`Bruno tests failed with exit code: ${code}`);
        reject(new Error(`Bruno tests failed with exit code: ${code}`));
      }
    });
    
    child.on('error', (err) => {
      error(`Failed to start Bruno: ${err.message}`);
      reject(err);
    });
  });
}

async function main() {
  log('Starting Bruno API tests...');
  
  // Check if Bruno CLI is installed
  const isBrunoInstalled = await checkBrunoInstallation();
  if (!isBrunoInstalled) {
    error('Bruno CLI is not installed. Please install it with: npm install -g @usebruno/cli');
  }
  
  // Validate collection path exists
  if (!fs.existsSync(BRUNO_COLLECTION_PATH)) {
    error(`Bruno collection not found at: ${BRUNO_COLLECTION_PATH}`);
  }
  
 // Create temporary environment file
  const envFilePath = createEnvironmentFile(DEFAULT_ENVIRONMENT);
  
  try {
    // Run Bruno tests
    await runBrunoTests(envFilePath);
    
    // Clean up temporary environment file
    fs.unlinkSync(envFilePath);
    log(`Cleaned up temporary environment file: ${envFilePath}`);
    
    success('All Bruno tests completed successfully');
  } catch (err) {
    // Clean up temporary environment file even if tests fail
    if (fs.existsSync(envFilePath)) {
      fs.unlinkSync(envFilePath);
      log(`Cleaned up temporary environment file: ${envFilePath}`);
    }
    
    error(`Bruno tests failed: ${err.message}`);
  }
}

// Run the main function
if (require.main === module) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { main, checkBrunoInstallation, createEnvironmentFile, runBrunoTests };