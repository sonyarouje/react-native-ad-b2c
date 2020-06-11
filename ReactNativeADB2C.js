import Timer from "react-timer-mixin";
import log from "./logger";

const config = {
  client_secret: "", //required
  client_id: "", //required
  redirect_uri: "", //required
  token_uri: "", //required
  reset_password_policy: 'B2C_1_pwdreset',
  user_flow_policy: "", //required: e.g. B2C_1_signupsignin,
  authority_host: "", //required
  prompt: "", //defaulted to login
  scope: "", //required
};

class B2CAuthentication {
  configuration = {};
  credentials = {};

  constructor(config) {
    this.configuration = config;
  }

  getConfig = () => {
    return this.configuration;
  };

  getCredentials = () => {
    log.verbose("getCredentials", this.credentials);
    return this.credentials;
  }

  /**
  * Assure that access_token is valid, when access token
  * is expired, this method refresh access token automatically and returns
  * renewed access token in promise.
  * @param credentials, pass the credentials recevied at the time of login. credentials data structure should be like
  * {
  * "access_token": "eyJ0eXAiOiJKV1QiLCJhb.....",
  * "expires_in": 3600,
  * "expires_on": 1549521954,
  * "not_before": 1549518354,
  * "profile_info": "eyJ2ZXIiOiIxLjAi....",
  * "refresh_token": "eyJraWQiOiJjcGltY2....",
  * "refresh_token_expires_in": 1209600,
  * "token_type": "Bearer",
  * }
  */
  assureToken = (credentials) => {
    const currentUTCTime = Math.floor(new Date().getTime() / 1000);
    if (currentUTCTime < credentials.expires_on){
      return new Promise.resolve(credentials.access_token);
    } else {
      return refreshToken(credentials.refresh_token);
    }
  };

  refreshToken = (refreshToken) => {
    return new Promise((resolve, reject) => {
      if (!refreshToken) reject("Invalid refresh token");

      const config = {
        refresh_token: refreshToken,
        client_id: this.configuration.client_id,
        client_secret: this.configuration.client_secret,
        resource: "common"
      }

      const grantType = "refresh_token";
      this.grantAccessToken(grantType, config)
        .then((resp) => {
          resolve(resp.response.access_token);
        })
        .catch((err) => {
          reject(err);
        });
    });
  };

  grantAccessToken = (grantType, params) => {
    // If resource is null or undefined, use `common` by default
    params.resource = params.resource || "common";
    if (grantType === "password") params["client_id"] = this.config.client_id;
    return new Promise((resolve, reject) => {
      try {
        log.debug(`${grantType} access token for resource ${params.resource}`);
        var tm = Timer.setTimeout(() => {
          reject("time out");
        }, 15000);

        const body = `grant_type=${grantType}${_serialize(params)}`;

        if (!this.configuration.token_uri) reject("token_uri not set in config");
        log.debug("ReactNativeAD.grantAccessToken: url", this.configuration.token_uri);
        log.debug("ReactNativeAD.grantAccessToken: body", body);

        fetch(`${this.configuration.token_uri}?p=${this.configuration.user_flow_policy}`, {
          method: "POST",
          mode: "cors",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body
        }).then(response => {
          Timer.clearTimeout(tm);
          return response.text();
        }).then(res => {
          const cred = {
            resource: params.resource,
            response: JSON.parse(res.replace("access_token=", ""))
          };
          this.credentials = cred.response;

          if (cred.response.access_token) {
            log.debug(`received access_token `, cred.response);
            //   AsyncStorage.setItem(cacheKey, JSON.stringify(cred.response));
            resolve(cred);
          } else {
            log.debug(`failed to grant token`, cred.response);
            reject(cred);
          }
        }).catch(reject);

      } catch (err) {
        reject(err);
      }
    });
  };



}

function _serialize(params) {
  let paramStr = "";
  //TODO functionlize the below code.
  for (let prop in params) {
    if (params[prop] !== null && params[prop] !== void 0 && prop !== "grant_type")
      paramStr += `&${prop}=${encodeURIComponent(params[prop])}`;
  }
  log.debug("serializes", paramStr);
  return paramStr;
}

export default B2CAuthentication;