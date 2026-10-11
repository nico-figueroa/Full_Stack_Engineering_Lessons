# 🎓 Full_Stack_Engineering_Lessons

![Codecademy](https://img.shields.io/badge/Codecademy-Learning-blue)

A collection of full-stack engineering coursework, exercises, and projects completed throughout Codecademy's curriculum. This repository reflects my progression in designing, building, refactoring, testing, and maintaining front-end, back-end, API, database, and full-stack applications.

## 📘 About This Repository

These lessons demonstrate practical work with JavaScript, Node.js, Express, React, Redux, relational databases, REST APIs, authentication, testing, and Git. Many projects follow structured Codecademy learning paths, while others include personal enhancements and refactoring.

All licenses and source materials are respected and referenced when appropriate. Contents may be reused under an open license.

![License: MIT](https://img.shields.io/badge/License-MIT-yellow)

## ✨ Project Highlights

### Full Stack — [RESTful Restaurants](./Full_Stack/RESTful_restaurants)

A full-stack web application for managing restaurants, categories, and starred restaurants. It pairs a React user interface with an Express REST API and connects to an external Supabase database API for persistent data.

* React interface with Axios-based API requests
* Express API with RESTful CRUD routes for restaurants, categories, and starred restaurants
* Supabase integration through `@supabase/supabase-js` and `@supabase/server`
* Restaurant/category relationships and starred-restaurant management
* Concurrent front-end and back-end development workflow

Run it from the project directory with:

```bash
npm run dev
```

### Express — [E-Commerce App](./ExpressJS/E_Commerce_App)

A production-oriented e-commerce REST API covering authentication, users, products, carts, orders, and payments. It uses PostgreSQL for persistence and includes API documentation, input validation, security-conscious authentication, and automated tests.

* Express routes for auth, users, products, carts, orders, and payments
* PostgreSQL integration through `pg`
* JWT authentication, bcrypt password hashing, and cookie parsing
* Zod request validation and environment-based configuration with dotenv
* OpenAPI specification and interactive Swagger UI documentation
* Jest and SuperTest API test suite, plus a development database seed command

Useful commands:

```bash
npm start
npm test
npm run seed:dev
```

### React — [Jammming](./React/Jammming)

A full React application built during Codecademy’s React course.
Includes component architecture, state management, API integration, and deployment practice.

### Express — [Boss Machine API](./ExpressJS/Boss-Machine-API)

A full REST API for managing minions, million-dollar ideas, meetings, and optional work assignments.
The project practices Express routing, middleware, CORS, request validation, in-memory data helpers, and automated API testing with Mocha and SuperTest.

### Node.js — [Find Your Hat](./NodeJS/Find_hat)

A terminal-based maze game where the player navigates a dynamically sized field to find a lost hat while avoiding holes.
It includes configurable difficulty, a hard mode with dynamically generated hazards, real-time keyboard input, and colored terminal output.

### SQL — [Full PostgreSQL Database](./SQL)

A PostgreSQL database design and delivery package for a risk management matrix that meets the requirements of ISO14971 for risk management of medical devices.
It includes a normalized schema, validation and publication functions, traceability views, seed data, Excel staging, smoke tests, deployment scripts, and rollback support.

### OAuth — [GitHub Authentication](./OAuth)

A Node.js and Express application that demonstrates GitHub OAuth authentication with Passport and persistent sessions.
It includes environment-based OAuth configuration, user serialization and deserialization, login and logout flows, and middleware that protects the account route from unauthenticated access.

### Redux — [Reddit Trends Analyzer](./Redux)

* Full React + Redux application
* Wireframes generation
* Project Management via GitHub
* Reddit API use
* Full Jest + Selenium unit and integration test suites
* CI/CD via GitHub + Netlify including custom domain
* Offline operation capabilities

Each folder corresponds to a Codecademy module and contains exercises, projects, or guided assignments.

## 📚 Learning Sources

* Codecademy curriculum
* Official technology documentation and tutorials
* Backend authentication and authorization exercises covering OAuth 2.0, Passport, Express sessions, protected routes, and logout flows
* JavaScript testing exercises covering unit tests, integration tests, assertions, error cases, code coverage, and API behavior
* Personal experimentation and refactoring

AI assistance was used interactively and under my direction. I remained responsible for understanding, selecting, adapting, testing, and integrating any suggestions; this repository is not the result of unattended AI-generated or autonomous coding.

## 🛠️ Technologies Practiced

### Core Web Development

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?logo=express&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black)
![Redux](https://img.shields.io/badge/Redux-764ABC?logo=redux&logoColor=white)
![Create React App](https://img.shields.io/badge/Create_React_App-09D3AC?logo=createreactapp&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![EJS](https://img.shields.io/badge/EJS-templates-B4CA65)

### APIs, Data, and Full-Stack Integration

![REST API](https://img.shields.io/badge/REST_API-0052CC?logo=fastapi&logoColor=white)
![OpenAPI](https://img.shields.io/badge/OpenAPI-6BA539?logo=openapiinitiative&logoColor=white)
![Swagger](https://img.shields.io/badge/Swagger_UI-85EA2D?logo=swagger&logoColor=black)
![Axios](https://img.shields.io/badge/Axios-5A29E4?logo=axios&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=white)
![SQL](https://img.shields.io/badge/SQL-4479A1?logo=mysql&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?logo=sqlite&logoColor=white)

### Authentication, Security, and Configuration

![JSON Web Tokens](https://img.shields.io/badge/JSON_Web_Tokens-000000?logo=jsonwebtokens&logoColor=white)
![bcrypt](https://img.shields.io/badge/bcrypt-password_hashing-003A70)
![Zod](https://img.shields.io/badge/Zod-validation-3068B7)
![Passport](https://img.shields.io/badge/Passport.js-authentication-34E27A)
![OAuth 2.0](https://img.shields.io/badge/OAuth_2.0-delegated_authorization-3C78A9)
![GitHub OAuth](https://img.shields.io/badge/GitHub_OAuth-provider-181717?logo=github&logoColor=white)
![Express Session](https://img.shields.io/badge/Express_Session-session_management-000000?logo=express&logoColor=white)
![dotenv](https://img.shields.io/badge/dotenv-configuration-ECD53F)
![CORS](https://img.shields.io/badge/CORS-cross--origin_requests-4B5563)

### Testing, Tooling, and Workflow

![Jest](https://img.shields.io/badge/Jest-C21325?logo=jest&logoColor=white)
![React Testing Library](https://img.shields.io/badge/React_Testing_Library-E33332?logo=testinglibrary&logoColor=white)
![Mocha](https://img.shields.io/badge/Mocha-8D6748?logo=mocha&logoColor=white)
![Chai](https://img.shields.io/badge/Chai-A30701?logo=chai&logoColor=white)
![SuperTest](https://img.shields.io/badge/SuperTest-API_testing-6C757D)
![Prettier](https://img.shields.io/badge/Prettier-1A2B34?logo=prettier&logoColor=F7BA3E)
![Nodemon](https://img.shields.io/badge/Nodemon-76D04B?logo=nodemon&logoColor=black)
![Git](https://img.shields.io/badge/Git-F05032?logo=git&logoColor=white)
![GitHub](https://img.shields.io/badge/GitHub-181717?logo=github&logoColor=white)
![Netlify](https://img.shields.io/badge/Netlify-00C7B7?logo=netlify&logoColor=white)
* [![Netlify Status](https://api.netlify.com/api/v1/badges/87fdc821-4d0c-4dd8-87a8-e23632178083/deploy-status)](https://app.netlify.com/projects/trendsanalyzer/deploys)

### Authentication, Authorization, and Cybersecurity Practices

* JSON Web Token authentication and bcrypt password hashing in the e-commerce API
* OAuth 2.0 delegated authorization with GitHub through Passport
* Session-based authentication, user serialization, logout, and protected routes using authorization middleware
* Request validation with Zod and environment-based handling of configuration and credentials with dotenv
* Security-focused negative paths, including rejected unauthenticated requests, invalid resource IDs, missing users, and bad credentials

### Testing Practices

* Jest and React Testing Library coverage for front-end behavior
* HTML coverage reporting for JavaScript exercises
* Jest and SuperTest API tests covering response status codes, response shapes, CRUD behavior, invalid IDs, and edge cases
* Mocha-based test execution for the Boss-Machine API

## 📨 Contact

* Name: Nicolas Figueroa
* Email: nitem18@hotmail.com
