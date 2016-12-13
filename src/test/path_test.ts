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

/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />

import {assert} from 'chai';

import {parser} from '../path/parser';
import {ParsedPath} from '../path/path';

suite('path', () => {
  test('simple path parses with no config', () => {
    const parsed = parser.parse('/components/paper-button/paper-button.html');
    assert.equal(parsed.component, 'paper-button');
    assert.equal(parsed.filePath, 'paper-button.html');
  });


  test('deep path parses with no config', () => {
    const parsed =
        parser.parse('/components/paper-button/test/subdir/paper-button.html');
    assert.equal(parsed.filePath, 'test/subdir/paper-button.html');
    assert.equal(parsed.component, 'paper-button');
  });


  test('basic branch config', () => {
    const parsed: ParsedPath = parser.parse(
        '/paper-button+:master/components/paper-button/test/subdir/paper-button.html');
    assert.equal(parsed.repoConfigs[0].kind, 'branch');
    const config = parsed.repoConfigs[0];
    if (config.kind === 'branch') {
      assert.equal(config.branch, 'master');
      assert.equal(config.component, 'paper-button');
      assert.equal(config.org, null);
    }
  });

  test('branch config with org', () => {
    const parsed: ParsedPath = parser.parse(
        '/paper-button+garlicnation+:master/components/paper-button/test/subdir/paper-button.html');
    assert.equal(parsed.repoConfigs[0].kind, 'branch');
    const config = parsed.repoConfigs[0];
    // Type guard
    if (config.kind === 'branch') {
      assert.equal(config.branch, 'master');
      assert.equal(config.component, 'paper-button');
      assert.equal(config.org, 'garlicnation');
    }
  });

  test('semver config', () => {
    const parsed: ParsedPath = parser.parse(
        '/paper-button+^0.0.1/components/paper-button/test/subdir/paper-button.html');
    assert.equal(parsed.repoConfigs[0].kind, 'semver');
    const config = parsed.repoConfigs[0];
    // Type guard
    if (config.kind === 'semver') {
      assert.equal(config.range, '^0.0.1');
      assert.equal(config.component, 'paper-button');
      assert.equal(config.org, null);
    }
  });


  test('semver config with org', () => {
    const parsed: ParsedPath = parser.parse(
        '/paper-button+garlicnation+^0.0.1/components/paper-button/test/subdir/paper-button.html');
    assert.equal(parsed.repoConfigs[0].kind, 'semver');
    const config = parsed.repoConfigs[0];
    // Type guard
    if (config.kind === 'semver') {
      assert.equal(config.range, '^0.0.1');
      assert.equal(config.component, 'paper-button');
      assert.equal(config.org, 'garlicnation');
    }
  });

  test('latest config with org', () => {
    const parsed: ParsedPath = parser.parse(
        '/paper-button+garlicnation+*/components/paper-button/test/subdir/paper-button.html');
    assert.equal(parsed.repoConfigs[0].kind, 'latest');
    const config = parsed.repoConfigs[0];
    // Type guard
    if (config.kind === 'latest') {
      assert.equal(config.component, 'paper-button');
      assert.equal(config.org, 'garlicnation');
    }
  });
});