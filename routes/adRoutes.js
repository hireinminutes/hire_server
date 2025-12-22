const express = require('express');
const router = express.Router();
const Ad = require('../models/Ad');

// @desc    Get ad image
// @route   GET /api/ads/:id/image
// @access  Public
router.get('/:id/image', async (req, res) => {
    try {
        const ad = await Ad.findById(req.params.id).select('image imageUrl');

        if (!ad) {
            return res.status(404).json({ message: 'Ad not found' });
        }

        // Check for base64 image
        if (ad.image && ad.image.startsWith('data:')) {
            const matches = ad.image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);

            if (matches && matches.length === 3) {
                const type = matches[1];
                const buffer = Buffer.from(matches[2], 'base64');

                res.set('Content-Type', type);
                res.set('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
                return res.send(buffer);
            }
        }

        // If it's a URL or invalid base64, redirect or return 404
        if (ad.imageUrl) {
            return res.redirect(ad.imageUrl);
        }

        return res.status(404).json({ message: 'Image not found' });

    } catch (error) {
        console.error('Error serving ad image:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @desc    Get active ads by placement
// @route   GET /api/ads/active
// @access  Public
router.get('/active', async (req, res) => {
    try {
        const { placement } = req.query;
        const now = new Date();

        const query = {
            isActive: true, // Ensuring we only get active ads
            $and: [
                {
                    $or: [
                        { startDate: { $lte: now } },
                        { startDate: null },
                        { startDate: { $exists: false } }
                    ]
                },
                {
                    $or: [
                        { endDate: { $gte: now } },
                        { endDate: null },
                        { endDate: { $exists: false } }
                    ]
                }
            ]
        };

        if (placement) {
            query.adType = placement;
        }

        // Select images here because active ads endpoint needs them to display
        const ads = await Ad.find(query)
            .sort({ priority: -1, createdAt: -1 })
            .limit(10);

        res.json({
            success: true,
            data: ads
        });
    } catch (error) {
        console.error('Error fetching active ads:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching ads',
            error: error.message
        });
    }
});

// @desc    Track ad impression
// @route   POST /api/ads/:id/impression
// Track ad impression
router.post('/track/impression/:id', async (req, res) => {
    try {
        const ad = await Ad.findByIdAndUpdate(
            req.params.id,
            { $inc: { impressions: 1 } },
            { new: true }
        );

        if (!ad) {
            return res.status(404).json({
                success: false,
                message: 'Ad not found'
            });
        }

        // Emit real-time update to admin
        const io = req.app.get('io');
        if (io) {
            io.to('admin').emit('ad:stats-updated', {
                adId: ad._id,
                impressions: ad.impressions,
                clicks: ad.clicks
            });
        }

        res.status(200).json({
            success: true,
            message: 'Impression tracked'
        });
    } catch (error) {
        console.error('Error tracking impression:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to track impression',
            error: error.message
        });
    }
});

// @desc    Track ad click
// @route   POST /api/ads/:id/click
// Track ad click
router.post('/track/click/:id', async (req, res) => {
    try {
        const ad = await Ad.findByIdAndUpdate(
            req.params.id,
            { $inc: { clicks: 1 } },
            { new: true }
        );

        if (!ad) {
            return res.status(404).json({
                success: false,
                message: 'Ad not found'
            });
        }

        // Emit real-time update to admin
        const io = req.app.get('io');
        if (io) {
            io.to('admin').emit('ad:stats-updated', {
                adId: ad._id,
                impressions: ad.impressions,
                clicks: ad.clicks
            });
        }

        res.status(200).json({
            success: true,
            message: 'Click tracked'
        });
    } catch (error) {
        console.error('Error tracking click:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to track click',
            error: error.message
        });
    }
});

module.exports = router;
