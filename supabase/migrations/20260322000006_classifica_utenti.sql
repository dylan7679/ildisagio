-- Migration: classifica utenti attivi
-- Aggiunge vista e funzione per la classifica degli utenti più attivi

-- Vista: utenti con le loro statistiche aggregate
CREATE OR REPLACE VIEW classifica_utenti_attivi AS
SELECT
  u.id,
  u.nickname,
  u.streak_corrente,
  u.disagi_proposti,
  u.data_iscrizione,
  COUNT(DISTINCT v.id) AS voti_totali,
  COUNT(DISTINCT d.id) AS disagi_approvati,
  -- Punteggio composito: voti (peso 1) + disagi approvati (peso 10) + streak (peso 5)
  (COUNT(DISTINCT v.id) + (COUNT(DISTINCT d.id) * 10) + (u.streak_corrente * 5)) AS punteggio_attivita
FROM utenti u
LEFT JOIN voti v ON v.user_id = u.id
LEFT JOIN disagi d ON d.proposto_da = u.id AND d.stato = 'approvato'
GROUP BY u.id, u.nickname, u.streak_corrente, u.disagi_proposti, u.data_iscrizione
ORDER BY punteggio_attivita DESC;

-- RLS: vista pubblica (lettura)
GRANT SELECT ON classifica_utenti_attivi TO anon, authenticated;
