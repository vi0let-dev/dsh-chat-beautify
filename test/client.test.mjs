/**
 * Behaviour tests for client.js.
 *
 * client.js is a browser classic script: it calls window.__ModuleLoader__.load
 * once and hides everything inside the factory. To test it without a browser we
 * run the file in a node:vm context with a minimal DOM + module-loader stub.
 * This harness is test-only; the shipped plugin never evaluates code at runtime.
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import test from 'node:test'
import vm from 'node:vm'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = readFileSync(join(projectRoot, 'client.js'), 'utf8')

/* ---------------------------------------------------------------------- *
 * Harness
 * ---------------------------------------------------------------------- */

function createDocument() {
  const attributes = new Map()
  const styleTags = []

  const documentElement = {
    getAttribute: (name) => (attributes.has(name) ? attributes.get(name) : null),
    setAttribute: (name, value) => attributes.set(name, String(value)),
    removeAttribute: (name) => attributes.delete(name),
  }

  return {
    attributes,
    styleTags,
    documentElement,
    head: { append: (node) => styleTags.push(node) },
    createElement: (tagName) => ({ tagName, dataset: {}, textContent: '' }),
    querySelector: (selector) => {
      // Only the plugin's own dedupe selector matters here.
      const match = /data-plugin-css="([^"]+)"/.exec(selector)
      if (!match) return null
      return styleTags.find((tag) => tag.dataset.pluginCss === match[1]) ?? null
    },
  }
}

function createStorage(initial = {}, { failing = false } = {}) {
  const data = new Map(Object.entries(initial))
  return {
    data,
    getItem(key) {
      if (failing) throw new Error('storage disabled')
      return data.has(key) ? data.get(key) : null
    },
    setItem(key, value) {
      if (failing) throw new Error('storage disabled')
      data.set(key, String(value))
    },
  }
}

/**
 * Minimal React surface: createElement builds a comparable tree, useState
 * returns the current value plus a recorder, so click handlers are testable.
 */
function createReact() {
  const setters = []
  return {
    setters,
    createElement: (type, props, ...children) => ({ type, props: props ?? {}, children }),
    useState: (initial) => {
      const value = typeof initial === 'function' ? initial() : initial
      const setter = (next) => setters.push(next)
      return [value, setter]
    },
  }
}

/** Load client.js in a fresh context and return the captured registration. */
function loadClient({ storage } = {}) {
  const document = createDocument()
  const react = createReact()
  const registrations = []

  const window = {
    __ModuleLoader__: {
      load: (registration) => registrations.push(registration),
    },
    localStorage: storage ?? createStorage(),
  }

  const context = vm.createContext({
    window,
    document,
    console,
    require: (id) => {
      if (id !== 'react') throw new Error(`unexpected platform module: ${id}`)
      return react
    },
  })

  vm.runInContext(source, context, { filename: 'client.js' })

  return { document, react, window, registrations, context }
}

/** Instantiate the plugin exactly as the loader would. */
function instantiate({ storage } = {}) {
  const harness = loadClient({ storage })
  assert.equal(harness.registrations.length, 1, 'exactly one module registration')
  const registration = harness.registrations[0]
  const plugin = registration.factory((id) => {
    if (id !== 'react') throw new Error(`unexpected platform module: ${id}`)
    return harness.react
  })

  const ctx = {
    effects: [],
    registrations: [],
    effect(fn, label) {
      const dispose = fn()
      this.effects.push({ label, dispose })
      return dispose
    },
    slots: {
      inject: (name, callback) => callback(name),
      register(options, component) {
        ctx.registrations.push({ options, component })
        return () => {}
      },
    },
  }

  return { ...harness, registration, plugin, ctx }
}

/* ---------------------------------------------------------------------- *
 * Tests
 * ---------------------------------------------------------------------- */

test('registers under the package name', () => {
  const { registrations } = loadClient()
  assert.equal(registrations.length, 1)
  assert.equal(registrations[0].id, 'dsh-chat-beautify')
  assert.equal(typeof registrations[0].factory, 'function')
})

test('plugin declares the slots dependency and an apply function', () => {
  const { plugin } = instantiate()
  // Compare element-wise: the array comes from the vm realm.
  assert.equal(plugin.inject.length, 1)
  assert.equal(plugin.inject[0], 'slots')
  assert.equal(typeof plugin.apply, 'function')
})

test('registers one entry into conversation.composer.dock', () => {
  const { plugin, ctx } = instantiate()
  plugin.apply(ctx)
  assert.equal(ctx.registrations.length, 1)
  assert.equal(ctx.registrations[0].options.name, 'conversation.composer.dock')
  assert.equal(ctx.registrations[0].options.id, 'chat-beautify-preset')
  assert.equal(ctx.registrations[0].options.order, 50)
  assert.equal(typeof ctx.registrations[0].component, 'function')
})

test('applies the stored preset to the root element', () => {
  const { plugin, ctx, document } = instantiate({
    storage: createStorage({ 'dsh-chat-beautify:preset': 'paper' }),
  })
  plugin.apply(ctx)
  assert.equal(document.documentElement.getAttribute('data-chat-beautify'), 'paper')
})

test('defaults to the soft preset when nothing is stored', () => {
  const { plugin, ctx, document } = instantiate()
  plugin.apply(ctx)
  assert.equal(document.documentElement.getAttribute('data-chat-beautify'), 'soft')
})

