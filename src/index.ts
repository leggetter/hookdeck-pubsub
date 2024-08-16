import { Hookdeck, HookdeckClient } from "@hookdeck/sdk";
import { ConnectionUpsertRequest } from "@hookdeck/sdk/api";
import pino from "pino";
// import { CustomFetcher } from "./custom-fetcher";

export type SubscriberAuth = Hookdeck.DestinationAuthMethodConfig;
export type Event = Hookdeck.Event;

export interface SubscribeRequest {
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

export interface UnsubscribeRequest {
  /**
   * The subscription ID to unsubscribe from.
   */
  id: string;
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

  /**
   *
   */
  logLevel?: pino.Level;
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
 * The request object for getting a subscriptions.
 */
export interface GetSubscriptionsRequest {
  /**
   * The channel name to retrieve the subscriptions for.
   * Note: this is currently a fuzzy match.
   */
  channelName?: string;

  /**
   * The Subscription ID, mapping to the ID of the underlying Hookdeck Connection.
   */
  subscriptionId?: string;
}

/**
 * The request object for getting events.
 */
export interface GetEventsRequest {
  /**
   * The ID of the subscription mapping to the underlying Hookdeck Connection.
   */
  subscriptionId: string;

  /**
   * A flag indicating whether to include the body of the event within the response.
   * Defaults to false.
   */
  includeBody?: boolean;
}

/**
 * The request object for getting attempts.
 */
export interface GetDeliveryAttemptRequest {
  /**
   * The ID of the event that the delivery attempts are for.
   */
  eventId: string;

  /**
   * A flag indicating whether to include the body of the delivery attempt within the response.
   * Defaults to false.
   */
  includeBody?: boolean;
}

/**
 * A typed event with a {#type} property, {#headers}, and a {#data} event payload to be published on a {Channel}
 */
export interface PublishTypedEvent {
  /**
   * An event type identifier
   */
  type: string;

  /**
   * Optional headers to publish with the event.
   */
  headers?: Record<string, string>;

  /**
   * The event data
   */
  data: unknown;
}

/**
 * A generic event with headers and a body payload to be published on a {Channel}
 */
export interface PublishEvent {
  /**
   * Optional headers to publish with the event.
   */
  headers?: Record<string, string>;

  /**
   * The event data
   */
  body: unknown;
}

export interface Channel {
  /**
   * The underlying Hookdeck source object.
   */
  source: Hookdeck.Source;

  /**
   * Publish an event to the channel.
   *
   * @param {PublishEvent | PublishTypedEvent} event The event to be published.
   */
  publish(event: PublishEvent | PublishTypedEvent): Promise<Response>;
}

export interface Subscription {
  /**
   * A unique ID for the Subscription
   */
  id: string;

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
  private _logger: pino.Logger;
  public source: Hookdeck.Source;
  private _publishAuth?: PublishAuth | undefined;

  constructor({
    source,
    publishAuth,
    logger,
  }: {
    source: Hookdeck.Source;
    publishAuth: PublishAuth;
    logger: pino.Logger;
  }) {
    this._logger = logger;

    this.source = source;
    this._publishAuth = publishAuth;
  }

  /**
   * @see Channel.publish
   */
  async publish(event: PublishEvent | PublishTypedEvent): Promise<Response> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...event.headers,
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

    let eventPayload = null;
    if ("type" in event && "data" in event) {
      // PublishTypedEvent
      eventPayload = {
        type: event.type,
        data: event.data,
      };
    } else {
      // PublishEvent
      eventPayload = event.body;
    }

    const fetchOptions: RequestInit = {
      method: "POST",
      headers,
      body: JSON.stringify(eventPayload),
    };
    this._logger.debug("Source request: " + JSON.stringify(fetchOptions));
    this._logger.debug("With event: " + JSON.stringify(eventPayload));
    const response = await fetch(this.source.url, fetchOptions);

    return response;
  }
}

export class HookdeckPubSub {
  private _logger: pino.Logger;
  private _sdk: HookdeckClient;
  private _publishAuth?: PublishAuth;

