// import express from 'express';
// import mongoose from 'mongoose';
// import Gallery from '../models/Gelary.js';

// const router = express.Router();

// // ==================== CREATE ====================

// // POST /api/gallery - Create a new gallery item
// router.post('/', async (req, res) => {
//     try {
//         const { title, media } = req.body;

//         // Validate required fields
//         if (!title || !media) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Missing required fields: title and media are required'
//             });
//         }

//         const galleryItem = new Gallery({
//             title,
//             media
//         });

//         await galleryItem.save();

//         res.status(201).json({
//             success: true,
//             data: galleryItem
//         });
//     } catch (error) {
//         console.error('Error creating gallery item:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Failed to create gallery item'
//         });
//     }
// });

// // ==================== READ ====================

// // GET /api/gallery - Get all gallery items with pagination
// router.get('/', async (req, res) => {
//     try {
//         const page = parseInt(req.query.page) || 1;
//         const limit = Math.min(parseInt(req.query.limit) || 20, 100);
//         const search = req.query.search || null;
//         const skip = (page - 1) * limit;

//         let query = {};

//         if (search) {
//             query.title = { $regex: search, $options: 'i' };
//         }

//         const [items, total] = await Promise.all([
//             Gallery.find(query)
//                 .sort({ createdAt: -1 })
//                 .skip(skip)
//                 .limit(limit)
//                 .lean()
//                 .exec(),
//             Gallery.countDocuments(query),
//         ]);

//         res.status(200).json({
//             success: true,
//             data: items,
//             pagination: {
//                 total,
//                 page,
//                 limit,
//                 totalPages: Math.ceil(total / limit),
//             },
//         });
//     } catch (error) {
//         console.error('Error fetching gallery items:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Failed to fetch gallery items'
//         });
//     }
// });

// // GET /api/gallery/:id - Get a single gallery item by ID
// router.get('/:id', async (req, res) => {
//     try {
//         const { id } = req.params;

//         const item = await Gallery.findById(id);
//         if (!item) {
//             return res.status(404).json({
//                 success: false,
//                 error: 'Gallery item not found'
//             });
//         }

//         res.status(200).json({
//             success: true,
//             data: item
//         });
//     } catch (error) {
//         console.error('Error fetching gallery item:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Failed to fetch gallery item'
//         });
//     }
// });

// // GET /api/gallery/search - Search gallery items by title
// router.get('/search/:query', async (req, res) => {
//     try {
//         const { query } = req.params;
//         const page = parseInt(req.query.page) || 1;
//         const limit = Math.min(parseInt(req.query.limit) || 20, 100);
//         const skip = (page - 1) * limit;

//         const [items, total] = await Promise.all([
//             Gallery.find({
//                 title: { $regex: query, $options: 'i' }
//             })
//                 .sort({ createdAt: -1 })
//                 .skip(skip)
//                 .limit(limit)
//                 .lean()
//                 .exec(),
//             Gallery.countDocuments({
//                 title: { $regex: query, $options: 'i' }
//             }),
//         ]);

//         res.status(200).json({
//             success: true,
//             data: items,
//             pagination: {
//                 total,
//                 page,
//                 limit,
//                 totalPages: Math.ceil(total / limit),
//             },
//         });
//     } catch (error) {
//         console.error('Error searching gallery:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Failed to search gallery'
//         });
//     }
// });

// // GET /api/gallery/latest - Get latest gallery items
// router.get('/latest/limit', async (req, res) => {
//     try {
//         const limit = Math.min(parseInt(req.query.limit) || 10, 50);

//         const items = await Gallery.find()
//             .sort({ createdAt: -1 })
//             .limit(limit)
//             .lean()
//             .exec();

//         res.status(200).json({
//             success: true,
//             data: items
//         });
//     } catch (error) {
//         console.error('Error fetching latest gallery items:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Failed to fetch latest gallery items'
//         });
//     }
// });

// // GET /api/gallery/stats/count - Get total count of gallery items
// router.get('/stats/count', async (req, res) => {
//     try {
//         const total = await Gallery.countDocuments();

