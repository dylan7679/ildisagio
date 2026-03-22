-- ============================================================
-- IlDisagio — Migration: Fase 2
-- Rank movement, streak, segnalazioni, feedback
-- ============================================================

-- 1. Rank precedente su disagi (per frecce ↑↓)
ALTER TABLE disagi ADD COLUMN IF NOT EXISTS rank_precedente INTEGER;

-- Funzione per aggiornare snapshot rank (chiamare 1x/giorno)
CREATE OR REPLACE FUNCTION aggiorna_rank_precedente()
RETURNS void AS $$
BEGIN
  UPDATE disagi d
  SET rank_precedente = r.rank_attuale
  FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY punteggio_elo DESC) AS rank_attuale
    FROM disagi WHERE stato = 'approvato'
  ) r
  WHERE d.id = r.id AND d.stato = 'approvato';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Esegui subito per inizializzare
SELECT aggiorna_rank_precedente();

-- ============================================================
-- 2. Streak e ultimo_voto su user_profiles
-- ============================================================
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS streak_corrente INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS ultimo_voto DATE;

-- ============================================================
-- 3. Aggiorna registra_voto per gestire streak
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
  v_oggi          DATE := CURRENT_DATE;
  v_ultimo_voto   DATE;
  v_nuovo_streak  INTEGER;
BEGIN
  v_hash := LEAST(p_vincitore::TEXT, p_perdente::TEXT)
            || '_' ||
            GREATEST(p_vincitore::TEXT, p_perdente::TEXT);

  SELECT punteggio_elo INTO v_elo_vincitore FROM disagi WHERE id = p_vincitore FOR UPDATE;
  SELECT punteggio_elo INTO v_elo_perdente  FROM disagi WHERE id = p_perdente  FOR UPDATE;

  IF v_elo_vincitore IS NULL OR v_elo_perdente IS NULL THEN
    RAISE EXCEPTION 'Disagio non trovato';
  END IF;

  v_attesa   := 1.0 / (1.0 + power(10.0, (v_elo_perdente - v_elo_vincitore)::FLOAT / 400.0));
  v_nuovo_v  := v_elo_vincitore + ROUND(v_k * (1.0 - v_attesa));
  v_nuovo_p  := v_elo_perdente  + ROUND(v_k * (0.0 - (1.0 - v_attesa)));

  INSERT INTO voti (id_disagio_vincitore, id_disagio_perdente, user_fingerprint, user_id, coppia_hash)
  VALUES (p_vincitore, p_perdente, p_fingerprint, p_user_id, v_hash);

  UPDATE disagi SET
    punteggio_elo = v_nuovo_v,
    numero_sfide  = numero_sfide + 1
  WHERE id = p_vincitore;

  UPDATE disagi SET
    punteggio_elo = v_nuovo_p,
    numero_sfide  = numero_sfide + 1
  WHERE id = p_perdente;

  -- Aggiorna profilo utente se autenticato
  IF p_user_id IS NOT NULL THEN
    SELECT ultimo_voto INTO v_ultimo_voto
    FROM user_profiles WHERE id = p_user_id;

    IF v_ultimo_voto IS NULL OR v_ultimo_voto < v_oggi - INTERVAL '1 day' THEN
      v_nuovo_streak := 1; -- reset
    ELSIF v_ultimo_voto = v_oggi - INTERVAL '1 day' THEN
      SELECT COALESCE(streak_corrente, 0) + 1 INTO v_nuovo_streak
      FROM user_profiles WHERE id = p_user_id;
    ELSE
      SELECT COALESCE(streak_corrente, 0) INTO v_nuovo_streak
      FROM user_profiles WHERE id = p_user_id;
    END IF;

    INSERT INTO user_profiles (id, voti_totali, streak_corrente, ultimo_voto)
    VALUES (p_user_id, 1, v_nuovo_streak, v_oggi)
    ON CONFLICT (id) DO UPDATE SET
      voti_totali     = user_profiles.voti_totali + 1,
      streak_corrente = v_nuovo_streak,
      ultimo_voto     = v_oggi;
  END IF;

  RETURN json_build_object(
    'vincitore_elo', v_nuovo_v,
    'perdente_elo',  v_nuovo_p
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 4. Tabella segnalazioni (flag community)
-- ============================================================
CREATE TABLE IF NOT EXISTS segnalazioni (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disagio_id  UUID NOT NULL REFERENCES disagi(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  motivo      TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (disagio_id, user_id)
);

ALTER TABLE segnalazioni ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "segnalazioni_insert" ON segnalazioni;
CREATE POLICY "segnalazioni_insert"
  ON segnalazioni FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "segnalazioni_proprie" ON segnalazioni;
CREATE POLICY "segnalazioni_proprie"
  ON segnalazioni FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "segnalazioni_admin" ON segnalazioni;
CREATE POLICY "segnalazioni_admin"
  ON segnalazioni FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
    OR auth.email() = 'gtngrossi@gmail.com'
  );

DROP POLICY IF EXISTS "segnalazioni_delete_admin" ON segnalazioni;
CREATE POLICY "segnalazioni_delete_admin"
  ON segnalazioni FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
    OR auth.email() = 'gtngrossi@gmail.com'
  );

