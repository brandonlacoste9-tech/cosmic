// scripts/demoGoalOrchestration.js
// Demonstrates the full goal decomposition and orchestration pipeline

import GoalInterpreter from '../backend/agents/GoalInterpreter.js';
import TaskOrchestrator from '../backend/agents/TaskOrchestrator.js';
import EventBus from '../backend/utils/EventBus.js';

// Subscribe to events for logging
EventBus.on('goal:decomposed', (goal) => {
    console.log(`\n📋 Goal decomposed into ${goal.tasks.length} tasks:`);
    goal.tasks.forEach((t, i) => console.log(`   ${i + 1}. [${t.type}] ${t.description?.slice(0, 50)}...`));
});

EventBus.on('goal:task_completed', ({ task, success }) => {
    const icon = success ? '✅' : '❌';
    console.log(`   ${icon} ${task.type}: ${task.description?.slice(0, 40)}...`);
});

EventBus.on('n8n:triggered', ({ workflowId, simulated }) => {
    console.log(`   📦 N8N ${simulated ? '(simulated)' : ''}: ${workflowId}`);
});

EventBus.on('linear:issue_created', ({ title, url, simulated }) => {
    console.log(`   📋 Linear ${simulated ? '(simulated)' : ''}: ${title}`);
    console.log(`      URL: ${url}`);
});

EventBus.on('goal:finished', ({ success, completedCount, failedCount }) => {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`   RESULT: ${success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`   Completed: ${completedCount}, Failed: ${failedCount}`);
    console.log(`${'═'.repeat(60)}`);
});

// Run the demo
async function main() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('       GOAL ORCHESTRATION DEMO                             ');
    console.log('       N8N + Linear + File Operations                      ');
    console.log('═══════════════════════════════════════════════════════════');

    const testGoals = [
        // Simple goal
        'Create a new component called StatusBadge.tsx in the components folder that displays a colored badge based on a status prop.',
        
        // Integration goal
        'Create a Linear issue to track the new StatusBadge component, then trigger the N8N workflow "component-created" with the component name.',
    ];

    // Test with the simple goal first
    const goalText = testGoals[0];
    
    console.log(`\n🎯 GOAL: "${goalText}"\n`);

    try {
        // Step 1: Interpret the goal
        console.log('📖 Step 1: Interpreting goal with LLM...');
        const goal = await GoalInterpreter.interpret(goalText);

        // Step 2: Execute the tasks
        console.log('\n🚀 Step 2: Executing tasks...');
        const result = await TaskOrchestrator.executeGoal(goal);

        console.log('\n✨ Demo complete!');
        
    } catch (error) {
        console.error('\n❌ Demo failed:', error.message);
    }
}

main().catch(console.error);