//         // Get recent uploads (last 7 days)
//         const sevenDaysAgo = new Date();
//         sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

//         const recent = await Gallery.countDocuments({
//             createdAt: { $gte: sevenDaysAgo }
//         });

//         res.status(200).json({
//             success: true,
//             data: {
//                 total,
//                 recent,
//                 lastUpdated: new Date().toISOString()
//             }
//         });
//     } catch (error) {
//         console.error('Error fetching gallery stats:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Failed to fetch gallery statistics'
//         });
//     }
// });

// // ==================== UPDATE ====================

// // PUT /api/gallery/:id - Update a gallery item
// router.put('/:id', async (req, res) => {
//     try {
//         const { id } = req.params;
//         const { title, media } = req.body;

//         const item = await Gallery.findById(id);
//         if (!item) {
//             return res.status(404).json({
//                 success: false,
//                 error: 'Gallery item not found'
//             });
//         }

//         // Update fields
//         if (title) item.title = title;
//         if (media) item.media = media;

//         await item.save();

//         res.status(200).json({
//             success: true,
//             data: item
//         });
//     } catch (error) {
//         console.error('Error updating gallery item:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Failed to update gallery item'
//         });
//     }
// });

// // PATCH /api/gallery/:id - Partial update of a gallery item
// router.patch('/:id', async (req, res) => {
//     try {
//         const { id } = req.params;
//         const updateData = req.body;

//         // Remove any fields that shouldn't be updated
//         delete updateData._id;
//         delete updateData.__v;
//         delete updateData.createdAt;
//         delete updateData.updatedAt;

//         const item = await Gallery.findById(id);
//         if (!item) {
//             return res.status(404).json({
//                 success: false,
//                 error: 'Gallery item not found'
//             });
//         }

//         // Update only provided fields
//         Object.keys(updateData).forEach(key => {
//             if (key === 'title' || key === 'media') {
//                 item[key] = updateData[key];
//             }
//         });

//         await item.save();

//         res.status(200).json({
//             success: true,
//             data: item
//         });
//     } catch (error) {
//         console.error('Error updating gallery item:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Failed to update gallery item'
//         });
//     }
// });

// // ==================== DELETE ====================

// // DELETE /api/gallery/:id - Delete a gallery item
// router.delete('/:id', async (req, res) => {
//     try {
//         const { id } = req.params;

//         const item = await Gallery.findById(id);
//         if (!item) {
//             return res.status(404).json({
//                 success: false,
//                 error: 'Gallery item not found'
//             });
//         }

//         await item.deleteOne();

//         res.status(200).json({
//             success: true,
//             message: 'Gallery item deleted successfully'
//         });
//     } catch (error) {
//         console.error('Error deleting gallery item:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Failed to delete gallery item'
//         });
//     }
// });

// // DELETE /api/gallery/batch - Delete multiple gallery items
// router.delete('/batch', async (req, res) => {
//     try {
//         const { ids } = req.body;

//         if (!ids || !Array.isArray(ids) || ids.length === 0) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'ids array is required'
//             });
//         }

//         const result = await Gallery.deleteMany({
//             _id: { $in: ids }
//         });

//         res.status(200).json({
//             success: true,
//             data: {
//                 deleted: result.deletedCount
//             },
//             message: `${result.deletedCount} gallery items deleted successfully`
//         });
//     } catch (error) {
//         console.error('Error deleting batch gallery items:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Failed to delete gallery items'
//         });
//     }
// });

// // DELETE /api/gallery/all - Delete all gallery items (use with caution)
// router.delete('/all/delete', async (req, res) => {
//     try {
//         const { confirm } = req.query;

//         if (confirm !== 'yes') {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Please confirm with ?confirm=yes to delete all items'
//             });
//         }

//         const result = await Gallery.deleteMany({});

//         res.status(200).json({
//             success: true,
//             data: {
//                 deleted: result.deletedCount
//             },
//             message: `All ${result.deletedCount} gallery items deleted successfully`
//         });
//     } catch (error) {
//         console.error('Error deleting all gallery items:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Failed to delete gallery items'
//         });
//     }
// });

