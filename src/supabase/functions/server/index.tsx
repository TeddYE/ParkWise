import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from "npm:@supabase/supabase-js";
import * as kv from './kv_store.tsx';

const app = new Hono();

// Configure CORS for all routes
app.use('*', cors({
  origin: '*',
  allowHeaders: ['*'],
  allowMethods: ['*'],
}));

app.use('*', logger(console.log));

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// User signup endpoint
app.post('/make-server-05f335a7/signup', async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    
    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      console.log(`Error creating user during signup: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }

    // Store user subscription info in KV store
    await kv.set(`user:${data.user.id}:subscription`, {
      subscription: 'free',
      createdAt: new Date().toISOString(),
    });

    return c.json({ 
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name,
        subscription: 'free'
      }
    });
  } catch (error) {
    console.log(`Server error during signup: ${error}`);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get user subscription status
app.get('/make-server-05f335a7/user/:userId/subscription', async (c) => {
  try {
    const userId = c.req.param('userId');
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (!user || user.id !== userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const subscriptionData = await kv.get(`user:${userId}:subscription`);
    
    return c.json({
      subscription: subscriptionData?.subscription || 'free',
      subscriptionExpiry: subscriptionData?.subscriptionExpiry,
    });
  } catch (error) {
    console.log(`Error fetching user subscription: ${error}`);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Update user subscription
app.post('/make-server-05f335a7/user/:userId/subscription', async (c) => {
  try {
    const userId = c.req.param('userId');
    const { subscription, paymentIntentId } = await c.req.json();
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (!user || user.id !== userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // For premium subscription, set expiry to 1 year from now
    const subscriptionData = {
      subscription,
      updatedAt: new Date().toISOString(),
      ...(subscription === 'premium' && {
        subscriptionExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        paymentIntentId,
      })
    };

    await kv.set(`user:${userId}:subscription`, subscriptionData);
    
    return c.json({ success: true, subscription: subscriptionData });
  } catch (error) {
    console.log(`Error updating user subscription: ${error}`);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Create payment intent (simplified - in production would integrate with Stripe)
app.post('/make-server-05f335a7/create-payment-intent', async (c) => {
  try {
    const { amount, currency = 'sgd' } = await c.req.json();
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // In a real app, this would create a Stripe payment intent
    // For demo purposes, we'll return a mock payment intent
    const paymentIntentId = `pi_mock_${Date.now()}`;
    
    return c.json({
      paymentIntentId,
      clientSecret: `${paymentIntentId}_secret`,
      amount,
      currency,
    });
  } catch (error) {
    console.log(`Error creating payment intent: ${error}`);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

Deno.serve(app.fetch);