-- drizzle/0008_add_resume_deduplication.sql
-- Phase 1: Resume Deduplication & Analysis Consistency

-- Add resume_hash column for deduplication
ALTER TABLE screenings ADD COLUMN resume_hash text;

-- Add previous_screening_id column for linking to reused analyses
ALTER TABLE screenings ADD COLUMN previous_screening_id text;

-- Add foreign key constraint for self-referential link
ALTER TABLE screenings 
ADD CONSTRAINT screenings_previous_screening_id_fk 
FOREIGN KEY (previous_screening_id) REFERENCES screenings(id) ON DELETE SET NULL;

-- Create index for deduplication lookups (O(1) instead of O(n))
CREATE INDEX screenings_resume_hash_idx ON screenings(organization_id, resume_hash);
