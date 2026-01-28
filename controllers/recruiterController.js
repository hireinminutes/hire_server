const Recruiter = require('../models/Recruiter');

// @desc    Get recruiter company details
// @route   GET /api/recruiter/company
// @access  Private (Recruiter & Approved only)
const getCompanyDetails = async (req, res) => {
    try {
        const recruiter = await Recruiter.findById(req.user.id);

        if (!recruiter) {
            return res.status(404).json({
                success: false,
                message: 'Recruiter not found'
            });
        }

        // Check approval status just in case (though middleware should handle this)
        if (!recruiter.isApproved) {
            return res.status(403).json({
                success: false,
                message: 'Account not approved'
            });
        }

        const companyDetails = recruiter.profile?.company || {};

        res.status(200).json({
            success: true,
            data: companyDetails
        });
    } catch (error) {
        console.error('Error fetching company details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch company details'
        });
    }
};

// @desc    Update recruiter company details
// @route   PUT /api/recruiter/company
// @access  Private (Recruiter & Approved only)
const updateCompanyDetails = async (req, res) => {
    try {
        const {
            name,
            description,
            website,
            size,
            logo,
            companyType,
            industry,
            foundingYear,
            headOfficeLocation, // Expecting { address, city, state, country, zipCode }
            socialLinks // Expecting { linkedin, twitter, instagram, youtube, facebook }
        } = req.body;

        const recruiter = await Recruiter.findById(req.user.id);

        if (!recruiter) {
            return res.status(404).json({
                success: false,
                message: 'Recruiter not found'
            });
        }

        if (!recruiter.isApproved) {
            return res.status(403).json({
                success: false,
                message: 'Account pending approval. You cannot update company details yet.'
            });
        }

        // Ensure profile structure exists
        if (!recruiter.profile) recruiter.profile = {};
        if (!recruiter.profile.company) recruiter.profile.company = {};

        // Update fields
        if (name !== undefined) recruiter.profile.company.name = name;
        if (description !== undefined) recruiter.profile.company.description = description;
        if (website !== undefined) recruiter.profile.company.website = website === "" ? null : website;
        if (size !== undefined) recruiter.profile.company.size = size === "" ? null : size;
        if (logo !== undefined) recruiter.profile.company.logo = logo; // Assuming base64 or URL string
        if (companyType !== undefined) recruiter.profile.company.companyType = companyType === "" ? null : companyType;
        if (industry !== undefined) recruiter.profile.company.industry = industry === "" ? null : industry;
        if (foundingYear !== undefined) recruiter.profile.company.foundingYear = foundingYear === "" ? null : foundingYear;

        // Update location
        if (headOfficeLocation) {
            if (!recruiter.profile.company.headOfficeLocation) recruiter.profile.company.headOfficeLocation = {};
            const { address, city, state, country, zipCode } = headOfficeLocation;
            if (address !== undefined) recruiter.profile.company.headOfficeLocation.address = address;
            if (city !== undefined) recruiter.profile.company.headOfficeLocation.city = city;
            if (state !== undefined) recruiter.profile.company.headOfficeLocation.state = state;
            if (country !== undefined) recruiter.profile.company.headOfficeLocation.country = country;
            if (zipCode !== undefined) recruiter.profile.company.headOfficeLocation.zipCode = zipCode;
        }

        // Update social links
        if (socialLinks) {
            if (!recruiter.profile.company.socialLinks) recruiter.profile.company.socialLinks = {};
            const { linkedin, twitter, instagram, youtube, facebook } = socialLinks;
            if (linkedin !== undefined) recruiter.profile.company.socialLinks.linkedin = linkedin;
            if (twitter !== undefined) recruiter.profile.company.socialLinks.twitter = twitter;
            if (instagram !== undefined) recruiter.profile.company.socialLinks.instagram = instagram;
            if (youtube !== undefined) recruiter.profile.company.socialLinks.youtube = youtube;
            if (facebook !== undefined) recruiter.profile.company.socialLinks.facebook = facebook;
        }

        await recruiter.save();

        res.status(200).json({
            success: true,
            message: 'Company details updated successfully',
            data: recruiter.profile.company
        });
    } catch (error) {
        console.error('Error updating company details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update company details',
            error: error.message
        });
    }
};

module.exports = {
    getCompanyDetails,
    updateCompanyDetails
};
