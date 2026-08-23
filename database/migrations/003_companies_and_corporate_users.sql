-- Empresas independientes y sus usuarios corporativos.
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  logo TEXT,
  user_limit INTEGER NOT NULL DEFAULT 1 CHECK (user_limit >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);

-- Las empresas que existían implícitamente en usuarios corporativos se preservan.
INSERT INTO companies (name, logo)
SELECT DISTINCT company_name, MAX(company_logo)
FROM users
WHERE is_corporate = true AND company_name IS NOT NULL AND TRIM(company_name) <> ''
GROUP BY company_name
ON CONFLICT (name) DO NOTHING;

UPDATE users u
SET company_id = c.id
FROM companies c
WHERE u.is_corporate = true
  AND u.company_id IS NULL
  AND u.company_name = c.name;
