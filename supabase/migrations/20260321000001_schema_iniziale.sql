-- ============================================================
-- IlDisagio — Schema iniziale
-- ============================================================

-- Estensioni
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABELLA: disagi
-- ============================================================
CREATE TABLE IF NOT EXISTS disagi (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  testo             TEXT NOT NULL CHECK (char_length(testo) <= 280),
  categoria         TEXT NOT NULL CHECK (categoria IN ('sociale', 'digitale', 'relazionale', 'pubblico', 'lavoro', 'appuntamenti')),
  lingua            TEXT NOT NULL DEFAULT 'it',
  punteggio_elo     INTEGER NOT NULL DEFAULT 1000,
  numero_sfide      INTEGER NOT NULL DEFAULT 0,
  data_inserimento  TIMESTAMPTZ NOT NULL DEFAULT now(),
  stato             TEXT NOT NULL DEFAULT 'in_attesa' CHECK (stato IN ('approvato', 'in_attesa', 'rifiutato')),
  proposto_da       UUID
);

-- Indici per query frequenti
CREATE INDEX IF NOT EXISTS idx_disagi_stato_elo
  ON disagi (stato, punteggio_elo DESC);

CREATE INDEX IF NOT EXISTS idx_disagi_stato_sfide
  ON disagi (stato, numero_sfide ASC);

CREATE INDEX IF NOT EXISTS idx_disagi_stato_data
  ON disagi (stato, data_inserimento DESC);

-- ============================================================
-- TABELLA: voti
-- ============================================================
CREATE TABLE IF NOT EXISTS voti (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_disagio_vincitore  UUID NOT NULL REFERENCES disagi(id) ON DELETE CASCADE,
  id_disagio_perdente   UUID NOT NULL REFERENCES disagi(id) ON DELETE CASCADE,
  timestamp             TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_fingerprint      TEXT NOT NULL,
  user_id               UUID,
  coppia_hash           TEXT NOT NULL
);

-- Vincolo unicità: un fingerprint può votare una coppia una sola volta
CREATE UNIQUE INDEX IF NOT EXISTS idx_voti_coppia_unica
  ON voti (user_fingerprint, coppia_hash);

