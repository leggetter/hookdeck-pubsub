import { expect } from "chai";
import { HookdeckPubSub, Subscription } from "../src/index";
import { HookdeckClient } from "@hookdeck/sdk";
import dotenv from "dotenv";
dotenv.config();

const API_KEY = process.env.HOOKDECK_TEST_API_KEY;

if (!API_KEY) {
  throw new Error(
    "HOOKDECK_TEST_API_KEY environment variable is required to run tests"
  );
}

describe("HookdeckPubSub class", () => {
  const client = new HookdeckClient({ token: API_KEY });
  let subscription: Subscription | null = null;

  afterEach(async () => {
    if (subscription) {
      await client.source.delete(subscription.connection.source?.id);
      await client.destination.delete(subscription.connection.destination?.id);
    }
  });

  it("should create an instance using its constructor", async () => {
    const pubsub = new HookdeckPubSub({ apiKey: API_KEY });
    expect(pubsub, "example should exist").to.exist;
  });

  it("should return a Subscription object when calling subscribe()", async () => {
    const pubsub = new HookdeckPubSub({ apiKey: API_KEY });
    const subscription = await pubsub.createSubscription({
      topic: "test-topic-1",
      destinationUrl: "http://localhost:3000",
    });

    expect(subscription, "subscription should exist").to.exist;
  });

  it("should support setting an authentication type on the source", async () => {
    const pubsub = new HookdeckPubSub({ apiKey: API_KEY });
    subscription = await pubsub.createSubscription({
      topic: "test-topic-1",
      destinationUrl: "http://localhost:3000",
      sourceAuth: {
        type: "basic_auth",
        configs: {
          username: "source_username",
          password: "source_password",
        },
      },
    });

    console.log(subscription.connection.source?.verification);

    expect(
      subscription.connection.source?.verification,
      "subscription.connection.source.verification should exist"
    ).to.exist;
  });

  it("should default to using HOOKDECK_SIGNATURE as the destination auth", async () => {
    const pubsub = new HookdeckPubSub({ apiKey: API_KEY });
    subscription = await pubsub.createSubscription({
      topic: "test-topic-1",
      destinationUrl: "http://localhost:3000",
    });

    expect(
      subscription.connection.destination.authMethod?.type,
      "subscription.connection.destination.authMethod"
    ).to.equal("HOOKDECK_SIGNATURE");
  });

  it("should support setting an authentication type on the destination", async () => {
    const pubsub = new HookdeckPubSub({ apiKey: API_KEY });
    subscription = await pubsub.createSubscription({
      topic: "test-topic-1",
      destinationUrl: "http://localhost:3000",
      destinationAuth: {
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
});
