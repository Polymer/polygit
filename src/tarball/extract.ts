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

import * as gunzip from 'gunzip-maybe';
import * as stream from 'stream';
import * as tar from 'tar-fs';
import * as tempLib from 'temp';

const temp = tempLib.track();
// const temp = tempLib;

export interface ExtractedTarIndex {
  root: string;          // The directory the tarball was extracted to.
  entries: Set<string>;  // The files of the tarball, relative to root.
}

export interface Pipable {
  pipe(s: stream.Writable|stream.Duplex): stream.Readable;
}

export interface TarCallback {
  (header: string, content: stream.Readable): void;
}

export async function extractAndIndexTarball(tarball: Pipable):
    Promise<ExtractedTarIndex> {
  const outDir = await new Promise<string>((resolve, reject) => {
    temp.mkdir('polygit', (err: any, path: string) => {
      if (err) {
        reject(err);
      } else {
        resolve(path);
      }
    });
  });
  const entries = new Set<string>();
  console.log(`saving tarball to ${outDir}`);
  await new Promise((resolve, reject) => {
    tarball.pipe(gunzip())
        .pipe(tar.extract(outDir, {
          map: (header: {name: string}) => {
            header.name = header.name.split(('/')).slice(1).join('/');
            console.log(header.name);
            entries.add(header.name);
            return header;
          }
        }))
        .on('finish',
            (arg: any) => {
              console.log('Ended the tarball pipe!')
              console.log(arg);
              resolve();
            })
        .on('error', (err) => {
          console.log('TArball error!!');
          reject(err);
        });
  });
  return {root: outDir, entries: entries};
}