#!/usr/bin/env node
import { runInit } from './init.js';

const [,, command, ...args] = process.argv;
const force = args.includes('--force');

if (command === 'init') {
  runInit({ force }).catch(err => {
    console.error(err.message);
    process.exit(1);
  });
} else {
  console.error('Usage: ai-omega init [--force]');
  process.exit(1);
}
