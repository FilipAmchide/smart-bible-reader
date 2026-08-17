/** @type {import('jest').Config} */
module.exports = {
  rootDir: ".",
  roots: ["<rootDir>/src", "<rootDir>/test"],
  testRegex: ".*\\.spec\\.ts$",
  transform: { "^.+\\.ts$": "ts-jest" },
  moduleFileExtensions: ["js", "json", "ts"],
  moduleNameMapper: {
    "^@sbr/shared-types$": "<rootDir>/../../packages/shared-types/src/index.ts",
    "^@sbr/bible-data$": "<rootDir>/../../packages/bible-data/src/index.ts",
  },
  collectCoverageFrom: ["src/**/*.(t|j)s"],
};
