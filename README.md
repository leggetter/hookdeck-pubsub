# Hookdeck Pub/Sub SDK [ALPHA Experiment]

[![Package Version][package-image]][package-url]
[![Dependencies Status][dependencies-image]][dependencies-url]
[![Build Status][build-image]][build-url]
[![Coverage Status][coverage-image]][coverage-url]
[![Open Issues][issues-image]][issues-url]
[![Commitizen Friendly][commitizen-image]][commitizen-url]

## Contents

- [Usage][#usage]
- [Todos][#todos]
- [Contributing](#contributing)

## Usage

```ts
const pubsub = new HookdeckPubSub({ apiKey: API_KEY });

const subscription = await pubsub.createSubscription({
  topic: "test-topic-1",
  sourceAuth: {
    type: "basic_auth",
    configs: {
      username: "source_username",
      password: "source_password",
    },
  },
  destinationUrl: "http://localhost:3000",
  destinationAuth: {
    type: "BASIC_AUTH",
    config: {
      username: "destination_username",
      password: "destination_password",
    },
  },
});

await fetch(subscription.publishUrl, {
  headers: {
    Authorization: `Basic ${base64.encode(`username:password`)}`,
  },
  method: "POST",
  body: JSON.stringify({
    test: "value",
  }),
});
```

## Todos

- [ ] Set up CI/CD
- [ ] Update SDK to work in way described below
- [ ] Publish first version to NPM

### How the SDK should work

Hookdeck allows for Pub/Subtype communication, but the platform primitives differ.

Here's how they map:

- Channel: A Hookdeck Source with a unique name where events are published
- Subscription: A Hookdeck Connection consisting of a Source, Rules<sup>†</sup>, and a Destination.

_<sup>†</sup> The current plan is only to support Filter rules._

How this may work:

```ts
const pubsub = new HookdeckPubSub({
  // Hookdeck project API Key
  apiKey,

  // Used when creating all Sources/channels
  publishAuth,
});

// could create a Source on the fly
const channel = pubsub.channe({
  name: "topic-1",
});

// Dynamically creates the Hookdeck Connection
const subscription = channel.subscribe({
  channel: "topic-1",

  // optional. If supplied, used to create a filter on the connection
  eventType: "some.event.name",

  // Where events published on the channel are sent
  url,

  // Optional. Used to authenticate the request to the url.
  subscriptionAuth,
});

// Performs a POST request to the underlying Source URL
await channel.publish({
  channel: "topic-1",

  event: {
    type: "some.event.type",
    data: {},
  },
});
```

Under the hood, the event is in the following format:

```ts
interface HookdeckPubSubPublishAction {
  channel: string;

  event: HookdeckPubSubEvent;
}

interface HookdeckPubSubEvent {
  type?: string;

  data: never;
}
```

## Contributing

This section is here as a reminder for you to explain to your users how to contribute to the projects you create from this template.

## Credits

- [Chris Wells Node TypeScript Template](https://github.com/leggetter/hookdeck-pubsub)

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
