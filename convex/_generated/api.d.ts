/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activityLog from "../activityLog.js";
import type * as analytics from "../analytics.js";
import type * as billing from "../billing.js";
import type * as budget from "../budget.js";
import type * as budgetSummary from "../budgetSummary.js";
import type * as budgets from "../budgets.js";
import type * as clients from "../clients.js";
import type * as companies from "../companies.js";
import type * as creativeJobs from "../creativeJobs.js";
import type * as creatives from "../creatives.js";
import type * as dashboard from "../dashboard.js";
import type * as debugColors from "../debugColors.js";
import type * as debugVendor from "../debugVendor.js";
import type * as eventBrief from "../eventBrief.js";
import type * as eventFlow from "../eventFlow.js";
import type * as fixVendors from "../fixVendors.js";
import type * as gifts from "../gifts.js";
import type * as guests from "../guests.js";
import type * as hotelDetails from "../hotelDetails.js";
import type * as hotels from "../hotels.js";
import type * as http from "../http.js";
import type * as messages from "../messages.js";
import type * as migrations from "../migrations.js";
import type * as notifications from "../notifications.js";
import type * as permissions from "../permissions.js";
import type * as qr from "../qr.js";
import type * as timelineConflicts from "../timelineConflicts.js";
import type * as updateEliteColors from "../updateEliteColors.js";
import type * as users from "../users.js";
import type * as vendors from "../vendors.js";
import type * as weddings from "../weddings.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  activityLog: typeof activityLog;
  analytics: typeof analytics;
  billing: typeof billing;
  budget: typeof budget;
  budgetSummary: typeof budgetSummary;
  budgets: typeof budgets;
  clients: typeof clients;
  companies: typeof companies;
  creativeJobs: typeof creativeJobs;
  creatives: typeof creatives;
  dashboard: typeof dashboard;
  debugColors: typeof debugColors;
  debugVendor: typeof debugVendor;
  eventBrief: typeof eventBrief;
  eventFlow: typeof eventFlow;
  fixVendors: typeof fixVendors;
  gifts: typeof gifts;
  guests: typeof guests;
  hotelDetails: typeof hotelDetails;
  hotels: typeof hotels;
  http: typeof http;
  messages: typeof messages;
  migrations: typeof migrations;
  notifications: typeof notifications;
  permissions: typeof permissions;
  qr: typeof qr;
  timelineConflicts: typeof timelineConflicts;
  updateEliteColors: typeof updateEliteColors;
  users: typeof users;
  vendors: typeof vendors;
  weddings: typeof weddings;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {};
