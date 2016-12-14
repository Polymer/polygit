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

import * as fs from 'fs';
import * as GithubApi from 'github';
import * as Koa from 'koa';
import * as Memcached from 'memcached';
import * as stream from 'stream';
import * as path from 'path';
import * as rimraf from 'rimraf-promise';

import {configForPath} from '../config/component-config';
import {fetchTarball} from '../github/fetcher';
import {resolveComponentPath, serializeResolvedComponent, deserializeResolvedComponent, copyResolvedComponent} from '../github/resolver';
import {parsePath} from '../path/parser';
import {ParsedPath} from '../path/path';
import {extractAndIndexTarball} from '../tarball/extract';
import {MemcachedUtil} from '../memcached/util';

const memcached = new Memcached('localhost:11211');


const github = new GithubApi({
  // debug: true,
  headers: {'user-agent': 'Polygit'}
});

const githubToken = fs.readFileSync('/tmp/github_apikey.txt', 'utf8').trim();

github.authenticate({type: 'token', token: githubToken});

const app = new Koa();

app.use(async function(ctx, next) {
  const start = +new Date();
  await next();
  const ms = (+new Date() - start);
  ctx.set('X-Response-Time', `${ms}ms`);
});

// logger

app.use(async function(ctx, next) {
  const start = +new Date();
  await next();
  const ms = (+new Date() - start);
  console.log(`${ctx.method} ${ctx.url} - ${ms}`);
});

// URL Parsing
app.use(async function(ctx: Koa.Context, next: Function) {
  ctx.state.parsedPath = parsePath(decodeURI(ctx.path));
  await next();
});

// Config
app.use(async function(ctx: Koa.Context, next: Function) {
  ctx.state.resolvedConfig = await configForPath(ctx.state.parsedPath);
  await next();
});

// Resolving
app.use(async function(ctx: Koa.Context, next: Function) {
  console.log(ctx.state.resolvedConfig);
  ctx.state.resolvedComponent = await resolveComponentPath(
      ctx.state.parsedPath, ctx.state.resolvedConfig, github);
  await next();
});

// Fetching
app.use(async function(ctx: Koa.Context, next: Function) {
  const tarballStream = fetchTarball(ctx.state.resolvedComponent, githubToken);
  const extractedTarball = await extractAndIndexTarball(tarballStream);
  const root = extractedTarball.root;
  const saveRequests = new Array<Promise<any>>();
  for (const entry of extractedTarball.entries) {
    const componentForEntry = copyResolvedComponent(ctx.state.resolvedComponent);
    componentForEntry.filePath = entry;
    const serialized = serializeResolvedComponent(componentForEntry);
    const buffer = new Promise<Buffer>((resolve, reject) => {
      fs.readFile(path.join([root, entry]), (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
    saveRequests.push(MemcachedUtil.save(memcached, serialized, buffer));
  }
  // Wait until all files are saved to memcached.
  await Promise.all(saveRequests);

});

// response
app.use(ctx => {
  ctx.body = 'Hello World';
});

app.listen(3000);