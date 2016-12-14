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

import * as GitHubApi from 'github';

export async function getAllTags(api: GitHubApi, org: string, repo: string):
    Promise<GitHubApi.GetTagsResponse> {
  let tagResponse = await api.gitdata.getTags({owner: org, repo: repo});
  let allTags = tagResponse.slice();
  while (api.hasNextPage(tagResponse)) {
    tagResponse = await api.getNextPage(tagResponse);
    allTags = allTags.concat(tagResponse);
  }
  return tagResponse;
}

export async function getBranches(api: GitHubApi, org: string, repo: string):
    Promise<GitHubApi.GetBranchesResponse> {
  return await api.repos.getBranches({owner: org, repo: repo});
}