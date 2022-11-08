
const rules = {
  "@typescript-eslint/no-misused-promises": [
    "error",
    {
      "checksVoidReturn": false
    }
  ],
  "sort-keys": "off",
}

module.exports = {
  globals: {
    NodeJS: true
  },
  extends: '@chatie',
  rules,
}
