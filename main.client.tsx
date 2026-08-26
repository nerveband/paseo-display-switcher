import type { PluginSurfaceProps } from "@getpaseo/plugin";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

const STORAGE_KEY = "@paseo:display-switcher:config";

export interface ShortcutConfig {
  enabled: boolean;
  toggleShortcut: string;
  statusShortcut: string;
  projectShortcut: string;
}

const DEFAULT_CONFIG: ShortcutConfig = {
  enabled: true,
  toggleShortcut: "Option+P",
  statusShortcut: "",
  projectShortcut: "",
};

const SPECIAL_KEY_CODES: Record<string, string> = {
  Minus: "-",
  Equal: "=",
  BracketLeft: "[",
  BracketRight: "]",
  Semicolon: ";",
  Quote: "'",
  Backquote: "`",
  Backslash: "\\",
  Comma: ",",
  Period: ".",
  Slash: "/",
  Space: "Space",
  Enter: "Enter",
  Backspace: "Backspace",
  Delete: "Delete",
  ArrowUp: "Up",
  ArrowDown: "Down",
  ArrowLeft: "Left",
  ArrowRight: "Right",
};

function delay(ms: number): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, ms);
  return promise;
}

function loadConfig(): ShortcutConfig {
  if (typeof localStorage === "undefined") {
    return DEFAULT_CONFIG;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    }
  } catch {
    // Fall back to default config on parse error
  }
  return DEFAULT_CONFIG;
}

function saveConfig(config: ShortcutConfig): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent("paseo-display-switcher:config-change", { detail: config }));
  } catch {
    // Ignore storage write errors
  }
}

/**
 * Derives the base physical key using e.code so macOS Option/Alt modifiers
 * do not alter letters/digits (e.g. Option+1 => "1" instead of "¡", Option+P => "P" instead of "π").
 */
function getCleanKeyName(e: KeyboardEvent): string | null {
  const code = e.code;

  if (
    code.startsWith("Control") ||
    code.startsWith("Alt") ||
    code.startsWith("Shift") ||
    code.startsWith("Meta") ||
    code === "Escape" ||
    code === "Tab" ||
    code === "CapsLock"
  ) {
    return null;
  }

  if (code.startsWith("Key")) {
    return code.slice(3).toUpperCase();
  }
  if (code.startsWith("Digit")) {
    return code.slice(5);
  }
  if (code.startsWith("Numpad")) {
    return code.slice(6);
  }
  if (/^F\d+$/.test(code)) {
    return code;
  }

  if (SPECIAL_KEY_CODES[code]) {
    return SPECIAL_KEY_CODES[code];
  }

  // Fallback to e.key for non-standard inputs
  if (
    ["Control", "Alt", "AltGraph", "Shift", "Meta", "Escape", "Tab", "CapsLock", "Dead", "Process", "Unidentified"].includes(
      e.key,
    )
  ) {
    return null;
  }

  return e.key.length === 1 ? e.key.toUpperCase() : e.key;
}

function eventToShortcut(e: KeyboardEvent): string | null {
  const keyName = getCleanKeyName(e);
  if (!keyName) {
    return null;
  }

  const parts: string[] = [];
  if (e.metaKey) {
    parts.push("Cmd");
  }
  if (e.ctrlKey) {
    parts.push("Ctrl");
  }
  if (e.altKey) {
    parts.push("Option");
  }
  if (e.shiftKey) {
    parts.push("Shift");
  }

  if (parts.length === 0) {
    return null;
  }

  parts.push(keyName);
  return parts.join("+");
}

function matchShortcut(e: KeyboardEvent, shortcut: string): boolean {
  if (!shortcut || !shortcut.trim()) {
    return false;
  }
  const keyName = getCleanKeyName(e);
  if (!keyName) {
    return false;
  }

  const tokens = shortcut.split("+").map((t) => t.trim().toLowerCase());
  if (tokens.length === 0) {
    return false;
  }

  const targetKey = tokens[tokens.length - 1];
  const modifiers = new Set(tokens.slice(0, tokens.length - 1));

  const needsCmd = modifiers.has("cmd") || modifiers.has("meta") || modifiers.has("command");
  const needsCtrl = modifiers.has("ctrl") || modifiers.has("control");
  const needsAlt = modifiers.has("alt") || modifiers.has("option");
  const needsShift = modifiers.has("shift");

  if (needsCmd !== e.metaKey) {
    return false;
  }
  if (needsCtrl !== e.ctrlKey) {
    return false;
  }
  if (needsAlt !== e.altKey) {
    return false;
  }
  if (needsShift !== e.shiftKey) {
    return false;
  }

  return keyName.toLowerCase() === targetKey;
}

