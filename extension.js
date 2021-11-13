// Guillotine: a gnome extension designed for efficiently carrying out executions of commands from a customizable menu
// Copyright (C) 2021 Christian Klaue (mail@ck76.de)

'use strict';

const UI = imports.ui;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const St = imports.gi.St;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Settings = imports.misc.extensionUtils.getSettings();

const DEBUG = 0;
const INFO = 1;
const WARNING = 2;
const ERROR = 3;
const OFF = 4;
var LogLevel = WARNING;
var NotificationLevel = OFF;

/******************************************************************************/
/***** LOGGING                                                            *****/
/******************************************************************************/

function debug(message) {
    if (LogLevel <= DEBUG) {
        log("[guillotine debug] " + message);
    }
    if (NotificationLevel <= DEBUG) {
        notify("[guillotine debug]", message);
    }
}

function info(message) {
    if (LogLevel <= INFO) {
        log("[guillotine info] " + message);
    }
    if (NotificationLevel <= INFO) {
        notify("[guillotine info]", message);
    }
}

function warning(message) {
    if (LogLevel <= WARNING) {
        log("[guillotine WARNING] " + message);
    }
    if (NotificationLevel <= WARNING) {
        notify("[guillotine Warning]", message);
    }
}

function error(message, error) {
    if (LogLevel <= ERROR) {
        if (typeof error === 'undefined') {
            log("[guillotine ERROR] " + message);
        } else {
            log("[guillotine ERROR] " + message + "\n" + error)
        }
    }
    if (NotificationLevel <= WARNING) {
        if (typeof error === 'undefined') {
            notify("[guillotine ERROR]", message);
        } else {
            notify("[guillotine ERROR]", message + "\n" + error)
        }
    }
}

function notify(message, details) {
    UI.main.notify(message, details || "");
}

/******************************************************************************/
/***** MENUITEMS                                                          *****/
/******************************************************************************/

const commandChecks = [{ name: "title", type: "string", default: "???" },
{ name: "icon", type: "string" },
{ name: "command", type: "string" },
{ name: "instancing", type: "string", values: ["singleinstance", "multipleinstances"], default: "multipleinstances" },
{ name: "killOnDisable", type: "boolean", default: true }];

class Command {
    constructor(properties) {
        this.canceled = false;
        let self = {};

        // sanity checks
        parseProperties(properties, self, commandChecks);
        Object.assign(this, self);

        // setup UI
        if ("icon" in this) {
            if (this.icon.toLowerCase() === "guillotine-symbolic") this.UI = new UI.popupMenu.PopupImageMenuItem(this.title, Gio.icon_new_for_string(Me.path + "/guillotine-symbolic.svg"));
            else this.UI = new UI.popupMenu.PopupImageMenuItem(this.title, this.icon);
        }
        else
            this.UI = new UI.popupMenu.PopupMenuItem(this.title);
        if (!("command" in this))
            this.UI.setSensitive(false);

        // setup callbacks
        this.UI.connect('activate', this.execute.bind(this))
        this.processes = {};
        debug("Menu item '" + this.title + "' initialized.");
    }

    execute() {
        if (this.instancing === "singleinstance") {
            this.UI.setSensitive(false);
        }
        try {
            let [_, argv] = GLib.shell_parse_argv(this.command);
            let subprocess = new Gio.Subprocess({
                argv: argv,
                flags: Gio.SubprocessFlags.NONE
            });
            subprocess.init(null);

            // Check the process completion
            let pid = subprocess.get_identifier();
            subprocess.wait_check_async(null, this.executed.bind(this, pid));
            this.processes[pid] = subprocess;
            debug("Process for '" + this.title + "' [" + pid + "] started.");
        } catch (e) {
            this.UI.setSensitive(false);
            error("Spawning process for '" + this.title + "' failed.", e);
        }
    }

