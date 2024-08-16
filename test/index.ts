import { expect } from "chai";
import dotenv from "dotenv";
import { HookdeckPubSub, PublishAuth } from "../src/index";
import { HookdeckClient } from "@hookdeck/sdk";
import { fail } from "assert";
import { waitForDeliveryAttempts, waitForEvents } from "./helpers";
dotenv.config();

const API_KEY = process.env.HOOKDECK_TEST_API_KEY;

if (!API_KEY) {
  throw new Error(
    "HOOKDECK_TEST_API_KEY environment variable is required to run tests"
  );
}

const publishAuth: PublishAuth = {
  type: "api_key",
  configs: {
    apiKey: "some-api-kay",
    headerKey: "some-header-key",
  },
};

describe("HookdeckPubSub class", () => {
  const client = new HookdeckClient({ token: API_KEY });

  afterEach(async () => {
    const sources = await client.source.list();
    if (sources.models) {
      sources.models.forEach(async (source) => {
        await client.source.delete(source?.id);
      });
    }

    const destinations = await client.destination.list();
    if (destinations.models) {
      destinations.models.forEach(async (destination) => {
        await client.destination.delete(destination?.id);
      });
    }
  });

  it("should create an instance using its constructor with just apiKey", async () => {
    const pubsub = new HookdeckPubSub({ apiKey: API_KEY });
    expect(pubsub).to.not.equal(undefined);
  });

  it("should create an instance using its constructor with publishAuth", async () => {
    const pubsub = new HookdeckPubSub({
      apiKey: API_KEY,
      publishAuth,
      logLevel: "debug",
    });
    expect(pubsub).to.not.equal(undefined);
  });

  it("should return a Channel object when calling channel()", async () => {
    const pubsub = new HookdeckPubSub({
      apiKey: API_KEY,
      publishAuth,
      logLevel: "debug",
    });
    const channel = await pubsub.channel({
      name: "test-channel-calling-channel",
    });
    expect(channel).to.not.equal(undefined);
  });

  it("should throw an error if a channel doesn't exist and no publishAuth is set", async () => {
    const getChannel = async () => {
      const pubsub = new HookdeckPubSub({ apiKey: API_KEY });
      await pubsub.channel({
        name: "test-channel-1",
      });
    };

    getChannel().catch((e) => {
      expect(e).to.be.an.instanceOf(Error);
    });
  });

  it("should return a Subscription object when calling subscribe()", async () => {
    const pubsub = new HookdeckPubSub({
      apiKey: API_KEY,
      publishAuth,
      logLevel: "debug",
    });
    const subscription = await pubsub.subscribe({
      channelName: "test-channel-calling-subscribe",
      url: "http://localhost:3000",
    });

    expect(subscription).to.not.equal(undefined);
  });

  it("should set a channelName on the Subscription object when calling subscribe()", async () => {
    const pubsub = new HookdeckPubSub({
      apiKey: API_KEY,
      publishAuth,
      logLevel: "debug",
    });
    const CHANNEL_NAME = "test-channel-name-calling-subscribe-assert-name";
    const subscription = await pubsub.subscribe({
      channelName: CHANNEL_NAME,
      url: "http://localhost:3000",
    });

    expect(subscription.channelName).to.equal(CHANNEL_NAME);
  });

  it("should set a url on the Subscription object when calling subscribe()", async () => {
    const pubsub = new HookdeckPubSub({
      apiKey: API_KEY,
      publishAuth,
      logLevel: "debug",
    });
    const CHANNEL_NAME = "test-channel-name-calling-subscribe-assert-url";
    const URL = "http://localhost:3000";
    const subscription = await pubsub.subscribe({
      channelName: CHANNEL_NAME,
      url: URL,
    });

    expect(subscription.url).to.equal(URL);
  });

  it("should set an id on the Subscription object when calling subscribe()", async () => {
    const pubsub = new HookdeckPubSub({
      apiKey: API_KEY,
      publishAuth,
      logLevel: "debug",
    });
    const CHANNEL_NAME = "test-channel-name-calling-subscribe-assert-id";
    const URL = "http://localhost:3000";
    const subscription = await pubsub.subscribe({
      channelName: CHANNEL_NAME,
      url: URL,
    });

    expect(subscription.id).to.not.equal(undefined);
  });

  it("should delete the connection when calling unsubscribe()", async () => {
    const pubsub = new HookdeckPubSub({
      apiKey: API_KEY,
      publishAuth,
      logLevel: "debug",
    });
    const CHANNEL_NAME = "test-channel-name-unsubscribe";
    const URL = "http://localhost:3000";
    const subscription = await pubsub.subscribe({
      channelName: CHANNEL_NAME,
      url: URL,
    });

    await pubsub.unsubscribe({ id: subscription.connection.id });

    try {
      await client.connection.retrieve(subscription.connection.id);
      fail("Expected an error to be thrown");
    } catch (e) {
      expect(e).to.be.an.instanceOf(Error);
    }
  });

  it("should not set an authentication type on the source", async () => {
    const pubsub = new HookdeckPubSub({
      apiKey: API_KEY,
      publishAuth,
      logLevel: "debug",
    });
    const subscription = await pubsub.subscribe({
      channelName: "test-channel-setting-auth-on-source",
      url: "http://localhost:3000",
    });

    expect(subscription.connection.source?.verification).to.equal(undefined);
  });

  it("should get a subscription when calling getSubscriptions()", async () => {
    const pubsub = new HookdeckPubSub({
      apiKey: API_KEY,
      publishAuth,
      logLevel: "debug",
    });
    await pubsub.subscribe({
      channelName: "test-channel-getting-single-subscriptions",
      url: "http://localhost:3000",
    });

    const subscriptions = await pubsub.getSubscriptions();

    expect(subscriptions.length).to.be.equal(1);
  });

  it("should get two subscription when calling getSubscriptions()", async () => {
    const pubsub = new HookdeckPubSub({
      apiKey: API_KEY,
      publishAuth,
      logLevel: "debug",
    });
    await pubsub.subscribe({
      channelName: "test-channel-getting-multiple-subscriptions-1",
      url: "http://localhost:3000",
    });
    await pubsub.subscribe({
      channelName: "test-channel-getting-multiple-subscriptions-2",
      url: "http://localhost:3000",
    });

    const subscriptions = await pubsub.getSubscriptions();

    expect(subscriptions.length).to.be.equal(2);
  });

  it("should support getting a subscription by connection ID when calling getSubscriptions()", async () => {
    const pubsub = new HookdeckPubSub({
      apiKey: API_KEY,
      publishAuth,
      logLevel: "debug",
    });
    const subscription = await pubsub.subscribe({
      channelName: "test-channel-getting-subscription-by-id-1",
      url: "http://localhost:3000",
    });

    await pubsub.subscribe({
      channelName: "test-channel-getting-subscription-by-id-2",
      url: "http://localhost:3000",
    });

    const subscriptions = await pubsub.getSubscriptions({
      subscriptionId: subscription.connection.id,
    });

    expect(subscriptions.length).to.be.equal(1);
  });

  it("should perform partial name match when calling getSubscriptions()", async () => {
    const pubsub = new HookdeckPubSub({
      apiKey: API_KEY,
      publishAuth,
      logLevel: "debug",
    });
    await pubsub.subscribe({
      channelName: "test-channel-getting-subscriptions-partial-match-1",
      url: "http://localhost:3000",
    });
    await pubsub.subscribe({
      channelName: "test-channel-getting-subscriptions-partial-match-2",
      url: "http://localhost:3000",
    });

    const subscriptions = await pubsub.getSubscriptions({
      channelName: "test-channel-getting-subscriptions-partial-match",
    });

    expect(subscriptions.length).to.be.equal(2);
  });

  it("should reuse existing source and authentication type", async () => {
    const CHANNEL_NAME = "test-channel-reusing-source";
    const pubsub = new HookdeckPubSub({
      apiKey: API_KEY,
      publishAuth,
      logLevel: "debug",
    });
    const channel = await pubsub.channel({
      name: CHANNEL_NAME,
    });

    const subscription = await pubsub.subscribe({
      channelName: channel.source.name,
      url: "http://localhost:3000",
    });

    expect(
      (
        subscription.connection.source?.verification as PublishAuth
      )?.type.toLowerCase(),
      "subscription.connection.source.verification should match publishAuth"
    ).to.be.equal(publishAuth.type.toLowerCase());
  });

  it("should throw an error if the source auth of the channel does not match the publish auth", async () => {
    const CHANNEL_NAME = "test-channel-auth-mismatch";
    const pubsub = new HookdeckPubSub({
      apiKey: API_KEY,
      publishAuth,
      logLevel: "debug",
    });

    // this will create the Source with no auth
    await pubsub.subscribe({
      channelName: CHANNEL_NAME,
      url: "http://localhost:3000",
    });

    const getChannel = async () => {
      await pubsub.channel({
        name: CHANNEL_NAME,
      });
    };

    getChannel()
      .catch((e) => {
        expect(e)
          .to.be.an.instanceOf(Error)
          .with.property("message")
          .contains("does not match publishAuth");
      })
      .then(() => {
        expect.fail("Expected an error to be thrown");
      });
  });

  it("should update the source auth if the subscription occurs before the channel registration", async () => {
    const CHANNEL_NAME = "test-channel-subscribing-before-channel";
    const pubsub = new HookdeckPubSub({
      apiKey: API_KEY,
      publishAuth,
      logLevel: "debug",
    });

    await pubsub.subscribe({
      channelName: CHANNEL_NAME,
      url: "http://localhost:3000",
    });

    const channel = await pubsub.channel({
      name: CHANNEL_NAME,
    });

    expect(
      (channel.source?.verification as PublishAuth)?.type.toLowerCase(),
      "channel.source?.verification should match publishAuth"
    ).to.be.equal(publishAuth.type.toLowerCase());
  });

  it("should default to using HOOKDECK_SIGNATURE as the destination auth", async () => {
    const pubsub = new HookdeckPubSub({ apiKey: API_KEY });
    const subscription = await pubsub.subscribe({
      channelName: "test-channel-default-hookdeck-auth",
      url: "http://localhost:3000",
    });

    expect(
      subscription.connection.destination.authMethod?.type,
      "subscription.connection.destination.authMethod"
    ).to.equal("HOOKDECK_SIGNATURE");
  });

  it("should support setting an authentication type on the destination", async () => {
    const pubsub = new HookdeckPubSub({ apiKey: API_KEY });
    const subscription = await pubsub.subscribe({
      channelName: "test-channel-setting-auth-on-destination",
      url: "http://localhost:3000",
      auth: {
        type: "BASIC_AUTH",
        config: {
          username: "username",
          password: "password",
        },
      },
    });

    expect(
      subscription.connection.destination.authMethod?.type,
      "subscription.connection.destination.authMethod"
    ).to.equal("BASIC_AUTH");
  });

  it("should support publishing an event on a channel", async () => {
    const pubsub = new HookdeckPubSub({
      apiKey: API_KEY,
      publishAuth,
      logLevel: "debug",
    });
    const channel = await pubsub.channel({
      name: "test-channel-publish-channel",
    });

    const response = await channel.publish({
      type: "test",
      data: { some: "event.data" },
    });

    expect(response.ok).to.be.equal(true);
  });

  it("should support publishing an event on a channel with headers", async () => {
    const pubsub = new HookdeckPubSub({
      apiKey: API_KEY,
      publishAuth,
      logLevel: "debug",
    });
    const channel = await pubsub.channel({
      name: "test-channel-publish-channel-with-headers",
    });

    const response = await channel.publish({
      type: "test",
      headers: { "X-Test-Header": "test" },
      data: { some: "event.data" },
    });

    expect(response.ok).to.be.equal(true);
  });

  it("should support publishing typed events", async () => {
    const pubsub = new HookdeckPubSub({
      apiKey: API_KEY,
      publishAuth,
      logLevel: "debug",
    });

    const CHANNEL_NAME = "test-channel-publish-typed-events";

    const subscription = await pubsub.subscribe({
      channelName: CHANNEL_NAME,
      url: "https://mock.hookdeck.com/test",
    });

    const channel = await pubsub.channel({
      name: CHANNEL_NAME,
    });

    const publishEvent = {
      type: "typed-event",
      data: { some: "event.data" },
    };

    await channel.publish(publishEvent);

    const events = await waitForEvents({
      pubsub,
      subscriptionId: subscription.id,
      includeBody: true,
    });

    expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (events[0].data as any).body.type as string
    ).to.be.equal(publishEvent.type);

    expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (events[0].data as any).body.data.some as string
    ).to.be.equal(publishEvent.data.some);
  });

  it("should support publishing untyped events", async () => {
    const pubsub = new HookdeckPubSub({
      apiKey: API_KEY,
      publishAuth,
      logLevel: "debug",
    });

    const CHANNEL_NAME = "test-channel-publish-untyped-events";

    const subscription = await pubsub.subscribe({
      channelName: CHANNEL_NAME,
      url: "https://mock.hookdeck.com/test",
    });

    const channel = await pubsub.channel({
      name: CHANNEL_NAME,
    });

    const publishEvent = {
      body: { some: "event.data" },
    };

    await channel.publish(publishEvent);

    const events = await waitForEvents({
      pubsub,
      subscriptionId: subscription.id,
      includeBody: true,
    });

    expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (events[0].data as any).body.some as string
    ).to.be.equal(publishEvent.body.some);
  });

  it("should support retrieving events", async () => {
    const pubsub = new HookdeckPubSub({
      apiKey: API_KEY,
      publishAuth,
      logLevel: "debug",
    });

    const CHANNEL_NAME = "test-channel-get-events";

    const subscription = await pubsub.subscribe({
      channelName: CHANNEL_NAME,
      url: "https://mock.hookdeck.com/test",
    });

    const channel = await pubsub.channel({
      name: CHANNEL_NAME,
    });

    await channel.publish({
      type: "test",
      data: { some: "event.data" },
    });

    const events = await waitForEvents({
      pubsub,
      subscriptionId: subscription.id,
    });

    expect(events.length).to.be.equal(1);
  });

  it("should support retrieving delivery attempts", async () => {
    const pubsub = new HookdeckPubSub({
      apiKey: API_KEY,
      publishAuth,
      logLevel: "debug",
    });

    const CHANNEL_NAME = "test-channel-get-delivery-attempts";

    const subscription = await pubsub.subscribe({
      channelName: CHANNEL_NAME,
      url: "https://mock.hookdeck.com/test",
    });

    const channel = await pubsub.channel({
      name: CHANNEL_NAME,
    });

    await channel.publish({
      type: "test",
      data: { some: "event.data" },
    });

    const events = await waitForEvents({
      pubsub,
      subscriptionId: subscription.id,
    });

    const attempts = await waitForDeliveryAttempts({
      pubsub,
      eventId: events[0].id,
    });

    expect(attempts.length).to.be.equal(1);
  });

  it("should support retrieving events with body info", async () => {
    const pubsub = new HookdeckPubSub({
      apiKey: API_KEY,
      publishAuth,
      logLevel: "debug",
    });

    const CHANNEL_NAME = "test-channel-get-events-with-body";

    const subscription = await pubsub.subscribe({
      channelName: CHANNEL_NAME,
      url: "https://mock.hookdeck.com/test",
    });

    const channel = await pubsub.channel({
      name: CHANNEL_NAME,
    });

    const publishEvent = {
      type: "with-body-test",
      data: { some: "event.data" },
    };

    await channel.publish(publishEvent);

    const events = await waitForEvents({
      pubsub,
      subscriptionId: subscription.id,
      includeBody: true,
    });

    expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (events[0].data as any).body.type as string
    ).to.be.equal(publishEvent.type);
  });

  it("should support retrieving delivery attempts with body info", async () => {
    const pubsub = new HookdeckPubSub({
      apiKey: API_KEY,
      publishAuth,
      logLevel: "debug",
    });

    const CHANNEL_NAME = "test-channel-get-delivery-attempts-with-body";

    const subscription = await pubsub.subscribe({
      channelName: CHANNEL_NAME,
      url: "https://mock.hookdeck.com/test",
    });

    const channel = await pubsub.channel({
      name: CHANNEL_NAME,
    });

    await channel.publish({
      type: "delivery-with-body-test",
      data: { some: "event.data" },
    });

    const events = await waitForEvents({
      pubsub,
      subscriptionId: subscription.id,
    });

    const attempts = await waitForDeliveryAttempts({
      pubsub,
      eventId: events[0].id,
      includeBody: true,
    });

    expect(attempts[0].body).to.not.be.equal(undefined);
  });
});
