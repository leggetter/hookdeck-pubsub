import { Hookdeck, HookdeckClient } from "@hookdeck/sdk";
import { ConnectionUpsertRequest } from "@hookdeck/sdk/api";
import { Logger } from "sitka";
// import { CustomFetcher } from "./custom-fetcher";

export interface SubscriptionRequest {
  /**
   * A descriptive topic name
   */
  topic: string;

  /**
   * The URL to be invoked when an event is published to the topic.
   */
  destinationUrl: string;

  /**
   * How requests to the {#destinationUrl} are authenticated.
   */
  destinationAuth?: Hookdeck.DestinationAuthMethodConfig;

  /**
   * How public requests to the publishing URL are authenticated.
   */
  sourceAuth?: Hookdeck.VerificationConfig;
}

export interface HookdeckPubSubOptions {
  /**
   * The Hookdeck API key
   */
  apiKey: string;
}

export interface Subscription {
  /**
   * The URL to be invoked when an event is published to the topic.
   */
  publishUrl: string;

  /**
   * The underlying Hookdeck connection object.
   */
  connection: Hookdeck.Connection;
}

export class HookdeckPubSub {
  /* Private Instance Fields */
  private _logger: Logger;
  private _sdk: HookdeckClient;

  /* Constructor */

  /**
   * Create a new HookdeckPubSub instance.
   *
   * @param {HookdeckPubSubOptions} constructor options.
   */
  constructor({ apiKey }: { apiKey: string }) {
    this._logger = Logger.getLogger({ name: this.constructor.name });

    this._sdk = new HookdeckClient({
      token: apiKey,
    });

    // this._sdk = new HookdeckClient({
    //   token: apiKey,
    //   fetcher: CustomFetcher,
    // });
  }

  /* Public Instance Methods */

  /**
   * Creates a subscription to a topic with a URL to be invoked when an event is published to the topic.
   *
   * @param {SubscriptionRequest} The subscription request.
   * @returns {Subscription} The subscription object.
   */
  public async createSubscription({
    topic,
    destinationUrl: url,
    sourceAuth,
    destinationAuth,
  }: SubscriptionRequest): Promise<Subscription> {
    this._logger.debug("Subscribing: " + JSON.stringify({ topic, url }));

    const b64Url = btoa(url);

    const request: ConnectionUpsertRequest = {
      name: `conn_${topic}_${b64Url}`,
      source: {
        name: `${topic}`,
        verification: sourceAuth,
      },
      destination: {
        url: url,
        name: `dst_${topic}_${b64Url}`,
        authMethod: destinationAuth || undefined,
      },
    };

    // Workaround as this should be allowed to be undefined
    if (request.destination?.authMethod === undefined) {
      delete request.destination?.authMethod;
    }

    const connection = await this._sdk.connection.upsert(request);

    return {
      publishUrl: connection.source.url,
      connection,
    };
  }
}
