self.__BUILD_MANIFEST = {
  "polyfillFiles": [
    "static/chunks/polyfills.js"
  ],
  "devFiles": [
    "static/chunks/react-refresh.js"
  ],
  "ampDevFiles": [],
  "lowPriorityFiles": [],
  "rootMainFiles": [],
  "pages": {
    "/": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/index.js"
    ],
    "/_app": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/_app.js"
    ],
    "/_error": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/_error.js"
    ],
    "/auth/microsoft-callback": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/auth/microsoft-callback.js"
    ],
    "/o3-discussions": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/o3-discussions.js"
    ],
    "/test-auth": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/test-auth.js"
    ],
    "/weekly-discussions": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/weekly-discussions.js"
    ]
  },
  "ampFirstPages": []
};
self.__BUILD_MANIFEST.lowPriorityFiles = [
"/static/" + process.env.__NEXT_BUILD_ID + "/_buildManifest.js",
,"/static/" + process.env.__NEXT_BUILD_ID + "/_ssgManifest.js",

];