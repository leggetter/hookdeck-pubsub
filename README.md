# Hookdeck Pub/Sub SDK [ALPHA Experiment]

[![Package Version][package-image]][package-url]
[![Dependencies Status][dependencies-image]][dependencies-url]
[![Build Status][build-image]][build-url]
[![Coverage Status][coverage-image]][coverage-url]
[![Open Issues][issues-image]][issues-url]
[![Commitizen Friendly][commitizen-image]][commitizen-url]

[Hookdeck](https://hookdeck.com?ref=github-hookdeck-pubsub) allows for Pub/Sub-type communication, but the platform primitives differ. This library enables the use of Pub/Sub primitives and mapping them to Hookdeck ones.

Here's a mapping of Pub/Sub conventions to Hookdeck ones:

- **Channel**: A Hookdeck [Source](https://hookdeck.com/docs/sources?ref=github-hookdeck-pubsub) with a unique name where events are published
- **Subscription**: A Hookdeck [Connection][connection-docs] consisting of a Source, [Rules](rules-docs)<sup>†</sup>, and a [Destination](destination-docs). The Destination is where events are delivered to and is the subscriber.

_<sup>†</sup> The current plan is only to support Filter rules._

## Contents

- [Usage](#usage)
- [Todos](#todos)
- [Contributing](#contributing)

## Usage

```ts
const pubsub = new HookdeckPubSub({
  // Hookdeck project API Key
  apiKey,

  // Used when creating all Sources/channels
  publishAuth,
});

// Dynamically creates the Hookdeck Connection
const subscription = channel.subscribe({
  channel: "orders",

  // Where events published on the channel are sent
  url,

  // Optional. Used to authenticate the request to the subscribing url.
  auth,
});

// Creates a Source on the fly if one does not already exist with given name
const channel = pubsub.channel({
  name: "orders",
});

// Performs a POST request to the underlying Source URL
await channel.publish({
  type: "order.updated",
  headers: {}
  data: {
    status: "PAYMENT_RECEIVED",
  },
});

// Get all subscriptions to the "orders" channel
// Note: This current performs a fuzzy match
const subscriptions = await pubsub.getSubscriptions({
  name: "orders",
});

// Get all events sent to the subscription
const events = await pubsub.getEvents({ subscriptionId, includeBody: true });

// Get all delivery attempts for an event
const attempts = await pubsub.getDeliveryAttempts({
  eventId,
  includeBody: true,
});
```

## Todos

- [ ] Set up CI/CD
- [ ] Add support for filters on subscriptions

## Contributing

Ask questions and raise issues in the [issues](/issues) section.

## Credits

- [Chris Wells Node TypeScript Template](https://github.com/chriswells0/node-typescript-template)

[connection-docs]: https://hookdeck.com/docs/connections?ref=github-hookdeck-pubsub
[rules-docs]: https://hookdeck.com/docs/connections#connection-rules?ref=github-hookdeck-pubsub
[destination-docs]: https://hookdeck.com/docs/destinations?ref=github-hookdeck-pubsub
[build-image]: https://img.shields.io/github/actions/workflow/status/leggetter/hookdeck-pubsub/ci-build.yaml?branch=master
[build-url]: https://github.com/leggetter/hookdeck-pubsub/actions/workflows/ci-build.yaml
[commitizen-image]: https://img.shields.io/badge/commitizen-friendly-brightgreen.svg
[commitizen-url]: http://commitizen.github.io/cz-cli
[coverage-image]: https://coveralls.io/repos/github/leggetter/hookdeck-pubsub/badge.svg?branch=master
[coverage-url]: https://coveralls.io/github/leggetter/hookdeck-pubsub?branch=master
[dependencies-image]: https://img.shields.io/librariesio/release/npm/typescript-template
[dependencies-url]: https://www.npmjs.com/package/typescript-template?activeTab=dependencies
[issues-image]: https://img.shields.io/github/issues/leggetter/hookdeck-pubsub.svg?style=popout
[issues-url]: https://github.com/leggetter/hookdeck-pubsub/issues
[package-image]: https://img.shields.io/npm/v/@hookdeck/pubsub
[package-url]: https://www.npmjs.com/package/@hookdeck/pubsub
[project-url]: https://github.com/leggetter/hookdeck-pubsub
