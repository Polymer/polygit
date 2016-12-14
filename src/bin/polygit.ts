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
import * as request from 'request';
import * as rimraf from 'rimraf-promise';
import * as stream from 'stream';

import {configForPath} from '../config/component-config';
import {getAllTags, getBranches} from '../github/api';
import {fetchTarball} from '../github/fetcher';
import * as GithubMetadata from '../github/metadata';
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

const TOKEN_METADATA_URL =
    'http://metadata.google.internal/computeMetadata/v1/project/attributes/github-token';

let githubToken: string;
function getGithubToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (process.env.GCLOUD_PROJECT) {
      request(TOKEN_METADATA_URL, {}, (err, response, body) => {
        if (err) {
          reject(err);
        } else {
          resolve(body);
        }
      });
    } else {
      fs.readFile('/tmp/github_apikey.txt', (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data.toString('utf8').trim());
        }
      });
    }
  });
}

const app = new Koa();

app.use(async function(ctx, next) {
  if (ctx.path === '/_ah/health') {
    ctx.body = 'OK';
    ctx.status = 200;
    return;
  }
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

// Github API
app.use(async function(ctx: Koa.Context, next: Function) {
  const config: RepoConfig = ctx.state.resolvedConfig;
  if (!config.org) {
    throw new Error(`Unable to determine github org for ${config.component}`);
  }
  const metadataKey =
      GithubMetadata.makeMetadataKey(config.org, config.component);
  const cachedMetadata: string =
      await MemcachedUtil.get(memcached, metadataKey);
  if (cachedMetadata) {
    console.log('Metadata cache hit');
    const metadata = JSON.parse(cachedMetadata);
    ctx.state.branches = metadata.branches;
    ctx.state.tags = metadata.tags;
  } else {
    ctx.state.branches =
        await getBranches(github, config.org, config.component);
    ctx.state.tags = await getAllTags(github, config.org, config.component);
    const metadata: GithubMetadata.RepoMetadata = {
      branches: ctx.state.branches,
      tags: ctx.state.tags
    };
    await MemcachedUtil.save(memcached, metadataKey, JSON.stringify(metadata));
  }
  await next();
});

// Resolving
app.use(async function(ctx: Koa.Context, next: Function) {
  ctx.state.resolvedComponent = await resolveComponentPath(
      ctx.state.parsedPath,
      ctx.state.resolvedConfig,
      ctx.state.tags,
      ctx.state.branches);
  await next();
});

// Fetching
app.use(async function(ctx: Koa.Context, next: Function) {
  const requestedComponentKey =
      serializeResolvedComponent(ctx.state.resolvedComponent);
  const cachedFile = await MemcachedUtil.get(memcached, requestedComponentKey);
  if (cachedFile) {
    console.log('Cache hit for file!');
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
    const serialized = serializeResolvedComponent(componentForEntry);
    const buffer = await new Promise<Buffer|null>((resolve, reject) => {
      if (!entry || entry[entry.length - 1] === '/') {
        resolve(null);
      }
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
  rimraf(root);
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

getGithubToken().then((token) => {
  githubToken = token;
  github.authenticate({type: 'token', token: githubToken});
  app.listen(8080);
});