import { EventAttempt } from "@hookdeck/sdk/api";
import { HookdeckPubSub, Event } from "../src/index";

export async function waitForEvents({
  pubsub,
  subscriptionId,
  waitSeconds = 15,
  includeBody = false,
}: {
  pubsub: HookdeckPubSub;
  subscriptionId: string;
  waitSeconds?: number;
  includeBody?: boolean;
}): Promise<Event[]> {
  return await new Promise((resolve, reject) => {
    let iterations = 0;
    const maxIterations = waitSeconds;

    const getEvents = () => {
      if (iterations < maxIterations) {
        ++iterations;
        setTimeout(async () => {
          console.log(`Getting events. Iteration ${iterations}.`);
          const events = await pubsub.getEvents({
            subscriptionId: subscriptionId,
            includeBody,
          });
          console.log(`Got ${events.length} events`);

          if (events.length > 0) {
            resolve(events);
          } else {
            getEvents();
          }
        }, 1000);
      } else {
        reject(
          `Max iterations/timeout of ${waitForEvents} exceeded. No events received.`
        );
      }
    };

    getEvents();
  });
}

export async function waitForDeliveryAttempts({
  pubsub,
  eventId,
  waitSeconds = 15,
  includeBody = false,
}: {
  pubsub: HookdeckPubSub;
  eventId: string;
  waitSeconds?: number;
  includeBody?: boolean;
}): Promise<EventAttempt[]> {
  return await new Promise((resolve, reject) => {
    let iterations = 0;
    const maxIterations = waitSeconds;

    const getAttempts = () => {
      if (iterations < maxIterations) {
        ++iterations;
        setTimeout(async () => {
          console.log(
            `Getting delivery attempts${
              includeBody ? " with body" : ""
            }. Iteration ${iterations}.`
          );
          const attempts = await pubsub.getDeliveryAttempts({
            eventId,
            includeBody,
          });
          console.log(`Got ${attempts.length} attempt`);

          if (attempts.length > 0) {
            resolve(attempts);
          } else {
            getAttempts();
          }
        }, 1000);
      } else {
        reject(
          `Max iterations/timeout of ${waitForEvents} exceeded. No attempts received.`
        );
      }
    };

    getAttempts();
  });
}
