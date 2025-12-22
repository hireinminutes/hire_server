const Contact = require('../models/Contact');

// Submit contact form
exports.submitContact = async (req, res) => {
  try {
    const { name, email, subject, message, userType } = req.body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }

    // Create contact submission
    const contact = await Contact.create({
      name,
      email,
      subject,
      message,
      userType: userType || 'other'
    });

    res.status(201).json({
      success: true,
      message: 'Thank you for contacting us! We will get back to you soon.',
      data: contact
    });
  } catch (error) {
    console.error('Error submitting contact form:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit contact form'
    });
  }
};

// Get all contact submissions (Admin only)
exports.getAllContacts = async (req, res) => {
  try {
    const { status, isRead, page = 1, limit = 20 } = req.query;
    
    // Build query
    const query = {};
    if (status) query.status = status;
    if (isRead !== undefined) query.isRead = isRead === 'true';

    const skip = (page - 1) * limit;

    const contacts = await Contact.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('resolvedBy', 'email');

    const total = await Contact.countDocuments(query);

    res.json({
      success: true,
      data: contacts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contact submissions'
    });
  }
};

// Get single contact submission
exports.getContact = async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id)
      .populate('resolvedBy', 'email');

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact submission not found'
      });
    }

    res.json({
      success: true,
      data: contact
    });
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contact submission'
    });
  }
};

// Update contact status
exports.updateContactStatus = async (req, res) => {
  try {
    const { status, adminNotes, isRead } = req.body;

    const updateData = {};
    if (status) updateData.status = status;
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
    if (isRead !== undefined) updateData.isRead = isRead;
    
    if (status === 'in-progress' && !updateData.respondedAt) {
      updateData.respondedAt = new Date();
    }
    
    if (status === 'resolved' || status === 'closed') {
      updateData.resolvedBy = req.user._id;
    }

    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('resolvedBy', 'email');

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact submission not found'
      });
    }

    res.json({
      success: true,
      message: 'Contact submission updated successfully',
      data: contact
    });
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update contact submission'
    });
  }
};

// Mark contact as read
exports.markAsRead = async (req, res) => {
  try {
    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact submission not found'
      });
    }

    res.json({
      success: true,
      message: 'Marked as read',
      data: contact
    });
  } catch (error) {
    console.error('Error marking contact as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark as read'
    });
  }
};

// Delete contact submission
exports.deleteContact = async (req, res) => {
  try {
    const contact = await Contact.findByIdAndDelete(req.params.id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact submission not found'
      });
    }

    res.json({
      success: true,
      message: 'Contact submission deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete contact submission'
    });
  }
};

// Get contact statistics (Admin dashboard)
exports.getContactStats = async (req, res) => {
  try {
    const totalContacts = await Contact.countDocuments();
    const pendingContacts = await Contact.countDocuments({ status: 'pending' });
    const inProgressContacts = await Contact.countDocuments({ status: 'in-progress' });
    const resolvedContacts = await Contact.countDocuments({ status: 'resolved' });
    const unreadContacts = await Contact.countDocuments({ isRead: false });
    
    // Get contacts by user type
    const byUserType = await Contact.aggregate([
      {
        $group: {
          _id: '$userType',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get recent contacts
    const recentContacts = await Contact.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email subject userType status createdAt isRead');

    res.json({
      success: true,
      data: {
        total: totalContacts,
        pending: pendingContacts,
        inProgress: inProgressContacts,
        resolved: resolvedContacts,
        unread: unreadContacts,
        byUserType: byUserType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        recent: recentContacts
      }
    });
  } catch (error) {
    console.error('Error fetching contact stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contact statistics'
    });
  }
};
