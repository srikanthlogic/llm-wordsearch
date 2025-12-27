#!/usr/bin/env node

/**
 * Script to verify the complete CI/CD setup for LLM-Wordsearch
 * This script checks all components of the CI/CD pipeline to ensure they're properly configured
 */

const fs = require('fs');
const path = require('path');

// Configuration
const REQUIRED_FILES = [
 '.github/workflows/ci.yml',
  '.github/workflows/release.yml',
  'bruno/send_prompt.bru',
  'bruno/bruno.json',
  '.eslintrc.json',
  'scripts/run-bruno-tests.js',
  'scripts/test-deployment.js',
  'test/integration/api.integration.test.ts',
  'environments/README.md',
  'environments/.env.example',
  'docs/ci-cd-setup.md',
  'package.json'
];

const REQUIRED_PACKAGE_SCRIPTS = [
  'lint',
  'lint:check',
  'test',
  'test:run',
  'test:coverage',
  'test:deploy',
  'build',
  'type-check',
  'version'
];

const REQUIRED_DEV_DEPENDENCIES = [
  'eslint',
  '@typescript-eslint/parser',
  '@typescript-eslint/eslint-plugin',
  'eslint-plugin-react',
  'eslint-plugin-react-hooks',
  'eslint-plugin-jsx-a11y',
  'eslint-plugin-import',
  'eslint-plugin-unused-imports'
];

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type.toUpperCase().padEnd(7);
  console.log(`[${timestamp}] [${prefix}] ${message}`);
}

function error(message) {
  log(message, 'ERROR');
  return false;
}

function success(message) {
  log(message, 'SUCCESS');
  return true;
}

function checkFileExists(filePath) {
  if (fs.existsSync(filePath)) {
    return success(`File exists: ${filePath}`);
  } else {
    return error(`File missing: ${filePath}`);
  }
}

function checkPackageScripts() {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    return error('package.json not found');
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  let allFound = true;

  for (const script of REQUIRED_PACKAGE_SCRIPTS) {
    if (packageJson.scripts && packageJson.scripts[script]) {
      success(`Script found: ${script}`);
    } else {
      allFound = error(`Script missing: ${script}`);
    }
  }

  return allFound;
}

function checkDevDependencies() {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    return error('package.json not found');
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  let allFound = true;

  for (const dep of REQUIRED_DEV_DEPENDENCIES) {
    if (packageJson.devDependencies && packageJson.devDependencies[dep]) {
      success(`Dev dependency found: ${dep}`);
    } else {
      allFound = error(`Dev dependency missing: ${dep}`);
    }
  }

  return allFound;
}

function checkBrunoCollection() {
  const brunoConfigPath = path.join(process.cwd(), 'bruno/bruno.json');
  if (!fs.existsSync(brunoConfigPath)) {
    return error('Bruno config not found');
  }

  const brunoConfig = JSON.parse(fs.readFileSync(brunoConfigPath, 'utf8'));
  
  if (brunoConfig.name === 'LLM Proxy Tests' && brunoConfig.type === 'collection') {
    success('Bruno collection configured correctly');
    return true;
  } else {
    return error('Bruno collection not configured correctly');
  }
}

function checkCIWorkflow() {
  const ciWorkflowPath = path.join(process.cwd(), '.github/workflows/ci.yml');
  if (!fs.existsSync(ciWorkflowPath)) {
    return error('.github/workflows/ci.yml not found');
  }

  const ciWorkflow = fs.readFileSync(ciWorkflowPath, 'utf8');
  
  // Check for required jobs
  const requiredJobs = ['lint-and-type-check', 'test', 'security-audit', 'build', 'integration-test', 'deploy-staging', 'deploy-production'];
  let allJobsFound = true;

  for (const job of requiredJobs) {
    if (ciWorkflow.includes(job)) {
      success(`CI job found: ${job}`);
    } else {
      allJobsFound = error(`CI job missing: ${job}`);
    }
  }

  return allJobsFound;
}

function checkReleaseWorkflow() {
  const releaseWorkflowPath = path.join(process.cwd(), '.github/workflows/release.yml');
  if (!fs.existsSync(releaseWorkflowPath)) {
    return error('.github/workflows/release.yml not found');
  }

  const releaseWorkflow = fs.readFileSync(releaseWorkflowPath, 'utf8');
  
  if (releaseWorkflow.includes('Release') && releaseWorkflow.includes('semantic-release')) {
    success('Release workflow configured correctly');
    return true;
  } else {
    return error('Release workflow not configured correctly');
  }
}

function main() {
  log('Starting CI/CD setup verification...');
  
  let allChecksPassed = true;

  log('\n1. Checking required files...');
  for (const file of REQUIRED_FILES) {
    if (!checkFileExists(file)) {
      allChecksPassed = false;
    }
  }

  log('\n2. Checking package.json scripts...');
  if (!checkPackageScripts()) {
    allChecksPassed = false;
  }

  log('\n3. Checking dev dependencies...');
  if (!checkDevDependencies()) {
    allChecksPassed = false;
  }

  log('\n4. Checking Bruno collection...');
  if (!checkBrunoCollection()) {
    allChecksPassed = false;
  }

  log('\n5. Checking CI workflow...');
  if (!checkCIWorkflow()) {
    allChecksPassed = false;
  }

  log('\n6. Checking release workflow...');
  if (!checkReleaseWorkflow()) {
    allChecksPassed = false;
  }

  log('\n7. Checking documentation...');
  if (checkFileExists('docs/ci-cd-setup.md')) {
    const docContent = fs.readFileSync('docs/ci-cd-setup.md', 'utf8');
    if (docContent.includes('CI/CD Setup Documentation') && docContent.includes('GitHub Actions')) {
      success('Documentation contains expected content');
    } else {
      allChecksPassed = error('Documentation does not contain expected content');
    }
  } else {
    allChecksPassed = false;
  }

  log('\n8. Checking environment templates...');
  if (checkFileExists('environments/README.md') && checkFileExists('environments/.env.example')) {
    success('Environment templates exist');
  } else {
    allChecksPassed = false;
  }

  log('\n' + '='.repeat(50));
  if (allChecksPassed) {
    success('✅ All CI/CD setup checks passed!');
    log('The CI/CD pipeline is properly configured and ready for use.');
    process.exit(0);
  } else {
    error('❌ Some CI/CD setup checks failed!');
    log('Please review the errors above and address them before using the CI/CD pipeline.');
    process.exit(1);
  }
}

// Run the verification
if (require.main === module) {
  main();
}