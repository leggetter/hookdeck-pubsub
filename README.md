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

- [Usage][#usage]
- [Todos][#todos]
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

  // optional. If supplied, used to create a filter on the connection
  eventType: "order.updated",

  // Where events published on the channel are sent
  url,

  // Optional. Used to authenticate the request to the subscribing url.
  auth,
});

// Creates a Source on the fly if one does not already exist with given name
const channel = pubsub.channe({
  name: "orders",
});

// Performs a POST request to the underlying Source URL
await channel.publish({
  channel: "orders",

  event: {
    type: "order.updated",
    data: {
      status: "PAYMENT_RECEIVED",
    },
  },
});
```

## Todos

- [ ] Set up CI/CD
- [ ] Publish first version to NPM
- [ ] Add support for filters on subscriptions

## Contributing

This section is here as a reminder for you to explain to your users how to contribute to the projects you create from this template.

## Credits

- [Chris Wells Node TypeScript Template](https://github.com/leggetter/hookdeck-pubsub)

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
[package-image]: https://img.shields.io/npm/v/typescript-template
[package-url]: https://www.npmjs.com/package/typescript-template
[project-url]: https://github.com/leggetter/hookdeck-pubsub
