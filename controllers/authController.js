const Recruiter = require('../models/Recruiter');
const Candidate = require('../models/Candidate');
const College = require('../models/College');
const Admin = require('../models/Admin');
const MailingList = require('../models/MailingList');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Generate JWT Token
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const crypto = require('crypto');
const { sendEmail, emailTemplates } = require('../utils/sendEmail');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const { email, password, fullName, role, ...otherFields } = req.body;

    let Model;
    let userData = { email, password, fullName };

    if (role === 'employer') {
      Model = Recruiter;
      // Basic profile initialization - only set provided fields
      userData.profile = {};
      userData.isApproved = false; // New recruiters need admin approval
      userData.approvalStatus = 'pending';

      // Only set profile fields if they are provided
      if (otherFields.fullName) userData.profile.fullName = otherFields.fullName;
      if (otherFields.jobTitle) userData.profile.jobTitle = otherFields.jobTitle;
      if (otherFields.workEmail) userData.profile.workEmail = otherFields.workEmail;
      if (otherFields.workPhone) userData.profile.workPhone = otherFields.workPhone;
      if (otherFields.profilePhoto) userData.profile.profilePhoto = otherFields.profilePhoto;

      // Location (only if provided)
      if (otherFields.city || otherFields.state || otherFields.country) {
        userData.profile.location = {};
        if (otherFields.city) userData.profile.location.city = otherFields.city;
        if (otherFields.state) userData.profile.location.state = otherFields.state;
        if (otherFields.country) userData.profile.location.country = otherFields.country;
      }

      // Company details (only if provided)
      if (otherFields.companyName || otherFields.companyDescription || otherFields.industry ||
        otherFields.companySize || otherFields.website || otherFields.companyType ||
        otherFields.foundingYear || otherFields.headOfficeCity || otherFields.headOfficeState ||
        otherFields.headOfficeCountry) {
        userData.profile.company = {};

        if (otherFields.companyName) userData.profile.company.name = otherFields.companyName;
        if (otherFields.companyLogo) userData.profile.company.logo = otherFields.companyLogo;
        if (otherFields.companyDescription) userData.profile.company.description = otherFields.companyDescription;
        if (otherFields.industry) userData.profile.company.industry = otherFields.industry;
        if (otherFields.companySize) userData.profile.company.size = otherFields.companySize;
        if (otherFields.website) userData.profile.company.website = otherFields.website;
        if (otherFields.companyType) userData.profile.company.companyType = otherFields.companyType;
        if (otherFields.foundingYear) userData.profile.company.foundingYear = otherFields.foundingYear;
        if (otherFields.gstNumber) userData.profile.company.gstNumber = otherFields.gstNumber;

        // Head office location (only if provided)
        if (otherFields.headOfficeAddress || otherFields.headOfficeCity ||
          otherFields.headOfficeState || otherFields.headOfficeCountry || otherFields.headOfficeZipCode) {
          userData.profile.company.headOfficeLocation = {};
          if (otherFields.headOfficeAddress) userData.profile.company.headOfficeLocation.address = otherFields.headOfficeAddress;
          if (otherFields.headOfficeCity) userData.profile.company.headOfficeLocation.city = otherFields.headOfficeCity;
          if (otherFields.headOfficeState) userData.profile.company.headOfficeLocation.state = otherFields.headOfficeState;
          if (otherFields.headOfficeCountry) userData.profile.company.headOfficeLocation.country = otherFields.headOfficeCountry;
          if (otherFields.headOfficeZipCode) userData.profile.company.headOfficeLocation.zipCode = otherFields.headOfficeZipCode;
        }

        // Social links (only if provided)
        if (otherFields.linkedin || otherFields.twitter || otherFields.instagram || otherFields.youtube) {
          userData.profile.company.socialLinks = {};
          if (otherFields.linkedin) userData.profile.company.socialLinks.linkedin = otherFields.linkedin;
          if (otherFields.twitter) userData.profile.company.socialLinks.twitter = otherFields.twitter;
          if (otherFields.instagram) userData.profile.company.socialLinks.instagram = otherFields.instagram;
          if (otherFields.youtube) userData.profile.company.socialLinks.youtube = otherFields.youtube;
        }
      }
    } else if (role === 'job_seeker') {
      Model = Candidate;
      // Initialize profile with default empty arrays and objects
      userData.profile = {
        skills: [],
        experience: [],
        education: [],
        projects: [],
        certifications: [],
        documents: {},
        socialProfiles: {},
        codingProfiles: {},
        location: {}
      };
    } else if (role === 'college') {
      Model = College;
      userData = {
        email,
        password,
        name: fullName || otherFields.name,
        contactNumber: otherFields.contactNumber,
        website: otherFields.website,
        address: otherFields.address || {},
        description: otherFields.description,
        accreditation: otherFields.accreditation,
        establishedYear: otherFields.establishedYear
      };
    } else if (role === 'admin') {
      Model = Admin;
      // admin minimal profile (no extra fields)
      userData.role = 'admin';
      userData.isVerified = true; // Auto-verify admin accounts
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified'
      });
    }

    // Check if user exists in any collection (Parallelized)
    const [recruiterExists, candidateExists, collegeExists, adminExists] = await Promise.all([
      Recruiter.findOne({ email }),
      Candidate.findOne({ email }),
      College.findOne({ email }),
      Admin.findOne({ email })
    ]);

    const existingUser = recruiterExists || candidateExists || collegeExists || adminExists;

    if (existingUser) {
      if (existingUser.isVerified) {
        return res.status(400).json({
          success: false,
          message: 'User already exists'
        });
      }

      // User exists but is NOT verified
      // Check if the role is the same
      let existingRole = '';
      if (recruiterExists) existingRole = 'employer';
      else if (candidateExists) existingRole = 'job_seeker';
      else if (collegeExists) existingRole = 'college';
      else if (adminExists) existingRole = 'admin';

      if (existingRole !== role) {
        // Different role: Delete the old unverified account and allow new creation
        if (recruiterExists) await Recruiter.findByIdAndDelete(recruiterExists._id);
        if (candidateExists) await Candidate.findByIdAndDelete(candidateExists._id);
        if (collegeExists) await College.findByIdAndDelete(collegeExists._id);
        if (adminExists) await Admin.findByIdAndDelete(adminExists._id);
        // Fall through to creation logic below
      } else {
        // Same role: Update details and resend OTP

        // Update fields
        existingUser.fullName = fullName || existingUser.fullName; // Update if provided
        if (role === 'college') {
          existingUser.name = fullName || otherFields.name || existingUser.name;
        }

        // Update password (will be hashed by pre-save hook)
        existingUser.password = password;

        // Update profile/other fields if necessary. 
        // For simplicity, we overwrite the profile with the new initial state if it's a structural role
        if (role === 'employer' || role === 'job_seeker') {
          // We can selectively update profile fields here if stricter merging is needed, 
          // but for unverified registration retry, resetting to new input is usually expected.
          // However, replacing the entire profile object might be risky if Mongoose doesn't handle nested replacement well with .set
          // Let's rely on standard updates.
          if (userData.profile) {
            existingUser.profile = userData.profile;
          }
        } else if (role === 'college') {
          if (userData.address) existingUser.address = userData.address;
          if (userData.description) existingUser.description = userData.description;
          // ... map other college fields if critical, but standard registration usually just needs auth + basic info
        }

        // Generate NEW OTP
        const otp = crypto.randomInt(100000, 999999).toString();
        const salt = await bcrypt.genSalt(10);
        const otpHash = await bcrypt.hash(otp, salt);
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

        existingUser.otpHash = otpHash;
        existingUser.otpExpiresAt = otpExpiresAt;
        existingUser.otpAttempts = 0;

        await existingUser.save();

        // Send OTP Email
        const emailTemplate = emailTemplates.otpVerification(otp, fullName || existingUser.fullName || 'User');
        sendEmail({
          email: existingUser.email,
          subject: emailTemplate.subject,
          message: emailTemplate.text,
          html: emailTemplate.html
        }).catch(err => {
          console.error('Background OTP email sending failed:', err);
        });

        return res.status(200).json({
          success: true,
          message: 'User already registered but not verified. OTP resent to email.',
          data: {
            userId: existingUser._id,
            email: existingUser.email,
            role: role
          }
        });
      }
    }

    // For admin accounts, skip OTP and auto-verify
    if (role === 'admin') {
      // Create admin user (already set isVerified = true above)
      const user = await Model.create(userData);

      // Generate token immediately for admin
      const token = generateToken(user._id, role);

      res.status(201).json({
        success: true,
        message: 'Admin registration successful.',
        data: {
          user,
          token
        }
      });
      return;
    }

    // Generate OTP for non-admin users
    const otp = crypto.randomInt(100000, 999999).toString();

    // Hash OTP
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(otp, salt);

    // Set OTP expiry (10 minutes)
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Add OTP data to user
    userData.otpHash = otpHash;
    userData.otpExpiresAt = otpExpiresAt;
    userData.otpAttempts = 0;
    userData.isVerified = false;

    // Create user
    const user = await Model.create(userData);

    // Send OTP Email (Non-blocking / Fire-and-forget)
    const emailTemplate = emailTemplates.otpVerification(otp, fullName || 'User');
    sendEmail({
      email: user.email,
      subject: emailTemplate.subject,
      message: emailTemplate.text,
      html: emailTemplate.html
    }).catch(err => {
      console.error('Background OTP email sending failed:', err);
      // We don't rollback user here to keep response fast. 
      // User can use "Resend OTP" if email didn't arrive.
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful. OTP sent to email.',
      data: {
        userId: user._id,
        email: user.email,
        role: role
      }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Verify OTP user
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOTP = async (req, res, next) => {
  try {
    const { email, otp, role } = req.body;

    if (!email || !otp || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email, OTP and role'
      });
    }

    let Model;
    if (role === 'employer') {
      Model = Recruiter;
    } else if (role === 'job_seeker') {
      Model = Candidate;
    } else if (role === 'college') {
      Model = College;
    } else if (role === 'admin') {
      Model = Admin;
    } else {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    // Find user - include otpHash (select: false)
    const user = await Model.findOne({ email }).select('+otpHash +otpExpiresAt +otpAttempts');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'User already verified'
      });
    }

    // Check attempts
    if (user.otpAttempts >= 5) {
      return res.status(400).json({
        success: false,
        message: 'Too many failed attempts. Please request a new OTP.'
      });
    }

    // Check expiry
    if (user.otpExpiresAt < Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'OTP expired. Please request a new one.'
      });
    }

    // Verify OTP
    const isMatch = await bcrypt.compare(otp.toString(), user.otpHash);

    if (!isMatch) {
      user.otpAttempts += 1;
      await user.save();
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    // Success
    user.isVerified = true;
    user.otpHash = undefined;
    user.otpExpiresAt = undefined;
    user.otpAttempts = 0;
    await user.save();

    // Generate token
    const token = generateToken(user._id, role);

    // For recruiters, check if they need onboarding
    let requiresOnboarding = false;
    if (role === 'employer') {
      const recruiter = user;
      // If recruiter is not approved and hasn't completed onboarding, they need onboarding
      requiresOnboarding = !recruiter.isApproved && (!recruiter.recruiterOnboardingDetails || !recruiter.recruiterOnboardingDetails.isComplete);
    }

    // Send Welcome Email (Non-blocking)
    const emailTemplate = emailTemplates.welcome(user.fullName || 'User');
    sendEmail({
      email: user.email,
      subject: emailTemplate.subject,
      message: emailTemplate.text,
      html: emailTemplate.html
    }).catch(err => console.error('Welcome email failed:', err));

    // Check approval status for recruiters
    if (role === 'employer') {
      const recruiter = user;
      // If recruiter is NOT approved
      if (!recruiter.isApproved) {
        // Check if onboarding is complete
        const onboardingComplete = recruiter.recruiterOnboardingDetails && recruiter.recruiterOnboardingDetails.isComplete;

        if (onboardingComplete) {
          // If onboarding is complete but not approved, DO NOT return token
          return res.status(200).json({
            success: true,
            message: 'Email verified. Your account is pending admin approval.',
            data: {
              user: {
                email: user.email,
                role: role,
                isApproved: false,
                approvalStatus: 'pending'
              },
              // No token returned - preventing login
              requiresApproval: true
            }
          });
        }
        // If onboarding is NOT complete, we MUST return token so they can complete onboarding
        requiresOnboarding = true;
      }
    }

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      data: {
        user,
        token,
        requiresOnboarding: role === 'employer' ? requiresOnboarding : false
      }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;

    let Model;
    if (role === 'employer') {
      Model = Recruiter;
    } else if (role === 'job_seeker') {
      Model = Candidate;
    } else if (role === 'college') {
      Model = College;
    } else if (role === 'admin') {
      Model = Admin;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified'
      });
    }

    // Check for user
    const user = await Model.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is verified (Email Verification)
    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email address to login. Check your email for the OTP.'
      });
    }

    // Check if recruiter is approved (for employer role)
    if (role === 'employer' && !user.isApproved) {
      // Check if they need onboarding first
      const needsOnboarding = !user.recruiterOnboardingDetails || !user.recruiterOnboardingDetails.isComplete;

      if (needsOnboarding) {
        return res.status(403).json({
          success: false,
          message: 'Please complete your onboarding process to continue.',
          requiresOnboarding: true
        });
      } else {
        return res.status(403).json({
          success: false,
          message: 'Your account is pending admin approval. You will be notified once approved.',
          approvalStatus: user.approvalStatus,
          rejectionReason: user.rejectionReason || null
        });
      }
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      // Generate a temporary session token for 2FA verification
      const tempToken = crypto.randomBytes(32).toString('hex');

      // Store temporary session (you might want to use Redis or a temporary collection for this)
      // For now, we'll just return a flag indicating 2FA is required

      return res.status(200).json({
        success: true,
        requiresTwoFactor: true,
        message: 'Two-factor authentication required. Please verify your identity.',
        tempToken: tempToken,
        user: {
          email: user.email,
          role: role,
          twoFactorEnabled: true
        }
      });
    }

    // For employers, we might still want to check for admin approval if that's a separate requirement
    // But for now, isVerified handles email verification.
    // If there was a separate 'isAdminApproved' flag, we'd check it here.
    // Assuming 'isVerified' acts as the primary gate for now as per user request.

    // Update last login without triggering pre-save hooks (Non-blocking)
    Model.findByIdAndUpdate(user._id, { lastLogin: new Date() }).catch(err => console.error('Error updating last login:', err));

    // Generate token
    const token = generateToken(user._id, role);

    // Sanitize user object to remove large base64 strings before sending
    const userObject = user.toObject();

    // Remove heavy fields that slow down the response
    if (userObject.recruiterOnboardingDetails) {
      if (userObject.recruiterOnboardingDetails.company) {
        delete userObject.recruiterOnboardingDetails.company.images;
        delete userObject.recruiterOnboardingDetails.company.logo; // Keep if it's a URL, delete if base64 (assuming base64 from onboarding)
      }
      delete userObject.recruiterOnboardingDetails.employmentProof;
    }

    if (userObject.profile) {
      if (userObject.profile.documents) {
        delete userObject.profile.documents.resume;
        delete userObject.profile.documents.coverLetter;
      }
    }

    // Also remove password hash
    delete userObject.password;

    res.json({
      success: true,
      data: {
        user: userObject,
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    // Check if full profile is requested (for editing/viewing full details)
    if (req.query.includeProfile === 'true') {
      const fullUser = await req.user.constructor.findById(req.user._id);
      const userObj = fullUser.toObject();
      userObj.role = req.user.role;

      return res.json({
        success: true,
        data: userObj
      });
    }

    // Convert user to plain object and ensure role is included
    const userObj = req.user.toObject ? req.user.toObject() : req.user;
    userObj.role = req.user.role;

    res.json({
      success: true,
      data: userObj
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const user = req.user;
    const role = req.user.role;

    console.log('UpdateProfile called for user:', user._id, 'role:', role);
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    // Ensure profile object is properly initialized for job seekers
    if (role === 'job_seeker') {
      if (!user.profile) user.profile = {};
      if (!user.profile.location) user.profile.location = {};
      if (!user.profile.socialProfiles) user.profile.socialProfiles = {};
      if (!user.profile.codingProfiles) user.profile.codingProfiles = {};
      if (!user.profile.documents) user.profile.documents = {};
      if (!user.profile.skills) user.profile.skills = [];
      if (!user.profile.experience) user.profile.experience = [];
      if (!user.profile.education) user.profile.education = [];
      if (!user.profile.projects) user.profile.projects = [];
      if (!user.profile.certifications) user.profile.certifications = [];
    }

    if (role === 'employer') {
      // Ensure profile is initialized
      if (!user.profile) {
        user.profile = {};
      }

      // Ensure company object is initialized
      if (!user.profile.company) {
        user.profile.company = {};
      }

      // Ensure location object is initialized
      if (!user.profile.location) {
        user.profile.location = {};
      }

      // Ensure recruiterOnboardingDetails is initialized
      if (!user.recruiterOnboardingDetails) {
        user.recruiterOnboardingDetails = {
          company: {},
          socialLinks: {}
        };
      }

      // Handle both direct fields and nested profile structure
      const profileData = req.body.profile || req.body;

      console.log('Profile data for employer:', JSON.stringify(profileData, null, 2));

      // Check if this is the new structured onboarding form submission
      const isRecruiterApplication = profileData.personalInfo && profileData.companyInfo && profileData.authorityInfo;
      // Legacy check
      const isLegacyOnboarding = profileData.phone && profileData.company && profileData.jobTitle && profileData.employmentProof;

      if (isRecruiterApplication || isLegacyOnboarding) {
        console.log('Processing recruiter onboarding form submission');

        // Save to recruiterOnboardingDetails
        if (!user.recruiterOnboardingDetails) {
          user.recruiterOnboardingDetails = { company: {}, socialLinks: {} };
        }

        const info = isRecruiterApplication ? {
          phone: profileData.personalInfo.phone,
          phoneVerified: profileData.personalInfo.phoneVerified,
          company: profileData.companyInfo,
          jobTitle: profileData.authorityInfo.jobTitle,
          employmentProof: profileData.authorityInfo.employmentProof
        } : profileData;

        // Step 1: Personal Legitimacy
        if (info.phone) {
          user.recruiterOnboardingDetails.phone = info.phone;
          user.recruiterOnboardingDetails.phoneVerified = info.phoneVerified || true;
          // Also update main profile
          user.profile.phone = info.phone;
        }

        // Step 2: Company Authenticity
        if (info.company) {
          if (!user.recruiterOnboardingDetails.company) {
            user.recruiterOnboardingDetails.company = {};
          }
          const comp = info.company;
          user.recruiterOnboardingDetails.company.name = comp.name;
          user.recruiterOnboardingDetails.company.website = comp.website;
          user.recruiterOnboardingDetails.company.logo = comp.logo;
          user.recruiterOnboardingDetails.company.size = comp.size;
          user.recruiterOnboardingDetails.company.address = comp.address; // Head office address string
          user.recruiterOnboardingDetails.company.images = comp.images;

          if (comp.socialLinks) {
            user.recruiterOnboardingDetails.company.socialLinks = comp.socialLinks;
          }

          // ALSO Update Standard Profile Company Details
          if (!user.profile.company) user.profile.company = {};
          if (comp.name) user.profile.company.name = comp.name;
          if (comp.website) user.profile.company.website = comp.website;
          if (comp.logo) user.profile.company.logo = comp.logo;
          if (comp.size) user.profile.company.size = comp.size;
          if (comp.images) user.profile.company.images = comp.images;

          // Map address string to headOfficeLocation
          if (comp.address) {
            if (!user.profile.company.headOfficeLocation) user.profile.company.headOfficeLocation = {};
            user.profile.company.headOfficeLocation.address = comp.address;
          }

          if (comp.socialLinks) {
            if (!user.profile.company.socialLinks) user.profile.company.socialLinks = {};
            user.profile.company.socialLinks = { ...user.profile.company.socialLinks, ...comp.socialLinks };
          }
        }

        // Step 3: Recruiter's Authority
        if (info.jobTitle) {
          user.recruiterOnboardingDetails.jobTitle = info.jobTitle;
          // Also update main profile
          user.profile.jobTitle = info.jobTitle;
        }
        if (info.employmentProof) {
          user.recruiterOnboardingDetails.employmentProof = info.employmentProof;
          // Also update main profile
          user.profile.employmentProof = info.employmentProof;
        }

        // Mark onboarding as complete
        user.recruiterOnboardingDetails.isComplete = true;
        user.recruiterOnboardingDetails.submittedAt = new Date();

        console.log('Recruiter onboarding details saved:', JSON.stringify(user.recruiterOnboardingDetails, null, 2));

        // Save the user before returning response
        await user.save();

        return res.status(200).json({
          success: true,
          message: 'Onboarding submitted successfully. Your account is pending admin approval.',
          data: {
            user,
            requiresApproval: true,
            approvalStatus: 'pending'
          }
        });
      }

      // Update recruiter personal details
      if (profileData.fullName) user.profile.fullName = profileData.fullName;

      if (profileData.jobTitle) {
        const validJobTitles = ['HR', 'Talent Acquisition', 'Hiring Manager', 'Recruitment Manager', 'HR Manager', 'CEO', 'CTO', 'COO', 'Founder', 'Other'];
        if (validJobTitles.includes(profileData.jobTitle)) {
          user.profile.jobTitle = profileData.jobTitle;
        } else {
          console.warn('Invalid job title:', profileData.jobTitle);
          return res.status(400).json({
            success: false,
            message: 'Invalid job title'
          });
        }
      }

      if (profileData.workEmail) {
        const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
        if (emailRegex.test(profileData.workEmail)) {
          user.profile.workEmail = profileData.workEmail;
        } else {
          console.warn('Invalid work email format:', profileData.workEmail);
          return res.status(400).json({
            success: false,
            message: 'Invalid work email format'
          });
        }
      }
      if (profileData.workPhone) user.profile.workPhone = profileData.workPhone;
      if (profileData.phone) user.profile.phone = profileData.phone; // Personal phone from onboarding
      if (profileData.employmentProof) user.profile.employmentProof = profileData.employmentProof; // Employment proof document
      if (profileData.profilePicture !== undefined) user.profilePicture = profileData.profilePicture; // base64 encoded
      if (profileData.profilePhoto !== undefined) user.profile.profilePhoto = profileData.profilePhoto;

      // Personal location
      if (profileData.location) {
        if (!user.profile.location) user.profile.location = {};
        if (profileData.location.city !== undefined) user.profile.location.city = profileData.location.city;
        if (profileData.location.state !== undefined) user.profile.location.state = profileData.location.state;
        if (profileData.location.country !== undefined) user.profile.location.country = profileData.location.country;
      }

      // Company details
      if (profileData.company) {
        if (!user.profile.company) user.profile.company = {};
        if (profileData.company.name) user.profile.company.name = profileData.company.name;
        if (profileData.company.logo !== undefined) user.profile.company.logo = profileData.company.logo;
        if (profileData.company.description !== undefined) user.profile.company.description = profileData.company.description;
        if (profileData.company.industry !== undefined) {
          const validIndustries = ['Technology', 'Healthcare', 'Finance', 'Education', 'Manufacturing', 'Retail', 'Consulting', 'Media', 'Real Estate', 'E-commerce', 'Automotive', 'Energy', 'Telecommunications', 'Food & Beverage', 'Pharmaceuticals', 'Construction', 'Transportation', 'Agriculture', 'Other'];
          if (!profileData.company.industry || validIndustries.includes(profileData.company.industry)) {
            user.profile.company.industry = profileData.company.industry;
          } else {
            console.warn('Invalid industry:', profileData.company.industry);
            return res.status(400).json({
              success: false,
              message: 'Invalid industry'
            });
          }
        }

        if (profileData.company.size !== undefined) {
          const validSizes = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'];
          if (!profileData.company.size || validSizes.includes(profileData.company.size)) {
            user.profile.company.size = profileData.company.size;
          } else {
            console.warn('Invalid company size:', profileData.company.size);
            return res.status(400).json({
              success: false,
              message: 'Invalid company size'
            });
          }
        }
        if (profileData.company.website !== undefined) {
          // Ensure website has proper format
          let website = profileData.company.website;
          if (website && !website.startsWith('http://') && !website.startsWith('https://')) {
            website = `https://${website}`;
          }
          user.profile.company.website = website;
        }
        if (profileData.company.foundingYear !== undefined) {
          const year = profileData.company.foundingYear;
          const currentYear = new Date().getFullYear();
          if (!year || (typeof year === 'number' && year >= 1800 && year <= currentYear)) {
            user.profile.company.foundingYear = year || undefined;
          } else {
            console.warn('Invalid founding year:', year);
            return res.status(400).json({
              success: false,
              message: 'Invalid founding year'
            });
          }
        }
        if (profileData.company.companyType !== undefined) {
          const validCompanyTypes = ['startup', 'MNC', 'agency', 'NGO', 'government', 'private', 'public', 'partnership', 'sole-proprietorship', 'other'];
          if (!profileData.company.companyType || validCompanyTypes.includes(profileData.company.companyType)) {
            user.profile.company.companyType = profileData.company.companyType;
          } else {
            console.warn('Invalid company type:', profileData.company.companyType);
            return res.status(400).json({
              success: false,
              message: 'Invalid company type'
            });
          }
        }
        if (profileData.company.gstNumber !== undefined) user.profile.company.gstNumber = profileData.company.gstNumber;

        // Head office location
        if (profileData.company.headOfficeLocation) {
          if (!user.profile.company.headOfficeLocation) user.profile.company.headOfficeLocation = {};
          if (profileData.company.headOfficeLocation.address !== undefined) user.profile.company.headOfficeLocation.address = profileData.company.headOfficeLocation.address;
          if (profileData.company.headOfficeLocation.city !== undefined) user.profile.company.headOfficeLocation.city = profileData.company.headOfficeLocation.city;
          if (profileData.company.headOfficeLocation.state !== undefined) user.profile.company.headOfficeLocation.state = profileData.company.headOfficeLocation.state;
          if (profileData.company.headOfficeLocation.country !== undefined) user.profile.company.headOfficeLocation.country = profileData.company.headOfficeLocation.country;
          if (profileData.company.headOfficeLocation.zipCode !== undefined) user.profile.company.headOfficeLocation.zipCode = profileData.company.headOfficeLocation.zipCode;
        }

        // Social links
        if (profileData.company.socialLinks) {
          if (!user.profile.company.socialLinks) user.profile.company.socialLinks = {};
          if (profileData.company.socialLinks.linkedin !== undefined) user.profile.company.socialLinks.linkedin = profileData.company.socialLinks.linkedin;
          if (profileData.company.socialLinks.twitter !== undefined) user.profile.company.socialLinks.twitter = profileData.company.socialLinks.twitter;
          if (profileData.company.socialLinks.instagram !== undefined) user.profile.company.socialLinks.instagram = profileData.company.socialLinks.instagram;
          if (profileData.company.socialLinks.youtube !== undefined) user.profile.company.socialLinks.youtube = profileData.company.socialLinks.youtube;
        }
      }

      // Handle direct fields for backward compatibility
      if (req.body.companyName) user.profile.company.name = req.body.companyName;
      if (req.body.companyLogo !== undefined) user.profile.company.logo = req.body.companyLogo;
      if (req.body.companyDescription !== undefined) user.profile.company.description = req.body.companyDescription;
      if (req.body.industry !== undefined) user.profile.company.industry = req.body.industry;
      if (req.body.companySize !== undefined) user.profile.company.size = req.body.companySize;
      if (req.body.website !== undefined) user.profile.company.website = req.body.website;
      if (req.body.foundingYear !== undefined) user.profile.company.foundingYear = req.body.foundingYear;
      if (req.body.companyType !== undefined) user.profile.company.companyType = req.body.companyType;
      if (req.body.gstNumber !== undefined) user.profile.company.gstNumber = req.body.gstNumber;

      // Head office location (direct fields)
      if (req.body.headOfficeAddress !== undefined) user.profile.company.headOfficeLocation.address = req.body.headOfficeAddress;
      if (req.body.headOfficeCity !== undefined) user.profile.company.headOfficeLocation.city = req.body.headOfficeCity;
      if (req.body.headOfficeState !== undefined) user.profile.company.headOfficeLocation.state = req.body.headOfficeState;
      if (req.body.headOfficeCountry !== undefined) user.profile.company.headOfficeLocation.country = req.body.headOfficeCountry;
      if (req.body.headOfficeZipCode !== undefined) user.profile.company.headOfficeLocation.zipCode = req.body.headOfficeZipCode;

      // Social links (direct fields)
      if (req.body.linkedin !== undefined) user.profile.company.socialLinks.linkedin = req.body.linkedin;
      if (req.body.twitter !== undefined) user.profile.company.socialLinks.twitter = req.body.twitter;
      if (req.body.instagram !== undefined) user.profile.company.socialLinks.instagram = req.body.instagram;
      if (req.body.youtube !== undefined) user.profile.company.socialLinks.youtube = req.body.youtube;
    } else if (role === 'job_seeker') {
      // Update candidate fields
      if (req.body.fullName) user.fullName = req.body.fullName;

      // Profile Picture (base64 encoded)
      if (req.body.profilePicture !== undefined) user.profilePicture = req.body.profilePicture;

      // Initialize nested objects if they don't exist
      if (!user.profile.location) user.profile.location = {};
      if (!user.profile.socialProfiles) user.profile.socialProfiles = {};
      if (!user.profile.codingProfiles) user.profile.codingProfiles = {};
      if (!user.profile.documents) user.profile.documents = {};

      // Allow Payment Update (Mock)
      if (req.body.hasPaidJobAccess !== undefined) {
        user.hasPaidJobAccess = req.body.hasPaidJobAccess;
      }

      // Basic Personal Info
      if (req.body.profilePhoto !== undefined) user.profile.profilePhoto = req.body.profilePhoto;
      if (req.body.phone !== undefined) user.profile.phone = req.body.phone;
      if (req.body.city !== undefined) user.profile.location.city = req.body.city;
      if (req.body.state !== undefined) user.profile.location.state = req.body.state;
      if (req.body.country !== undefined) user.profile.location.country = req.body.country;
      if (req.body.dateOfBirth !== undefined) user.profile.dateOfBirth = req.body.dateOfBirth;
      if (req.body.gender !== undefined) user.profile.gender = req.body.gender;

      // Professional Summary
      if (req.body.headline !== undefined) user.profile.headline = req.body.headline;
      if (req.body.professionalSummary !== undefined) user.profile.professionalSummary = req.body.professionalSummary;

      // Skills
      if (req.body.skills !== undefined) user.profile.skills = req.body.skills;

      // Experience
      if (req.body.experience !== undefined) user.profile.experience = req.body.experience;

      // Education
      if (req.body.education !== undefined) {
        user.profile.education = req.body.education;

        // Check if any education institution matches a registered college
        if (user.profile.education && user.profile.education.length > 0) {
          for (const edu of user.profile.education) {
            if (edu.institution) {
              try {
                const college = await College.findOne({
                  name: { $regex: new RegExp(edu.institution.trim(), 'i') }
                });
                if (college) {
                  user.college = college._id;

                  // Add student to college's students list if not already present
                  await College.findByIdAndUpdate(
                    college._id,
                    { $addToSet: { students: user._id } }
                  );

                  console.log('College matched and set:', college.name, 'for user:', user._id);
                  break; // Set the first match found
                }
              } catch (error) {
                console.error('Error matching college:', error);
              }
            }
          }
        }
      }

      // Projects
      if (req.body.projects !== undefined) user.profile.projects = req.body.projects;

      // Certifications
      if (req.body.certifications !== undefined) user.profile.certifications = req.body.certifications;

      // Documents (handle base64 encoded files and migration from old format)
      if (req.body.documents !== undefined) {
        // Get migrated documents (handles old format conversion)
        const migratedDocs = user.getMigratedDocuments();

        // Handle resume - ensure it's stored as base64 string
        if (req.body.documents.resume !== undefined) {
          user.profile.documents.resume = req.body.documents.resume; // base64 string
        } else {
          // Keep migrated value or set to empty string
          user.profile.documents.resume = migratedDocs.resume || '';
        }

        // Handle cover letter - ensure it's stored as base64 string
        if (req.body.documents.coverLetter !== undefined) {
          user.profile.documents.coverLetter = req.body.documents.coverLetter; // base64 string
        } else {
          // Keep migrated value or set to empty string
          user.profile.documents.coverLetter = migratedDocs.coverLetter || '';
        }

        if (req.body.documents.portfolioUrl !== undefined) {
          user.profile.documents.portfolioUrl = req.body.documents.portfolioUrl;
        }
      }

      // Social Profiles
      if (req.body.socialProfiles !== undefined) user.profile.socialProfiles = req.body.socialProfiles;

      // Coding Profiles
      if (req.body.codingProfiles !== undefined) user.profile.codingProfiles = req.body.codingProfiles;
    }

    console.log('User profile before save:', JSON.stringify(user.profile, null, 2));

    try {
      await user.save();
      console.log('Profile updated successfully');
    } catch (validationError) {
      console.error('Validation error during save:', validationError);
      return res.status(400).json({
        success: false,
        message: 'Validation failed: ' + validationError.message,
        errors: validationError.errors
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Update profile error:', error);
    next(error);
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Old password and new password are required'
      });
    }

    // Get user with password field (middleware excludes it by default)
    let Model;
    if (req.user.role === 'employer') {
      Model = Recruiter;
    } else if (req.user.role === 'job_seeker') {
      Model = Candidate;
    } else if (req.user.role === 'admin') {
      Model = Admin;
    }

    const user = await Model.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check current password
    if (!(await user.comparePassword(oldPassword))) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    user.password = newPassword;
    // Track when password was changed (for all user types if schema supports it)
    if (user.schema && user.schema.path('passwordChangedAt') || user._doc && user._doc.passwordChangedAt !== undefined || req.user.role === 'job_seeker') {
      user.passwordChangedAt = new Date();
    }
    await user.save();

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to change password'
    });
  }
};

// @desc    Update email notification preferences
// @route   PUT /api/auth/email-notifications
// @access  Private
const updateEmailNotifications = async (req, res) => {
  try {
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Enabled field must be a boolean'
      });
    }

    // Get user with password field (middleware excludes it by default)
    let Model;
    if (req.user.role === 'employer') {
      Model = Recruiter;
    } else if (req.user.role === 'job_seeker') {
      Model = Candidate;
    } else if (req.user.role === 'admin') {
      Model = Admin;
    }

    const user = await Model.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user preferences
    if (!user.preferences) {
      user.preferences = {};
    }
    user.preferences.emailNotifications = enabled;
    await user.save();

    // Manage mailing list subscription
    if (enabled) {
      // Add to mailing list
      const existingSubscription = await MailingList.findOne({
        email: user.email,
        userId: user._id,
        userType: req.user.role
      });

      if (!existingSubscription) {
        await MailingList.create({
          email: user.email,
          userId: user._id,
          userType: req.user.role,
          preferences: {
            jobAlerts: true,
            newsletter: true,
            promotional: false,
            systemUpdates: true
          }
        });
      } else if (!existingSubscription.isActive) {
        // Reactivate existing subscription
        existingSubscription.isActive = true;
        existingSubscription.unsubscribedAt = undefined;
        await existingSubscription.save();
      }
    } else {
      // Remove from mailing list (soft delete)
      await MailingList.findOneAndUpdate(
        {
          email: user.email,
          userId: user._id,
          userType: req.user.role
        },
        {
          isActive: false,
          unsubscribedAt: new Date()
        }
      );
    }

    // Send confirmation email if notifications are enabled
    if (enabled) {
      try {
        const emailTemplate = emailTemplates.notificationSubscription(user.fullName || user.name || 'User');
        await sendEmail({
          email: user.email,
          subject: emailTemplate.subject,
          message: emailTemplate.text,
          html: emailTemplate.html
        });
      } catch (emailError) {
        console.error('Notification subscription confirmation email failed:', emailError);
        // Don't fail the request if email fails
      }
    }

    res.json({
      success: true,
      message: enabled
        ? 'Email notifications enabled successfully'
        : 'Email notifications disabled successfully',
      preferences: user.preferences
    });
  } catch (error) {
    console.error('Update email notifications error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update email notifications'
    });
  }
};

