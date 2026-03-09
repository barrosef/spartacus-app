const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Firebase 10 distribui bundles .cjs que Metro não processa por padrão
config.resolver.sourceExts = [...config.resolver.sourceExts, "cjs"];

module.exports = config;
