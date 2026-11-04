# Paseo Display Switcher

A [Paseo](https://paseo.sh) plugin that switches the sidebar between Project listing and Status listing with one key press.

## What it does

- **Keyboard shortcuts.** Pick your own keys for three actions: switch to Status, switch to Project, or toggle between them. For example, `Cmd+Shift+2` for Status and `Cmd+Shift+1` for Project.
- **Command Center.** Press `Cmd+K` (or `Ctrl+K` on Linux and Windows) and type `status`, `project`, or `toggle`.
- **Settings screen.** Open **Display Switcher** in the sidebar to record, change, or remove shortcuts, or turn all shortcuts off.

The plugin checks Paseo's saved sidebar setting after each switch, so it knows the switch worked.

## Pick shortcuts that are free

Paseo 0.15 already uses `Cmd+1` to `Cmd+9` to jump between workspaces, and `Cmd+Option+1` to `Cmd+Option+9` to jump between tabs. Don't use those. `Cmd+Shift+1` and `Cmd+Shift+2` are free in Paseo and macOS. Screenshot apps often use `Cmd+Shift+3`, `4`, and `5`.

## Requirements

- Paseo 0.15.0 or later.
- Node.js 18 or later, only if you work on the code.

## Install

```bash
paseo plugin install git:nerveband/paseo-display-switcher
paseo plugin ls
```

To check for updates and install them:

```bash
paseo plugin update paseo-display-switcher --check
paseo plugin update paseo-display-switcher
```

## Set up your shortcuts

1. Open **Display Switcher** in the sidebar.
2. Click **Record** next to an action, then press the keys you want.
3. Click **Remove** to clear a shortcut.
4. Click **Enabled** to turn all shortcuts off. Click it again to turn them back on.

Shortcuts are saved in the Paseo app on each computer, so set them once per machine.

## Work on the code

```bash
git clone https://github.com/nerveband/paseo-display-switcher.git
cd paseo-display-switcher
npm install
npm run typecheck
paseo plugin install "$PWD"
```

After you change the code:

```bash
npm run typecheck
paseo plugin reload paseo-display-switcher
paseo plugin logs paseo-display-switcher
```

## License

[MIT](LICENSE)
