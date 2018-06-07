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

import {ParsedPath} from './path';

import peg = require('pegjs');
import * as fs from 'fs';
import * as libPath from 'path';

const grammar = `start = componentPath

componentPath = repoConfigs:repoConfig* '/components/' component:pathPart '/' file:joinedPath
    {
        return {repoConfigs: repoConfigs, component: component, filePath: file} ;
    }

joinedPath = prefix:(pathPart '/'+)* baseName:pathPart
    {
        return prefix.map((parts) => parts.join('')).join('') + baseName;
    }

pathPart = $([^/]+)

configPart = $([^/+:]+)

branchRepoConfig = component:configPart '+' org:(configPart '+' )? ':' branch:configPart
    {
        return {
            kind: 'branch',
            component: component,
            branch: branch,
            org: org? org[0] : null
        }
    }

semverRepoConfig = component:configPart '+' org:(configPart '+' )? range:configPart
    {
        return {
            kind: 'semver',
            component: component,
            range: range,
            org: org? org[0] : null
        }
    }

latestRepoConfig = component:configPart org:('+' configPart '+*' )
    {
        return {
            kind: 'latest',
            component: component,
            org: org? org[1] : null
        }
    }

repoConfig = '/' !'components/' config:(latestRepoConfig/semverRepoConfig/branchRepoConfig)
    {
        return config
    }
`;


const parser = peg.generate(grammar);

export function parsePath(path: string): ParsedPath {
  const normalizedPath = libPath.normalize(path);
  const parsedPath: ParsedPath = parser.parse(normalizedPath);
  parsedPath.rawPath = path;
  return parsedPath;
}