-- Conta segnalazioni per disagio (per admin)
CREATE OR REPLACE FUNCTION conta_segnalazioni(p_disagio_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM segnalazioni WHERE disagio_id = p_disagio_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================
-- 5. Tabella feedback (bug report / suggerimenti)
-- ============================================================
CREATE TABLE IF NOT EXISTS feedback (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo        TEXT NOT NULL CHECK (tipo IN ('bug', 'suggerimento', 'altro')),
  testo       TEXT NOT NULL,
  email       TEXT,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  letto       BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feedback_insert_tutti" ON feedback;
CREATE POLICY "feedback_insert_tutti"
  ON feedback FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "feedback_admin" ON feedback;
CREATE POLICY "feedback_admin"
  ON feedback FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
    OR auth.email() = 'gtngrossi@gmail.com'
  );

DROP POLICY IF EXISTS "feedback_update_admin" ON feedback;
CREATE POLICY "feedback_update_admin"
  ON feedback FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
    OR auth.email() = 'gtngrossi@gmail.com'
  );

-- ============================================================
-- 6. RATE LIMITING per voti
-- ============================================================

CREATE OR REPLACE FUNCTION check_rate_limit(p_fingerprint TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM voti
  WHERE user_fingerprint = p_fingerprint
    AND timestamp > NOW() - INTERVAL '10 minutes';

  RETURN v_count < 100; -- true = OK, false = rate limited
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 7. ELO DECAY
-- ============================================================

-- Colonna per tracciare il punteggio peak (massimo raggiunto)
ALTER TABLE disagi ADD COLUMN IF NOT EXISTS elo_peak INTEGER;

-- Inizializza elo_peak con il punteggio attuale per i disagi esistenti
UPDATE disagi SET elo_peak = punteggio_elo WHERE elo_peak IS NULL;

-- Trigger per aggiornare elo_peak ad ogni aggiornamento del punteggio
CREATE OR REPLACE FUNCTION aggiorna_elo_peak()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.punteggio_elo > COALESCE(OLD.elo_peak, 0) THEN
    NEW.elo_peak := NEW.punteggio_elo;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_aggiorna_elo_peak ON disagi;
CREATE TRIGGER trigger_aggiorna_elo_peak
  BEFORE UPDATE OF punteggio_elo ON disagi
  FOR EACH ROW EXECUTE FUNCTION aggiorna_elo_peak();

-- Funzione di decay (da chiamare 1x al giorno via cron o manualmente)
CREATE OR REPLACE FUNCTION applica_elo_decay()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  UPDATE disagi
  SET punteggio_elo = GREATEST(
    punteggio_elo - 1,
    COALESCE(elo_peak, punteggio_elo) - 50
  )
  WHERE stato = 'approvato'
    AND id NOT IN (
      SELECT DISTINCT COALESCE(id_disagio_vincitore, id_disagio_perdente)
      FROM voti
      WHERE timestamp > NOW() - INTERVAL '30 days'
    )
    AND punteggio_elo > COALESCE(elo_peak, punteggio_elo) - 50;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count; -- ritorna quanti disagi aggiornati
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 8. AGGIORNA registra_voto con rate limit check
-- (sovrascrive la versione della sezione 3 aggiungendo il check)
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
  v_rate_ok       BOOLEAN;
  v_oggi          DATE := CURRENT_DATE;
  v_ultimo_voto   DATE;
  v_nuovo_streak  INTEGER;
BEGIN
  -- Check rate limit
  SELECT check_rate_limit(p_fingerprint) INTO v_rate_ok;
  IF NOT v_rate_ok THEN
    RAISE EXCEPTION 'rate_limited' USING ERRCODE = 'P0001';
  END IF;

  v_hash := LEAST(p_vincitore::TEXT, p_perdente::TEXT)
            || '_' ||
            GREATEST(p_vincitore::TEXT, p_perdente::TEXT);

  SELECT punteggio_elo INTO v_elo_vincitore FROM disagi WHERE id = p_vincitore FOR UPDATE;
  SELECT punteggio_elo INTO v_elo_perdente  FROM disagi WHERE id = p_perdente  FOR UPDATE;

  IF v_elo_vincitore IS NULL OR v_elo_perdente IS NULL THEN
    RAISE EXCEPTION 'Disagio non trovato';
  END IF;

  v_attesa   := 1.0 / (1.0 + power(10.0, (v_elo_perdente - v_elo_vincitore)::FLOAT / 400.0));
  v_nuovo_v  := v_elo_vincitore + ROUND(v_k * (1.0 - v_attesa));
  v_nuovo_p  := v_elo_perdente  + ROUND(v_k * (0.0 - (1.0 - v_attesa)));

  INSERT INTO voti (id_disagio_vincitore, id_disagio_perdente, user_fingerprint, user_id, coppia_hash)
  VALUES (p_vincitore, p_perdente, p_fingerprint, p_user_id, v_hash);

  UPDATE disagi SET
    punteggio_elo = v_nuovo_v,
    numero_sfide  = numero_sfide + 1
  WHERE id = p_vincitore;

  UPDATE disagi SET
    punteggio_elo = v_nuovo_p,
    numero_sfide  = numero_sfide + 1
  WHERE id = p_perdente;

  -- Aggiorna profilo utente se autenticato
  IF p_user_id IS NOT NULL THEN
    SELECT ultimo_voto INTO v_ultimo_voto
    FROM user_profiles WHERE id = p_user_id;

    IF v_ultimo_voto IS NULL OR v_ultimo_voto < v_oggi - INTERVAL '1 day' THEN
      v_nuovo_streak := 1; -- reset
    ELSIF v_ultimo_voto = v_oggi - INTERVAL '1 day' THEN
      SELECT COALESCE(streak_corrente, 0) + 1 INTO v_nuovo_streak
      FROM user_profiles WHERE id = p_user_id;
    ELSE
      SELECT COALESCE(streak_corrente, 0) INTO v_nuovo_streak
      FROM user_profiles WHERE id = p_user_id;
    END IF;

    INSERT INTO user_profiles (id, voti_totali, streak_corrente, ultimo_voto)
    VALUES (p_user_id, 1, v_nuovo_streak, v_oggi)
    ON CONFLICT (id) DO UPDATE SET
      voti_totali     = user_profiles.voti_totali + 1,
      streak_corrente = v_nuovo_streak,
      ultimo_voto     = v_oggi;
  END IF;

  RETURN json_build_object(
    'vincitore_elo', v_nuovo_v,
    'perdente_elo',  v_nuovo_p
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
