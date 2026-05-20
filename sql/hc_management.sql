-- ============================================================
-- HC MANAGEMENT DATABASE SCHEMA
-- Supabase / PostgreSQL
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. MASTER TABLES (lookup / dropdown values)
-- ============================================================

CREATE TABLE IF NOT EXISTS ms_opg (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS ms_project (
  id     SERIAL PRIMARY KEY,
  name   TEXT NOT NULL,
  opg_id INT REFERENCES ms_opg(id)
);

CREATE TABLE IF NOT EXISTS ms_position (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS ms_skill (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS ms_channel (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS ms_site (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

-- ============================================================
-- 2. ACTIVE EMPLOYEE TABLE  (pcn_type = 'Active')
-- ============================================================

CREATE TABLE IF NOT EXISTS hc_active (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identity
  nip                     TEXT NOT NULL UNIQUE,
  employee_name           TEXT NOT NULL,
  gender                  TEXT,                          -- Male / Female
  id_card                 TEXT,
  email                   TEXT,
  access_card_number      TEXT,
  building_location       TEXT,

  -- Placement
  opg                     TEXT NOT NULL,
  project                 TEXT NOT NULL,
  position                TEXT NOT NULL,
  skill                   TEXT,
  channel                 TEXT,
  site                    TEXT,

  -- Reporting line
  tl_name                 TEXT,
  spv_name                TEXT,
  operational_manager     TEXT,
  unit_manager            TEXT,

  -- Dates
  join_date_company       DATE,
  join_date_project       DATE NOT NULL,

  -- HC classification
  pcn_type                TEXT NOT NULL DEFAULT 'Active',
  hire_status             TEXT NOT NULL,                 -- New Hire / From Other PJ
  training_batch          TEXT,

  -- Probation (for employees still in probation)
  start_probation         DATE,
  end_probation           DATE,

  -- Future movement (to be filled when movement is planned)
  to_opg                  TEXT,
  to_project              TEXT,
  to_position             TEXT,
  to_skill                TEXT,
  to_channel              TEXT,

  -- Misc
  remarks                 TEXT,

  -- Audit
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. LOG HISTORY TABLE  (Resign / Promotion / Demotion / Mutation)
-- ============================================================

CREATE TABLE IF NOT EXISTS hc_log_history (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identity (snapshot at time of event)
  nip                       TEXT NOT NULL,
  employee_name             TEXT NOT NULL,
  gender                    TEXT,
  id_card                   TEXT,
  email                     TEXT,
  access_card_number        TEXT,
  building_location         TEXT,

  -- Origin placement
  opg                       TEXT NOT NULL,
  project                   TEXT NOT NULL,
  position                  TEXT NOT NULL,
  skill                     TEXT,
  channel                   TEXT,
  site                      TEXT,

  -- Reporting line (at time of event)
  tl_name                   TEXT,
  spv_name                  TEXT,
  operational_manager       TEXT,
  unit_manager              TEXT,

  -- Dates
  join_date_company         DATE,
  join_date_project         DATE NOT NULL,

  -- HC classification
  pcn_type                  TEXT NOT NULL,               -- Resign / Promotion Out Of PJ / Demotion Out Of PJ / Mutation
  hire_status               TEXT NOT NULL,
  training_batch            TEXT,
  attrition_type            TEXT,                        -- Voluntary - Online / Involuntary - Training / etc

  -- Resign fields (filled only for Resign)
  resign_type               TEXT,                        -- Employee Matter (Voluntary) / Company Matter (Involuntary)
  effective_resign_date     DATE,
  last_day                  DATE,
  resignation_reason        TEXT,
  second_resignation_reason TEXT,
  remarks                   TEXT,

  -- Promotion / Demotion / Mutation destination fields
  start_probation           DATE,
  end_probation             DATE,
  fix_new_position_date     DATE,
  result_promotion          TEXT,                        -- Passed / Not Passed
  to_opg                    TEXT,
  to_project                TEXT,
  to_position               TEXT,
  to_skill                  TEXT,
  to_channel                TEXT,

  -- Audit
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. TRAINING BUCKET TABLE  (New Hire in Training)
-- ============================================================
-- Employees in training are NOT counted in Starting HC until
-- they pass and are moved to hc_active.
-- If not passed → stays here as historical record.
-- ============================================================

CREATE TABLE IF NOT EXISTS hc_training (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Temporary NIP (follows same format as regular NIP)
  nip                   TEXT NOT NULL UNIQUE,
  employee_name         TEXT NOT NULL,
  gender                TEXT,
  id_card               TEXT,
  email                 TEXT,

  -- Target placement (where they will go if passed)
  opg                   TEXT NOT NULL,
  project               TEXT NOT NULL,
  position              TEXT NOT NULL DEFAULT 'Agent',
  skill                 TEXT,
  channel               TEXT,
  site                  TEXT,

  -- Reporting line
  tl_name               TEXT,
  spv_name              TEXT,
  operational_manager   TEXT,
  unit_manager          TEXT,

  -- Dates
  join_date_company     DATE NOT NULL,                   -- First day at company
  training_start_date   DATE NOT NULL,
  training_end_date     DATE,                            -- Expected end date
  training_batch        TEXT,

  -- Hire classification
  hire_status           TEXT NOT NULL DEFAULT 'New Hire',

  -- Training result
  training_status       TEXT NOT NULL DEFAULT 'On Training', -- On Training / Passed / Not Passed
  passed_date           DATE,                            -- Date marked as Passed
  not_passed_date       DATE,                            -- Date marked as Not Passed
  not_passed_reason     TEXT,                            -- Reason if Not Passed

  -- When passed → join_date_project in hc_active
  join_date_project     DATE,                            -- Filled when training_status = Passed

  -- Misc
  remarks               TEXT,

  -- Audit
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_active_nip            ON hc_active(nip);
CREATE INDEX IF NOT EXISTS idx_active_opg            ON hc_active(opg);
CREATE INDEX IF NOT EXISTS idx_active_project        ON hc_active(project);
CREATE INDEX IF NOT EXISTS idx_active_join_project   ON hc_active(join_date_project);

CREATE INDEX IF NOT EXISTS idx_log_nip               ON hc_log_history(nip);
CREATE INDEX IF NOT EXISTS idx_log_pcn_type          ON hc_log_history(pcn_type);
CREATE INDEX IF NOT EXISTS idx_log_resign_date       ON hc_log_history(effective_resign_date);
CREATE INDEX IF NOT EXISTS idx_log_probation         ON hc_log_history(start_probation);
CREATE INDEX IF NOT EXISTS idx_log_opg               ON hc_log_history(opg);
CREATE INDEX IF NOT EXISTS idx_log_project           ON hc_log_history(project);

CREATE INDEX IF NOT EXISTS idx_training_nip          ON hc_training(nip);
CREATE INDEX IF NOT EXISTS idx_training_status       ON hc_training(training_status);
CREATE INDEX IF NOT EXISTS idx_training_opg          ON hc_training(opg);

-- ============================================================
-- 6. AUTO-UPDATE updated_at TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_active
  BEFORE UPDATE ON hc_active
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_log
  BEFORE UPDATE ON hc_log_history
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_training
  BEFORE UPDATE ON hc_training
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 7. ROW LEVEL SECURITY (RLS) — enable per table
-- ============================================================

ALTER TABLE hc_active        ENABLE ROW LEVEL SECURITY;
ALTER TABLE hc_log_history   ENABLE ROW LEVEL SECURITY;
ALTER TABLE hc_training      ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access (adjust as needed)
CREATE POLICY "auth_full_active"
  ON hc_active FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_full_log"
  ON hc_log_history FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_full_training"
  ON hc_training FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 8. HELPER VIEW — combined HC for dashboard calculation
-- ============================================================

CREATE OR REPLACE VIEW v_hc_combined AS
  -- Active employees
  SELECT
    'active'           AS source,
    nip, employee_name, opg, project, position, skill, channel, site,
    tl_name, spv_name, hire_status, training_batch,
    join_date_company, join_date_project,
    NULL::DATE         AS effective_resign_date,
    NULL::DATE         AS start_probation,
    pcn_type,
    NULL::TEXT         AS resign_type,
    NULL::TEXT         AS to_opg,
    NULL::TEXT         AS to_project,
    NULL::TEXT         AS to_position
  FROM hc_active

  UNION ALL

  -- Log history (Resign / Promotion / Demotion / Mutation)
  SELECT
    'log'              AS source,
    nip, employee_name, opg, project, position, skill, channel, site,
    tl_name, spv_name, hire_status, training_batch,
    join_date_company, join_date_project,
    effective_resign_date,
    start_probation,
    pcn_type,
    resign_type,
    to_opg,
    to_project,
    to_position
  FROM hc_log_history;

-- ============================================================
-- END OF SCHEMA
-- ============================================================
