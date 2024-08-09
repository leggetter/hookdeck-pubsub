import { Hookdeck, HookdeckClient } from "@hookdeck/sdk";
import { ConnectionUpsertRequest } from "@hookdeck/sdk/api";
import { Logger } from "sitka";
// import { CustomFetcher } from "./custom-fetcher";

export type SubscriberAuth = Hookdeck.DestinationAuthMethodConfig;

export interface SubscriptionRequest {
  /**
   * The name of the channe to subscribe to
   */
  channelName: string;

  /**
   * The URL to be invoked when an event is published to the topic.
   */
  url: string;

  /**
   * How requests to the {#url} are authenticated.
   */
  auth?: SubscriberAuth;
}

export type PublishAuth =
  | undefined
  | Hookdeck.VerificationConfig.ApiKey
  | Hookdeck.VerificationConfig.BasicAuth;

export interface HookdeckPubSubOptions {
  /**
   * The Hookdeck API key
   */
  apiKey: string;

  /**
   * The authentication to be used with sources when publishing events.
   */
  publishAuth?: PublishAuth;
}

/**
 * The request object for getting a channel.
 */
export interface GetChannelRequest {
  /**
   * The channel name
   */
  name: string;
}

/**
 * An event to be published on a {Channel}
 */
export interface PublishEvent {
  /**
   * An event type identifier
   */
  type: string;

  /**
   * The event data
   */
  data: unknown;
}

export interface Channel {
  /**
   * The underlying Hookdeck source object.
   */
  source: Hookdeck.Source;

  /**
   * Publish an event to the channel.
   *
   * @param event {PublishEvent} The event to be published.
   */
  publish(event: PublishEvent): Promise<Response>;
}

export interface Subscription {
  /**
   * The name of the channel the subscription is for.
   */
  channelName: string;

  /**
   * The URL to be invoked when an event is published to the topic.
   */
  url: string;

  /**
   * The underlying Hookdeck connection object.
   */
  connection: Hookdeck.Connection;
}

class _Channel implements Channel {
  private _logger: Logger;
  public source: Hookdeck.Source;
  private _publishAuth?: PublishAuth | undefined;

  constructor({
    source,
    publishAuth,
  }: {
    source: Hookdeck.Source;
    publishAuth: PublishAuth;
  }) {
    this._logger = Logger.getLogger({ name: this.constructor.name });

    this.source = source;
    this._publishAuth = publishAuth;
  }

  publish(event: PublishEvent): Promise<Response> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this._publishAuth !== undefined) {
      switch (this._publishAuth.type) {
        case "api_key":
          headers[
            this._publishAuth.configs?.headerKey || "Authorization"
          ] = `${this._publishAuth.configs?.apiKey}`;
          break;
        case "basic_auth":
          headers["Authorization"] = `Basic ${btoa(
            `${this._publishAuth.configs?.username}:${this._publishAuth.configs?.password}`
          )}`;
          break;
      }
    }
    const fetchOptions: RequestInit = {
      method: "POST",
      headers,
      body: JSON.stringify(event.data),
    };
    this._logger.debug("Source request: " + JSON.stringify(fetchOptions));
    this._logger.debug("With event: " + JSON.stringify(event));
    const response = fetch(this.source.url, fetchOptions);

    return response;
  }
}

export class HookdeckPubSub {
  private _logger: Logger;
  private _sdk: HookdeckClient;
  private _publishAuth?: PublishAuth;

  /**
   * Create a new HookdeckPubSub instance.
   *
   * @param {HookdeckPubSubOptions} constructor options.
   */
  constructor({ apiKey, publishAuth }: HookdeckPubSubOptions) {
    this._logger = Logger.getLogger({ name: this.constructor.name });
    this._publishAuth = publishAuth;

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
   * Gets a channel for a given topic.
   *
   * If the underlying Hookdeck Source does not exist, one is created.
   *
   * @param {GetChannelRequest}
   * @returns {Channel} The channel object.
   */
  public async channel({ name }: GetChannelRequest): Promise<Channel> {
    this._logger.debug(
      "Creating or getting channel: " + JSON.stringify({ name })
    );

    if (this._publishAuth === undefined) {
      throw new Error(
        "publishAuth is required when creating or getting a channel"
      );
    }

    let source = null;

    const sources = await this._sdk.source.list({
      name: name,
    });

    if (!sources.count || !sources.models || sources.count === 0) {
      source = await this._sdk.source.create({
        name: name,
        verification: this._publishAuth,
      });
    } else {
      source = sources.models[0];

      this._logger.debug("Found existing source: " + JSON.stringify(source));

      if (!source.verification) {
        // No auth set, so update it
        source = await this._sdk.source.update(source.id, {
          verification: this._publishAuth,
        });
      }

      if (
        !source.verification ||
        (
          source.verification as Hookdeck.VerificationConfig
        ).type.toLowerCase() !== this._publishAuth?.type.toLowerCase()
      ) {
        throw new Error(
          `Channel "${name}" authentication "${
            source.verification
              ? (source.verification as Hookdeck.VerificationConfig).type
              : source.verification
          }" does not match publishAuth "${this._publishAuth.type}"`
        );
      }
    }

    return new _Channel({ source, publishAuth: this._publishAuth });
  }

  /**
   * Creates a subscription to a topic with a URL to be invoked when an event is published to the topic.
   *
   * @param {SubscriptionRequest} params The subscription request.
   * @returns {Subscription} The subscription object.
   */
  public async subscribe({
    channelName,
    url,
    auth,
  }: SubscriptionRequest): Promise<Subscription> {
    this._logger.debug("Subscribing: " + JSON.stringify({ channelName, url }));

    const b64Url = btoa(url);

    const request: ConnectionUpsertRequest = {
      name: `conn_${channelName}_${b64Url}`,
      source: {
        name: `${channelName}`,
      },
      destination: {
        url: url,
        name: `dst_${channelName}_${b64Url}`,
        authMethod: auth || undefined,
      },
    };

    // Workaround as this should be allowed to be undefined
    if (request.destination?.authMethod === undefined) {
      delete request.destination?.authMethod;
    }

    const connection = await this._sdk.connection.upsert(request);

    return {
      channelName: connection.source.name,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      url: connection.destination.url!,
      connection,
    };
  }

  /**
   * Get all the subscriptions.
   *
   * @returns {Subscription[]} The list of subscriptions.
   */
  public async getSubscriptions(): Promise<Subscription[]> {
    const connections = await this._sdk.connection.list();
    const subscriptions: Subscription[] = [];

    if (connections.models) {
      connections.models.forEach((connection) => {
        if (connection.destination.url === undefined) {
          this._logger.debug(
            `Skipping connection "${connection.destination.name}" with undefined destination URL`
          );
        } else {
          subscriptions.push({
            channelName: connection.source.name,
            url: connection.destination.url,
            connection,
          });
        }
      });
    }

    return subscriptions;
  }
}
