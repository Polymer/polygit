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
import * as semver from 'semver';

import {LatestRepoConfig, ParsedPath, RepoConfig} from '../path/path';

export interface ResolvedComponent {
  sha: string;
  filePath: string;
}

async function resolveComponentByTag(
    component: string, org: string, range: string, api: GitHubApi):
    Promise<string> {
      let tagResponse =
          await api.gitdata.getTags({owner: org, repo: component});
      let allTags = tagResponse.slice();
      while (api.hasNextPage(tagResponse)) {
        tagResponse = await api.getNextPage(tagResponse);
        allTags = allTags.concat(tagResponse);
      }
      let latestMatchingTag: {tag: string, sha: string}|undefined;
      for (const tag of allTags) {
        // Strip "refs/tags/" from the ref to get tagname
        const tagName = tag.ref.split('refs/tags/')[1];
        // console.log(tag, range);
        if (!semver.valid(tagName)) {
          continue;
        }
        if (semver.satisfies(tagName, range)) {
          if (!latestMatchingTag || semver.gt(tagName, latestMatchingTag.tag)) {
            latestMatchingTag = {tag: tagName, sha: tag.object.sha};
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
    component: string, org: string, branch: string, api: GitHubApi):
    Promise<string> {
      const resolvedBranch = await api.repos.getBranch(
          {owner: org, repo: component, branch: branch});
      return resolvedBranch.commit.sha;
    }

export async function resolveComponentPath(
    path: ParsedPath, config: RepoConfig, api: GitHubApi):
    Promise<ResolvedComponent> {
      if (!config.org) {
        throw new Error(
            `Config "${config
            }" without organization isn't resolvable by github.resolver.`);
      }
      let sha: string;
      switch (config.kind) {
        case 'latest':
          sha =
              await resolveComponentByTag(path.component, config.org, '*', api);
          break;
        case 'semver':
          sha = await resolveComponentByTag(
              path.component, config.org, config.range, api);
          break;
        case 'branch':
          sha = await resolveComponentByBranch(
              path.component, config.org, config.branch, api);
        default:
          throw new Error(`Unexpected config: ${config}`);
      }
      return {filePath: path.filePath, sha: sha};
      // const tags = api.gitdata.getTags({path});
    }