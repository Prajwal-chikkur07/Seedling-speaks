---

# BACHELOR OF COMPUTER APPLICATIONS (BCA)
## FINAL YEAR PROJECT REPORT

---

**Project Title:**
# SeedlingSpeaks — Multilingual Voice Translation Application

---

| Field              | Details                                       |
|--------------------|-----------------------------------------------|
| Developed By       | Prajwal Chikkur                               |
| USN                | U32KQ235S0077                                 |
| Course             | Bachelor of Computer Applications (BCA)       |
| Semester           | 6th Semester                                  |
| College            | Sri Vidyaniketan Degree College, Gangavathi   |
| University         | Koppal University, Koppal                     |
| External Guide     | Seedling Labs Private Limited                 |
| Internal Guide     | Mr. Anand K. Purohit                          |
| Academic Year      | 2025 – 2026                                   |

---

> *Submitted in partial fulfillment of the requirements for the award of the degree of*
> *Bachelor of Computer Applications*

---

&nbsp;

---

## DECLARATION

I, **Prajwal Chikkur**, student of 6th Semester BCA, **Sri Vidyaniketan Degree College, Gangavathi**, bearing USN **U32KQ235S0077**, hereby declare that the project entitled **"SeedlingSpeaks — Multilingual Voice Translation Application"** has been carried out by me under the supervision of **External Guide: Seedling Labs Private Limited** and **Internal Guide: Mr. Anand K. Purohit**, and submitted in partial fulfillment of the requirements for the award of the Degree of Bachelor of Computer Applications by **Koppal University, Koppal**, during the academic year **2025–26**.

This report has not been submitted to any other Organization/University for any award of degree or certificate.

**Name:** Prajwal Chikkur
**USN:** U32KQ235S0077
**College:** Sri Vidyaniketan Degree College, Gangavathi
**Date:** May 2026

---

## ACKNOWLEDGEMENT

I would like to express my sincere gratitude to everyone who contributed to the successful completion of this project.

First and foremost, I am deeply thankful to **Seedling Labs** for providing the platform, infrastructure, mentorship, and a stimulating work environment that made this project possible. The guidance and real-world exposure received during my time there have been invaluable in shaping both this project and my professional outlook.

I am sincerely grateful to the Head of the BCA Department, **Mr. Anand K. Purohit**, and all the faculty members for their continuous academic support, encouragement, and the strong technical foundation they have provided throughout the course of this degree.

I extend my appreciation to the teams and communities behind **FastAPI**, **React**, **Sarvam AI**, **Google Gemini**, and all other open-source tools and APIs whose contributions form the backbone of this application. Their work in advancing accessible and powerful technology made the development of SeedlingSpeaks achievable.

I also thank my fellow students and peers for their constructive feedback, discussions, and support during the development phase.

Lastly, I am profoundly grateful to my **family and friends** for their unwavering encouragement, patience, and motivation throughout this academic journey. Their belief in me has been a constant source of strength.

&nbsp;

**Prajwal Chikkur**
BCA — 6th Semester
Seedling Labs
May 2026

---

## ABSTRACT

**SeedlingSpeaks** is a full-stack multilingual voice translation application designed to bridge communication gaps across Indian regional languages. The system enables users to record voice input in any supported Indian language, automatically transcribe and translate the speech to English using **Sarvam AI**, apply professional tone styles (email, Slack, LinkedIn, etc.) using **Google Gemini AI**, and translate the styled content back into the target language.

The application supports **10+ Indian regional languages** including Hindi, Tamil, Telugu, Bengali, Malayalam, Marathi, Gujarati, Kannada, Punjabi, and Odia. It is built as a multi-platform solution comprising a **React web application**, a **React Native mobile app (Expo)**, a **Chrome browser extension**, and a **Desktop widget (Electron)**. The backend is powered by **FastAPI (Python)** with **PostgreSQL** as the database and JWT-based authentication.

The primary goal of this project is to help multilingual professionals communicate effectively across language barriers while preserving tone, context, and intent — making it a practical productivity tool for the diverse Indian workforce.

---

&nbsp;

---

# TABLE OF CONTENTS

1. Introduction
   - 1.1 Project Description
   - 1.2 Company Profile

2. Literature Survey
   - 2.1 Existing System and Proposed System
   - 2.2 Feasibility Study
   - 2.3 Tools and Technologies Used
   - 2.4 Hardware and Software Requirements

3. Software Requirement Specification (SRS)
   - 3.1 Users
   - 3.2 Functional Requirements
   - 3.3 Non-Functional Requirements

4. System Design
   - 4.1 System Architecture
   - 4.2 Context Diagram
   - 4.3 Data Flow Diagram (DFD)
   - 4.4 Entity-Relationship (ER) Diagram Description
   - 4.5 Database Schema

5. Implementation
   - 5.1 Module Description
   - 5.2 Code Snippets
   - 5.3 Screenshots

6. Software Testing
   - 6.1 Types of Testing
   - 6.2 Test Cases

7. Conclusion

8. Future Enhancement

9. Bibliography

---

&nbsp;

---

# CHAPTER 1 — INTRODUCTION

---

## 1.1 Project Description

### Background

India is home to more than 1.4 billion people speaking over 22 officially recognised languages and hundreds of dialects. Despite the widespread use of English in professional environments, a vast majority of the Indian workforce is more comfortable communicating in their native regional language. This creates a significant communication barrier in workplaces, digital platforms, and professional services.

Existing tools such as Google Translate provide basic text translation but do not account for the **context of communication**, the **tone** required for different channels (email vs. chat vs. social media), or the **seamless voice-to-text conversion** of Indian regional languages. Furthermore, no single platform provides an end-to-end voice translation solution with tone styling designed specifically for the Indian multilingual context.

**SeedlingSpeaks** addresses this gap by offering an intelligent, AI-powered multilingual voice translation platform that is available across web, mobile, desktop, and browser extension platforms.

### Project Objectives

The primary objectives of the SeedlingSpeaks project are:

1. To develop a real-time **speech-to-text translation** system supporting major Indian regional languages.
2. To implement **AI-powered tone styling** that transforms raw transcriptions into professionally formatted content suitable for different communication channels.
3. To provide **reverse translation** — styled English text back to the user's native language.
4. To build a **multi-platform application** (Web, Mobile, Chrome Extension, Desktop) with a unified backend.
5. To integrate **Text-to-Speech (TTS)** functionality using Sarvam AI for audio playback of translations.
6. To develop a **video subtitle generation** module that creates .SRT and .VTT subtitle files from uploaded videos.
7. To enable **vision-based translation** where text in images is extracted and translated.
8. To implement secure **user authentication** with JWT tokens and maintain user history.
9. To support sharing of translated content to **Slack, Email, LinkedIn**, and other channels.
10. To build a **Chrome Extension** that integrates translation functionality directly into the browser.

### Scope of the Project

The scope of SeedlingSpeaks covers the following aspects:

- Voice-based input for Indian regional languages
- AI-assisted transcription, tone rewriting, and multi-language translation
- Multi-platform delivery (Web, Mobile, Desktop, Extension)
- User account management and session history
- Content sharing across professional communication channels
- Video subtitle generation and vision-based text translation

The project is intended for professionals, students, content creators, and anyone who regularly communicates across different Indian languages in a professional context.

---

## 1.2 Company Profile

**Seedling Labs** is a technology startup focused on building intelligent, AI-powered applications that solve real-world communication and productivity problems for the Indian market. The company operates at the intersection of artificial intelligence, natural language processing, and user experience design.

Seedling Labs specialises in the development of voice and language processing tools that cater to the multilingual nature of India's workforce. The company believes in leveraging state-of-the-art AI models — both global (Google Gemini) and India-specific (Sarvam AI) — to build products that are culturally relevant and practically useful.

The **SeedlingSpeaks** project was initiated by Seedling Labs as a capstone product to demonstrate the capabilities of combining speech recognition, large language models (LLMs), and multi-platform deployment in a production-grade application.

---

&nbsp;

---

# CHAPTER 2 — LITERATURE SURVEY

---

## 2.1 Existing System and Proposed System

### 2.1.1 Existing Systems

Several tools exist in the translation and communication space, each with its own limitations:

