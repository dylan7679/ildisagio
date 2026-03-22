const K = 32

/**
 * Calcola i nuovi punteggi Elo dopo un duello.
 * Usato lato client solo per preview UI — l'aggiornamento reale avviene server-side via RPC.
 */
export function calcolaElo(punteggioA, punteggioB, haVintoA) {
  const attesaA = 1 / (1 + Math.pow(10, (punteggioB - punteggioA) / 400))
  const attesaB = 1 - attesaA
  const risultatoA = haVintoA ? 1 : 0
  const risultatoB = 1 - risultatoA

  return {
    nuovoPunteggioA: Math.round(punteggioA + K * (risultatoA - attesaA)),
    nuovoPunteggioB: Math.round(punteggioB + K * (risultatoB - attesaB))
  }
}

/**
 * Genera l'hash univoco per una coppia di disagi.
 * Deterministico: lo stesso hash indipendentemente dall'ordine dei due id.
 */
export function generaCoppiaHash(idA, idB) {
  const min = idA < idB ? idA : idB
  const max = idA < idB ? idB : idA
  return `${min}_${max}`
}
