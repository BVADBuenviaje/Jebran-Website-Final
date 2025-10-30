# PayMongo Integration Setup

## Environment Variables

Add these environment variables to your `.env` file:

```bash
# PayMongo Configuration
PAYMONGO_SECRET_KEY=sk_test_your_secret_key_here
PAYMONGO_PUBLIC_KEY=pk_test_your_public_key_here
PAYMONGO_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Frontend URL (for redirects) - Vite default port
FRONTEND_URL=http://localhost:5173
```

## Frontend Environment Variables

Add to your frontend `.env` file:

```bash
VITE_PAYMONGO_PUBLIC_KEY=pk_test_your_public_key_here
```

## PayMongo Account Setup

1. **Create PayMongo Account**: Go to [PayMongo Dashboard](https://dashboard.paymongo.com/)
2. **Get API Keys**: 
   - Secret Key: Used for server-side operations
   - Public Key: Used for client-side operations
3. **How to Set Up PayMongo Webhook**:

   In your PayMongo dashboard, go to **"Developers" > "Webhooks" > "Create Webhook"**.

   - **URL to use:**  
   Use your backend's webhook endpoint. If you're running locally, you need a tool like [ngrok](https://ngrok.com/) to expose your local server to the internet.

    For production:
     ```
    https://yourdomain.com/api/inventory/webhook/paymongo/
     ```
    For local development (if using ngrok, example domain):
     ```
    https://your-ngrok-subdomain.ngrok.io/api/inventory/webhook/paymongo/
     ```

    - **Select Events:**  
      - `payment.paid`
      - `payment.refunded`
      - `payment.refund.updated`

   Make sure to copy the "Webhook Secret" value from your PayMongo dashboard and set it as `PAYMONGO_WEBHOOK_SECRET` in your backend `.env` file.


## Installation Steps

1. **Install Dependencies**:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Run Migrations**:
   ```bash
   python manage.py migrate inventory
   ```

3. **Install Frontend Dependencies** (Optional - we're using direct API calls):
   ```bash
   cd frontend
   # No additional packages needed - we use direct HTTP requests
   ```

## Testing

### Test Mode
- Use PayMongo test keys (start with `sk_test_` and `pk_test_`)
- Test GCash payments will redirect to PayMongo test environment

### Production Mode
- Use PayMongo live keys (start with `sk_live_` and `pk_live_`)
- Real GCash payments will process actual transactions

## API Endpoints

### New Endpoints Added:
- `POST /api/inventory/orders/{id}/create-gcash-payment/` - Create GCash payment intent
- `POST /api/inventory/orders/{id}/verify-payment/` - Verify payment status
- `POST /api/inventory/webhook/paymongo/` - PayMongo webhook handler

## Payment Flow

1. **Customer selects GCash** in checkout
2. **Order created** with `payment_method='GCash'` and `payment_status='Unpaid'`
3. **Redirect to payment page** (`/orders/{id}/payment`)
4. **Create payment intent** via PayMongo API
5. **Customer redirected** to GCash payment page
6. **Webhook receives** payment status updates
7. **Order updated** with payment status
8. **Sale record created** when payment succeeds

## Security Features

- **Webhook signature verification** to ensure requests are from PayMongo
- **User authentication** required for all payment operations
- **Order ownership validation** - users can only pay for their own orders
- **Admin permissions** for payment verification

## Error Handling

- **Network errors** are caught and displayed to users
- **Payment failures** are logged and tracked
- **Webhook failures** are logged for debugging
- **Invalid signatures** are rejected for security

## Monitoring

- **Payment status tracking** in order records
- **Webhook event logging** for debugging
- **Error logging** for failed payments
- **Sales record creation** for successful payments

---

## Local Webhook Testing with ngrok (Windows)

Use ngrok to securely expose your local Django server to the internet so PayMongo can deliver webhooks during development.

### 1) Install ngrok (Windows)

- Recommended: download the Windows installer from `https://ngrok.com/download` and run it.
- Or via Chocolatey:
  ```powershell
  choco install ngrok -y
  ```

### 2) Authenticate ngrok

Sign up and get your Authtoken from the ngrok dashboard, then run:

```powershell
ngrok config add-authtoken <YOUR_NGROK_AUTHTOKEN>
```

### 3) Run the Django server

```powershell
cd backend
python manage.py runserver 8000
```

### 4) Start an ngrok tunnel

In a new terminal:

```powershell
ngrok http http://localhost:8000
```

Copy the HTTPS forwarding URL shown, e.g. `https://abcd-1234.ngrok-free.app`.

### 5) Configure the PayMongo webhook URL

In the PayMongo Dashboard → Developers → Webhooks → Create Webhook, set:

- URL: `https://<your-ngrok-subdomain>.ngrok-free.app/api/inventory/webhook/paymongo/`
- Events: `payment.paid`, `payment.refunded`, `payment.refund.updated`

After creating the webhook, copy the generated Webhook Secret and set it in your backend environment:

```bash
PAYMONGO_WEBHOOK_SECRET=whsec_...
```

### 6) Notes and tips

- Keep the ngrok process running while testing; the URL changes each time unless you use a reserved domain (paid).
- Ensure your Django server is reachable on port 8000 or adjust the command accordingly.
- PayMongo requires HTTPS; always use the HTTPS ngrok URL.
- If you use a firewall or VPN, ensure outbound connections are allowed so PayMongo can reach your tunnel.