// // ==================== BATCH ====================

// // POST /api/gallery/batch - Get multiple gallery items by IDs
// router.post('/batch', async (req, res) => {
//     try {
//         const { ids } = req.body;

//         if (!ids || !Array.isArray(ids) || ids.length === 0) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'ids array is required'
//             });
//         }

//         const items = await Gallery.find({
//             _id: { $in: ids }
//         })
//             .sort({ createdAt: -1 })
//             .lean()
//             .exec();

//         res.status(200).json({
//             success: true,
//             data: items
//         });
//     } catch (error) {
//         console.error('Error fetching batch gallery items:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Failed to fetch gallery items'
//         });
//     }
// });

// // POST /api/gallery/batch/create - Create multiple gallery items
// router.post('/batch/create', async (req, res) => {
//     try {
//         const { items } = req.body;

//         if (!items || !Array.isArray(items) || items.length === 0) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'items array is required'
//             });
//         }

//         // Validate each item
//         for (const item of items) {
//             if (!item.title || !item.media) {
//                 return res.status(400).json({
//                     success: false,
//                     error: 'Each item must have title and media'
//                 });
//             }
//         }

//         const createdItems = await Gallery.insertMany(items);

//         res.status(201).json({
//             success: true,
//             data: createdItems,
//             message: `${createdItems.length} gallery items created successfully`
//         });
//     } catch (error) {
//         console.error('Error creating batch gallery items:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Failed to create gallery items'
//         });
//     }
// });

// export default router;
















import express from 'express';
import mongoose from 'mongoose';
import Gallery from '../models/Gelary.js';

const router = express.Router();

// ==================== CREATE ====================

// POST /api/gallery - Create a new gallery item
router.post('/', async (req, res) => {
    try {
        const { title, media } = req.body;
        if (!title || !media) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: title and media are required'
            });
        }

        const galleryItem = new Gallery({ title, media });
        await galleryItem.save();

        res.status(201).json({
            success: true,
            data: galleryItem
        });
    } catch (error) {
        console.error('Error creating gallery item:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create gallery item'
        });
    }
});

// ==================== READ ====================

// GET /api/gallery - Get all gallery items with pagination
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const search = req.query.search || null;
        const skip = (page - 1) * limit;

        let query = {};
        if (search) {
            query.title = { $regex: search, $options: 'i' };
        }

        const [items, total] = await Promise.all([
            Gallery.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean()
                .exec(),
            Gallery.countDocuments(query),
        ]);

        res.status(200).json({
            success: true,
            data: items,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching gallery items:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch gallery items'
        });
    }
});

// GET /api/gallery/:id
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const item = await Gallery.findById(id);
        if (!item) {
            return res.status(404).json({
                success: false,
                error: 'Gallery item not found'
            });
        }
        res.status(200).json({
            success: true,
            data: item
        });
    } catch (error) {
        console.error('Error fetching gallery item:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch gallery item'
        });
    }
});

// GET /api/gallery/search
router.get('/search/:query', async (req, res) => {
    try {
        const { query } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const skip = (page - 1) * limit;

        const [items, total] = await Promise.all([
            Gallery.find({ title: { $regex: query, $options: 'i' } })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean()
                .exec(),
            Gallery.countDocuments({ title: { $regex: query, $options: 'i' } }),
        ]);

        res.status(200).json({
            success: true,
            data: items,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error searching gallery:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to search gallery'
        });
    }
});

// GET /api/gallery/latest
router.get('/latest/limit', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 10, 50);
        const items = await Gallery.find()
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean()
            .exec();
        res.status(200).json({
            success: true,
            data: items
        });
    } catch (error) {
        console.error('Error fetching latest gallery items:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch latest gallery items'
        });
    }
});

