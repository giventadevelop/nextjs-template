#!/usr/bin/env node

import Stripe from 'stripe';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY not found in environment variables');
  console.log('Please add STRIPE_SECRET_KEY to your .env.local file');
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY);

async function listRegisteredDomains() {
  try {
    console.log('📋 Currently registered Google Pay domains:');
    console.log('===========================================\n');

    const domains = await stripe.paymentMethodDomains.list({
      limit: 100,
    });

    if (domains.data.length === 0) {
      console.log('   No domains currently registered');
      console.log('\n💡 To register a domain, run:');
      console.log('   node scripts/register-google-pay-domain.mjs yourdomain.com');
    } else {
      console.log(`   Found ${domains.data.length} registered domain(s):\n`);
      domains.data.forEach((domain, index) => {
        const status = domain.status === 'active' ? '✅' : '⏳';
        const created = new Date(domain.created * 1000).toLocaleDateString();
        console.log(`   ${index + 1}. ${status} ${domain.domain_name}`);
        console.log(`      Status: ${domain.status}`);
        console.log(`      Created: ${created}`);
        console.log(`      ID: ${domain.id}\n`);
      });

      console.log('💡 To register additional domains, run:');
      console.log('   node scripts/register-google-pay-domain.mjs yourdomain.com');
    }

    return domains.data;
  } catch (error) {
    console.error('❌ Error listing domains:', error.message);
    console.log('\n💡 Make sure your Stripe account has Google Pay enabled');
    return [];
  }
}

// Run the script
listRegisteredDomains().catch(console.error);
