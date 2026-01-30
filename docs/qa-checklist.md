# Marriage Rescue App - QA Checklist

Comprehensive manual QA checklist covering all features. Test against both desktop (1280x720) and mobile (375x667) viewports unless otherwise noted.

---

## 1. Authentication (10 items)

- [ ] **Signup form** displays all fields (first name, last name, email, password, confirm password) and "Create Account" button
- [ ] **Signup success** creates account and redirects to `/assessments`
- [ ] **Login form** displays email, password fields, "Sign In" button, biometric button, and link to signup
- [ ] **Login success** authenticates user and redirects to `/dashboard` with personalized welcome message
- [ ] **Logout** clears the JWT token from localStorage and redirects to `/login` or `/welcome`
- [ ] **Token persistence** -- refreshing the page while logged in keeps the user authenticated (token in localStorage triggers `/auth/me` call)
- [ ] **Biometric button** shows informational snackbar ("Biometric login can be set up after signing in via Settings.")
- [ ] **Validation: empty fields** -- submitting login or signup with empty required fields is blocked by HTML5 validation
- [ ] **Validation: password mismatch** -- signup shows "Passwords do not match" error when password and confirm password differ
- [ ] **Validation: short password** -- signup shows "Password must be at least 8 characters" error for passwords under 8 characters

---

## 2. Partner Management (6 items)

- [ ] **Invite partner** -- Settings page shows "Generate Invite Link" button when no partner is connected
- [ ] **Copy invite link** -- after generating an invite link, the copy button copies the URL to clipboard and shows "Copied!" tooltip
- [ ] **Join via code** -- navigating to `/join/:code` allows a second user to join the relationship
- [ ] **Duplicate join prevention** -- attempting to join a relationship that already has two partners returns an appropriate error
- [ ] **Self-join prevention** -- the invite creator cannot use their own invite link
- [ ] **Partner display** -- once a partner joins, Settings shows "Partner Connected" chip with partner's first name

---

## 3. Assessments (10 items)

- [ ] **Assessment list** -- `/assessments` displays all 4 assessment cards: Attachment Style, 16 Personalities, Wellness Behavior, Patterns & Closeness
- [ ] **Card metadata** -- each card shows question count, estimated duration, and description
- [ ] **Start quiz** -- clicking "Start" navigates to `/assessments/:type` and loads questions
- [ ] **Question navigation** -- Back and Next buttons work; Back is disabled on question 1; Next is disabled until an answer is selected
- [ ] **Answer all questions** -- selecting a Likert-scale option for each question enables the Submit button on the final question
- [ ] **Submit quiz** -- clicking Submit sends responses to the API and displays the result screen with score
- [ ] **Result display** -- result screen shows assessment-specific output (attachment style, personality type, wellness score, closeness percentage)
- [ ] **Retake** -- completed assessments show a "Retake" button instead of "Start"
- [ ] **Progress bar** -- overall progress bar on the assessments page shows X/4 completed
- [ ] **All complete message** -- when all 4 assessments are completed, a "View Matchup Score" button appears

---

## 4. Matchup (8 items)

- [ ] **Partner required** -- matchup page shows "Partner Required" message when no partner is connected
- [ ] **Assessment progress** -- when partner exists but assessments are incomplete, the page shows per-user completion chips
- [ ] **Both need completion** -- info alert states "Both partners need to complete all assessments to generate matchup score"
- [ ] **Generate button** -- "Generate Matchup Score" button appears when both partners have completed all assessments
- [ ] **Score display** -- after generation, the matchup score percentage is displayed prominently
- [ ] **Alignments display** -- alignment areas and notes are listed under the "Alignments" heading
- [ ] **Misses display** -- areas to work on are listed under the "Areas to Work On" heading
- [ ] **Regenerate** -- "Regenerate" button re-generates the matchup and updates the displayed score

---

## 5. Daily Log (10 items)

- [ ] **Positive counter** -- displays positive interaction count; increment (+) and decrement (-) buttons work
- [ ] **Negative counter** -- displays negative interaction count; increment (+) and decrement (-) buttons work
- [ ] **Counter floor** -- decrement buttons are disabled when count is 0 (cannot go negative)
- [ ] **Ratio display** -- ratio section shows `positiveCount / negativeCount : 1`; shows infinity when negativeCount is 0 and positiveCount > 0
- [ ] **Ratio color coding** -- ratio >= 5 shows green (success), 3-5 shows yellow (warning), < 3 shows red (error)
- [ ] **Mood slider** -- mood slider ranges from 1 to 10 with value label displayed
- [ ] **Closeness slider** -- emotional closeness slider ranges from 1 to 10 with value label displayed
- [ ] **Journal entry** -- multiline text field accepts free-form journal text
- [ ] **Save button** -- clicking "Save Log" submits the form and shows a success alert; button changes to "Update Log"
- [ ] **Update existing log** -- if a log already exists for today, the form pre-populates with saved values and button reads "Update Log"