    executed(pid, process, result) {
        process.wait_finish(result);
        delete this.processes[pid];
        if (process.get_if_signaled()) {
            let signal = process.get_term_sig();
            warning("Process for '" + this.title + "' [" + pid + "] was terminated by signal: " + signal + ".");
        } else {
            let result = process.get_exit_status();
            if (result) warning("Process for '" + this.title + "' [" + pid + "] finished with return code: " + result + ".");
            else info("Process for '" + this.title + "' [" + pid + "] finished without error.");
        }
        if (!this.canceled) this.UI.setSensitive(true);
    }

    cancel() {
        debug("Cancel called for " + this.title + ".");
        this.canceled = true;
        if (this.killOnDisable) for (const pid in this.processes) {
            info("Process for '" + this.title + "' [" + pid + "] is still running. Termination signal will be issued.");
            this.processes[pid].force_exit();
        }
    }
}

const switchChecks = [{ name: "title", type: "string", default: "???" },
{ name: "icon", type: "string" },
{ name: "start", type: "string" },
{ name: "stop", type: "string" },
{ name: "check", type: "string" },
{ name: "interval", type: "number" },
{ name: "interval_s", type: "number" },
{ name: "interval_ms", type: "number" }];

class Switch {
    constructor(properties) {
        this.canceled = false;
        let self = {};

        // sanity checks
        parseProperties(properties, self, switchChecks);
        Object.assign(this, self);

        this.UI = new UI.popupMenu.PopupSwitchMenuItem(this.title, false);

        if ("icon" in this) {
            this.UI.icon = new St.Icon({ style_class: 'popup-menu-icon' });
            if (this.icon.toLowerCase() === "guillotine-symbolic") this.UI.icon.gicon = Gio.icon_new_for_string(Me.path + "/guillotine-symbolic.svg");
            else this.UI.icon.icon_name = this.icon;
            this.UI.insert_child_at_index(this.UI.icon, 1);
        }

        this.UI.setSensitive(false);

        // setup callbacks
        this.UI.connect('activate', this.switch.bind(this));
        this.mode = 'interval';
        if ("check" in this) {
            this.timer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 0, this.test.bind(this, true));
        } else {
            error("Switch '" + this.title + "' has no check command defined. Switch is disabled.");
        }
        if (!("interval" in this) && !("interval_ms" in this) && !("interval_s" in this)) {
            this.interval_s = 10;
        }
        if (("interval_s" in this)) {
            delete this.interval_ms;
            delete this.interval;
        }
        if (("interval_ms" in this)) {
            delete this.interval;
        }
        if (("interval" in this)) {
            this.interval_ms = this.interval;
            delete this.interval;
        }

