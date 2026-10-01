import { pool } from '../../config/db';
import {
  ConceptRow,
  ConceptContentRow,
  MisconceptionRow,
  PrerequisiteReferenceDTO,
} from './curriculum.types';

export class CurriculumRepository {
  /**
   * Retrieves all active concepts ordered by display_order.
   */
  async findAllActiveConcepts(): Promise<ConceptRow[]> {
    const query = `
      SELECT 
        id, slug, title, short_description, description,
        difficulty_level, estimated_minutes, learning_objective,
        status, display_order, created_at, updated_at
      FROM concepts
      WHERE status = 'ACTIVE'
      ORDER BY display_order ASC;
    `;
    const res = await pool.query<ConceptRow>(query);
    return res.rows;
  }

  /**
   * Finds an active concept by slug.
   */
  async findConceptBySlug(slug: string): Promise<ConceptRow | null> {
    const query = `
      SELECT 
        id, slug, title, short_description, description,
        difficulty_level, estimated_minutes, learning_objective,
        status, display_order, created_at, updated_at
      FROM concepts
      WHERE slug = $1 AND status = 'ACTIVE'
      LIMIT 1;
    `;
    const res = await pool.query<ConceptRow>(query, [slug]);
    return res.rows[0] ?? null;
  }

  /**
   * Finds a concept by its ID.
   */
  async findConceptById(id: string): Promise<ConceptRow | null> {
    const query = `
      SELECT 
        id, slug, title, short_description, description,
        difficulty_level, estimated_minutes, learning_objective,
        status, display_order, created_at, updated_at
      FROM concepts
      WHERE id = $1
      LIMIT 1;
    `;
    const res = await pool.query<ConceptRow>(query, [id]);
    return res.rows[0] ?? null;
  }

  /**
   * Retrieves prerequisite concepts for a given concept ID.
   */
  async findPrerequisitesForConcept(conceptId: string): Promise<PrerequisiteReferenceDTO[]> {
    const query = `
      SELECT 
        c.id, c.slug, c.title
      FROM concept_prerequisites cp
      JOIN concepts c ON cp.prerequisite_concept_id = c.id
      WHERE cp.concept_id = $1 AND c.status = 'ACTIVE'
      ORDER BY c.display_order ASC;
    `;
    const res = await pool.query<PrerequisiteReferenceDTO>(query, [conceptId]);
    return res.rows;
  }

  /**
   * Retrieves active curated content for a given concept ID.
   */
  async findContentForConcept(conceptId: string): Promise<ConceptContentRow[]> {
    const query = `
      SELECT 
        id, concept_id, content_type, title, body,
        display_order, active, created_at, updated_at
      FROM concept_content
      WHERE concept_id = $1 AND active = true
      ORDER BY display_order ASC;
    `;
    const res = await pool.query<ConceptContentRow>(query, [conceptId]);
    return res.rows;
  }

  /**
   * Retrieves active misconceptions for a given concept ID.
   */
  async findMisconceptionsForConcept(conceptId: string): Promise<MisconceptionRow[]> {
    const query = `
      SELECT 
        id, concept_id, code, title, description, guidance,
        active, created_at, updated_at
      FROM misconceptions
      WHERE concept_id = $1 AND active = true
      ORDER BY code ASC;
    `;
    const res = await pool.query<MisconceptionRow>(query, [conceptId]);
    return res.rows;
  }

  /**
   * Retrieves all prerequisite pairs among active concepts.
   */
  async findAllPrerequisitePairs(): Promise<
    Array<{
      concept_id: string;
      prerequisite_concept_id: string;
      prereq_slug: string;
      prereq_title: string;
    }>
  > {
    const query = `
      SELECT 
        cp.concept_id,
        cp.prerequisite_concept_id,
        c.slug AS prereq_slug,
        c.title AS prereq_title
      FROM concept_prerequisites cp
      JOIN concepts c ON cp.prerequisite_concept_id = c.id
      WHERE c.status = 'ACTIVE'
      ORDER BY c.display_order ASC;
    `;
    const res = await pool.query<{
      concept_id: string;
      prerequisite_concept_id: string;
      prereq_slug: string;
      prereq_title: string;
    }>(query);
    return res.rows;
  }
}

export const curriculumRepository = new CurriculumRepository();