// GET /api/gallery/stats/count
router.get('/stats/count', async (req, res) => {
    try {
        const total = await Gallery.countDocuments();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recent = await Gallery.countDocuments({
            createdAt: { $gte: sevenDaysAgo }
        });

        res.status(200).json({
            success: true,
            data: {
                total,
                recent,
                lastUpdated: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error fetching gallery stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch gallery statistics'
        });
    }
});

// ==================== UPDATE ====================

// PUT /api/gallery/:id
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, media } = req.body;

        const item = await Gallery.findById(id);
        if (!item) {
            return res.status(404).json({
                success: false,
                error: 'Gallery item not found'
            });
        }

        if (title) item.title = title;
        if (media) item.media = media;
        await item.save();

        res.status(200).json({
            success: true,
            data: item
        });
    } catch (error) {
        console.error('Error updating gallery item:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update gallery item'
        });
    }
});

// PATCH /api/gallery/:id
router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        delete updateData._id;
        delete updateData.__v;
        delete updateData.createdAt;
        delete updateData.updatedAt;

        const item = await Gallery.findById(id);
        if (!item) {
            return res.status(404).json({
                success: false,
                error: 'Gallery item not found'
            });
        }

        Object.keys(updateData).forEach(key => {
            if (key === 'title' || key === 'media') {
                item[key] = updateData[key];
            }
        });

        await item.save();

        res.status(200).json({
            success: true,
            data: item
        });
    } catch (error) {
        console.error('Error updating gallery item:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update gallery item'
        });
    }
});

// ==================== DELETE ====================

// DELETE /api/gallery/:id
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const item = await Gallery.findById(id);
        if (!item) {
            return res.status(404).json({
                success: false,
                error: 'Gallery item not found'
            });
        }
        await item.deleteOne();
        res.status(200).json({
            success: true,
            message: 'Gallery item deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting gallery item:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete gallery item'
        });
    }
});

// DELETE /api/gallery/batch - FIXED: robust ID validation
router.delete('/batch', async (req, res) => {
    try {
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'ids array is required and must not be empty'
            });
        }

        // Filter out invalid ObjectId strings to avoid CastError
        const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));

        if (validIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No valid ObjectId provided'
            });
        }

        const result = await Gallery.deleteMany({
            _id: { $in: validIds }
        });

        res.status(200).json({
            success: true,
            data: {
                deleted: result.deletedCount
            },
            message: `${result.deletedCount} gallery items deleted successfully`
        });
    } catch (error) {
        console.error('Error deleting batch gallery items:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete gallery items'
        });
    }
});

// DELETE /api/gallery/all
router.delete('/all/delete', async (req, res) => {
    try {
        const { confirm } = req.query;
        if (confirm !== 'yes') {
            return res.status(400).json({
                success: false,
                error: 'Please confirm with ?confirm=yes to delete all items'
            });
        }
        const result = await Gallery.deleteMany({});
        res.status(200).json({
            success: true,
            data: {
                deleted: result.deletedCount
            },
            message: `All ${result.deletedCount} gallery items deleted successfully`
        });
    } catch (error) {
        console.error('Error deleting all gallery items:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete gallery items'
        });
    }
});

// ==================== BATCH ====================

// POST /api/gallery/batch
router.post('/batch', async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'ids array is required'
            });
        }

        const items = await Gallery.find({
            _id: { $in: ids }
        })
            .sort({ createdAt: -1 })
            .lean()
            .exec();

        res.status(200).json({
            success: true,
            data: items
        });
    } catch (error) {
        console.error('Error fetching batch gallery items:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch gallery items'
        });
    }
});

// POST /api/gallery/batch/create
router.post('/batch/create', async (req, res) => {
    try {
        const { items } = req.body;
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'items array is required'
            });
        }

        for (const item of items) {
            if (!item.title || !item.media) {
                return res.status(400).json({
                    success: false,
                    error: 'Each item must have title and media'
                });
            }
        }

        const createdItems = await Gallery.insertMany(items);
        res.status(201).json({
            success: true,
            data: createdItems,
            message: `${createdItems.length} gallery items created successfully`
        });
    } catch (error) {
        console.error('Error creating batch gallery items:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create gallery items'
        });
    }
});

export default router;