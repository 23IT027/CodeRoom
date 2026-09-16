# CodeColabAI

A collaborative, real-time code editor where users can seamlessly code together. It provides a platform for multiple users to enter a room, share a unique room ID, and collaborate on code simultaneously.


## 🔮 Features

- 💻 Real-time collaboration on code editing across multiple files
- 📁 Create, open, edit, save, delete, and organize files and folders
- 💾 Option to download the entire codebase as a zip file
- 🚀 Unique room generation with room ID for collaboration
- 🌈 Syntax highlighting for various file types with auto-language detection
- 🚀 Code Execution: Users can execute the code directly within the collaboration environment
- ⏱️ Instant updates and synchronization of code changes across all files and folders
- 📣 Notifications for user join and leave events
- 👥 User presence list with online/offline status indicators
- 💬 Real-time group chatting functionality
- 🔠 Option to change font size and font family
- 🎨 Multiple themes for personalized coding experience

## 🚀 Live Preview

You can view the live preview of the project [here](https://github.com/jeel1811/CodeColabAI).

## 💻 Tech Stack

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router-CA4245?style=for-the-badge&logo=react-router&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![NodeJS](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![ExpressJS](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)
![Socket io](https://img.shields.io/badge/Socket.io-ffffff?style=for-the-badge)
![Git](https://img.shields.io/badge/GIT-E44C30?style=for-the-badge&logo=git&logoColor=white)
![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

## ⚙️ Installation

### Method 1: Manual Installation

1. **Fork this repository:** Click the Fork button located in the top-right corner of this page.
2. **Clone the repository:**
   ```bash
   git clone https://github.com/<your-username>/CodeColabAI.git
   ```
3. **Create .env file:**
   Inside the client and server directories create `.env` and set:

   Frontend:

   ```bash
   VITE_BACKEND_URL=<your_server_url>
   VITE_GEMINI_API_KEY=<your_gemini_api_key>
   ```

   Backend:

   ```bash
   PORT=3000
   ```

   **Note:** To get your Gemini API key, visit [Google AI Studio](https://makersuite.google.com/app/apikey)

4. **Install dependencies:**
   ```bash
   npm install     # Run in both client and server directories
   ```
5. **Start the servers:**
   Frontend:
   ```bash
   cd client
   npm run dev
   ```
   Backend:
   ```bash
   cd server
   npm run dev
   ```
6. **Access the application:**
   ```bash
   http://localhost:5173/
   ```

## 🔮 Features for Next Release

- **Admin Permission:** Implement an admin permission system to manage user access levels and control over certain platform features.

- Comprehensive language support for versatile programming

- Real-time tooltip displaying users currently editing

- Auto suggestion based on programming language

- Collaborative Drawing: Enable users to draw and sketch collaboratively in real-time

- Copilot: An AI-powered assistant that generates code, allowing you to insert, copy, or replace content seamlessly within your files.


## ✍️ About Developer

<table>
  <tbody>
    <tr>
        <td align="center">
            <a href="https://github.com/kunj01">
            <img src="https://img.shields.io/badge/GitHub-100000.svg?style=for-the-badge&logo=github&logoColor=white"/>
            </a>
            <br/>
            <a href="mailto:kunj5706@gmail.com">
            <img src="https://img.shields.io/badge/Gmail-D14836?style=for-the-badge&logo=gmail&logoColor=white"/>
            </a>
        </td>
    </tr>
    <tr>
        <td align="center">
            <a href="https://github.com/23IT027">
            <img src="https://img.shields.io/badge/GitHub-100000.svg?style=for-the-badge&logo=github&logoColor=white"/>
            </a>
            <br/>
            <a href="mailto:ayushdonga111@gmail.com">
            <img src="https://img.shields.io/badge/Gmail-D14836?style=for-the-badge&logo=gmail&logoColor=white"/>
            </a>
        </td>
    </tr>
  </tbody>
</table>
