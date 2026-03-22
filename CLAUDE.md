# CLAUDE.md — IlDisagio

## Panoramica progetto

**IlDisagio** (`ildisagio.it`) è una piattaforma partecipativa dove gli utenti votano situazioni di "disagio quotidiano" in duelli 1v1. I disagi salgono o scendono in classifica tramite algoritmo Elo. Il tono è ironico, mai crudele — si ride con, mai di.

Target: italiani 18-32 anni. Lingua iniziale: italiano. Espansione internazionale in fase 3.

---

## Stato sviluppo attuale

**Versione:** 0.2.0 — build funzionante, connessa a Supabase, pronta per lancio soft.

**Completato:**
- ✅ MVP completo: duello Elo, classifica, disagio del giorno, form submission, admin panel
- ✅ Design system "Organic Brutalism / Living Comic Strip" (light theme, cartoon ink shadows)
- ✅ Font: Plus Jakarta Sans (headline) + Be Vietnam Pro (body) + Material Symbols
- ✅ Auth opzionale Supabase (email/password) con classifica personale
- ✅ Admin potenziato: gestione submission, tutti i disagi con upload foto, gestione utenti
- ✅ Database: 160 disagi seed di qualità + schema completo con RLS
- ✅ PWA installabile, SEO con Open Graph
- ✅ Supabase URL: `sypufalvhbwtsrndbfof.supabase.co`

**Da fare prima del lancio:**
- [ ] Eseguire migration `20260322000002_auth_immagini.sql` su Supabase
- [ ] Creare bucket Storage `disagio-images` (public) su Supabase dashboard
- [ ] Abilitare auth email/password su Supabase dashboard
- [ ] Creare account admin `gtngrossi@gmail.com` su Supabase Auth
- [ ] Deploy su Vercel + configurare env vars
- [ ] Cambiare `VITE_ADMIN_PASSWORD` in `.env`

---

## Stack tecnico

| Layer     | Tecnologia                                  |
|-----------|---------------------------------------------|
| Frontend  | React 19 + Vite 8 + Tailwind CSS v4         |
| Font      | Plus Jakarta Sans + Be Vietnam Pro + Material Symbols |
| PWA       | `vite-plugin-pwa` (manifest + service worker) |
| Auth      | Supabase Auth (email/password, opzionale)   |
| Backend   | Supabase (PostgreSQL + Auth + REST API + Storage) |
| Hosting   | Vercel (frontend) + Supabase Cloud (backend) |
| Pagamenti | Stripe (fase 2+)                            |

**Architettura:** API-first. Il frontend consuma endpoint REST di Supabase. Nessun server custom nell'MVP.

**Perché PWA e non nativa:** il flusso virale è TikTok/Instagram/WhatsApp → link → dentro il prodotto in 1 secondo. Un'app nativa aggiunge friction (store → download → attesa). La PWA azzera questo problema. App nativa prevista in fase 3 con React Native sullo stesso backend.

---

## Struttura database

### `disagi`
```sql
CREATE TABLE disagi (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  testo             TEXT NOT NULL,
  categoria         TEXT CHECK (categoria IN ('sociale', 'digitale', 'relazionale', 'pubblico', 'lavoro', 'appuntamenti')),
  lingua            TEXT DEFAULT 'it',
  punteggio_elo     INTEGER DEFAULT 1000,
  numero_sfide      INTEGER DEFAULT 0,
  data_inserimento  TIMESTAMPTZ DEFAULT now(),
  stato             TEXT DEFAULT 'in_attesa' CHECK (stato IN ('approvato', 'in_attesa', 'rifiutato')),
  proposto_da       UUID REFERENCES utenti(id)
);
```

