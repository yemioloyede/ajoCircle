export interface CacheClient {
  get(key: string): Promise<string | null>;
  setex(key: string, ttlSeconds: number, value: string): Promise<void>;
  del(key: string): Promise<void>;
  delByPattern(pattern: string): Promise<number>;
  lpush(key: string, value: string): Promise<void>;
  lrange(key: string, start: number, stop: number): Promise<string[]>;
}

type ExpiringValue = {
  value: string;
  expiresAt: number | null;
};

export class InMemoryCache implements CacheClient {
  private kv = new Map<string, ExpiringValue>();
  private lists = new Map<string, string[]>();

  async get(key: string): Promise<string | null> {
    const entry = this.kv.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.kv.delete(key);
      return null;
    }
    return entry.value;
  }

  async setex(key: string, ttlSeconds: number, value: string): Promise<void> {
    this.kv.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async del(key: string): Promise<void> {
    this.kv.delete(key);
    this.lists.delete(key);
  }

  async delByPattern(pattern: string): Promise<number> {
    const regex = new RegExp(
      '^' +
        pattern
          .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
          .replace(/\*/g, '.*') +
        '$'
    );

    let deleted = 0;
    for (const key of Array.from(this.kv.keys())) {
      if (regex.test(key)) {
        this.kv.delete(key);
        deleted += 1;
      }
    }
    for (const key of Array.from(this.lists.keys())) {
      if (regex.test(key)) {
        this.lists.delete(key);
        deleted += 1;
      }
    }
    return deleted;
  }

  async lpush(key: string, value: string): Promise<void> {
    const list = this.lists.get(key) || [];
    list.unshift(value);
    this.lists.set(key, list.slice(0, 100));
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    const list = this.lists.get(key) || [];
    const normalizedStop = stop < 0 ? list.length + stop : stop;
    return list.slice(start, normalizedStop + 1);
  }
}
