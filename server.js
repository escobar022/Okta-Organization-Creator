const express = require("express");
const app = express();
const env = require("dotenv");
const path = require("path");
env.config();
const okta = require('@okta/okta-sdk-nodejs');

const client = new okta.Client({
  orgUrl: process.env.ORGANIZATION,
  token: process.env.TOKEN    // Obtained from Developer Dashboard
});

app.get("/", (req,res) => {
  res.sendFile(path.join(__dirname, "pages", "index.html"));
})


/**
 * @requires email email of the user to be created
 * @requires organization name of the organization to be created
 * @requires tenant name of your Auth0 tenant
 */
app.get("/signup", (req, res) => {
  const password = createPassword();
  const newUser = {
    profile: {
      firstName: req.query.first || "Example",
      lastName: req.query.last || "User",
      email: req.query.email,
      login: req.query.email
    },
    credentials: {
      password: {
        value: password
      }
    }
  };

  client.createUser(newUser)
    .then(user => {
      const newGroup = {
        profile: {
          name: req.query.organization
        }
      };

      client.createGroup(newGroup)
        .then(group => {
          user.addToGroup(group.id)
            .then(() => {
              const app = {
                name: "oidc_client",
                label: req.query.organization + ' SSO App',
                signOnMode: 'OPENID_CONNECT',
                "credentials": {
                  "oauthClient": {
                    "token_endpoint_auth_method": "client_secret_post"
                  }
                },
                settings: {
                  "oauthClient": {
                    "client_uri": "http://localhost:8080",
                    "redirect_uris": [
                      "https://" + req.query.tenant + "." + (req.query.region || "eu") + ".auth0.com/login/callback"
                    ],
                    "response_types": [
                      "id_token"

                    ],
                    "grant_types": [
                      "implicit"
                    ],
                    "application_type": "browser"
                  }
                }
              };

              client.createApplication(app)
                .then(application => {
                  client.createApplicationGroupAssignment(application.id, group.id);

                  res.send({
                    client_id: application.credentials.oauthClient.client_id,
                    client_secret: application.credentials.oauthClient.client_secret,
                    issuer_url: "https://tu-playground.okta.com/.well-known/openid-configuration",
                    user_mail: req.query.email,
                    user_pw: password
                  })
                });
            });







        });
    });

})

function createPassword() {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < 20; i++) {
    result += characters.charAt(Math.floor(Math.random() *
      charactersLength));
  }
  return result;
}

app.listen(3001, () => { console.log("Server running"); })