# SQA Test Plan: SteriTrack UI & Error Handling Refresh

**Date:** 25 December 2025
**Version:** 1.0
**Scope:** Login View, Register View, Error Pages (403, 404, 500), and Glassmorphism UI Theme.

## 1. UI/UX & Visual Regression Testing
| Test ID | Scenario | Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **UI-01** | **Login Page Rendering** | 1. Open `/login`.<br>2. Observe background and central card. | Card displays "Blue Liquid Glass" effect. Background elements float smoothly. No overflow issues. | ✅ Pass |
| **UI-02** | **Login Tilt Effect** | 1. Move mouse cursor across the Login card. | The card should tilt in 3D perspective following the mouse cursor naturally. | ⬜ Pending |
| **UI-03** | **Register Page Layout** | 1. Open `/register`.<br>2. Verify form fits inside the droplet. | All inputs and the "Daftar" button are fully contained within the glass boundary. No clipping at the bottom. | ✅ Pass |
| **UI-04** | **Satellite Button** | 1. Hover over "Kembali Login" bubble on Register page. | Button slightly scales up (hover effect). Click navigates to Login page. | ⬜ Pending |
| **UI-05** | **Mobile Responsiveness** | 1. Resize browser to mobile view (Phone size). | Droplet resizes or adapts safely. Form remains usable. | ⬜ Pending |

## 2. Functional Testing: Authentication
| Test ID | Scenario | Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **AUTH-01** | **Successful Login** | 1. Enter valid username/password.<br>2. Click "Masuk". | User is redirected to Dashboard (Inventory/Nurse View depending on role). | ⬜ Pending |
| **AUTH-02** | **Failed Login** | 1. Enter invalid credentials.<br>2. Click "Masuk". | Error toast/alert appears. User remains on Login page. | ⬜ Pending |
| **AUTH-03** | **Registration Flow** | 1. Fill Register form (Nurse Role).<br>2. Select Unit.<br>3. Click "Daftar". | Success message appears. Redirect to Login page. | ⬜ Pending |
| **AUTH-04** | **Validation** | 1. Leave fields empty.<br>2. Click "Daftar". | Form shows validation error messages (Red text) under specific fields. | ⬜ Pending |

## 3. Error Handling (Negative Testing)
| Test ID | Scenario | Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **ERR-01** | **404 Not Found** | 1. Navigate to a random URL (e.g., `/halaman-ngawur`). | System displays the **404 Not Found** view (Blue theme). "Kembali ke Beranda" button works. | ✅ Pass |
| **ERR-02** | **403 Unauthorized** | 1. Log in as **Nurse**.<br>2. Manually navigate to `/admin/users`. | System redirects to **403 Unauthorized** view (Orange shield theme). Access is blocked. | ⬜ Pending |
| **ERR-03** | **500 Crash Handling** | 1. (Dev Mode) Insert a `throw new Error()` in a component.<br>2. Load that component. | System catches the crash and displays **500 Error Boundary** (Red theme). App does not whitespace. | ⬜ Pending |

## 4. Performance & Reliability
| Test ID | Scenario | Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **PERF-01** | **Animation Load** | 1. Reload Login page 5 times. | Animations (float/tilt) start immediately without lag. | ⬜ Pending |
| **PERF-02** | **Form Submission** | 1. Submit form.<br>2. Disconnect Internet.<br>3. Submit again. | App handles timeout gracefully or shows "Network Error". | ⬜ Pending |

---
** Tester Notes:**
- *UI-03 (Register Layout)* has been fixed and verified via browser inspection tool.
- *ERR-01 (404)* has been implemented and verified.
