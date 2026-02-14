const FNV_OFFSET = 2166136261;
const FNV_PRIME = 16777619;

function hashString(seed: string): number {
  let hash = FNV_OFFSET;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }
  return hash >>> 0;
}

function mixBits(a: number, b: number, c: number, d: number): number {
  let x = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b);
  x ^= Math.imul(b ^ 0xc2b2ae35, 0x27d4eb2d);
  x ^= Math.imul(c ^ 0x165667b1, 0x85ebca77);
  x ^= Math.imul(d ^ 0xd3a2646c, 0xc2b2ae3d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return x >>> 0;
}

export function hashUnit(seed: string, x: number, z: number, channel: number): number {
  const sx = (x ^ (x >>> 16)) >>> 0;
  const sz = (z ^ (z >>> 16)) >>> 0;
  const mixed = mixBits(hashString(seed), sx, sz, channel >>> 0);
  return mixed / 4294967296;
}
