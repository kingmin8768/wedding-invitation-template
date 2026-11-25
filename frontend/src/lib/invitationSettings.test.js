import assert from 'node:assert/strict';
import test from 'node:test';
import { INVITATION_CONFIG } from '../config/invitationConfig.js';
import { mergeInvitationConfig } from './invitationSettings.js';

test('returns default invitation config when remote payload is null or empty', () => {
  const merged = mergeInvitationConfig(null);

  assert.equal(merged.couple.groom.firstName, INVITATION_CONFIG.couple.groom.firstName);
  assert.equal(merged.venue.name, INVITATION_CONFIG.venue.name);
  assert.equal(merged.accounts.groom.length, INVITATION_CONFIG.accounts.groom.length);
});

test('merges partial couple, venue, and account overrides cleanly', () => {
  const merged = mergeInvitationConfig({
    couple: {
      groom: { fullName: '홍길동', firstName: '길동' },
    },
    venue: {
      name: '더채플',
      lat: 37.55,
      lng: 127.05,
    },
    accounts: {
      groom: [{ bank: '국민은행', number: '123-456-7890', name: '홍길동' }],
    },
    afterParty: {
      enabled: false,
    },
  });

  assert.equal(merged.couple.groom.fullName, '홍길동');
  assert.equal(merged.couple.bride.firstName, INVITATION_CONFIG.couple.bride.firstName);
  assert.equal(merged.venue.name, '더채플');
  assert.equal(merged.venue.floor, INVITATION_CONFIG.venue.floor);
  assert.equal(merged.venue.lat, 37.55);
  assert.deepEqual(merged.accounts.groom, [
    { bank: '국민은행', number: '123-456-7890', name: '홍길동' },
  ]);
  assert.equal(merged.afterParty.enabled, false);
});
