-- =============================================
-- Script SQL para o Sistema de Orcamento Marmore
-- Execute no SQL Editor do Supabase
-- =============================================

-- Tabela de materiais (marmore, granito, quartzo)
CREATE TABLE materiais (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de orcamentos
CREATE TABLE orcamentos (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  data_criacao TIMESTAMPTZ DEFAULT NOW(),
  ambientes JSONB DEFAULT '[]'::jsonb,
  chapas JSONB DEFAULT '[]'::jsonb,
  precos JSONB DEFAULT '{}'::jsonb,
  materiais_config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de precos padrao (registro unico)
CREATE TABLE precos_padrao (
  id INTEGER PRIMARY KEY DEFAULT 1,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir precos padrao iniciais
INSERT INTO precos_padrao (id, config) VALUES (1, '{
  "polimento": 22,
  "esquadria": 35,
  "boleado": 35,
  "canal": 20,
  "pia": 100,
  "cubaEsculpida": 630,
  "cooktop": 150,
  "recorte": 60,
  "pes": 200
}'::jsonb);

-- Inserir materiais padrao
INSERT INTO materiais (nome) VALUES
  ('Mármore Branco Carrara'),
  ('Granito Preto São Gabriel'),
  ('Quartzo Branco');

-- =============================================
-- Politicas de seguranca (RLS)
-- Permite acesso publico (anon key) para todas as operacoes
-- =============================================

ALTER TABLE materiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE orcamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE precos_padrao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso publico materiais" ON materiais
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Acesso publico orcamentos" ON orcamentos
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Acesso publico precos" ON precos_padrao
  FOR ALL USING (true) WITH CHECK (true);
