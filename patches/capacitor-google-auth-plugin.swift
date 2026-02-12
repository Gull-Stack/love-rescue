import Foundation
import Capacitor
import GoogleSignIn

/**
 * Please read the Capacitor iOS Plugin Development Guide
 * here: https://capacitor.ionicframework.com/docs/plugins/ios
 */
@objc(GoogleAuth)
public class GoogleAuth: CAPPlugin {
    var signInCall: CAPPluginCall!
    var googleSignIn: GIDSignIn!;
    var forceAuthCode: Bool = false;
    var additionalScopes: [String]!;

    func loadSignInClient (
        customClientId: String,
        customScopes: [String]
    ) {
        googleSignIn = GIDSignIn.sharedInstance;
        
        // GoogleSignIn 8.x: configure via GIDSignIn.sharedInstance.configuration
        let serverClientId = getServerClientIdValue();
        let config = GIDConfiguration(clientID: customClientId, serverClientID: serverClientId)
        googleSignIn.configuration = config
        
        // these are scopes granted by default by the signIn method
        let defaultGrantedScopes = ["email", "profile", "openid"];
        // these are scopes we will need to request after sign in
        additionalScopes = customScopes.filter {
            return !defaultGrantedScopes.contains($0);
        };

        forceAuthCode = getConfig().getBoolean("forceCodeForRefreshToken", false)

        NotificationCenter.default.addObserver(self, selector: #selector(handleOpenUrl(_ :)), name: Notification.Name(Notification.Name.capacitorOpenURL.rawValue), object: nil);
    }

    
    public override func load() {
    }

    @objc
    func initialize(_ call: CAPPluginCall) {
        guard let clientId = call.getString("clientId") ?? getClientIdValue() as? String else {
            NSLog("no client id found in config");
            call.resolve();
            return;
        }

        let customScopes = call.getArray("scopes", String.self) ?? (
            getConfigValue("scopes") as? [String] ?? []
        );

        forceAuthCode = call.getBool("grantOfflineAccess") ?? (
            getConfigValue("forceCodeForRefreshToken") as? Bool ?? false
        );
        
        self.loadSignInClient(
            customClientId: clientId,
            customScopes: customScopes
        )
        call.resolve();
    }

    @objc
    func signIn(_ call: CAPPluginCall) {
        signInCall = call;
        DispatchQueue.main.async {
            if self.googleSignIn.hasPreviousSignIn() && !self.forceAuthCode {
                self.googleSignIn.restorePreviousSignIn { user, error in
                    if let error = error {
                        self.signInCall?.reject(error.localizedDescription);
                        return;
                    }
                    self.resolveSignInCallWith(user: user!)
                }
            } else {
                guard let presentingVc = self.bridge?.viewController else {
                    self.signInCall?.reject("No presenting view controller");
                    return;
                }
                
                self.googleSignIn.signIn(withPresenting: presentingVc, hint: nil, additionalScopes: self.additionalScopes) { result, error in
                    if let error = error {
                        self.signInCall?.reject(error.localizedDescription, "\(error._code)");
                        return;
                    }
                    guard let user = result?.user else {
                        self.signInCall?.reject("No user returned");
                        return;
                    }
                    self.resolveSignInCallWith(user: user);
                }
            }
        }
    }

    @objc
    func refresh(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let user = self.googleSignIn.currentUser else {
                call.reject("User not logged in.");
                return
            }
            Task {
                do {
                    try await user.refreshTokensIfNeeded()
                    let authenticationData: [String: Any] = [
                        "accessToken": user.accessToken.tokenString,
                        "idToken": user.idToken?.tokenString ?? NSNull(),
                        "refreshToken": user.refreshToken.tokenString
                    ]
                    call.resolve(authenticationData);
                } catch {
                    call.reject(error.localizedDescription);
                }
            }
        }
    }

    @objc
    func signOut(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.googleSignIn.signOut();
        }
        call.resolve();
    }

    @objc
    func handleOpenUrl(_ notification: Notification) {
        guard let object = notification.object as? [String: Any] else {
            print("There is no object on handleOpenUrl");
            return;
        }
        guard let url = object["url"] as? URL else {
            print("There is no url on handleOpenUrl");
            return;
        }
        googleSignIn.handle(url);
    }
    
    
    func getClientIdValue() -> String? {
        if let clientId = getConfig().getString("iosClientId") {
            return clientId;
        }
        else if let clientId = getConfig().getString("clientId") {
            return clientId;
        }
        else if let path = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist"),
                let dict = NSDictionary(contentsOfFile: path) as? [String: AnyObject],
                let clientId = dict["CLIENT_ID"] as? String {
            return clientId;
        }
        return nil;
    }
    
    func getServerClientIdValue() -> String? {
        if let serverClientId = getConfig().getString("serverClientId") {
            return serverClientId;
        }
        return nil;
    }

    func resolveSignInCallWith(user: GIDGoogleUser) {
        var userData: [String: Any] = [
            "authentication": [
                "accessToken": user.accessToken.tokenString,
                "idToken": user.idToken?.tokenString ?? NSNull(),
                "refreshToken": user.refreshToken.tokenString
            ],
            "serverAuthCode": NSNull(),
            "email": user.profile?.email ?? NSNull(),
            "familyName": user.profile?.familyName ?? NSNull(),
            "givenName": user.profile?.givenName ?? NSNull(),
            "id": user.userID ?? NSNull(),
            "name": user.profile?.name ?? NSNull()
        ];
        if let imageUrl = user.profile?.imageURL(withDimension: 100)?.absoluteString {
            userData["imageUrl"] = imageUrl;
        }
        signInCall?.resolve(userData);
    }
}
