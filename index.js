refreshStravaTokens = async (event) => {
  const axios = require("axios");
  const { DynamoDB } = require("@aws-sdk/client-dynamodb");

  const STRAVA_TOKENS_URL = "https://www.strava.com/oauth/token";
  const DYNAMODB_TABLE = "stravaTokens";

  let isUpdateNeeded = false;

  try {
    const dynamoDB = new DynamoDB({
      apiVersion: "2012-08-10",
      region: "eu-central-1",
    });

    const { Items } = await dynamoDB.scan({
      TableName: DYNAMODB_TABLE,
    });

    if (Items.length === 1) {
      const { clientSecret, refreshToken, clientId, accessToken } = Items[0];
      const { data } = await axios.post(STRAVA_TOKENS_URL, {
        client_id: clientId.S,
        client_secret: clientSecret.S,
        grant_type: "refresh_token",
        refresh_token: refreshToken.S,
      });

      const { access_token, refresh_token } = data;
      isUpdateNeeded =
        refreshToken.S !== refresh_token || accessToken.S !== access_token;
      if (isUpdateNeeded) {
        await dynamoDB.updateItem({
          ExpressionAttributeNames: {
            "#ACCESS_TOKEN": "accessToken",
            "#REFRESH_TOKEN": "refreshToken",
          },
          ExpressionAttributeValues: {
            ":access_token": {
              S: access_token,
            },
            ":refresh_token": {
              S: refresh_token,
            },
          },
          UpdateExpression:
            "SET #ACCESS_TOKEN = :access_token, #REFRESH_TOKEN = :refresh_token",
          Key: {
            clientId: {
              S: clientId.S,
            },
          },
          ReturnValues: "ALL_NEW",
          TableName: DYNAMODB_TABLE,
        });
      }
    }
    const response = {
      statusCode: 200,
      body: `Tokens ${isUpdateNeeded ? "" : "not"} updated`,
    };
    return response;
  } catch (err) {
    console.log("Upsss... ", err);
    const response = {
      statusCode: 500,
      body: JSON.stringify(err),
    };
  }
};

refreshStravaTokens();

exports.handler = refreshStravaTokens;
