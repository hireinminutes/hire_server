# Job Board Backend API

A comprehensive REST API for a job board application built with Node.js, Express, and MongoDB.

## Features

- User authentication and authorization (Job Seekers and Employers)
- Job posting and management
- Job applications and tracking
- File upload for resumes
- Search and filtering capabilities
- Rate limiting and security

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer
- **Security**: Helmet, CORS, Rate Limiting
- **Password Hashing**: bcryptjs

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### Installation

1. Clone the repository
2. Navigate to the backend directory
3. Install dependencies:
   ```bash
   npm install
   ```

4. Create a `.env` file in the root directory with the following variables:
   ```
   NODE_ENV=development
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/jobboard
   JWT_SECRET=your_super_secret_jwt_key_here
   JWT_EXPIRE=7d
   BCRYPT_ROUNDS=12
   CLIENT_URL=http://localhost:5173
   ```

5. Start MongoDB service

6. Run the development server:
   ```bash
   npm run dev
   ```

### Seeding Data

To populate the database with sample data:
```bash
node scripts/seed.js
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/change-password` - Change password

### Jobs
- `GET /api/jobs` - Get all jobs (with filtering/search)
- `GET /api/jobs/:id` - Get single job
- `POST /api/jobs` - Create new job (Employer only)
- `PUT /api/jobs/:id` - Update job (Employer only)
- `DELETE /api/jobs/:id` - Delete job (Employer only)
- `GET /api/jobs/my-jobs` - Get employer's jobs

### Applications
- `GET /api/applications/job/:jobId` - Get applications for a job (Employer)
- `POST /api/applications` - Apply for a job (Job Seeker)
- `PUT /api/applications/:id/status` - Update application status (Employer)
- `POST /api/applications/:id/notes` - Add notes to application (Employer)
- `GET /api/applications/my-applications` - Get user's applications (Job Seeker)
- `DELETE /api/applications/:id` - Withdraw application (Job Seeker)

## Data Models

### User
- email (unique)
- password (hashed)
- fullName
- role (job_seeker/employer)
- profile (bio, skills, experience, etc.)
- company (for employers)

### Job
- title, description, requirements
- location, jobType, salary range
- category, experienceLevel
- employer (reference to User)
- applicationCount, views

### Application
- job (reference to Job)
- applicant (reference to User)
- status, coverLetter, resume
- expectedSalary, availability

## Security Features

- JWT authentication
- Password hashing with bcrypt
- Rate limiting
- CORS protection
- Helmet security headers
- Input validation and sanitization

## File Upload

- Resume uploads are stored in the `uploads/` directory
- Supported formats: PDF, DOC, DOCX, TXT, RTF
- Maximum file size: 5MB

## Error Handling

The API uses consistent error response format:
```json
{
  "success": false,
  "message": "Error description"
}
```

## Development

- Use `npm run dev` for development with auto-restart
- Use `npm start` for production
- Environment variables are loaded from `.env` file

## License

This project is licensed under the ISC License.