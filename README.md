
This app is created with association to [vin-ren/probably-printing-worker](https://github.com/vin-ren/probably-printing-worker).

### Adding Plugins
Create a new directory inside `app/api` to put your plugin into. The convention is `submit-via-<your-source>` (replace your source with what you are building for). Then create a new `route.ts` file inside that directory.


You can also just copy paste from `app/api/submit/route.ts` or `app/api/submit-via-judgels/route.ts` as a starting point (Both of these can be used as a reference on how to build a new plugin easily, as the boring work has been done for you). 


In a nutshell, right now you need to do 3 things: 
- Create a OPTION handler and export it from your `route.ts`
- Create a POST handler and export it from your `route.ts`
- Create a new entry in `lib/consts.ts` within the `SUBMIT_SOURCES` const.


> [!TIP]
> Example implementations can be seen within [api/submit](./app/api/submit/route.ts) and [api/submit-via-judgels](./app/api/submit-via-judgels/route.ts) routes.



1. Creating a OPTION handler is simple enough, 
    ```typescript
    import {createSubmitOPTIONSHandler} from "@/lib/submit";

    const requiredHeaders = ["x-header-1", "x-header-2"]; // List the headers you require here, if needed

    export const OPTIONS = createSubmitOPTIONSHandler(requiredHeaders);

    // Or if you do not need extra headers
    export const OPTIONS = createSubmitOPTIONSHandler();
    ```


2. Creating a POST handler, this is where you need to process the data from your source. Here you need to create something called `dataExtractor`, Which will return NextResponse on error or an object containing the teamname and file object. 
    In this step, you may also perform authentication with your source service to confirm the sender's identity (an example of this is implemented within [api/submit-via-judgels/route.ts](./app/api/submit-via-judgels/route.ts)). Below is an example of a basic implementation of this.
    ```typescript
    import { type CreateSubmitPOSTHandlerExtractorType } from "@/lib/submit";

    const dataExtractor: CreateSubmitPOSTHandlerExtractorType = async ({ req, createErrorResponse }) => {
      const formData = await req.formData();
      const file = formData.get("file") as File;
      const teamname = (formData.get("teamname") as string) || "anonymous";
      const token = formData.get("token") as string;

      // Validate secret key
      const response = await fetch(`${YOUR_API_BASE_URL}/verifyToken`, {
          headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
          return createErrorResponse("Invalid Token", 403); // Error message, HTTP Code
      }
      const team = await response.json();
      if (team.teamname != teamname) {
          return createErrorResponse("Wrong Credentials!", 403); // Error message, HTTP Code
      }
      return { file, teamname };
    }

    ```
    > This is a slightly modified version of [api/submit](./app/api/submit/route.ts) to demonstrate the use of given args correctly. There is also createSuccessResponse passed inside the props given to the dataExtractor, however, this should not be used, except when creating a dummy endpoint.

    Then You need to pass this extractor function to createSubmitPOSTHandler like below:
    ```typescript
    import { createSubmitPOSTHandler } from "@/lib/submit";

    export const POST = createSubmitPOSTHandler({
      source: 'api/submit-via-<your-source>',
      requiredHeaders, // only if required by your implementation
      dataExtractor
    });
    ```
    Now your route setup is complete!

3. Lastly, we need to add a new entry to the `SUBMIT_SOURCES` const variable in `lib/consts.ts`. Inside, you should see something similiar to below:
    ```typescript
    ...

    export const SUBMIT_SOURCES: Record<string, SubmitSourceEntry> = { // For monitoring page and api responses if disabled.
      'api/submit': { // This is always allowed. You can not disable direct submissions.
        name: "Direct",
        badgeClasses: "bg-blue-100 text-blue-800"
      },
      'api/submit-via-judgels': {
        name: "Judgels",
        badgeClasses: "bg-green-100 text-green-800"
      },
      'unknown': {
        name: "Unknown",
        badgeClasses: "bg-gray-100 text-gray-800"
      }
    };

    ...
    ```
    Following the same pattern, create a new record, with `api/submit-via-<your-source>` and value of an object with field name and badgeClasses.
    ```typescript
    export const SUBMIT_SOURCES: Record<string, SubmitSourceEntry> = {
      ...
      'api/submit-via-<your-source>': {
        name: "Your Source Friendly Name", // This will be displayed in monitor page
        badgeClasses: "bg-purple-100 text-purple-800" 
        // This will be used to style the source badge within the monitoring page
      },
      ...
    };
    ```
    Then to enable your newly made plugin, insert your new plugin endpoint inside `ENABLED_PLUGINS` field in your `.env` file, for example your wanted to enable `api/submit-via-a` and `api/submit-via-b`, then set `ENABLED_PLUGINS="api/submit-via-a,api/submit-via-b"` (**Remember the double quotes, those are important!**)

    And voila! You have successfully made your own plugin for probably-printing!

---


This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

Use npm with the committed `package-lock.json` for installs and Vercel deployments.
Set `API_SECRET_KEY` in Vercel; production API authentication is enabled by Next.js's `NODE_ENV=production`.

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
