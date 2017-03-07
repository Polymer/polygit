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
import * as GitHubApi from 'github';
import * as jsonStableStringify from 'json-stable-stringify';
import * as semver from 'semver';

import {UserError} from '../errors/errors';
import {LatestRepoConfig, ParsedPath, RepoConfig} from '../path/path';

export interface ResolvedComponent {
  sha: string;
  filePath: string;
  component: string;
  org: string;
}

export class BranchNotFoundError extends UserError {}
export class TagNotFoundError extends UserError {}

export function copyResolvedComponent(component: ResolvedComponent):
    ResolvedComponent {
  return {
    sha: component.sha,
    filePath: component.filePath,
    component: component.component,
    org: component.org
  };
}

export function serializeResolvedComponent(component: ResolvedComponent):
    string {
  // Make sure no extra fields are lying around
  const cleanedComponent = copyResolvedComponent(component);
  return jsonStableStringify(cleanedComponent);
}

export function deserializeResolvedComponent(json: string): ResolvedComponent {
  return JSON.parse(json);
}

function resolveComponentByTag(
    component: string,
    org: string,
    range: string,
    tags: GitHubApi.GetRepoTagsEntry[]): string {
  let latestMatchingTag: {tag: string, sha: string}|undefined;
  for (const tag of tags) {
    // Strip "refs/tags/" from the ref to get tagname
    const tagName = tag.name;
    if (tagName === range) {
      break;
    }
    // console.log(tag, range);
    if (!semver.valid(tagName)) {
      continue;
    }
    if (semver.satisfies(tagName, range)) {
      if (!latestMatchingTag || semver.gt(tagName, latestMatchingTag.tag)) {
        latestMatchingTag = {tag: tagName, sha: tag.commit.sha};
      }
    }
  }
  if (!latestMatchingTag) {
    throw new Error(
        `Unable to find tag  for ${component}/${org} satisfying ${range}`);
  }
  return latestMatchingTag.sha;
}

async function resolveComponentByBranch(
    component: string,
    org: string,
    branchName: string,
    branches: GitHubApi.BranchResponseEntry[]):
    Promise<string> {
      for (const branch of branches) {
        if (branch.name === branchName) {
          return branch.commit.sha;
        }
      }
      throw new BranchNotFoundError(
          `Unable to find branch "${branchName}" for repo "${org}/${
                                                                    component
                                                                  }"`);
    }

export async function resolveComponentPath(
    path: ParsedPath,
    config: RepoConfig,
    tags: GitHubApi.GetRepoTagsEntry[],
    branches: GitHubApi.BranchResponseEntry[]): Promise<ResolvedComponent> {
  if (!config.org) {
    throw new Error(
        `Config "${config}" without organization` +
        ` isn't resolvable by github.resolver.`);
  }
  let sha: string;
  switch (config.kind) {
    case 'latest':
      try {
        sha =
            await resolveComponentByTag(path.component, config.org, '*', tags);
      } catch (err) {
        sha = await resolveComponentByBranch(
            path.component, config.org, 'master', branches);
      }
      break;
    case 'semver':
      sha = await resolveComponentByTag(
          path.component, config.org, config.range, tags);
      break;
    case 'branch':
      sha = await resolveComponentByBranch(
          path.component, config.org, config.branch, branches);
      break;
    default:
      throw new Error(`Unexpected config: ${JSON.stringify(config)}`);
  }
  return {
    filePath: path.filePath,
    sha: sha,
    component: config.component,
    org: config.org
  };
}
