# Backend WebSocket Deployment Guide for Render

## 🚀 **Deploy Backend to Render with WebSocket Support**

### 1. Create Render Web Service

**Service Configuration:**
```
Name: myquro-backend
Environment: Node
Build Command: npm install && npm run build
Start Command: npm start
Root Directory: backend/
```

### 2. Environment Variables (CRITICAL)

```
NODE_ENV=production
PORT=10000
DATABASE_URL=postgresql://[your-neon-db-connection-string]
BETTER_AUTH_SECRET=[generate-32-char-random-string]
BETTER_AUTH_URL=https://myquro-backend.onrender.com
CLIENT_URL=https://myquro.com
GOOGLE_CLIENT_ID=[your-google-oauth-client-id]
GOOGLE_CLIENT_SECRET=[your-google-oauth-client-secret]
```

### 3. WebSocket Configuration

The backend is already configured with:
- ✅ **Socket.IO server** initialized in production
- ✅ **Session authentication** for secure connections
- ✅ **CORS enabled** for WebSocket connections
- ✅ **Room-based messaging** for restaurant-specific events

### 4. Testing Backend Deployment

#### Health Check:
```bash
curl https://myquro-backend.onrender.com/health
```

Expected response:
```json
{
  "ok": true,
  "timestamp": "2026-01-24T...",
  "environment": "production",
  "websocket": "enabled",
  "version": "1.0.0"
}
```

#### WebSocket Test:
```bash
# Install wscat for testing
npm install -g wscat

# Test WebSocket connection
wscat -c wss://myquro-backend.onrender.com
```

### 5. Order WebSocket Events

The backend emits these events for orders:

- **`order-created`**: When new order is placed
  ```javascript
  {
    orderId: "order_123",
    restaurantId: "rest_456",
    tableSessionId: "session_789",
    status: "placed",
    totalAmount: 25.99,
    itemCount: 3,
    createdAt: "2026-01-24T..."
  }
  ```

- **`order-updated`**: When order status changes
  ```javascript
  {
    orderId: "order_123",
    status: "preparing",
    updatedAt: "2026-01-24T..."
  }
  ```

### 6. Frontend Configuration

Update your frontend to connect to Render backend:

```bash
# In frontend/.env.local or Render environment
NEXT_PUBLIC_BACKEND_URL=https://myquro-backend.onrender.com
```

### 7. WebSocket Connection Flow

1. **Frontend connects** to `wss://myquro-backend.onrender.com`
2. **Authentication** via session token
3. **Join restaurant room** with `join-restaurant` event
4. **Receive real-time events** for orders, reservations, payments

### 8. Monitoring & Debugging

#### Render Logs:
- Check service logs for WebSocket connection events
- Monitor for authentication failures
- Watch for room joining confirmations

#### Common Issues:
- **Authentication failed**: Check `BETTER_AUTH_SECRET` and session tokens
- **CORS blocked**: Verify `CLIENT_URL` matches frontend domain
- **Connection timeout**: Ensure Render service is running
- **No events received**: Check restaurant room joining

### 9. Performance Expectations

- **Connection latency**: < 100ms globally
- **Message delivery**: < 50ms within same region
- **Concurrent connections**: Scales with Render tier
- **Uptime**: 99.9% SLA

### 10. Production Checklist

- [ ] Render web service created
- [ ] Environment variables set correctly
- [ ] Database connection working
- [ ] Health endpoint responding
- [ ] WebSocket connections established
- [ ] Order events emitting properly
- [ ] Frontend connected to Render backend
- [ ] Real-time order updates tested

---

**Your backend is now ready for Render deployment with full WebSocket support!** 🎉</content>
<parameter name="filePath">d:\codes\PROJECTS\mq-prod\RENDER_BACKEND_WEBSOCKET_GUIDE.md