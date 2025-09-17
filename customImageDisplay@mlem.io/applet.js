const Applet = imports.ui.applet;
const Settings = imports.ui.settings;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;

const APPLET_DIR = GLib.get_home_dir() + '/.local/share/cinnamon/applets/customImageDisplay@mlem.io';
const ICON_PATH = APPLET_DIR + '/applet_icon';
const STATE_FILE = APPLET_DIR + '/state.json';

function MyApplet(metadata, orientation, panel_height, instance_id) {
   this._init(metadata, orientation, panel_height, instance_id);
}

MyApplet.prototype = {
   __proto__: Applet.IconApplet.prototype,

   _init: function(metadata, orientation, panel_height, instance_id) {
      Applet.IconApplet.prototype._init.call(this, orientation, panel_height, instance_id);
      this.settings = new Settings.AppletSettings(this, metadata.uuid, instance_id);
      this.settings.bindProperty(Settings.BindingDirection.IN,
         'image-path',
         'imagePath',
         this.on_settings_changed,
         null);

      this.currentIconName = loadState().currentIconName || '';
      if (this.currentIconName && this.currentIconName !== '') {
         this.set_icon();
      } else {
         this.set_applet_icon_symbolic_name("dialog-information-symbolic");
      }
   },

   on_settings_changed: function() {
      let sourcePath = this.imagePath;
      if (sourcePath.startsWith("file:///")) {
         sourcePath = sourcePath.substring(7);
      }
      if (GLib.file_test(sourcePath, GLib.FileTest.IS_REGULAR)) {

         global.log("Trying to delete: " + this.currentIconName);
         if (this.currentIconName && this.currentIconName !== '') {
            try {
                let oldFile = Gio.File.new_for_path(this.currentIconName);
                if (oldFile.query_exists(null)) {
                    oldFile.delete(null);
                    global.log("deleted");
                }
            } catch (err) {
               this.error("Could not delete old icon. " + err);
            }
        }

         let timestamp = Date.now();
         let sourceFile = Gio.File.new_for_path(sourcePath);
         let extension = '';
         
         let lastDot = sourcePath.lastIndexOf('.');
         if (lastDot > -1) {
               extension = sourcePath.substring(lastDot);
         }
         
         this.currentIconName = ICON_PATH + '_' + timestamp + extension;

         let state = loadState();
         state.currentIconName = this.currentIconName;
         saveState(state);

         let destFile = Gio.File.new_for_path(this.currentIconName);

         try {
            sourceFile.copy(destFile, Gio.FileCopyFlags.OVERWRITE, null, null);
            this.set_icon();
         } catch (err) {
            this.error("Error while copying the file! " + err);
         }

      } else {
         this.error('The selected icon is not a regular file.');
      }
    },

   error(err) {
      global.logError("Encountered an error! " + ((err) ? err : ""));
      this.set_applet_icon_symbolic_name("dialog-information-symbolic");
   },

   set_icon() {
      if (this.currentIconName && this.currentIconName !== '' && GLib.file_test(this.currentIconName, GLib.FileTest.IS_REGULAR)){
         try {
            this.set_applet_icon_path(this.currentIconName);
         } catch (err) {
            this.error(err);
         }
      } else {
         this.error('Unable to change to selected icon.');
      }
    },

   on_applet_removed_from_panel: function() {
      if (this.currentIconName && this.currentIconName !== '') {
            try {
               let file = Gio.File.new_for_path(this.currentIconName);
               if (file.query_exists(null)) {
                  file.delete(null);
               }
            } catch (err) {
               this.error(err);
            }
      }
      try {
         let file = Gio.File.new_for_path(STATE_FILE);
         if (file.query_exists(null)) {
            file.delete(null);
         }
      } catch (err) {
         this.error(err);
      }
      this.settings.finalize();
   }
};

function main(metadata, orientation, panel_height, instance_id) {
   return new MyApplet(metadata, orientation, panel_height, instance_id);
}

function saveState(stateObj) {
    try {
        let file = Gio.File.new_for_path(STATE_FILE);
        let outputStream = file.replace(null, false, Gio.FileCreateFlags.NONE, null);
        let jsonStr = JSON.stringify(stateObj);
        outputStream.write_all(jsonStr, null);
        outputStream.close(null);
    } catch (err) {
        global.logError("Error saving state: " + err);
    }
}

function loadState() {
   try {
      let file = Gio.File.new_for_path(STATE_FILE);
      if (!file.query_exists(null)) {
         return {};
      }
      let [ok, contents] = file.load_contents(null);
      if (ok) {
         return JSON.parse(imports.byteArray.toString(contents));
      }
   } catch (err) {
      global.logError("Error loading state: " + err);
   }
   return {};
}