        this.processes = {};
        debug("Menu item '" + this.title + "' initialized.");
    }

    switch() {
        info("switch fn");
        // don't allow another interaction with this item
        this.UI.setSensitive(false);
        // cancel all automatic interval checks & signal manual switching
        if ("timer" in this) GLib.source_remove(this.timer);
        delete this.timer;
        this.mode = 'switch';

        let command;
        if (this.UI.state) command = this.start;
        else command = this.stop;

        try {
            let [_, argv] = GLib.shell_parse_argv(command);
            let subprocess = new Gio.Subprocess({
                argv: argv,
                flags: Gio.SubprocessFlags.NONE
            });
            subprocess.init(null);

            let pid = subprocess.get_identifier();
            subprocess.wait_check_async(null, this.switched.bind(this, pid, this.UI.state));
            this.processes[pid] = subprocess;
            if (this.UI.state) debug("Start process for switch '" + this.title + "' started.");
            else debug("Stop process for switch '" + this.title + "' started.");
        } catch (e) {
            if (this.UI.state) error("Spawning start process for switch '" + this.title + "' failed. Switch is disabled.", e);
            else error("Spawning stop process for switch '" + this.title + "' failed. Switch is disabled.", e);
        }
    }

    switched(pid, oldState, process, result) {
        process.wait_finish(result);
        delete this.processes[pid];
        if (this.canceled) return;
        if (process.get_if_signaled()) {
            let signal = process.get_term_sig();
            if (oldState) warning("Spawning start process for switch '" + this.title + "' was terminated by signal: " + signal + ".");
            else warning("Spawning stop process for switch '" + this.title + "' was terminated by signal: " + signal + ".");
        } else {
            let result = process.get_exit_status();
            if (result) {
                if (oldState) warning("Start process for switch '" + this.title + "' [" + pid + "] finished with return code: " + result + ".");
                else warning("Stop process for switch '" + this.title + "' [" + pid + "] finished with return code: " + result + ".");
            }
            else {
                if (oldState) debug("Start process for switch '" + this.title + "' [" + pid + "] finished without error.");
                else debug("Start process for switch '" + this.title + "' [" + pid + "] finished without error.");
            }
        }
        this.test(false);
    }

    test(interval) {
        // prevent further automatic tests for now
        if ("timer" in this) GLib.source_remove(this.timer);
        delete this.timer;
        // if canceled: abort any further tests
        if (this.canceled) return false;
        // if this is an automatic triggered interval test (interval is true) but there 
        // was some manual switching (timer is not defined), then abort and also
        // don't allow further automatic tests
        if ((interval) && (this.mode === 'switch')) {
            return false;
        }
        try {
            let [_, argv] = GLib.shell_parse_argv(this.check);
            let subprocess = new Gio.Subprocess({
                argv: argv,
                flags: Gio.SubprocessFlags.NONE
            });
            subprocess.init(null);

            let pid = subprocess.get_identifier();
            subprocess.wait_check_async(null, this.tested.bind(this, pid, interval));
            this.processes[pid] = subprocess;
            debug("Check process for switch '" + this.title + "' [" + pid + "] started.");
        } catch (e) {
            error("Spawning the check process for switch '" + this.title + "' failed. Switch is disabled.", e);
            return false;
        }
        return false;
    }

    tested(pid, interval, process, result) {
        process.wait_finish(result);
        delete this.processes[pid];
        // if canceled: abort any further tests
        if (this.canceled) return false;
        if (process.get_if_signaled()) {
            let signal = process.get_term_sig();
            warning("Check process for switch '" + this.title + "' [" + pid + "] was terminated by signal: " + signal + ". No more checks will be scheduled.");
        } else if ((this.mode === 'switch') && (interval)) {
            // if this is an automatic triggered interval test (interval is true) but there 
            // was some manual switching (timer is not defined), then abort and also
            // don't allow further automatic tests
            debug("Check process for switch '" + this.title + "' [" + pid + "] exited without error. Result is ignored due to initiating a manual switching meanwhile");
        } else {
            let result = process.get_exit_status();
            if (result) debug("Check process for switch '" + this.title + "' [" + pid + "] exited with return code: " + result + " --> switch is turned off.");
            else debug("Check process for switch '" + this.title + "' [" + pid + "] exited without error --> switch is turned on.");

            if (result) this.UI.setToggleState(false);
            else this.UI.setToggleState(true);

            if ((!this.canceled) && (result) && ("start" in this)) this.UI.setSensitive(true);
            if ((!this.canceled) && (!result) && ("stop" in this)) this.UI.setSensitive(true);

            if (!this.canceled) {
                this.mode = 'interval';
                if ("interval_s" in this) this.timer = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, this.interval_s, this.test.bind(this, true));
                else this.timer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, this.interval_ms, this.test.bind(this, true));
            }
        }
    }

    cancel() {
        debug("cancel called for " + this.title);
        this.canceled = true;
        if ("timer" in this) GLib.source_remove(this.timer);
        delete this.timer;
        this.mode = 'switch';
        for (const pid in this.processes) {
            info("Process for switch '" + this.title + "' [" + pid + "] is still running. Termination signal will be issued.");
            this.processes[pid].force_exit();
        }
    }

}

const menuChecks = [{ name: "title", type: "string", default: "???" },
{ name: "icon", type: "string" },
{ name: "items", type: "object" }];