function isEditableTarget(event: KeyboardEvent): boolean {
  const path = event.composedPath();
  for (const node of path) {
    if (!(node instanceof HTMLElement)) {
      continue;
    }
    if (
      node.isContentEditable ||
      node.matches(
        'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="searchbox"], [role="combobox"], .monaco-editor, .CodeMirror, .cm-editor',
      )
    ) {
      return true;
    }
  }
  return false;
}

// Grounded selectors from Paseo's sidebar Display menu (RNW testID -> data-testid).
const TRIGGER_SELECTOR =
  '[data-testid="sidebar-display-preferences-menu"], [aria-label="Display preferences"]';
const MENU_SELECTOR = '[data-testid="sidebar-display-preferences-content"]';
const GROUPING_SUBTRIGGER_SELECTOR = '[data-testid="sidebar-display-grouping"]';
// Zustand persist store backing the sidebar view preferences.
const SIDEBAR_VIEW_STORAGE_KEY = "sidebar-view";

type GroupMode = "project" | "status";

const INTERACTIVE_SELECTOR =
  '[role="menuitem"], [role="button"], [role="radio"], [role="checkbox"], [role="option"], [role="menuitemradio"], [tabindex], button, a';

function pointerEventInits(target: HTMLElement): {
  pointerInit: PointerEventInit;
  mouseInit: MouseEventInit;
} {
  const rect = target.getBoundingClientRect();
  const clientX = rect.left + rect.width / 2;
  const clientY = rect.top + rect.height / 2;
  return {
    pointerInit: {
      bubbles: true,
      cancelable: true,
      composed: true,
      view: window,
      clientX,
      clientY,
      button: 0,
      buttons: 1,
      pointerId: 1,
      pointerType: "mouse",
      isPrimary: true,
    },
    mouseInit: {
      bubbles: true,
      cancelable: true,
      composed: true,
      view: window,
      clientX,
      clientY,
      button: 0,
      buttons: 1,
    },
  };
}

/**
 * Dispatches hover-in events. MenuSubTrigger flyouts open on pointer hover
 * (after an internal delay); a click immediately following hover cancels the
 * pending flyout, so hover and click are dispatched separately.
 */
function triggerHover(el: HTMLElement): void {
  const target = el.closest<HTMLElement>(INTERACTIVE_SELECTOR) || el;
  const { pointerInit, mouseInit } = pointerEventInits(target);
  try {
    target.dispatchEvent(new PointerEvent("pointerover", { ...pointerInit, buttons: 0 }));
    target.dispatchEvent(
      new PointerEvent("pointerenter", { ...pointerInit, bubbles: false, buttons: 0 }),
    );
    target.dispatchEvent(new PointerEvent("pointermove", { ...pointerInit, buttons: 0 }));
  } catch {
    // PointerEvent constructor unavailable; mouse events below still fire.
  }
  target.dispatchEvent(new MouseEvent("mouseover", { ...mouseInit, buttons: 0 }));
  target.dispatchEvent(new MouseEvent("mouseenter", { ...mouseInit, bubbles: false, buttons: 0 }));
  target.dispatchEvent(new MouseEvent("mousemove", { ...mouseInit, buttons: 0 }));
}

/**
 * Dispatches one coherent pointer/mouse/click press sequence on the closest
 * interactive container. Exactly one "click" event is produced: dispatching both
 * a synthetic click and target.click() double-activates React Native Web
 * Pressables, which toggles the Display menu open and immediately closed again.
 */
function triggerClick(el: HTMLElement): void {
  const target = el.closest<HTMLElement>(INTERACTIVE_SELECTOR) || el;
  const { pointerInit, mouseInit } = pointerEventInits(target);
  try {
    target.dispatchEvent(new PointerEvent("pointerdown", pointerInit));
  } catch {
    // Ignore.
  }
  target.dispatchEvent(new MouseEvent("mousedown", mouseInit));
  try {
    target.dispatchEvent(new PointerEvent("pointerup", { ...pointerInit, buttons: 0 }));
  } catch {
    // Ignore.
  }
  target.dispatchEvent(new MouseEvent("mouseup", { ...mouseInit, buttons: 0 }));
  target.dispatchEvent(new MouseEvent("click", { ...mouseInit, buttons: 0 }));
}

