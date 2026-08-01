export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(minInclusive: number, maxInclusive: number): number {
    if (maxInclusive <= minInclusive) {
      return minInclusive;
    }

    return Math.floor(this.next() * (maxInclusive - minInclusive + 1)) + minInclusive;
  }

  float(minInclusive: number, maxInclusive: number, decimals = 2): number {
    const value = minInclusive + this.next() * (maxInclusive - minInclusive);
    return Number(value.toFixed(decimals));
  }

  bool(trueRatio = 0.5): boolean {
    return this.next() < trueRatio;
  }

  pick<T>(items: T[]): T {
    if (items.length === 0) {
      throw new Error('Cannot pick from an empty array');
    }

    return items[this.int(0, items.length - 1)];
  }

  pickManyUnique<T>(items: T[], count: number): T[] {
    if (count >= items.length) {
      return [...items];
    }

    const clone = [...items];
    const result: T[] = [];

    for (let i = 0; i < count; i += 1) {
      const idx = this.int(0, clone.length - 1);
      result.push(clone[idx]);
      clone.splice(idx, 1);
    }

    return result;
  }
}
