// SCRIPT: version-bump.mjs
// DESCRIÇÃO: Sincroniza a versão entre package.json, manifest.json e versions.json.
//            Deve ser rodado via npm run version antes de criar um release.
// CHAMADO POR: npm run version
// CONTRATO: Lê a versão do package.json e atualiza os demais arquivos

import { readFileSync, writeFileSync } from "fs";

const targetVersion = process.env.npm_package_version;

// Atualizar versions.json
const versions = JSON.parse(readFileSync("versions.json", "utf8"));
const { minAppVersion } = JSON.parse(readFileSync("manifest.json", "utf8"));
versions[targetVersion] = minAppVersion;
writeFileSync("versions.json", JSON.stringify(versions, null, "\t"));

// Atualizar manifest.json
const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const { version } = JSON.parse(readFileSync("package.json", "utf8"));
manifest.version = version;
writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t"));

// Atualizar smartwrite.module.json
const moduleManifest = JSON.parse(readFileSync("smartwrite.module.json", "utf8"));
moduleManifest.version = version;
writeFileSync("smartwrite.module.json", JSON.stringify(moduleManifest, null, "\t"));
