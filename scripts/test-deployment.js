#!/usr/bin/env node

/**
 * Deployment Test Script
 * Tests if the build output is ready for deployment
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Testing deployment readiness...\n');

// Check if dist directory exists
const distPath = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(distPath)) {
  console.error('❌ dist directory not found. Run `npm run build` first.');
  process.exit(1);
}

console.log('✅ dist directory exists');

// Check if index.html exists
const indexPath = path.join(distPath, 'index.html');
if (!fs.existsSync(indexPath)) {
  console.error('❌ index.html not found in dist directory');
  process.exit(1);
}

console.log('✅ index.html exists');

// Check if assets directory exists
const assetsPath = path.join(distPath, 'assets');
if (!fs.existsSync(assetsPath)) {
  console.error('❌ assets directory not found in dist directory');
  process.exit(1);
}

console.log('✅ assets directory exists');

// Check if API directory exists (for Vercel Edge Functions)
const apiPath = path.join(__dirname, '..', 'api');
if (!fs.existsSync(apiPath)) {
  console.error('❌ api directory not found');
  process.exit(1);
}

console.log('✅ api directory exists');

// Check if LLM proxy exists
const proxyPath = path.join(apiPath, 'llm-proxy', 'index.ts');
if (!fs.existsSync(proxyPath)) {
  console.error('❌ LLM proxy not found at api/llm-proxy/index.ts');
  process.exit(1);
}

console.log('✅ LLM proxy exists');

// Check if vercel.json exists
const vercelConfigPath = path.join(__dirname, '..', 'vercel.json');
if (!fs.existsSync(vercelConfigPath)) {
  console.error('❌ vercel.json not found');
  process.exit(1);
}

console.log('✅ vercel.json exists');

// Validate vercel.json
try {
  const vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));
  
  if (!vercelConfig.builds || !Array.isArray(vercelConfig.builds)) {
    console.error('❌ vercel.json missing builds configuration');
    process.exit(1);
  }
  
  if (!vercelConfig.routes || !Array.isArray(vercelConfig.routes)) {
    console.error('❌ vercel.json missing routes configuration');
    process.exit(1);
  }
  
  console.log('✅ vercel.json is valid');
} catch (error) {
  console.error('❌ vercel.json is not valid JSON:', error.message);
  process.exit(1);
}

// Get build stats
const stats = fs.statSync(distPath);
const files = fs.readdirSync(distPath);

console.log('\n📊 Build Statistics:');
console.log(`- Build directory: ${distPath}`);
console.log(`- Files in dist: ${files.length}`);
console.log(`- Build size: ${(getDirSize(distPath) / 1024 / 1024).toFixed(2)} MB`);

console.log('\n🚀 Deployment readiness: PASSED');
console.log('\n✅ All checks passed! The project is ready for deployment.');

function getDirSize(dirPath) {
  let size = 0;
  const files = fs.readdirSync(dirPath);
  
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      size += getDirSize(filePath);
    } else {
      size += stat.size;
    }
  }
  
  return size;
}