function isElementVisible(el: HTMLElement): boolean {
  if (el.offsetParent === null && el.offsetWidth === 0 && el.offsetHeight === 0) {
    return false;
  }
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function queryVisible(selector: string): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>(selector)) {
    if (isElementVisible(el)) {
      return el;
    }
  }
  return null;
}

/** Polls until `probe` returns a truthy value or the timeout elapses. */
async function waitFor<T>(
  probe: () => T | null | undefined | false,
  timeoutMs: number,
  intervalMs = 25,
): Promise<T | null> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const result = probe();
    if (result) {
      return result;
    }
    if (Date.now() >= deadline) {
      return null;
    }
    await delay(intervalMs);
  }
}

/**
 * Reads the live grouping mode from Paseo's persisted sidebar-view store
 * (zustand persist writes synchronously on every setGroupMode).
 */
function readGroupMode(): GroupMode | "label" | null {
  if (typeof localStorage === "undefined") {
    return null;
  }
  try {
    const raw = localStorage.getItem(SIDEBAR_VIEW_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const mode = JSON.parse(raw)?.state?.groupMode;
    return mode === "project" || mode === "status" || mode === "label" ? mode : null;
  } catch {
    return null;
  }
}

/**
 * The Grouping options render in a flyout ("sidebar-display-preferences-content-grouping")
 * that is a sibling portal of the main menu node, so the lookup is document-wide.
 */
function findGroupingOption(mode: GroupMode): HTMLElement | null {
  const byTestId = queryVisible(`[data-testid="sidebar-grouping-${mode}"]`);
  if (byTestId) {
    return byTestId;
  }
  // Fallback if item testIDs change: short-text match scoped strictly to the
  // Grouping flyout. The main menu page also contains "Status"/"Project" text
  // (the grouping value badge and the Project filter row), so matching there
  // clicks the wrong control.
  const pattern = mode === "status" ? /^status$/i : /^projects?$/i;
  for (const surface of document.querySelectorAll<HTMLElement>(
    '[data-testid="sidebar-display-preferences-content-grouping"]',
  )) {
    for (const item of surface.querySelectorAll<HTMLElement>(
      '[role="menuitem"], [role="menuitemradio"], [role="radio"], [role="option"], [role="button"], button, [tabindex]',
    )) {
      if (!isElementVisible(item)) {
        continue;
      }
      const text = (item.innerText || item.textContent || "").trim();
      if (text.length <= 20 && pattern.test(text)) {
        return item;
      }
    }
  }
  return null;
}

/** Closes the Display menu (if still open) with a single Escape, then verifies. */
async function dismissDisplayMenu(): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (!queryVisible(MENU_SELECTOR)) {
      return;
    }
    const active =
      document.activeElement instanceof HTMLElement ? document.activeElement : document.body;
    const escapeInit: KeyboardEventInit = {
      key: "Escape",
      code: "Escape",
      bubbles: true,
      cancelable: true,
      composed: true,
    };
    active.dispatchEvent(new KeyboardEvent("keydown", escapeInit));
    active.dispatchEvent(new KeyboardEvent("keyup", escapeInit));
    await delay(60);
  }
}

let switchInFlight = false;

const debugLog = (...args: unknown[]) =>
  console.debug("[paseo-display-switcher]", ...args);

