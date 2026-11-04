# Paseo Display Switcher

A [Paseo](https://paseo.sh) plugin that lets you toggle and switch sidebar display modes (Project listing vs. Status listing) via keyboard shortcuts and the Command Center (`⌘K` / `Ctrl+K`).

## Features

- **Keyboard Shortcuts:** Assign custom key combinations (e.g. `Option+P`, `Cmd+Shift+1`, `Cmd+Shift+2`, `Ctrl+Alt+S`) to toggle or switch display listings directly. Avoid `Cmd+Digit` and `Cmd+Option+Digit`: Paseo 0.15 binds them to workspace and tab jumps.
- **Command Center Actions:** Search and trigger display modes from the Command Center (`⌘K` / `Ctrl+K` -> `Display: Switch to Status Listing`, `Display: Switch to Project Listing`, `Display: Toggle Listing`).
- **Sidebar Surface:** An in-app configuration surface under the sidebar item to view, record, or clear shortcuts.
- **Accurate State Grounding:** Reads and verifies against Paseo's persisted sidebar view store (`sidebar-view`), avoiding race conditions and redundant menu cycles.

## Requirements

- Paseo 0.15.0 or later (the plugin uses the `addScreen` / `addSidebarHeaderItem` client API).
- Node.js 18+.

## Installation

Install directly from Git:

```bash
paseo plugin add nerveband/paseo-display-switcher
paseo plugin ls
```

Check and apply updates:

```bash
paseo plugin update paseo-display-switcher --check
paseo plugin update paseo-display-switcher
```

For local development, clone the repository, run `npm install` and `npm run typecheck`, then use `paseo plugin install "$PWD"`.

## Usage

### 1. Command Center
Press **`⌘K`** (macOS) or **`Ctrl+K`** (Linux/Windows) anywhere in Paseo and type:
- `status` -> **`Display: Switch to Status Listing`**
- `project` -> **`Display: Switch to Project Listing`**
- `toggle` -> **`Display: Toggle Listing (Project / Status)`**

### 2. Keyboard Shortcuts
- Open **Display Switcher** from the sidebar.
- Click **Record** on any action and press your desired key combination.
- Click **Remove** to unbind any shortcut.
- Toggle the **Enabled / Disabled** switch to enable or disable global shortcut capture.

## Development

```bash
npm run typecheck                           # TypeScript verification
paseo plugin reload paseo-display-switcher  # Apply changes live
paseo plugin logs paseo-display-switcher    # Inspect plugin output
```

## License

[MIT](LICENSE)
