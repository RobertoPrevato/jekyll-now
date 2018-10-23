---
layout: post
title: Validating JSON web tokens (JWTs) from Azure AD, in Python
picture: https://raw.githubusercontent.com/RobertoPrevato/robertoprevato.github.io/1d37165f71e08223fdafd8340d0b8e3ad51fa6ad/images/posts/b2cjwtpy/post-banner.png
description: This post describes how to validate OAuth 2.0 JSON web tokens (JWTs) from Azure Active Directory (including B2C), using Python.
---

This post describes how to validate __JSON web tokens (JWTs)__ issued by __[Azure Active Directory B2C](https://docs.microsoft.com/en-us/azure/active-directory-b2c/active-directory-b2c-overview)__, using __Python__ and working with RSA public keys and discovery endpoints. 

It covers the following topics:

1. Quick introduction on Azure AD B2C
1. How to prepare an Azure B2C test environment and obtain JWTs
1. How to parse and generate JWTs with Python
1. How to obtain public RSA keys and other metadata from the issuer
1. How to use JWKS in Python
1. An example of JWT Bearer authentication in an async web framework

Instead, the knowledge of the following topics is assumed, and won't be covered here: 
* [What is JSON Web Token (JWT)](https://jwt.io/introduction/)
* [What is "Authorization: Bearer _token_" HTTP header](https://swagger.io/docs/specification/authentication/bearer-authentication/)
* [Basics about Azure and familiarity with the Azure portal](https://azure.microsoft.com/en-us/overview/what-is-azure/)
* Python basics

Even though this post speaks about [Azure Active Directory B2C](https://docs.microsoft.com/en-us/azure/active-directory-b2c/active-directory-b2c-overview), most of the knowledge here applies to any identity providers implementing [OpenID Connect](https://en.wikipedia.org/wiki/OpenID_Connect) and [OAuth 2.0](https://oauth.net/2/) standard. Inside this post, I abbreviate the name _"Azure Active Directory B2C"_ with _"Azure B2C"_, although a more proper abbreviation in written documentation is _"Azure AD B2C"_.



# Quick introduction on Azure AD B2C
Azure Active Directory B2C is an identity management service that enables interaction among the
organization using it and customers outside the organization _(Business to Customer)_, offering complex
features such as passwords management, support for multi-factor authentication, protection against denial-
of-service and password attacks, integration with popular identity providers (i.e. Facebook, Twitter),
regulatory compliant handling of customers sensitive information. Azure B2C includes handling of users journeys for _sign-up_, _sign-in_, _password recovery_, _profile editing_, and others such as _parental control_.

When starting using Azure B2C, the first things to learn are generally:
* how to register applications (such as web apps and native clients) and configure how they interact with each other
* how to configure user journeys, which are controlled by _policies_
* how to use built-in policies and web pages for sign-up and sign-in

This post covers these basics, since they are needed to obtain the JWTs we want to validate.

# How to prepare an Azure B2C test environment and obtain JWTs

## Use an instance of Azure B2C
I use Azure B2C at work, but for personal tests I created an instance using its free tier. A free tier can be used without charge, up to 50,000 users per month and 50,000 authentications per month, for testing purposes. 

![Azure B2C Free Trial](https://raw.githubusercontent.com/RobertoPrevato/robertoprevato.github.io/17c96fd712dbde2c1f4b23c5b045788fc272da27/images/posts/b2cjwtpy/azureb2cfreetrial.png)

For information on how to create an Azure B2C service (called tenant) and link it to an Azure subscription, please refer to official documentation: 
* [https://docs.microsoft.com/en-us/azure/active-directory-b2c/tutorial-create-tenant](https://docs.microsoft.com/en-us/azure/active-directory-b2c/tutorial-create-tenant).

All details are not covered here, since they would just be a dull repetition of what can be found in the official documentation.

---
The configuration page of an Azure B2C looks like in the picture below, presenting links to handle _Applications_, _Identity providers_, _User attributes_, _Users_, _Audit logs_ and _policies_. To cover the scope of this post, we only need to configure one application, one policy for _sign-up and sign-in_ and one user account.

![New B2C tenant](https://raw.githubusercontent.com/RobertoPrevato/robertoprevato.github.io/master/images/posts/b2cjwtpy/new-b2c-tenant.png)

## Create an app registration
The next step consists in registering a new application. It is called "app registration" because it refers to metadata: it's the identity of an application in the context of the organization. In other words, this is not a place to _host_ applications, but to handle their identity.
To create an app registration inside the Azure Portal, it's necessary  navigate to **Applications** and click on the **+ Add** button. For this tutorial, do the following:

* Choose a name as desired
* Enable web app / web api
* Configure as reply url [https://jwt.ms](https://jwt.ms), which is a web page from Microsoft to inspect JWTs, this is useful for our purpose
* Leave implicit flow enabled
* Click on _Create_ button to complete

![App registration](https://raw.githubusercontent.com/RobertoPrevato/robertoprevato.github.io/b8ba32eff0a18f1695c95411c8a3f03243623c12/images/posts/b2cjwtpy/new-app.png)

Once created, an application is assigned with an id (not surprising), in UUID format. 

## Create a policy for sign-up and sign-in
To create a policy for account creation (sign-up) and login (sign-in), click on **Sign-up or sign-in policies** and click on the **+ Add** button.

![Creating a policy 1](https://raw.githubusercontent.com/RobertoPrevato/robertoprevato.github.io/12626c1de8290a4a36c23fbc6c0e194d49a195ad/images/posts/b2cjwtpy/policy-1.png)

Select:
* a name as desired
* _Local Account_ identity provider with _Email signup_ under "Identity Providers"
* select _Email Address_, _Given Name_, and _Surname_ under "Sign-up attributes", which are required input when a user creates a new account
* select _Email Address_, _Given Name_, _Surname_, _User is new_, and _User's Object ID_ under "Application claims", which are claims included in issued JWT

![Creating a policy 4](https://raw.githubusercontent.com/RobertoPrevato/robertoprevato.github.io/12626c1de8290a4a36c23fbc6c0e194d49a195ad/images/posts/b2cjwtpy/policy-4.png)

Then, click on _Create_ button to complete.

## Create a user account
It is possible to create a user account using the _Users_ tab, but it is more interesting to use the sign-up page provided by the policy that was just configured. To do so, navigate to policies and click on the one that was created, going to its blade.

![Policy details page](https://raw.githubusercontent.com/RobertoPrevato/robertoprevato.github.io/12626c1de8290a4a36c23fbc6c0e194d49a195ad/images/posts/b2cjwtpy/policy-6.png)

From this point is possible to test the user journeys offered by the policy, clicking the button **Run now**. This button opens a new browser tab on the login page: this is the place where, a web application of yours, would direct the clients for login. Note the input settings: 

* _Select application_: a policy can be used with any application configured in app registrations
* _Select reply url_: this depends on the configuration of selected application
* _Select domain_: new hostname (tenant_name.b2clogin.com) or _login.microsoftonline.com_, which is on track of deprecation 

----
Click on "Sign up now" link to navigate to the account creation page.

![Built-in sign-up page](https://raw.githubusercontent.com/RobertoPrevato/robertoprevato.github.io/12626c1de8290a4a36c23fbc6c0e194d49a195ad/images/posts/b2cjwtpy/sign-up-0.png)

The built-in sign-up user journey requires sending a verification code to the inserted email address (to verify ownership of the typed email address), adding passwords and the fields specified in "Sign-up attributes". This journey might be too complex for some users, in such cases, it is possible to create custom account creation pages by altering XML configuration of policies.

After account creation, the browser is redirected to the *reply_url* chosen earlier, in this case https://jwt.ms, including an *id_token* as hash parameter. The page at jwt.ms reads this token and displays it on the front-end.

![JWT ms](https://raw.githubusercontent.com/RobertoPrevato/robertoprevato.github.io/12626c1de8290a4a36c23fbc6c0e194d49a195ad/images/posts/b2cjwtpy/jwt-new-user.png)

Using the sign-in page is possible to obtain JWTs and copy them from jwt.ms for testing purpose. Another option, useful to obtain JWTs without interacting with a login page, is to configure a policy using _Resource Owner Password Credentials Grant_ flow, and use a tool like _Postman_ to make web requests to obtain access tokens by username and password. This is not covered here, but is described very well here:
* [https://blogs.msdn.microsoft.com/aaddevsup/2018/06/13/testing-b2c-resource-owner-password-credentials-ropc-policies-using-postman/](https://blogs.msdn.microsoft.com/aaddevsup/2018/06/13/testing-b2c-resource-owner-password-credentials-ropc-policies-using-postman/)

Now that we can obtain JWTs from Azure, let's see how to handle them in Python.

# How to parse and generate JWTs with Python
My favorite library to handle JWTs in Python is [PyJWT](https://pyjwt.readthedocs.io/en/latest/), which is sponsored by [OAuth0](https://auth0.com/overview). It's well documented an user friendly. A basic example, using symmetric encryption ([HS256](https://en.wikipedia.org/wiki/JSON_Web_Token)) to encode and decode JWTs, is as follows:

```python
import jwt

secret_key = 'secret_key_this_is_just_an_example'

# create a JWT with desired payload
encoded_jwt = jwt.encode({'some': 'payload'}, secret_key, algorithm='HS256')

# decode
jwt.decode(encoded_jwt, secret_key, algorithms=['HS256']) # --> {'some': 'payload'}
```

Symmetric encryption means that the same secret is used to sign JWTs and to verify them, meaning that both the service that is issuing JWTs and the service that is validating them need to share the same secret.

Asymmetric cryptography is more flexible, because only the owner of the private key can create and sign JWTs (issuer), while public keys are published and accessible for any service that need to verify the authenticity of JWTs. Typical cryptographic algorithms used for JWTs are HMAC with SHA-256 (HS256) and RSA signature with SHA-256 (RS256): the first is symmetric, the second asymmetric.

A simple demonstration of using PyJWT with RS256, is as follows:

1. create a private and public RSA keys using `ssh-keygen -t rsa` command, call the key file "key"
1. run the code below

```python
import jwt

payload = {'foo': 'Power'}

# encode, signing with private key
with open('key', 'r') as pemfile:
    keystring = pemfile.read()
    token = jwt.encode(payload, keystring, algorithm='RS256')
    print('[*] Encoded: ', token)

# decode, verifying with public key
with open('key.pub', 'r') as pemfile:
    keystring = pemfile.read()
    payload = jwt.decode(token, keystring, verify=True)
    print('[*] Decoded: ', payload)
```
##### Thanks to [Ryu_hayabusa in StackOverflow](https://stackoverflow.com/questions/29567905/how-to-verify-a-jwt-using-python-pyjwt-with-a-public-pem-cert)

# How to obtain public RSA keys and other metadata from the issuer
Knowing how to verify JWTs with public RSA keys, the next question is: _how to obtain public RSA keys from Azure AD B2C?_

Digging into the documentation, and knowing that Azure B2C follows [OpenID Connect (OIDC)](https://openid.net/connect/faq/) standard, it's easy to find the endpoints for _OpenID Connect_ discovery documents:

|         Context          |                                           Discovery endpoint                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------- |
| Common for all tenants   | https://login.microsoftonline.com/common/.well-known/openid-configuration                               |
| Specific tenant, with id | https://login.microsoftonline.com/9c2984ff-d596-4e5c-8e74-672be7b592e3/.well-known/openid-configuration |

These URLs refer to metadata that looks as follows:

```json
{
  "authorization_endpoint": "https://login.microsoftonline.com/9c2984ff-d596-4e5c-8e74-672be7b592e3/oauth2/authorize",
  "token_endpoint": "https://login.microsoftonline.com/9c2984ff-d596-4e5c-8e74-672be7b592e3/oauth2/token",
  "token_endpoint_auth_methods_supported": [
    "client_secret_post",
    "private_key_jwt",
    "client_secret_basic"
  ],
  "jwks_uri": "https://login.microsoftonline.com/common/discovery/keys",
  "response_modes_supported": [
    "query",
    "fragment",
    "form_post"
  ],
  "subject_types_supported": [
    "pairwise"
  ],
  "id_token_signing_alg_values_supported": [
    "RS256"
  ],
  "http_logout_supported": true,
  "frontchannel_logout_supported": true,
  "end_session_endpoint": "https://login.microsoftonline.com/9c2984ff-d596-4e5c-8e74-672be7b592e3/oauth2/logout",
  "response_types_supported": [
    "code",
    "id_token",
    "code id_token",
    "token id_token",
    "token"
  ],
  "scopes_supported": [
    "openid"
  ],
  "issuer": "https://sts.windows.net/9c2984ff-d596-4e5c-8e74-672be7b592e3/",
  "claims_supported": [
    "sub",
    "iss",
    "cloud_instance_name",
    "cloud_instance_host_name",
    "cloud_graph_host_name",
    "msgraph_host",
    "aud",
    "exp",
    "iat",
    "auth_time",
    "acr",
    "amr",
    "nonce",
    "email",
    "given_name",
    "family_name",
    "nickname"
  ],
  "microsoft_multi_refresh_token": true,
  "check_session_iframe": "https://login.microsoftonline.com/9c2984ff-d596-4e5c-8e74-672be7b592e3/oauth2/checksession",
  "userinfo_endpoint": "https://login.microsoftonline.com/9c2984ff-d596-4e5c-8e74-672be7b592e3/openid/userinfo",
  "tenant_region_scope": "EU",
  "cloud_instance_name": "microsoftonline.com",
  "cloud_graph_host_name": "graph.windows.net",
  "msgraph_host": "graph.microsoft.com",
  "rbac_url": "https://pas.windows.net"
}
```

When looking for RSA public keys, we are interested in `jwks_uri` parameter, in this case:
 
```json
"jwks_uri": "https://login.microsoftonline.com/common/discovery/keys",
```

[JSON Web Key Set (JWKS)](https://auth0.com/docs/jwks) is a specification describing how public keys should be published. JWKS defines a JSON structure that **must** contain a "keys" property, array of objects representing cryptographic keys. These objects must in turn describe structures specified by [JSON Web Key (JWK)](https://auth0.com/docs/jwks) specification.

A JWKS from Azure B2C, with a single JWK, look like this:

```json
{
  "keys": [
    {
      "kid": "X5eXk4xyojNFum1kl2Ytv8dlNP4-c57dO6QGTVBwaNk",
      "nbf": 1493763266,
      "use": "sig",
      "kty": "RSA",
      "e": "AQAB",
      "n": "tVKUtcx_n9rt5afY_2WFNvU6PlFMggCatsZ3l4RjKxH0jgdLq6CScb0P3ZGXYbPzXvmmLiWZizpb-h0qup5jznOvOr-Dhw9908584BSgC83YacjWNqEK3urxhyE2jWjwRm2N95WGgb5mzE5XmZIvkvyXnn7X8dvgFPF5QwIngGsDG8LyHuJWlaDhr_EPLMW4wHvH0zZCuRMARIJmmqiMy3VD4ftq4nS5s8vJL0pVSrkuNojtokp84AtkADCDU_BUhrc2sIgfnvZ03koCQRoZmWiHu86SuJZYkDFstVTVSR0hiXudFlfQ2rOhPlpObmku68lXw-7V-P7jwrQRFfQVXw"
    }
  ]
}
```

The [parameters included](https://tools.ietf.org/html/rfc7517) in the JWK are, in this case:

|  Name   |                          Description                           |
| ------- | -------------------------------------------------------------- |
| **kid** | Key ID                                                         |
| **nbf** | Not before, the time before which the JWK must not be accepted |
| **use** | Public key use: signing in this case                           |
| **kty** | Key type, RSA in this case                                     |
| **e**   | Public exponent of RSA key                                     |
| **n**   | Public modulus of RSA key                                      |

Something not obvious, in Azure B2C, is that public keys may depend on the policy being used. To find the public keys for a specific tenant and policy, use the following URL:

* https://login.microsoftonline.com/{TENANT_ID}/discovery/keys?p={NAME_OF_POLICY}
* [Example](https://login.microsoftonline.com/9c2984ff-d596-4e5c-8e74-672be7b592e3/discovery/keys?p=B2C_1_DefaultSignUpSignIn).

---

As we are getting closer to the objective of validating JWTs issued by Azure B2C in Python, the next question is: _how to parse the JWK and obtain a public RSA key using public exponent and modulus?_

# How to use JWKS in Python
There are several libraries for cryptography in Python, but my favorite one is... [cryptography](https://cryptography.io/en/latest/). Like PyJWT, is well documented, user-friendly, and complete. The documentation about RSA is found under _"Hazardous Materials"_ section, yep we're in the right place!

![Cryptography](https://raw.githubusercontent.com/RobertoPrevato/robertoprevato.github.io/b623c4d82ba786380ec0cced742be5f36066dcad/images/posts/b2cjwtpy/cryptography.png)

Cryptography library includes a [RSAPublicNumbers](https://cryptography.io/en/latest/hazmat/primitives/asymmetric/rsa/?highlight=publicnumbers#numbers) class that does exactly what we need: given public exponent _e_ and modulus _n_, provides an object that let obtain an high-level implementation of RSA public key, that can be used to verify JWTs.

Thanks to `cryptography` and the numerous examples in the internet, obtaining a public key from JWK is quite simple:

```python
import base64
from cryptography.hazmat.primitives.asymmetric.rsa import RSAPublicNumbers
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import serialization


def ensure_bytes(key):
    if isinstance(key, str):
        key = key.encode('utf-8')
    return key


def decode_value(val):
    decoded = base64.urlsafe_b64decode(ensure_bytes(val) + b'==')
    return int.from_bytes(decoded, 'big')


def rsa_pem_from_jwk(jwk):
    return RSAPublicNumbers(
        n=decode_value(jwk['n']),
        e=decode_value(jwk['e'])
    ).public_key(default_backend()).public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )
```

Finally, here a full example of JWT validation, including a diagram:

![JWT validation diagram](https://raw.githubusercontent.com/RobertoPrevato/robertoprevato.github.io/6eff3bd1923603fa751bdda6039f1c434a23d921/images/posts/b2cjwtpy/jwt_validation.png)

```python
import jwt
from jwksutils import rsa_pem_from_jwk

# To run this example, follow the instructions in the project README

# obtain jwks as you wish: configuration file, HTTP GET request to the endpoint returning them;
jwks = {
    "keys": [
        {
            "kid": "X5eXk4xyojNFum1kl2Ytv8dlNP4-c57dO6QGTVBwaNk",
            "nbf": 1493763266,
            "use": "sig",
            "kty": "RSA",
            "e": "AQAB",
            "n": "tVKUtcx_n9rt5afY_2WFNvU6PlFMggCatsZ3l4RjKxH0jgdLq6CScb0P3ZGXYbPzXvmmLiWZizpb-h0qup5jznOvOr-Dhw9908584BSgC83YacjWNqEK3urxhyE2jWjwRm2N95WGgb5mzE5XmZIvkvyXnn7X8dvgFPF5QwIngGsDG8LyHuJWlaDhr_EPLMW4wHvH0zZCuRMARIJmmqiMy3VD4ftq4nS5s8vJL0pVSrkuNojtokp84AtkADCDU_BUhrc2sIgfnvZ03koCQRoZmWiHu86SuJZYkDFstVTVSR0hiXudFlfQ2rOhPlpObmku68lXw-7V-P7jwrQRFfQVXw"
        }
    ]
}

# configuration, these can be seen in valid JWTs from Azure B2C:
valid_audiences = ['d7f48c21-2a19-4bdb-ace8-48928bff0eb5'] # id of the application prepared previously
issuer = 'https://ugrose.b2clogin.com/9c2984ff-d596-4e5c-8e74-672be7b592e3/v2.0/' # iss


class InvalidAuthorizationToken(Exception):
    def __init__(self, details):
        super().__init__('Invalid authorization token: ' + details)


def get_kid(token):
    headers = jwt.get_unverified_header(token)
    if not headers:
        raise InvalidAuthorizationToken('missing headers')
    try:
        return headers['kid']
    except KeyError:
        raise InvalidAuthorizationToken('missing kid')


def get_jwk(kid):
    for jwk in jwks.get('keys'):
        if jwk.get('kid') == kid:
            return jwk
    raise InvalidAuthorizationToken('kid not recognized')


def get_public_key(token):
    return rsa_pem_from_jwk(get_jwk(get_kid(token)))


def validate_jwt(jwt_to_validate):
    public_key = get_public_key(jwt_to_validate)

    decoded = jwt.decode(jwt_to_validate,
                         public_key,
                         verify=True,
                         algorithms=['RS256'],
                         audience=valid_audiences,
                         issuer=issuer)

    # do what you wish with decoded token:
    # if we get here, the JWT is validated
    print(decoded)


def main():
    import sys
    import traceback

    if len(sys.argv) < 2:
        print('Please provide a JWT as script argument')
        return
    
    jwt = sys.argv[1]

    if not jwt:
        print('Please pass a valid JWT')

    try:
        validate_jwt(jwt)
    except Exception as ex:
        traceback.print_exc()
        print('The JWT is not valid!')
    else:
        print('The JWT is valid!')


if __name__ == '__main__':
    main()

```

Using this knowledge, I implemented JWT Bearer validation for a web service. I hope some developers will find this post useful when integrating with an identity provider using OpenID Connect.

That's all for today!
