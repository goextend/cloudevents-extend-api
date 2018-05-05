# CloudEvents programming model for Extend by Auth0

This repository provides a [webtask middleware](https://goextend.io/docs/middleware) that supports a simple programming model for [CloudEvents](https://github.com/cloudevents). It can be used by [Extend](https://goextend.io) and [Auth0 Webtask](https://webtask.io) users to quickly and simply implement CloudEvent consumers and optionally secure it with HTTP basic authentication. 

### Gettig started 

The JavaScript programming model for CloudEvents implemented in this module requires the user to implement a class with methods representing the supported CloudEvents events. At runtime, messages will be dispatched to specific methods of the class based on the `eventType` context property of the event. The class can implement any number of methods for different `eventType` values. 

The example below shows how to create a CloudEvent handler on [Auth0 Webtasks](https://webtask.io), but it is just as well applicable to [Extend](https://goextend.io) deployments. 

First, write the webtask script: 

```
cat > cloud-event-handler.js <<EOF
'use strict';
module.exports = class CloudEventHandler {

  'io.goextend.helloWorld'(event) {
    console.log("Hello, world event received!");
  }

  // Add other events here as needed
};
EOF
```

Then, create the webtask using: 

```bash
wt create cloud-events-handler.js \
  --middleware cloudevents-parser \
  --middleware cloudevents-extend-api
```

Notice the two middleware parameters. The first one is adding support for parsing `application/cloudevents+json` requests, which allows accepting CloudEvent messages following the [structed content mode](https://github.com/cloudevents/spec/blob/v0.1/http-transport-binding.md#32-structured-content-mode) of the HTTP binding for CloudEvents. The second middleware adds support for the simple JavaScript programming model above. 

You can then take the resulting URL and use it as a consumer of CloudEvents sent over HTTP using the structured content mode. You can test your consumer by making a simple request using *curl* (substitute your URL in the request below): 

```bash
curl -v -X POST https://tjanczuk.sandbox.auth0-extend.com/cloud-events-handler \
  -H 'Content-Type: application/cloudevents+json' \
  --data-binary '{"eventType":"io.goextend.helloWorld"}'
```

### Authentication

The *cloudevents-extend-api* middleware can optionally enforce HTTP Basic authentication. To set it up, specify the *username:password* pair as the *BASIC_AUTH* secret when creating your webtask: 

```bash
wt create cloud-events-handler.js \
  --middleware cloudevents-parser \
  --middleware cloudevents-extend-api \
  --secret BASIC_AUTH=username:password
```

You must then configure your CloudEvent producer to add HTTP Basic *username:password* credentials when generating the CloudEvents message. How it is done depends on the specifics of the producer. 

The *cloudevents-extend-api* will reject unauthorized requests with HTTP 403.

### Secrets

You can provide your CloudEvent handler code with secrets for communicating with external services (e.g. Slack or Twilio): 

```
```bash
wt create cloud-events-handler.js \
  --middleware cloudevents-parser \
  --middleware cloudevents-extend-api \
  --secret TWILIO_KEY=abc \
  --secret SLACK_URL=https://...
```

These secrets can be accessed within the code in the following way:

```javascript
'use strict';
module.exports = class CloudEventHandler {

  'io.goextend.helloWorld'(event) {
    let twilio_key = this.secrets.TWILIO_KEY;
    let slack_url = this.secrets.SLACK_URL;
    // ...
  }

};
```
