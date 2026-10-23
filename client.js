/**
 * dsh-chat-beautify — Web UI beautification for the conversation surface.
 *
 * Contract notes (checked against DSH 0.2.1-rc.2 on 2026-10-23):
 * - The browser loads this file as a classic script and expects exactly one
 *   `window.__ModuleLoader__.load({ id, factory })` call; `id` must equal the
 *   package name, and the module table provides React (no second React copy).
 * - Plugin-owned global CSS is a `<style data-plugin data-plugin-css>` element
 *   appended to `document.head`; the client module system evicts styles owned
 *   by an unloaded plugin. This mirrors the official ui-theme bundle.
 * - `conversation.composer.dock` is a list slot with `{ name, id, order }`.
 * - `apply(ctx)` registers resources through `ctx.effect` / `ctx.slots.inject`
 *   so unloading the plugin restores the stock appearance.
 *
 * Everything below only *overrides design tokens* and flips a root attribute.
 * It does not touch message DOM, does not register tools, and never performs
 * network or file I/O.
 */

window.__ModuleLoader__.load({
  id: 'dsh-chat-beautify',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    /** Browser-local preference key. The only thing this plugin stores. */
    const STORAGE_KEY = 'dsh-chat-beautify:preset'
    const DEFAULT_PRESET = 'soft'
    const ROOT_ATTRIBUTE = 'data-chat-beautify'

    const PRESETS = [
      { id: 'off', zh: '关', en: 'Off', hintZh: '恢复 DSH 原始外观', hintEn: 'Restore the stock look' },
      { id: 'soft', zh: '柔光', en: 'Soft', hintZh: '暖白底色、更圆的卡片与气泡，阅读更松弛', hintEn: 'Warm canvas, rounder cards and bubbles' },
      { id: 'paper', zh: '纸感', en: 'Paper', hintZh: '低对比、细边框、稍宽行距', hintEn: 'Low contrast, hairline borders, airier lines' },
      { id: 'compact', zh: '紧凑', en: 'Compact', hintZh: '更紧的行高与更小的圆角，信息密度更高', hintEn: 'Tighter line height and tighter corners' },
    ]
    const PRESET_IDS = new Set(PRESETS.map((preset) => preset.id))

    /* ------------------------------------------------------------------ *
     * Preset state
     * ------------------------------------------------------------------ */

    /** Unknown or missing values fall back to the default preset. */
    function normalizePreset(value) {
      return PRESET_IDS.has(value) ? value : DEFAULT_PRESET
    }

    /**
     * localStorage can throw (private mode, disabled storage, quota). A broken
     * store must never prevent the UI from rendering: fall back to the default.
     */
    function readStoredPreset() {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY)
        return stored === null ? DEFAULT_PRESET : normalizePreset(stored)
      } catch {
        return DEFAULT_PRESET
      }
    }

    function storePreset(id) {
      try {
        window.localStorage.setItem(STORAGE_KEY, id)
      } catch {
        /* A non-persistent session is acceptable; the preset still applies. */
      }
    }

    function applyPreset(id) {
      const root = document.documentElement
      if (!root) return
      const preset = normalizePreset(id)
      if (preset === 'off') root.removeAttribute(ROOT_ATTRIBUTE)
      else root.setAttribute(ROOT_ATTRIBUTE, preset)
    }

    function clearPreset() {
      const root = document.documentElement
      if (root) root.removeAttribute(ROOT_ATTRIBUTE)
    }

    function isEnglish() {
      const root = document.documentElement
      const lang = root && typeof root.getAttribute === 'function' ? root.getAttribute('lang') : null
      return typeof lang === 'string' && /^en/i.test(lang)
    }

    /* ------------------------------------------------------------------ *
     * Token layers
     *
     * Every rule is scoped to `html[data-chat-beautify='…']`, so removing the
     * attribute restores the stock theme. Declarations land on the
     * conversation containers instead of `body`: the theme presenter writes
     * alias tokens inline on `body`, and a declaration on a descendant wins
     * for its own subtree, which keeps the rest of the shell untouched.
     *
     * `[data-conversation-scroll]` and `[data-composer-seat]` are anchors used
     * by the shipped chat styles. If a future build drops them this layer
     * degrades to "no change" instead of breaking layout.
     * ------------------------------------------------------------------ */

    const SCOPES = ':is([data-conversation-scroll], [data-composer-seat])'

    const CSS = `
/* ---- 柔光 / Soft ------------------------------------------------------ */
html[data-chat-beautify='soft'] ${SCOPES} {
  --dsw-alias-bg-base: #fbf9f6;
  --dsw-alias-bg-layer-1: #ffffff;
  --dsw-alias-bg-layer-2: #f6f2ec;
  --dsw-specific-bubble: #f0e7db;
  --dsw-specific-bubble-highlight: #e5d9c8;
  --dsw-alias-border-l1: #e8e1d6;
  --dsw-alias-border-l2: #ddd5c8;
  --dsw-alias-border-l3: #cfc5b4;
  --dsw-alias-separator-primary: #e8e1d6;
  --dsw-alias-label-primary: #2c2a26;
  --dsw-alias-label-secondary: #5a564f;
  --dsw-alias-label-tertiary: #837d74;
  --dsw-alias-markdown-code-block: #f3eee6;
  --dsw-alias-interactive-bg-hover: rgba(44, 42, 38, 0.055);
  --dsw-radius-xs: 4px;
  --dsw-radius-sm: 8px;
  --dsw-radius-md: 12px;
  --dsw-radius-lg: 16px;
  --dsw-radius-xl: 20px;
  --dsw-radius-panel: 22px;
  --dsw-font-markdown-base-line-height: 1.68;
  --dsw-font-markdown-code-line-height: 1.6;
  --dsw-font-markdown-code-block-line-height: 1.65;
}
html[data-chat-beautify='soft'] body[data-ds-dark-theme] ${SCOPES} {
  --dsw-alias-bg-base: #17191d;
  --dsw-alias-bg-layer-1: #1e2126;
  --dsw-alias-bg-layer-2: #24272d;
  --dsw-specific-bubble: #2b3038;
  --dsw-specific-bubble-highlight: #363c46;
  --dsw-alias-border-l1: #262a31;
  --dsw-alias-border-l2: #2f343c;
  --dsw-alias-border-l3: #3a4049;
  --dsw-alias-separator-primary: #2a2e35;
  --dsw-alias-label-primary: #e9e7e3;
  --dsw-alias-label-secondary: #b4b1ac;
  --dsw-alias-label-tertiary: #8a8781;
  --dsw-alias-markdown-code-block: #1c1f24;
  --dsw-alias-interactive-bg-hover: rgba(233, 231, 227, 0.06);
}
html[data-chat-beautify='soft'] [data-conversation-scroll] {
  background-color: #fbf9f6;
}
html[data-chat-beautify='soft'] body[data-ds-dark-theme] [data-conversation-scroll] {
  background-color: #17191d;
}

/* ---- 纸感 / Paper ----------------------------------------------------- */
html[data-chat-beautify='paper'] ${SCOPES} {
  --dsw-alias-bg-base: #f7f7f4;
  --dsw-alias-bg-layer-1: #fcfcfa;
  --dsw-alias-bg-layer-2: #f1f1ed;
  --dsw-specific-bubble: #ecece6;
  --dsw-specific-bubble-highlight: #e2e2da;
  --dsw-alias-border-l1: #e4e4de;
  --dsw-alias-border-l2: #d9d9d2;
  --dsw-alias-border-l3: #cacac2;
  --dsw-alias-separator-primary: #e4e4de;
  --dsw-alias-label-primary: #2b2b28;
  --dsw-alias-label-secondary: #57574f;
  --dsw-alias-label-tertiary: #7e7e75;
  --dsw-alias-markdown-code-block: #f0f0eb;
  --dsw-alias-interactive-bg-hover: rgba(43, 43, 40, 0.045);
  --dsw-radius-xs: 3px;
  --dsw-radius-sm: 5px;
  --dsw-radius-md: 7px;
  --dsw-radius-lg: 9px;
  --dsw-radius-xl: 12px;
  --dsw-radius-panel: 14px;
  --dsw-font-markdown-base-line-height: 1.72;
  --dsw-font-markdown-code-line-height: 1.62;
  --dsw-font-markdown-code-block-line-height: 1.6;
}
html[data-chat-beautify='paper'] body[data-ds-dark-theme] ${SCOPES} {
  --dsw-alias-bg-base: #141514;
  --dsw-alias-bg-layer-1: #1b1c1a;
  --dsw-alias-bg-layer-2: #212220;
  --dsw-specific-bubble: #242523;
  --dsw-specific-bubble-highlight: #2d2e2b;
  --dsw-alias-border-l1: #262725;
  --dsw-alias-border-l2: #2f302d;
  --dsw-alias-border-l3: #3a3b37;
  --dsw-alias-separator-primary: #262725;
  --dsw-alias-label-primary: #e6e5e0;
  --dsw-alias-label-secondary: #afada6;
  --dsw-alias-label-tertiary: #85837c;
  --dsw-alias-markdown-code-block: #1a1b19;
  --dsw-alias-interactive-bg-hover: rgba(230, 229, 224, 0.05);
}
html[data-chat-beautify='paper'] [data-conversation-scroll] {
  background-color: #f7f7f4;
}
html[data-chat-beautify='paper'] body[data-ds-dark-theme] [data-conversation-scroll] {
  background-color: #141514;
}

/* ---- 紧凑 / Compact --------------------------------------------------- */
html[data-chat-beautify='compact'] ${SCOPES} {
  --dsw-alias-bg-base: #ffffff;
  --dsw-alias-bg-layer-1: #ffffff;
  --dsw-alias-bg-layer-2: #f5f6f8;
  --dsw-specific-bubble: #e8eefb;
  --dsw-specific-bubble-highlight: #d8e2f7;
  --dsw-alias-border-l1: #e3e5e9;
  --dsw-alias-border-l2: #d2d5db;
  --dsw-alias-border-l3: #bfc3ca;
  --dsw-alias-separator-primary: #e3e5e9;
  --dsw-alias-label-primary: #101216;
  --dsw-alias-label-secondary: #4a4f58;
  --dsw-alias-label-tertiary: #757b85;
  --dsw-alias-markdown-code-block: #f2f4f8;
  --dsw-alias-interactive-bg-hover: rgba(16, 18, 22, 0.05);
  --dsw-radius-xs: 2px;
  --dsw-radius-sm: 4px;
  --dsw-radius-md: 6px;
  --dsw-radius-lg: 8px;
  --dsw-radius-xl: 10px;
  --dsw-radius-panel: 12px;
  --dsw-font-markdown-base-line-height: 1.5;
  --dsw-font-markdown-code-line-height: 1.45;
  --dsw-font-markdown-code-block-line-height: 1.45;
}
html[data-chat-beautify='compact'] body[data-ds-dark-theme] ${SCOPES} {
  --dsw-alias-bg-base: #0e1013;
  --dsw-alias-bg-layer-1: #14171b;
  --dsw-alias-bg-layer-2: #1a1e23;
  --dsw-specific-bubble: #1e2735;
  --dsw-specific-bubble-highlight: #26334a;
  --dsw-alias-border-l1: #22262c;
  --dsw-alias-border-l2: #2b3037;
  --dsw-alias-border-l3: #363c45;
  --dsw-alias-separator-primary: #22262c;
  --dsw-alias-label-primary: #f0f2f5;
  --dsw-alias-label-secondary: #aeb4bd;
  --dsw-alias-label-tertiary: #7f858e;
  --dsw-alias-markdown-code-block: #151a20;
  --dsw-alias-interactive-bg-hover: rgba(240, 242, 245, 0.06);
}
html[data-chat-beautify='compact'] [data-conversation-scroll] {
  background-color: #ffffff;
}
html[data-chat-beautify='compact'] body[data-ds-dark-theme] [data-conversation-scroll] {
  background-color: #0e1013;
}

/* ---- dock switcher ---------------------------------------------------- */
.chat-beautify-switch {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 1px;
  border-radius: var(--dsw-radius-sm, 6px);
}
.chat-beautify-switch > button {
  font: inherit;
  font-size: 11px;
  line-height: 18px;
  padding: 1px 7px;
  border: 0;
  border-radius: var(--dsw-radius-xs, 4px);
  background: transparent;
  color: var(--dsw-alias-label-tertiary, inherit);
  cursor: pointer;
  white-space: nowrap;
}
.chat-beautify-switch > button:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(128, 128, 128, 0.12));
}
.chat-beautify-switch > button[aria-pressed='true'] {
  background: var(--dsw-alias-bg-layer-2, rgba(128, 128, 128, 0.16));
  color: var(--dsw-alias-label-primary, inherit);
}
`

    /* Inject once per page load; the module system owns cleanup. */
    const CSS_TAG_ID = 'dsh-chat-beautify/theme.css'
    if (
      typeof document !== 'undefined' &&
      document.head &&
      document.querySelector('style[data-plugin-css=' + JSON.stringify(CSS_TAG_ID) + ']') === null
    ) {
      const styleTag = document.createElement('style')
      styleTag.dataset.plugin = 'dsh-chat-beautify'
      styleTag.dataset.pluginCss = CSS_TAG_ID
      styleTag.textContent = CSS
      document.head.append(styleTag)
    }

    /* ------------------------------------------------------------------ *
     * dock switcher
     * ------------------------------------------------------------------ */

    function PresetSwitch() {
      const [preset, setPreset] = React.useState(readStoredPreset)
      const english = isEnglish()

      function choose(nextId) {
        if (!PRESET_IDS.has(nextId)) return
        setPreset(nextId)
        storePreset(nextId)
        applyPreset(nextId)
      }

      return h(
        'div',
        {
          className: 'chat-beautify-switch',
          role: 'group',
          'aria-label': english ? 'Conversation appearance' : '对话外观',
        },
        ...PRESETS.map((item) =>
          h(
            'button',
            {
              key: item.id,
              type: 'button',
              'aria-pressed': preset === item.id ? 'true' : 'false',
              title: english ? item.hintEn : item.hintZh,
              onClick: () => choose(item.id),
            },
            english ? item.en : item.zh,
          ),
        ),
      )
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.effect(() => {
          applyPreset(readStoredPreset())
          return () => clearPreset()
        }, 'dsh-chat-beautify: preset')

        ctx.slots.inject('conversation.composer.dock', () =>
          ctx.slots.register(
            {
              name: 'conversation.composer.dock',
              id: 'chat-beautify-preset',
              order: 50,
            },
            PresetSwitch,
          ),
        )
      },
    }
  },
})
