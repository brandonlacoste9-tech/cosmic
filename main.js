#!/usr/bin/env node

import { execSync } from 'child_process';
import process from 'process';

import enforcer from './src/managers/AppEnforcer.js';

async function boot() {
  console.log("� THE ARTIFACT IS CLAIMING THIS WINDOWS NODE...");
  
  // The Essential Battalion
  await enforcer.enforce('node');
  await enforcer.enforce('git');
  await enforcer.enforce('chrome');
  
  console.log("🏁 BATTALION POSITIONED.");
}

boot();
