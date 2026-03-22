-- ============================================================
-- IlDisagio — Migration: rate limit + elo decay
-- Eseguire SOLO se 20260322000004_fase2.sql è già stato eseguito
-- ============================================================

-- ============================================================
-- 1. RATE LIMITING per voti (max 100 ogni 10 minuti per fingerprint)
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

  RETURN v_count < 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 2. ELO DECAY
-- Disagi inattivi da 30+ giorni perdono 1 punto/giorno, max -50 dal peak
-- ============================================================

ALTER TABLE disagi ADD COLUMN IF NOT EXISTS elo_peak INTEGER;
UPDATE disagi SET elo_peak = punteggio_elo WHERE elo_peak IS NULL;

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
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 3. Aggiorna registra_voto con check rate limit integrato
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

  IF p_user_id IS NOT NULL THEN
    SELECT ultimo_voto INTO v_ultimo_voto
    FROM user_profiles WHERE id = p_user_id;

    IF v_ultimo_voto IS NULL OR v_ultimo_voto < v_oggi - INTERVAL '1 day' THEN
      v_nuovo_streak := 1;
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