// @desc    Get user preferences
// @route   GET /api/auth/preferences
// @access  Private
const getUserPreferences = async (req, res) => {
  try {
    // Get user with preferences
    let Model;
    if (req.user.role === 'employer') {
      Model = Recruiter;
    } else if (req.user.role === 'job_seeker') {
      Model = Candidate;
    } else if (req.user.role === 'admin') {
      Model = Admin;
    }

    const user = await Model.findById(req.user._id).select('preferences');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      preferences: user.preferences || {}
    });
  } catch (error) {
    console.error('Get user preferences error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get preferences'
    });
  }
};

// @desc    Update user preferences
// @route   PUT /api/auth/preferences
// @access  Private
const updateUserPreferences = async (req, res) => {
  try {
    const { theme, language, profileVisibility, showActivityStatus } = req.body;

    // Get user with preferences
    let Model;
    if (req.user.role === 'employer') {
      Model = Recruiter;
    } else if (req.user.role === 'job_seeker') {
      Model = Candidate;
    } else if (req.user.role === 'admin') {
      Model = Admin;
    }

    const user = await Model.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update preferences
    if (!user.preferences) {
      user.preferences = {};
    }

    if (theme !== undefined) user.preferences.theme = theme;
    if (language !== undefined) user.preferences.language = language;
    if (profileVisibility !== undefined) user.preferences.profileVisibility = profileVisibility;
    if (showActivityStatus !== undefined) user.preferences.showActivityStatus = showActivityStatus;

    await user.save();

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      preferences: user.preferences
    });
  } catch (error) {
    console.error('Update user preferences error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update preferences'
    });
  }
};