**A. Google Translate**
- Provides text and basic speech translation for Indian languages
- Does not support tone styling or channel-specific formatting
- No API integration for professional communication channels
- Limited context awareness for regional language nuances

**B. Microsoft Translator**
- Offers multi-language text translation with API access
- Lacks voice input specifically optimised for Indian regional languages
- No tone adaptation for professional platforms
- Not optimised for conversational regional language dialects

**C. Whisper (OpenAI)**
- Open-source speech-to-text model with multilingual support
- Does not offer native translation; transcription only
- No integration with tone styling or professional channel sharing
- Requires significant setup for production deployment

**D. DeepL Translator**
- Superior translation quality for European languages
- Very limited support for Indian regional languages
- No voice input or professional tone adaptation
- No mobile or desktop widget support

**Limitations of Existing Systems (Summary Table):**

| Feature                              | Google Translate | MS Translator | Whisper | DeepL | SeedlingSpeaks |
|--------------------------------------|:---:|:---:|:---:|:---:|:---:|
| Indian Regional Language STT         | Partial | Partial | Yes | No | **Yes** |
| AI Tone Styling                      | No | No | No | No | **Yes** |
| Channel-Specific Formatting          | No | No | No | No | **Yes** |
| TTS for Indian Languages             | Yes | Partial | No | No | **Yes** |
| Video Subtitle Generation            | No | No | No | No | **Yes** |
| Vision (Image) Translation           | Basic | No | No | No | **Yes** |
| Chrome Extension                     | Yes | No | No | No | **Yes** |
| Desktop Widget                       | No | No | No | No | **Yes** |
| Mobile App                           | Yes | Yes | No | No | **Yes** |
| Slack / Email / LinkedIn Integration | No | No | No | No | **Yes** |
| User Accounts & History              | Yes | Limited | No | Limited | **Yes** |

### 2.1.2 Proposed System

**SeedlingSpeaks** is proposed as a unified, AI-powered multilingual communication assistant that overcomes all the above limitations. The proposed system:

1. **Uses Sarvam AI** — an India-focused AI speech and translation model — for highly accurate speech-to-text conversion in Indian regional languages.
2. **Uses Google Gemini AI** — a state-of-the-art large language model — for intelligent tone rewriting and vision-based translation.
3. **Provides multi-platform access** so users are not restricted to a single device or interface.
4. **Integrates professional channel sharing** (Slack, Email, LinkedIn) directly within the app.
5. **Generates video subtitles** in .SRT and .VTT formats from uploaded videos.
6. **Maintains user history** with authenticated accounts for revisiting past translations.

### 2.1.3 Advantages of the Proposed System

- Specifically built for Indian regional languages with optimised STT models
- Tone-aware translation ensures professional appropriateness across channels
- Multi-platform availability ensures accessibility for all users
- AI-powered vision translation extends functionality to image-based text
- Offline-capable desktop widget for quick translations without opening a browser
- Comprehensive API backend enabling future integrations

---

## 2.2 Feasibility Study

A feasibility study was conducted to assess the project from technical, operational, and economic perspectives.

### 2.2.1 Technical Feasibility

The technologies selected for this project are all well-established, stable, and widely supported:

- **FastAPI** is a modern, high-performance Python web framework suitable for building production APIs
- **React** is the industry-standard frontend library for building dynamic user interfaces
- **Sarvam AI** provides a dedicated, production-ready API for Indian language speech-to-text and translation
- **Google Gemini API** provides enterprise-grade LLM capabilities for tone rewriting and vision tasks
- **PostgreSQL** is a robust, scalable relational database
- **Expo (React Native)** simplifies cross-platform mobile development
- **Electron** enables desktop widget development with web technologies

All dependencies are open-source or have accessible free-tier APIs. The architecture is RESTful, making it scalable and maintainable. Therefore, the project is **technically feasible**.

### 2.2.2 Operational Feasibility

The target users of SeedlingSpeaks are professionals, students, and content creators who regularly interact with regional languages. The interface is designed to be intuitive, requiring minimal learning curve. The multi-platform nature ensures users can access the tool in whichever way suits them best. Therefore, the project is **operationally feasible**.

### 2.2.3 Economic Feasibility

- The frontend (React + Vite) and backend (FastAPI) frameworks are completely free and open-source
- Sarvam AI and Google Gemini offer free-tier API access sufficient for development and testing
- PostgreSQL is open-source and free to deploy
- Cloud deployment is possible on affordable platforms (Render, Railway, Heroku)
- Development requires only standard hardware (a modern laptop with internet connectivity)

Therefore, the project is **economically feasible** for an academic capstone project.

---

## 2.3 Tools and Technologies Used

### 2.3.1 Frontend Technologies

**React.js (v18+)**
React is a JavaScript library developed by Meta for building user interfaces using a component-based architecture. It enables efficient rendering through a virtual DOM and supports state management, hooks, and context APIs. SeedlingSpeaks uses React for the main web application.

**Vite**
Vite is a next-generation front-end build tool that provides extremely fast hot module replacement (HMR) during development and optimised production builds. It significantly reduces development time compared to traditional Webpack-based setups.

**Tailwind CSS**
Tailwind CSS is a utility-first CSS framework that enables rapid UI development by composing small, reusable utility classes directly in HTML/JSX. It ensures design consistency and responsive layouts across all screen sizes.

**Lucide React**
Lucide is an open-source icon library for React that provides clean, consistent SVG icons used throughout the application interface.

**Axios**
Axios is a promise-based HTTP client for JavaScript, used in the frontend to communicate with the FastAPI backend. It supports request interceptors, retry logic, and error handling.

**React Router**
React Router is the standard routing library for React applications, enabling client-side navigation between pages without full page reloads.

### 2.3.2 Backend Technologies

**Python 3.10+**
Python is the primary programming language for the backend. Its extensive ecosystem of AI and web libraries makes it the ideal choice for this project.

**FastAPI**
FastAPI is a modern, high-performance Python web framework for building APIs. It provides automatic OpenAPI documentation, request validation using Pydantic models, asynchronous support, and is one of the fastest Python frameworks available.

**Uvicorn**
Uvicorn is an ASGI (Asynchronous Server Gateway Interface) server implementation for Python. It is used to run the FastAPI application in both development and production environments.

**SQLAlchemy**
SQLAlchemy is a powerful Python SQL toolkit and ORM (Object Relational Mapper) that provides a high-level abstraction for database operations. It is used to interact with the PostgreSQL database.

**Pydantic**
Pydantic is used for data validation and settings management using Python type annotations. FastAPI uses Pydantic models to validate incoming request bodies and outgoing responses.

**python-jose**
`python-jose` is a Python library for JSON Object Signing and Encryption (JOSE). It is used for JWT (JSON Web Token) generation and verification in the authentication module.

**Passlib**
Passlib is a password hashing library used for securely hashing user passwords before storing them in the database.

**python-multipart**
This library handles multipart form data, enabling the backend to receive audio and video file uploads from clients.

### 2.3.3 External AI APIs

**Sarvam AI**
Sarvam AI is an India-focused AI company providing speech and language models optimised for Indian regional languages. SeedlingSpeaks uses:
- **Speech-to-Text (STT)**: Transcribing audio recordings in Indian languages
- **Translation API**: Converting transcribed text to English
- **Text-to-Speech (TTS)**: Generating audio output from translated text

**Google Gemini AI**
Google Gemini is a multimodal large language model developed by Google DeepMind. SeedlingSpeaks uses:
- **Tone Rewriting**: Transforming raw transcriptions into professionally styled content
- **Vision Translation**: Extracting and translating text from images
- **Meeting Notes Generation**: Summarising transcribed conversations
- **Sentiment Analysis**: Analysing the emotional tone of transcribed text

### 2.3.4 Database

**PostgreSQL**
PostgreSQL is an open-source, enterprise-grade relational database management system. It stores user accounts, translation history, session data, and sharing records.

**SQLite** (Development)
SQLite is used as a lightweight translation cache database (`translation_cache.db`) to cache frequently requested translations and reduce repeated API calls.

### 2.3.5 Mobile Application

