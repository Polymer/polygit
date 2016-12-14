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

export class MemcachedUtil {
 static async save(memcached: Memcached, key: string, value: string|Buffer|Promise<string|Buffer>, lifetime?: number): Promise<void> {
    await new Promise(async (resolve, reject) => {
      memcached.set(key, await value, lifetime || 60, err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
}

static async get(memcached: Memcached, key: string, value: string|Buffer|Promise<string|Buffer>, lifetime?: number): Promise<void> {
    await new Promise(async (resolve, reject) => {
      memcached.set(key, await value, lifetime || 60, err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
}
}