// @desc    Upload profile picture
// @route   POST /api/auth/upload-profile-picture
// @access  Private
const uploadProfilePicture = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file'
      });
    }

    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

    // Update user profile picture in database
    let Model;
    if (req.user.role === 'employer') {
      Model = Recruiter;
    } else if (req.user.role === 'job_seeker') {
      Model = Candidate;
    } else if (req.user.role === 'admin') {
      Model = Admin;
    }

    if (Model) {
      await Model.findByIdAndUpdate(req.user._id, { profilePicture: fileUrl });
    }

    res.json({
      success: true,
      message: 'Profile picture uploaded successfully',
      url: fileUrl
    });
  } catch (error) {
    console.error('Upload profile picture error:', error);
    next(error);
  }
};

// @desc    Forgot password - send OTP
// @route   POST /api/auth/forgot-password
// @access  Public
// Forgot Password
const forgotPassword = async (req, res, next) => {
  try {
    const { email, role } = req.body;

    if (!email || !role) {
      return res.status(400).json({
        success: false,
        message: 'Email and role are required'
      });
    }

    // Determine the model based on role
    let Model;
    if (role === 'job_seeker') {
      Model = Candidate;
    } else if (role === 'employer') {
      Model = Recruiter;
    } else if (role === 'college') {
      Model = College;
    } else if (role === 'admin') {
      Model = Admin;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }

    // Check if user exists
    const user = await Model.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email address'
      });
    }

    // Generate specific 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash OTP
    const salt = await bcrypt.genSalt(10);
    user.otpHash = await bcrypt.hash(otp, salt);

    // Set expiry to 10 minutes
    user.otpExpiresAt = Date.now() + 10 * 60 * 1000;
    user.otpAttempts = 0;

    await user.save({ validateBeforeSave: false });

    // Send Password Reset Email
    try {
      const emailTemplate = emailTemplates.passwordReset(otp, user.fullName || user.name || 'User');
      await sendEmail({
        email: user.email,
        subject: emailTemplate.subject,
        message: emailTemplate.text,
        html: emailTemplate.html
      });

      res.status(200).json({
        success: true,
        message: 'Password reset OTP sent to your email address.'
      });
    } catch (emailError) {
      console.error('Password reset email failed:', emailError);
      // Clean up OTP fields if email fails
      user.otpHash = undefined;
      user.otpExpiresAt = undefined;
      user.otpAttempts = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(500).json({
        success: false,
        message: 'Failed to send password reset email'
      });
    }

  } catch (error) {
    next(error);
  }
};

