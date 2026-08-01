// @ts-check

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { parseArgs, scaffoldComponent } from './scaffold-component.mjs';

/**
 * @returns {Promise<string>}
 */
const makeTempProject = async () => mkdtemp(path.join(tmpdir(), 'rule-ce-test-'));

test('parseArgs derives kebab-case tag from PascalCase --name', () => {
  const options = parseArgs(['--name', 'PixCard']);

  assert.equal(options.name, 'PixCard');
  assert.equal(options.tag, 'rule-card');
  assert.equal(options.extendsElement, '');
  assert.deepEqual(options.attributes, []);
  assert.deepEqual(options.events, []);
});

test('parseArgs rejects names that produce a hyphen-less tag', () => {
  assert.throws(() => parseArgs(['--name', 'Card']), /must contain a hyphen/);
});

test('parseArgs collects attributes and events as comma-separated lists', () => {
  const options = parseArgs([
    '--name',
    'PixToggle',
    '--attributes',
    'open, disabled ',
    '--events',
    'click,keydown',
  ]);

  assert.deepEqual(options.attributes, ['open', 'disabled']);
  assert.deepEqual(options.events, ['click', 'keydown']);
});

test('scaffoldComponent installs shared library and component on first run', async () => {
  const target = await makeTempProject();
  try {
    const options = parseArgs(['--name', 'PixCard', '--target', target, '--install-shared']);
    const result = await scaffoldComponent(options);

    assert.equal(result.sharedLibraryInstalled, true);
    assert.equal(result.sharedLibraryPath, path.join(target, 'packages/rule-core'));
    assert.equal(result.componentDir, path.join(target, 'src/components/PixCard'));
    assert.equal(result.dryRun, false);

    // shared library files exist (decorator + events)
    const decoratorIndex = await readFile(
      path.join(result.sharedLibraryPath, 'decorator/index.js'),
      'utf8'
    );
    assert.match(decoratorIndex, /export function componentDecorator/);

    const eventsIndex = await readFile(
      path.join(result.sharedLibraryPath, 'events/index.js'),
      'utf8'
    );
    assert.match(eventsIndex, /export const events/);

    // template-engine is optional: skipped when the sibling skill source is absent
    await assert.rejects(() =>
      readFile(path.join(result.sharedLibraryPath, 'template-engine/index.js'), 'utf8')
    );

    // component file imports from the shared path
    const componentJs = await readFile(path.join(result.componentDir, 'rule-card.js'), 'utf8');
    assert.match(componentJs, /static styles = styles/);
    assert.match(componentJs, /componentDecorator\(this\)/);
    assert.match(componentJs, /from '@rule-mcp\/rule-core\/decorator\/index\.js'/);
    assert.match(componentJs, /export class PixCard extends HTMLElement/);
    assert.doesNotMatch(componentJs, /attachShadow|shadowRoot|<template>/);

    // without a template-engine runtime, the template falls back to a plain fn
    const templateJs = await readFile(
      path.join(result.componentDir, 'rule-card.template.js'),
      'utf8'
    );
    assert.doesNotMatch(templateJs, /TemplateEngine/);
    assert.match(templateJs, /renderRoot = \(\) =>/);

    const constsJs = await readFile(path.join(result.componentDir, 'rule-card.consts.js'), 'utf8');
    assert.match(constsJs, /export const/);

    const utilsJs = await readFile(path.join(result.componentDir, 'rule-card.utils.js'), 'utf8');
    assert.match(utilsJs, /export const/);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test('scaffoldComponent reuses an existing shared library and does not duplicate it', async () => {
  const target = await makeTempProject();
  try {
    // first run installs the shared library
    await scaffoldComponent(
      parseArgs(['--name', 'PixCard', '--target', target, '--install-shared'])
    );

    // second run with a different component name must NOT reinstall - must reuse
    const second = await scaffoldComponent(parseArgs(['--name', 'PixBadge', '--target', target]));

    assert.equal(second.sharedLibraryInstalled, false);
    assert.equal(second.sharedLibraryPath, path.join(target, 'packages/rule-core'));

    const componentJs = await readFile(path.join(second.componentDir, 'rule-badge.js'), 'utf8');
    assert.match(componentJs, /from '@rule-mcp\/rule-core\/decorator\/index\.js'/);
    assert.match(componentJs, /static styles = styles/);
    assert.match(componentJs, /componentDecorator\(this\)/);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test('scaffoldComponent fails when shared library is missing and --install-shared is not passed', async () => {
  const target = await makeTempProject();
  try {
    const options = parseArgs(['--name', 'PixCard', '--target', target]);
    await assert.rejects(
      () => scaffoldComponent(options),
      /No existing `componentDecorator` found/
    );
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test('scaffoldComponent generates a customized built-in with extendsElement', async () => {
  const target = await makeTempProject();
  try {
    const options = parseArgs([
      '--name',
      'PixDetails',
      '--target',
      target,
      '--install-shared',
      '--extends',
      'details',
      '--attributes',
      'open',
    ]);
    const result = await scaffoldComponent(options);

    const componentJs = await readFile(path.join(result.componentDir, 'rule-details.js'), 'utf8');
    assert.match(componentJs, /extends HTMLDetailsElement/);
    assert.match(componentJs, /static extendsElement = 'details'/);

    const cssCore = await readFile(path.join(result.componentDir, 'styles/_core.css'), 'utf8');
    assert.match(cssCore, /\[is="rule-details"\]/);

    const attributesJs = await readFile(
      path.join(result.componentDir, 'rule-details.attributes.js'),
      'utf8'
    );
    assert.match(attributesJs, /open\(_oldValue, _newValue\)/);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test('scaffoldComponent refuses to overwrite without --force', async () => {
  const target = await makeTempProject();
  try {
    await scaffoldComponent(
      parseArgs(['--name', 'PixCard', '--target', target, '--install-shared'])
    );

    await assert.rejects(
      () => scaffoldComponent(parseArgs(['--name', 'PixCard', '--target', target])),
      /Refusing to overwrite/
    );
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test('scaffoldComponent --dry-run reports files without writing them', async () => {
  const target = await makeTempProject();
  try {
    const options = parseArgs([
      '--name',
      'PixCard',
      '--target',
      target,
      '--install-shared',
      '--dry-run',
    ]);
    const result = await scaffoldComponent(options);

    assert.equal(result.dryRun, true);
    assert.ok(result.writtenFiles.length > 0);

    // nothing actually written
    await assert.rejects(() => readFile(path.join(result.componentDir, 'rule-card.js'), 'utf8'));
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});