test('unknown stored values fall back to the default preset', () => {
  const { plugin, ctx, document } = instantiate({
    storage: createStorage({ 'dsh-chat-beautify:preset': 'neon' }),
  })
  plugin.apply(ctx)
  assert.equal(document.documentElement.getAttribute('data-chat-beautify'), 'soft')
})

test('a throwing storage backend does not break apply', () => {
  const { plugin, ctx, document } = instantiate({ storage: createStorage({}, { failing: true }) })
  assert.doesNotThrow(() => plugin.apply(ctx))
  assert.equal(document.documentElement.getAttribute('data-chat-beautify'), 'soft')
})

test('the off preset removes the attribute instead of setting it', () => {
  const { plugin, ctx, document } = instantiate({
    storage: createStorage({ 'dsh-chat-beautify:preset': 'off' }),
  })
  plugin.apply(ctx)
  assert.equal(document.documentElement.getAttribute('data-chat-beautify'), null)
})

test('disposing the effect restores the stock appearance', () => {
  const { plugin, ctx, document } = instantiate()
  plugin.apply(ctx)
  assert.equal(document.documentElement.getAttribute('data-chat-beautify'), 'soft')
  assert.equal(ctx.effects.length, 1)
  ctx.effects[0].dispose()
  assert.equal(document.documentElement.getAttribute('data-chat-beautify'), null)
})

test('injects exactly one stylesheet, even when the factory is materialized twice', () => {
  const first = instantiate()
  first.plugin.apply(first.ctx)
  assert.equal(first.document.styleTags.length, 1)
  assert.equal(first.document.styleTags[0].dataset.plugin, 'dsh-chat-beautify')

  // A second materialization on the same page shares the dedupe selector, so it
  // must not append a duplicate sheet.
  const second = loadClient()
  const dedupeDocument = second.document
  dedupeDocument.styleTags.push(first.document.styleTags[0])
  const plugin = second.registrations[0].factory(() => second.react)
  const ctx = {
    effects: [],
    effect(fn) {
      this.effects.push({ dispose: fn() })
    },
    slots: { inject: (name, callback) => callback(name), register: () => () => {} },
  }
  plugin.apply(ctx)
  assert.equal(dedupeDocument.styleTags.length, 1)
})

test('every preset ships a light and a dark token block', () => {
  for (const preset of ['soft', 'paper', 'compact']) {
    assert.match(source, new RegExp(`html\\[data-chat-beautify='${preset}'\\]`), `${preset}: light block`)
    assert.match(
      source,
      new RegExp(`html\\[data-chat-beautify='${preset}'\\] body\\[data-ds-dark-theme\\]`),
      `${preset}: dark block`,
    )
  }
})

test('the switcher renders one button per preset and marks the active one', () => {
  const { plugin, ctx, react } = instantiate()
  plugin.apply(ctx)
  const Component = ctx.registrations[0].component
  const tree = Component()

  assert.equal(tree.props.role, 'group')
  assert.equal(tree.children.length, 4)
  const labels = tree.children.map((button) => button.children[0])
  assert.deepEqual(labels, ['关', '柔光', '纸感', '紧凑'])
  const pressed = tree.children.filter((button) => button.props['aria-pressed'] === 'true')
  assert.equal(pressed.length, 1)
  assert.equal(pressed[0].children[0], '柔光')
  assert.equal(react.setters.length, 0)
})

test('clicking a preset persists it and applies it immediately', () => {
  const storage = createStorage()
  const { plugin, ctx, document, react } = instantiate({ storage })
  plugin.apply(ctx)
  const tree = ctx.registrations[0].component()
  const paperButton = tree.children.find((button) => button.children[0] === '纸感')

  paperButton.props.onClick()

  assert.equal(document.documentElement.getAttribute('data-chat-beautify'), 'paper')
  assert.equal(storage.data.get('dsh-chat-beautify:preset'), 'paper')
  assert.deepEqual(react.setters, ['paper'])
})

test('the off button clears the root attribute and stores the choice', () => {
  const storage = createStorage()
  const { plugin, ctx, document } = instantiate({ storage })
  plugin.apply(ctx)
  const tree = ctx.registrations[0].component()
  tree.children.find((button) => button.children[0] === '关').props.onClick()

  assert.equal(document.documentElement.getAttribute('data-chat-beautify'), null)
  assert.equal(storage.data.get('dsh-chat-beautify:preset'), 'off')
})

test('the switcher styles itself with theme tokens rather than fixed colors', () => {
  const switchBlock = source.slice(source.indexOf('/* ---- dock switcher'))
  assert.ok(switchBlock.length > 0, 'dock switcher styles are present')
  assert.ok(switchBlock.includes('var(--dsw-alias-label-primary'), 'active label follows the theme')
  assert.ok(switchBlock.includes('var(--dsw-alias-bg-layer-2'), 'active background follows the theme')
  assert.ok(!/#[0-9a-f]{6}/i.test(switchBlock), 'no hard-coded colors in the switcher rules')
})

test('the plugin performs no network, eval or HTML-injection work', () => {
  const forbidden = [
    /\beval\s*\(/,
    /new\s+Function\s*\(/,
    /fetch\s*\(/,
    /XMLHttpRequest/,
    /\.innerHTML\s*=/,
    /document\.write\s*\(/,
    /localStorage\.clear\s*\(/,
  ]
  for (const pattern of forbidden) {
    assert.ok(!pattern.test(source), `forbidden pattern present: ${pattern}`)
  }
})
