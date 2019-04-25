# react-native-ad-b2c
React Native client library for Azure Active Directory B2C


# Example

```
import B2CAuthentication from "../auth-ad-js/ReactNativeADB2C";
import LoginView from "../auth-ad-js/LoginView";

const CLIENT_ID = "<provide your client id>";

export default class LoginScreen extends React.Component {
  static navigationOptions = {
    title: "Login"
  };

  render() {
    const b2cLogin = new B2CAuthentication({
      tenant: 'yourtenant.onmicrosoft.com',
      client_id: CLIENT_ID,
      client_secret: "<key set in application/key>",
      user_flow_policy: "B2C_1_signupsignin",
      reset_password_policy: 'B2C_1_password_reset',
      token_uri: "https://saroujetmp.b2clogin.com/saroujetmp.onmicrosoft.com/oauth2/v2.0/token",
      authority_host: "https://saroujetmp.b2clogin.com/saroujetmp.onmicrosoft.com/oauth2/v2.0/authorize",
      redirect_uri: "https://functionapp120190131041619.azurewebsites.net/.auth/login/aad/callback",
      prompt: "login",
      scope: ["https://saroujetmp.onmicrosoft.com/api/offline_access", "offline_access"]
    });

    return (
      <LoginView
        context={b2cLogin}
        onSuccess={this.onLoginSuccess.bind(this)}
      />
    );
  }
  onLoginSuccess(credentials) {
    console.log("onLoginSuccess");
    console.log(credentials);
    // use credentials.access_token..
  }
}
```

Note: This client library is a modified version of https://github.com/wkh237/react-native-azure-ad to suit Azure AD B2C authentication.

I will add some more details at a later point.
