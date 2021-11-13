[![buy me a coffee](https://img.shields.io/badge/buy%20me%20a%20coffee-or%20I%20sing-53a0d0?style=flat&logo=Buy-Me-A-Coffee)](https://www.buymeacoffee.com/ente)  [![donate@paypal](https://img.shields.io/badge/paypal-donation-53a0d0?style=flat&logo=paypal)](https://www.paypal.com/donate?hosted_button_id=CRGNTJBS4AD4G)

# Guillotine

Guillotine is a gnome extension designed for efficiently carrying out executions of commands from a customizable menu. Simply speaking: it is a highly customizable menu that enables you to launch commands and toggle services.

![example.png](example.png)

## Configuration

If no configuration is found, a default config is restored at `~/.config/guillotine.json`. Whenever the configuration file changes, the extension reloads automatically.

The configuration has two segments: `settings` and `menu`.

### Example

```JSON
{
    "settings": {
        "loglevel": "warning"
    },
    "menu": [
        {
            "type": "command",
            "title": "teamspeak",
            "command": "sh -c 'pactl set-card-profile $(pactl list short | grep bluez_card | cut -f1) headset_head_unit;pactl set-default-sink $(pactl list short sinks | grep alsa_output | cut -f1);teamspeak3'",
            "icon": "audio-headset-symbolic"
        },
        {
            "type": "separator"
        },
        {
            "type": "submenu",
            "title": "code",
            "icon": "com.visualstudio.code.oss",
            "items": [
                {
                    "type": "command",
                    "title": "guillotine",
                    "command": "code Projects/guillotine",
                    "icon": "guillotine-symbolic",
                    "killOnDisable": false
                },
                {
                    "type": "command",
                    "title": "kitsch",
                    "command": "code Projects/kitsch",
                    "icon": "guillotine-symbolic",
                    "killOnDisable": false
                }
            ]
        },
        {
            "type": "separator"
        },
        {
            "type": "submenu",
            "title": "Remote",
            "icon": "network-server-symbolic",
            "items": [
                {
                    "type": "command",
                    "title": "ssh remote.server.tld",
                    "command": "gnome-terminal -e 'ssh remote.server.tld'",
                    "icon": "preferences-other-symbolic",
                    "killOnDisable": false
                },
                {
                    "type": "command",
                    "title": "nautilus remote.server.tld",
                    "command": "nautilus ssh://remote.server.tld",
                    "instancing": "singleInstance",
                    "icon": "preferences-other-symbolic",
                    "killOnDisable": false
                }
            ]
        },
        {
            "type": "separator"
        },
        {
            "type": "submenu",
            "title": "Guillotine",
            "icon": "guillotine-symbolic",
            "items": [
                {
                    "type": "command",
                    "title": "Configuration",
                    "command": "code .config/guillotine.json",
                    "icon": "preferences-other-symbolic",
                    "killOnDisable": false
                },
                {
                    "type": "command",
                    "title": "Log",
                    "command": "gnome-terminal -e 'journalctl -f GNOME_SHELL_EXTENSION_UUID=guillotine@fopdoodle.net'",
                    "instancing": "singleInstance",
                    "icon": "emblem-documents-symbolic",
                    "killOnDisable": false
                },
                {
                    "type": "command",
                    "title": "Log Gnome Shell",
                    "command": "gnome-terminal -e 'journalctl -f _COMM=gnome-shell' ",
                    "instancing": "singleInstance",
                    "icon": "emblem-documents-symbolic",
                    "killOnDisable": false
                }
            ]
        },
        {
            "type": "separator"
        },
        {
            "type": "switch",
            "title": "syncthing",
            "start": "systemctl --user start syncthing.service",
            "stop": "systemctl --user stop syncthing.service",
            "check": "systemctl --user is-active syncthing.service",
            "icon": "emblem-synchronizing-symbolic",
            "interval_s": 10
        }
    ]
}
```

### settings

- `icon` (string): name of a system icon to show as the status icon
- `logLevel` (string): the log level of the extenions. Any of the following values is valid:
  - `debug`
  - `info`
  - `warning` (default)
  - `error`
- `notificationLevel` (string): the notification level of the extension. Any of the following values is valid:
  - not defined (default): notifications are disabled
  - `debug`
  - `info`
  - `warning`
  - `error`

### menu

The menu is an array of items, each being one of the following types.

#### 1. command

- `type`: `command`
- `title` (string): title to show
- `icon` (string): name of a system icon to show
- `command` (string): command to execute
- `instancing` (string): how to handle a running process. Either of the following values is valid:
  - `singleInstance`: the menu item is disabled until the old process finished
  - `multipleInstances` (default): no restrictions; multiple instances may be executed in parallel
- `killOnDisable` (boolean): whether the process gets killed when the extension gets disabled, defaults to `true`

#### 2. switch

- `type`: `switch`
- `title` (string): title to show
- `icon` (string): name of a system icon to show
- `start` (string): command to execute when switching from off to on
- `stop` (string): command to execute when switching from on to off
- `check` (string): command to run when checking the toggle stat
  - exit code `0`: the service is currently running, the switch is `on`
  - other exit code: the service is stopped, the switch is `off`
- `interval_s` (number): time between 2 checks in seconds
- `interval_ms` (number): time between 2 checks in milliseconds
- `interval` (number): **[deprecated]** same as `interval_ms`

If no interval is defined, it defaults to `interval_s` at 10 seconds. If multiple intervals are defined, `interval_s` has highest priority. The interval is the length of the pause between 2 checks, i.e. if the command assigned to `check` takes 1s to execute and `interval_s` is set to 2, the command is spawned every 3s. `interval_s` is less precise as `interval_ms` also in a way that the interval is not guaranteed to be precisely equal to the requested period. In return `interval_s` is supposed to consume less energy. `interval_ms` may become deprecated in the near future if `interval_s` prooves to be superior. 

**WARNING**: a (very) short interval may cause Gnome to become unresponsive.

#### 3. submenu

- `type`: `switch`
- `title` (string): title to show
- `icon` (string): name of a system icon to show
- `items` ([]): an arry of items, see [menu](###menu)

#### 4. separator

- `type`: `separator`

### Commands

`start`, `stop`, `check` and `command` are commands to be executed. It is highly recommended to test these commands extensively in a shell before adjusting the configuration. A shell that actually shows return codes (e.g. `zsh` with `powerlevel10k`) is recommended especially when testing switches.

The return code of all commands is checked. For `start`, `stop` and `command` a non-zero return code will currently only result in a log entry. For `check` the return code determines the switch state and no log entry is created.

There is no shell environment that commands are executed in. To use shell syntax, simply start any shell of your preference and ask the shell to execute the command: `"check": "sh -c 'if [ -f /folder/file ]; then exit 0; else exit 1; fi'"` which could be boiled down to `"check": "sh -c 'exit $([ -f /folder/file ])'"`.

Executing multiple commands with a single menu item works by calling a shell as well: `"command": "sh -c 'command1; command2'"`.

Executing commands directly or using a shell will happen in background. If you need foreground feedback, execute a terminal and pass the actual command to the terminal: `"command": "gnome-terminal -e 'journalctl -f GNOME_SHELL_EXTENSION_UUID=guillotine@fopdoodle.net'"`.

The options `singleInstance`, `killBeforeRestart` and `killOnDisable` have no impact on background processes, i.e., these options don't work on something like `sh -c 'long-running-command &'`. Some applications are implicitly behaving like this, e.g. firefox.

A switch is strictly running a single instance of all commands. You won't be able to access the menu item while the `start` or the `stop` command are executed. To be more precise: a `start` and a `stop` command will disable the menu and trigger a `check` command. On return of the `check` command the menu item gets enabled and switch to the correct state depending on the return code.

### Icons

Icons can be found by searching any subdirectory of the following directories:

- ~/.local/share/icons
- /usr/share/icons

`gtk3-icon-browser` is an app that shows a selection of system icons. Personally I use glade to browse the local icons.

## Change History

- v1: 26.01.2021
  - initial version
- v2: 29.01.2021
  - fixed a bug which prevented startup
  - implemented "submenu"
  - improved documentation
- v3: 31.01.2021
  - extension icon
  - icons for switches
  - logging adjusted:
    - switch-check adjusted to debug
    - log level logging fixed
- v4: 01.02.2021
  - metadata fixed / prepared for v4
  - icon for extensions.gnome.org added
  - button for buy-me-a-coffee added
  - button for paypal donations added
- v5: 30.04.2021:
  - configurable status icon (provided by [hashstat](https://github.com/hashstat))
- v6: 14.06.2021
  - adjust gnome version number
- v7: 06.11.2021
  - add gnome 41 compatibility (provided by [aliakseiz](https://github.com/aliakseiz))
- v8: 13.11.2021
  - improve the documentation of commands
  - implement exception handling for malformed commands
  - implement the interval settings in s and ms granularity
    - deprecated `interval`
  - implement shut down functionality for switch commands
  - prepare a set of test cases
  - implement notifications based on log entries with separate level filter
  - removed `killBeforeRestart` option from `command` (complex functionality with limited use)
    - a notification will be raised if in use (this will be removed in the next version)

## ToDo

The extension is considered stable. No further improvements are planned for now.

## Contributors

- [ente](https://github.com/ente76)
- [hashstat](https://github.com/hashstat)
- [aliakseiz](https://github.com/aliakseiz)

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
