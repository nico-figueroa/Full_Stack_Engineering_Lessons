module.exports = {
  testEnvironment: "jsdom",
  transform: { "^.+\\.[jt]sx?$": "babel-jest" },
  setupFilesAfterEnv: ["<rootDir>/test/setup.js"],
  moduleNameMapper: {
    "\\.(css)$": "<rootDir>/test/styleMock.cjs",
    "\\.(png|jpg|jpeg|svg)$": "<rootDir>/test/fileMock.cjs",
  },
  testMatch: ["<rootDir>/src/**/__tests__/**/*.test.[jt]s?(x)"],
};
