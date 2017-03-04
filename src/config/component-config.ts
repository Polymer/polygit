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

import * as bower from 'bower';
import cache = require('memory-cache');

import {LatestRepoConfig, ParsedPath, RepoConfig} from '../path/path';
import {UserError} from '../errors/errors';

const GITHUB_URL = 'github.com/';

// Some orgs need hardcoding
const ORG_TABLE: {[key: string]: string} = {
  'font-roboto': 'PolymerElements',
  'paper-ripple': 'PolymerElements'
};

export class ConfigError extends UserError {}

export async function configForPath(path: ParsedPath): Promise<RepoConfig> {
  const component = path.component;
  let configForComponent: RepoConfig|null = null;
  for (const config of path.repoConfigs) {
    if (component.match(config.component)) {
      configForComponent = config;
      configForComponent.component = component;
      break;
    }
  }
  let orgFromTable = ORG_TABLE[component];
  if (orgFromTable) {
    if (configForComponent && !!configForComponent.org) {
      configForComponent.org = orgFromTable;
    } else {
      configForComponent = {
        kind: 'latest',
        org: orgFromTable,
        component: component
      };
    }
  }
  if (!configForComponent || !configForComponent.org) {
    const cachedRepo = cache.get(component);
    const repoFromBower =
        cachedRepo ||
        await new Promise<bower.LookupResponse>((resolve, reject) => {
          bower.commands.lookup(component)
              .on('end', (results: bower.LookupResponse) => resolve(results))
              .on('error', (err: Error) => reject(err));
        });
    if (!repoFromBower) {
      throw new ConfigError(
          `Unable to find bower registry entry for component '${component}'`);
    }
    if (!cachedRepo) {
      cache.put(component, repoFromBower, 60000);
    }

    const githubUrlIndex = repoFromBower.url.indexOf(GITHUB_URL);
    if (githubUrlIndex === -1) {
      throw new Error(
          `Non-github URL returned from bower for "${
                                                     component
                                                   }", unable to resolve.`);
    }

    const githubOffset = githubUrlIndex + GITHUB_URL.length;

    const org = repoFromBower.url.slice(
        githubOffset, repoFromBower.url.indexOf('/', githubOffset));

    if (configForComponent) {
      configForComponent.org = org;
    } else {
      const latest:
          LatestRepoConfig = {kind: 'latest', component: component, org};
      configForComponent = latest;
    }
  }
  if (!configForComponent) {
    throw new Error(`Unable to determine config for ${path.component}`);
  }
  return configForComponent;
}
