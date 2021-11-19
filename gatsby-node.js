exports.onPreInit = () => console.log("Loaded gatsby-source-10to8");
const axios = require('axios')

const baseUrl = "https://10to8.com/api/booking/v2";

//
// Implements the Source Nodes API to get data from 10to8 into Gatsby's GraphQL model
//
exports.sourceNodes = async (
  { actions, createContentDigest, createNodeId, getNodesByType },
  pluginOptions
) => {
  const { createNode, createTypes } = actions;

  var apiKey = pluginOptions.apiKey;
  
  var objectsToFetch = {service: "Service", location: "Location"};

  // Build the simultaneuous requests
  var arrayOfRequests = Reflect.ownKeys(objectsToFetch).map((dataUrl) => {
    return axios.get(`${baseUrl}/${dataUrl}`, {
      headers: {
        Authorization:
          "token " + apiKey
      },
    });
  });

  // Get the data
  var results = await Promise.all(arrayOfRequests);

  results.forEach((response, index) => {
    var dataUrl = Reflect.ownKeys(objectsToFetch)[index];
    var items;
    if(response.data.results)
      items = response.data.results;
    else
      items = response.data;
    console.info(`Creating ${items.length} A10to8 item type "${dataUrl}"`);
    Array.from(items).forEach((objectData) => {
      fillInId(objectData);
      var node = createNode({
        ...objectData,
        parent: null,
        children: [],
        internal: {
          type: `A10to8${objectsToFetch[dataUrl]}`,
          content: "",
          contentDigest: createContentDigest(objectData),
        },
      });
    });
    // If no items, do create the type! (else our relationships will go haywire)
    if (items.length == 0) {
      createTypes(`
        type A10to8${objectsToFetch[dataUrl]} implements Node {
          id: String!
        }
      `);
    }
  });
};

//
// There is a requirement in Gatsby for objects to have string ids.
// 10to8 does offer internal ids, but not as a field, just somewhere in the resource URI
//
function fillInId(object) {
  var split_string = object.resource_uri.split("/");
  object.id = split_string[split_string.length - 2];
}

///
/// To support resolution of *_id fields to linked GraphQL entities, we must declare  the relationships between entities in the GraphQL schema
/// 
/// There are 2 ways you can declare this, either through simplified string sytax (for the first entries) or 
/// through more verbose buildObjectType syntax. The latter is used if an entity has an array of items that need referencing.
///
exports.createSchemaCustomization = ({ actions, schema }) => {
  const { createTypes } = actions;
    schema.buildObjectType({
      name: "A10to8Service",
      fields: {
        locations: {
          type: "[A10to8Location]",
          resolve: (source, args, context, info) => {
            return context.nodeModel
              .getAllNodes({ type: "A10to8Location" })
              .filter((location) =>
                source.locations.map((i) => i.toString()).includes(location.id)
              );
          },
        }
      }
    });
};