This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Test Redis with two local chat backends and Aiven (Windows)

Docker and a local Redis installation are not required. Run two copies of the
existing Node chat backend from the `backend` folder. Both load the same
MongoDB settings from `backend/.env` and connect to the same Aiven Redis
service. The backend uses TLS by default; **do not set `REDIS_TLS=false` for
Aiven**.

In Aiven Console, open your Redis service and copy its **host**, **port**,
**username**, and **password** from the service connection details. Use only
the hostname for `REDIS_HOST` (no `rediss://` prefix). Do not paste the
password into source files, README, or a command line.

Open separate PowerShell terminals. In each backend terminal, set these
variables, entering your Aiven values when prompted:

```powershell
$env:REDIS_HOST = Read-Host "Aiven Redis host"
$env:REDIS_PORT = Read-Host "Aiven Redis port"
$env:REDIS_USER = Read-Host "Aiven Redis username"
$redisCredential = Get-Credential -UserName $env:REDIS_USER -Message "Enter the Aiven Redis password"
$env:REDIS_PWD = $redisCredential.GetNetworkCredential().Password
$redisCredential = $null
```

The password prompt hides what you type and keeps the secret out of the
command history. The running Node process needs the password in its
environment to connect.

1. Start the authentication service in a separate terminal:

   ```powershell
   Set-Location C:\Users\User\Chat-system\HHLD-Chat-App\auth-backend
   npm run devstart
   ```

   It listens on port `8081`. Both chat clients use this same service to log
   in.

2. Start chat backend 1 on port `8080`. In its terminal, run the Aiven
   environment setup shown above, then:

   ```powershell
   Set-Location C:\Users\User\Chat-system\HHLD-Chat-App\backend
   npm run devstart
   ```

3. Start chat backend 2 on port `8084`. In a second backend terminal, run the
   same Aiven environment setup, then:

   ```powershell
   Set-Location C:\Users\User\Chat-system\HHLD-Chat-App\backend
   $env:PORT = "8084"
   npm run devstart
   ```

   Only the backend port differs; both processes must use the same Aiven
   Redis settings. The second process also loads the same MongoDB URI from
   `backend/.env`.

4. Start the first frontend on port `3000` in another terminal:

   ```powershell
   Set-Location C:\Users\User\Chat-system\HHLD-Chat-App\client
   npm run dev
   ```

5. Start this frontend on port `3001` in another terminal:

   ```powershell
   Set-Location C:\Users\User\Chat-system\HHLD-Chat-App\client_2
   $env:NEXT_PUBLIC_BE_HOST = "http://localhost"
   npm run dev -- -p 3001
   ```

### Cross-backend test

Open `http://localhost:3000` in one browser profile and
`http://localhost:3001` in a separate profile (or a private window). Sign in
as two different users; localhost auth cookies are shared across ports within
one browser profile. Both users must have logged in through the updated app
at least once to register their encryption keys.

Select each other and send a message. The sender connects to backend 1 and the
receiver to backend 2; backend 1 publishes to Redis and backend 2 delivers
the message. It is also saved in the shared MongoDB conversation.

If a connection fails, verify that the Aiven service is running, the client
IP is allowed by its network access rules, and the connection values are
correct. Keep TLS enabled and never commit credentials.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
