/**
 * Model Evaluation Script
 *
 * This script:
 * 1. Fetches all free models from OpenRouter
 * 2. Evaluates each model's ability to generate word search puzzles
 * 3. Outputs a filtered list of capable models
 *
 * Usage:
 *   npx tsx scripts/model-evals/index.ts
 *
 * Environment variables:
 *   API_KEY - OpenRouter API key (required)
 *   OUTPUT_DIR - Directory to write results (default: ./eval-results)
 *   MIN_SCORE - Minimum score to pass (default: 50)
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import {
  fetchAllModels,
  filterFreeModels,
  filterUnsuitableModels,
  sortModelsByCapability,
  type OpenRouterModel,
} from './openrouter.js';
import {
  evaluateModels,
  filterPassingModels,
  sortResultsByScore,
  type EvalResult,
} from './evaluator.js';

interface EvalSummary {
  timestamp: string;
  totalModels: number;
  testedModels: number;
  passingModels: number;
  failingModels: number;
  results: EvalResult[];
  passingModelIds: string[];
}

async function main() {
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    console.error('ERROR: API_KEY environment variable is required');
    process.exit(1);
  }

  const outputDir = process.env.OUTPUT_DIR || './eval-results';
  const minScore = parseInt(process.env.MIN_SCORE || '50', 10);

  console.log('='.repeat(60));
  console.log('OpenRouter Model Evaluation for LLM WordSearch');
  console.log('='.repeat(60));
  console.log(`Minimum passing score: ${minScore}`);
  console.log(`Output directory: ${outputDir}`);
  console.log('');

  // Step 1: Fetch all models from OpenRouter
  console.log('Step 1: Fetching models from OpenRouter...');
  let allModels: OpenRouterModel[];
  try {
    allModels = await fetchAllModels(apiKey);
    console.log(`  Found ${allModels.length} total models`);
  } catch (error) {
    console.error(`  ERROR: Failed to fetch models: ${error}`);
    process.exit(1);
  }

  // Step 2: Filter to free models
  console.log('\nStep 2: Filtering to free models...');
  let freeModels = filterFreeModels(allModels);
  console.log(`  Found ${freeModels.length} free models`);

  // Step 3: Filter unsuitable models
  console.log('\nStep 3: Filtering unsuitable models...');
  const suitableModels = filterUnsuitableModels(freeModels);
  console.log(`  Found ${suitableModels.length} suitable models`);
  console.log(`  Filtered out ${freeModels.length - suitableModels.length} unsuitable models`);

  if (suitableModels.length === 0) {
    console.error('ERROR: No suitable models found to evaluate');
    process.exit(1);
  }

  // Sort models by capability (context length)
  const sortedModels = sortModelsByCapability(suitableModels);

  console.log('\n  Models to evaluate:');
  sortedModels.forEach((m, i) => {
    console.log(`    ${i + 1}. ${m.id} (${m.name})`);
  });

  // Step 4: Evaluate each model
  console.log('\nStep 4: Evaluating models...');
  const results = await evaluateModels(sortedModels, {
    apiKey,
    timeout: 30000,
    maxConcurrent: 3,
  });

  // Step 5: Sort and filter results
  const sortedResults = sortResultsByScore(results);
  const passingResults = filterPassingModels(sortedResults, minScore);
  const failingResults = sortedResults.filter(r => !passingResults.includes(r));

  console.log(`\n  Evaluated ${results.length} models`);
  console.log(`  Passing: ${passingResults.length}`);
  console.log(`  Failing: ${failingResults.length}`);

  // Step 6: Display results
  console.log('\n' + '='.repeat(60));
  console.log('PASSING MODELS');
  console.log('='.repeat(60));

  if (passingResults.length === 0) {
    console.log('No models passed the evaluation!');
  } else {
    passingResults.forEach((result, i) => {
      console.log(`\n${i + 1}. ${result.modelId}`);
      console.log(`   Name: ${result.modelName}`);
      console.log(`   Score: ${result.score}/100`);
      console.log(`   Response Time: ${result.responseTime}ms`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('FAILING MODELS (first 10)');
  console.log('='.repeat(60));

  const failingToShow = failingResults.slice(0, 10);
  failingToShow.forEach((result, i) => {
    console.log(`\n${i + 1}. ${result.modelId}`);
    console.log(`   Name: ${result.modelName}`);
    console.log(`   Score: ${result.score}/100`);
    console.log(`   Errors: ${result.errors.join(', ')}`);
  });

  if (failingResults.length > 10) {
    console.log(`\n... and ${failingResults.length - 10} more failing models`);
  }

  // Step 7: Write output files
  console.log('\n' + '='.repeat(60));
  console.log('WRITING OUTPUT FILES');
  console.log('='.repeat(60));

  // Create output directory
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString();

  // Write summary
  const summary: EvalSummary = {
    timestamp,
    totalModels: allModels.length,
    testedModels: results.length,
    passingModels: passingResults.length,
    failingModels: failingResults.length,
    results: sortedResults,
    passingModelIds: passingResults.map(r => r.modelId),
  };

  const summaryPath = join(outputDir, 'summary.json');
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`  Wrote summary to: ${summaryPath}`);

  // Write passing models list (for use in the app)
  const passingModelsPath = join(outputDir, 'passing-models.json');
  writeFileSync(passingModelsPath, JSON.stringify(passingResults.map(r => ({
    id: r.modelId,
    name: r.modelName,
    score: r.score,
  })), null, 2));
  console.log(`  Wrote passing models to: ${passingModelsPath}`);

  // Write passing model IDs (for environment variable)
  const passingIdsPath = join(outputDir, 'passing-model-ids.txt');
  writeFileSync(passingIdsPath, passingResults.map(r => r.modelId).join('\n') + '\n');
  console.log(`  Wrote passing model IDs to: ${passingIdsPath}`);

  // Write detailed results
  const resultsPath = join(outputDir, 'detailed-results.json');
  writeFileSync(resultsPath, JSON.stringify(sortedResults, null, 2));
  console.log(`  Wrote detailed results to: ${resultsPath}`);

  console.log('\n' + '='.repeat(60));
  console.log('EVALUATION COMPLETE');
  console.log('='.repeat(60));
  console.log(`\nPassing models: ${passingResults.length}/${results.length}`);
  console.log(`Use the model IDs from ${passingModelsPath} in your application`);

  // Exit with appropriate code
  if (passingResults.length === 0) {
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
