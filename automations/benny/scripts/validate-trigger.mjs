#!/usr/bin/env node
import { readFileSync, realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function validateTrigger(trigger, expectedChannel) {
  if (!trigger || typeof trigger !== 'object' || Array.isArray(trigger)) throw new Error('Trigger must be a JSON object');
  if (typeof expectedChannel !== 'string' || !expectedChannel.trim() || trigger.source_channel_id !== expectedChannel) throw new Error('Source channel is missing or does not match configuration');
  const thread = trigger.thread_ts === '' || trigger.thread_ts == null ? trigger.ts : trigger.thread_ts;
  if (typeof thread !== 'string' || !/^\d+\.\d+$/.test(thread)) throw new Error('A Slack timestamp string is required');
  return { SOURCE_CHANNEL_ID: expectedChannel, SOURCE_THREAD_TS: thread };
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  try {
    if (process.argv.length !== 3) throw new Error('Usage: validate-trigger.mjs <configured-source-channel-id> < trigger.json');
    console.log(JSON.stringify(validateTrigger(JSON.parse(readFileSync(0, 'utf8')), process.argv[2])));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
