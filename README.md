# Events & Community Platform Frontend

This repository contains a **stand‑alone** React application that implements the
authentication pages (sign in and sign up) for the Events and Community
Platform. The design is based off the provided Figma file and attempts to
mirror its layout, colours and interaction patterns using **React**,
**TailwindCSS**, and **React Router**. At this stage there is no backend
integration; submitting either form will simply display an alert.

## Features

- **Sign In page** with email/password fields, "forgot password" link and social
  login buttons (Google and LinkedIn). Tabs at the top of the card let you
  switch between signing in and creating a new account.
- **Sign Up page** where users can enter their first name, last name, email
  address, password and password confirmation. Basic client‑side validation
  ensures the passwords match before displaying a success alert.
- A **hero panel** on the left side of the screen conveys the platform brand
  and mission with a gradient background, logo, descriptive text and an
  illustration. On mobile devices this panel collapses above the form.
- A **feature section** below the form lists three benefits of joining the
  platform: continuous learning, a professional network and exclusive events.
- Uses **React Router** for client‑side navigation between `/signin` and
  `/signup` without reloading the page.

## Getting Started (Local Development)

These instructions assume you have **Node.js ≥ 16** installed on your machine.

1. Navigate into the project directory:

   ```bash
   cd events-community-platform
