// const functions = require("firebase-functions");
const express = require("express");
const app = express();
app.use(express.json());

app.listen(9000, () => {
  console.log("Application is running on port 9000");
});

const runtimeOpts = {
  memory: "2GB",
};

const get = require("lodash/get");

const JSON_SIMPLE_VALUE_KINDS = new Set([
  "numberValue",
  "stringValue",
  "boolValue",
]);
function structProtoToJson(proto) {
  if (!proto || !proto.fields) {
    return {};
  }
  const json = {};
  // tslint:disable-next-line:forin
  for (const k in proto.fields) {
    json[k] = valueProtoToJson(proto.fields[k]);
  }
  return json;
}

function valueProtoToJson(proto) {
  if (!proto || !proto.kind) {
    return null;
  }

  if (JSON_SIMPLE_VALUE_KINDS.has(proto.kind)) {
    return proto[proto.kind];
    // tslint:disable-next-line:no-unnecessary-else
  } else if (proto.kind === "nullValue") {
    return null;
  } else if (proto.kind === "listValue") {
    if (!proto.listValue || !proto.listValue.values) {
      // tslint:disable-next-line:no-console
      console.warn("Invalid JSON list value proto: ", JSON.stringify(proto));
    }
    return proto.listValue.values.map(valueProtoToJson);
  } else if (proto.kind === "structValue") {
    return structProtoToJson(proto.structValue);
  } else {
    // tslint:disable-next-line:no-console
    console.warn("Unsupported JSON value proto kind: ", proto.kind);
    return null;
  }
}

dialogflowMessagesToLineMessages = (dialogflowMessages) => {
  const lineMessages = [];
  for (let i = 0; i < dialogflowMessages.length; i++) {
    const messageType = get(dialogflowMessages[i], "message");
    let message;
    if (messageType === "text") {
      message = {
        type: "text",
        text: get(dialogflowMessages[i], ["text", "text", "0"]),
      };
      lineMessages.push(message);
    } else if (messageType === "payload") {
      let payload = get(dialogflowMessages[i], ["payload"]);
      payload = structProtoToJson(payload);
      message = get(payload, "line");
      lineMessages.push(message);
    }
  }
  return lineMessages;
};
// exports.google_dialogflow = functions
//   .runWith(runtimeOpts)
//   .region("asia-northeast1")
//   .https.onRequest(app);

app.get("/dialogflow/:text", async function (req, res) {
  const dialogflow = require("@google-cloud/dialogflow");
  const uuid = require("uuid");
  console.log("in", req.body);

  /**
   * Send a query to the dialogflow agent, and return the query result.
   * @param {string} projectId The project to be used
   */

  const {
    client_email,
    private_key,
    project_id,
  } = require("./chayen-11c3d1be8cd5.json");
  async function runSample(projectId = project_id) {
    const sessionId = uuid.v4();
    const sessionClient = new dialogflow.SessionsClient({
      credentials: {
        client_email: client_email,
        private_key: private_key,
      },
    });
    const sessionPath = sessionClient.projectAgentSessionPath(
      projectId,
      sessionId,
    );

    const request = {
      session: sessionPath,
      queryInput: {
        text: {
          text: "hello",
          languageCode: "en-US",
        },
      },
    };

    const responses = await sessionClient.detectIntent(request);
    const messageToLine = responses[0].queryResult.fulfillmentMessages;
    const lineMessages = dialogflowMessagesToLineMessages(messageToLine);
    console.log("lineMessages **** ", lineMessages);
    const result = responses[0].queryResult;
    console.log(`  Query: ${result.queryText}`);
    console.log(`  Response: ${result.fulfillmentText}`);
    if (result.intent) {
      console.log(`  Intent: ${result.intent.displayName}`);
    } else {
      console.log(`  No intent matched.`);
    }
  }
  runSample();
  return res.send("ok").status(200);
});
