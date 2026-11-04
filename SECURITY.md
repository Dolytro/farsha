# Security policy

## Reporting a vulnerability

Please do **not** open a public issue for a security problem.

Report it privately through GitHub: go to the **Security** tab of this repository and choose
**Report a vulnerability** (private vulnerability reporting). Include what you found, how to reproduce it,
and the impact you expect.

You can expect a first reply within a few days. Once a fix is released we are happy to credit you if you wish.

## Scope

Farsha is a static web app with no backend. Designs are stored in each user's own Google Drive, and the app
treats opened or shared files as untrusted input. Reports we care most about:

- Script injection or other unsafe handling of data in a shared or imported `.farsha` file
- Leaking a user's Google access token or Drive data
- Problems in how share links read files

## Secrets

The Google OAuth client ID and browser API key in the built app are public by design and restricted to the
site's origin. There is no client secret. If you find any real secret committed to this repository, please
report it privately as above.
