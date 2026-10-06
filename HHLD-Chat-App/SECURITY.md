# End-to-end message encryption

New messages are encrypted in each browser with AES-GCM. Each message key is
wrapped with the sender's and receiver's RSA-OAEP public keys, so the chat
backend, Redis, and MongoDB receive ciphertext. The auth service stores public
keys and private keys encrypted with a key derived from the account password;
the unlocked private key is kept in the browser session.

Users must log in with their account password to unlock their key. Losing that
password or the encrypted private-key record makes existing messages
unrecoverable. Password-derived key wrapping also means a weak password could
be guessed offline if the encrypted key record is exposed.

Messages stored before this feature was deployed remain plaintext; this
change does not migrate old records. Sender, receiver, and message
timing/size metadata are not encrypted. Production deployments must use HTTPS
and protect the web application against script injection, since malicious
JavaScript running in the app origin could access an unlocked key.

This protects against passive database/Redis readers. It does not protect
against a malicious or compromised auth server that substitutes public keys
or serves hostile client code. Verify users' key fingerprints out-of-band
when protection against server-side impersonation is required.
