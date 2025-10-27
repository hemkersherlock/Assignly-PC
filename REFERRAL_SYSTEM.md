# 🔗 Referral & Promo Link System

## Overview

Complete referral and promotional link tracking system for Assignly. Track clicks, signups, and orders with custom credit bonuses.

---

## 🚀 Features

### For Admins
- ✅ **Generate Referral Links** with custom credit bonuses (0-100 credits)
- ✅ **Real-time Tracking** of clicks, signups, and orders
- ✅ **Analytics Dashboard** with conversion rates
- ✅ **Activate/Deactivate Links** anytime
- ✅ **Copy Links** with one click

### For Students
- ✅ **Automatic Credit Bonus** when signing up with referral link
- ✅ **Visual Indicator** on login page showing available bonus
- ✅ **Persistent Tracking** - bonus applies even if they don't sign up immediately

---

## 📊 Admin Dashboard

### Location
Navigate to: **Admin → Referrals**

### Dashboard Metrics
- **Total Clicks** - How many people clicked your links
- **Signups** - How many actually created accounts
- **Orders** - How many placed orders after signing up
- **Conversion Rate** - Signup/Click ratio

### Creating a Referral Link

1. Click **"Create Link"** button
2. Enter:
   - **Link Name**: e.g., "Instagram Campaign", "Friend Referral"
   - **Bonus Credits**: 0-100 credits (students get this when they sign up)
3. Click **"Create Link"**
4. Your unique code is generated (8 characters, e.g., `AB12CD34`)

### Link Format
```
https://yourapp.com/login?ref=AB12CD34
```

### Managing Links

**Copy Link**: Click "Copy" button - link copied to clipboard

**Activate/Deactivate**: Toggle link status anytime
- Active links track clicks and apply bonuses
- Inactive links won't apply bonuses (but still track clicks)

---

## 🎯 How It Works

### 1. Student Clicks Link
```
yourapp.com/login?ref=AB12CD34
```
- ✅ Click count increments
- ✅ Referral code stored in localStorage
- ✅ Toast notification: "🎁 Get 10 FREE credits when you sign up!"

### 2. Student Signs Up
- ✅ Admin creates account via "Create Student"
- ✅ System checks localStorage for referral code
- ✅ Bonus credits applied (40 default + 10 bonus = **50 total**)
- ✅ Signup count increments on referral link
- ✅ User document stores referral code for future tracking

### 3. Student Places Orders
- ✅ Every order from referred student increments order count
- ✅ Tracks lifetime value of each referral link
- ✅ Shows ROI of different campaigns

---

## 💾 Database Structure

### Collection: `referral_links`

```typescript
{
  id: "doc_id",
  code: "AB12CD34",           // Unique 8-character code
  name: "Instagram Campaign", // Admin-defined name
  credits: 10,                // Bonus credits
  clicks: 45,                 // Total clicks
  signups: 12,                // Total signups
  orders: 8,                  // Total orders from signups
  active: true,               // Active/inactive status
  createdAt: Timestamp,
  createdBy: "admin_id"
}
```

### User Document Update

```typescript
{
  // ... existing fields ...
  referralCode: "AB12CD34",  // Which link they used
  creditsRemaining: 50       // 40 default + 10 bonus
}
```

---

## 🔒 Security

### Firestore Rules

```javascript
match /referral_links/{linkId} {
  allow read: if true;        // Anyone can read (for click tracking)
  allow create: if isAdmin(); // Only admins create
  allow update: if isAdmin(); // Only admins update
  allow delete: if isAdmin(); // Only admins delete
}
```

### Server-Side Validation

