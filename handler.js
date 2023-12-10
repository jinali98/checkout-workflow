const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

const isAvailable = (item, quantity) => {
  return item.quantity - quantity > 0;
};

module.exports.checkInventory = async ({ id, quantity }) => {
  try {
    const params = {
      TableName: "inventory",
      KeyConditionExpression: "id = :id",
      ExpressionAttributeValues: {
        ":id": id,
      },
    };

    const command = new QueryCommand(params);
    const response = await ddbDocClient.send(command);

    const item = response.Items[0];
    if (isAvailable(item, quantity)) {
      return item;
    }

    const itemOutOfStock = new Error("Item is out of stock");
    itemOutOfStock.name = "ItemOutOfStock";
    throw itemOutOfStock;
  } catch (err) {
    if (err.name === "ItemOutOfStock") {
      throw err;
    }

    const notFound = new Error("Item is not found");
    notFound.name = "ItemNotFound";
    throw notFound;
  }
};

module.exports.calculateTotal = async ({ item, quantity }) => {
  try {
    const total = item.price * quantity;

    return { total };
  } catch (err) {}
};

module.exports.redeemPoints = async ({ userid, total }) => {
  try {
    const orderTotal = total.total;

    const params = {
      TableName: "user",
      Key: {
        id: userid,
      },
    };
    const command = new QueryCommand(params);
    const response = await ddbDocClient.send(command);

    const user = response.Items[0];
  } catch (err) {}
};

module.exports.billCustomer = async (event) => {
  try {
  } catch (err) {}
};
module.exports.prepareOrder = async (event) => {
  try {
  } catch (err) {}
};
