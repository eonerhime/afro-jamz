import { hasPurchased } from '../db/index.js';
import { optionalAuth } from '../middleware/auth.middleware.js';

// Beat access control for purchased beats only
router.get('/:id', optionalAuth, async (req, res) => {
  const beatId = req.params.id;
  const user = req.user; // undefined if guest

  db.get(
    `
    SELECT beats.*, users.name AS producer_name
    FROM beats
    JOIN users ON beats.producer_id = users.id
    WHERE beats.id = ?
    `,
    [beatId],
    async (err, beat) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (!beat) return res.status(404).json({ error: 'Beat not found' });

      let canAccessFull = false;

      if (user) {
        if (user.role === 'producer' && user.id === beat.producer_id) {
          canAccessFull = true;
        } else {
          canAccessFull = await hasPurchased(user.id, beatId);
        }
      }

      res.json({
        id: beat.id,
        title: beat.title,
        genre: beat.genre,
        tempo: beat.tempo,
        duration: beat.duration,
        preview_url: beat.preview_url,
        full_url: canAccessFull ? beat.full_url : null,
        producer_name: beat.producer_name,
        access: canAccessFull ? 'full' : 'preview'
      });
    }
  );
});