---

## 6. Strategies (6 items)

- [ ] **Current strategy display** -- `/strategies` page shows the current active strategy with week number
- [ ] **Weekly goals** -- bulleted list of weekly goals is displayed
- [ ] **Daily activities** -- daily suggested activities are shown for the current day
- [ ] **Progress tracking** -- progress bar and percentage reflect completed activities
- [ ] **History view** -- users can view past strategy cycles
- [ ] **Cycle grouping** -- strategies are organized by 12-week cycles

---

## 7. Reports (6 items)

- [ ] **Weekly report stats** -- stats overview shows Avg Ratio, Positives count, Negatives count, and Trend
- [ ] **Highlights** -- report lists positive highlights for the selected period
- [ ] **Improvements** -- report lists areas for improvement
- [ ] **Recommendations** -- prioritized recommendations are displayed with color-coded priority chips
- [ ] **Period selector** -- toggling between 7 Days / 30 Days / 90 Days refreshes the data
- [ ] **Week navigation** -- Previous / Next buttons navigate between report weeks; Next is disabled at current week

---

## 8. Payments (8 items)

- [ ] **Checkout flow** -- clicking "Subscribe" on a plan redirects to the Stripe checkout page
- [ ] **Subscription status** -- Settings page shows current status (TRIAL, PAID, PREMIUM, EXPIRED) as a chip
- [ ] **Trial countdown** -- trial users see "X days remaining in trial" text
- [ ] **Cancel subscription** -- "Cancel" button opens a confirmation dialog; confirming cancels at end of billing period
- [ ] **Billing portal** -- "Manage Subscription" button opens the Stripe billing portal
- [ ] **Premium features locked** -- non-premium users see "Upgrade" prompt on premium-only features (e.g., mediated meetings)
- [ ] **Expired status handling** -- expired users are shown plan options to resubscribe
- [ ] **Payment success redirect** -- returning from Stripe with `?payment=success` shows a success alert and refreshes user data

---

## 9. Calendar (5 items)

- [ ] **Connect button** -- Settings page shows "Connect Calendar" button when not connected
- [ ] **OAuth flow** -- clicking Connect Calendar redirects to Google OAuth consent screen
- [ ] **Sync events** -- after connecting, relationship events are synced to the user's Google Calendar
- [ ] **Status display** -- connected state shows a "Connected" chip with a "Disconnect" button
- [ ] **Disconnect** -- clicking Disconnect removes the calendar integration and shows the Connect button again

---

## 10. Therapist Integration (5 items)

- [ ] **Consent toggle** -- Settings page shows an "Enable therapist access" switch
- [ ] **Toggle on** -- enabling consent shows a success message ("Therapist access enabled")
- [ ] **Toggle off** -- disabling consent shows a success message ("Therapist access disabled")
- [ ] **Task list** -- when consent is enabled, therapist-assigned tasks appear (if any exist)
- [ ] **Complete task** -- marking a task as complete sends the update to the API

---

## 11. Meetings (6 items)

- [ ] **Mediator list** -- `/meetings` page shows available mediators
- [ ] **Check availability** -- selecting a mediator and date shows available time slots
- [ ] **Schedule meeting** -- selecting a time slot and confirming creates a meeting with a Google Meet link
- [ ] **Cancel meeting** -- cancelling an upcoming meeting removes it from the list
- [ ] **Partner consent** -- both partners must consent to the meeting for it to proceed
- [ ] **Meet link display** -- scheduled meetings show a "Join" button linking to the Google Meet URL

---

## 12. Cross-cutting Concerns (5 items)

- [ ] **Responsive layout** -- all pages render correctly on mobile (375px), tablet (768px), and desktop (1280px) viewports
- [ ] **Error handling** -- API errors display user-friendly alert messages (not raw error objects or stack traces)
- [ ] **Rate limiting** -- repeated rapid API calls do not cause duplicate submissions or race conditions
- [ ] **Loading states** -- all data-fetching pages show a spinner or skeleton while loading
- [ ] **404 handling** -- navigating to an unknown route redirects authenticated users to `/dashboard` and unauthenticated users to `/welcome`

---

**Total items: 85**

> Tested by: ___________________
> Date: ___________________
> Build / commit: ___________________
> Environment: ___________________
