/* eslint-disable @typescript-eslint/no-explicit-any */
import pkg from "../package.json";
import { APIResponse, Fetcher } from "@hookdeck/sdk/core/fetcher";
import {
  FailedResponse,
  SuccessfulResponse,
} from "@hookdeck/sdk/core/fetcher/APIResponse";

export const CustomFetcher = async (
  args: any
): Promise<APIResponse<any, Fetcher.Error>> => {
  const headers = {
    ...args.headers,
    "User-Agent": `${pkg.name}/${pkg.version}/${process.version}`,
  };
  const body = args.body || {};

  const response = await fetch(args.url, {
    method: args.method,
    headers,
    body: JSON.stringify(body),
  });

  try {
    if (response.ok === false) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }

    const apiResponse: Promise<SuccessfulResponse<any>> = Promise.resolve({
      ok: true,
      headers: response.headers,
      body: (await response.json()) as any,
    });

    return apiResponse;
  } catch (error) {
    const apiResponse: Promise<FailedResponse<any>> = Promise.resolve({
      ok: false,
      headers: response.headers,
      error,
    });

    return apiResponse;
  }
};