export async function switchDisplayListing(
  target: "status" | "project" | "toggle",
): Promise<boolean> {
  if (typeof document === "undefined") {
    return false;
  }
  // Re-entrancy guard: overlapping runs (held keys, double invocations) raced —
  // the second run saw the first run's half-open menu and closed or re-toggled it.
  if (switchInFlight) {
    return false;
  }
  switchInFlight = true;

  let openedMenu = false;
  let openedNavigation = false;

  try {
    const currentMode = readGroupMode();
    const desired: GroupMode =
      target === "toggle" ? (currentMode === "status" ? "project" : "status") : target;
    debugLog("switch start", { target, currentMode, desired });

    // Already in the desired mode: nothing to do, and nothing to open.
    if (currentMode === desired) {
      return true;
    }

    // Reuse an already-open Display menu; otherwise open it via its trigger.
    let menu = queryVisible(MENU_SELECTOR);
    if (!menu) {
      let trigger = queryVisible(TRIGGER_SELECTOR);

      if (!trigger) {
        // Compact/mobile: the sidebar may live in a navigation drawer.
        const openNavigation = queryVisible(
          '[aria-label="Open menu"], [data-testid="open-nav-drawer"]',
        );
        if (openNavigation) {
          triggerClick(openNavigation);
          openedNavigation = true;
          trigger = await waitFor(() => queryVisible(TRIGGER_SELECTOR), 1000);
        }
      }

      if (!trigger) {
        return false;
      }

      triggerClick(trigger);
      openedMenu = true;
      debugLog("trigger clicked");
      menu = await waitFor(() => queryVisible(MENU_SELECTOR), 1500);
      if (!menu) {
        return false;
      }
      debugLog("menu open", !!menu);
    }

    // The Grouping options live in a hover-opened flyout beside the menu.
    let option = findGroupingOption(desired);
    if (!option) {
      const subTrigger = await waitFor(() => {
        const el = menu?.querySelector<HTMLElement>(GROUPING_SUBTRIGGER_SELECTOR);
        return el && isElementVisible(el) ? el : null;
      }, 800);
      debugLog("subtrigger", !!subTrigger);
      if (subTrigger) {
        // The flyout opens on hover after an internal delay, and the menu
        // attaches its hover listeners only after mount/animation, so hover is
        // re-dispatched until the flyout appears. Clicking immediately after
        // hovering cancels the pending open, so a click is only the fallback.
        for (let attempt = 0; attempt < 8 && !option; attempt++) {
          triggerHover(subTrigger);
          option = await waitFor(() => findGroupingOption(desired), 250);
        }
        debugLog("option after hover", !!option);
        if (!option) {
          triggerClick(subTrigger);
          option = await waitFor(() => findGroupingOption(desired), 1200);
        }
        debugLog("option after click fallback", !!option);
      }
    }

    if (!option) {
      return false;
    }
    debugLog("option found, clicking");

    // Click, then verify against the persisted store; retry once if it did not land.
    for (let attempt = 0; attempt < 2; attempt++) {
      triggerClick(option);
      const verified = await waitFor(() => readGroupMode() === desired, 1000, 50);
      debugLog("verify attempt", attempt, readGroupMode());
      if (verified) {
        return true;
      }
      option = findGroupingOption(desired);
      if (!option) {
        break;
      }
    }

    return readGroupMode() === desired;
  } finally {
    // Only clean up UI we opened ourselves; never Escape the user's own popovers.
    if (openedMenu) {
      await dismissDisplayMenu();
    }
    if (openedNavigation) {
      const closeNavigation = queryVisible(
        '[aria-label="Close menu"], [data-testid="close-nav-drawer"]',
      );
      if (closeNavigation) {
        triggerClick(closeNavigation);
      }
    }
    switchInFlight = false;
  }
}

let globalConfig = loadConfig();
let isRecordingShortcut = false;

function setupGlobalShortcutListener(): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const listenerKey = "__paseoDisplaySwitcherCleanup";
  const state = window as typeof window & { [listenerKey]?: () => void };
  state[listenerKey]?.();

  const handleKeyDown = (event: KeyboardEvent) => {
    // event.repeat fires continuously while a key is held; without this guard a
    // held shortcut queued dozens of overlapping switch attempts.
    if (event.repeat || !globalConfig.enabled || isRecordingShortcut) {
      return;
    }

    const editingText = isEditableTarget(event);
    if (editingText && !event.metaKey && !event.ctrlKey) {
      return;
    }

    const target =
      (globalConfig.toggleShortcut &&
        matchShortcut(event, globalConfig.toggleShortcut) &&
        "toggle") ||
      (globalConfig.statusShortcut &&
        matchShortcut(event, globalConfig.statusShortcut) &&
        "status") ||
      (globalConfig.projectShortcut &&
        matchShortcut(event, globalConfig.projectShortcut) &&
        "project");

    if (!target) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    void switchDisplayListing(target);
  };

  const handleConfigChange = (event: Event) => {
    globalConfig = (event as CustomEvent<ShortcutConfig>).detail;
  };

  const cleanup = () => {
    window.removeEventListener("keydown", handleKeyDown, { capture: true });
    window.removeEventListener("paseo-display-switcher:config-change", handleConfigChange);
    if (state[listenerKey] === cleanup) {
      delete state[listenerKey];
    }
  };

  window.addEventListener("keydown", handleKeyDown, { capture: true });
  window.addEventListener("paseo-display-switcher:config-change", handleConfigChange);
  state[listenerKey] = cleanup;
  return cleanup;
}

