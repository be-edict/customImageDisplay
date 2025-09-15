const Applet = imports.ui.applet;
const Settings = imports.ui.settings;
const GLib = imports.gi.GLib;

function MyApplet(metadata, orientation, panel_height, instance_id) {
   this._init(metadata, orientation, panel_height, instance_id);
}

MyApplet.prototype = {
   __proto__: Applet.IconApplet.prototype,

   _init: function(metadata, orientation, panel_height, instance_id) {
      Applet.IconApplet.prototype._init.call(this, orientation, panel_height, instance_id);
      this.settings = new Settings.AppletSettings(this, metadata.uuid, instance_id);
      this.settings.bindProperty(Settings.BindingDirection.IN, 'image-path', 'imagePath', this.on_settings_changed, null);
   },

   on_settings_changed: function() {
      let path = this.imagePath;
      if (path.startsWith("file:///")) {
         path = path.substring(7);
      }
      if (GLib.file_test(path, GLib.FileTest.IS_REGULAR)) {
         try {
            this.set_applet_icon_path(path);
         } catch (err) {
            gloabl.logError(err);
         }
      } else {
         this.set_applet_icon_symbolic_name("dialog-information-symbolic");
         global.logError("Unable to change icon. Not a regular file.");
      }
    }

};

function main(metadata, orientation, panel_height, instance_id) {
   return new MyApplet(metadata, orientation, panel_height, instance_id);
}