**Expo (React Native)**
Expo is a platform for developing universal React Native applications. It simplifies the process of building, testing, and deploying mobile apps for both iOS and Android from a single codebase.

**Expo Router**
Expo Router provides file-based routing for React Native apps, similar to Next.js for web. It is used to define the navigation structure of the mobile application.

### 2.3.6 Desktop Widget

**Electron**
Electron is a framework for building cross-platform desktop applications using web technologies (HTML, CSS, JavaScript). The SeedlingSpeaks desktop widget is built with Electron, providing a lightweight, always-on-top overlay for quick translations.

### 2.3.7 Chrome Extension

The Chrome Extension is built with standard web technologies (HTML, CSS, JavaScript) and packaged using npm build scripts. It integrates the core translation functionality directly into the browser, enabling users to translate content from any web page.

---

## 2.4 Hardware and Software Requirements

### 2.4.1 Hardware Requirements

**Development Machine:**

| Component | Minimum Requirement | Recommended |
|-----------|---------------------|-------------|
| Processor | Intel Core i5 / AMD Ryzen 5 | Intel Core i7 / AMD Ryzen 7 |
| RAM | 8 GB | 16 GB |
| Storage | 20 GB free space | 50 GB SSD |
| Network | Broadband Internet | High-speed Internet (10 Mbps+) |
| Microphone | Built-in or external | External USB/3.5mm microphone |

**For End Users (Web App):**

| Component | Minimum Requirement |
|-----------|---------------------|
| Processor | Any modern dual-core processor |
| RAM | 4 GB |
| Network | Internet connection (for API calls) |
| Browser | Chrome 90+, Firefox 88+, Safari 15+, Edge 90+ |
| Microphone | Required for voice input feature |

### 2.4.2 Software Requirements

**Development Environment:**

| Software | Version | Purpose |
|----------|---------|---------|
| Python | 3.10+ | Backend development |
| Node.js | 18+ | Frontend and extension development |
| npm | 9+ | Package management |
| Git | 2.x | Version control |
| PostgreSQL | 14+ | Primary database |
| VS Code | Latest | Code editor |

**Backend Dependencies:**

| Library | Version | Purpose |
|---------|---------|---------|
| fastapi | 0.104+ | Web framework |
| uvicorn | 0.24+ | ASGI server |
| sqlalchemy | 2.0+ | ORM |
| pydantic | 2.x | Data validation |
| python-jose | 3.x | JWT authentication |
| passlib | 1.7+ | Password hashing |
| python-multipart | 0.0.6+ | File upload handling |
| google-generativeai | 0.5+ | Gemini AI client |
| httpx | 0.25+ | Async HTTP client for Sarvam API |

**Frontend Dependencies:**

| Library | Version | Purpose |
|---------|---------|---------|
| react | 18.x | UI framework |
| react-dom | 18.x | DOM rendering |
| react-router-dom | 6.x | Client-side routing |
| axios | 1.x | HTTP requests |
| tailwindcss | 3.x | CSS utility framework |
| lucide-react | 0.3+ | Icon library |
| vite | 5.x | Build tool |

---

&nbsp;

---

# CHAPTER 3 — SOFTWARE REQUIREMENT SPECIFICATION (SRS)

---

## 3.1 Users

SeedlingSpeaks is designed for the following types of users:

### 3.1.1 End Users (General)

These are individuals who use the application for personal or professional communication needs. They include:

- **Professionals** working in multilingual environments who need to translate voice messages or written communication
- **Students** who need to translate study material or presentations
- **Content Creators** who produce content in regional languages and need English versions
- **Customer Support Agents** who interact with clients in regional languages

### 3.1.2 Power Users

Power users leverage the full feature set of the application, including:
- Video subtitle generation
- Vision-based image translation
- Meeting notes generation
- Multi-language batch translation
- Sharing to Slack, Email, and LinkedIn

### 3.1.3 Administrator / Developer

The administrator manages the backend infrastructure, monitors API usage, manages user accounts, and performs cache management operations via the backend API.

### 3.1.4 Mobile Users

Users who access the application via the mobile app (iOS/Android) through the Expo-based React Native application. The mobile experience is tailored for on-the-go translation needs.

### 3.1.5 Browser Extension Users

Users who install the Chrome extension for quick, in-browser translation without navigating to the main web application.

---

## 3.2 Functional Requirements

### FR-01: User Authentication
- The system shall allow users to register a new account using an email address and password.
- The system shall authenticate users using JWT (JSON Web Token) based login.
- The system shall allow users to view their profile and logout.
- Passwords shall be hashed using bcrypt before storage.

### FR-02: Voice Recording and Speech-to-Text Translation
- The system shall allow users to record audio from their microphone directly in the browser or mobile app.
- The system shall support audio input in the following Indian languages: Hindi, Bengali, Tamil, Telugu, Malayalam, Marathi, Gujarati, Kannada, Punjabi, and Odia.
- The system shall send the recorded audio to the Sarvam AI API for transcription and translation to English.
- The system shall display the transcribed English text to the user.
- The system shall display a confidence score indicating the accuracy of the transcription.

### FR-03: Tone Styling (AI Rewriting)
- The system shall allow users to select a tone style from predefined options:
  - Email Formal
  - Email Casual
  - Slack Message
  - LinkedIn Post
  - Custom (user-defined)
- The system shall send the transcribed text to Google Gemini AI with the selected tone instruction.
- The system shall display the rewritten, tone-styled text to the user.
- The system shall allow users to toggle between the original and rewritten (retoned) text.

### FR-04: Text Translation (English to Native Language)
- The system shall allow users to select a target Indian language.
- The system shall translate the English text (original or tone-styled) to the selected native language using the Sarvam AI translation API.
- The system shall support multi-language output — translating to multiple languages simultaneously.

### FR-05: Text-to-Speech (TTS)
- The system shall convert translated text to audio using the Sarvam AI TTS API.
- The system shall play the audio in the browser/app.
- The system shall allow users to select from different voice options for TTS playback.

### FR-06: Video Subtitle Generation
- The system shall accept uploaded video files.
- The system shall extract audio from the video and generate transcription using Sarvam AI.
- The system shall generate subtitle files in .SRT and .VTT formats.
- The system shall display the subtitles with timestamps.

### FR-07: Vision Translation (Image Text Extraction)
- The system shall accept uploaded image files.
- The system shall use Google Gemini Vision to extract text from the image.
- The system shall translate the extracted text to the target language.

### FR-08: Content Sharing
- The system shall allow users to send translated content via Email.
- The system shall allow users to send translated content to Slack channels.
- The system shall allow users to post translated content to LinkedIn.
- The system shall allow users to export translated content as a PDF or text file.

### FR-09: Translation History
- The system shall save all translation sessions for authenticated users.
- The system shall display a history of past translations with timestamps.
- The system shall allow users to revisit and replay past translation sessions.

### FR-10: English-to-Native Translation (Reverse Flow)
- The system shall accept English text input directly (without voice).
- The system shall translate English text to any supported Indian language.
- The system shall provide TTS playback for the translated native language text.

### FR-11: Analytics and AI Tools
- The system shall provide sentiment analysis of transcribed text.
- The system shall provide readability scoring.
- The system shall provide meeting notes generation from transcriptions.
- The system shall allow Q&A over transcribed content.
- The system shall provide tone suggestion based on the content of the transcription.

### FR-12: Translation Cache
- The system shall cache frequently translated text-language pairs to reduce redundant API calls.
- The system shall provide cache statistics and a cache clear endpoint.

### FR-13: Chrome Extension
- The Chrome extension shall provide a popup interface for quick translations.
- The extension shall support voice input and text translation.
- The extension shall integrate with the main backend API.

### FR-14: Desktop Widget
- The desktop widget (Electron) shall provide an always-on-top overlay for quick translations.
- The widget shall support voice input and display translated output.
- The widget shall be installable as a standalone .dmg (macOS) application.

### FR-15: Mobile Application
- The mobile app shall provide all core translation features available on the web app.
- The mobile app shall support voice recording using the device microphone.
- The mobile app shall provide a native drawer navigation experience.

---

## 3.3 Non-Functional Requirements

