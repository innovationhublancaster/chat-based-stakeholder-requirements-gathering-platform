import test from 'node:test';
import assert from 'node:assert/strict';
import { extractRequirementsFromChat } from './requirements.js';

test('extracts requirement cards from stakeholder messages with provenance', () => {
  const requirements = extractRequirementsFromChat(
    [
      { id: 'm-1', author: 'Alice', content: 'We must support SSO login for all internal users.' },
      { id: 'm-2', author: 'Facilitator', content: 'Thanks, noted.' },
    ],
    [{ id: 's-1', name: 'Alice', role: 'Product Manager' }],
  );

  assert.equal(requirements.length, 1);
  assert.equal(requirements[0].stakeholderOwner, 'Alice');
  assert.equal(requirements[0].sourceMessageId, 'm-1');
  assert.equal(requirements[0].priority, 'Must');
  assert.ok(requirements[0].confidence > 0.8);
});
