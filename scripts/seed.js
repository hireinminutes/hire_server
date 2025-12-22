const mongoose = require('mongoose');
const Recruiter = require('../models/Recruiter');
const Candidate = require('../models/Candidate');
const Job = require('../models/Job');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected for seeding');
  } catch (error) {
    console.error('Database connection error:', error.message);
    process.exit(1);
  }
};

const seedData = async () => {
  try {
    // Clear existing data
    await Recruiter.deleteMany();
    await Candidate.deleteMany();
    await Job.deleteMany();

    // Create sample candidates
    const candidates = await Candidate.create([
      {
        email: 'john.doe@example.com',
        password: 'password123',
        fullName: 'John Doe',
        profile: {
          professionalSummary: 'Experienced software developer with 5+ years in web development',
          skills: [
            { name: 'JavaScript' },
            { name: 'React' },
            { name: 'Node.js' },
            { name: 'Python' }
          ],
          experience: [{
            jobTitle: 'Senior Software Developer',
            companyName: 'Tech Corp',
            employmentType: 'full-time',
            location: 'San Francisco, CA',
            startDate: new Date('2020-01-01'),
            isCurrentlyWorking: true
          }],
          location: {
            city: 'San Francisco',
            state: 'CA',
            country: 'USA'
          }
        },
        isProfileComplete: true
      }
    ]);

    // Create sample recruiters
    const recruiters = await Recruiter.create([
      {
        email: 'jane.smith@example.com',
        password: 'password123',
        fullName: 'Jane Smith',
        profile: {
          company: {
            name: 'Tech Innovations Inc',
            description: 'Leading technology company specializing in AI solutions',
            industry: 'Technology',
            size: '51-200',
            headOfficeLocation: {
              city: 'New York',
              state: 'NY',
              country: 'USA'
            }
          }
        }
      },
      {
        email: 'recruiter@techcorp.com',
        password: 'password123',
        fullName: 'Mike Johnson',
        profile: {
          company: {
            name: 'Tech Corp',
            description: 'Global technology leader',
            industry: 'Technology',
            size: '1000+',
            headOfficeLocation: {
              city: 'Seattle',
              state: 'WA',
              country: 'USA'
            }
          }
        }
      }
    ]);

    console.log('Users seeded successfully!');
    console.log(`Created ${candidates.length} candidates and ${recruiters.length} recruiters`);
    console.log('\nTest Login Credentials:');
    console.log('Candidate: john.doe@example.com / password123');
    console.log('Recruiter: jane.smith@example.com / password123');
    console.log('Recruiter: recruiter@techcorp.com / password123');

  } catch (error) {
    console.error('Seeding error:', error.message);
  } finally {
    mongoose.connection.close();
  }
};

// Run seeder
connectDB().then(() => {
  seedData();
});