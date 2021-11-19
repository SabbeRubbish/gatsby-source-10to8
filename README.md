# gatsby-source-10to8

Source plugin for pulling several content types into Gatsby from a [10to8](https://www.10to8.com) subscription. It creates nodes so the data can be queried using GraphQL.

You can use a free or paid subscription at 10to8 to use this source plugin.

**DISCLAIMER:**
This software is provided as-is and is in no way affiliated with 10to8.

## Install

```shell
npm install gatsby-source-10to8
```

## Usage

1. You'll have to enter your API key in the configuration of the plugin. I advise to use environment variable files `.env.development` and `.env.production` for this:

```text:title=process.env.*
API_KEY_10TO8=<api_key>
```

and in your gatsby-config.js:

```javascript:title=gatsby-config.js
module.exports = {
  plugins: [
    {
      resolve: `gatsby-source-10to8`,
      options: {
        apiKey: process.env.API_KEY_10TO8
      },
    },
  ],
};
```

Make sure that your `.env.*` files are listed in `.gitignore` so you're not sharing this with anyone. You'll also have to add them to your Gatsby Cloud, Netlify, ... host.

2. Next, you can just access the different nodes via GraphQL:

```javascript
allA10To8Service {
  edges {
    node {
      id
      name
      description
      cancellation_policy
      length
      public
      requires_organisation_confirmation
      locationList {
        name
        post_code
      }
      staffList {
        name
      }
    }
  }
```

All fields that are returned from the 10to8 API are available.
Note that 10to8Service was not an accepted name as a type, hence the "A" in front of it:
> Names must match /^[_a-zA-Z][_a-zA-Z0-9]*$/ but "10To8Service" does not.

## Supported entity types

Currently, the following entity types are available:

- services
- locations
- staff

Some items are not available through the API.
See the API documentation at https://10to8.com/api.

## Dependencies

- axios for parallel querying (faster)

## Updates / Subscription / Webhooks

There are webhooks in 10to8 as there is Zapier integration.
For now, webhooks don't update stuff in Gatsby yet.

This means that you need to rebuild your (static) Gatsby site for each content update you make. This is normal behaviour for these static Gatsby sites, but is definitely more problematic if no webhooks are available.

You were warned.

## Version history

TODO

| Version | Date       | Notes                                                                                                    |
| ------- | ---------- | -------------------------------------------------------------------------------------------------------- |
| 1.0.0   | 2021-11-19 | Basic working module                                                                                     |

## License

[MIT](https://choosealicense.com/licenses/mit/)
