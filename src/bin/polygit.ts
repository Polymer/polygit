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
import * as mime from 'mime';
import * as path from 'path';
import * as rimraf from 'rimraf-promise';
import * as stream from 'stream';

import {configForPath} from '../config/component-config';
import {getAllTags, getBranches} from '../github/api';
import {fetchTarball} from '../github/fetcher';
import {copyResolvedComponent, deserializeResolvedComponent, resolveComponentPath, ResolvedComponent, serializeResolvedComponent} from '../github/resolver';
import {MemcachedUtil} from '../memcached/util';
import {parsePath} from '../path/parser';
import {ParsedPath, RepoConfig} from '../path/path';
import {extractAndIndexTarball} from '../tarball/extract';

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
  if (ctx.status === 200) {
    ctx.set('Content-Type', mime.lookup(ctx.path));
  }
});

// Config
app.use(async function(ctx: Koa.Context, next: Function) {
  ctx.state.resolvedConfig = await configForPath(ctx.state.parsedPath);
  await next();
});

// Resolving
app.use(async function(ctx: Koa.Context, next: Function) {
  console.log(ctx.state.resolvedConfig);
  const config: RepoConfig = ctx.state.resolvedConfig;
  const component = config.component;
  const org = config.org;
  if (!org) {
    throw new Error(`Unable to determine github org for ${config.component}`);
  }
  const branches = await getBranches(github, org, component);
  const tags = await getAllTags(github, org, component);
  ctx.state.resolvedComponent = await resolveComponentPath(
      ctx.state.parsedPath, ctx.state.resolvedConfig, tags, branches);
  await next();
});

// Fetching
app.use(async function(ctx: Koa.Context, next: Function) {
  const requestedComponentKey =
      serializeResolvedComponent(ctx.state.resolvedComponent);
  const cachedFile = await MemcachedUtil.get(memcached, requestedComponentKey);
  console.log(`Key: "${requestedComponentKey}"`);
  if (cachedFile) {
    console.log('Cache hit!');
    ctx.body = cachedFile;
    return;
  }

  const tarballStream = fetchTarball(ctx.state.resolvedComponent, githubToken);
  const extractedTarball = await extractAndIndexTarball(tarballStream);
  console.log('extracted tarball');
  const root = extractedTarball.root;
  const saveRequests = new Array<Promise<any>>();
  for (const entry of extractedTarball.entries) {
    const componentForEntry =
        copyResolvedComponent(ctx.state.resolvedComponent);
    componentForEntry.filePath = entry;
    console.log(JSON.stringify(componentForEntry));
    const serialized = serializeResolvedComponent(componentForEntry);
    const buffer = await new Promise<Buffer|null>((resolve, reject) => {
      if (!entry || entry[entry.length - 1] === '/') {
        resolve(null);
      }
      console.log(`entry: ${entry}`);
      fs.readFile(path.join(root, entry), (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
    if (buffer) {
      saveRequests.push(MemcachedUtil.save(memcached, serialized, buffer));
    }
  }
  // Wait until all files are saved to memcached.
  console.log('Saving to memcached');
  await Promise.all(saveRequests);
  console.log('Saved to memcached');
  const fetchedFile = await MemcachedUtil.get(memcached, requestedComponentKey);
  console.log('fetched from memcached');
  if (!fetchedFile) {
    ctx.status = 404;
    ctx.body = 'Not found.';
    return;
  }
  ctx.body = fetchedFile;
  return;
});

// response
app.use(ctx => {
  ctx.body = 'Hello World';
});

app.listen(3000);