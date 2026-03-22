-- ============================================================
-- IlDisagio — Migration: Rank storico, streak, segnalazioni
-- ============================================================

-- ============================================================
-- 1. Tabella per storico rank giornaliero
-- ============================================================
CREATE TABLE IF NOT EXISTS rank_storico (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disagio_id  UUID NOT NULL REFERENCES disagi(id) ON DELETE CASCADE,
  rank_pos    INTEGER NOT NULL,
  data        DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(disagio_id, data)
);

ALTER TABLE rank_storico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rank_lettura_pubblica" ON rank_storico;
CREATE POLICY "rank_lettura_pubblica" ON rank_storico FOR SELECT USING (true);

-- Funzione per aggiornare lo storico rank (da chiamare 1x al giorno)
CREATE OR REPLACE FUNCTION aggiorna_rank_storico()
RETURNS void AS $$
BEGIN
  INSERT INTO rank_storico (disagio_id, rank_pos, data)
  SELECT id, ROW_NUMBER() OVER (ORDER BY punteggio_elo DESC), CURRENT_DATE
  FROM disagi
  WHERE stato = 'approvato'
  ON CONFLICT (disagio_id, data) DO UPDATE SET rank_pos = EXCLUDED.rank_pos;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Esegui subito per avere un baseline
SELECT aggiorna_rank_storico();

-- ============================================================
-- 2. Streak e ultimo_voto su user_profiles
-- ============================================================
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS streak_corrente INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS ultimo_voto DATE;

-- Funzione separata per aggiornare streak (opzionale, già gestita in registra_voto)
CREATE OR REPLACE FUNCTION aggiorna_streak(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_ultimo_voto DATE;
  v_streak INTEGER;
BEGIN
  SELECT ultimo_voto, streak_corrente
  INTO v_ultimo_voto, v_streak
  FROM user_profiles WHERE id = p_user_id;

  IF v_ultimo_voto IS NULL THEN
    UPDATE user_profiles SET streak_corrente = 1, ultimo_voto = CURRENT_DATE WHERE id = p_user_id;
    RETURN 1;
  ELSIF v_ultimo_voto = CURRENT_DATE THEN
    RETURN v_streak;
  ELSIF v_ultimo_voto = CURRENT_DATE - INTERVAL '1 day' THEN
    UPDATE user_profiles SET streak_corrente = streak_corrente + 1, ultimo_voto = CURRENT_DATE WHERE id = p_user_id;
    RETURN v_streak + 1;
  ELSE
    UPDATE user_profiles SET streak_corrente = 1, ultimo_voto = CURRENT_DATE WHERE id = p_user_id;
    RETURN 1;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 3. Tabella segnalazioni (flag community)
-- ============================================================
CREATE TABLE IF NOT EXISTS segnalazioni (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disagio_id  UUID NOT NULL REFERENCES disagi(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users(id),
  motivo      TEXT NOT NULL CHECK (motivo IN ('inappropriato', 'duplicato', 'non_pertinente', 'altro')),
  timestamp   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(disagio_id, user_id)
);

ALTER TABLE segnalazioni ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "segnalazioni_insert_autenticati" ON segnalazioni;
CREATE POLICY "segnalazioni_insert_autenticati"
  ON segnalazioni FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

DROP POLICY IF EXISTS "segnalazioni_lettura_pubblica" ON segnalazioni;
CREATE POLICY "segnalazioni_lettura_pubblica"
  ON segnalazioni FOR SELECT USING (true);
