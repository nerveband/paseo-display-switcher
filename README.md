# Paseo Display Switcher

A [Paseo](https://paseo.sh) plugin that lets you toggle and switch sidebar display modes (Project listing vs. Status listing) via keyboard shortcuts and the Command Center (`⌘K` / `Ctrl+K`).

## Features

- **Keyboard Shortcuts:** Assign custom key combinations (e.g. `Option+P`, `Cmd+Option+1`, `Ctrl+Alt+S`) to toggle or switch display listings directly.
- **Command Center Actions:** Search and trigger display modes from the Command Center (`⌘K` / `Ctrl+K` -> `Display: Switch to Status Listing`, `Display: Switch to Project Listing`, `Display: Toggle Listing`).
- **Sidebar Surface:** An in-app configuration surface under the sidebar item to view, record, or clear shortcuts.
- **Accurate State Grounding:** Reads and verifies against Paseo's persisted sidebar view store (`sidebar-view`), avoiding race conditions and redundant menu cycles.

## Requirements

- Paseo daemon (0.5.0+) with `pluginsEnabled: true` in `~/.paseo/config.json`.
- Node.js 18+.

## Installation

```bash
git clone https://github.com/nerveband/paseo-display-switcher.git ~/src/tools/paseo-display-switcher
cd ~/src/tools/paseo-display-switcher
npm install
npm run typecheck
paseo plugin install "$PWD"
paseo plugin ls
```

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
