import { describe, it, expect } from 'vitest';
import {
  DEVELOPERS_KNOWLEDGE,
  NEW_BUILDINGS_GUIDE,
  getDeveloperKnowledge,
} from './developersKnowledgeBase';
import { DEFAULT_DEVELOPMENTS } from './developmentsData';

describe('developersKnowledgeBase', () => {
  it('covers every developer present in DEFAULT_DEVELOPMENTS', () => {
    const devsInCatalog = [...new Set(DEFAULT_DEVELOPMENTS.map((d) => d.developer).filter(Boolean))];
    for (const devName of devsInCatalog) {
      const kb = getDeveloperKnowledge(devName);
      expect(kb, `Missing knowledge base entry for ${devName}`).not.toBeNull();
    }
  });

  it('provides structured guide sections and developer cards', () => {
    expect(DEVELOPERS_KNOWLEDGE.length).toBeGreaterThanOrEqual(10);
    expect(NEW_BUILDINGS_GUIDE.length).toBeGreaterThanOrEqual(3);
  });
});
