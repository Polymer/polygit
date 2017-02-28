/**
 * @license
 * Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import * as Memcached from 'memcached';
import * as cache from 'memory-cache';

// TODO: figure out how memcached works in appengine flexible.
export class MemcachedUtil {
  static async save(
      memcached: Memcached,
      key: string,
      value: string|Buffer|Promise<string|Buffer|any>|any,
      lifetime?: number): Promise<void> {
    await new Promise(async(resolve, reject) => {
      memcached.set(key, await value, lifetime || 600, err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  static get(memcached: Memcached, key: string): Promise<any> {
    return new Promise((resolve, reject) => {
      memcached.get(key, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }
}

// export class MemcachedUtil {
//   static async save(
//       memcached: Memcached,
//       key: string,
//       value: string|Buffer|Promise<string|Buffer>|any,
//       lifetime?: number): Promise<void> {
//     await new Promise(async(resolve, reject) => {
//       try {
//         let v = await value;
//         if (Buffer.isBuffer(v)) {
//           v = v.toString('utf8');
//         }
//         // memory cache uses milliseconds for cache timing.
//         cache.put(key, v, lifetime * 1000 || 600000);
//         resolve();
//       } catch (err) {
//         reject(err);
//       }
//     });
//   }
//
//   static get(memcached: Memcached, key: string): Promise<any> {
//     return new Promise((resolve, reject) => {
//       try {
//         const data = cache.get(key);
//         resolve(data);
//       } catch (err) {
//         reject(err);
//       }
//     });
//   }
// }
