const stateRangesByCepPrefix = [
  { start: 1000, end: 19999, state: 'SP' },
  { start: 20000, end: 28999, state: 'RJ' },
  { start: 29000, end: 29999, state: 'ES' },
  { start: 30000, end: 39999, state: 'MG' },
  { start: 40000, end: 48999, state: 'BA' },
  { start: 49000, end: 49999, state: 'SE' },
  { start: 50000, end: 56999, state: 'PE' },
  { start: 57000, end: 57999, state: 'AL' },
  { start: 58000, end: 58999, state: 'PB' },
  { start: 59000, end: 59999, state: 'RN' },
  { start: 60000, end: 63999, state: 'CE' },
  { start: 64000, end: 64999, state: 'PI' },
  { start: 65000, end: 65999, state: 'MA' },
  { start: 66000, end: 68899, state: 'PA' },
  { start: 68900, end: 68999, state: 'AP' },
  { start: 69000, end: 69299, state: 'AM' },
  { start: 69300, end: 69399, state: 'RR' },
  { start: 69400, end: 69899, state: 'AM' },
  { start: 69900, end: 69999, state: 'AC' },
  { start: 70000, end: 72799, state: 'DF' },
  { start: 72800, end: 72999, state: 'GO' },
  { start: 73000, end: 73699, state: 'DF' },
  { start: 73700, end: 76799, state: 'GO' },
  { start: 76800, end: 76999, state: 'RO' },
  { start: 77000, end: 77999, state: 'TO' },
  { start: 78000, end: 78899, state: 'MT' },
  { start: 79000, end: 79999, state: 'MS' },
  { start: 80000, end: 87999, state: 'PR' },
  { start: 88000, end: 89999, state: 'SC' },
  { start: 90000, end: 99999, state: 'RS' },
]

export const inferStateFromCep = (cep: string, fallbackState = 'SC') => {
  const normalizedFallback = fallbackState.trim().toUpperCase()
  const prefix = Number.parseInt(cep.slice(0, 5), 10)

  if (Number.isNaN(prefix)) return normalizedFallback

  const matched = stateRangesByCepPrefix.find((range) => prefix >= range.start && prefix <= range.end)
  return matched?.state ?? normalizedFallback
}
