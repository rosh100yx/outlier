import { expect, test, describe } from 'bun:test';
import { modelClass, energyKwhForModel, energyKwhByModel } from '../src/emissions';

describe('emissions engine', () => {
  test('maps model ids to classes', () => {
    expect(modelClass('claude-opus-4-8')).toBe('opus');
    expect(modelClass('claude-3.5-sonnet')).toBe('sonnet');
    expect(modelClass('claude-haiku-4-5')).toBe('haiku');
    expect(modelClass('gemini-2.5-flash')).toBe('haiku'); // flash -> small class
    expect(modelClass('gpt-4o-mini')).toBe('haiku');       // mini -> small class
    expect(modelClass('llama-3-70b')).toBe('local');
    expect(modelClass('something-unknown')).toBe('default');
  });

  test('larger models cost more energy per token', () => {
    const opus = energyKwhForModel('claude-opus-4-8', 1_000_000);
    const haiku = energyKwhForModel('claude-haiku-4-5', 1_000_000);
    expect(opus).toBeGreaterThan(haiku);
  });

  test('sums energy across a per-model breakdown', () => {
    const total = energyKwhByModel({ 'claude-opus-4-8': 1_000_000, 'claude-haiku-4-5': 1_000_000 });
    const expected = energyKwhForModel('opus', 1_000_000) + energyKwhForModel('haiku', 1_000_000);
    expect(total).toBeCloseTo(expected, 6);
  });

  test('empty breakdown is zero energy', () => {
    expect(energyKwhByModel({})).toBe(0);
  });
});
