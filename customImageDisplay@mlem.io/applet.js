const Applet = imports.ui.applet;
const Settings = imports.ui.settings;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Util = imports.misc.util;

const APPLET_DIR = GLib.get_home_dir() + '/.local/share/cinnamon/applets/customImageDisplay@mlem.io';
const ICON_PATH = APPLET_DIR + '/applet_icon';

let oldIconPath;

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
      this.settings.bindProperty(Settings.BindingDirection.NONE,
         'current_icon_name',
         'current_icon_name',
         () => {
            global.log("CHANGED!!! to: " + this.settings.getValue('current_icon_name'));
         }, null);

      this.cleanup_old_applet_icons();

      let iconPath = this.settings.getValue('current_icon_name');
      if (iconPath && iconPath!== '') {
         this.set_icon();
      }
   },

   cleanup_old_applet_icons() {
      try {
            let dir = Gio.File.new_for_path(APPLET_DIR);
            let enumerator = dir.enumerate_children('standard::name', 
               Gio.FileQueryInfoFlags.NONE, 
               null);
            
            let iconPath = this.settings.getValue('current_icon_name');
            let fileInfo;
            while ((fileInfo = enumerator.next_file(null)) != null) {
               let filename = fileInfo.get_name();
               if (filename.startsWith('applet_icon_') && 
                  APPLET_DIR + '/' + filename !== iconPath) {
                  try {
                        let file = Gio.File.new_for_path(APPLET_DIR + '/' + filename);
                        file.delete(null);
                  } catch (err) {
                     this.error(err);
                  }
               }
            }
         } catch (err) {
            this.error(err);
        }
   },

   on_settings_changed: function() {
      let sourcePath = this.imagePath;
      if (sourcePath.startsWith("file:///")) {
         sourcePath = sourcePath.substring(7);
      }
      if (GLib.file_test(sourcePath, GLib.FileTest.IS_REGULAR)) {

         global.log("Trying to delete: " + this.settings.getValue('current_icon_name'));
         let iconPath = this.settings.getValue('current_icon_name');
         if (iconPath && iconPath !== '') {
            try {
                let oldFile = Gio.File.new_for_path(iconPath);
                if (oldFile.query_exists(null)) {
                    oldFile.delete(null);
                    global.log("delted");
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
         
         iconPath = ICON_PATH + '_' + timestamp + extension;
         let destFile = Gio.File.new_for_path(iconPath);

         try {
            sourceFile.copy(destFile, Gio.FileCopyFlags.OVERWRITE, null, null);
            this.settings.setValue('current_icon_name', iconPath);
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
      let iconPath = this.settings.getValue('current_icon_name');
      if (iconPath && iconPath!== '' && GLib.file_test(iconPath, GLib.FileTest.IS_REGULAR)){
         try {
            this.set_applet_icon_path(iconPath);
         } catch (err) {
            this.error(err);
         }
      } else {
         this.error('Unable to change to selected icon.');
      }
    },

   on_applet_removed_from_panel: function() {
      let iconPath = this.settings.getValue('current_icon_name');
      if (iconPath && iconPath !== '') {
            try {
               let file = Gio.File.new_for_path(iconPath);
               if (file.query_exists(null)) {
                  file.delete(null);
               }
            } catch (err) {
               this.error(err);
            }
      }
      this.settings.finalize();
   }
};

function main(metadata, orientation, panel_height, instance_id) {
   return new MyApplet(metadata, orientation, panel_height, instance_id);
}