// Client-module side effect: the previous bundle's listener is removed via the
// window-scoped cleanup key inside setupGlobalShortcutListener, so plugin
// reload / HMR never stacks duplicate keydown handlers.
setupGlobalShortcutListener();
debugLog("client bundle loaded");

type ActionKey = "toggleShortcut" | "statusShortcut" | "projectShortcut";

export function MainSurface({ theme, layout }: PluginSurfaceProps) {
  const [config, setConfig] = useState<ShortcutConfig>(() => loadConfig());
  const [recordingAction, setRecordingAction] = useState<ActionKey | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!recordingAction) {
      return;
    }

    isRecordingShortcut = true;
    const handleRecordKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (event.key === "Escape") {
        setRecordingAction(null);
        setFeedback("Key recording cancelled.");
        return;
      }

      const shortcut = eventToShortcut(event);
      if (shortcut) {
        const updated = { ...config, [recordingAction]: shortcut };
        setConfig(updated);
        saveConfig(updated);
        setRecordingAction(null);
        setFeedback(`Assigned ${shortcut} to ${recordingAction.replace("Shortcut", "")}.`);
      }
    };

    window.addEventListener("keydown", handleRecordKeyDown, { capture: true });
    return () => {
      isRecordingShortcut = false;
      window.removeEventListener("keydown", handleRecordKeyDown, { capture: true });
    };
  }, [recordingAction, config]);

  const updateConfigField = (field: ActionKey, value: string) => {
    const updated = { ...config, [field]: value };
    setConfig(updated);
    saveConfig(updated);
    setFeedback(`Updated shortcut for ${field.replace("Shortcut", "")}.`);
  };

  const toggleEnabled = () => {
    const updated = { ...config, enabled: !config.enabled };
    setConfig(updated);
    saveConfig(updated);
    setFeedback(updated.enabled ? "Keyboard shortcuts enabled." : "Keyboard shortcuts disabled.");
  };

  const styles = useMemo(
    () => ({
      screen: {
        flex: 1,
        padding: layout.compact ? 16 : 24,
        gap: 16,
        backgroundColor: theme.colors.surface0,
      },
      title: {
        color: theme.colors.foreground,
        fontSize: layout.compact ? 20 : 24,
        fontWeight: "bold" as const,
      },
      description: {
        color: theme.colors.foregroundMuted,
        fontSize: 14,
        lineHeight: 20,
      },
      row: {
        flexDirection: layout.compact ? ("column" as const) : ("row" as const),
        alignItems: layout.compact ? ("flex-start" as const) : ("center" as const),
        justifyContent: "space-between" as const,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 8,
        backgroundColor: theme.colors.surface0,
        borderWidth: 1,
        borderColor: theme.colors.foregroundMuted,
        gap: 12,
      },
      actionInfo: {
        flex: 1,
        gap: 2,
      },
      actionTitle: {
        color: theme.colors.foreground,
        fontWeight: "600" as const,
        fontSize: 14,
      },
      actionDescription: {
        color: theme.colors.foregroundMuted,
        fontSize: 12,
      },
      actionControls: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        flexWrap: "wrap" as const,
        gap: 8,
      },
      badge: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 6,
        backgroundColor: theme.colors.accent,
      },
      badgeUnset: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 6,
        backgroundColor: theme.colors.surface0,
        borderWidth: 1,
        borderColor: theme.colors.foregroundMuted,
      },
      badgeText: {
        color: theme.colors.accentForeground,
        fontFamily: "monospace",
        fontWeight: "bold" as const,
        fontSize: 12,
      },
      badgeUnsetText: {
        color: theme.colors.foregroundMuted,
        fontSize: 12,
        fontStyle: "italic" as const,
      },
      button: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 6,
        backgroundColor: theme.colors.accent,
      },
      buttonRecording: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 6,
        backgroundColor: theme.colors.statusDanger,
      },
      buttonSecondary: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 6,
        backgroundColor: theme.colors.surface0,
        borderWidth: 1,
        borderColor: theme.colors.foregroundMuted,
      },
      buttonText: {
        color: theme.colors.accentForeground,
        fontWeight: "600" as const,
        fontSize: 12,
      },
      buttonSecondaryText: {
        color: theme.colors.foreground,
        fontWeight: "600" as const,
        fontSize: 12,
      },
      dangerText: {
        color: theme.colors.statusDanger,
        fontWeight: "bold" as const,
        fontSize: 12,
      },
      feedback: {
        color: theme.colors.foregroundMuted,
        fontSize: 13,
        fontStyle: "italic" as const,
      },
      card: {
        padding: 14,
        borderRadius: 8,
        backgroundColor: theme.colors.surface0,
        borderWidth: 1,
        borderColor: theme.colors.foregroundMuted,
        gap: 8,
      },
      cardTitle: {
        color: theme.colors.foreground,
        fontWeight: "600" as const,
        fontSize: 14,
      },
      code: {
        color: theme.colors.accent,
        fontFamily: "monospace",
      },
    }),
    [theme, layout.compact],
  );

  const actions: Array<{ key: ActionKey; title: string; description: string }> = [
    {
      key: "toggleShortcut",
      title: "Toggle Display Listing",
      description: "Toggles between Project listing and Status listing.",
    },
    {
      key: "statusShortcut",
      title: "Switch to Status Listing",
      description: "Directly switches sidebar to Status listing mode.",
    },
    {
      key: "projectShortcut",
      title: "Switch to Project Listing",
      description: "Directly switches sidebar to Project listing mode.",
    },
  ];

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Display Preferences Shortcuts</Text>
      <Text style={styles.description}>
        Configure, change, or remove keyboard shortcuts to switch sidebar display modes directly from anywhere in the app.
      </Text>

      <View style={styles.row}>
        <View style={styles.actionInfo}>
          <Text style={styles.actionTitle}>Enable Keyboard Shortcuts</Text>
          <Text style={styles.actionDescription}>
            {config.enabled ? "Shortcuts are active." : "Shortcuts are currently disabled."}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={toggleEnabled}
          style={config.enabled ? styles.button : styles.buttonSecondary}
        >
          <Text style={config.enabled ? styles.buttonText : styles.buttonSecondaryText}>
            {config.enabled ? "Enabled" : "Disabled"}
          </Text>
        </Pressable>
      </View>

      {actions.map((act) => {
        const isRecording = recordingAction === act.key;
        const currentShortcut = config[act.key];

        return (
          <View key={act.key} style={styles.row}>
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>{act.title}</Text>
              <Text style={styles.actionDescription}>{act.description}</Text>
            </View>

            <View style={styles.actionControls}>
              <View style={currentShortcut ? styles.badge : styles.badgeUnset}>
                <Text style={currentShortcut ? styles.badgeText : styles.badgeUnsetText}>
                  {isRecording ? "Press keys..." : currentShortcut || "Not set"}
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={() => setRecordingAction(isRecording ? null : act.key)}
                style={isRecording ? styles.buttonRecording : styles.button}
              >
                <Text style={styles.buttonText}>{isRecording ? "Cancel" : "Record"}</Text>
              </Pressable>

              {currentShortcut ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => updateConfigField(act.key, "")}
                  style={styles.buttonSecondary}
                >
                  <Text style={styles.dangerText}>Remove</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        );
      })}

      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>How to configure shortcuts</Text>
        <Text style={styles.description}>
          • Click <Text style={styles.code}>Record</Text>, then press your desired modifier combination (e.g. <Text style={styles.code}>Cmd+Option+1</Text>, <Text style={styles.code}>Option+P</Text>, <Text style={styles.code}>Ctrl+Alt+S</Text>).{"\n"}
          • Click <Text style={styles.code}>Remove</Text> to delete/unassign any shortcut.{"\n"}
          • Press <Text style={styles.code}>Esc</Text> while recording to cancel.{"\n"}
          • Command Center (<Text style={styles.code}>⌘K</Text> → <Text style={styles.code}>status</Text> / <Text style={styles.code}>project</Text>) is also always available.
        </Text>
      </View>
    </View>
  );
}