### `voti`
```sql
CREATE TABLE voti (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_disagio_vincitore  UUID NOT NULL REFERENCES disagi(id),
  id_disagio_perdente   UUID NOT NULL REFERENCES disagi(id),
  timestamp             TIMESTAMPTZ DEFAULT now(),
  user_fingerprint      TEXT NOT NULL,
  user_id               UUID REFERENCES utenti(id),
  coppia_hash           TEXT NOT NULL -- formato: min(id_a, id_b)_max(id_a, id_b)
);

-- Vincolo: un fingerprint può votare una coppia una sola volta
CREATE UNIQUE INDEX idx_voti_coppia_unica ON voti (user_fingerprint, coppia_hash);
```

### `utenti` (fase 2 — non nell'MVP)
```sql
CREATE TABLE utenti (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname         TEXT,
  email            TEXT,
  streak_corrente  INTEGER DEFAULT 0,
  ultimo_voto      DATE,
  data_iscrizione  TIMESTAMPTZ DEFAULT now(),
  disagi_proposti  INTEGER DEFAULT 0
);
```

### `disagi_salvati` (fase 2)
```sql
CREATE TABLE disagi_salvati (
  user_id    UUID REFERENCES utenti(id),
  disagio_id UUID REFERENCES disagi(id),
  data       TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, disagio_id)
);
```

---

## Algoritmo Elo

Ogni disagio parte da **1000 punti**. K-factor = 32.

```javascript
function calcolaElo(punteggioA, punteggioB, haVintoA, K = 32) {
  const attesaA = 1 / (1 + Math.pow(10, (punteggioB - punteggioA) / 400));
  const attesaB = 1 - attesaA;
  const risultatoA = haVintoA ? 1 : 0;
  const risultatoB = 1 - risultatoA;
  return {
    nuovoPunteggioA: Math.round(punteggioA + K * (risultatoA - attesaA)),
    nuovoPunteggioB: Math.round(punteggioB + K * (risultatoB - attesaB))
  };
}
```

### Matchmaking
- Preferire disagi con punteggi simili (delta ±200 punti Elo)
- 20% di probabilità di abbinare un disagio nuovo (poche sfide) contro uno consolidato, per dargli visibilità

### Decadimento temporale
- Disagi non votati da 30+ giorni: -1 punto Elo/giorno, max -50 punti totali
- Implementare come cron job o Supabase Edge Function schedulata

---

## Anti-abuse (obbligatorio nell'MVP)

| Misura | Dettaglio |
|--------|-----------|
| Rate limiting IP | Max 100 voti / 10 minuti per IP |
| No voto duplicato | `coppia_hash = min(id_a, id_b)_max(id_a, id_b)`, unique per fingerprint |
| Fingerprinting | Libreria `@fingerprintjs/fingerprintjs` (versione open source) |
| Honeypot | Campo nascosto nel form submission — se compilato, è bot |
| Throttle submission | Max 3 nuovi disagi / 24h per IP |

---

## Feature MVP (Fase 1) — Checklist

- [ ] **Duello UI**: due card con testo del disagio, bottone scelta, animazione transizione al prossimo duello
- [ ] **Algoritmo Elo**: aggiornamento punteggi ad ogni voto, implementato lato Supabase (RPC function o Edge Function)
- [ ] **Classifica globale**: top 50 disagi ordinati per `punteggio_elo` DESC, con posizione e punteggio
- [ ] **Disagio del Giorno**: selezione automatica ore 09:00 IT, contatore live voti giornalieri, archiviazione risultato
- [ ] **Form submission**: testo + categoria, con honeypot e throttle
- [ ] **Pannello admin**: route protetta (`/admin`), password semplice, lista submission `in_attesa`, azioni: approva / rifiuta / modifica
- [ ] **Database iniziale**: 150-200 disagi scritti manualmente, di alta qualità, ben distribuiti tra categorie
- [ ] **Anti-abuse base**: rate limiting IP + vincolo unicità coppia per fingerprint
- [ ] **PWA**: manifest.json, service worker, installabilità su homescreen
- [ ] **SEO**: ogni disagio ha pagina dedicata con `og:title`, `og:description`, `og:image` dinamica

