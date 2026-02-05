export type Mo2ModEntry = {
  name: string;
  enabled: boolean;
};

export type Mo2PluginEntry = {
  name: string;
  enabled: boolean;
};

export type LoadOrderModel = {
  mo2ProfileDir?: string;
  lootReportPath?: string;
  mods: Mo2ModEntry[];
  plugins: Mo2PluginEntry[];
  lootDetectedPlugins: string[];
};
