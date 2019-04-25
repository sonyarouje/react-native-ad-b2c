import React, { Component } from "react";
import { WebView, Dimensions } from "react-native";
import log from "./logger";
import B2CAuthentication from "./ReactNativeADB2C";

export default class LoginView extends React.Component {
    needRedirect = true;
    onTokenGranted = () => { };
    lock = false;
    accessToken = {};

    constructor(props) {
        super(props);
        if (!this.props.context instanceof B2CAuthentication)
            throw new Error("property `context` of LoginView should be an instance of B2CAuthentication, but got", this.props.context);

        const context = this.props.context;
        this.needRedirect = this.props.needLogout || false;
        this.state = {
            page: this.getLoginUrl(context.getConfig().authority_host),
            visible: true
        };
        this._lock = false;
    }

    componentWillUpdate(nextProps, nextState) {
        if (this.state.visible === nextState.visible && this.state.page === nextState.page)
            return false;
        return true;
    }

    componentWillReceiveProps(nextProps) {
        if (!this.props.needLogout && nextProps.needLogout) {
            const context = this.props.context;
            this.needRedirect = nextProps.needLogout || false;
            this.setState({
                page: this.getLoginUrl(context.getConfig().authority_host),
                visible: true
            });
        }
    }

    render() {
        // Fix visibility problem on Android webview
        let js = `document.getElementsByTagName('body')[0].style.height = '${
            Dimensions.get("window").height
            }px';`;

        return this.state.visible ? (
            <WebView
                ref="ADLoginView"
                automaticallyAdjustContentInsets={false}
                style={[
                    this.props.style,
                    {
                        flex: 1,
                        alignSelf: "stretch",
                        width: Dimensions.get("window").width,
                        height: Dimensions.get("window").height
                    }
                ]}
                source={{ uri: this.state.page }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                onLoadEnd={() => {
                    if (this._needRedirect) {
                        this._needRedirect = false;
                        this.setState({ page: this.getLoginUrl(this.props.context.getConfig().authority_host) });
                    }
                }}
                decelerationRate="normal"
                javaScriptEnabledAndroid={true}
                onNavigationStateChange={this._handleADToken.bind(this)}
                onShouldStartLoadWithRequest={e => {
                    return true;
                }}
                startInLoadingState={false}
                injectedJavaScript={js}
                scalesPageToFit={true}
            />
        ) : null;
    };

    /**
     * Get authority host URI,
     * @param {string} tenant Custom tenant ID, this filed is optional, default
     *                        values is `common`.
     * @return {string} The Authority host URI.
     */
    getLoginUrl = (url) => {
        const authUrl = url;
        const context = this.props.context || null;
        const redirect = context.getConfig().redirect_uri;
        const prompt = context.getConfig().prompt || "login";
        const userFlowPolicy = context.getConfig().user_flow_policy;
        const clientId = context.getConfig().client_id;
        const scope = context.getConfig().scope;
        if (context !== null) {
            const result =
                `${authUrl}?p=${userFlowPolicy}&response_type=code` +
                `&client_id=${clientId}` +
                (redirect ? `&redirect_uri=${redirect}&nonce=rnad-${Date.now()}` : "") +
                (prompt ? `&prompt=${prompt}` : "") +
                (scope ? `&scope=${scope.join(" ")}` : "");
            ;

            console.log(result);
            return result;
        } else {
            throw new Error("context should not be null/undefined.");
        }
    }

   getPasswordResetUrl = (url) => {
        const authUrl = url;
        const context = this.props.context || null;
        const redirect = context.getConfig().redirect_uri;
        const prompt = context.getConfig().prompt || "login";
        const passwordResetPolicy = context.getConfig().reset_password_policy;
        const tenant = context.getConfig().tenant
        const clientId = context.getConfig().client_id;
        const scope = context.getConfig().scope;
        if (context !== null) {
            const result =
                `${authUrl}/${tenant}/${passwordResetPolicy}/oauth2/v2.0/authorize?response_type=id_token` +
                (scope ? `&scope=${scope.join(" ")}%20openid%20profile` : "") +
                `&client_id=${clientId}` +
                (redirect ? `&redirect_uri=${redirect}&nonce=rnad-${Date.now()}` : "") +
                (prompt ? `&prompt=${prompt}` : "");
            ;

            console.log(result);
            return result;
        } else {
            throw new Error("context should not be null/undefined.");
        }
    }

    /**
     * An interceptor for handling webview url change, when it detects possible
     * authorization code in url, it will triggers authentication flow.
     * @param  {object} e Navigation state change event object.
     */
    _handleADToken(e) {
        const context = this.props.context;

        log.verbose("ADLoginView navigate to", e.url);
        if (this._lock) return true;
        let errorDescription = /((\?|\&)error_description\=)[^\%]+/.exec(e.url);
        let code = /((\?|\&)code\=)[^\&]+/.exec(e.url);
        if (this._needRedirect) {
            // this._needRedirect = false
            return true;
        }

        if (this.props.onURLChange) this.props.onURLChange(e);

        if (errorDescription !== null) {
            let errorCode = String(errorDescription[0]).replace(/(\?|\&)?error_description\=/, "")
            switch (errorCode) {
                case "AADB2C90118":
                        let url = 'https://login.microsoftonline.com/te'
                    this.setState({
                        page: this.getPasswordResetUrl(url),
                        visible: true
                    });
                    return true;
                    break;
                default:
                    break;
            }
        }

        if (code !== null) {
            this._lock = true;
            log.verbose("LoginView._handleADToken code=", code[0]);
            code = String(code[0]).replace(/(\?|\&)?code\=/, "");
            this.setState({ visible: !this.props.hideAfterLogin });
            this.props.onVisibilityChange && this.props.onVisibilityChange(false);
            this._getResourceAccessToken(code).catch(err => {
                log.error("LoginView._getResourceAccessToken", err);
            });
            return true;
        }

        return true;
    }

    /**
 * Get access token for each resoureces
 * @param {string} code The authorization code from `onNavigationStateChange`
 *                      callback.
 * @return {Promise<void>}
 */
    _getResourceAccessToken(code) {
        const context = this.props.context;

        if (!context)
            throw new Error(
                "property `context` of LoginView should not be null/undefined"
            );

        const adConfig = this.props.context.getConfig();

        log.verbose("LoginView get access token for resources");

        let promises = [];
        const config = {
            client_id: adConfig.client_id,
            redirect_uri: adConfig.redirect_uri,
            code,
            client_secret: adConfig.client_secret,
            // set resource to common by default
            resource: "common"
        };

        promises.push(context.grantAccessToken("authorization_code", config));

        return Promise.all(promises)
            .then((resps) => {
                log.verbose("LoginView response access info ", resps);

                if (!this.props.context)
                    throw new Error("value of property `context` is invalid=", this.props.context);

                const context = this.props.context;
                const onSuccess = this.props.onSuccess || function () { };

                // trigger loggined finished event
                if (context !== null && typeof this.props.onSuccess === "function")
                    onSuccess(context.getCredentials());
                this._lock = false;
            })
            .catch(err => {
                log.error(err);
                throw new Error("Failed to acquire token for resources", err.stack);
            });
    }
}
