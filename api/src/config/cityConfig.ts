import fs from "node:fs";
import path from "node:path";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deployedCityId } from "../config.js";

type CityConfig = {
  cityId: string;
  questionCatalog: Array<{ id: string; label: string; kind: "number" | "select" }>;
};

const configDir = dirname(fileURLToPath(import.meta.url));

const CITY_CONFIG_CANDIDATES = [
  resolve(configDir, `../../../data/city-config/${deployedCityId}.json`),
  path.resolve(process.cwd(), "../data/city-config", `${deployedCityId}.json`),
  path.resolve(process.cwd(), "data/city-config", `${deployedCityId}.json`),
];

const resolveCityConfigPath = () => {
  for (const candidate of CITY_CONFIG_CANDIDATES) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error(
    `City config not found for '${deployedCityId}'. Checked: ${CITY_CONFIG_CANDIDATES.join(", ")}`,
  );
};

const cityConfigPath = resolveCityConfigPath();
const cityConfigRaw = fs.readFileSync(cityConfigPath, "utf8");
const cityConfig = JSON.parse(cityConfigRaw) as CityConfig;

if (!Array.isArray(cityConfig.questionCatalog) || cityConfig.questionCatalog.length === 0) {
  throw new Error(`Invalid city question catalog at '${cityConfigPath}'.`);
}

export const cityQuestionCatalog = cityConfig.questionCatalog;
export const cityQuestionIds = cityQuestionCatalog.map((question) => question.id);
