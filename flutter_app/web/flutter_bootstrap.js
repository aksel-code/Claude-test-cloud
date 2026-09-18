{{flutter_js}}
{{flutter_build_config}}

// Custom bootstrap template (flutter build web processes this file, filling
// in the two placeholders above) so we can pass `canvasKitBaseUrl`. Without
// it, the default generated bootstrap fetches CanvasKit from Google's CDN
// (gstatic.com) at runtime — this app's web counterpart makes a point of
// zero third-party network requests, and CanvasKit is already bundled
// locally under /canvaskit/ for exactly this purpose.
_flutter.loader.load({
  config: {
    canvasKitBaseUrl: "canvaskit/"
  }
});