### Da NON costruire nell'MVP
Profili utente, registrazione, classifiche per categoria/nazione/età/genere, commenti, notifiche push, streak, torneo mensile, monetizzazione, app nativa, multilingua, moderazione AI.

---

## Struttura progetto prevista

```
ildisagio/
├── public/
│   ├── manifest.json
│   └── icons/
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── components/
│   │   ├── Duello.jsx          # Card duello con scelta
│   │   ├── Classifica.jsx      # Top 50
│   │   ├── DisagioDelGiorno.jsx
│   │   ├── FormSubmission.jsx  # Proponi nuovo disagio
│   │   └── Layout.jsx          # Shell mobile-first
│   ├── pages/
│   │   ├── Home.jsx            # Duello + Disagio del Giorno
│   │   ├── ClassificaPage.jsx
│   │   ├── SubmitPage.jsx
│   │   ├── DisagioPage.jsx     # Pagina singolo disagio (SEO)
│   │   └── Admin.jsx           # Pannello moderazione
│   ├── lib/
│   │   ├── supabase.js         # Client Supabase
│   │   ├── elo.js              # Funzione calcolo Elo
│   │   └── fingerprint.js      # Setup FingerprintJS
│   └── styles/
│       └── globals.css         # Tailwind base
├── supabase/
│   └── migrations/             # SQL migrations
├── index.html
├── vite.config.js
├── tailwind.config.js
├── package.json
└── CLAUDE.md
```

---

