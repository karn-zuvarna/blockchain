import {getAddress, isAddress} from 'viem'

/** ---------- helpers ---------- */
export const need = (k: string) => {
  const v = process.env[k]?.trim()
  if (!v) throw new Error(`Missing ENV: ${k}`)
  return v
}
export const asPk = (pk: string) => {
  let p = pk.trim()
  if (!p.startsWith('0x')) p = '0x' + p
  if (p.length !== 66) throw new Error(`Invalid ${p.length}-char private key. Need 66 (0x + 64 hex).`)
  return p as `0x${string}`
}
export const asAddr = (name: string, v: string) => {
  const s = v.trim()
  if (!s.startsWith('0x') || !isAddress(s)) throw new Error(`${name} invalid: ${s}`)
  return getAddress(s) // checksum
}