import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// The repository's existing .mjs tests run with node:test without a React/JSDOM
// test runner. Execute the actual componentDidCatch method in isolation to
// validate Sentry reporting and preservation of the existing fallback state.
const source = readFileSync(new URL('../EventCompanionAccessPage.jsx', import.meta.url), 'utf8');

const makeHandler = (sentry, { isDev = false, logger = { error() {} } } = {}) => {
  const match = source.match(/\n  componentDidCatch\(error, info\) \{([\s\S]*?)\n  \}\n\n  render\(\)/);
  assert.ok(match, 'CompanionErrorBoundary.componentDidCatch must exist');
  const methodBody = match[1].replaceAll('import.meta.env.DEV', String(isDev));
  return new Function('Sentry', 'console', `return function componentDidCatch(error, info) {${methodBody}\n};`)(sentry, logger);
};

const createBoundary = () => ({
  state: { hasError: true, errorMessage: '', componentStack: '' },
  setState(update) { Object.assign(this.state, update); },
});

test('Event Companion caught render error is sent once with safe component context', () => {
  const captured = [];
  const sentry = { captureReactException(error, info, hint) { captured.push({ error, info, hint }); } };
  const boundary = createBoundary();
  const error = new Error('synthetic rendering failure');

  makeHandler(sentry).call(boundary, error, { componentStack: '\n    at SyntheticComponent' });

  assert.equal(captured.length, 1);
  assert.equal(captured[0].error, error);
  assert.equal(captured[0].hint.tags.area, 'event_companion');
  assert.equal(captured[0].info.componentStack, '\n    at SyntheticComponent');
  assert.equal(boundary.state.errorMessage, 'synthetic rendering failure');
  assert.equal(boundary.state.componentStack, '\n    at SyntheticComponent');
  assert.equal(boundary.state.hasError, true);
});

test('Fallback state still updates when Sentry capture is unavailable or throws', () => {
  const boundary = createBoundary();
  const sentry = { captureReactException() { throw new Error('synthetic transport failure'); } };
  const logs = [];
  const logger = { error(...args) { logs.push(args); } };

  assert.doesNotThrow(() => makeHandler(sentry, { isDev: true, logger }).call(
    boundary, new Error('synthetic render error'), undefined,
  ));
  assert.equal(boundary.state.errorMessage, 'synthetic render error');
  assert.equal(boundary.state.componentStack, '');
  assert.equal(logs.length, 3, 'preserve existing development diagnostics');
});

test('Sentry is only called by the caught-render-error handler, not on normal render', () => {
  assert.match(source, /import \* as Sentry from '@sentry\/react';/);
  assert.equal((source.match(/Sentry\.captureReactException\(/g) ?? []).length, 1);
  assert.match(source, /return <CompanionErrorBoundary><EventCompanionAccessPage \/><\/CompanionErrorBoundary>;/);
});