## API endpoints (Supabase REST / RPC)

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/disagi?stato=eq.approvato&order=punteggio_elo.desc&limit=50` | Classifica top 50 |
| GET | `/rpc/get_match` | Ritorna coppia di disagi per il duello (logica matchmaking) |
| POST | `/rpc/registra_voto` | Registra voto + aggiorna Elo (transazione atomica) |
| POST | `/disagi` | Submission nuovo disagio (stato: `in_attesa`) |
| GET | `/disagi?id=eq.{id}` | Singolo disagio (per pagina SEO) |
| PATCH | `/disagi?id=eq.{id}` | Admin: approva/rifiuta/modifica |

La funzione `registra_voto` deve essere una Supabase RPC (plpgsql) per garantire atomicità: inserisce il voto E aggiorna i punteggi Elo in un'unica transazione.

```sql
CREATE OR REPLACE FUNCTION registra_voto(
  p_vincitore UUID,
  p_perdente UUID,
  p_fingerprint TEXT,
  p_user_id UUID DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_elo_vincitore INTEGER;
  v_elo_perdente INTEGER;
  v_attesa FLOAT;
  v_k INTEGER := 32;
  v_hash TEXT;
BEGIN
  -- Calcola hash coppia
  v_hash := LEAST(p_vincitore::TEXT, p_perdente::TEXT) || '_' || GREATEST(p_vincitore::TEXT, p_perdente::TEXT);

  -- Ottieni punteggi attuali
  SELECT punteggio_elo INTO v_elo_vincitore FROM disagi WHERE id = p_vincitore;
  SELECT punteggio_elo INTO v_elo_perdente FROM disagi WHERE id = p_perdente;

  -- Calcola Elo
  v_attesa := 1.0 / (1.0 + power(10.0, (v_elo_perdente - v_elo_vincitore)::FLOAT / 400.0));

  -- Inserisci voto
  INSERT INTO voti (id_disagio_vincitore, id_disagio_perdente, user_fingerprint, user_id, coppia_hash)
  VALUES (p_vincitore, p_perdente, p_fingerprint, p_user_id, v_hash);

  -- Aggiorna punteggi
  UPDATE disagi SET
    punteggio_elo = punteggio_elo + ROUND(v_k * (1 - v_attesa)),
    numero_sfide = numero_sfide + 1
  WHERE id = p_vincitore;

  UPDATE disagi SET
    punteggio_elo = punteggio_elo + ROUND(v_k * (0 - (1 - v_attesa))),
    numero_sfide = numero_sfide + 1
  WHERE id = p_perdente;
END;
$$ LANGUAGE plpgsql;
```

---

## Disagio del Giorno

- Selezione: ogni giorno alle 09:00 CET, selezionare il disagio approvato con più voti ricevuti nelle ultime 24h (o random tra i top 10 per variabilità)
- Implementare come Supabase Edge Function schedulata o cron
- Salvare in una tabella `disagio_del_giorno` (data DATE PK, disagio_id UUID FK) per storico
- Il frontend mostra: testo del disagio, contatore live voti giornalieri, badge "Disagio del Giorno"

---

## Linee guida di design

- **Mobile-first**: il 90%+ degli utenti arriva da telefono
- **Viewport**: progettare per 375px di larghezza come base
- **Interazione duello**: swipe-friendly, touch target grandi (min 48px), feedback visivo immediato al tap
- **Palette**: toni caldi/ironici, evitare corporate/freddo. Il brand comunica "siamo tutti imbarazzanti"
- **Typography**: leggibile, font sans-serif, testo dei disagi grande e centrale
- **Animazioni**: transizioni fluide tra duelli, feedback scelta (es. card vincitrice che "sale")

---

## Principi editoriali (moderazione)

1. Il disagio è **situazionale**, mai identitario — si ride della situazione, non della persona
2. Deve essere **universalmente riconoscibile**, non specifico di un gruppo
3. **Nessuna sofferenza reale** — test: "lascia un sorriso o una ferita?"
4. Mai caratteristiche fisiche, identitarie o demografiche come oggetto del disagio

Processo MVP: tutto `in_attesa` → admin approva/rifiuta/modifica → mai ingresso automatico.

---

## Privacy e GDPR (MVP)

- Nessuna registrazione obbligatoria
- Nessun dato personale raccolto oltre fingerprint tecnico (non PII)
- Cookie solo tecnici (no tracking di terze parti)
- Informativa privacy e cookie banner da aggiungere prima del lancio pubblico
- Il fingerprint browser non è un cookie: documentare base legale (legittimo interesse per anti-abuse)

---

## Roadmap

### Fase 1 — MVP (settimane 1-8)
Setup progetto → componenti core → form + admin → database 150-200 disagi → anti-abuse → SEO → lancio soft

### Fase 2 — Consolidamento (mesi 3-6)
Profili utente opzionali, streak, movimento classifica, classifiche per categoria, flag community, donazioni + submission prioritaria a pagamento (Stripe)

### Fase 3 — Espansione (mesi 7-12+)
App React Native, store Android/iOS, torneo mensile, internazionalizzazione (ES/EN), classifiche demografiche, branded content

---

## Metriche di successo MVP

Le uniche 3 metriche che contano in fase 1:
1. **Sessioni ripetute** nei primi 7 giorni (l'utente torna?)
2. **Sharing actions** (l'utente manda link ad altri?)
3. **Submission** di nuovi disagi (l'utente vuole partecipare?)

Soglia di validazione: 500 utenti con sessioni ripetute dopo 4 settimane = il prodotto ha basi.

---

## Note operative

- Il vero vantaggio competitivo è il **contenuto**, non la tecnologia. Investire il 60% del tempo pre-lancio nella qualità dei 150-200 disagi iniziali.
- Moderazione manuale totale in fase 1. Meglio 200 disagi ottimi che 2.000 mediocri.
- Non aggiungere feature finché la retention non è dimostrata.
- Il tono editoriale è la difesa principale contro la tossicità.

---

## Comandi utili

```bash
# Setup progetto
npm create vite@latest ildisagio -- --template react
cd ildisagio
npm install @supabase/supabase-js @fingerprintjs/fingerprintjs
npm install -D tailwindcss @tailwindcss/vite vite-plugin-pwa

# Dev
npm run dev

# Build
npm run build

# Preview build
npm run preview
```
