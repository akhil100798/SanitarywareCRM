const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const existingBlockList = config.resolver.blockList
  ? [].concat(config.resolver.blockList)
  : [];

const taskOwnedBlockList = [
  /[/\\]\.qa-export-run-[^/\\]+[/\\]/,
  /[/\\]\.qa-hermes-temp-[^/\\]+[/\\]/,
  /[/\\]dist-check-[^/\\]+[/\\]/,
  /[/\\]\.node_modules-incomplete-backup[/\\]/,
  /[/\\]\.gradle[/\\]/,
  /[/\\]android[/\\]\.gradle[/\\]/,
  /[/\\]android[/\\]\.kotlin[/\\]/,
  /[/\\]android[/\\]build[/\\]/,
  /[/\\]android[/\\]app[/\\]build[/\\]/,
  /[/\\]android[/\\]app[/\\]\.cxx[/\\]/
];

config.resolver.blockList = [...existingBlockList, ...taskOwnedBlockList];

module.exports = config;
