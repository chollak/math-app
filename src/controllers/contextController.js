const Context = require('../models/Context');
const { keysToCamel } = require('../utils/caseConverter');

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

        res.status(201).json(keysToCamel(createdContext));
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

      res.json(keysToCamel(contexts));
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

      res.json(keysToCamel(context));
    });
  },

  // Update context (PUT - full update, all fields required)
  updateContext: (req, res) => {
    try {
      const { id } = req.params;
      const { text, title } = req.body;

      // Validate required fields for PUT
      if (!text || !title) {
        return res.status(400).json({ 
          error: 'PUT requires all fields: text, title' 
        });
      }

      // При PUT фотографии всегда заменяются (если переданы)
      const photos = extractPhotosFromRequest(req.files) || [];
      
      // Если фотографии не переданы, удаляем существующие при PUT
      Context.findById(id, (err, existing) => {
        if (err) {
          console.error('Error finding context:', err);
          return res.status(500).json({ error: 'Failed to find context' });
        }
        
        if (!existing) {
          return res.status(404).json({ error: 'Context not found' });
        }
        
        // При PUT без новых фотографий - удаляем старые
        if (existing.photos && existing.photos.length > 0 && !req.files) {
          deletePhysicalFiles(existing.photos);
        }
        
        const contextData = { text, title, photos };
        
        Context.update(id, contextData, (err, updatedContext) => {
          if (err) {
            if (err.message === 'Context not found') {
              return res.status(404).json({ error: 'Context not found' });
            }
            console.error('Error updating context:', err);
            return res.status(500).json({ error: 'Failed to update context' });
          }

          res.json(keysToCamel(updatedContext));
        });
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

      res.json(keysToCamel({ message: 'Context deleted successfully', id: result.id }));
    });
  },

  // PATCH - частичное обновление
  patchContext: (req, res) => {
    try {
      const { id } = req.params;
      const { text, title, clearPhotos } = req.body;

      Context.findById(id, (err, existing) => {
        if (err) {
          console.error('Error finding context:', err);
          return res.status(500).json({ error: 'Failed to find context' });
        }
        
        if (!existing) {
          return res.status(404).json({ error: 'Context not found' });
        }

        // Обновляем только переданные поля
        const contextData = {
          text: text !== undefined ? text : existing.text,
          title: title !== undefined ? title : existing.title,
          photos: existing.photos || []
        };

        // Управление фотографиями через PATCH
        if (clearPhotos === true) {
          // Очищаем фотографии
          deletePhysicalFiles(existing.photos || []);
          contextData.photos = [];
        } else if (req.files && Object.keys(req.files).length > 0) {
          // Заменяем фотографии
          deletePhysicalFiles(existing.photos || []);
          contextData.photos = extractPhotosFromRequest(req.files);
        }

        Context.update(id, contextData, (err, updatedContext) => {
          if (err) {
            if (err.message === 'Context not found') {
              return res.status(404).json({ error: 'Context not found' });
            }
            console.error('Error updating context:', err);
            return res.status(500).json({ error: 'Failed to update context' });
          }

          res.json(keysToCamel(updatedContext));
        });
      });

    } catch (error) {
      console.error('Error in patchContext:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Получить список фотографий
  getContextPhotos: (req, res) => {
    const { id } = req.params;
    
    Context.findById(id, (err, context) => {
      if (err) {
        console.error('Error finding context:', err);
        return res.status(500).json({ error: 'Failed to find context' });
      }
      
      if (!context) {
        return res.status(404).json({ error: 'Context not found' });
      }
      
      res.json(keysToCamel({
        contextId: id,
        photos: context.photos || [],
        count: (context.photos || []).length
      }));
    });
  },

  // Добавить фотографии к существующим
  addContextPhotos: (req, res) => {
    const { id } = req.params;
    
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ error: 'No photos provided' });
    }
    
    Context.findById(id, (err, context) => {
      if (err) {
        console.error('Error finding context:', err);
        return res.status(500).json({ error: 'Failed to find context' });
      }
      
      if (!context) {
        return res.status(404).json({ error: 'Context not found' });
      }
      
      const newPhotos = extractPhotosFromRequest(req.files);
      const existingPhotos = context.photos || [];
      const maxPhotos = 5;
      
      if (existingPhotos.length + newPhotos.length > maxPhotos) {
        return res.status(400).json({ 
          error: `Maximum ${maxPhotos} photos allowed. Current: ${existingPhotos.length}` 
        });
      }
      
      const updatedPhotos = [...existingPhotos, ...newPhotos];
      
      const contextData = {
        text: context.text,
        title: context.title,
        photos: updatedPhotos
      };
      
      Context.update(id, contextData, (err, result) => {
        if (err) {
          console.error('Error adding photos:', err);
          return res.status(500).json({ error: 'Failed to add photos' });
        }
        
        res.json(keysToCamel({
          message: 'Photos added successfully',
          addedPhotos: newPhotos,
          totalPhotos: updatedPhotos.length,
          photos: updatedPhotos
        }));
      });
    });
  },

  // Заменить все фотографии
  replaceContextPhotos: (req, res) => {
    const { id } = req.params;
    
    Context.findById(id, (err, context) => {
      if (err) {
        console.error('Error finding context:', err);
        return res.status(500).json({ error: 'Failed to find context' });
      }
      
      if (!context) {
        return res.status(404).json({ error: 'Context not found' });
      }
      
      // Удаляем старые файлы
      const oldPhotos = context.photos || [];
      if (oldPhotos.length > 0) {
        deletePhysicalFiles(oldPhotos);
      }
      
      const newPhotos = req.files ? extractPhotosFromRequest(req.files) : [];
      
      const contextData = {
        text: context.text,
        title: context.title,
        photos: newPhotos
      };
      
      Context.update(id, contextData, (err, result) => {
        if (err) {
          console.error('Error replacing photos:', err);
          return res.status(500).json({ error: 'Failed to replace photos' });
        }
        
        res.json(keysToCamel({
          message: 'Photos replaced successfully',
          removedPhotos: oldPhotos,
          newPhotos: newPhotos,
          totalPhotos: newPhotos.length
        }));
      });
    });
  },

  // Удалить все фотографии
  deleteAllContextPhotos: (req, res) => {
    const { id } = req.params;
    
    Context.findById(id, (err, context) => {
      if (err) {
        console.error('Error finding context:', err);
        return res.status(500).json({ error: 'Failed to find context' });
      }
      
      if (!context) {
        return res.status(404).json({ error: 'Context not found' });
      }
      
      const oldPhotos = context.photos || [];
      
      if (oldPhotos.length === 0) {
        return res.json(keysToCamel({
          message: 'No photos to delete',
          removedPhotos: []
        }));
      }
      
      // Удаляем физические файлы
      deletePhysicalFiles(oldPhotos);
      
      const contextData = {
        text: context.text,
        title: context.title,
        photos: []
      };
      
      Context.update(id, contextData, (err, result) => {
        if (err) {
          console.error('Error deleting photos:', err);
          return res.status(500).json({ error: 'Failed to delete photos' });
        }
        
        res.json(keysToCamel({
          message: 'All photos deleted successfully',
          removedPhotos: oldPhotos,
          totalPhotos: 0
        }));
      });
    });
  },

  // Удалить конкретную фотографию
  deleteContextPhoto: (req, res) => {
    const { id, filename } = req.params;
    
    Context.findById(id, (err, context) => {
      if (err) {
        console.error('Error finding context:', err);
        return res.status(500).json({ error: 'Failed to find context' });
      }
      
      if (!context) {
        return res.status(404).json({ error: 'Context not found' });
      }
      
      const photos = context.photos || [];
      const photoIndex = photos.findIndex(photo => photo === filename);
      
      if (photoIndex === -1) {
        return res.status(404).json({ error: 'Photo not found' });
      }
      
      // Удаляем физический файл
      deletePhysicalFiles([filename]);
      
      // Удаляем из массива
      photos.splice(photoIndex, 1);
      
      const contextData = {
        text: context.text,
        title: context.title,
        photos: photos
      };
      
      Context.update(id, contextData, (err, result) => {
        if (err) {
          console.error('Error deleting photo:', err);
          return res.status(500).json({ error: 'Failed to delete photo' });
        }
        
        res.json(keysToCamel({
          message: 'Photo deleted successfully',
          removedPhoto: filename,
          remainingPhotos: photos,
          totalPhotos: photos.length
        }));
      });
    });
  }
};

// Вспомогательная функция для извлечения фотографий из запроса
function extractPhotosFromRequest(files) {
  const photos = [];
  
  if (!files) return photos;
  
  // Поддержка полей photo1, photo2, photo3
  ['photo1', 'photo2', 'photo3'].forEach(fieldName => {
    if (files[fieldName] && files[fieldName][0]) {
      photos.push(files[fieldName][0].filename);
    }
  });
  
  // Поддержка массива photos[]
  if (files.photos) {
    files.photos.forEach(file => {
      photos.push(file.filename);
    });
  }
  
  return photos;
}

// Вспомогательная функция для удаления физических файлов
function deletePhysicalFiles(filenames) {
  const fs = require('fs');
  const path = require('path');
  
  if (!filenames || filenames.length === 0) return;
  
  filenames.forEach(filename => {
    const filePath = path.join(__dirname, '../../database/uploads', filename);
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error(`Failed to delete file ${filename}:`, err);
      } else {
        console.log(`Deleted file: ${filename}`);
      }
    });
  });
}

module.exports = contextController;