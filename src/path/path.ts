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

/**
 *
 * This module describes paths of the form:
 *
 * /paper-button+garlicnation+^0.0.1/paper-stax+garlicnation+:master/components/paper-button/test/subdir/paper-button.html
 *
 * Which would be represented like:
 *
 * {
 *   component: 'paper-button',
 *   filePath: 'test/subdir/paper-button.html',
 *   configs: [
 *     {
 *      type: "semver",
 *      repo: paper-button,
 *      org: garlicnation
 *      range: "^0.0.1",
 *    },
 *     {
 *      type: "branch",
 *      repo: paper-stax,
 *      org: garlicnation
 *      branch: "master",
 *    }
 *   ]
 * }
 */

export interface ParsedPath {
  // The original string that was parsed.
  rawPath: string;
  // The component portion of the path, e.g. "polymer" or "webcomponentsjs"
  component: string;
  // The file portion of the path, e.g. "index.html" or "demo/index.html"
  filePath: string;
  // The configs in the order that should be checked.
  repoConfigs: RepoConfig[];
}

export interface SemverRepoConfig {
  kind: 'semver';
  // The component this config is for
  component: string;
  // Github organization
  org?: string;
  // Semver version range
  range: string;
}

export interface LatestRepoConfig {
  kind: 'latest';
  // The component this config is for
  component: string;
  // Github organization
  org: string;
}

export interface BranchRepoConfig {
  kind: 'branch';
  // The component this config is for
  component: string;
  // Github organization
  org?: string;
  // Branch to pull from.
  branch: string;
}

export type RepoConfig = SemverRepoConfig | LatestRepoConfig | BranchRepoConfig;