// @desc    Reset password with OTP
// @route   POST /api/auth/reset-password
// @access  Public
// Reset Password
const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword, role } = req.body;

    if (!email || !otp || !newPassword || !role) { // Added validation for all fields
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    // Validate password length
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    let Model;
    if (role === 'job_seeker') { // Changed from 'candidate' to 'job_seeker'
      Model = Candidate;
    } else if (role === 'employer') { // Changed from 'recruiter' to 'employer'
      Model = Recruiter;
    } else if (role === 'college') { // Added 'college' role
      Model = College;
    } else if (role === 'admin') { // Added 'admin' role
      Model = Admin;
    } else {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    // Explicitly select the fields we need since they might be select: false in schema
    const user = await Model.findOne({ email }).select('+otpHash +otpExpiresAt +otpAttempts');

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid request or user not found' }); // Clarified message
    }

    // Check expiry
    if (!user.otpExpiresAt || user.otpExpiresAt < Date.now()) {
      // Clear OTP fields if expired
      user.otpHash = undefined;
      user.otpExpiresAt = undefined;
      user.otpAttempts = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(400).json({ success: false, message: 'OTP expired or invalid. Please request a new one.' });
    }

    // Check attempts
    if (user.otpAttempts >= 3) {
      // Clearing OTP to force a new request is safer to prevent infinite guessing.
      user.otpHash = undefined;
      user.otpExpiresAt = undefined;
      user.otpAttempts = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(400).json({ success: false, message: 'Too many failed attempts. Please request a new OTP.' });
    }

    // Verify OTP
    const isMatch = await bcrypt.compare(otp, user.otpHash);
    if (!isMatch) {
      user.otpAttempts += 1;
      await user.save({ validateBeforeSave: false });
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    // OTP is valid, reset password
    user.password = newPassword;

    // Clear OTP fields
    user.otpHash = undefined;
    user.otpExpiresAt = undefined;
    user.otpAttempts = undefined;

    await user.save(); // This will trigger pre-save hook to hash password

    res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now login.'
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Enable Two-Factor Authentication
// @route   POST /api/auth/enable-2fa
// @access  Private
const enableTwoFactor = async (req, res, next) => {
  try {
    const user = req.user;
    const role = req.user.role;

    let Model;
    if (role === 'employer') {
      Model = Recruiter;
    } else if (role === 'job_seeker') {
      Model = Candidate;
    } else if (role === 'college') {
      Model = College;
    } else if (role === 'admin') {
      Model = Admin;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }

    // Check if 2FA is already enabled
    if (user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: 'Two-factor authentication is already enabled'
      });
    }

    // Generate setup token (6-digit OTP)
    const setupToken = crypto.randomInt(100000, 999999).toString();
    const salt = await bcrypt.genSalt(12);
    const setupTokenHash = await bcrypt.hash(setupToken, salt);

    // Set setup token expiry (10 minutes)
    const setupExpires = new Date(Date.now() + 10 * 60 * 1000);

    // Update user with setup token
    await Model.findByIdAndUpdate(user._id, {
      twoFactorSetupToken: setupTokenHash,
      twoFactorSetupExpires: setupExpires
    });

    // Send setup OTP via email
    const emailTemplate = emailTemplates.twoFactorSetup(setupToken, user.fullName || user.name || 'User');
    await sendEmail({
      email: user.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      message: emailTemplate.text
    });

    res.json({
      success: true,
      message: 'Two-factor authentication setup initiated. Please check your email for the verification code.',
      expiresIn: '10 minutes'
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Verify Two-Factor Setup and Enable 2FA
// @route   POST /api/auth/verify-2fa-setup
// @access  Private
const verifyTwoFactorSetup = async (req, res, next) => {
  try {
    const { otp } = req.body;
    const user = req.user;
    const role = req.user.role;

    let Model;
    if (role === 'employer') {
      Model = Recruiter;
    } else if (role === 'job_seeker') {
      Model = Candidate;
    } else if (role === 'college') {
      Model = College;
    } else if (role === 'admin') {
      Model = Admin;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }

    // Get user with 2FA setup fields
    const userWithSetup = await Model.findById(user._id).select('+twoFactorSetupToken +twoFactorSetupExpires');

    if (!userWithSetup) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if setup token exists and is not expired
    if (!userWithSetup.twoFactorSetupToken || !userWithSetup.twoFactorSetupExpires) {
      return res.status(400).json({
        success: false,
        message: 'Two-factor authentication setup not initiated'
      });
    }

    if (userWithSetup.twoFactorSetupExpires < Date.now()) {
      // Clean up expired setup
      await Model.findByIdAndUpdate(user._id, {
        twoFactorSetupToken: undefined,
        twoFactorSetupExpires: undefined
      });

      return res.status(400).json({
        success: false,
        message: 'Setup code has expired. Please start the setup process again.'
      });
    }

    // Verify the OTP
    const isValidOTP = await bcrypt.compare(otp.toString(), userWithSetup.twoFactorSetupToken);
    if (!isValidOTP) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code'
      });
    }

    // Generate backup codes (10 codes)
    const backupCodes = [];
    for (let i = 0; i < 10; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      backupCodes.push(code);
    }

    // Hash backup codes
    const hashedBackupCodes = await Promise.all(
      backupCodes.map(code => bcrypt.hash(code, 12))
    );

    // Enable 2FA and clean up setup
    await Model.findByIdAndUpdate(user._id, {
      twoFactorEnabled: true,
      twoFactorBackupCodes: hashedBackupCodes,
      twoFactorSetupToken: undefined,
      twoFactorSetupExpires: undefined
    });

    res.json({
      success: true,
      message: 'Two-factor authentication has been successfully enabled!',
      backupCodes: backupCodes, // Send plain backup codes to user (only time they'll see them)
      warning: 'Please save these backup codes in a secure location. You can use them to access your account if you lose your email access.'
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Disable Two-Factor Authentication
// @route   POST /api/auth/disable-2fa
// @access  Private
const disableTwoFactor = async (req, res, next) => {
  try {
    const user = req.user;
    const role = req.user.role;

    let Model;
    if (role === 'employer') {
      Model = Recruiter;
    } else if (role === 'job_seeker') {
      Model = Candidate;
    } else if (role === 'college') {
      Model = College;
    } else if (role === 'admin') {
      Model = Admin;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }

    // Check if 2FA is enabled
    if (!user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: 'Two-factor authentication is not enabled'
      });
    }

    // Disable 2FA and clean up all 2FA data
    await Model.findByIdAndUpdate(user._id, {
      twoFactorEnabled: false,
      twoFactorSecret: undefined,
      twoFactorBackupCodes: [],
      twoFactorSetupToken: undefined,
      twoFactorSetupExpires: undefined
    });

    res.json({
      success: true,
      message: 'Two-factor authentication has been disabled'
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Verify Two-Factor Authentication for Login
// @route   POST /api/auth/verify-2fa-login
// @access  Public
const verifyTwoFactorLogin = async (req, res, next) => {
  try {
    const { email, otp, role, tempToken } = req.body;

    let Model;
    if (role === 'employer') {
      Model = Recruiter;
    } else if (role === 'job_seeker') {
      Model = Candidate;
    } else if (role === 'college') {
      Model = College;
    } else if (role === 'admin') {
      Model = Admin;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified'
      });
    }

    // Find user with 2FA fields
    const user = await Model.findOne({ email }).select('+twoFactorEnabled +twoFactorBackupCodes');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if 2FA is enabled
    if (!user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: 'Two-factor authentication is not enabled for this account'
      });
    }

    // Verify OTP (for now, we'll use email OTP. In production, you might want to use TOTP)
    // For this implementation, we'll send a login OTP when 2FA is required

    // Check if OTP matches any backup code
    let isValidCode = false;
    let usedBackupCodeIndex = -1;

    if (user.twoFactorBackupCodes && user.twoFactorBackupCodes.length > 0) {
      for (let i = 0; i < user.twoFactorBackupCodes.length; i++) {
        const isMatch = await bcrypt.compare(otp.toString(), user.twoFactorBackupCodes[i]);
        if (isMatch) {
          isValidCode = true;
          usedBackupCodeIndex = i;
          break;
        }
      }
    }

    if (!isValidCode) {
      return res.status(400).json({
        success: false,
        message: 'Invalid two-factor authentication code'
      });
    }

    // If backup code was used, remove it from the array
    if (usedBackupCodeIndex >= 0) {
      user.twoFactorBackupCodes.splice(usedBackupCodeIndex, 1);
      await user.save();
    }

    // Generate final token
    const token = generateToken(user._id, role);

    // Update last login (Non-blocking)
    Model.findByIdAndUpdate(user._id, { lastLogin: new Date() }).catch(err => console.error('Error updating last login:', err));

    // Sanitize user object to remove large base64 strings before sending
    const userObject = user.toObject();

    // Remove heavy fields that slow down the response
    if (userObject.recruiterOnboardingDetails) {
      if (userObject.recruiterOnboardingDetails.company) {
        delete userObject.recruiterOnboardingDetails.company.images;
        delete userObject.recruiterOnboardingDetails.company.logo;
      }
      delete userObject.recruiterOnboardingDetails.employmentProof;
    }

    if (userObject.profile) {
      if (userObject.profile.documents) {
        delete userObject.profile.documents.resume;
        delete userObject.profile.documents.coverLetter;
      }
    }

    // Also remove sensitive fields like backup codes
    delete userObject.twoFactorBackupCodes;
    delete userObject.password;

    res.json({
      success: true,
      data: {
        user: userObject,
        token
      },
      message: usedBackupCodeIndex >= 0 ? 'Login successful using backup code. Please generate new backup codes.' : 'Login successful'
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Send 2FA Login OTP
// @route   POST /api/auth/send-2fa-login-otp
// @access  Public
const sendTwoFactorLoginOTP = async (req, res, next) => {
  try {
    const { email, role } = req.body;

    let Model;
    if (role === 'employer') {
      Model = Recruiter;
    } else if (role === 'job_seeker') {
      Model = Candidate;
    } else if (role === 'college') {
      Model = College;
    } else if (role === 'admin') {
      Model = Admin;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified'
      });
    }

    // Find user
    const user = await Model.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if 2FA is enabled
    if (!user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: 'Two-factor authentication is not enabled for this account'
      });
    }

    // Generate login OTP
    const loginOTP = crypto.randomInt(100000, 999999).toString();
    const salt = await bcrypt.genSalt(12);
    const loginOTPHash = await bcrypt.hash(loginOTP, salt);

    // Set OTP expiry (10 minutes)
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Store login OTP temporarily (you might want to create a separate collection for this)
    // For now, we'll reuse the existing OTP fields
    await Model.findByIdAndUpdate(user._id, {
      otpHash: loginOTPHash,
      otpExpiresAt: otpExpiresAt,
      otpAttempts: 0
    });

    // Send login OTP via email (Non-blocking)
    const emailTemplate = emailTemplates.twoFactorLogin(loginOTP, user.fullName || user.name || 'User');
    sendEmail({
      email: user.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      message: emailTemplate.text
    }).catch(err => console.error('Failed to send 2FA OTP email:', err));

    res.json({
      success: true,
      message: 'Two-factor authentication code sent to your email',
      expiresIn: '10 minutes'
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Verify 2FA Login OTP
// @route   POST /api/auth/verify-2fa-login-otp
// @access  Public
const verifyTwoFactorLoginOTP = async (req, res, next) => {
  try {
    const { email, otp, role } = req.body;

    let Model;
    if (role === 'employer') {
      Model = Recruiter;
    } else if (role === 'job_seeker') {
      Model = Candidate;
    } else if (role === 'college') {
      Model = College;
    } else if (role === 'admin') {
      Model = Admin;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified'
      });
    }

    // Find user with OTP fields
    const user = await Model.findOne({ email }).select('+otpHash +otpExpiresAt +otpAttempts +twoFactorEnabled');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if 2FA is enabled
    if (!user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: 'Two-factor authentication is not enabled for this account'
      });
    }

    // Check if OTP exists and is not expired
    if (!user.otpHash || !user.otpExpiresAt) {
      return res.status(400).json({
        success: false,
        message: 'No active two-factor authentication request'
      });
    }

    if (user.otpExpiresAt < Date.now()) {
      // Clean up expired OTP
      await Model.findByIdAndUpdate(user._id, {
        otpHash: undefined,
        otpExpiresAt: undefined,
        otpAttempts: 0
      });

      return res.status(400).json({
        success: false,
        message: 'Verification code has expired. Please request a new one.'
      });
    }

    // Check attempts limit
    if (user.otpAttempts >= 5) {
      // Clean up after too many attempts
      await Model.findByIdAndUpdate(user._id, {
        otpHash: undefined,
        otpExpiresAt: undefined,
        otpAttempts: 0
      });

      return res.status(429).json({
        success: false,
        message: 'Too many failed attempts. Please request a new verification code.'
      });
    }

    // Verify the OTP
    const isValidOTP = await bcrypt.compare(otp.toString(), user.otpHash);
    if (!isValidOTP) {
      // Increment attempts
      await Model.findByIdAndUpdate(user._id, {
        otpAttempts: user.otpAttempts + 1
      });

      return res.status(400).json({
        success: false,
        message: 'Invalid verification code'
      });
    }

    // Clean up OTP and generate final token
    await Model.findByIdAndUpdate(user._id, {
      otpHash: undefined,
      otpExpiresAt: undefined,
      otpAttempts: 0,
      lastLogin: new Date()
    });

    const token = generateToken(user._id, role);

    res.json({
      success: true,
      data: {
        user,
        token
      },
      message: 'Login successful'
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Delete user account
// @route   POST /api/auth/delete-account
// @access  Private
const deleteAccount = async (req, res, next) => {
  try {
    const { password } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Determine the model based on role
    let Model;
    if (userRole === 'employer') {
      Model = Recruiter;
    } else if (userRole === 'job_seeker') {
      Model = Candidate;
    } else if (userRole === 'college') {
      Model = College;
    } else if (userRole === 'admin') {
      Model = Admin;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid user role'
      });
    }

    // Find the user
    const user = await Model.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password'
      });
    }

    // Get user email before deletion
    const userEmail = user.email;
    const userName = user.fullName || user.name || 'User';

    // Delete associated data based on role
    if (userRole === 'job_seeker') {
      // Delete candidate's applications
      await require('../models/Application').deleteMany({ candidate: userId });

      // Delete candidate's saved jobs
      await require('../models/Job').updateMany(
        { savedBy: userId },
        { $pull: { savedBy: userId } }
      );

      // Delete candidate's reviews
      await require('../models/Review').deleteMany({
        $or: [
          { reviewer: userId },
          { reviewee: userId }
        ]
      });

      // Delete candidate's notifications
      await require('../models/Notification').deleteMany({
        recipient: userId,
        recipientModel: 'Candidate'
      });

      // Delete candidate's verification applications
      await require('../models/VerificationApplication').deleteMany({ candidate: userId });

      // Remove from mailing list
      await require('../models/MailingList').deleteMany({ email: userEmail });

    } else if (userRole === 'employer') {
      // Delete recruiter's jobs
      await require('../models/Job').deleteMany({ postedBy: userId });

      // Delete recruiter's applications (applications to their jobs will be deleted via cascade)
      // This is handled by the Job model's pre-remove middleware

      // Delete recruiter's notifications
      await require('../models/Notification').deleteMany({
        recipient: userId,
        recipientModel: 'Recruiter'
      });

      // Delete recruiter's reviews
      await require('../models/Review').deleteMany({
        $or: [
          { reviewer: userId },
          { reviewee: userId }
        ]
      });

    } else if (userRole === 'college') {
      // Delete college's courses
      await require('../models/Course').deleteMany({ college: userId });

      // Delete college's enrollments
      await require('../models/Enrollment').deleteMany({ college: userId });

      // Delete college's notifications
      await require('../models/Notification').deleteMany({
        recipient: userId,
        recipientModel: 'College'
      });

    } else if (userRole === 'admin') {
      // Delete admin's notifications
      await require('../models/Notification').deleteMany({
        recipient: userId,
        recipientModel: 'Admin'
      });
    }

    // Delete the user account
    await Model.findByIdAndDelete(userId);

    // Send confirmation email
    const emailTemplate = emailTemplates.accountDeletion(userName);
    await sendEmail({
      email: userEmail,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      message: emailTemplate.text
    });

    res.json({
      success: true,
      message: 'Account deleted successfully. You will receive a confirmation email.'
    });

  } catch (error) {
    console.error('Error deleting account:', error);
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  updateEmailNotifications,
  getUserPreferences,
  updateUserPreferences,
  verifyOTP,
  uploadProfilePicture,
  forgotPassword,
  resetPassword,
  enableTwoFactor,
  verifyTwoFactorSetup,
  disableTwoFactor,
  sendTwoFactorLoginOTP,
  verifyTwoFactorLoginOTP,
  deleteAccount
};