import {
  CurriculumRepository,
  curriculumRepository,
} from './curriculum.repository';
import {
  ConceptDetailDTO,
  ConceptSummaryDTO,
  LearningPathNodeDTO,
} from './curriculum.types';

export class CurriculumService {
  constructor(private repo: CurriculumRepository = curriculumRepository) {}

  /**
   * Retrieves list of active curriculum concepts ordered by display_order.
   */
  async getConceptList(): Promise<ConceptSummaryDTO[]> {
    const concepts = await this.repo.findAllActiveConcepts();
    return concepts.map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      shortDescription: c.short_description,
      difficultyLevel: c.difficulty_level,
      estimatedMinutes: c.estimated_minutes,
      displayOrder: c.display_order,
    }));
  }

  /**
   * Retrieves concept detail including learning objective, prerequisites,
   * curated content, and active misconceptions.
   */
  async getConceptDetail(slug: string): Promise<ConceptDetailDTO | null> {
    if (!slug || typeof slug !== 'string' || !slug.trim()) {
      return null;
    }

    const normalizedSlug = slug.trim().toLowerCase();
    const concept = await this.repo.findConceptBySlug(normalizedSlug);
    if (!concept) {
      return null;
    }

    const [prerequisites, rawContent, rawMisconceptions] = await Promise.all([
      this.repo.findPrerequisitesForConcept(concept.id),
      this.repo.findContentForConcept(concept.id),
      this.repo.findMisconceptionsForConcept(concept.id),
    ]);

    const content = rawContent.map((c) => ({
      id: c.id,
      contentType: c.content_type,
      title: c.title,
      body: c.body,
      displayOrder: c.display_order,
    }));

    const misconceptions = rawMisconceptions.map((m) => ({
      id: m.id,
      code: m.code,
      title: m.title,
      description: m.description,
      guidance: m.guidance,
    }));

    return {
      id: concept.id,
      slug: concept.slug,
      title: concept.title,
      shortDescription: concept.short_description,
      description: concept.description,
      difficultyLevel: concept.difficulty_level,
      estimatedMinutes: concept.estimated_minutes,
      learningObjective: concept.learning_objective,
      displayOrder: concept.display_order,
      prerequisites,
      content,
      misconceptions,
    };
  }

  /**
   * Constructs the structured learning path with sequence and prerequisite connections.
   */
  async getLearningPath(): Promise<LearningPathNodeDTO[]> {
    const [concepts, prereqPairs] = await Promise.all([
      this.repo.findAllActiveConcepts(),
      this.repo.findAllPrerequisitePairs(),
    ]);

    // Group prerequisites by concept_id
    const prereqsByConceptId = new Map<
      string,
      Array<{ id: string; slug: string; title: string }>
    >();

    for (const pair of prereqPairs) {
      const list = prereqsByConceptId.get(pair.concept_id) || [];
      list.push({
        id: pair.prerequisite_concept_id,
        slug: pair.prereq_slug,
        title: pair.prereq_title,
      });
      prereqsByConceptId.set(pair.concept_id, list);
    }

    return concepts.map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      difficultyLevel: c.difficulty_level,
      estimatedMinutes: c.estimated_minutes,
      displayOrder: c.display_order,
      prerequisites: prereqsByConceptId.get(c.id) || [],
    }));
  }

  /**
   * Validates prerequisite relationships to ensure no self-prerequisites or circular cycles.
   * Can be used programmatically by curriculum management or admin extensions.
   */
  validatePrerequisiteRelationship(
    conceptId: string,
    prerequisiteId: string,
    existingPairs: Array<[string, string]>
  ): { valid: boolean; reason?: string } {
    if (conceptId === prerequisiteId) {
      return { valid: false, reason: 'A concept cannot be a prerequisite of itself' };
    }

    // Build directed adjacency map
    const adj = new Map<string, string[]>();
    for (const [from, to] of existingPairs) {
      const list = adj.get(from) || [];
      list.push(to);
      adj.set(from, list);
    }

    // Add proposed edge
    const list = adj.get(conceptId) || [];
    list.push(prerequisiteId);
    adj.set(conceptId, list);

    // Detect cycle starting from prerequisiteId reachable to conceptId
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (node: string): boolean => {
      visited.add(node);
      recursionStack.add(node);

      const neighbors = adj.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (hasCycle(neighbor)) return true;
        } else if (recursionStack.has(neighbor)) {
          return true;
        }
      }

      recursionStack.delete(node);
      return false;
    };

    for (const node of adj.keys()) {
      if (!visited.has(node)) {
        if (hasCycle(node)) {
          return { valid: false, reason: 'Prerequisite relationship introduces a circular dependency' };
        }
      }
    }

    return { valid: true };
  }
}

export const curriculumService = new CurriculumService();