CREATE INDEX IF NOT EXISTS idx_voti_timestamp
  ON voti (timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_voti_vincitore
  ON voti (id_disagio_vincitore);

CREATE INDEX IF NOT EXISTS idx_voti_perdente
  ON voti (id_disagio_perdente);

-- ============================================================
-- TABELLA: disagio_del_giorno
-- ============================================================
CREATE TABLE IF NOT EXISTS disagio_del_giorno (
  data        DATE PRIMARY KEY DEFAULT CURRENT_DATE,
  disagio_id  UUID NOT NULL REFERENCES disagi(id) ON DELETE CASCADE,
  creato_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- RPC: registra_voto (operazione atomica)
-- ============================================================
CREATE OR REPLACE FUNCTION registra_voto(
  p_vincitore      UUID,
  p_perdente       UUID,
  p_fingerprint    TEXT,
  p_user_id        UUID DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_elo_vincitore INTEGER;
  v_elo_perdente  INTEGER;
  v_attesa        FLOAT;
  v_k             INTEGER := 32;
  v_hash          TEXT;
  v_nuovo_v       INTEGER;
  v_nuovo_p       INTEGER;
BEGIN
  -- Calcola hash coppia (deterministico, ordine lessicografico)
  v_hash := LEAST(p_vincitore::TEXT, p_perdente::TEXT)
            || '_' ||
            GREATEST(p_vincitore::TEXT, p_perdente::TEXT);

  -- Leggi punteggi attuali
  SELECT punteggio_elo INTO v_elo_vincitore FROM disagi WHERE id = p_vincitore FOR UPDATE;
  SELECT punteggio_elo INTO v_elo_perdente  FROM disagi WHERE id = p_perdente  FOR UPDATE;

  IF v_elo_vincitore IS NULL OR v_elo_perdente IS NULL THEN
    RAISE EXCEPTION 'Disagio non trovato';
  END IF;

  -- Calcolo Elo
  v_attesa   := 1.0 / (1.0 + power(10.0, (v_elo_perdente - v_elo_vincitore)::FLOAT / 400.0));
  v_nuovo_v  := v_elo_vincitore + ROUND(v_k * (1.0 - v_attesa));
  v_nuovo_p  := v_elo_perdente  + ROUND(v_k * (0.0 - (1.0 - v_attesa)));

  -- Inserisci voto (lancia eccezione se coppia già votata dal fingerprint)
  INSERT INTO voti (id_disagio_vincitore, id_disagio_perdente, user_fingerprint, user_id, coppia_hash)
  VALUES (p_vincitore, p_perdente, p_fingerprint, p_user_id, v_hash);

  -- Aggiorna punteggi
  UPDATE disagi SET
    punteggio_elo = v_nuovo_v,
    numero_sfide  = numero_sfide + 1
  WHERE id = p_vincitore;

  UPDATE disagi SET
    punteggio_elo = v_nuovo_p,
    numero_sfide  = numero_sfide + 1
  WHERE id = p_perdente;

  RETURN json_build_object(
    'vincitore_elo', v_nuovo_v,
    'perdente_elo',  v_nuovo_p
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- RPC: get_match (matchmaking)
-- ============================================================
CREATE OR REPLACE FUNCTION get_match(
  p_fingerprint TEXT DEFAULT NULL
) RETURNS TABLE (
  id_a            UUID,
  testo_a         TEXT,
  categoria_a     TEXT,
  punteggio_elo_a INTEGER,
  id_b            UUID,
  testo_b         TEXT,
  categoria_b     TEXT,
  punteggio_elo_b INTEGER
) AS $$
DECLARE
  v_disagio_a RECORD;
  v_disagio_b RECORD;
  v_usa_nuovo BOOLEAN;
BEGIN
  -- 20% probabilità di abbinare un disagio nuovo (poche sfide)
  v_usa_nuovo := (random() < 0.20);

  IF v_usa_nuovo THEN
    -- Seleziona il disagio con meno sfide
    SELECT d.id, d.testo, d.categoria, d.punteggio_elo
    INTO v_disagio_a
    FROM disagi d
    WHERE d.stato = 'approvato'
    ORDER BY d.numero_sfide ASC, random()
    LIMIT 1;
  ELSE
    -- Seleziona un disagio casuale tra i top
    SELECT d.id, d.testo, d.categoria, d.punteggio_elo
    INTO v_disagio_a
    FROM disagi d
    WHERE d.stato = 'approvato'
    ORDER BY random()
    LIMIT 1;
  END IF;

  IF v_disagio_a IS NULL THEN
    RETURN;
  END IF;

  -- Seleziona un avversario con punteggio simile (±200), diverso dal primo
  SELECT d.id, d.testo, d.categoria, d.punteggio_elo
  INTO v_disagio_b
  FROM disagi d
  WHERE d.stato = 'approvato'
    AND d.id <> v_disagio_a.id
    AND ABS(d.punteggio_elo - v_disagio_a.punteggio_elo) <= 200
  ORDER BY random()
  LIMIT 1;

  -- Fallback: se non trova un avversario simile, prende uno qualsiasi
  IF v_disagio_b IS NULL THEN
    SELECT d.id, d.testo, d.categoria, d.punteggio_elo
    INTO v_disagio_b
    FROM disagi d
    WHERE d.stato = 'approvato'
      AND d.id <> v_disagio_a.id
    ORDER BY random()
    LIMIT 1;
  END IF;

  IF v_disagio_b IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY SELECT
    v_disagio_a.id,   v_disagio_a.testo,   v_disagio_a.categoria,   v_disagio_a.punteggio_elo,
    v_disagio_b.id,   v_disagio_b.testo,   v_disagio_b.categoria,   v_disagio_b.punteggio_elo;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- RPC: seleziona_disagio_del_giorno
-- ============================================================
CREATE OR REPLACE FUNCTION seleziona_disagio_del_giorno()
RETURNS UUID AS $$
DECLARE
  v_disagio_id UUID;
  v_oggi       DATE := CURRENT_DATE;
BEGIN
  -- Se esiste già per oggi, ritorna quello
  SELECT disagio_id INTO v_disagio_id
  FROM disagio_del_giorno
  WHERE data = v_oggi;

  IF v_disagio_id IS NOT NULL THEN
    RETURN v_disagio_id;
  END IF;

  -- Seleziona il disagio approvato più votato nelle ultime 48h
  -- (fallback: random tra i top 20 per Elo)
  SELECT d.id INTO v_disagio_id
  FROM disagi d
  WHERE d.stato = 'approvato'
    AND d.id NOT IN (
      SELECT disagio_id FROM disagio_del_giorno
      WHERE data >= (v_oggi - INTERVAL '7 days')
    )
  ORDER BY (
    SELECT COUNT(*) FROM voti v
    WHERE (v.id_disagio_vincitore = d.id OR v.id_disagio_perdente = d.id)
      AND v.timestamp >= now() - INTERVAL '48 hours'
  ) DESC, random()
  LIMIT 1;

  IF v_disagio_id IS NOT NULL THEN
    INSERT INTO disagio_del_giorno (data, disagio_id)
    VALUES (v_oggi, v_disagio_id)
    ON CONFLICT (data) DO NOTHING;
  END IF;

  RETURN v_disagio_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================
ALTER TABLE disagi ENABLE ROW LEVEL SECURITY;
ALTER TABLE voti ENABLE ROW LEVEL SECURITY;
ALTER TABLE disagio_del_giorno ENABLE ROW LEVEL SECURITY;

-- disagi: lettura pubblica solo per approvati
CREATE POLICY "disagi_lettura_approvati"
  ON disagi FOR SELECT
  USING (stato = 'approvato');

-- disagi: inserimento pubblico (submission)
CREATE POLICY "disagi_inserimento_pubblico"
  ON disagi FOR INSERT
  WITH CHECK (stato = 'in_attesa');

-- voti: lettura pubblica
CREATE POLICY "voti_lettura_pubblica"
  ON voti FOR SELECT
  USING (true);

-- voti: inserimento via RPC (SECURITY DEFINER bypassa RLS)
CREATE POLICY "voti_inserimento_rpc"
  ON voti FOR INSERT
  WITH CHECK (true);

-- disagio_del_giorno: lettura pubblica
CREATE POLICY "ddg_lettura_pubblica"
  ON disagio_del_giorno FOR SELECT
  USING (true);
