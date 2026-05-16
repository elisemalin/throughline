// Unit tests for the PassphraseStrength heuristic. The kickoff calls out
// that common-but-long passwords ("password123", "qwerty1234") were
// flagging as Okay/Good in earlier scores; the denylist + sequential-run
// guards added in Day 4 should push them back to weak.

import { describe, expect, test } from 'vitest';
import { scorePassphrase } from '@/components/PassphraseStrength';

describe('scorePassphrase', () => {
  test('empty string is level 0', () => {
    const result = scorePassphrase('');
    expect(result.level).toBe(0);
    expect(result.tone).toBe('stone');
  });

  test.each([
    ['password'],
    ['Password1'],
    ['p@ssword'],
    ['password123'],
    ['passw0rd2024!'],
    ['qwerty'],
    ['Qwerty123'],
    ['qwertyuiop'],
    ['asdfghjkl'],
    ['letmein2024'],
    ['admin123'],
    ['iloveyou'],
    ['12345678'],
    ['123456789012'],
  ])('common / sequential password "%s" flags as weak', (input) => {
    const result = scorePassphrase(input);
    expect(result.level).toBe(1);
    expect(result.tone).toBe('rose');
  });

  test.each([
    ['aaaaaaaa'],
    ['ababababab'],
  ])('mostly-repeating "%s" flags as weak', (input) => {
    const result = scorePassphrase(input);
    expect(result.level).toBe(1);
    expect(result.tone).toBe('rose');
  });

  test('short input under 8 chars flags as weak', () => {
    const result = scorePassphrase('Ab1!');
    expect(result.level).toBe(1);
    expect(result.tone).toBe('rose');
  });

  test('moderate single-class password gets Weak', () => {
    const result = scorePassphrase('lowercaseonly');
    // 13 chars, single class, no common fragment, no sequential run
    expect(result.level).toBe(2);
    expect(result.tone).toBe('amber');
  });

  test('correct horse battery staple — long, multi-class, no patterns — grades Strong', () => {
    const result = scorePassphrase('correct horse Battery 9 staple!');
    expect(result.level).toBeGreaterThanOrEqual(3);
    expect(['emerald', 'lime']).toContain(result.tone);
  });

  test('genuinely strong passphrase grades emerald', () => {
    const result = scorePassphrase('Ru9!nightingale_velvet');
    expect(result.level).toBe(4);
    expect(result.tone).toBe('emerald');
  });
});