class SubMenu {
    constructor(properties) {
        let self = {};
        // sanity checks
        parseProperties(properties, self, menuChecks);
        Object.assign(this, self);
        debug(this.icon);
        if ("icon" in this) {
            this.UI = new UI.popupMenu.PopupSubMenuMenuItem(this.title, true);
            if (this.icon.toLowerCase() === "guillotine-symbolic") this.UI.icon.gicon = Gio.icon_new_for_string(Me.path + "/guillotine-symbolic.svg");
            else this.UI.icon.icon_name = this.icon;
        } else this.UI = new UI.popupMenu.PopupSubMenuMenuItem(this.title);

        this.items = parseMenu(self.items);
        for (const item in this.items) {
            this.UI.menu.addMenuItem(this.items[item].UI);
        }
        debug("Menu item '" + this.title + "' initialized.");
    }

    cancel() {
        for (const item in this.items) {
            this.items[item].cancel();
        }
    }
}

class Separator {
    constructor(properties) {
        debug("Separator initialized.");
        this.UI = new UI.popupMenu.PopupSeparatorMenuItem(this.title);
    }

    cancel() {

    }
}

/******************************************************************************/
/***** Guillotine                                                         *****/
/******************************************************************************/

const settingsChecks = [
    { name: "icon", type: "string", default: "guillotine-symbolic" },
    { name: "loglevel", type: "string", default: "warning", values: ["debug", "info", "warning", "error"] },
    { name: "notificationlevel", type: "string", values: ["debug", "info", "warning", "error"] }
];

class Guillotine {
    constructor(meta) {
        info("Initializing " + Me.metadata.name + " version " + Me.metadata.version);
    }

    enable() {
        if (this.button) {
            info("Change of config detected: restarting " + Me.metadata.name);
            this.disable();
        } else {
            info("Enabling " + Me.metadata.name + " version " + Me.metadata.version);
        }
        this.menu = [];
        try {
            this.loadConfig();
            // check config if there are settings included
            if (typeof this.config.settings !== "object" || Array.isArray(this.config.settings)) this.config.settings = {};

            this.settings = {};
            parseProperties(this.config.settings, this.settings, settingsChecks);
            this.menu = parseMenu(this.config.menu);
        }
        catch (e) {
            error("Loading config failed.", e);
            // icon
            this.icon = new St.Icon({
                icon_name: "dialog-error",
                style_class: "system-status-icon"
            });

            // button
            this.button = new UI.panelMenu.Button();
            this.button.add_child(this.icon);
            UI.main.panel.addToStatusArea(Me.metadata.uuid, this.button);
            return;
        }

        LogLevel = ["debug", "info", "warning", "error"].indexOf(this.settings.loglevel.toLowerCase());
        debug("Log level at: " + this.settings.loglevel);
        if ("notificationlevel" in this.settings) {
            NotificationLevel = ["debug", "info", "warning", "error"].indexOf(this.settings.notificationlevel.toLowerCase());
            debug("Notification level at: " + this.settings.notificationlevel);
        } else {
            NotificationLevel = OFF;
            debug("Notifications are disabled.");
        }

        // icon
        this.icon = new St.Icon({ style_class: "system-status-icon" });
        if (this.settings.icon.toLowerCase() == "guillotine-symbolic")
            this.icon.gicon = Gio.icon_new_for_string(Me.path + "/guillotine-symbolic.svg");
        else
            this.icon.icon_name = this.settings.icon;

        // button
        this.button = new UI.panelMenu.Button(0.0, "guillotine", false);
        this.button.add_child(this.icon);

        for (const item in this.menu) {
            this.button.menu.addMenuItem(this.menu[item].UI);
        }
        UI.main.panel.addToStatusArea("guillotine", this.button);
    }

    disable() {
        info("Disabling " + Me.metadata.name);
        for (const item in this.menu) {
            this.menu[item].cancel();
        }
        if (this.configMonitor) {
            this.configMonitor.cancel();
            this.configMonitor = null;
        }
        if (this.button) {
            this.button.destroy();
            this.button = null;
        }
        if (this.configFile) {
            this.configFile = null;
        }
    }