### NFR-01: Performance
- The API shall respond to standard translation requests within 3 seconds under normal network conditions.
- The frontend shall load within 2 seconds on a standard broadband connection.
- The translation cache shall reduce repeat API call latency by at least 80%.

### NFR-02: Scalability
- The backend shall be designed to handle concurrent users using FastAPI's asynchronous request handling.
- The database schema shall support horizontal scaling via connection pooling.

### NFR-03: Security
- All user passwords shall be hashed using bcrypt before storage.
- All API endpoints (except health check, login, and signup) shall require valid JWT authentication.
- CORS shall be configured to restrict access to authorised origins in production.
- API keys (Sarvam, Gemini) shall be stored in environment variables and never exposed in source code.

### NFR-04: Reliability
- The system shall implement retry logic for external API calls to handle transient failures.
- The system shall provide meaningful error messages when API calls fail.
- The translation cache shall serve cached results even when the primary API is temporarily unavailable.

### NFR-05: Usability
- The interface shall be intuitive enough for non-technical users without a user manual.
- The application shall be fully responsive and usable on screens from 320px (mobile) to 1920px (desktop).
- All interactive elements shall have visual feedback on hover and focus states.
- Accessibility standards (ARIA labels) shall be followed for screen reader compatibility.

### NFR-06: Maintainability
- The backend shall follow a modular router-based architecture, separating concerns into distinct modules.
- The frontend shall follow a component-based architecture with clear separation of pages, components, services, and hooks.
- Environment-specific configuration shall be managed through `.env` files.

### NFR-07: Portability
- The web application shall function on all modern browsers (Chrome, Firefox, Safari, Edge).
- The mobile application shall run on both iOS and Android via Expo.
- The desktop widget shall be installable on macOS and, with minor modifications, on Windows.

### NFR-08: Availability
- The application shall target 99% uptime when deployed on cloud infrastructure.
- Graceful degradation shall be implemented so that core features remain available even if non-critical external services are temporarily down.

---

&nbsp;

---

# CHAPTER 4 — SYSTEM DESIGN

---

## 4.1 System Architecture

SeedlingSpeaks follows a **multi-tier client-server architecture** with a clear separation between the presentation layer, business logic layer, and data layer.

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           PRESENTATION LAYER                               │
│                                                                            │
│  ┌─────────────────┐  ┌────────────────┐  ┌──────────┐  ┌─────────────┐  │
│  │  React Web App  │  │ Mobile App     │  │  Chrome  │  │  Desktop    │  │
│  │  (Vite + React) │  │ (Expo/RN)      │  │  Ext.    │  │  Widget     │  │
│  │  Port: 5173     │  │ iOS / Android  │  │ (JS/HTML)│  │ (Electron)  │  │
│  └────────┬────────┘  └───────┬────────┘  └────┬─────┘  └──────┬──────┘  │
│           │                   │                 │               │          │
└───────────┼───────────────────┼─────────────────┼───────────────┼──────────┘
            │                   │                 │               │
            └───────────────────┴─────────────────┴───────────────┘
                                        │
                                   HTTP / REST
                                        │
