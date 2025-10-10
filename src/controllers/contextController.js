const Context = require('../models/Context');

const contextController = {
  // Create a new context with photos
  createContext: (req, res) => {
    try {
      const { text, title } = req.body;

      // Validate required fields
      if (!text || !title) {
        return res.status(400).json({ error: 'Text and title are required' });
      }

      // Handle uploaded photos
      const photos = [];
      if (req.files) {
        // Support multiple photo fields
        ['photo1', 'photo2', 'photo3'].forEach(fieldName => {
          if (req.files[fieldName] && req.files[fieldName][0]) {
            photos.push(req.files[fieldName][0].filename);
          }
        });
        
        // Also support generic photos[] field
        if (req.files.photos) {
          req.files.photos.forEach(file => {
            photos.push(file.filename);
          });
        }
      }

      const contextData = {
        text,
        title,
        photos
      };

      Context.create(contextData, (err, createdContext) => {
        if (err) {
          console.error('Error creating context:', err);
          return res.status(500).json({ error: 'Failed to create context' });
        }

        res.status(201).json(createdContext);
      });

    } catch (error) {
      console.error('Error in createContext:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get all contexts
  getAllContexts: (req, res) => {
    Context.findAll((err, contexts) => {
      if (err) {
        console.error('Error fetching contexts:', err);
        return res.status(500).json({ error: 'Failed to fetch contexts' });
      }

      res.json(contexts);
    });
  },

  // Get single context by ID
  getContextById: (req, res) => {
    const { id } = req.params;

    Context.findById(id, (err, context) => {
      if (err) {
        console.error('Error fetching context:', err);
        return res.status(500).json({ error: 'Failed to fetch context' });
      }

      if (!context) {
        return res.status(404).json({ error: 'Context not found' });
      }

      res.json(context);
    });
  },

  // Update context
  updateContext: (req, res) => {
    try {
      const { id } = req.params;
      const { text, title } = req.body;

      // Validate required fields
      if (!text || !title) {
        return res.status(400).json({ error: 'Text and title are required' });
      }

      // Handle uploaded photos (for updates, we might want to replace or add photos)
      const photos = [];
      if (req.files) {
        ['photo1', 'photo2', 'photo3'].forEach(fieldName => {
          if (req.files[fieldName] && req.files[fieldName][0]) {
            photos.push(req.files[fieldName][0].filename);
          }
        });
        
        if (req.files.photos) {
          req.files.photos.forEach(file => {
            photos.push(file.filename);
          });
        }
      }

      const contextData = {
        text,
        title,
        photos
      };

      Context.update(id, contextData, (err, updatedContext) => {
        if (err) {
          if (err.message === 'Context not found') {
            return res.status(404).json({ error: 'Context not found' });
          }
          console.error('Error updating context:', err);
          return res.status(500).json({ error: 'Failed to update context' });
        }

        res.json(updatedContext);
      });

    } catch (error) {
      console.error('Error in updateContext:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Delete context
  deleteContext: (req, res) => {
    const { id } = req.params;

    Context.delete(id, (err, result) => {
      if (err) {
        if (err.message === 'Context not found') {
          return res.status(404).json({ error: 'Context not found' });
        }
        console.error('Error deleting context:', err);
        return res.status(500).json({ error: 'Failed to delete context' });
      }

      res.json({ message: 'Context deleted successfully', id: result.id });
    });
  }
};

module.exports = contextController;