-- ============================================================
-- IlDisagio — Migration: auth + immagini
-- Aggiunge supporto per immagini ai disagi, profili utente
-- collegati a Supabase Auth, e policy admin.
-- ============================================================

-- ============================================================
-- 1. Colonna foto_url su disagi
-- Permette di associare un'immagine a ogni disagio.
-- ============================================================
ALTER TABLE disagi ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- ============================================================
-- 2. Tabella user_profiles (collegata a auth.users)
-- Profilo utente con flag admin e contatore voti.
-- ============================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname         TEXT,
  email            TEXT,
  is_admin         BOOLEAN NOT NULL DEFAULT false,
  data_iscrizione  TIMESTAMPTZ NOT NULL DEFAULT now(),
  voti_totali      INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_is_admin
  ON user_profiles (is_admin) WHERE is_admin = true;

-- ============================================================
-- 3. Aggiorna registra_voto per incrementare voti_totali
-- Quando l'utente e' autenticato (p_user_id non null),
-- aggiorna il counter sul profilo con upsert.
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

  -- Leggi punteggi attuali con lock per evitare race condition
  SELECT punteggio_elo INTO v_elo_vincitore FROM disagi WHERE id = p_vincitore FOR UPDATE;
  SELECT punteggio_elo INTO v_elo_perdente  FROM disagi WHERE id = p_perdente  FOR UPDATE;

  IF v_elo_vincitore IS NULL OR v_elo_perdente IS NULL THEN
    RAISE EXCEPTION 'Disagio non trovato';
  END IF;

  -- Calcolo Elo
  v_attesa   := 1.0 / (1.0 + power(10.0, (v_elo_perdente - v_elo_vincitore)::FLOAT / 400.0));
  v_nuovo_v  := v_elo_vincitore + ROUND(v_k * (1.0 - v_attesa));
  v_nuovo_p  := v_elo_perdente  + ROUND(v_k * (0.0 - (1.0 - v_attesa)));

  -- Inserisci voto (lancia eccezione se coppia gia' votata dal fingerprint)
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

  -- Incrementa contatore voti sul profilo utente (se autenticato)
  IF p_user_id IS NOT NULL THEN
    INSERT INTO user_profiles (id, voti_totali)
    VALUES (p_user_id, 1)
    ON CONFLICT (id) DO UPDATE SET voti_totali = user_profiles.voti_totali + 1;
  END IF;

  RETURN json_build_object(
    'vincitore_elo', v_nuovo_v,
    'perdente_elo',  v_nuovo_p
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 4. RLS su user_profiles
-- ============================================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Lettura pubblica: i profili non contengono dati sensibili
CREATE POLICY "profili_lettura_pubblica"
  ON user_profiles FOR SELECT
  USING (true);

-- Ogni utente puo' aggiornare solo il proprio profilo
CREATE POLICY "profili_update_proprio"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- Ogni utente puo' inserire solo il proprio profilo
CREATE POLICY "profili_insert_proprio"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- 5. Policy admin per disagi
-- Sostituisce la vecchia policy di sola lettura approvati
-- con una che permette agli admin di vedere tutto.
-- ============================================================

-- Rimuovi la policy precedente che permetteva solo lettura di approvati
DROP POLICY IF EXISTS "disagi_lettura_approvati" ON disagi;

-- Admin vede tutti i disagi; utenti normali solo approvati
CREATE POLICY "disagi_lettura_admin"
  ON disagi FOR SELECT
  USING (
    stato = 'approvato'
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
    OR auth.email() = 'gtngrossi@gmail.com'
  );

-- Admin puo' aggiornare qualsiasi disagio (stato, foto_url, testo, ecc.)
CREATE POLICY "disagi_update_admin"
  ON disagi FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
    OR auth.email() = 'gtngrossi@gmail.com'
  );

-- ============================================================
-- 6. Trigger: crea profilo automaticamente dopo registrazione
-- Quando un utente si registra via Supabase Auth, viene creato
-- automaticamente un profilo. L'email gtngrossi@gmail.com
-- diventa admin automaticamente.
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, is_admin)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.email = 'gtngrossi@gmail.com'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Il trigger potrebbe gia' esistere in una migration futura; DROP IF EXISTS per idempotenza
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- 7. STORAGE (da configurare manualmente nel dashboard Supabase)
-- ============================================================
-- STORAGE: Creare manualmente nel dashboard Supabase:
-- 1. Bucket: "disagio-images" (public: true)
-- 2. Policy upload: solo utenti con is_admin=true o email gtngrossi@gmail.com
-- 3. Policy read: pubblica
-- 4. Formati accettati: image/jpeg, image/png, image/webp
-- 5. Dimensione massima consigliata: 2 MB per immagine