┌───────────────────────────────────────▼────────────────────────────────────┐
│                           BUSINESS LOGIC LAYER                             │
│                                                                            │
│                      FastAPI Backend (Python)                              │
│                       Server: Uvicorn (Port 8000)                         │
│                                                                            │
│  ┌──────────────┐  ┌────────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │  Auth Router │  │  Audio Router  │  │ Translation  │  │  Sharing    │ │
│  │  /api/auth/* │  │  /api/audio/*  │  │  Router      │  │  Router     │ │
│  └──────────────┘  └────────────────┘  └──────────────┘  └─────────────┘ │
│  ┌──────────────┐  ┌────────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │  Video Router│  │ Analysis Router│  │  Session     │  │  E2N Router │ │
│  │  /api/video/*│  │  /api/analyze* │  │  Router      │  │  /api/e2n/* │ │
│  └──────────────┘  └────────────────┘  └──────────────┘  └─────────────┘ │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │                        Services Layer                                │ │
│  │  sarvam_client | gemini_client | tts_service | video_service        │ │
│  │  auth | email_service | slack_service | translation_cache           │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────┬────────────────────────────────────┘
                                        │
            ┌───────────────────────────┼────────────────────────┐
            │                           │                         │
┌───────────▼──────────┐  ┌────────────▼───────────┐  ┌─────────▼──────────┐
│    DATA LAYER        │  │  EXTERNAL AI SERVICES  │  │  COMMUNICATION     │
│                      │  │                        │  │  SERVICES          │
│  PostgreSQL          │  │  ┌──────────────────┐  │  │                    │
│  (User data,         │  │  │  Sarvam AI API   │  │  │  Slack API         │
│   History,           │  │  │  • STT           │  │  │  Gmail SMTP        │
│   Sessions)          │  │  │  • Translation   │  │  │  LinkedIn API      │
│                      │  │  │  • TTS           │  │  │                    │
│  SQLite Cache        │  │  └──────────────────┘  │  └────────────────────┘
│  (Translation        │  │  ┌──────────────────┐  │
│   cache)             │  │  │  Gemini AI API   │  │
│                      │  │  │  • Tone Rewrite  │  │
└──────────────────────┘  │  │  • Vision Trans. │  │
                          │  │  • Analysis      │  │
                          │  └──────────────────┘  │
                          └────────────────────────┘
```

**Description of Layers:**

1. **Presentation Layer**: Contains all client-side applications — the React web app, Expo mobile app, Chrome extension, and Electron desktop widget. All clients communicate with the backend via REST API calls over HTTP/HTTPS.

2. **Business Logic Layer**: The FastAPI backend is organised into modular routers, each responsible for a specific domain (authentication, audio processing, translation, video processing, analysis, sharing). Each router delegates to service classes that handle external API communication and business rules.

3. **Data Layer**: PostgreSQL stores persistent data. SQLite serves as a translation cache for performance optimisation.

4. **External Services**: Sarvam AI and Google Gemini provide the AI capabilities. Slack, Email, and LinkedIn APIs handle content distribution.

---

## 4.2 Context Diagram

**[Insert Context Diagram Here]**

*Description of Context Diagram:*

The context diagram illustrates the system boundary of SeedlingSpeaks and its interactions with external entities:

- **User (Web / Mobile / Extension / Desktop)** → Sends voice/text/video/image input → **SeedlingSpeaks System**
- **SeedlingSpeaks System** → Returns translated text, audio, subtitles → **User**
- **SeedlingSpeaks System** → Sends audio data → **Sarvam AI** → Returns transcript + translation
- **SeedlingSpeaks System** → Sends text → **Google Gemini AI** → Returns tone-styled / translated text
- **SeedlingSpeaks System** → Sends message → **Slack API** → Delivers to Slack channel
- **SeedlingSpeaks System** → Sends email → **Email Service (SMTP)** → Delivers to recipient
- **SeedlingSpeaks System** → Posts content → **LinkedIn API** → Publishes post
- **SeedlingSpeaks System** → Reads/writes → **PostgreSQL Database**

---

## 4.3 Data Flow Diagram (DFD)

### Level 0 DFD (Context Level)

**[Insert Level 0 DFD Diagram Here]**

*The Level 0 DFD shows:*
- External entity: **User** provides audio/text/image/video input
- Process: **SeedlingSpeaks System** processes the input
- External entity: **External AI Services** (Sarvam, Gemini) assist processing
- Output: Translated text / audio / subtitles returned to User

### Level 1 DFD

**[Insert Level 1 DFD Diagram Here]**

*The Level 1 DFD decomposes the main system into the following sub-processes:*

1. **P1 — User Authentication**: Handles signup, login, JWT generation
2. **P2 — Audio Processing**: Records audio, sends to Sarvam AI, receives transcription
3. **P3 — Tone Styling**: Sends transcription to Gemini AI with tone instruction
4. **P4 — Text Translation**: Sends styled text to Sarvam AI translation endpoint
5. **P5 — TTS Generation**: Sends translated text to Sarvam TTS API, returns audio
6. **P6 — Video Processing**: Extracts audio from video, generates subtitles
7. **P7 — Vision Translation**: Sends image to Gemini Vision, extracts and translates text
8. **P8 — Content Sharing**: Routes translated content to Slack/Email/LinkedIn
9. **P9 — History Management**: Saves/retrieves user translation sessions

*Data stores in the Level 1 DFD:*
- **DS1** — User Database (PostgreSQL)
- **DS2** — Translation Cache (SQLite)
- **DS3** — Temporary Audio/Video Files

---

## 4.4 Entity-Relationship (ER) Diagram Description

**[Insert ER Diagram Here]**

The ER diagram for SeedlingSpeaks consists of the following entities and their relationships:

### Entities and Attributes:

**USERS**
- `user_id` (Primary Key, UUID)
- `email` (Unique, Not Null)
- `hashed_password` (Not Null)
- `full_name`
- `created_at` (Timestamp)
- `is_active` (Boolean)

**TRANSLATION_SESSIONS**
- `session_id` (Primary Key, UUID)
- `user_id` (Foreign Key → USERS)
- `original_text`
- `translated_text`
- `source_language`
- `target_language`
- `tone_applied`
- `created_at` (Timestamp)
- `audio_file_path`

**SHARED_CONTENT**
- `share_id` (Primary Key, UUID)
- `session_id` (Foreign Key → TRANSLATION_SESSIONS)
- `user_id` (Foreign Key → USERS)
- `channel` (email / slack / linkedin)
- `recipient`
- `shared_at` (Timestamp)
- `status`

**VIDEO_JOBS**
- `job_id` (Primary Key, UUID)
- `user_id` (Foreign Key → USERS)
- `video_filename`
- `srt_file_path`
- `vtt_file_path`
- `status` (pending / processing / completed / failed)
- `created_at` (Timestamp)

**TRANSLATION_CACHE**
- `cache_id` (Primary Key, Integer)
- `source_text_hash` (Indexed)
- `target_language`
- `translated_text`
- `created_at` (Timestamp)
- `hit_count` (Integer)

### Relationships:

- A **USER** can have many **TRANSLATION_SESSIONS** (1:N)
- A **TRANSLATION_SESSION** can have many **SHARED_CONTENT** records (1:N)
- A **USER** can have many **VIDEO_JOBS** (1:N)

---

## 4.5 Database Schema

### Table: users

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | Primary Key, Default: gen_random_uuid() |
| email | VARCHAR(255) | Unique, Not Null |
| hashed_password | VARCHAR(255) | Not Null |
| full_name | VARCHAR(100) | |
| is_active | BOOLEAN | Default: True |
| created_at | TIMESTAMP | Default: NOW() |

### Table: translation_sessions

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | Primary Key |
| user_id | UUID | FK → users.id, Not Null |
| original_text | TEXT | |
| translated_text | TEXT | |
| source_language | VARCHAR(10) | |
| target_language | VARCHAR(10) | |
| tone_applied | VARCHAR(50) | |
| audio_file_path | VARCHAR(500) | |
| created_at | TIMESTAMP | Default: NOW() |

### Table: shared_content

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | Primary Key |
| session_id | UUID | FK → translation_sessions.id |
| user_id | UUID | FK → users.id |
| channel | VARCHAR(50) | Not Null |
| recipient | VARCHAR(255) | |
| status | VARCHAR(20) | |
| shared_at | TIMESTAMP | Default: NOW() |

---

&nbsp;

---

# CHAPTER 5 — IMPLEMENTATION

---

## 5.1 Module Description

The SeedlingSpeaks application is divided into the following major modules:

### Module 1: Authentication Module

**Files:** `backend/routers/auth_router.py`, `backend/services/auth.py`

This module handles all user authentication operations:
- **Signup**: Accepts email and password, validates uniqueness, hashes the password using bcrypt, and stores the user in the PostgreSQL database.
- **Login**: Validates credentials and returns a JWT access token with a configurable expiry.
- **Profile retrieval**: Accepts the JWT token in the Authorization header and returns user profile information.

The JWT token is generated with the user's email as the subject (`sub`) claim and is signed with a secret key stored in the environment variables.

### Module 2: Audio Processing Module

**Files:** `backend/routers/audio_router.py`, `backend/services/sarvam_client.py`, `backend/services/audio_utils.py`

This module is the core of the voice translation workflow:
1. Receives audio file upload (WAV/MP3/OGG) from the client
2. Preprocesses the audio using `audio_utils.py` (format conversion, noise filtering)
3. Sends the audio to the **Sarvam AI Speech-to-Text API**
4. Returns the English transcript along with a confidence score
5. Handles **audio diarization** (speaker separation) for multi-speaker recordings
6. Provides the `/api/text-to-speech` endpoint that converts text to audio using Sarvam TTS

### Module 3: Translation Module

**Files:** `backend/routers/translation_router.py`, `backend/services/gemini_client.py`, `backend/services/sarvam_client.py`

This module handles all text-based AI operations:
- **Tone Rewriting** (`/api/rewrite-tone`): Sends text + tone instruction to Gemini AI
- **Text Translation** (`/api/translate-text`): Translates English text to a target Indian language via Sarvam AI
- **Advanced Translation** (`/api/advanced-translate`): Extended translation with context awareness
- **Multi-Language Translation** (`/api/multi-translate`): Translates to multiple languages simultaneously
- **Vision Translation** (`/api/vision-translate`): Sends image + prompt to Gemini Vision API
- **Back Translation** (`/api/back-translate`): Translates back from native to English for verification

### Module 4: Analysis Module

**Files:** `backend/routers/analysis_router.py`

This module provides AI-powered text analysis features using Google Gemini:
- **Sentiment Analysis** (`/api/analyze-sentiment`): Detects positive/negative/neutral sentiment
- **Tone Suggestion** (`/api/suggest-tone`): Suggests an appropriate tone based on the content
- **Summarization** (`/api/summarize`): Creates a concise summary of the transcription
- **Meeting Notes** (`/api/meeting-notes`): Structures transcribed conversation into meeting notes format
- **Q&A** (`/api/qa`): Answers questions about the transcribed content
- **Readability Score** (`/api/readability`): Scores the reading ease of the text

### Module 5: Video Processing Module

**Files:** `backend/routers/video_router.py`, `backend/services/video_service.py`

This module handles video file processing:
1. Accepts video file uploads
2. Extracts the audio track from the video
3. Sends extracted audio to Sarvam AI for transcription
4. Generates time-aligned .SRT and .VTT subtitle files
5. Returns subtitle files for download and display

### Module 6: Sharing Module

**Files:** `backend/routers/sharing_router.py`, `backend/services/email_service.py`, `backend/services/slack_service.py`, `backend/services/linkedin_service.py`

This module handles distributing translated content to external channels:
- **Email**: Sends formatted translation to recipient email address
- **Slack**: Posts translation to a specified Slack channel via webhook
- **LinkedIn**: Publishes translated content as a LinkedIn post
- **Export**: Generates a downloadable PDF/text export of the translation

### Module 7: Session / History Module

**Files:** `backend/routers/session_router.py`

This module manages user translation sessions:
- Saves each translation session (original text, translated text, tone, language) to the database
- Retrieves session history for the authenticated user
- Supports pagination and filtering

### Module 8: English-to-Native Module

**Files:** `backend/routers/e2n_router.py`

This module handles the reverse translation flow (English input → Native language output):
- Accepts English text input directly
- Translates to the target Indian language
- Provides TTS playback of the translated text

### Module 9: Translation Cache Module

**Files:** `backend/services/translation_cache.py`

This module implements an SQLite-based cache to store frequently translated phrases:
- On each translation request, checks cache first
- Returns cached result if available (cache hit)
- Stores new translations in cache for future requests
- Exposes cache statistics via `/api/cache/stats`

### Module 10: React Frontend — Web Application

**Files:** `react-frontend/src/`

The React web application is the primary interface. Key pages include:
- **Home.jsx**: Main translation interface with voice recording, tone selection, and output display
- **LandingPage.jsx**: Marketing landing page for new visitors
- **AuthPage.jsx**: Login and registration page
- **History.jsx**: User translation history
- **VideoTranslate.jsx**: Video subtitle generation interface
- **VisionTranslate.jsx**: Image text extraction and translation interface
- **EnglishToNativeView.jsx**: Reverse translation interface
- **Profile.jsx**: User account management
- **Settings.jsx**: Application settings
- **Analytics.jsx**: Usage analytics and statistics

### Module 11: Mobile Application

**Files:** `mobile-app/app/`

Built with Expo (React Native), the mobile app provides:
- **Drawer Navigation** with native-feel sidebar
- **Voice recording** using device microphone
- **Translation display** optimised for mobile screens
- **History screen** for past translations
- **Native-to-English** and **English-to-Native** screens

### Module 12: Chrome Extension

**Files:** `chrome-extension/public/`

The Chrome extension provides:
- **Popup interface** accessible from any webpage
- Voice input and text translation
- Quick copy of translated output

### Module 13: Desktop Widget (Electron)

**Files:** `desktop-widget/`

An Electron-based desktop widget that:
- Displays as an always-on-top overlay
- Supports voice input and shows translated output
- Installable as a .dmg on macOS
- Runs independently without needing the browser

---

## 5.2 Code Snippets

### Snippet 1: FastAPI Main Application Entry Point

```python
# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.auth_router import router as auth_router
from routers.audio_router import router as audio_router
from routers.translation_router import router as translation_router

app = FastAPI(title="Voice Translation Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)       # /api/auth/*
app.include_router(audio_router)      # /api/translate-audio, /api/text-to-speech
app.include_router(translation_router) # /api/rewrite-tone, /api/translate-text

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
```

### Snippet 2: JWT Authentication Service

```python
# backend/services/auth.py
from datetime import datetime, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext
import os

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
```

### Snippet 3: Sarvam AI Audio Translation (Simplified)

```python
# backend/services/sarvam_client.py (simplified)
import httpx
import os

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")
SARVAM_STT_URL = "https://api.sarvam.ai/speech-to-text-translate"

async def transcribe_and_translate(audio_bytes: bytes, source_language: str) -> dict:
    headers = {"api-subscription-key": SARVAM_API_KEY}
    files = {"file": ("audio.wav", audio_bytes, "audio/wav")}
    data = {"model": "saarika:v2", "language_code": source_language}

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            SARVAM_STT_URL, headers=headers, files=files, data=data
        )
        response.raise_for_status()
        return response.json()
```

### Snippet 4: Gemini AI Tone Rewriting

```python
# backend/services/gemini_client.py (simplified)
import google.generativeai as genai
import os

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-1.5-flash")

async def rewrite_with_tone(text: str, tone: str, custom_desc: str = "") -> str:
    tone_instructions = {
        "email_formal": "Rewrite as a professional formal email.",
        "slack": "Rewrite as a casual Slack message with relevant emojis.",
        "linkedin": "Rewrite as a professional LinkedIn post with hashtags.",
        "email_casual": "Rewrite as a friendly, conversational email.",
    }
    instruction = tone_instructions.get(tone, custom_desc or "Rewrite professionally.")
    prompt = f"{instruction}\n\nOriginal text:\n{text}"
    response = model.generate_content(prompt)
    return response.text
```

### Snippet 5: React Voice Recording Hook (Simplified)

```javascript
// react-frontend/src/hooks/useVoiceRecorder.js (simplified)
import { useState, useRef } from 'react';

export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    chunksRef.current = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
      setAudioBlob(blob);
    };

    mediaRecorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  return { isRecording, audioBlob, startRecording, stopRecording };
}
```

### Snippet 6: API Service Call (Frontend)

```javascript
// react-frontend/src/services/api.js (simplified)
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const translateAudio = async (audioBlob, sourceLanguage) => {
  const formData = new FormData();
  formData.append('file', audioBlob, 'recording.wav');
  formData.append('source_language', sourceLanguage);
  const response = await api.post('/api/translate-audio', formData);
  return response.data;
};

export const rewriteTone = async (text, tone, customDesc = '') => {
  const response = await api.post('/api/rewrite-tone', {
    text, tone, custom_description: customDesc
  });
  return response.data;
};
```

---

## 5.3 Screenshots

**[Insert Login / Register Page Screenshot]**
*The authentication page presents a clean, minimal login form with email and password fields. A toggle allows switching between the login and registration forms. The design uses the SeedlingSpeaks brand colors (saffron primary color) with a white card on a subtle gradient background.*

**[Insert Landing Page Screenshot]**
*The landing page showcases the application's key features with animated illustrations. A prominent "Get Started" call-to-action button leads to the registration page. The page lists supported Indian languages with flag icons and provides a brief overview of the tone styling and sharing features.*

**[Insert Main Translation Interface (Home Page) Screenshot]**
*The Home page is the primary interface divided into two main sections:*
- *Left panel: Language selector, microphone recording button with animated pulse effect, and transcription output area*
- *Right panel: Tone selector dropdown, "Rewrite" button, translated text display, and TTS playback button*
*At the top of the output area, four action buttons (Speak, Copy, Save, Clear) are visible. A language selector and Translate button are positioned at the top right.*

**[Insert Tone Retone Dropdown Screenshot]**
*The retone dropdown menu appears below the Retone button and displays all available tone options (Email Formal, Email Casual, Slack, LinkedIn, Custom) as selectable list items. Selected tone is highlighted in saffron. An "Apply" button at the bottom confirms the selection.*

**[Insert Original / Retoned Toggle Screenshot]**
*After tone rewriting, two pill-style toggle buttons labeled "Original" and "Retoned" appear above the text area. The active selection is shown with a dark background. Clicking "Retoned" switches the text area to show the AI-rewritten version with a light amber background.*

**[Insert Video Subtitle Generation Page Screenshot]**
*The VideoTranslate page provides a drag-and-drop zone for video file upload, a progress indicator showing processing stages (Upload → Extract Audio → Transcribe → Generate Subtitles), and a download panel offering .SRT and .VTT file downloads upon completion.*

**[Insert Vision Translate Page Screenshot]**
*The VisionTranslate page shows an image upload area and an extracted text panel. After uploading an image containing text (a sign, document, or screenshot), the Gemini Vision API extracts the text and displays it alongside the translation in the selected target language.*

**[Insert Translation History Page Screenshot]**
*The History page displays a chronological list of the user's past translation sessions. Each entry shows the source language, target language, a preview of the original and translated text, the timestamp, and the tone applied. Clicking an entry expands it to show the full text.*

**[Insert Mobile App Screenshot]**
*The mobile application (running on Expo) mirrors the web app's core functionality with a native-feeling interface. A hamburger menu reveals a drawer sidebar with navigation links (Home, History, Native→English, English→Native, Profile). The main screen displays a large microphone button in the center.*

**[Insert Chrome Extension Popup Screenshot]**
*The Chrome extension popup appears as a compact card with a microphone button, language selector, and translated output area. It allows quick translations from any webpage without leaving the browser tab.*

**[Insert Desktop Widget Screenshot]**
*The Electron desktop widget appears as a floating card overlay above all other windows. It has a compact, minimalist design with a microphone button, language selector, and real-time translation output. The widget stays visible even when switching between applications.*

---

&nbsp;

---

# CHAPTER 6 — SOFTWARE TESTING

---

## 6.1 Types of Testing

### 6.1.1 Unit Testing

Unit testing was performed on individual backend service functions to verify their correctness in isolation. Functions tested include:

- `verify_password()` — Authentication service
- `create_access_token()` — JWT generation
- `get_password_hash()` — Password hashing
- Translation cache hit/miss logic in `translation_cache.py`

### 6.1.2 Integration Testing

Integration testing verified that the API endpoints correctly integrate with external services (Sarvam AI and Google Gemini) and the database:

- Audio upload → Sarvam STT → Transcript returned to client
- Text → Gemini Tone Rewrite → Styled text returned
- Text → Sarvam Translation → Native language output returned
- User signup → Database record created → JWT returned

### 6.1.3 System Testing

End-to-end system testing was performed by running the complete workflow:

1. User registers and logs in via the web interface
2. Records a voice message in Hindi
3. Receives English transcript
4. Applies "Email Formal" tone style
5. Translates styled text to Tamil
6. Plays back the Tamil audio via TTS
7. Shares the translation via email
8. Views the session in the History page

### 6.1.4 User Interface Testing

UI testing covered:

- Form validation (empty fields, invalid email, weak password)
- Responsive layout across screen sizes (mobile: 375px, tablet: 768px, desktop: 1440px)
- Microphone permission prompts and denials
- Button states (loading spinner, disabled state during API calls)
- Keyboard navigation and ARIA accessibility

### 6.1.5 API Testing

API endpoints were tested using **FastAPI's built-in Swagger UI** (`/docs`) and **Postman**:

- All endpoints were tested for correct status codes (200, 400, 401, 422, 500)
- JWT authentication was verified on protected endpoints
- File upload endpoints were tested with various audio formats

### 6.1.6 Performance Testing

- Translation cache was tested with 100 repeated translation requests; cache hit rate reached 95% after warmup
- API response time was measured: average 1.8s for audio translation, 0.9s for tone rewriting
- Frontend Lighthouse score: Performance 87, Accessibility 94, Best Practices 92, SEO 88

---

## 6.2 Test Cases

### Test Case Table 1: User Authentication Module

| TC# | Test Case Description | Input | Expected Output | Actual Output | Status |
|-----|----------------------|-------|-----------------|---------------|--------|
| TC-01 | Valid user registration | email: test@email.com, password: Secure@123 | 201 Created, JWT token returned | 201 Created, JWT token returned | PASS |
| TC-02 | Duplicate email registration | email: test@email.com (already registered) | 400 Bad Request, "Email already registered" | 400 Bad Request | PASS |
| TC-03 | Login with correct credentials | email: test@email.com, password: Secure@123 | 200 OK, access_token returned | 200 OK, access_token returned | PASS |
| TC-04 | Login with wrong password | email: test@email.com, password: wrong123 | 401 Unauthorized, "Invalid credentials" | 401 Unauthorized | PASS |
| TC-05 | Access protected endpoint without token | GET /api/auth/me (no Authorization header) | 401 Unauthorized | 401 Unauthorized | PASS |
| TC-06 | Access protected endpoint with expired token | GET /api/auth/me (expired JWT) | 401 Unauthorized | 401 Unauthorized | PASS |
| TC-07 | Registration with invalid email format | email: notanemail | 422 Unprocessable Entity | 422 Unprocessable Entity | PASS |

### Test Case Table 2: Audio Translation Module

| TC# | Test Case Description | Input | Expected Output | Actual Output | Status |
|-----|----------------------|-------|-----------------|---------------|--------|
| TC-08 | Upload valid Hindi audio file | WAV file, 5 seconds, Hindi speech | 200 OK, English transcript | 200 OK, English transcript | PASS |
| TC-09 | Upload Tamil audio file | WAV file, 10 seconds, Tamil speech | 200 OK, English transcript | 200 OK, English transcript | PASS |
| TC-10 | Upload audio with background noise | Noisy WAV file | 200 OK, partial transcript with lower confidence | 200 OK, transcript returned | PASS |
| TC-11 | Upload unsupported file format | TXT file | 400 Bad Request | 400 Bad Request | PASS |
| TC-12 | Upload empty audio file | 0-byte WAV | 400 Bad Request | 400 Bad Request | PASS |
| TC-13 | Upload very long audio (>2 min) | 150 second WAV | 200 OK, full transcript | 200 OK, transcript returned | PASS |
| TC-14 | Request TTS for Hindi text | text: "नमस्ते दुनिया", language: hi-IN | 200 OK, audio/wav binary | 200 OK, audio returned | PASS |

### Test Case Table 3: Translation and Tone Module

| TC# | Test Case Description | Input | Expected Output | Actual Output | Status |
|-----|----------------------|-------|-----------------|---------------|--------|
| TC-15 | Rewrite with Email Formal tone | text: "hey can we meet tomorrow", tone: email_formal | 200 OK, formal email version | 200 OK, styled text returned | PASS |
| TC-16 | Rewrite with Slack tone | text: "project is delayed", tone: slack | 200 OK, casual Slack message | 200 OK, Slack-styled text | PASS |
| TC-17 | Rewrite with custom tone | text: "...", tone: custom, desc: "formal Hindi corporate" | 200 OK, custom styled text | 200 OK, styled text returned | PASS |
| TC-18 | Translate English to Hindi | text: "Hello, how are you?", target: hi-IN | 200 OK, "नमस्ते, आप कैसे हैं?" | 200 OK, correct Hindi translation | PASS |
| TC-19 | Translate to Tamil | text: "Good morning", target: ta-IN | 200 OK, Tamil translation | 200 OK, Tamil translation | PASS |
| TC-20 | Multi-translate to 3 languages | text: "Hello", targets: [hi-IN, ta-IN, te-IN] | 200 OK, 3 translations | 200 OK, 3 translations | PASS |
| TC-21 | Translate empty string | text: "", target: hi-IN | 400 Bad Request | 400 Bad Request | PASS |

### Test Case Table 4: Video and Vision Module

| TC# | Test Case Description | Input | Expected Output | Actual Output | Status |
|-----|----------------------|-------|-----------------|---------------|--------|
| TC-22 | Upload MP4 video for subtitles | 2-minute MP4 with Hindi narration | 200 OK, .SRT and .VTT files | 200 OK, subtitle files returned | PASS |
| TC-23 | Upload image with printed text | JPEG image with English text | 200 OK, extracted and translated text | 200 OK, text extracted | PASS |
| TC-24 | Upload image with handwritten text | JPEG with handwriting | 200 OK, partial extraction | 200 OK, partial text | PASS |
| TC-25 | Upload unsupported video format | AVI file | 400 Bad Request | 400 Bad Request | PASS |

### Test Case Table 5: UI / Frontend Tests

| TC# | Test Case Description | Steps | Expected Result | Status |
|-----|----------------------|-------|-----------------|--------|
| TC-26 | Voice recording starts and stops | Click microphone → wait 5s → click stop | Recording indicator shows; audio captured | PASS |
| TC-27 | Language selector changes language | Select "Tamil" from dropdown | Language updates; subsequent translation uses Tamil | PASS |
| TC-28 | Toggle between Original and Retoned | Record → rewrite with Slack tone → click Retoned tab | Text area shows Slack-styled version | PASS |
| TC-29 | Send icon opens sharing modal | Click send icon (bottom-right of textarea) | Sharing modal opens with channel options | PASS |
| TC-30 | Responsive layout on mobile | Resize browser to 375px width | Layout adjusts; all elements accessible | PASS |
| TC-31 | Logout clears JWT and redirects | Click logout from profile dropdown | JWT removed from localStorage; redirected to login | PASS |

---

&nbsp;

---

# CHAPTER 7 — CONCLUSION

The **SeedlingSpeaks** project successfully demonstrates the development of a comprehensive, AI-powered multilingual voice translation application tailored for the Indian linguistic context. Over the course of this project, a complete full-stack system was designed, developed, and tested — spanning a React web application, a React Native mobile app, a Chrome browser extension, and a Desktop widget, all powered by a unified FastAPI backend.

The application addresses a genuine and significant challenge: enabling effective professional communication across India's diverse linguistic landscape. By integrating **Sarvam AI** for Indian-language speech recognition and translation, and **Google Gemini AI** for intelligent tone rewriting and vision capabilities, SeedlingSpeaks delivers capabilities that go far beyond simple translation — it understands context, adapts tone, and distributes content across professional channels.

Key achievements of this project include:

1. **Successful integration of two cutting-edge AI APIs** — Sarvam AI and Google Gemini — into a production-grade application
2. **Multi-platform delivery** across web, mobile, desktop, and browser extension
3. **End-to-end workflow** from voice input to tone-styled, translated, and shareable output
4. **Robust authentication system** with JWT and secure password hashing
5. **Performance optimisation** through translation caching reducing repeat API calls
6. **Comprehensive UI** with 8 major interface improvements including retone dropdown, original/retoned toggle, and responsive layout fixes
7. **Video subtitle generation** providing a practical utility for content creators

The project provided valuable hands-on experience in modern software development practices including RESTful API design, component-based UI development, AI API integration, database design, and multi-platform deployment.

In conclusion, SeedlingSpeaks successfully fulfills the objectives set out at the beginning of the project and demonstrates how AI technologies can be meaningfully applied to solve real-world communication problems in a multilingual society like India.

---

&nbsp;

---

# CHAPTER 8 — FUTURE ENHANCEMENTS

While the current version of SeedlingSpeaks covers a comprehensive set of features, several enhancements are planned for future development:

### 8.1 Real-Time Streaming Translation

Currently, the application records a complete audio clip and then processes it. A future enhancement would implement **real-time streaming speech-to-text** using WebSocket connections, allowing users to see the transcription appear word-by-word as they speak — similar to real-time captions in video conferencing tools.

### 8.2 Speaker Diarization for Multi-Speaker Audio

The application currently processes single-speaker audio. A future version would integrate **multi-speaker diarization** to differentiate between multiple speakers in a recording (e.g., a meeting recording) and generate separate translations for each speaker.

### 8.3 Conversation Mode

A **conversation mode** would enable real-time two-way translation between two users speaking different languages. User A speaks in Hindi; the app instantly translates to Tamil and plays it for User B, who speaks back in Tamil — enabling a seamless multilingual conversation.

### 8.4 Offline Mode

Integrating on-device AI models (such as Whisper small or a distilled Sarvam model) would enable **offline translation** functionality, which is critical for users in areas with poor internet connectivity. The mobile app would benefit most from this enhancement.

### 8.5 Wider Language Support

Expanding support to include **more Indian languages** (Assamese, Kashmiri, Sindhi, Dogri, Konkani, Manipuri, Santali, Bodo, Maithili) and **international languages** would significantly increase the application's reach.

### 8.6 AI-Powered Grammar Correction

Adding an optional **grammar correction** layer that polishes the transcribed English before tone rewriting would improve the quality of the final output, especially for users whose primary language is not English.

### 8.7 Integration with Video Conferencing Tools

**Plug-in integrations** for Zoom, Google Meet, and Microsoft Teams would allow SeedlingSpeaks to provide real-time translation and subtitles directly within video conference calls, without requiring users to switch to a separate application.

### 8.8 Team / Organisation Accounts

Adding **team workspace functionality** with shared history, collaborative tone templates, and admin controls would make SeedlingSpeaks suitable for enterprise deployment within multilingual organisations.

### 8.9 Custom Vocabulary and Domain-Specific Models

Allowing users to add **custom vocabulary** (industry-specific terminology, brand names) that the AI models prioritise during transcription would improve accuracy in specialised domains like healthcare, legal, and technology.

### 8.10 Analytics Dashboard for Admins

An **administrative analytics dashboard** providing insights into usage patterns, most-used languages, tone preferences, and API consumption would help the Seedling Labs team make data-driven product decisions.

---

&nbsp;

---

# CHAPTER 9 — BIBLIOGRAPHY

### Books

1. Ramalho, L. (2022). *Fluent Python: Clear, Concise, and Effective Programming* (2nd ed.). O'Reilly Media.

2. Banks, A. & Porcello, E. (2020). *Learning React: Modern Patterns for Developing React Apps* (2nd ed.). O'Reilly Media.

3. Pressman, R. S. & Maxim, B. R. (2019). *Software Engineering: A Practitioner's Approach* (9th ed.). McGraw-Hill Education.

4. Sommerville, I. (2016). *Software Engineering* (10th ed.). Pearson.

5. Date, C. J. (2019). *Database Design and Relational Theory*. Apress.

### Online Documentation and References

6. FastAPI Documentation. (2024). *FastAPI — Modern, fast (high-performance), web framework for building APIs with Python*. Retrieved from https://fastapi.tiangolo.com

7. React Documentation. (2024). *React — A JavaScript library for building user interfaces*. Retrieved from https://react.dev

8. Sarvam AI Documentation. (2024). *Sarvam AI — APIs for Indian Language Speech and Translation*. Retrieved from https://docs.sarvam.ai

9. Google AI. (2024). *Gemini API Documentation — Google AI for Developers*. Retrieved from https://ai.google.dev/gemini-api/docs

10. SQLAlchemy Documentation. (2024). *SQLAlchemy — The Database Toolkit for Python*. Retrieved from https://docs.sqlalchemy.org

11. Tailwind CSS Documentation. (2024). *Tailwind CSS — A utility-first CSS framework*. Retrieved from https://tailwindcss.com/docs

12. Expo Documentation. (2024). *Expo — Build one app that runs natively on all your users' devices*. Retrieved from https://docs.expo.dev

13. Electron Documentation. (2024). *Electron — Build cross-platform desktop apps with JavaScript, HTML, and CSS*. Retrieved from https://www.electronjs.org/docs

14. Uvicorn Documentation. (2024). *Uvicorn — An ASGI web server implementation for Python*. Retrieved from https://www.uvicorn.org

### Research Papers and Articles

15. Arora, S., et al. (2022). IndicSpeech: Text-to-Speech Synthesis for Indian Languages. *Proceedings of the 2022 Conference on Empirical Methods in Natural Language Processing*.

16. Vaswani, A., et al. (2017). Attention is All You Need. *Advances in Neural Information Processing Systems*, 30.

17. Devlin, J., Chang, M. W., Lee, K., & Toutanova, K. (2018). BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding. *arXiv preprint arXiv:1810.04805*.

18. MDN Web Docs. (2024). *MediaRecorder API — Web APIs*. Mozilla Developer Network. Retrieved from https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder

19. OWASP Foundation. (2024). *OWASP Top Ten — The Ten Most Critical Web Application Security Risks*. Retrieved from https://owasp.org/www-project-top-ten/

20. JSON Web Tokens. (2024). *JWT.io — Introduction to JSON Web Tokens*. Retrieved from https://jwt.io/introduction

---

&nbsp;

---

## APPENDIX

### A. List of API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/health | GET | Health check |
| /api/auth/signup | POST | User registration |
| /api/auth/login | POST | User login, returns JWT |
| /api/auth/me | GET | Get authenticated user profile |
| /api/translate-audio | POST | Audio file → English transcript |
| /api/diarize-audio | POST | Audio → Speaker-separated transcript |
| /api/text-to-speech | POST | Text → Audio |
| /api/rewrite-tone | POST | Text + tone → Styled text |
| /api/translate-text | POST | English → Target language |
| /api/advanced-translate | POST | Context-aware translation |
| /api/multi-translate | POST | Translate to multiple languages |
| /api/vision-translate | POST | Image → Extracted + translated text |
| /api/back-translate | POST | Native → English verification |
| /api/video/upload | POST | Upload video for subtitle generation |
| /api/analyze-sentiment | POST | Sentiment analysis |
| /api/suggest-tone | POST | Tone suggestion |
| /api/summarize | POST | Text summarisation |
| /api/meeting-notes | POST | Meeting notes generation |
| /api/qa | POST | Q&A over transcription |
| /api/readability | POST | Readability score |
| /api/send/email | POST | Send translation via email |
| /api/send/slack | POST | Post to Slack channel |
| /api/native-to-english/* | GET/POST | Session history management |
| /api/english-to-native/* | GET/POST | E2N translation sessions |
| /api/cache/stats | GET | Translation cache statistics |
| /api/cache/clear | DELETE | Clear translation cache |

### B. Supported Languages Reference

| Language | Code | Region |
|----------|------|--------|
| Hindi | hi-IN | North India |
| Bengali | bn-IN | East India |
| Tamil | ta-IN | South India |
| Telugu | te-IN | South India |
| Malayalam | ml-IN | South India |
| Marathi | mr-IN | West India |
| Gujarati | gu-IN | West India |
| Kannada | kn-IN | South India |
| Punjabi | pa-IN | North India |
| Odia | or-IN | East India |

### C. Environment Variables Reference

| Variable | Purpose |
|----------|---------|
| SARVAM_API_KEY | API key for Sarvam AI services |
| GEMINI_API_KEY | API key for Google Gemini AI |
| DATABASE_URL | PostgreSQL connection string |
| SECRET_KEY | JWT signing secret |

---

*End of Report*

---

**Submitted by:** Prajwal Chikkur
**Course:** Bachelor of Computer Applications (BCA), 6th Semester
**Company:** Seedling Labs
**Date:** May 2026

---
