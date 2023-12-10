const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");
const {
  SFNClient,
  SendTaskSuccessCommand,
  SendTaskFailureCommand,
} = require("@aws-sdk/client-sfn");
const sqsClient = new SFNClient();

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

const deductAllPoints = async (userid) => {
  const params = {
    TableName: "user",
    Key: {
      id: userid,
    },
    UpdateExpression: "SET points = :zeroPoints",
    ExpressionAttributeValues: {
      ":zeroPoints": 0,
    },
  };
  const command = new UpdateCommand(params);
  await ddbDocClient.send(command);
};
const resetPoints = async (userid, points) => {
  const params = {
    TableName: "user",
    Key: {
      id: userid,
    },
    UpdateExpression: "SET points = :points",
    ExpressionAttributeValues: {
      ":points": points,
    },
  };
  const command = new UpdateCommand(params);
  await ddbDocClient.send(command);
};

module.exports.redeemPoints = async ({ userid, total }) => {
  try {
    let orderTotal = total.total;

    const params = {
      TableName: "user",
      Key: {
        id: userid,
      },
    };
    const command = new GetCommand(params);
    const response = await ddbDocClient.send(command);

    const user = response.Item;
    const points = user.points;

    if (orderTotal > points) {
      await deductAllPoints(userid);
      orderTotal = orderTotal - points;

      return { total: orderTotal, points };
    }
    if (orderTotal < points) {
      throw new Error("Order total is less than points");
    }
  } catch (err) {
    throw err;
  }
};

module.exports.billCustomer = async (event) => {
  try {
    // stripe api intergration

    return "success";
  } catch (err) {}
};

module.exports.prepareOrder = async (event) => {
  try {
  } catch (err) {}
};

module.exports.restoreRedeemPoints = async ({ total, userid }) => {
  try {
    if (total.points) {
      const points = total.points;

      await resetPoints(userid, points);
    }
  } catch (err) {}
};

const updateItemQuantity = async (itemid, orderQuantity) => {
  let params = {
    TableName: "inventory",
    Key: { id: itemid },
    UpdateExpression: "SET quantity = quantity - :orderQuantity",
    ExpressionAttributeValues: {
      ":orderQuantity": orderQuantity,
    },
  };
  const command = new UpdateCommand(params);
  await ddbDocClient.send(command);
};

module.exports.sqsWorker = async (event) => {
  try {
    console.log(JSON.stringify(event));
    const record = event.Records[0];
    const body = JSON.parse(record.body);
    /** Find a courier and attach courier information to the order */
    let courier = "";

    // update book quantity
    await updateItemQuantity(body.Input.id, body.Input.quantity);

    // throw "Something wrong with Courier API";

    // Attach curier information to the order

    const input = {
      output: JSON.stringify({ courier }),
      taskToken: body.Token,
    };
    const command = new SendTaskSuccessCommand(input);
    await sqsClient.send(command);
  } catch (e) {
    console.log("===== You got an Error =====");
    console.log(e);

    const input = {
      error: "NoCourierAvailable",
      cause: "No couriers are available",
      taskToken: body.Token,
    };
    const command = new SendTaskFailureCommand(input);
    await sqsClient.send(command);
  }
};
module.exports.restoreQuantity = async ({ id, quantity }) => {
  let params = {
    TableName: "inventory",
    Key: { id: id },
    UpdateExpression: "set quantity = quantity + :orderQuantity",
    ExpressionAttributeValues: {
      ":orderQuantity": quantity,
    },
  };
  const command = new UpdateCommand(params);
  await ddbDocClient.send(command);

  return "Quantity restored";
};