    loadConfig() {
        // determine config location
        let configFilename = Settings.get_string("config");
        configFilename = configFilename || GLib.get_home_dir() + "/.config/guillotine.json";
        debug("Config location: " + configFilename);

        // TODO: async
        // check if custom config exists; restore default config file otherwise
        this.configFile = Gio.File.new_for_path(configFilename);
        if (!this.configFile.query_exists(null)) {
            let defaultConfig = Gio.File.new_for_path(Me.path + "/default.json");
            defaultConfig.copy(this.configFile, 0, null, null);
            info("Config not found @ location: " + configFilename + ". Default config restored.");
        }

        // setup monitor for config file
        this.configMonitor = this.configFile.monitor(Gio.FileMonitorFlags.NONE, null);
        this.configMonitor.connect("changed", this.enable.bind(this));

        // TODO: async
        // load config file
        this.config = {};
        let [ok, content] = GLib.file_get_contents(configFilename);
        if (ok) {
            let contentString = imports.byteArray.toString(content);
            this.config = JSON.parse(contentString);
        } else throw new Error("Could not load config file.");
    }
}

function parseProperties(source, target, checks) {
    for (const property in checks) {
        debug("checking property " + checks[property].name + ": " + source[checks[property].name]);
        if (checks[property].name in source) {
            // property is defined
            if (typeof source[checks[property].name] !== checks[property].type) {
                // property is defined with wrong type
                if ("default" in checks[property]) {
                    // property is defined using wrong type --> default value is used
                    warning("invalid value for property " + checks[property].name + ": " + source[checks[property].name] + "\nUsing default value: " + checks[property].default);
                    target[checks[property].name] = checks[property].default;
                } else
                    // property was defined using wrong type --> default value does not exist --> no value used
                    warning("invalid value for property " + checks[property].name + ": " + source[checks[property].name] + "\nIgnoring the value");
            } else
                // property is defined with correct type
                if ("values" in checks[property]) {
                    // property is defined with correct type & checks contain a list of valid values
                    if (!checks[property].values.includes(source[checks[property].name].toLowerCase())) {
                        // property is defined with correct type & checks contain a list of valid values --> property does not match any of that list --> default value is used
                        warning("invalid value for property " + checks[property].name + ": " + source[checks[property].name] + "\nUsing default value: " + checks[property].default);
                        target[checks[property].name] = checks[property].default;
                    } else
                        // property is defined with correct type & checks contain a list of valid values --> property does match one of that list
                        target[checks[property].name] = source[checks[property].name].toLowerCase();
                } else
                    // property is defined with correct type & checks contain a list of valid values --> property does match one of that list
                    target[checks[property].name] = source[checks[property].name];
        } else if ("default" in checks[property]) {
            // property is not defined --> use default
            debug("no value for property " + checks[property].name + ", using default value: " + checks[property].default);
            target[checks[property].name] = checks[property].default;
        }
        debug("done checking property " + checks[property].name + ": " + target[checks[property].name]);
    }
}

function parseMenu(menu) {
    let items = [];
    let types = [];
    types["command"] = Command;
    types["switch"] = Switch;
    types["submenu"] = SubMenu;
    types["separator"] = Separator;

    if (typeof menu === "object" && Array.isArray(menu)) {
        for (const item in menu) {
            if (!("type" in menu[item])) throw new Error("Invalid menu item: missing 'type' property");
            if (typeof types[menu[item].type.toLowerCase()] === "undefined") throw new Error("Invalid value for property 'type': " + menu[item].type);
            let menuItem = new types[menu[item].type.toLowerCase()](menu[item]);
            items.push(menuItem);
        }
    }
    return items;
}

/******************************************************************************/
/***** INIT                                                               *****/
/******************************************************************************/

function init(meta) {
    return new Guillotine(meta);
}
