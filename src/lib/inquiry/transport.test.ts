import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { LEAD_TIMEOUT_MS, LOCAL_LEAD_ENDPOINT, resolveLeadEndpoint } from './transport.ts';

const PRODUCTION = 'https://api.era-cosmetology.ru/lead/';

describe('the lead endpoint', () => {
  it('uses the configured URL', () => {
    assert.equal(resolveLeadEndpoint(PRODUCTION), PRODUCTION);
    assert.equal(resolveLeadEndpoint(`  ${PRODUCTION}\n`), PRODUCTION);
  });

  it('falls back to the local /api/lead when nothing is configured', () => {
    assert.equal(LOCAL_LEAD_ENDPOINT, '/api/lead');
    assert.equal(resolveLeadEndpoint(undefined), '/api/lead');
    assert.equal(resolveLeadEndpoint(''), '/api/lead');
    assert.equal(resolveLeadEndpoint('   '), '/api/lead');
  });

  it('is the REG.RU relay in the production build env, with its trailing slash', () => {
    const env = readFileSync(new URL('../../../.env.production', import.meta.url), 'utf8');
    const line = env.split('\n').find((l) => l.startsWith('VITE_LEAD_API_URL='));
    assert.equal(line, `VITE_LEAD_API_URL=${PRODUCTION}`);
  });

  it('only public values live in .env.production', () => {
    const env = readFileSync(new URL('../../../.env.production', import.meta.url), 'utf8');
    const keys = env
      .split('\n')
      .filter((l) => /^\s*[A-Z_]+=/.test(l))
      .map((l) => l.split('=')[0]?.trim());
    assert.deepEqual(keys, ['VITE_LEAD_API_URL']);
  });
});

describe('the browser timeout', () => {
  it('is 20 s — above the relay’s 15 s upstream timeout', () => {
    assert.equal(LEAD_TIMEOUT_MS, 20_000);
    assert.ok(LEAD_TIMEOUT_MS > 15_000);
  });
});
