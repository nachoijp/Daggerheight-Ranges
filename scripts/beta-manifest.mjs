// Turns the build in dist-beta/ into the beta: same extension, its own
// name and version, so a tester can tell it apart in Owlbear. Hosted at its
// own address (risingranges-beta.ijpedraza.com); the regular one keeps
// serving the released version.
import { readFileSync, writeFileSync } from "node:fs";

const BETA = process.env.BETA ?? "1";
const path = "dist-beta/manifest.json";
const manifest = JSON.parse(readFileSync(path, "utf8"));
manifest.name = `${manifest.name} (beta)`;
manifest.version = `${manifest.version}-beta.${BETA}`;
writeFileSync(path, JSON.stringify(manifest, null, 2) + "\n");
console.log(`${manifest.name} ${manifest.version}`);
