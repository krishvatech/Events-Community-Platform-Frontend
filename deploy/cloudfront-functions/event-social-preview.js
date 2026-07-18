/**
 * CloudFront viewer-request function for event social previews.
 *
 * Normal visitors continue to receive the existing React application.
 * Only known social-link crawlers are redirected to Django's server-rendered
 * metadata endpoint, which returns the event-specific Open Graph image/title.
 *
 * Associate this function with the frontend distribution's Viewer request
 * event. If a Viewer request function is already associated, merge this logic
 * into that existing function because CloudFront permits only one association
 * per event type and cache behavior.
 */
function handler(event) {
  var request = event.request;
  var uri = request.uri || "";
  var userAgentHeader = request.headers && request.headers["user-agent"];
  var userAgent = userAgentHeader ? userAgentHeader.value : "";

  var isSocialCrawler = /(facebookexternalhit|facebot|whatsapp|linkedinbot|twitterbot|slackbot|discordbot|telegrambot|skypeuripreview|pinterestbot|viber)/i.test(userAgent);
  var isShareableEventRoute = /^\/(events|public|landing)\/[^/]+\/?$/.test(uri);

  if (!isSocialCrawler || !isShareableEventRoute) {
    return request;
  }

  var metadataPath = uri.charAt(uri.length - 1) === "/" ? uri : uri + "/";

  return {
    statusCode: 302,
    statusDescription: "Found",
    headers: {
      location: {
        value: "https://api.colligatus.com" + metadataPath
      },
      "cache-control": {
        value: "no-store"
      }
    }
  };
}
