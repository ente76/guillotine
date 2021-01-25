# Quick Custom Menu

Guillotine is a gnome extension designed for efficiently carrying out executions of commands from a customizable menu.\nSimply speaking: it is a highly customizable menu that enables you to launch commands and toggle services.

## Installation

## Quick Start

If no config is found, a default config is restored at `~/.config/guillotine.json`.

## Configuration

The configuration has two segments: `settings` and `menu`.

### Settings

- `icon`: (optional, string) the name of a system icon to show in the top bar.
- `loglevel`: (optional, string) the log level of the extenions. any of the following values is valid:
  - `debug`
  - `info`
  - `warning` (default)
  - `error`

### Menu

The menu is an array of any of the following objects.

#### 1. command

- `type`: `command`
- `title` (string): title to show
- `icon` (string): name of a system icon to show
- `command` (string): command to execute
- `instancing` (string): how to handle a running process. Either of the following values is valid:
  - `singleInstance`: the menu item is disabled until the old process finished
  - `multipleInstances` (default): no restrictions; multiple instances may be executed in parallel
  - `killBeforeRestart`: the running process is killed forcefully when the menu is selected a second time
- `killOnDisable` (boolean): shall a running process get killed when the extension gets disabled? Defaults to `true`.

With regards to command instancing: some UI applications are behaving weird with regards to process creation. There are two types of weird applications:

- An app gets started but the startup process finishes almost instantly. For Guillotine this app is considered closed almost instantly. `code` is an example for such app. The options for `instancing` and `killOnDisable` have no effect on such app.
- An app gets started. When the app is closed by the user, the process keeps running. Although the app is no longer visible, you won't be able to start it a second time if `instancing` is put to `singleInstance`.

#### 2. switch

- `type`: `switch`
- `title` (string): title to show
- `icon` (string): name of a system icon to show
- `start` (string): command to execute when switching from off to on
- `stop` (string): command to execute when switching from on to off
- `check` (string): command to run when checking the toggle state
- `interval` (number): time between 2 checks in miliseconds
  - defaults to 500
  - depends on `checks`
  - the interval is the length of the pause between 2 checks, i.e. if the command assigned to `check` takes 200 ms to execute and `interval` is set to 500, the command is started every 700 ms.

A switch is strictly running a single instance. You won't be able to access the menu item while the `start`, the `stop` or the `check` command are executed. To be more precise: a `start` and a `stop` command will disable the menu. The next `check` command may enable the menu on success.

#### 3. submenu

| property           | description                                            |
|--------------------|--------------------------------------------------------|
| `type`             | `submenu`                                              |
| `title` (string)   | title to show                                          |
| `icon` (string)    | an icon to show                                        |
| `items` ([])       | an array of any item                                   |

#### 4. separator

| property           | description                                            |
|--------------------|--------------------------------------------------------|
| `type`             | `separator`                                            |

### Icons

Icons can be found by searching any subdirectory of the following directories:

- ~/.local/share/icons
- /usr/share/icons

`gtk3-icon-browser` is an app that shows a selection of system icons.

## License

Guillotine: a gnome extension designed for efficiently carrying out executions of commands from a customizable menu
Copyright (C) 2021 Christian Klaue [mail@ck76.de]

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.

Individual licenses may be granted upon request.