  /**
   * Create a new HookdeckPubSub instance.
   *
   * @param {HookdeckPubSubOptions} constructor options.
   */
  constructor({
    apiKey,
    publishAuth,
    logLevel = "info",
  }: HookdeckPubSubOptions) {
    this._logger = pino({
      name: this.constructor.name,
      level: logLevel,
    });
    this._publishAuth = publishAuth;

    this._sdk = new HookdeckClient({
      token: apiKey,
    });

    // TODO: set a user agent header to track usage
    // this._sdk = new HookdeckClient({
    //   token: apiKey,
    //   fetcher: CustomFetcher,
    // });
  }

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

    return new _Channel({
      source,
      publishAuth: this._publishAuth,
      logger: this._logger,
    });
  }

  /**
   * Creates a subscription to a channel with a URL to be invoked when an event is published to the channel.
   *
   * @param {SubscribeRequest} params The subscription request.
   * @returns {Subscription} The subscription object.
   */
  public async subscribe({
    channelName,
    url,
    auth,
  }: SubscribeRequest): Promise<Subscription> {
    this._logger.debug("Subscribing: " + JSON.stringify({ channelName, url }));

    const b64Url = btoa(url).replace(/=/g, "_");

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
      id: connection.id,
      channelName: connection.source.name,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      url: connection.destination.url!,
      connection,
    };
  }

  /**
   * Removes a subscription to a channel.
   *
   * @param {SubscribeRequest} params The subscription request.
   * @returns {Subscription} The subscription object.
   */
  public async unsubscribe({ id }: UnsubscribeRequest): Promise<void> {
    this._logger.debug("Unsubscribing: " + JSON.stringify({ id }));

    await this._sdk.connection.delete(id);
  }

  /**
   * Get all the subscriptions.
   *
   * @returns {Subscription[]} The list of subscriptions.
   */
  public async getSubscriptions(
    params?: GetSubscriptionsRequest
  ): Promise<Subscription[]> {
    const connections = await this._sdk.connection.list({
      id: params?.subscriptionId,
      fullName: params?.channelName,
    });
    const subscriptions: Subscription[] = [];

    if (connections.models) {
      connections.models.forEach((connection) => {
        if (connection.destination.url === undefined) {
          this._logger.debug(
            `Skipping connection "${connection.destination.name}" with undefined destination URL`
          );
        } else {
          subscriptions.push({
            id: connection.id,
            channelName: connection.source.name,
            url: connection.destination.url,
            connection,
          });
        }
      });
    }

    return subscriptions;
  }

  /**
   * Get all the events associated with a Subscription.
   *
   * @param {GetEventsRequest} params
   *
   * @returns
   */
  public async getEvents({
    subscriptionId,
    includeBody = false,
  }: GetEventsRequest): Promise<Hookdeck.Event[]> {
    let events: Hookdeck.Event[] = [];
    const _events = await this._sdk.event.list({
      webhookId: subscriptionId,
    });
    if (_events && _events.models) {
      events = _events.models;
      if (includeBody) {
        for (let i = 0; i < events.length; ++i) {
          if (events[i] && includeBody) {
            // Get details with the body
            events[i] = await this._sdk.event.retrieve(events[i].id);
          }
        }
      }
    }

    return events;
  }

  /**
   * Get the delivery attempts for an events.
   *
   * @param {GetDeliveryAttemptRequest} params
   *
   * @returns
   */
  public async getDeliveryAttempts({
    eventId,
    includeBody = false,
  }: GetDeliveryAttemptRequest): Promise<Hookdeck.EventAttempt[]> {
    const attempts: Hookdeck.EventAttempt[] = [];
    const attemptsResult = await this._sdk.attempt.list({ eventId });
    if (
      attemptsResult.models !== undefined &&
      attemptsResult.count !== undefined
    ) {
      for (let i = 0; i < attemptsResult.count; ++i) {
        let attempt = attemptsResult.models[i];
        if (attempt && includeBody) {
          // Get details with the body
          attempt = await this._sdk.attempt.retrieve(attempt.id);
        }
        if (attempt) {
          attempts.push(attempt);
        }
      }
    }

    return attempts;
  }
}
