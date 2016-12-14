declare module 'memcached' {

  namespace Memcached {
    interface MemcachedOptions {
    }

  }

  class Memcached {
    constructor(server: string, opts?: Memcached.MemcachedOptions);
    get(key: string, callback: (err: Error, data: any) => void): void;
    set(
      key: string, 
      value: string|Buffer, 
      lifetime: number, //lifetime of the key in seconds
      callback: (err: Error, data: any) => void): void;
  }

  export = Memcached;
}