✅ **Click Tracking**: Client-side (Firestore increment)
✅ **Signup Bonus**: Server-side (Admin API validates referral code)
✅ **Order Tracking**: Server-side (Cloud Function checks user's referralCode)

### Exploit Prevention

❌ Students **CANNOT**:
- Create fake referral links
- Manipulate click/signup counts
- Apply bonus credits manually
- Change their referral code after signup

✅ All credit application is **server-validated**

---

## 📱 Mobile Responsive

### Admin View
- **Mobile**: Card layout with stats grid
- **Desktop**: Full table view with all details

### Student View
- **Mobile**: Full-width banner with gift icon
- **Desktop**: Same beautiful banner

---

## 🧪 Testing Guide

### Test Referral Flow

1. **Create Link**
   ```
   - Admin → Referrals → Create Link
   - Name: "Test Campaign"
   - Credits: 15
   - Copy the link
   ```

2. **Test Click**
   ```
   - Open link in incognito: yourapp.com/login?ref=TESTCODE
   - Check: Click count should increment
   - Check: Toast shows "Get 15 FREE credits"
   ```

3. **Test Signup**
   ```
   - Create student account (while referral is in localStorage)
   - Check: Student should have 55 credits (40 + 15)
   - Check: Signup count increments in referral dashboard
   - Check: User document has referralCode: "TESTCODE"
   ```

4. **Test Order**
   ```
   - Referred student creates order
   - Check: Order count increments in referral dashboard
   ```

---

## 📈 Analytics & Insights

### Key Metrics

**Conversion Rate**
```
Signups ÷ Clicks × 100
```

**Order Rate**
```
Orders ÷ Signups × 100
```

**Cost Per Acquisition**
```
(Bonus Credits × Signups) ÷ Total Orders
```

### Use Cases

1. **A/B Testing**
   - Create 2 links with different credit amounts
   - Compare conversion rates
   - Optimize bonus amount

2. **Campaign Tracking**
   - Instagram: Link A
   - WhatsApp: Link B
   - Email: Link C
   - See which channel drives most orders

3. **Influencer Tracking**
   - Give each influencer unique link
   - Track their performance
   - Pay based on actual orders

---

## 🎨 UI/UX Features

### Admin Dashboard

✅ **Responsive Cards** (mobile)
✅ **Data Table** (desktop)
✅ **Real-time Stats** (updates live)
✅ **One-Click Copy** (clipboard integration)
✅ **Status Badges** (active/inactive)
✅ **Conversion Metrics** (calculated live)

### Login Page

✅ **Beautiful Banner** (gradient background)
✅ **Gift Icon** (visual appeal)
✅ **Credit Amount** (bold, eye-catching)
✅ **Auto-dismiss** (after signup)

---

## 🚀 Deployment

### 1. Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```

### 2. Deploy Cloud Functions
```bash
cd functions
npm run build
firebase deploy --only functions
```

### 3. Deploy Frontend
```bash
npm run build
firebase deploy --only hosting
```

---

## 🔧 Configuration

### Adjust Default Credits

**File**: `src/app/api/create-student/route.ts`

```typescript
creditsRemaining: 40 + bonusCredits, // Change 40 to your default
```

### Adjust Bonus Credit Limits

**File**: `src/app/(main)/admin/referrals/page.tsx`

```typescript
if (formData.credits < 0 || formData.credits > 100) {
  // Change 100 to your max bonus
}
```

---

## 🐛 Troubleshooting

### Click Not Tracking

**Issue**: Click count not incrementing
**Fix**: Check Firestore rules allow reads for `referral_links`

### Bonus Not Applied

**Issue**: Student didn't get bonus credits
**Fix**: 
1. Check localStorage has `referralCode`
2. Check link is active
3. Check referral code in API request

### Order Not Tracked

**Issue**: Order count not incrementing
**Fix**: Check user document has `referralCode` field

---

## 📝 Example Scenarios

### Scenario 1: Instagram Campaign

```
1. Create link: "Instagram May 2024"
2. Set bonus: 20 credits
3. Post on Instagram story
4. Share link: yourapp.com/login?ref=INSTA234
5. Track results in dashboard
```

### Scenario 2: Friend Referral

```
1. Create link: "Student Referral Program"
2. Set bonus: 10 credits
3. Share with existing students
4. They share with friends
5. Track viral growth
```

### Scenario 3: Flash Sale

```
1. Create link: "24hr Flash Sale"
2. Set bonus: 50 credits
3. Share on all channels
4. Deactivate after 24 hours
5. Analyze conversion spike
```

---

## 🎉 Success!

Your referral system is now live! Students get bonuses, you track growth, and everyone wins! 🚀

### Quick Links
- Admin Dashboard: `/admin/referrals`
- Create Link: Click "Create Link" button
- View Stats: See real-time metrics at top

---

**Built with ❤️ for Assignly**



