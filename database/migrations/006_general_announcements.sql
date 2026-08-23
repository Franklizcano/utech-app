-- Avisos generales segmentados por audiencia y lectura individual.
CREATE TABLE IF NOT EXISTS general_announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  audience VARCHAR(40) NOT NULL CHECK (audience IN ('personal', 'admin', 'colaborador', 'cliente_particular', 'cliente_corporativo')),
  priority VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'importante')),
  active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_general_announcements_active ON general_announcements(active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_general_announcements_audience ON general_announcements(audience);

CREATE TABLE IF NOT EXISTS general_announcement_reads (
  announcement_id UUID NOT NULL REFERENCES general_announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (announcement_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_general_announcement_reads_user ON general_announcement_reads(user_id);

ALTER TABLE general_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE general_announcement_reads ENABLE ROW LEVEL SECURITY;

