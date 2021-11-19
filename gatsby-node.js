exports.onPreInit = () => console.log("Loaded gatsby-source-10to8");

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

  var objectsToFetch = ["service", "location"];

  // Build the simultaneuous requests
  var arrayOfRequests = Reflect.ownKeys(objectsToFetch).map((dataUrl) => {
    var object = objectsToFetch[dataUrl];
    return axios.get(`https://api.salonized.com/${dataUrl}`, {
      headers: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        Authorization:
          "Bearer " + apiKey
      },
    });
  });

  // Get the data
  var results = await Promise.all(arrayOfRequests);

  results.forEach((response, index) => {
    var dataUrl = Reflect.ownKeys(response.data)[0];
    var items = response.data[dataUrl];
    console.info(`Creating ${items.length} 10to8 item type "${dataUrl}"`);
    items.map((objectData) => {
      fillInId(objectData);
      var node = createNode({
        ...objectData,
        parent: null,
        children: [],
        internal: {
          type: `10to8${objectsToFetch[dataUrl]}`,
          content: "",
          contentDigest: createContentDigest(objectData),
        },
      });
    });
    // If no items, do create the type! (else our relationships will go haywire)
    if (items.length == 0) {
      createTypes(`
        type 10to8${objectsToFetch[dataUrl]} implements Node {
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
/*exports.createSchemaCustomization = ({ actions, schema }) => {
  const { createTypes } = actions;
  createTypes([
    `
    type salonizedAppointment implements Node {
      customer: salonizedCustomer @link(from: "customer_id")
      location: salonizedLocation @link(from: "location_id") 
    }
    type salonizedMessage implements Node {
      appointment: salonizedAppointment @link(from: "appointment_id")
      customer: salonizedCustomer @link(from: "customer_id")
      feedback: salonizedFeedback @link(from: "feedback_id")
      form_submission: salonizedFormSubmission @link(from: "form_submission_id")
      order: salonizedOrder @link(from: "order_id")
    }
    type salonizedService implements Node {
      category: salonizedServiceCategory @link(from: "category_id")
      company: salonizedCompany @link(from: "company_id")
      service: salonizedService @link(from: "service_id")
      vat_rate: salonizedVatRate @link(from: "vat_rate_id")
    }
    type salonizedCompany implements Node {
      defaultVatRate: salonizedVatRate @link(from: "default_vat_rate_id")
      primaryEmployee: salonizedResource @link(from: "primary_employee_id")
      primaryLocation: salonizedLocation @link(from: "primary_location_id")
    }
    type salonizedLocation implements Node {
      company: salonizedCompany @link(from: "company_id")
    }
    type salonizedTimelineItem implements Node {
      order: salonizedOrder @link(from: "order_id")
      customer: salonizedCustomer @link(from: "customer_id")
      appointment: salonizedAppointment @link(from: "appointment_id")
    }
  `,
    // Some types have arrays underneath that the "by" or "from" syntax above doesn't support
    // We'll need to use buildObjectType to make this work
    // type salonizedOrder implements Node {
    //   company: salonizedCompany @link(from: "company_id")
    //   customer: salonizedCustomer @link(from: "customer_id")
    //   location: salonizedLocation @link(from: "location_id")
    //   items: [OrderItem]
    // }
    // type OrderItem {
    //   employee: salonizedResource @link(from: "employee_id")
    //   order: salonizedOrder @link(from: "order_id")
    //   product: salonizedProduct @link(from: "product_id")
    //   service: salonizedService @link(from: "service_id")
    // }
    schema.buildObjectType({
      name: "salonizedOrder",
      fields: {
        company: {
          type: "salonizedCompany",
          resolve: (source, args, context, info) => {
            return context.nodeModel.getNodeById({
              id: source.company_id,
              type: "salonizedCompany",
            });
          },
        },
        customer: {
          type: "salonizedCustomer",
          resolve: (source, args, context, info) => {
            return context.nodeModel.getNodeById({
              id: source.customer_id,
              type: "salonizedCustomer",
            });
          },
        },
        location: {
          type: "salonizedLocation",
          resolve: (source, args, context, info) => {
            return context.nodeModel.getNodeById({
              id: source.location_id,
              type: "salonizedLocation",
            });
          },
        },
        items: {
          type: "[salonizedOrderItem]",
        },
      },
      interfaces: ["Node"],
    }),
    schema.buildObjectType({
      name: "salonizedOrderItem",
      fields: {
        product: {
          type: "salonizedProduct",
          resolve: (source, args, context, info) => {
            return context.nodeModel.getNodeById({
              // must toString() as sub entities did not get the Int->String fix
              // using ternary operator as this is an outer join (not all order items have a product)
              id: source.product_id ? source.product_id.toString() : "",
              type: "salonizedProduct",
            });
          },
        },
        employee: {
          type: "salonizedResource",
          resolve: (source, args, context, info) => {
            return context.nodeModel.getNodeById({
              // must toString() as sub entities did not get the Int->String fix
              // using ternary operator as this is an outer join (not all order items have a product)
              id: source.employee_id ? source.employee_id.toString() : "",
              type: "salonizedResource",
            });
          },
        },
        service: {
          type: "salonizedService",
          resolve: (source, args, context, info) => {
            return context.nodeModel.getNodeById({
              // must toString() as sub entities did not get the Int->String fix
              // using ternary operator as this is an outer join (not all order items have a product)
              id: source.service_id ? source.service_id.toString() : "",
              type: "salonizedService",
            });
          },
        },
      },
    }),
    // type salonizedProduct implements Node {
    //   category: salonizedProductCategory @link(from: "category_id")
    //   supplier: salonizedSupplier @link(from: "supplier_id")
    //   stocks: [ProductStock]
    // }
    // type ProductStock {
    //   company: salonizedCompany @link(from: "company_id")
    //   location: salonizedLocation @link(from: "location_id")
    // }
    schema.buildObjectType({
      name: "salonizedProduct",
      fields: {
        category: {
          type: "salonizedProductCategory",
          resolve: (source, args, context, info) => {
            return context.nodeModel.getNodeById({
              // must toString() as sub entities did not get the Int->String fix
              id: source.category_id.toString(),
              type: "salonizedProductCategory",
            });
          },
        },
        supplier: {
          type: "salonizedSupplier",
          resolve: (source, args, context, info) => {
            return context.nodeModel.getNodeById({
              // must toString() as sub entities did not get the Int->String fix
              id: source.supplier_id.toString(),
              type: "salonizedSupplier",
            });
          },
        },
        stocks: {
          type: "[salonizedProductStock]",
        },
      },
      interfaces: ["Node"],
    }),
    schema.buildObjectType({
      name: "salonizedProductStock",
      fields: {
        company: {
          type: "salonizedCompany",
          resolve: (source, args, context, info) => {
            return context.nodeModel.getNodeById({
              // must toString() as sub entities did not get the Int->String fix
              id: source.company_id.toString(),
              type: "salonizedCompany",
            });
          },
        },
        location: {
          type: "salonizedLocation",
          resolve: (source, args, context, info) => {
            return context.nodeModel.getNodeById({
              // must toString() as sub entities did not get the Int->String fix
              id: source.location_id.toString(),
              type: "salonizedLocation",
            });
          },
        },
      },
    }),
    // saloniedResource has serveral services linked
    schema.buildObjectType({
      name: "salonizedResource",
      fields: {
        services: {
          type: "[salonizedService]",
          resolve: (source, args, context, info) => {
            return context.nodeModel
              .getAllNodes({ type: "salonizedService" })
              .filter((service) =>
                source.service_ids.map((i) => i.toString()).includes(service.id)
              );
          },
        },
        locations: {
          type: "[salonizedLocation]",
          resolve: (source, args, context, info) => {
            return context.nodeModel
              .getAllNodes({ type: "salonizedLocation" })
              .filter((location) =>
                source.location_ids.map((i) => i.toString()).includes(location.id)
              );
          },
        },
      },
      interfaces: ["Node"],
    }),
  ]);
};*/
