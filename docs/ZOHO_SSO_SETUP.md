# Zoho OAuth Configuration Guide

## Current Implementation

The CRM now supports Zoho OAuth authentication with the following features:

### ✅ Implemented Features:
1. **Persistent Sign-In**: Users won't see the consent screen on every login
2. **Domain Restriction**: Optional email domain validation for organization-only access
3. **Automatic User Creation**: New users are automatically created with USER role

## Configuration Options

### 1. Remove Forced Consent (Already Implemented)

The `prompt: "consent"` parameter has been removed from the OAuth URL, allowing Zoho to remember user consent.

**Result**: Users only see the consent screen once, then can sign in seamlessly.

---

### 2. Organization-Only Access (Domain Restriction)

Restrict sign-ins to your organization's email domain(s).

#### Backend Environment Variables:

Add to your `.env` (local) and Fly.io secrets (production):

```bash
# Comma-separated list of allowed email domains
ALLOWED_EMAIL_DOMAINS=clynepaper.com,clynepaperltd.co.zw

# Optional: Pre-fill the email domain on Zoho login page
ZOHO_DOMAIN_HINT=clynepaper.com
```

#### Set Production Secrets:

```bash
fly secrets set ALLOWED_EMAIL_DOMAINS="clynepaper.com,clynepaperltd.co.zw" -a clyne-paper-crm-backend
fly secrets set ZOHO_DOMAIN_HINT="clynepaper.com" -a clyne-paper-crm-backend
```

**Behavior**:
- ✅ Users with `@clynepaper.com` or `@clynepaperltd.co.zw` emails can sign in
- ❌ Users with other domains are redirected to login with an error message
- If `ALLOWED_EMAIL_DOMAINS` is not set, any Zoho user can sign in (current behavior)

---

## Zoho SSO (Enterprise Single Sign-On)

For true SSO where users don't even see a Zoho login page:

### Requirements:

#### 1. **Zoho Subscription**:
- **Zoho One** (recommended) - Full suite with SSO
- **Zoho Workplace** - Email + collaboration with SSO
- **Minimum Tier**: Standard or Professional plans

#### 2. **Organization Setup**:
- Verified organization in Zoho
- Custom domain verified (e.g., clynepaper.com)
- Admin access to Zoho organization settings

#### 3. **SSO Configuration** (in Zoho Console):

##### Option A: SAML-based SSO
1. Go to Zoho Admin Console → Security & Compliance → Single Sign-On
2. Configure SAML settings:
   - **Entity ID**: `https://clyne-paper-crm-backend.fly.dev`
   - **ACS URL**: `https://clyne-paper-crm-backend.fly.dev/api/auth/zoho/saml/callback`
   - **Attribute Mapping**: Email, Name, etc.

##### Option B: OAuth with Organization Consent
1. In Zoho API Console, set OAuth client to "Published" status
2. Enable "Organization Internal" option
3. Pre-authorize the app for all organization users
4. Users in your org won't see consent screen

### Implementation Steps for SAML SSO:

If you want full SAML SSO (recommended for enterprises):

1. **Install SAML library**:
```bash
cd backend
npm install passport-saml
```

2. **Create SAML route** (new file: `backend/src/routes/auth-saml.ts`)
3. **Configure metadata exchange** with Zoho
4. **Update frontend** to use SAML login endpoint

**Estimated Implementation**: 2-4 hours

---

## Pricing Comparison (as of 2025)

### Zoho Workplace:
- **Standard**: $3/user/month - Includes SSO
- **Professional**: $6/user/month - Advanced SSO features

### Zoho One:
- **All Apps**: $45/user/month - Full SSO + all Zoho apps

For ~20 users:
- **Domain Restriction Only**: $0 (current implementation)
- **Zoho Workplace Standard**: $60/month ($720/year)
- **Zoho One**: $900/month ($10,800/year)

---

## Recommended Approach

### Phase 1 (Current - Free):
✅ Use OAuth with domain restriction
- Set `ALLOWED_EMAIL_DOMAINS` environment variable
- Users sign in with Zoho once, then seamlessly
- Works with free/basic Zoho accounts

### Phase 2 (If Budget Allows):
📋 Upgrade to Zoho Workplace Standard
- Get official SSO support
- Pre-authorize app for organization
- Better security and compliance

### Phase 3 (Enterprise):
🚀 Implement SAML SSO
- Zero-touch sign-in for users
- Centralized access management
- Full audit logs

---

## Current Configuration Summary

**Status**: Phase 1 (OAuth with Domain Restriction)

**What's Active**:
- ✅ Persistent sign-in (no repeated consent)
- ✅ Optional domain restriction via `ALLOWED_EMAIL_DOMAINS`
- ✅ Automatic user provisioning
- ✅ JWT-based session management

**Next Steps**:
1. Set `ALLOWED_EMAIL_DOMAINS` in production (if desired)
2. Test with your organization emails
3. Consider Zoho Workplace subscription for Phase 2

---

## Testing

### Test Domain Restriction:
```bash
# Set locally
echo "ALLOWED_EMAIL_DOMAINS=clynepaper.com" >> backend/.env

# Restart dev server
doppler run -- npm run dev

# Test with:
# - ✅ user@clynepaper.com (should work)
# - ❌ user@gmail.com (should be rejected)
```

---

## Support

For Zoho SSO setup assistance:
- Zoho Support: https://help.zoho.com
- Zoho Admin Console: https://admin.zoho.com
- OAuth Settings: https://api-console.zoho.com
