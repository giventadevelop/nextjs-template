"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
self["webpackHotUpdate_N_E"]("middleware",{

/***/ "(middleware)/./src/middleware.ts":
/*!***************************!*\
  !*** ./src/middleware.ts ***!
  \***************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   config: () => (/* binding */ config),\n/* harmony export */   \"default\": () => (__WEBPACK_DEFAULT_EXPORT__)\n/* harmony export */ });\n/* harmony import */ var _clerk_nextjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @clerk/nextjs */ \"(middleware)/./node_modules/@clerk/nextjs/dist/esm/index.js\");\n\n// Define protected routes that require authentication\nconst protectedPaths = [\n    '/dashboard(.*)'\n];\n// Define public routes that don't require authentication\nconst publicPaths = [\n    '/',\n    '/sign-in(.*)',\n    '/sign-up(.*)',\n    '/profile(.*)',\n    '/api/webhooks(.*)'\n];\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ((0,_clerk_nextjs__WEBPACK_IMPORTED_MODULE_0__.authMiddleware)({\n    publicRoutes: publicPaths,\n    ignoredRoutes: [\n        '/api/webhooks/stripe',\n        '/api/webhooks/clerk'\n    ]\n}));\nconst config = {\n    matcher: [\n        // Skip Next.js internals and all static files\n        '/((?!_next|[^?]*\\\\.[\\\\w]+$|_next).*)',\n        // Optional: Protect API routes\n        '/(api|trpc)(.*)'\n    ]\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKG1pZGRsZXdhcmUpLy4vc3JjL21pZGRsZXdhcmUudHMiLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQStDO0FBRy9DLHNEQUFzRDtBQUN0RCxNQUFNQyxpQkFBaUI7SUFBQztDQUFpQjtBQUV6Qyx5REFBeUQ7QUFDekQsTUFBTUMsY0FBYztJQUNsQjtJQUNBO0lBQ0E7SUFDQTtJQUNBO0NBQ0Q7QUFFRCxpRUFBZUYsNkRBQWNBLENBQUM7SUFDNUJHLGNBQWNEO0lBQ2RFLGVBQWU7UUFDYjtRQUNBO0tBQ0Q7QUFDSCxFQUFFLEVBQUM7QUFFSSxNQUFNQyxTQUFTO0lBQ3BCQyxTQUFTO1FBQ1AsOENBQThDO1FBQzlDO1FBQ0EsK0JBQStCO1FBQy9CO0tBQ0Q7QUFDSCxFQUFFIiwic291cmNlcyI6WyJDOlxcVXNlcnNcXGdhaW5cXGdpdFxcbmV4dGpzLXRlbXBsYXRlXFxzcmNcXG1pZGRsZXdhcmUudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgYXV0aE1pZGRsZXdhcmUgfSBmcm9tIFwiQGNsZXJrL25leHRqc1wiO1xuaW1wb3J0IHsgTmV4dFJlcXVlc3QgfSBmcm9tIFwibmV4dC9zZXJ2ZXJcIjtcblxuLy8gRGVmaW5lIHByb3RlY3RlZCByb3V0ZXMgdGhhdCByZXF1aXJlIGF1dGhlbnRpY2F0aW9uXG5jb25zdCBwcm90ZWN0ZWRQYXRocyA9IFsnL2Rhc2hib2FyZCguKiknXTtcblxuLy8gRGVmaW5lIHB1YmxpYyByb3V0ZXMgdGhhdCBkb24ndCByZXF1aXJlIGF1dGhlbnRpY2F0aW9uXG5jb25zdCBwdWJsaWNQYXRocyA9IFtcbiAgJy8nLFxuICAnL3NpZ24taW4oLiopJyxcbiAgJy9zaWduLXVwKC4qKScsXG4gICcvcHJvZmlsZSguKiknLFxuICAnL2FwaS93ZWJob29rcyguKiknLCAvLyBLZWVwIHdlYmhvb2tzIHB1YmxpY1xuXTtcblxuZXhwb3J0IGRlZmF1bHQgYXV0aE1pZGRsZXdhcmUoe1xuICBwdWJsaWNSb3V0ZXM6IHB1YmxpY1BhdGhzLFxuICBpZ25vcmVkUm91dGVzOiBbXG4gICAgJy9hcGkvd2ViaG9va3Mvc3RyaXBlJyxcbiAgICAnL2FwaS93ZWJob29rcy9jbGVyaycsXG4gIF1cbn0pO1xuXG5leHBvcnQgY29uc3QgY29uZmlnID0ge1xuICBtYXRjaGVyOiBbXG4gICAgLy8gU2tpcCBOZXh0LmpzIGludGVybmFscyBhbmQgYWxsIHN0YXRpYyBmaWxlc1xuICAgICcvKCg/IV9uZXh0fFteP10qXFxcXC5bXFxcXHddKyR8X25leHQpLiopJyxcbiAgICAvLyBPcHRpb25hbDogUHJvdGVjdCBBUEkgcm91dGVzXG4gICAgJy8oYXBpfHRycGMpKC4qKScsXG4gIF0sXG59OyJdLCJuYW1lcyI6WyJhdXRoTWlkZGxld2FyZSIsInByb3RlY3RlZFBhdGhzIiwicHVibGljUGF0aHMiLCJwdWJsaWNSb3V0ZXMiLCJpZ25vcmVkUm91dGVzIiwiY29uZmlnIiwibWF0Y2hlciJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(middleware)/./src/middleware.ts\n");

/***/ })

});